import sys
import boto3
import cfnresponse
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

bedrock_agent_client = boto3.client('bedrock-agent')


def handler(event, context):
    response_data = {}
    try:
        logger.info('Received event: %s', event)
        request_type = event['RequestType']
        properties = event['ResourceProperties']

        if request_type == 'Create':
            response_data = handle_create(properties)
        elif request_type == 'Update':
            response_data = handle_update(properties)
        elif request_type == 'Delete':
            handle_delete(properties)
        logger.info('Response data: %s',response_data)
        cfnresponse.send(event, context, cfnresponse.SUCCESS, response_data)
    except Exception as e:
        cfnresponse.send(event, context, cfnresponse.FAILED, {})
    return {
        'PhysicalResourceId': event['LogicalResourceId'],
        'Data': response_data
    }

def wait_agent_status_update(agent_id):
    response = bedrock_agent_client.get_agent(agentId=agent_id)
    agent_status = response['agent']['agentStatus']
    while agent_status.endswith('ING'):
        print(f'Waiting for agent status to change. Current status {agent_status}')
        try:
            response = bedrock_agent_client.get_agent(agentId=agent_id)
            agent_status = response['agent']['agentStatus']
        except bedrock_agent_client.exceptions.ResourceNotFoundException:
            agent_status = 'DELETED'
    print(f'Agent id {agent_id} current status: {agent_status}')
    return

def get_agent_id(agent_name):
    try:
        agents = bedrock_agent_client.list_agents()['agentSummaries']
        logger.info(agents)
        for agent in agents:
            if agent['agentName'] == agent_name:
                return agent['agentId']
        return None  # Return None if agent not found
    except Exception as e:
        logger.info(f'Error listing agents: {e}')
        return None

def handle_create(properties):
    agent_name = properties.get('agentName')
    
    # First check if agent already exists
    try:
        existing_agent_id = get_agent_id(agent_name)
        if existing_agent_id:
            logger.info(f'Agent {agent_name} already exists with ID: {existing_agent_id}')
            # Get the existing alias ARN
            aliases = bedrock_agent_client.list_agent_aliases(agentId=existing_agent_id)['agentAliasSummaries']
            if aliases:
                alias_arn = aliases[0]['agentAliasArn']
                alias_id = aliases[0]['agentAliasId']
                return {
                    'AliasArn': alias_arn,
                    'AgentId': existing_agent_id,
                    'AgentAliasId': alias_id
                }
            else:
                # If no alias exists, create one
                response_alias = bedrock_agent_client.create_agent_alias(
                    agentAliasName=agent_name,
                    agentId=existing_agent_id
                )
                return {
                    'AliasArn': response_alias['agentAlias']['agentAliasArn'],
                    'AgentId': existing_agent_id,
                    'AgentAliasId': response_alias['agentAlias']['agentAliasId'] 
                }
    except Exception as e:
        logger.error(f'Error checking existing agent: {str(e)}')  # Changed to error level
        raise e  # Raise the exception instead of continuing

    # Prepare parameters for new agent creation
    required_params = {
        'agentName': properties.get('agentName')
    }
    optional_params = {
        'agentCollaboration': properties.get('agentCollaboration'),
        'agentResourceRoleArn': properties.get('agentResourceRoleArn'),
        'clientToken': properties.get('clientToken'),
        'customOrchestration': properties.get('customOrchestration'),
        'customerEncryptionKeyArn': properties.get('customerEncryptionKeyArn'),
        'description': properties.get('description'),
        'foundationModel': properties.get('foundationModel'),
        'guardrailConfiguration': properties.get('guardrailConfiguration'),
        'idleSessionTTLInSeconds': properties.get('idleSessionTTLInSeconds'),
        'instruction': properties.get('instruction'),
        'memoryConfiguration': properties.get('memoryConfiguration'),
        'orchestrationType': properties.get('orchestrationType'),
        'promptOverrideConfiguration': properties.get('promptOverrideConfiguration'),
        'tags': properties.get('tags')
    }
    
    params = {**required_params, **{k: v for k, v in optional_params.items() if v is not None}}

    try:
        response_create = bedrock_agent_client.create_agent(**params)
        agent_id = response_create['agent']['agentId']
        logger.info(f'Created agent: {agent_id}')
    except Exception as e:
        logger.error(f'Failed to create agent: {str(e)}')
        raise e

    wait_agent_status_update(agent_id)

    # Associate collaborators if specified
    associateCollaborators = properties.get('associateCollaborators')
    if associateCollaborators is not None:
        for sub_agent in associateCollaborators:
            logger.info(f'Associate collaborators: {sub_agent}')
            try:
                bedrock_agent_client.associate_agent_collaborator(
                    agentId=agent_id,
                    agentDescriptor={
                        'aliasArn': sub_agent['sub_agent_alias_arn']
                    },
                    agentVersion='DRAFT',
                    collaboratorName=sub_agent['sub_agent_association_name'],
                    collaborationInstruction=sub_agent['sub_agent_instruction']
                )
            except Exception as e:
                logger.error(f'Failed to associate collaborator: {str(e)}')
                raise e

    # Prepare the agent
    logger.info('Preparing agent')
    try:
        response = bedrock_agent_client.prepare_agent(agentId=agent_id)
        logger.info(f'Agent prepared: {response}')
    except Exception as e:
        logger.error(f'Failed to prepare agent: {str(e)}')
        raise e

    wait_agent_status_update(agent_id)

    if properties.get('codeInterpreterEnabled'):
        logger.info('Adding code interpreter action group')
        try:
            bedrock_agent_client.create_agent_action_group(
                agentId=agent_id,
                agentVersion='DRAFT',
                actionGroupName='CodeInterpreterAction',
                parentActionGroupSignature='AMAZON.CodeInterpreter',
                actionGroupState='ENABLED'
            )
            logger.info('Code interpreter action group added successfully')
        except Exception as e:
            logger.error(f'Failed to add code interpreter action group: {str(e)}')
            raise e

    # Create agent alias
    logger.info('Creating agent alias')
    try:
        response_alias = bedrock_agent_client.create_agent_alias(
            agentAliasName=properties.get('agentName'),
            agentId=agent_id
        )
        alias_arn = response_alias['agentAlias']['agentAliasArn']
        alias_id = response_alias['agentAlias']['agentAliasId'] 
        logger.info(f'Created alias: {alias_arn}')
    except Exception as e:
        logger.error(f'Failed to create agent alias: {str(e)}')
        raise e

    return {
        'AliasArn': alias_arn,
        'AgentId': agent_id,
        'AgentAliasId': alias_id 
    }

def handle_update(properties):
    required_params = {
        'agentId': properties.get('agentId'),
        'agentName': properties.get('agentName'),
        'agentResourceRoleArn': properties.get('agentResourceRoleArn'),
        'foundationModel': properties.get('foundationModel')
    }
    optional_params = {
        'agentCollaboration': properties.get('agentCollaboration'),
        'customOrchestration': properties.get('customOrchestration'),
        'customerEncryptionKeyArn': properties.get('customerEncryptionKeyArn'),
        'description': properties.get('description'),
        'guardrailConfiguration': properties.get('guardrailConfiguration'),
        'idleSessionTTLInSeconds': properties.get('idleSessionTTLInSeconds'),
        'instruction': properties.get('instruction'),
        'memoryConfiguration': properties.get('memoryConfiguration'),
        'orchestrationType': properties.get('orchestrationType'),
        'promptOverrideConfiguration': properties.get('promptOverrideConfiguration')
    }
    
    params = {**required_params, **{k: v for k, v in optional_params.items() if v is not None}}

    response = bedrock_agent_client.update_agent(
        **params
    )
    agent_id = response['agent']['agentId']

    logger.info('Updated blueprint: %s', response)

    return {
        'AgentId': agent_id
    }

def handle_delete(properties):
    # Implement your cleanup logic here
    logger.info('DELETING')
    agent_id = get_agent_id(properties.get('agentName'))
    required_params = {
        'agentId': agent_id
    }
    optional_params = {
        'skipResourceInUseCheck': properties.get('skipResourceInUseCheck')
    }
    
    params = {**required_params, **{k: v for k, v in optional_params.items() if v is not None}}

    aliases = bedrock_agent_client.list_agent_aliases(agentId=agent_id)['agentAliasSummaries']
    for alias in aliases:
        try:
            bedrock_agent_client.delete_agent_alias(
                agentId=agent_id,
                agentAliasId=alias['agentAliasId']
            )
        except Exception as e:
            logger.info(e)

    try:
        bedrock_agent_client.delete_agent(
            **params
        )
    except Exception as e:
        logger.info(e)