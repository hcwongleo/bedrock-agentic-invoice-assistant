# Comprehensive Invoice Blueprint Documentation

## Overview

The Comprehensive Invoice Blueprint is a custom Bedrock Data Automation (BDA) schema designed to precisely identify and extract all critical fields from various types of invoices, including standard invoices, utility bills, and service invoices.

## Extracted Fields

### 🏢 **Vendor Information**
- **VendorName**: The name of the vendor or supplier issuing the invoice
- **VendorAddress**: The complete address of the vendor
- **VendorContactInfo**: Vendor contact information including phone, email, or website
- **VendorTaxID**: The vendor's tax identification number or VAT number

### 📄 **Invoice Details**
- **InvoiceNumber**: The unique invoice number assigned by the vendor
- **InvoiceDate**: The date the invoice was issued (MM/DD/YYYY format)
- **InvoiceType**: The type of invoice (Standard, Utility, Service, Product)
- **PurchaseOrderNumber**: The purchase order number if referenced
- **CustomerAccountNumber**: The customer account number with the vendor

### 💰 **Financial Information**
- **InvoiceTotalAmount**: The total amount due including all taxes and fees
- **SubtotalAmount**: The subtotal amount before taxes and additional fees
- **TaxAmount**: The total tax amount applied to the invoice
- **TaxRate**: The tax rate percentage applied
- **DiscountAmount**: Any discount amount applied to the invoice
- **ShippingAmount**: Shipping or delivery charges
- **Currency**: The currency code (USD, EUR, GBP) or currency symbol

### 💳 **Payment Information**
- **PaymentTerms**: Payment terms (Net 30, Due on Receipt, 2/10 Net 30)
- **DueDate**: The date payment is due (MM/DD/YYYY format)
- **PaymentInstructions**: Specific payment instructions from the vendor

### 🏦 **Vendor Bank Details**
- **BankAccountNumber**: The vendor's bank account number for payments
- **BankCode**: The bank code or routing number
- **SWIFTCode**: The SWIFT/BIC code for international transfers
- **BankName**: The name of the vendor's bank
- **BankAddress**: The address of the vendor's bank

### 📋 **Line Items**
Each line item includes:
- **Description**: The description of the line item or service
- **Quantity**: The quantity of items or services
- **UnitPrice**: The price per unit
- **Amount**: The total amount for this line item
- **TaxAmount**: The tax amount for this line item
- **DiscountAmount**: Any discount applied to this line item

### 🔧 **Utility-Specific Fields (Water Bills)**
- **MeterNumber**: The meter number for utility bills
- **PreviousReading**: The previous meter reading
- **CurrentReading**: The current meter reading
- **DeltaReading**: The difference between current and previous readings (consumption)
- **ReadingUnit**: The unit of measurement (gallons, cubic meters, kWh)
- **ReadingDate**: The date when the reading was taken

### 📝 **Additional Information**
- **SpecialRemarks**: Any special remarks, notes, or instructions from the vendor
- **BillingPeriod**: The billing period for recurring services
- **ServicePeriod**: The period during which services were provided

### 🤖 **Inferred Fields**
- **IsUtilityBill**: Whether this invoice is a utility bill with meter readings
- **HasBankDetails**: Whether vendor bank details are provided
- **TotalLineItems**: The total number of line items on the invoice
- **IsOverdue**: Whether the invoice is past its due date

## Blueprint Configuration

The blueprint is configured in the BDA stack with the following priority order:

1. **ComprehensiveInvoice-Custom** (Primary - our custom blueprint)
2. **Invoice** (AWS standard invoice blueprint)
3. **Water-And-Sewer-Bill** (AWS utility bill blueprint)
4. **Electricity-Bill** (AWS electricity bill blueprint)
5. **Bank-Statement** (For financial documents)

## Usage in Application

### Frontend Display
The extracted data is displayed in the Review dashboard with:
- **Filterable columns**: Vendor, Amount, Payment Terms, Currency, Category
- **Detailed view modal**: Shows all extracted fields including bank details and meter readings
- **Special data column**: Displays bank account info and meter readings when available

### Data Processing Flow
1. User uploads invoice document
2. S3 triggers EventBridge notification
3. Lambda function invokes BDA with comprehensive blueprint
4. BDA processes document using AI models
5. Extracted data stored in structured JSON format
6. Frontend displays processed results in Review dashboard

## Supported Document Types

- **Standard Invoices**: Business-to-business invoices
- **Utility Bills**: Water, electricity, gas bills with meter readings
- **Service Invoices**: Professional services, consulting
- **Product Invoices**: Physical goods with line items
- **International Invoices**: Multi-currency with SWIFT codes

## Benefits

1. **Comprehensive Extraction**: Captures all critical invoice fields
2. **Utility Bill Support**: Special handling for meter readings and consumption
3. **Banking Integration**: Extracts payment details for automated processing
4. **Multi-Currency Support**: Handles international invoices
5. **SAP Ready**: Structured data format suitable for ERP integration
6. **AI-Powered**: Uses Amazon Bedrock for intelligent field recognition

## Example Output Structure

```json
{
  "VendorName": "ABC Utilities Company",
  "InvoiceNumber": "INV-2024-001234",
  "InvoiceDate": "01/15/2024",
  "DueDate": "02/14/2024",
  "PaymentTerms": "Net 30",
  "Currency": "USD",
  "InvoiceTotalAmount": 245.67,
  "VendorBankDetails": {
    "BankAccountNumber": "1234567890",
    "BankCode": "021000021",
    "SWIFTCode": "CHASUS33"
  },
  "UtilityMeterReadings": [{
    "MeterNumber": "WM-789456",
    "PreviousReading": 1250,
    "CurrentReading": 1375,
    "DeltaReading": 125,
    "ReadingUnit": "gallons"
  }],
  "LineItems": [{
    "Description": "Water Usage - January 2024",
    "Amount": 125.50
  }],
  "SpecialRemarks": "Payment due within 30 days. Late fees apply after due date."
}
```

This comprehensive approach ensures that all critical invoice information is captured and made available for automated processing and SAP integration.
