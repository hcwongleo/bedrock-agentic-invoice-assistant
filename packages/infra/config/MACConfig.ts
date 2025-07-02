import { CfnAgent } from 'aws-cdk-lib/aws-bedrock';

export const FoundationModel = {
    'Claude3_5': "anthropic.claude-3-5-sonnet-20241022-v2:0",
    'Nova_Pro': "amazon.nova-pro-v1:0"
}

export const MACAgentInstruction = {
    'InvoiceAssistant': "ALWAYS, ALWAYS,ALWAYS use code interpreter to get todays date  when the application starts.\nYou are a helpful invoice processing assistant with access to a few specialized assistant:\n \
        invoice processing assistant who allowing seamless invoice processing flow, reviewing invoice. Vendor identification assistant who can identify vendor of the invoice, consolidate it into a csv, generate SAP data input form.\n \
        Do not ask additonal questions if users provide documents, use invoice processing assistant to handle all invoice processing tasks. If asked for a complicated calculation, use your code interpreter to be sure it's done accurately.",
    'InvoiceAppAssistant': "Role: Invoice Processing Assistant, Goal: Handle invoice processing and invoice review.\nInstructions:\n<instruction>\nYou are a Invoice Processing Assistant responsible for guiding users through invoice processing process. Your goal is to collect and verify the invoice information.\nOnce the applicants upload the invoice, you should verify is the uploaded invoice extracted fields is complete\nInitial Interaction: Let's get started on your invoice processing, to begin, please upload the invoice\n</instruction>\n<required_fields>\nPrecise identification of the following fields from invoices:\n1.Vendor\n2.Invoice Date\3.Payment Terms\n4.Due Date\n5.Currency\n6.Invoice Total Amount\n7.Invoice Line Items (Description and Amount)\n8.Special Remarks from Vendor if any\n9.Vendor's Bank Account, Bank Code, and SWIFT code\n10.Meter Number, Delta of Readings on Water Bills\n</required_fields>",
    'VendorIdentificationAgent': "Role: Vendor Identification Agent, \
        Goal: Generate HTML pre-approval letters based on invoice data and enriched with mapped vendor., \
        Instructions: You are a vendor Identification agent <instruction>\nYou are a vendor Identification agent responsible for generating invoice data enriched with mapped vendor in high-quality, production-ready csv format.\n<instruction></instruction>"
}

export const MACDescription = {
    'InvoiceAssistant': "Provide a unified experience for all things related to invoice processing, including document review, field extraction, vendor identification, and SAP data input form generation. Acts as the main coordinator for seamless invoice processing workflows.",
    'InvoiceAppAssistant': "Role: Invoice Processing Assistant, Goal: Handle invoice document processing, field extraction, and verification. Responsible for guiding users through invoice processing workflows and ensuring complete field extraction from uploaded invoices.",
    'VendorIdentificationAgent': "Role: Vendor Identification Agent, Goal: Identify vendors from invoice data, consolidate information into CSV format, and generate SAP data input forms. Enriches invoice data with mapped vendor information for production-ready output."
}

export const MACCollaborationInstruction = {
    'InvoiceAppAssistant': "Use this collaborator for invoice document processing, field extraction, and verification. This agent handles the initial invoice upload, extracts required fields (vendor, invoice date, payment terms, due date, currency, total amount, line items, special remarks, bank details, and meter readings for utility bills), and validates completeness of extracted data. Use this agent when users upload invoices or need document processing assistance.",
    'VendorIdentificationAgent': "Use this collaborator for vendor identification, data consolidation, and SAP form generation. This agent maps vendors from invoice data, creates production-ready CSV files, and generates SAP data input forms. Use this agent when you need to identify vendors, consolidate invoice data, or generate structured output for SAP systems."
}

export const InvoiceProcessingActionGroup: CfnAgent.FunctionSchemaProperty = {
    "functions": [
        {
            "name": "verify_invoice_documents",
            "description": "Retrieves the extracted JSON information from uploaded invoice documents. Takes the document name as input parameter and returns a JSON object representing the extracted structured data from the invoice document.\n - document_class: Document type classification (invoice, receipt, etc.)\n - confidence: Classification confidence score\n - inference_result: Extracted invoice information including vendor, amounts, dates, line items\nReturns detailed document extraction and validation results for invoice processing documents with all required fields as specified in the agent instructions.",
            "parameters": {
                "document": {
                    "description": "Comma-separated list of invoice documents to be verified and processed.",
                    "type": "string",
                    "required": true
                }
            }
        },
        {
            "name": "record_application_details",
            "description": "Record the extracted invoice details in JSON format. The function stores comprehensive invoice information including vendor details, payment terms, and line items.\nExpected JSON format:\n{\n   \"invoice_details\": {\n       \"vendor\": \"vendor name\",\n       \"invoice_date\": \"YYYY-MM-DD\",\n       \"payment_terms\": \"payment terms description\",\n       \"due_date\": \"YYYY-MM-DD\",\n       \"currency\": \"currency code\",\n       \"invoice_total_amount\": \"numeric value\",\n       \"special_remarks\": \"any special remarks from vendor\"\n   },\n   \"vendor_banking_details\": {\n       \"bank_account\": \"vendor's bank account number\",\n       \"bank_code\": \"bank code\",\n       \"swift_code\": \"SWIFT code\"\n   },\n   \"line_items\": [\n       {\n           \"description\": \"item description\",\n           \"amount\": \"item amount\"\n       }\n   ],\n   \"utility_details\": {\n       \"meter_number\": \"meter number if applicable\",\n       \"delta_readings\": \"delta of readings for water bills\"\n   }\n}",
            "parameters": {
                "invoice_data": {
                    "description": "JSON string containing the complete invoice details including vendor information, payment terms, line items, and banking details",
                    "type": "string",
                    "required": true
                },
                "invoice_id": {
                    "description": "The invoice ID for tracking and reference",
                    "type": "string",
                    "required": true
                }
            }
        },
        {
            "name": "retrieve_vendor_list",
            "description": "Retrieves the list of known vendors from the system database for vendor identification and mapping purposes. This function helps identify and match vendors from invoice data against existing vendor records.",
            "parameters": {
                "search_criteria": {
                    "description": "Optional search criteria to filter vendors (e.g., vendor name, category, or other identifying information)",
                    "type": "string",
                    "required": false
                }
            }
        },
        {
            "name": "generate_csv",
            "description": "Generates a production-ready CSV file containing consolidated invoice data enriched with mapped vendor information. The CSV includes all extracted invoice fields, vendor details, and is formatted for SAP data input or other enterprise systems.",
            "parameters": {
                "invoice_id": {
                    "description": "The invoice ID to generate CSV data for",
                    "type": "string",
                    "required": true
                },
                "include_vendor_mapping": {
                    "description": "Boolean flag to include vendor mapping and enrichment data in the CSV output",
                    "type": "string",
                    "required": false
                }
            }
        }
    ]
}
