import { Stack, StackProps, Aspects, Duration, aws_events_targets as targets, aws_events as events, CustomResource } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { DataAutomationBlueprint, DataAutomationProject } from "../constructs/bda-construct";
import { AwsSolutionsChecks } from 'cdk-nag';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as fs from 'fs';
import * as BDAConfig from '../config/BDAConfig';
import * as custom from 'aws-cdk-lib/custom-resources';

interface BDAStackProps extends StackProps {
    fileBucket: Bucket;
}
  
export class BDAStack extends Stack {
    public readonly role: iam.Role;
    public readonly fileBucket: Bucket;

    constructor(scope: Construct, id: string, props: BDAStackProps) {
        super(scope, id, props);
        this.fileBucket = props.fileBucket; 

        Aspects.of(this).add(new AwsSolutionsChecks());

        const blueprint_comprehensive_invoice = new DataAutomationBlueprint(this, "BDA-blueprint-comprehensive-invoice", {
            blueprintName: `ComprehensiveInvoice-Custom`,
            type: 'DOCUMENT',
            schema: BDAConfig.customBlueprint.ComprehensiveInvoice,
        });

        // Use the existing LoanApp project instead of creating a new one
        const projectArn = "arn:aws:bedrock:us-east-1:761018861641:data-automation-project/172f4a3b1db8";
        
        // Create a custom resource to represent the existing project
        const projectCustomResource = new CustomResource(this, "BDA-project", {
            serviceToken: new custom.Provider(this, "ProjectArnProvider", {
                onEventHandler: new lambda.Function(this, "ProjectArnProviderHandler", {
                    runtime: lambda.Runtime.NODEJS_18_X,
                    handler: "index.handler",
                    code: lambda.Code.fromInline(`
                        exports.handler = async (event) => {
                            return {
                                PhysicalResourceId: event.LogicalResourceId,
                                Data: {
                                    ProjectArn: "${projectArn}"
                                }
                            };
                        };
                    `)
                })
            }).serviceToken,
            properties: {
                ProjectArn: projectArn
            }
        });
        
        const project = {
            projectARN: projectArn,
            node: {
                addDependency: (construct: any) => {}
            }
        };
        
        project.node.addDependency(blueprint_comprehensive_invoice);
  
        if (this.fileBucket && !this.fileBucket.encryptionKey) {
            throw new Error('Bucket encryption key is required');
        }
        
          // Create EventBridge rules for specific prefixes
          const invokeDataAutomationLambdaFunction = this.createInvokeDataAutomationFunction({
            targetBucketName: this.fileBucket.bucketName,
            accountId: this.account,
            targetBucketKey: this.fileBucket.encryptionKey!.keyArn
          });
      
          
          const rule = new events.Rule(this, 'DocumentsRule', {
            eventPattern: {
              source: ['aws.s3'],
              detailType: ['Object Created'],
              detail: {
                bucket: { name: [this.fileBucket.bucketName] },
                object: { key: [{ prefix: 'datasets' }] },
              },
            },
          });
          rule.addTarget(new targets.LambdaFunction(invokeDataAutomationLambdaFunction));
    }
  
    private createInvokeDataAutomationFunction(params: {
        targetBucketName: string;
        accountId: string;
        targetBucketKey?: string;
      }): lambda.Function {
  
        const layer_boto3 = new lambda.LayerVersion(this, 'LatestBoto3Layer', {
            code: lambda.Code.fromAsset('.', {
                bundling: {
                    image: lambda.Runtime.PYTHON_3_12.bundlingImage,
                    command: [
                        'bash', '-c',
                        `mkdir -p /asset-output/python && \
                        pip install boto3 --target /asset-output/python && \
                        cp -au /asset-output/python/* /asset-output/`
                    ],
                },
            }),
            description: 'Latest boto3 layer',
            compatibleRuntimes: [lambda.Runtime.PYTHON_3_12],
        });
    
        const lendingDocumentAutomationLambdaFunction = new lambda.Function(
          this,
          'invoke_data_automation',
          {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: 'index.lambda_handler',
            code: new lambda.InlineCode(fs.readFileSync('lambda/python/bda-load-lambda/index_bda_call.py', { encoding: 'utf-8' })),
            timeout: Duration.seconds(300),
            layers: [layer_boto3],
            environment: {
              TARGET_BUCKET_NAME: params.targetBucketName,
              ACCOUNT_ID: this.account,
              // Hardcode the DATA_PROJECT_ARN to use the existing LoanApp project
              DATA_PROJECT_ARN: "arn:aws:bedrock:us-east-1:761018861641:data-automation-project/172f4a3b1db8",
            },
          }
        );
    
        lendingDocumentAutomationLambdaFunction.addToRolePolicy(
          new iam.PolicyStatement({
            actions: ['bedrock:List*'],
            resources: ['*'],
          })
        );
  
          lendingDocumentAutomationLambdaFunction.addToRolePolicy(
            new iam.PolicyStatement({
                actions: [
                  'bedrock:InvokeDataAutomationAsync',
                  'bedrock:GetDataAutomationStatus'
                ],
                resources: ['*'],
              })
          );
  
          lendingDocumentAutomationLambdaFunction.addToRolePolicy(
            new iam.PolicyStatement({
                actions: [
                  's3:GetObject',
                  's3:PutObject',
                  's3:ListBucket'
                ],
                resources: [
                    `arn:aws:s3:::${params.targetBucketName}/*`,
                    `arn:aws:s3:::${params.targetBucketName}`
                ],
              })
          );
  
          lendingDocumentAutomationLambdaFunction.addToRolePolicy(
            new iam.PolicyStatement({
                actions: [
                    'kms:Decrypt',
                    'kms:GenerateDataKey',
                    'kms:DescribeKey'
                ],
                resources: [`${params.targetBucketKey}`],
              })
          );
    
        return lendingDocumentAutomationLambdaFunction;
    }
}