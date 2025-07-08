import { Stack, StackProps, aws_bedrock as _bedrock } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambda_python from '@aws-cdk/aws-lambda-python-alpha';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { bedrock } from '@cdklabs/generative-ai-cdk-constructs';
import { AgentActionGroup } from '@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock';
import * as MACConfig from '../config/MACConfig';
import { lambdaArchitecture, lambdaRuntime } from "../config/AppConfig";


export class MacStack extends Stack {
    public agentId: string;
    public agentAliasId: string;
    public invoice_app_assistant_agent: bedrock.Agent;
    public invoice_app_assistant_agentAlias: _bedrock.CfnAgentAlias;
    
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const agent_role = new iam.Role(this, `cr_role_agent`, {
            assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
            ],
            inlinePolicies: {
                AmazonBedrockAgentInferencProfilePolicy1: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            actions: [
                                "bedrock:InvokeModel*",
                                "bedrock:CreateInferenceProfile"
                            ],
                            resources: [
                                "arn:aws:bedrock:*::foundation-model/*",
                                "arn:aws:bedrock:*:*:inference-profile/*",
                                "arn:aws:bedrock:*:*:application-inference-profile/*"
                            ],
                        }),
                    ],
                }),
                AmazonBedrockAgentInferencProfilePolicy2: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            actions: [
                                "bedrock:GetInferenceProfile",
                                "bedrock:ListInferenceProfiles",
                                "bedrock:DeleteInferenceProfile",
                                "bedrock:TagResource",
                                "bedrock:UntagResource",
                                "bedrock:ListTagsForResource"
                            ],
                            resources: [
                                "arn:aws:bedrock:*:*:inference-profile/*",
                                "arn:aws:bedrock:*:*:application-inference-profile/*"
                            ],
                        }),
                    ],
                }),
                AmazonBedrockAgentBedrockFoundationModelPolicy: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            actions: [
                                "bedrock:GetAgentAlias",
                                "bedrock:InvokeAgent",
                                "bedrock:AssociateAgentCollaborator"
                            ],
                            resources: [
                                "arn:aws:bedrock:*:*:agent/*",
                                "arn:aws:bedrock:*:*:agent-alias/*"
                            ],
                        }),
                    ],
                }),
                AmazonBedrockAgentBedrockInvokeGuardrailModelPolicy: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            actions: [
                                "bedrock:InvokeModel"
                            ],
                            resources: ["*"],
                        }),
                    ],
                }),
            }
        });

        /* INVOICE APP ASSISTANT AGENT + action group */
        const InvoiceProcessingActionGroup_lambda = new lambda_python.PythonFunction(this, 'InvoiceProcessingActionGroup_lambda', {
            runtime: lambdaRuntime,
            architecture: lambdaArchitecture,
            handler: 'lambda_handler',
            index: 'invoice_processing_function.py',
            entry: path.join(__dirname, '../lambda/python/bedrock-action-group-lambda'),
            timeout: cdk.Duration.minutes(5),
            memorySize: 1024,
            environment: {
                "ACCOUNT_ID": Stack.of(this).account
            },
        });

        InvoiceProcessingActionGroup_lambda.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                "s3:*",
                "kms:Decrypt",
                "kms:Encrypt",
                "kms:GenerateDataKey*",
                "kms:ReEncrypt*"
            ],
            resources: ["*"],
        }));

        const InvoiceProcessingActionGroup = new AgentActionGroup({
            name: `invoice_processing_action_group`,
            description: 'Handle invoice processing, document verification, and data extraction.',
            executor: bedrock.ActionGroupExecutor.fromlambdaFunction(InvoiceProcessingActionGroup_lambda),
            enabled: true,
            functionSchema: MACConfig.InvoiceProcessingActionGroup,
        });

        // Create a simple invoice assistant agent
        this.invoice_app_assistant_agent = new bedrock.Agent(this, "invoice_assistant_agent", {
            name: `invoice_assistant`,
            foundationModel: bedrock.BedrockFoundationModel.AMAZON_NOVA_PRO_V1,
            instruction: MACConfig.MACAgentInstruction.InvoiceAssistant,
            shouldPrepareAgent: true,
            description: MACConfig.MACDescription.InvoiceAssistant,
            codeInterpreterEnabled: true
        });

        // Add the action group to the agent
        this.invoice_app_assistant_agent.addActionGroup(InvoiceProcessingActionGroup);

        // Create an alias for the agent
        const invoice_assistant_agentAlias = new _bedrock.CfnAgentAlias(this, 'invoice_assistant_agentAlias', {
            agentAliasName: `invoice_assistant`,
            agentId: this.invoice_app_assistant_agent.agentId,
        });

        // Set the agent ID and alias ID
        this.agentId = this.invoice_app_assistant_agent.agentId;
        this.agentAliasId = invoice_assistant_agentAlias.attrAgentAliasId;

        // Create outputs
        new cdk.CfnOutput(this, 'AgentId', {
            value: this.agentId,
            description: 'The ID of the Bedrock agent',
            exportName: `${id}-AgentId`
        });

        new cdk.CfnOutput(this, 'AgentAliasId', {
            value: this.agentAliasId,
            description: 'The ID of the Bedrock agent alias',
            exportName: `${id}-AgentAliasId`
        });
    }
}
