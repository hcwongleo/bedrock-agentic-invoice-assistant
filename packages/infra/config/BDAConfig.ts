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
        "description": "A comprehensive invoice document for automated processing and data extraction",
        "class": "Comprehensive-Invoice",
        "type": "object",
        "definitions": {
            "Address": {
                "type": "object",
                "properties": {
                    "Line1": {
                        "type": "string",
                        "inferenceType": "explicit",
                        "instruction": "The first line of the address"
                    },
                    "Line2": {
                        "type": "string",
                        "inferenceType": "explicit",
                        "instruction": "The second line of the address"
                    },
                    "City": {
                        "type": "string",
                        "inferenceType": "explicit",
                        "instruction": "The city"
                    },
                    "State": {
                        "type": "string",
                        "inferenceType": "explicit",
                        "instruction": "The state or province"
                    },
                    "ZipCode": {
                        "type": "string",
                        "inferenceType": "explicit",
                        "instruction": "The postal or zip code"
                    },
                    "Country": {
                        "type": "string",
                        "inferenceType": "explicit",
                        "instruction": "The country"
                    }
                }
            },
            "LineItem": {
                "type": "object",
                "properties": {
                    "Description": {
                        "type": "string",
                        "inferenceType": "explicit",
                        "instruction": "Description of the product or service"
                    },
                    "Quantity": {
                        "type": "number",
                        "inferenceType": "explicit",
                        "instruction": "The quantity of items"
                    },
                    "UnitPrice": {
                        "type": "number",
                        "inferenceType": "explicit",
                        "instruction": "The price per unit"
                    },
                    "LineTotal": {
                        "type": "number",
                        "inferenceType": "explicit",
                        "instruction": "The total amount for this line item"
                    }
                }
            }
        },
        "properties": {
            "VendorName": {
                "type": "string",
                "inferenceType": "explicit",
                "instruction": "The name of the vendor or supplier issuing the invoice"
            },
            "VendorAddress": {
                "$ref": "#/definitions/Address"
            },
            "CustomerName": {
                "type": "string",
                "inferenceType": "explicit",
                "instruction": "The name of the customer or client receiving the invoice"
            },
            "CustomerAddress": {
                "$ref": "#/definitions/Address"
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
            "PurchaseOrderNumber": {
                "type": "string",
                "inferenceType": "explicit",
                "instruction": "The purchase order number if applicable"
            },
            "LineItems": {
                "type": "array",
                "instruction": "List of line items on the invoice",
                "items": {
                    "$ref": "#/definitions/LineItem"
                }
            },
            "SubtotalAmount": {
                "type": "number",
                "inferenceType": "explicit",
                "instruction": "The subtotal amount before taxes and fees"
            },
            "TaxAmount": {
                "type": "number",
                "inferenceType": "explicit",
                "instruction": "The total tax amount"
            },
            "TaxRate": {
                "type": "number",
                "inferenceType": "explicit",
                "instruction": "The tax rate as a percentage"
            },
            "DiscountAmount": {
                "type": "number",
                "inferenceType": "explicit",
                "instruction": "Any discount amount applied"
            },
            "ShippingAmount": {
                "type": "number",
                "inferenceType": "explicit",
                "instruction": "Shipping or delivery charges"
            },
            "InvoiceTotalAmount": {
                "type": "number",
                "inferenceType": "explicit",
                "instruction": "The total amount due on the invoice including all taxes and fees"
            },
            "Currency": {
                "type": "string",
                "inferenceType": "explicit",
                "instruction": "The currency code (e.g., USD, EUR, GBP)"
            },
            "PaymentTerms": {
                "type": "string",
                "inferenceType": "explicit",
                "instruction": "Payment terms and conditions"
            },
            "Notes": {
                "type": "string",
                "inferenceType": "explicit",
                "instruction": "Any additional notes or comments on the invoice"
            }
        }
    }`
}
