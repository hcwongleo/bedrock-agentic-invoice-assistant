import { 
    Button, 
    Header, 
    Container, 
    StatusIndicator, 
    BreadcrumbGroup,
    PropertyFilter,
    PropertyFilterProps,
    Table,
    Box,
    SpaceBetween,
    ColumnLayout,
    Link
  } from "@cloudscape-design/components";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchJsonFromPath, useS3ListItems } from '../hooks/useStorage';
import { QUERY_KEYS } from "../utils/types";
import { useQueryClient } from '@tanstack/react-query';
import { remove } from 'aws-amplify/storage';
import { InvoiceDetailModal } from '../components/InvoiceDetailModal';
import { BDAResultModal } from '../components/BDAResultModal';
  
interface InvoiceData {
    invoiceId: string;
    vendorName: string;
    invoiceAmount: number;
    invoiceDate: string;
    dueDate: string;
    paymentTerms: string;
    currency: string;
    status: string;
    notes: string;
    timestamp: string;
    poNumber?: string;
    category: string;
    bankDetails?: {
        accountNumber?: string;
        bankCode?: string;
        swiftCode?: string;
    };
    meterReadings?: {
        meterNumber?: string;
        deltaReading?: number;
    };
    specialRemarks?: string;
}

interface FilterToken extends PropertyFilterProps.Token {
    propertyKey: keyof InvoiceData;
    operator: ":" | "=" | "!=" | ">" | "<";
    value: string;
}

interface FilterQuery extends PropertyFilterProps.Query {
    tokens: readonly FilterToken[]; 
    operation: 'and' | 'or';
}

const filterInvoices = (
    invoices: InvoiceData[], 
    query: PropertyFilterProps.Query
) => {
    if (!query.tokens.length) return invoices;

    return invoices.filter(invoice => {
        const results = query.tokens.map(token => {
            if (!token.propertyKey) return true;
            
            const value = String(invoice[token.propertyKey as keyof InvoiceData]);
            
            switch (token.operator) {
                case ":":
                    return value.toLowerCase().includes(token.value.toLowerCase());
                case "=":
                    return value.toLowerCase() === token.value.toLowerCase();
                case "!=":
                    return value.toLowerCase() !== token.value.toLowerCase();
                case ">":
                    return Number(value) > Number(token.value);
                case "<":
                    return Number(value) < Number(token.value);
                default:
                    return true;
            }
        });

        return query.operation === 'and' 
            ? results.every(r => r) 
            : results.some(r => r);
    });
};

export const Review = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { data: invoiceItems, isLoading, refetch } = useS3ListItems(QUERY_KEYS.APPLICATIONS);
    const [invoices, setInvoices] = useState<InvoiceData[]>([]);
    const [query, setQuery] = useState<PropertyFilterProps.Query>({
        tokens: [],
        operation: "and"
      });
    const filteredInvoices = filterInvoices(invoices, query);
    const [isDeleted, setIsDeleted] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [selectedBDAResult, setSelectedBDAResult] = useState<any>(null);
    const [selectedFileName, setSelectedFileName] = useState<string>('');
    const [isBDAModalVisible, setIsBDAModalVisible] = useState(false);

    const getInvoiceCounts = (invoices: InvoiceData[]) => {
        return {
            pending: invoices.filter(invoice => invoice.status === "Pending Review").length,
            processed: invoices.filter(invoice => invoice.status === "Processed").length,
            awaitingApproval: invoices.filter(invoice => invoice.status === "Awaiting Approval").length
        };
    };

    const fetchBDAResult = async (invoiceId: string) => {
        try {
            // Try to find the corresponding BDA result file
            const bdaFileName = `${invoiceId.toLowerCase()}-result.json`;
            const bdaResult = await fetchJsonFromPath(`bda-result/${bdaFileName}`);
            return bdaResult;
        } catch (error) {
            console.error('Error fetching BDA result:', error);
            return null;
        }
    };

    const handleViewResult = async (invoice: InvoiceData) => {
        const bdaResult = await fetchBDAResult(invoice.invoiceId);
        if (bdaResult) {
            setSelectedBDAResult(bdaResult);
            setSelectedFileName(invoice.invoiceId);
            setIsBDAModalVisible(true);
        } else {
            // Fallback: create a mock BDA result from the invoice data
            const mockBDAResult = {
                document_class: {
                    type: 'invoice',
                    confidence: 0.95
                },
                matched_blueprint: {
                    name: 'Invoice Processing Blueprint',
                    confidence: 0.95
                },
                inference_result: {
                    vendor_name: invoice.vendorName,
                    invoice_id: invoice.invoiceId,
                    invoice_date: invoice.invoiceDate,
                    due_date: invoice.dueDate,
                    total_amount: invoice.invoiceAmount,
                    currency: invoice.currency,
                    payment_terms: invoice.paymentTerms,
                    po_number: invoice.poNumber,
                    category: invoice.category,
                    special_remarks: invoice.specialRemarks,
                    bank_details: invoice.bankDetails,
                    meter_readings: invoice.meterReadings
                }
            };
            setSelectedBDAResult(mockBDAResult);
            setSelectedFileName(invoice.invoiceId);
            setIsBDAModalVisible(true);
        }
    };

    useEffect(() => {
        queryClient.invalidateQueries({ 
            queryKey: [QUERY_KEYS.APPLICATIONS] 
        });
        refetch();
    }, [refetch]); 

    useEffect(() => {
        console.log('Invoice Items:', invoiceItems);
        if (!invoiceItems) {
            setInvoices([]);
            return;
        }

        const fetchInvoices = async () => {
            try {
                const invoicesData = await Promise.all(
                    invoiceItems.map(async (item) => {
                        const fullPath = `${item.path}${item.itemName}`;
                        const jsonData = await fetchJsonFromPath(fullPath);
                        if (!jsonData || typeof jsonData === 'string') {
                            console.error('Invalid JSON data received');
                            return null;
                        }
                        
                        // Map the data to comprehensive invoice structure
                        // This handles both old data and new BDA comprehensive invoice results
                        return {
                            invoiceId: jsonData.InvoiceNumber || 
                                      jsonData.invoice_id || 
                                      jsonData.application_id || 
                                      `INV-${Date.now()}`,
                            vendorName: jsonData.VendorName || 
                                       jsonData.vendor_name || 
                                       jsonData.applicant_details?.primary_borrower?.name || 
                                       'Unknown Vendor',
                            invoiceAmount: jsonData.InvoiceTotalAmount || 
                                          jsonData.invoice_amount || 
                                          jsonData.property_details?.mortgage_amount || 
                                          0,
                            invoiceDate: jsonData.InvoiceDate || 
                                        jsonData.invoice_date || 
                                        jsonData.timestamp?.split('T')[0] || 
                                        new Date().toISOString().split('T')[0],
                            dueDate: jsonData.DueDate || 
                                    jsonData.due_date || 
                                    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            paymentTerms: jsonData.PaymentTerms || 
                                         jsonData.payment_terms || 
                                         'Net 30',
                            currency: jsonData.Currency || 
                                     jsonData.currency || 
                                     'USD',
                            status: jsonData.status || "Pending Review",
                            notes: jsonData.notes || "Awaiting processing",
                            timestamp: jsonData.timestamp || new Date().toISOString(),
                            poNumber: jsonData.PurchaseOrderNumber || 
                                     jsonData.po_number || 
                                     jsonData.purchase_order,
                            category: jsonData.InvoiceType || 
                                     jsonData.category || 
                                     jsonData.invoice_category || 
                                     "General",
                            bankDetails: jsonData.VendorBankDetails ? {
                                accountNumber: jsonData.VendorBankDetails.BankAccountNumber,
                                bankCode: jsonData.VendorBankDetails.BankCode,
                                swiftCode: jsonData.VendorBankDetails.SWIFTCode
                            } : undefined,
                            meterReadings: jsonData.UtilityMeterReadings && jsonData.UtilityMeterReadings.length > 0 ? {
                                meterNumber: jsonData.UtilityMeterReadings[0].MeterNumber,
                                deltaReading: jsonData.UtilityMeterReadings[0].DeltaReading
                            } : undefined,
                            specialRemarks: jsonData.SpecialRemarks || 
                                           jsonData.special_remarks || 
                                           jsonData.PaymentInstructions
                        };
                    })
                );
                
                // Filter out any null values and sort by timestamp
                const validInvoices = invoicesData
                    .filter(invoice => invoice !== null)
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((invoice, index) => ({
                        ...invoice,
                        status: index === 0 ? "Pending Review" : invoice.status,
                        notes: index === 0 ? "New invoice, needs review" : (invoice.notes || "Processed")
                    }));

                console.log('Processed and sorted invoices:', validInvoices);
                setInvoices(validInvoices);
            } catch (error) {
                console.error('Error loading invoices:', error);
            }
        };

        fetchInvoices();
    }, [invoiceItems]);
  
    return(
        <SpaceBetween size="l">
            <BreadcrumbGroup
              items={[
              { text: "Invoice Processing", href: "/" },
              {
                  text: "Invoice Review Dashboard",
                  href: "#"
              }
              ]}
              ariaLabel="Breadcrumbs"
            />

            <Container
                header={<Header variant="h2">Invoice Processing Overview</Header>}
            >
                <ColumnLayout columns={3} variant="text-grid">
                    <div>
                        <Box variant="awsui-key-label">Pending Review</Box>
                        <Box variant="awsui-value-large">{getInvoiceCounts(invoices).pending}</Box>
                    </div>
                    <div>
                        <Box variant="awsui-key-label">Processed</Box>
                        <Box variant="awsui-value-large">{getInvoiceCounts(invoices).processed}</Box>
                    </div>
                    <div>
                        <Box variant="awsui-key-label">Awaiting Approval</Box>
                        <Box variant="awsui-value-large">{getInvoiceCounts(invoices).awaitingApproval}</Box>
                    </div>
                </ColumnLayout>
            </Container>
  

            <PropertyFilter
                query={query}
                onChange={({ detail }) => setQuery(detail)}
                filteringPlaceholder="Find invoice by vendor name, invoice ID, or amount"
                filteringProperties={[
                    {
                        key: "invoiceId",
                        operators: [":", "=", "!="],
                        propertyLabel: "Invoice ID",
                        groupValuesLabel: "Invoice ID values"
                    },
                    {
                        key: "vendorName",
                        operators: [":", "=", "!="],
                        propertyLabel: "Vendor Name",
                        groupValuesLabel: "Vendor names"
                    },
                    {
                        key: "invoiceAmount",
                        operators: ["=", "!=", ">", "<"],
                        propertyLabel: "Invoice Amount",
                        groupValuesLabel: "Invoice amounts"
                    },
                    {
                        key: "status",
                        operators: ["=", "!="],
                        propertyLabel: "Status",
                        groupValuesLabel: "Status values"
                    },
                    {
                        key: "paymentTerms",
                        operators: ["=", "!="],
                        propertyLabel: "Payment Terms",
                        groupValuesLabel: "Payment terms"
                    },
                    {
                        key: "paymentTerms",
                        operators: ["=", "!="],
                        propertyLabel: "Payment Terms",
                        groupValuesLabel: "Payment terms"
                    },
                    {
                        key: "currency",
                        operators: ["=", "!="],
                        propertyLabel: "Currency",
                        groupValuesLabel: "Currencies"
                    },
                    {
                        key: "category",
                        operators: ["=", "!="],
                        propertyLabel: "Category",
                        groupValuesLabel: "Categories"
                    }
                ]}
                filteringOptions={[
                    // Status options
                    { propertyKey: "status", value: "Pending Review" },
                    { propertyKey: "status", value: "Processed" },
                    { propertyKey: "status", value: "Awaiting Approval" },
                    { propertyKey: "status", value: "Rejected" },
                    // Category options
                    { propertyKey: "category", value: "General" },
                    { propertyKey: "category", value: "Utility" },
                    { propertyKey: "category", value: "Service" },
                    { propertyKey: "category", value: "Product" },
                    // Payment terms options
                    { propertyKey: "paymentTerms", value: "Net 30" },
                    { propertyKey: "paymentTerms", value: "Net 15" },
                    { propertyKey: "paymentTerms", value: "Due on Receipt" },
                    { propertyKey: "paymentTerms", value: "2/10 Net 30" },
                    // Currency options
                    { propertyKey: "currency", value: "USD" },
                    { propertyKey: "currency", value: "EUR" },
                    { propertyKey: "currency", value: "GBP" }
                ]}
            />
    
            <Table
                loading={isLoading}
                loadingText="Loading invoices"
                items={filteredInvoices}
                columnDefinitions={[
                {
                    id: "invoiceId",
                    header: "Invoice ID",
                    cell: item => {
                        const isLatest = item === invoices[0];
                        if (isLatest) {
                            return (
                                <Link
                                    onClick={() => navigate(`/portal/${item.invoiceId}`)}
                                >
                                    {item.invoiceId}
                                </Link>
                            );
                        }
                        return item.invoiceId;
                    },
                    sortingField: "invoiceId"
                },
                {
                    id: "vendorName",
                    header: "Vendor Name",
                    cell: item => item.vendorName,
                    sortingField: "vendorName"
                },
                {
                    id: "invoiceAmount",
                    header: "Invoice Amount",
                    cell: item => `$${item.invoiceAmount.toLocaleString()}`,
                    sortingField: "invoiceAmount"
                },
                {
                    id: "invoiceDate",
                    header: "Invoice Date",
                    cell: item => new Date(item.invoiceDate).toLocaleDateString(),
                    sortingField: "invoiceDate"
                },
                {
                    id: "dueDate",
                    header: "Due Date",
                    cell: item => new Date(item.dueDate).toLocaleDateString(),
                    sortingField: "dueDate"
                },
                {
                    id: "paymentTerms",
                    header: "Payment Terms",
                    cell: item => item.paymentTerms,
                    sortingField: "paymentTerms"
                },
                {
                    id: "currency",
                    header: "Currency",
                    cell: item => item.currency,
                    sortingField: "currency"
                },
                {
                    id: "category",
                    header: "Category",
                    cell: item => item.category,
                    sortingField: "category"
                },
                {
                    id: "specialData",
                    header: "Special Data",
                    cell: item => {
                        const specialData = [];
                        if (item.bankDetails?.accountNumber) {
                            specialData.push(`Bank: ${item.bankDetails.accountNumber}`);
                        }
                        if (item.meterReadings?.meterNumber) {
                            specialData.push(`Meter: ${item.meterReadings.meterNumber}`);
                        }
                        if (item.meterReadings?.deltaReading) {
                            specialData.push(`Usage: ${item.meterReadings.deltaReading}`);
                        }
                        return specialData.length > 0 ? specialData.join(', ') : '-';
                    }
                },
                {
                    id: "poNumber",
                    header: "PO Number",
                    cell: item => item.poNumber || "-"
                },
                {
                    id: "status",
                    header: "Processing Status",
                    cell: item => {
                        const getStatusType = (status: string, isLatest: boolean) => {
                            if (isLatest) return "info";
                            if (status === "Awaiting Approval") return "warning";
                            if (status === "Processed") return "success";
                            if (status === "Rejected") return "error";
                            return "in-progress"; 
                        };
                
                        // Check if this is the latest invoice by timestamp
                        const isLatest = item === invoices[0];
                
                        return (
                            <StatusIndicator 
                                type={getStatusType(item.status, isLatest)}
                            >
                                {isLatest ? "Pending Review" : item.status}
                            </StatusIndicator>
                        )
                    }
                },
                {
                    id: "actions",
                    header: "Actions",
                    cell: item => (
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button
                                variant="inline-link"
                                onClick={() => {
                                    setSelectedInvoice(item);
                                    setIsDetailModalVisible(true);
                                }}
                            >
                                View Details
                            </Button>
                            <Button
                                variant="inline-link"
                                iconName="download"
                                onClick={() => handleViewResult(item)}
                            >
                                View Result
                            </Button>
                        </SpaceBetween>
                    )
                },
                {
                    id: "notes",
                    header: "Notes/Comments",
                    cell: item => item.notes
                }]}
                empty={
                    <Box textAlign="center" color="inherit">
                        <b>No invoices found</b>
                        <Box variant="p" color="inherit">
                            Upload invoice documents to get started with processing.
                        </Box>
                    </Box>
                }
                header={
                    <Header
                        variant="h2"
                        actions={             
                            <Button 
                                iconName={isDeleted ? "status-positive" : "remove"}
                                onClick={async () => {
                                   if (invoiceItems) {
                                       // Get the items in reverse order to get the latest one
                                       const items = [...invoiceItems].reverse();
                                       console.log("Reversed items:", items);
                                       
                                       if (items.length > 0) {
                                           const latestItem = items[0];
                                           console.log("Item to delete:", latestItem);
                                           const fullPath = `${latestItem.path}${latestItem.itemName}`;
               
                                           try {
                                               await remove({ path: fullPath });
                                               console.log("File deleted successfully");
                                               
                                               queryClient.invalidateQueries({ 
                                                   queryKey: [QUERY_KEYS.APPLICATIONS] 
                                               });
                                               refetch();
                                               setIsDeleted(true);
                                               setTimeout(() => setIsDeleted(false), 2000);
                                           } catch (error) {
                                               console.error('Delete operation failed:', error);
                                           }
                                       }
                                   }
                                }
                            }
                             loading={isLoading}
                            >
                                {isDeleted ? "Deleted" : "Clear"}
                            </Button>
                        }
                    >Invoice Processing Queue</Header>
                }
            />

            <InvoiceDetailModal
                visible={isDetailModalVisible}
                onDismiss={() => {
                    setIsDetailModalVisible(false);
                    setSelectedInvoice(null);
                }}
                invoice={selectedInvoice}
            />

            <BDAResultModal
                visible={isBDAModalVisible}
                onDismiss={() => {
                    setIsBDAModalVisible(false);
                    setSelectedBDAResult(null);
                    setSelectedFileName('');
                }}
                bdaResult={selectedBDAResult}
                fileName={selectedFileName}
            />
        </SpaceBetween>
    );
}