import json
import os
import boto3
import logging
import uuid
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Lambda handler for invoice processing action group
    """
    logger.info(f"Received event: {json.dumps(event)}")
    
    try:
        action_group = event.get('actionGroup')
        api_path = event.get('apiPath')
        
        # Extract parameters from the request
        parameters = {}
        request_body = event.get('requestBody', {})
        
        if request_body:
            parameters = request_body.get('parameters', {})
        
        response = None
        
        # Route to the appropriate function based on the API path
        if api_path == 'verify_invoice_documents':
            document = parameters.get('document', '')
            response = verify_invoice_documents(document)
        elif api_path == 'record_application_details':
            invoice_data = parameters.get('invoice_data', '')
            invoice_id = parameters.get('invoice_id', '')
            response = record_application_details(invoice_data, invoice_id)
        elif api_path == 'retrieve_vendor_list':
            search_criteria = parameters.get('search_criteria', '')
            response = retrieve_vendor_list(search_criteria)
        elif api_path == 'generate_csv':
            invoice_id = parameters.get('invoice_id', '')
            include_vendor_mapping = parameters.get('include_vendor_mapping', 'true')
            response = generate_csv(invoice_id, include_vendor_mapping)
        else:
            raise ValueError(f"Unknown API path: {api_path}")
        
        return {
            'messageVersion': '1.0',
            'response': response
        }
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return {
            'messageVersion': '1.0',
            'response': {
                'error': str(e)
            }
        }

def verify_invoice_documents(document):
    """
    Verify and extract information from invoice documents
    """
    logger.info(f"Verifying invoice documents: {document}")
    
    # Mock response for demonstration purposes
    # In a real implementation, this would call Amazon Textract or a similar service
    # to extract information from the document
    
    # Sample extracted data
    extracted_data = {
        "document_class": "invoice",
        "confidence": 0.98,
        "inference_result": {
            "vendor": "ABC Corporation",
            "invoice_date": "2025-06-15",
            "payment_terms": "Net 30",
            "due_date": "2025-07-15",
            "currency": "USD",
            "invoice_total_amount": "1250.00",
            "special_remarks": "Please reference PO#12345 in payment",
            "vendor_banking_details": {
                "bank_account": "123456789",
                "bank_code": "ABCDEF",
                "swift_code": "ABCDEFGH"
            },
            "line_items": [
                {
                    "description": "Professional Services",
                    "amount": "1000.00"
                },
                {
                    "description": "Software License",
                    "amount": "250.00"
                }
            ],
            "utility_details": {
                "meter_number": "N/A",
                "delta_readings": "N/A"
            }
        }
    }
    
    return {
        "content": json.dumps(extracted_data),
        "contentType": "application/json"
    }

def record_application_details(invoice_data, invoice_id):
    """
    Record invoice details in the system
    """
    logger.info(f"Recording invoice details for ID: {invoice_id}")
    
    try:
        # Parse the invoice data
        invoice_json = json.loads(invoice_data)
        
        # In a real implementation, this would store the data in a database
        # For now, we'll just return a success message
        
        return {
            "content": json.dumps({
                "status": "success",
                "message": f"Invoice details recorded successfully with ID: {invoice_id}",
                "timestamp": datetime.now().isoformat()
            }),
            "contentType": "application/json"
        }
    except json.JSONDecodeError:
        return {
            "content": json.dumps({
                "status": "error",
                "message": "Invalid JSON format in invoice_data"
            }),
            "contentType": "application/json"
        }

def retrieve_vendor_list(search_criteria):
    """
    Retrieve a list of vendors based on search criteria
    """
    logger.info(f"Retrieving vendor list with criteria: {search_criteria}")
    
    # Mock vendor list for demonstration purposes
    vendors = [
        {
            "vendor_id": "V001",
            "vendor_name": "ABC Corporation",
            "category": "IT Services",
            "contact_email": "accounts@abccorp.com"
        },
        {
            "vendor_id": "V002",
            "vendor_name": "XYZ Supplies",
            "category": "Office Supplies",
            "contact_email": "billing@xyzsupplies.com"
        },
        {
            "vendor_id": "V003",
            "vendor_name": "Global Utilities",
            "category": "Utilities",
            "contact_email": "payments@globalutilities.com"
        }
    ]
    
    # Filter vendors if search criteria is provided
    if search_criteria:
        filtered_vendors = [v for v in vendors if search_criteria.lower() in v["vendor_name"].lower() or 
                           search_criteria.lower() in v["category"].lower()]
        vendors = filtered_vendors
    
    return {
        "content": json.dumps(vendors),
        "contentType": "application/json"
    }

def generate_csv(invoice_id, include_vendor_mapping):
    """
    Generate a CSV file with invoice data
    """
    logger.info(f"Generating CSV for invoice ID: {invoice_id}")
    
    # Mock CSV data for demonstration purposes
    csv_data = "vendor_id,vendor_name,invoice_id,invoice_date,due_date,amount,currency,status\n"
    csv_data += f"V001,ABC Corporation,{invoice_id},2025-06-15,2025-07-15,1250.00,USD,Pending"
    
    # Add vendor mapping if requested
    if include_vendor_mapping.lower() == 'true':
        csv_data += "\n\nVendor Mapping:\nvendor_id,sap_vendor_id,sap_company_code,payment_terms\n"
        csv_data += "V001,SAP10001,1000,NET30"
    
    return {
        "content": csv_data,
        "contentType": "text/csv"
    }
