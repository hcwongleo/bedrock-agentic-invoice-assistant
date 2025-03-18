import os
import json
import boto3
from datetime import datetime, timedelta
from botocore.exceptions import ClientError 

NO_DOCUMENT_MESSAGE = "No document ID was provided as a parameter, and it was not passed in session state."
NO_APPLICATION_DATA_MESSAGE = "No application data was provided in the parameters."
AWS_REGION = os.environ['AWS_REGION']
PREFIX = "bda-result"
APPLICATION_PREFIX = "applications"
ACCOUNT_ID = os.environ.get('ACCOUNT_ID', '')
S3_BUCKET = f"data-bucket-{ACCOUNT_ID}-{AWS_REGION}"

def get_named_parameter(event, name):
    if 'parameters' in event:
        if event['parameters']:
            for item in event['parameters']:
                if item['name'] == name:
                    return item['value']
        return None
    else:
        return None
    
def populate_function_response(event, response_body):
    return {'response': {'actionGroup': event['actionGroup'], 'function': event['function'],
                'functionResponse': {'responseBody': {'TEXT': {'body': str(response_body)}}}}}

def record_application_details(application_id, application_data):
    """
    Updates existing application with property and applicant details
    """
    try:
        s3_client = boto3.client('s3')
        s3_key = f"{APPLICATION_PREFIX}/{application_id}.json"
        
        # Get existing application data (contains DTI)
        response = s3_client.get_object(
            Bucket=S3_BUCKET,
            Key=s3_key
        )
        existing_data = json.loads(response['Body'].read().decode('utf-8'))
        
        # Update with new details while preserving DTI and other root fields
        if isinstance(application_data, str):
            application_data = json.loads(application_data)
            
        existing_data.update({
            'property_details': application_data['property_details'],
            'applicant_details': application_data['applicant_details']
        })
        
        # Store updated data
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=json.dumps(existing_data)
        )
        
        return {
            "status": "success",
            "message": "Application details updated successfully",
            "application_id": application_id,
            "data": existing_data
        }
        
    except Exception as e:
        error_message = f"Error updating application details: {str(e)}"
        print(error_message)
        return {
            "status": "error",
            "message": error_message
        }

def verify_applicant_documents(documents):
    try:
        def format_document_name(doc):
            doc = doc.strip().lower()
            
            # Normalize variations of W2 documents
            normalized = doc.replace('-', ' ').replace('_', ' ')
            
            # Check for co-borrower W2 variations
            if any(phrase in normalized for phrase in ['co borrower w2', 'w2 co borrower', 'coborrower w2', 'w2 coborrower']):
                return 'co-borrower-w2'
            # Check for primary W2 variations
            elif any(phrase in normalized for phrase in ['primary w2', 'w2 primary', 'w2']):
                return 'w2'
            
            # For other documents, replace spaces with hyphens
            return doc.replace(' ', '-')

        document_list = [format_document_name(doc) for doc in documents.split(',')]
        results = {}
        
        s3_client = boto3.client('s3')
        
        for document in document_list:
            try:
                s3_key = f"{PREFIX}/{document}-result.json"
                
                # Get the object from S3
                response = s3_client.get_object(
                    Bucket=S3_BUCKET,
                    Key=s3_key
                )
                
                # Read and parse the JSON content
                json_content = json.loads(response['Body'].read().decode('utf-8'))
                print(f"Retrieved document analysis result for {document}: {json_content}")
                
                results[document] = {
                    "status": "SUCCESS",
                    "data": json_content
                }
                
            except ClientError as e:
                if e.response['Error']['Code'] == 'NoSuchKey':
                    error_message = f"No analysis result found for document: {document}"
                    print(error_message)
                    results[document] = {
                        "status": "MISSING_RESULT",
                        "error": error_message
                    }
                else:
                    error_message = f"Error accessing S3 for document {document}: {str(e)}"
                    print(error_message)
                    results[document] = {
                        "status": "ERROR",
                        "error": error_message
                    }
            except Exception as e:
                error_message = f"Error processing document {document}: {str(e)}"
                print(error_message)
                results[document] = {
                    "status": "ERROR",
                    "error": error_message
                }
        
        return {
            "status": "COMPLETED",
            "documents": results,
            "summary": {
                "total": len(document_list),
                "successful": sum(1 for doc in results.values() if doc["status"] == "SUCCESS"),
                "failed": sum(1 for doc in results.values() if doc["status"] != "SUCCESS")
            }
        }
                
    except Exception as e:
        error_message = f"Error processing documents: {str(e)}"
        print(error_message)
        return {
            "status": "ERROR",
            "error": error_message,
            "documents": {}
        }
                
    except Exception as e:
        error_message = f"Error processing document {document}: {str(e)}"
        print(error_message)
        return {
            "error": error_message,
            "status": "ERROR"
        }

def record_dti(dti_value):
    """
    Creates initial application with DTI value at root level
    """
    try:
        # Generate application ID using timestamp
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        application_id = f"ML_{timestamp}"
        
        # Create initial application data with DTI at root level
        application_data = {
            'application_id': application_id,
            'timestamp': datetime.now().isoformat(),
            'debt_to_income': dti_value  # DTI at root level
        }
        
        # Store in S3
        s3_client = boto3.client('s3')
        s3_key = f"{APPLICATION_PREFIX}/{application_id}.json"
        
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=json.dumps(application_data)
        )
        
        return {
            "status": "success",
            "message": "Application created with DTI successfully",
            "application_id": application_id,
            "data": application_data
        }
        
    except Exception as e:
        error_message = f"Error creating application with DTI: {str(e)}"
        print(error_message)
        return {
            "status": "error",
            "message": error_message
        }

def record_summary(application_id, summary):
    """
    Update application with final summary
    """
    try:
        s3_client = boto3.client('s3')
        s3_key = f"{APPLICATION_PREFIX}/{application_id}.json"
        
        # Get existing application data
        response = s3_client.get_object(
            Bucket=S3_BUCKET,
            Key=s3_key
        )
        application_data = json.loads(response['Body'].read().decode('utf-8'))
        
        # Add summary
        application_data['summary'] = {
            "analysis": summary
        }
        
        # Update in S3
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=json.dumps(application_data)
        )
        
        return {
            "status": "success",
            "message": "Summary updated successfully",
            "application_id": application_id,
            "summary": summary
        }
        
    except Exception as e:
        error_message = f"Error updating summary: {str(e)}"
        print(error_message)
        return {
            "status": "error",
            "message": error_message
        }


def lambda_handler(event, context):
    print(f"Received event: {json.dumps(event)}")
    function = event['function']
    
    if function == 'record_dti':
        dti_value = get_named_parameter(event, 'dti_value')
        if dti_value is None:
            return populate_function_response(event, "Missing dti_value")
        
        result = record_dti(dti_value)

    elif function == 'record_application_details':
        application_id = get_named_parameter(event, 'application_id')
        application_data = get_named_parameter(event, 'application_data')
        
        if not application_id or not application_data:
            return populate_function_response(event, "Missing application_id or application_data")
            
        result = record_application_details(application_id, application_data)

    elif function == 'record_summary':
        application_id = get_named_parameter(event, 'application_id')
        summary = get_named_parameter(event, 'summary')
        if not application_id or not summary:
            return populate_function_response(event, "Missing application_id or summary")
        
        result = record_summary(application_id, summary)

    elif function == 'verify_applicant_documents':
        document = get_named_parameter(event, 'document')
        print(f"Processing verify_applicant_documents for document: {document}")

        if not document:
            session_state = event.get('sessionAttributes', {})
            document = session_state.get('document')
            if not document:
                return populate_function_response(event, NO_DOCUMENT_MESSAGE)
            print(f"Document was pulled from session state variable = {document}")
        result = verify_applicant_documents(document)
    
    else:
        error_message = f"Unrecognized function: {function}"
        print(error_message)
        raise Exception(error_message)

    response = populate_function_response(event, result)
    print(f"Returning response: {json.dumps(response)}")
    return response