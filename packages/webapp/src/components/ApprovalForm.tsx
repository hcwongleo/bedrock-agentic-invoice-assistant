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
    Header
} from "@cloudscape-design/components";
import { useMutation } from "@tanstack/react-query";
import { appsyncResolver } from "../hooks/useApi";
import { HtmlPreview } from './HtmlPreview';


interface ApprovalFormProps {
    initialData: FormData | null;
    onPreview?: (formData: FormData) => void;
    onCancel: () => void;
}

interface GenerateLetterResponse {
    success: boolean;
    result: string;
    statusCode: string;
}

interface FormData {
    date: string;
    mailAddress: string;
    applicationName: string;
    propertyAddressSameAsMail: boolean;
    propertyAddress: string;
    purchasePrice: string;
    loanAmount: string;
    loanTerms: string;
    satisfactoryPurchaseAgreement: boolean;
    sufficientAppraisal: boolean;
    marketableTitle: boolean;
}

export const ApprovalForm: React.FC<ApprovalFormProps> = ({ 
    initialData,
    onCancel 
}) => {
    const [formData, setFormData] = useState<FormData>(initialData || {
        date: new Date().toISOString().split('T')[0],
        mailAddress: '',
        applicationName: '',
        propertyAddressSameAsMail: false,
        propertyAddress: '',
        purchasePrice: '',
        loanAmount: '',
        loanTerms: '30-year conventional',
        satisfactoryPurchaseAgreement: true,
        sufficientAppraisal: true,
        marketableTitle: true,
    });

    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [generatedHtml, setGeneratedHtml] = useState('');
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
        // Simulate sending email - replace with actual API call if needed
        await new Promise(resolve => setTimeout(resolve, 1000));
        setShowSuccessMessage(true);
        setIsSending(false);
    };

    const generateLetterMutation = useMutation<GenerateLetterResponse, Error, FormData>({
        mutationFn: async (data: FormData) => {
            const payload = {
                opr: "generate_approval_letter",
                ...data
            };
            const response = await appsyncResolver(JSON.stringify(payload));

            console.log('Raw response from resolver:', response);
            const resultStr = response.data?.resolverLambda;
            if (resultStr) {
                const htmlMatch = resultStr.match(/(<(?:!DOCTYPE html|div class).*?)(?:, statusCode=|$)/s);

                if (htmlMatch && htmlMatch[1]) {
                    return {
                        success: true,
                        result: htmlMatch[1],
                        statusCode: "200"
                    };
                }
            }
            throw new Error("Failed to generate letter");
        },
        onSuccess: (response) => {
            console.log('Setting HTML content:', response.result);
            setGeneratedHtml(response.result);
            setIsGenerating(false);
        },
        onError: (error) => {
            console.error("Error details:", error);
            const errorMessage = error.message || "Failed to generate letter";
            setIsGenerating(false);
        }
    });

    const handlePreviewClick = () => {
        console.log('Preview button clicked');
        setShowPreviewModal(true);
        setIsGenerating(true);
        // Then trigger the generation
        generateLetterMutation.mutate(formData);
    };

    const handleInputChange = (field: keyof FormData, value: string | boolean) => {
        setFormData((prev: FormData) => ({ ...prev, [field]: value }));
        
        // If propertyAddressSameAsMail is checked, copy mail address to property address
        if (field === 'propertyAddressSameAsMail' && value === true) {
            setFormData((prev: FormData) => ({
                ...prev,
                propertyAddress: prev.mailAddress
            }));
          }
    };

    return (
    <>
        <SplitPanel 
            header={"Loan Approval Letter"}
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
                                    <span>Preview AI-generated letter</span>
                                </Box>
                            </Button>
                        </SpaceBetween>
                    }
                >
                <SpaceBetween direction="vertical" size="l">
                    <Form>
                        <SpaceBetween direction="vertical" size="l">
                            <FormField label="Date">
                                <Input 
                                    value={formData.date}
                                    onChange={e => handleInputChange('date', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Mail Address">
                                <Input 
                                    value={formData.mailAddress}
                                    onChange={e => handleInputChange('mailAddress', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Application name">
                                <Input 
                                    value={formData.applicationName}
                                    onChange={e => handleInputChange('applicationName', e.detail.value)}
                                />
                            </FormField>
                            <FormField label="Property Address is same to mail address">
                                <Checkbox
                                    checked={formData.propertyAddressSameAsMail}
                                    onChange={e => handleInputChange('propertyAddressSameAsMail', e.detail.checked)}
                                />
                            </FormField>
                            <FormField label="Property Address">
                                <Input 
                                    value={formData.propertyAddress}
                                    onChange={e => handleInputChange('propertyAddress', e.detail.value)}
                                    disabled={formData.propertyAddressSameAsMail}
                                />
                            </FormField>

                            <FormField label="Purchase Price">
                                <Input 
                                    value={formData.purchasePrice}
                                    onChange={e => handleInputChange('purchasePrice', e.detail.value)}
                                    type="number"
                                />
                            </FormField>
                            <FormField label="Loan Amount">
                                <Input 
                                    value={formData.loanAmount}
                                    onChange={e => handleInputChange('loanAmount', e.detail.value)}
                                    type="number"
                                />
                            </FormField>
                            <FormField label="Terms of Loan">
                                <Input 
                                    value={formData.loanTerms}
                                    onChange={e => handleInputChange('loanTerms', e.detail.value)}
                                    readOnly
                                />
                            </FormField>

                            <FormField 
                                label="Conditions must be met"
                                description="These conditions are required for loan approval"
                            >
                                <SpaceBetween direction="vertical" size="xs">
                                    <Checkbox
                                        checked={formData.satisfactoryPurchaseAgreement}
                                        onChange={e => handleInputChange('satisfactoryPurchaseAgreement', e.detail.checked)}
                                        controlId="satisfactoryPurchaseAgreement"
                                    >
                                        Satisfactory Purchase Agreement
                                    </Checkbox>
                                    <Checkbox
                                        checked={formData.sufficientAppraisal}
                                        onChange={e => handleInputChange('sufficientAppraisal', e.detail.checked)}
                                        controlId="sufficientAppraisal"
                                    >
                                        Sufficient Appraisal for the Property
                                    </Checkbox>
                                    <Checkbox
                                        checked={formData.marketableTitle}
                                        onChange={e => handleInputChange('marketableTitle', e.detail.checked)}
                                        controlId="marketableTitle"
                                    >
                                        Marketable Title to the Property
                                    </Checkbox>
                                </SpaceBetween>
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
                setGeneratedHtml('');
                setIsGenerating(false);
                setShowSuccessMessage(false);  
            }}
            header={
                <Header
                  variant="h2"
                  actions={
                    <Button
                        iconName="send"
                        variant="primary"
                        onClick={handleSend}
                        loading={isSending}
                        disabled={isGenerating || !generatedHtml || isSending}
                    >
                        Send
                    </Button>
                }
            >
                Preview Approval Letter
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
                        Successfully sent to application email: doefamily@gmail.com
                    </SpaceBetween>
                </Box>
            )}
        </Box>
            <Box padding="l">
                <HtmlPreview 
                    html={generatedHtml}
                    isLoading={isGenerating}
                />
            </Box>
        </Modal>

    </>
    );
};
