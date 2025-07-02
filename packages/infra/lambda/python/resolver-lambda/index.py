import os
import json
import uuid
import boto3
from botocore.config import Config
from datetime import datetime
from botocore.exceptions import ClientError

# power tools import
from aws_lambda_powertools.utilities.data_classes.appsync_resolver_event import (
    AppSyncResolverEvent
)
from aws_lambda_powertools.logging import Logger, correlation_paths

# graphQL imports
from gql_utils import gql_executor, success_response, failure_response
from gql import get_chats_by_user_id, update_chat_by_id

# Initializers
logger = Logger()

# environment variables
region_name = os.environ['AWS_REGION']
graphql_endpoint = os.environ['graphql_endpoint']
# create the bedrock agent runtime client
config = Config(
    read_timeout=1000,
    retries=dict(
        max_attempts=3,
        mode='adaptive'
    ),
    # Add rate limiting
    max_pool_connections=10,
    # Add timeouts
    connect_timeout=5
)
bedrock_agent_runtime = boto3.client(
    service_name="bedrock-agent-runtime",
    region_name=region_name,
    config=config
)
current_datetime = datetime.now()
agentId = os.environ.get('AGENT_ID', '')
agentAliasId = os.environ.get('AGENT_ALIAS_ID', '')


def sort_by_js_date(data, date_key):
    def date_converter(obj):
        # Convert JavaScript date string to Python datetime object
        return datetime.strptime(obj[date_key], '%Y-%m-%dT%H:%M:%S.%fZ')

    return sorted(data, key=date_converter)

def escape_special_chars(text):
    return (
        text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&#39;")
    )

def create_safe_message(input_data):
    safe_data = escape_special_chars(json.dumps(input_data, indent=4))
    return f"<input>\n{safe_data}\n</input>"

def process_bot_response(bot_response):
    # Preserve special characters and formatting
    print("process_bot_response", bot_response)
    formatted_response = bot_response.replace('\n', '\n')  # Convert newlines to HTML breaks
    # Keep emojis as is - they're Unicode and should render correctly
    
    # Handle code blocks (if any)
    if '```' in formatted_response:
        formatted_response = formatted_response.replace('```', '<pre><code>', 1)
        formatted_response = formatted_response.replace('```', '</code></pre>', 1)
    
    return formatted_response


def format_document_info(documents):
    """Format document information while preserving all formatting"""
    doc_info = "\nAttached Documents:\n"  # Keep original newlines
    for doc in documents:
        doc_info += f"- 📄 {doc['title']}\n"  # Keep newline for each document
    return doc_info


@logger.inject_lambda_context(correlation_id_path=correlation_paths.APPSYNC_RESOLVER, log_event=True)
def lambda_handler(event, context):

    app_sync_event: AppSyncResolverEvent = AppSyncResolverEvent(event)
    print(app_sync_event)

    arguments = app_sync_event.arguments.get("args")
    host = app_sync_event.request_headers.get("host")
    auth_token = app_sync_event.request_headers.get("authorization")
    api_key = app_sync_event.request_headers.get("x-api-key")
    # load the args and augment with other key information from request
    args = json.loads(arguments)
    args["host"] = host
    args["auth_token"] = auth_token
    args["api_key"] = api_key
    logger.info(args)

    try:
        if args["opr"] == "chat":
            end_session = False
            message_content = args["message"]
            if "end_session" in message_content:
                end_session = True

            if "documents" in args and args["documents"]:
                doc_info = "\nAttached Documents:\n" + "\n".join([f"- {doc['title']}" for doc in args["documents"]])
                message_content += doc_info

            print("Message message_content:", message_content)
            try:
                enable_trace = False


                response = bedrock_agent_runtime.invoke_agent(
                    agentId=agentId,
                    agentAliasId=agentAliasId,
                    sessionId=args["userID"],
                    enableTrace=enable_trace,
                    endSession=end_session,
                    inputText=message_content,
                    sessionState={
                        'promptSessionAttributes': {
                            "today's date": str(current_datetime.date())
                        },
                    }
                )

                if enable_trace:
                    print("Agent response:", response)

                bot_response = ''
                metrics = {}
                event_stream = response['completion']

                for event in event_stream:
                    if 'chunk' in event:
                        data = event['chunk']['bytes']
                        bot_response = data.decode('utf8')
                        print(f"Processing chunk: {bot_response}")  # Debug print
                        # if enable_trace:
                        #     print(data)
                            # print(f"Final answer ->\n{data.decode('utf8')}")
                        
                        # Decode and preserve formatting
                        decoded_response = data.decode('utf8')
                        
                    elif 'trace' in event:
                        if enable_trace:
                            logger.info(json.dumps(event['trace'], indent=2))
                    else:
                        raise Exception("unexpected event.", event)
                print(f"Final accumulated response:\n{bot_response}")  # Debug print
                formatted_bot_response = process_bot_response(decoded_response)
                print(f"Formatted bot response:\n{formatted_bot_response}")  # Debug print

            except ClientError as e:
                print(f"Error invoking agent: {e}")
                raise
            except Exception as e:
                raise Exception("unexpected event.", e)

            # send an update to gql this will trigger subscriptions on UI
            gql_executor(graphql_endpoint,
                            host=args["host"],
                            auth_token=args["auth_token"],
                            api_key=None,
                            payload={
                                "query":  update_chat_by_id,
                                "variables": {
                                    "input": {
                                        "id": args["id"],
                                        "userID": args["userID"],
                                        "human": args["message"],
                                        "bot": bot_response,
                                        "payload": json.dumps({
                                            "metrics": metrics,
                                            "documents": args.get("documents", [])
                                        })
                                    },

                                }
                            })
        
        elif args["opr"] == "generate_csv":
            try:
                # Format the invoice data with required fields plus enriched Supplier field
                input_data = {
                    # Required invoice fields from MACAgentInstruction
                    "vendor": args.get("vendor", ""),
                    "invoiceDate": args.get("invoiceDate", ""),
                    "paymentTerms": args.get("paymentTerms", ""),
                    "dueDate": args.get("dueDate", ""),
                    "currency": args.get("currency", ""),
                    "invoiceTotalAmount": args.get("invoiceTotalAmount", ""),
                    "invoiceLineItems": args.get("invoiceLineItems", []),
                    "specialRemarks": args.get("specialRemarks", ""),
                    "vendorBankAccount": args.get("vendorBankAccount", ""),
                    "bankCode": args.get("bankCode", ""),
                    "swiftCode": args.get("swiftCode", ""),
                    "meterNumber": args.get("meterNumber", ""),
                    "deltaReadings": args.get("deltaReadings", ""),
                    
                    # Enriched field after vendor mapping
                    "supplier": args.get("supplier", ""),  # Enriched supplier information
                    
                    # Additional metadata
                    "invoiceId": args.get("invoiceId", ""),
                    "documentClass": args.get("documentClass", ""),
                    "confidence": args.get("confidence", "")
                }

                # Format the input as expected by the agent
                message_content = create_safe_message(input_data)
                message_content += "Generate production-ready CSV file with vendor mapping and enriched supplier information for SAP data input: "
                
                enable_trace = False
                session_id = f"csv-generation-{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:8]}"
                
                response = bedrock_agent_runtime.invoke_agent(
                    agentId=agentId,
                    agentAliasId=agentAliasId,
                    sessionId=session_id,
                    enableTrace=enable_trace,
                    inputText=message_content
                )

                if enable_trace:
                    print("Agent response:", response)

                generated_csv = ''
                event_stream = response['completion']

                for event in event_stream:
                    if 'chunk' in event:
                        data = event['chunk']['bytes']
                        chunk_text = data.decode('utf8')
                        generated_csv += chunk_text  # Accumulate chunks
                        print(f"Processing CSV chunk: {chunk_text}")
                        
                    elif 'trace' in event:
                        if enable_trace:
                            logger.info(json.dumps(event['trace'], indent=2))
                    else:
                        raise Exception("unexpected event.", event)

                print(f"Final CSV response:\n{generated_csv}")
                
                return success_response(generated_csv)

            except ClientError as e:
                logger.error(f"Error calling Bedrock Agent: {e}")
                return failure_response(f"Error generating CSV: {str(e)}")
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                return failure_response(f"Unexpected error generating CSV: {str(e)}")

    # generate a catch block
    except Exception as e:
        logger.error(e)
        return failure_response("Appsync resolver error")