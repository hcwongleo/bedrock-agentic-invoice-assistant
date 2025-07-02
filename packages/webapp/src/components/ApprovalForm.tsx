import React, { useState, useEffect } from 'react';
import { 
    SplitPanel,
    Form,
    SpaceBetween,
    Button,
    FormField,
    Input,
    Box,
    Checkbox,
    Modal,
    Icon,
    Header,
    Textarea
} from "@cloudscape-design/components";
import { useMutation } from "@tanstack/react-query";
import { appsyncResolver } from "../hooks/useApi";
import { HtmlPreview } from './HtmlPreview';


interface InvoiceFormProps {
    initialData: FormData | null;
    onPreview?: (formData: FormData) => void;
    onCancel: () => void;
}

interface GenerateCsvResponse {
    success: boolean;
    result: string;
    statusCode: string;
}

interface FormData {
    vendor: string;
    invoiceDate: string;
    paymentTerms: string;
    dueDate: string;
    currency: string;
    invoiceTotalAmount: string;
    invoiceLineItems: string;
    specialRemarks: string;
    vendorBankAccount: string;
    bankCode: string;
    swiftCode: string;
    meterNumber: string;
    deltaReadings: string;
    supplier: string; // Enriched field
    invoiceId: string;
    documentClass: string;
    confidence: string;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ 
    initialData,
    onCancel 
}) => {
    const [formData, setFormData] = useState<FormData>(initialData || {
        vendor: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        paymentTerms: '',
        dueDate: '',
        currency: 'USD',
        invoiceTotalAmount: '',
        invoiceLineItems: '',
        specialRemarks: '',
        vendorBankAccount: '',
        bankCode: '',
        swiftCode: '',
        meterNumber: '',
        deltaReadings: '',
        supplier: '', // Enriched field after vendor mapping
        invoiceId: '',
        documentClass: 'invoice',
        confidence: ''
    });

    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [generatedCsv, setGeneratedCsv] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [isSending, setIsSending] = useState(false);
    
    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleSend = async () => {
        setIsSending(true);
        // Simulate sending CSV - replace with actual API call if needed
        await new Promise(resolve => setTimeout(resolve, 1000));
        setShowSuccessMessage(true);
        setIsSending(false);
    };

    const generateCsvMutation = useMutation<GenerateCsvResponse, Error, FormData>({
        mutationFn: async (data: FormData) => {
            const payload = {
                opr: "generate_csv",
                ...data
            };
            const response = await appsyncResolver(JSON.stringify(payload));

            console.log('Raw response from resolver:', response);
            const resultStr = response.data?.resolverLambda;
            if (resultStr) {
                // Look for CSV content in the response
                const csvMatch = resultStr.match(/(.*?)(?:, statusCode=|$)/s);

                if (csvMatch && csvMatch[1]) {
                    return {
                        success: true,
                        result: csvMatch[1],
                        statusCode: "200"
                    };
                }
            }
            throw new Error("Failed to generate CSV");
        },
        onSuccess: (response) => {
            console.log('Setting CSV content:', response.result);
            setGeneratedCsv(response.result);
            setIsGenerating(false);
        },
        onError: (error) => {
            console.error("Error details:", error);
            const errorMessage = error.message || "Failed to generate CSV";
            setIsGenerating(false);
        }
    });

    const handlePreviewClick = () => {
        console.log('Preview button clicked');
        setShowPreviewModal(true);
        setIsGenerating(true);
        // Then trigger the generation
        generateCsvMutation.mutate(formData);
    };

    const handleInputChange = (field: keyof FormData, value: string | boolean) => {
        setFormData((prev: FormData) => ({ ...prev, [field]: value }));
    };

    return (
    <>
        <SplitPanel 
            header={"Invoice Processing & CSV Generation"}
        >
            <Box padding="s">
                <Form
                    actions={
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button 
                                variant="link" 
                                onClick={onCancel}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handlePreviewClick}
                                iconAlign="left"
                            >
                                <Box variant="awsui-gen-ai-label">
                                    <Icon size="small" name="gen-ai" />
                                    <span>Generate AI-powered CSV</span>
                                </Box>
                            </Button>
                        </SpaceBetween>
                    }
                >
                <SpaceBetween direction="vertical" size="l">
                    <Form>
                        <SpaceBetween direction="vertical" size="l">
                            <FormField label="Vendor">
                                <Input 
                                    value={formData.vendor}
                                    onChange={e => handleInputChange('vendor', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Invoice Date">
                                <Input 
                                    value={formData.invoiceDate}
                                    onChange={e => handleInputChange('invoiceDate', e.detail.value)}
                                    type="date"
                                />
                            </FormField>
                            <FormField label="Payment Terms">
                                <Input 
                                    value={formData.paymentTerms}
                                    onChange={e => handleInputChange('paymentTerms', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Due Date">
                                <Input 
                                    value={formData.dueDate}
                                    onChange={e => handleInputChange('dueDate', e.detail.value)}
                                    type="date"
                                />
                            </FormField>
                            <FormField label="Currency">
                                <Input 
                                    value={formData.currency}
                                    onChange={e => handleInputChange('currency', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Invoice Total Amount">
                                <Input 
                                    value={formData.invoiceTotalAmount}
                                    onChange={e => handleInputChange('invoiceTotalAmount', e.detail.value)}
                                    type="number"
                                />
                            </FormField>
                            <FormField label="Invoice Line Items">
                                <Textarea 
                                    value={formData.invoiceLineItems}
                                    onChange={e => handleInputChange('invoiceLineItems', e.detail.value)}
                                    placeholder="Enter line items with descriptions and amounts"
                                />
                            </FormField>
                            <FormField label="Special Remarks">
                                <Textarea 
                                    value={formData.specialRemarks}
                                    onChange={e => handleInputChange('specialRemarks', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Vendor Bank Account">
                                <Input 
                                    value={formData.vendorBankAccount}
                                    onChange={e => handleInputChange('vendorBankAccount', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Bank Code">
                                <Input 
                                    value={formData.bankCode}
                                    onChange={e => handleInputChange('bankCode', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="SWIFT Code">
                                <Input 
                                    value={formData.swiftCode}
                                    onChange={e => handleInputChange('swiftCode', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Meter Number (for utility bills)">
                                <Input 
                                    value={formData.meterNumber}
                                    onChange={e => handleInputChange('meterNumber', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Delta Readings (for water bills)">
                                <Input 
                                    value={formData.deltaReadings}
                                    onChange={e => handleInputChange('deltaReadings', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Supplier (Enriched Field)" description="This field will be populated after vendor mapping">
                                <Input 
                                    value={formData.supplier}
                                    onChange={e => handleInputChange('supplier', e.detail.value)}
                                />
                            </FormField>
                        </SpaceBetween>
                    </Form>
                </SpaceBetween>  
              </Form>
            </Box>
        </SplitPanel>

        <Modal
            visible={showPreviewModal}
            onDismiss={() => {
                setShowPreviewModal(false);
                setGeneratedCsv('');
                setIsGenerating(false);
                setShowSuccessMessage(false);  
            }}
            header={
                <Header
                  variant="h2"
                  actions={
                    <Button
                        iconName="download"
                        variant="primary"
                        onClick={handleSend}
                        loading={isSending}
                        disabled={isGenerating || !generatedCsv || isSending}
                    >
                        Download CSV
                    </Button>
                }
            >
                Preview Generated CSV
            </Header>
            }
            size="large"
        >

        <Box padding="l">
            {showSuccessMessage && (
                <Box
                    variant="awsui-key-label"
                    color="text-status-success"
                    textAlign="center"
                    margin={{ bottom: 'm' }}
                    padding="s"
                >
                    <SpaceBetween size="xs" direction="horizontal" alignItems="center">
                        <Icon
                            name="status-positive"
                            size="small"
                            variant="success"
                        />
                        CSV file generated successfully and ready for download
                    </SpaceBetween>
                </Box>
            )}
        </Box>
            <Box padding="l">
                <HtmlPreview 
                    html={`<pre>${generatedCsv}</pre>`}
                    isLoading={isGenerating}
                />
            </Box>
        </Modal>

    </>
    );
};
