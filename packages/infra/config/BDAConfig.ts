export const standardOutputConfiguration = {
    'document': {
        'extraction': {
            'granularity': {
                'types': [
                    'DOCUMENT','PAGE'
                ]
            },
            'boundingBox': {
                'state': 'DISABLED'
            }
        },
        'generativeField': {
            'state': 'DISABLED'
        },
        'outputFormat': {
            'textFormat': {
                'types': [
                    'MARKDOWN',
                ]
            },
            'additionalFileFormat': {
                'state': 'DISABLED'
            }
        }
    }
}

export const sampleBlueprints = {
    'Invoice': 'arn:aws:bedrock:us-east-1:aws:blueprint/bedrock-data-automation-public-invoice',
}

export const customBlueprint = {
    'ComprehensiveInvoice': `{
        "$schema": "http://json-schema.org/draft-07/schema#",
        "description": "A comprehensive invoice document",
        "class": "Comprehensive-Invoice",
        "type": "object",
        "properties": {
            "VendorName": {
                "type": "string",
                "inferenceType": "explicit",
                "instruction": "The name of the vendor or supplier issuing the invoice"
            },
            "InvoiceNumber": {
                "type": "string",
                "inferenceType": "explicit",
                "instruction": "The unique invoice number assigned by the vendor"
            },
            "InvoiceDate": {
                "type": "string",
                "inferenceType": "explicit",
                "instruction": "The date the invoice was issued in MM/DD/YYYY format"
            },
            "DueDate": {
                "type": "string",
                "inferenceType": "explicit",
                "instruction": "The date payment is due in MM/DD/YYYY format"
            },
            "InvoiceTotalAmount": {
                "type": "number",
                "inferenceType": "explicit",
                "instruction": "The total amount due on the invoice including all taxes and fees"
            }
        }
    }`
}
