import { 
    Modal, 
    Box, 
    SpaceBetween, 
    Container, 
    Header, 
    ColumnLayout,
    Button,
    StatusIndicator
} from "@cloudscape-design/components";

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

interface InvoiceDetailModalProps {
    visible: boolean;
    onDismiss: () => void;
    invoice: InvoiceData | null;
}

export const InvoiceDetailModal = ({ visible, onDismiss, invoice }: InvoiceDetailModalProps) => {
    if (!invoice) return null;

    const getStatusType = (status: string) => {
        if (status === "Pending Review") return "info";
        if (status === "Awaiting Approval") return "warning";
        if (status === "Processed") return "success";
        if (status === "Rejected") return "error";
        return "in-progress";
    };

    return (
        <Modal
            visible={visible}
            onDismiss={onDismiss}
            header="Invoice Details"
            size="large"
            footer={
                <Box float="right">
                    <Button variant="primary" onClick={onDismiss}>
                        Close
                    </Button>
                </Box>
            }
        >
            <SpaceBetween size="l">
                {/* Basic Invoice Information */}
                <Container header={<Header variant="h3">Invoice Information</Header>}>
                    <ColumnLayout columns={2} variant="text-grid">
                        <div>
                            <Box variant="awsui-key-label">Invoice ID</Box>
                            <Box variant="awsui-value-large">{invoice.invoiceId}</Box>
                        </div>
                        <div>
                            <Box variant="awsui-key-label">Status</Box>
                            <StatusIndicator type={getStatusType(invoice.status)}>
                                {invoice.status}
                            </StatusIndicator>
                        </div>
                        <div>
                            <Box variant="awsui-key-label">Vendor Name</Box>
                            <Box>{invoice.vendorName}</Box>
                        </div>
                        <div>
                            <Box variant="awsui-key-label">Category</Box>
                            <Box>{invoice.category}</Box>
                        </div>
                        <div>
                            <Box variant="awsui-key-label">Invoice Amount</Box>
                            <Box variant="awsui-value-large">
                                {invoice.currency} {invoice.invoiceAmount.toLocaleString()}
                            </Box>
                        </div>
                        <div>
                            <Box variant="awsui-key-label">Currency</Box>
                            <Box>{invoice.currency}</Box>
                        </div>
                    </ColumnLayout>
                </Container>

                {/* Payment Information */}
                <Container header={<Header variant="h3">Payment Information</Header>}>
                    <ColumnLayout columns={2} variant="text-grid">
                        <div>
                            <Box variant="awsui-key-label">Invoice Date</Box>
                            <Box>{new Date(invoice.invoiceDate).toLocaleDateString()}</Box>
                        </div>
                        <div>
                            <Box variant="awsui-key-label">Due Date</Box>
                            <Box>{new Date(invoice.dueDate).toLocaleDateString()}</Box>
                        </div>
                        <div>
                            <Box variant="awsui-key-label">Payment Terms</Box>
                            <Box>{invoice.paymentTerms}</Box>
                        </div>
                        <div>
                            <Box variant="awsui-key-label">PO Number</Box>
                            <Box>{invoice.poNumber || 'N/A'}</Box>
                        </div>
                    </ColumnLayout>
                </Container>

                {/* Bank Details */}
                {invoice.bankDetails && (
                    <Container header={<Header variant="h3">Vendor Bank Details</Header>}>
                        <ColumnLayout columns={2} variant="text-grid">
                            <div>
                                <Box variant="awsui-key-label">Account Number</Box>
                                <Box>{invoice.bankDetails.accountNumber || 'N/A'}</Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Bank Code</Box>
                                <Box>{invoice.bankDetails.bankCode || 'N/A'}</Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">SWIFT Code</Box>
                                <Box>{invoice.bankDetails.swiftCode || 'N/A'}</Box>
                            </div>
                        </ColumnLayout>
                    </Container>
                )}

                {/* Utility Meter Readings */}
                {invoice.meterReadings && (
                    <Container header={<Header variant="h3">Utility Meter Information</Header>}>
                        <ColumnLayout columns={2} variant="text-grid">
                            <div>
                                <Box variant="awsui-key-label">Meter Number</Box>
                                <Box>{invoice.meterReadings.meterNumber || 'N/A'}</Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Usage Delta</Box>
                                <Box>{invoice.meterReadings.deltaReading || 'N/A'}</Box>
                            </div>
                        </ColumnLayout>
                    </Container>
                )}

                {/* Special Remarks */}
                {invoice.specialRemarks && (
                    <Container header={<Header variant="h3">Special Remarks</Header>}>
                        <Box>{invoice.specialRemarks}</Box>
                    </Container>
                )}

                {/* Processing Notes */}
                <Container header={<Header variant="h3">Processing Notes</Header>}>
                    <Box>{invoice.notes}</Box>
                </Container>
            </SpaceBetween>
        </Modal>
    );
};
