import * as cdk from 'aws-cdk-lib';
import * as custom from 'aws-cdk-lib/custom-resources';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as fs from 'fs';

import { Construct } from 'constructs';
import { StackProps } from "aws-cdk-lib";

export interface MACProps extends StackProps {
    // List all the properties 
    agentName: string;
    agentCollaboration?: string;
    agentResourceRoleArn?: string;
    clientToken?: string;
    codeInterpreterEnabled: boolean;
    customOrchestration?: string;
    customerEncryptionKeyArn?: string;
    description?: string;
    foundationModel?: string;
    guardrailConfiguration?: string;
    idleSessionTTLInSeconds?: string;
    instruction?: string;
    memoryConfiguration?: string;
    orchestrationType?: string;
    promptOverrideConfiguration?: string;
    associateCollaborators?: {}[];
    actionGroups?: {}[];
}
export class BedrockMacAgent extends Construct {

    public readonly role: iam.Role;
    public readonly response: string;
    public readonly aliasARN: string;
    public agentId: string;
    public agentAliasId: string;


    constructor(scope: Construct, id: string, props: MACProps) {
        super(scope, id);

        const inlinePolicies: { [key: string]: iam.PolicyDocument } = {
            BedrockAgentAccess: new iam.PolicyDocument({
                statements: [
                    new iam.PolicyStatement({
                        actions: [
                            'bedrock:CreateAgent',
                            'bedrock:CreateAgentAlias',
                            'bedrock:DeleteAgent',
                            'bedrock:DeleteAgentAlias',
                            'bedrock:CreateAgentActionGroup',
                            'bedrock:GetBlueprint',
                            'bedrock:UpdateAgent',
                            'bedrock:UpdateAgentAlias',
                            'bedrock:GetAgent',
                            'bedrock:ListAgents',
                            'bedrock:ListAgentAliases',
                            'bedrock:PrepareAgent',
                            'bedrock:AssociateAgentCollaborator'
                        ],
                        resources: ['*'],
                    }),
                ],
            })
        };

        if (props.agentResourceRoleArn) {
            inlinePolicies.IAMAccess = new iam.PolicyDocument({
                statements: [
                    new iam.PolicyStatement({
                        actions: ['iam:PassRole'],
                        resources: [props.agentResourceRoleArn],
                    }),
                ],
            });
        }

        this.role = new iam.Role(this, `cr_role_agent`, {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
            ],
            inlinePolicies: inlinePolicies,
        });

        const layer = new lambda.LayerVersion(this, 'LatestBoto3Layer', {
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

        const BDA_onEventHandler = new lambda.Function(this, `BedrockMACHandler`, {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: 'index.handler',
            code: new lambda.InlineCode(fs.readFileSync('lambda/python/bedrock-mac-cr-lambda/index_mac.py', { encoding: 'utf-8' })),
            timeout: cdk.Duration.minutes(15),
            layers: [layer],
            role: this.role,
            description: 'Custom Resource Provider - Multi Agent Collaboration',
        });

        const provider = new custom.Provider(this, 'Provider', {
            onEventHandler: BDA_onEventHandler
        });

        const customResource = new cdk.CustomResource(this, 'Resource', {
            serviceToken: provider.serviceToken,
            properties: props,
        });

        this.aliasARN = customResource.getAttString('AliasArn');
        this.agentId = customResource.getAttString('AgentId');
        this.agentAliasId = customResource.getAttString('AgentAliasId');

    }
}