import { 
    Container, 
    Header, 
    ColumnLayout, 
    Box, 
    SpaceBetween,
    StatusIndicator,
    Table,
    Button,
    BreadcrumbGroup,
    AppLayout,
    Link
} from "@cloudscape-design/components";
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Thumbnail } from '../components/Thumbnail';
import { useS3ListItems, fetchJsonFromPath } from "../hooks/useStorage";
import { QUERY_KEYS } from "../utils/types";
import { BDAResult } from '../utils/config';
import { DocPanel } from '../components/DocPanel';
import { ApprovalForm } from "../components/ApprovalForm";


export const Portal = () => {
    const { data: documentItems, isLoading: documentsLoading } = useS3ListItems(QUERY_KEYS.DOCUMENTS);
    const { applicationId } = useParams();
    const [applicationData, setApplicationData] = useState<any>(null);
    const [documentResults, setDocumentResults] = useState<Record<string, BDAResult>>({});
    const [loadingResults, setLoadingResults] = useState(true);
    const [sortingColumn, setSortingColumn] = useState({ sortingField: "timestamp" });
    const [sortingDescending, setSortingDescending] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<any>(null);
    const [splitPanelOpen, setSplitPanelOpen] = useState(false);
    const [showApprovalForm, setShowApprovalForm] = useState(false);
    const [formData, setFormData] = useState<any>(null);

    const handleGenerateClick = () => {
        const initialFormData = {
            date: new Date().toISOString().split('T')[0],
            applicationName: applicationData.applicant_details.primary_borrower.name,
            mailAddress: applicationData.applicant_details.address,
            propertyAddress: applicationData.property_details?.address || applicationData.property_details?.property_address,
            purchasePrice: applicationData.property_details.purchase_price?.toString() || '',
            loanAmount: applicationData.property_details.mortgage_amount.toString(),
            loanTerms: `${applicationData.property_details.loan_term}-year conventional`,
            propertyAddressSameAsMail: false,
            satisfactoryPurchaseAgreement: true,
            sufficientAppraisal: true,
            marketableTitle: true
        };
        setSelectedDocument(null); // Close document preview if open
        setShowApprovalForm(true);
        setSplitPanelOpen(true);
        setFormData(initialFormData);
    };

    const handlePreview = (formData: any) => {
        console.log('Preview data:', formData);
    };

    const findMatchingBdaFile = async (documentName: string) => {
        const baseName = documentName.replace(/\.[^/.]+$/, "").toLowerCase();
        const bdaFileName = `${baseName}-result.json`;
        console.log('Attempting to fetch BDA result:', bdaFileName);
        
        try {
            const bdaResult = await fetchJsonFromPath(`bda-result/${bdaFileName}`);
            if (bdaResult && typeof bdaResult === 'object') {
                // For BDA image results
                if (bdaResult.metadata?.semantic_modality === "IMAGE") {
                    console.log('Found valid image BDA result for:', documentName, bdaResult);
                    return bdaResult;
                }
                // For document analysis results
                else if (bdaResult.matched_blueprint && bdaResult.document_class?.type) {
                    console.log('Found valid document BDA result for:', documentName, bdaResult);
                    return bdaResult;
                }
            }
            
            console.log('Invalid or incomplete BDA result for:', documentName);
            return null;
        } catch (error) {
            console.log('No BDA result found for:', documentName);
            return null;
        }
    };

    const handleThumbnailClick = (item: any) => {
        console.log('Thumbnail clicked - Full item:', item);
        console.log('URL being passed:', item.url);
        
        // Maybe we need to construct the full URL
        const fullUrl = item.url;
        
        setSelectedDocument({
            url: fullUrl,
            name: item.itemName,
            type: getDocumentType(documentResults[item.itemName], item.documentName),
            aiAnalysis: documentResults[item.itemName]
        });
        setSplitPanelOpen(true);
    };

    const getDocumentType = (bdaResult: BDAResult | undefined, fallbackName: string) => {
        // Return "-" if no BDA result or no document_class.type
        if (!bdaResult || !bdaResult.document_class?.type) {
            return "-";
        }
        
        return bdaResult.document_class.type
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    useEffect(() => {
        const fetchBDAResults = async () => {
            if (!documentItems) return;
            setLoadingResults(true);
            const results: Record<string, BDAResult> = {};
            
            try {
                await Promise.all(documentItems.map(async (item) => {
                    const bdaResult = await findMatchingBdaFile(item.itemName);
                    if (bdaResult) {
                        results[item.itemName] = bdaResult;
                    }
                }));
                
                console.log('Final processed BDA results:', results);
                setDocumentResults(results);
            } catch (error) {
                console.error('Error in BDA results processing:', error);
            } finally {
                setLoadingResults(false);
            }
        };

        fetchBDAResults();
    }, [documentItems]);

    useEffect(() => {
        const fetchApplication = async () => {
            try {
                const data = await fetchJsonFromPath(`applications/${applicationId}.json`);
                setApplicationData(data);
            } catch (error) {
                console.error('Error fetching application:', error);
            }
        };
        fetchApplication();
    }, [applicationId]);

    if (!applicationData) return null;

    const getMaritalStatus = (data: any) => {
        return data?.applicant_details?.co_borrower?.name ? 'Married' : 'Single';
    };

    const getVerificationStatus = (bdaResult: BDAResult | undefined): {
        status: string;
        type: 'error' | 'warning' | 'success' | 'info' | 'pending' | 'in-progress';
    } => {
        if (bdaResult?.document_class?.type) {
            return {
                status: "Verified",
                type: "success"
            };
        }
        return {
            status: "Deprecated",
            type: "error"
        };
    };
    

    const getComments = (item: any) => {
        const bdaResult = documentResults[item.itemName];
        if (!bdaResult) return "-";
    
        const documentType = bdaResult?.document_class?.type;
    
        try {
            switch (documentType) {
                case 'bank-statement':
                    const bankDetails = bdaResult.inference_result;
                    if (!bankDetails) return "-";
                    
                    return `Name: ${bankDetails.account_name || 'N/A'}, ` + 
                           `Period: ${bankDetails.statement_period || 'N/A'}, ` + 
                           `Date: ${bankDetails.statement_date || 'N/A'}`;
    
                case 'US-drivers-licenses':
                    const license = bdaResult.inference_result;
                    if (!license?.NAME_DETAILS) return "-";
    
                    const fullName = `${license.NAME_DETAILS.FIRST_NAME} ${license.NAME_DETAILS.LAST_NAME}`;
                    const state = license.ADDRESS_DETAILS?.STATE || 'N/A';
                    const dob = license.DATE_OF_BIRTH ? 
                        new Date(license.DATE_OF_BIRTH).toLocaleDateString() : 'N/A';
                    
                    return `Name: ${fullName}, ` +
                           `DOB: ${dob}, ` +
                           `State: ${state}`;
    
                default:
                    // For other documents, show image summary if available
                    console.log(bdaResult)
                    return bdaResult?.image?.summary || "-";
            }
        } catch (error) {
            console.error('Error processing comments for:', item.itemName, error);
            return "-";
        }
    };
    
    return (
        <AppLayout
            content={
                <SpaceBetween size="l">
                    <BreadcrumbGroup
                        items={[
                            { text: "Morgage Loan Approval", href: "/" },
                            { 
                                text: "Loan Application List",
                                href: "/review",
                            },
                            { 
                                text: applicationId || 'Application Details',
                                href: "#" 
                            }
                        ]}
                        ariaLabel="Breadcrumbs"
                    />
    
                    <Container header={<Header variant="h2">Application overview</Header>}>
                        <ColumnLayout columns={4} variant="text-grid">
                            <div>
                                <Box variant="awsui-key-label">Application name</Box>
                                <Box variant="p">
                                    {applicationData.applicant_details.primary_borrower.name}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Marital status</Box>
                                <Box variant="p">
                                    {getMaritalStatus(applicationData)}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Primary applicant annual income</Box>
                                <Box variant="p">
                                    ${applicationData.applicant_details.primary_borrower.annual_income.toLocaleString()}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Phone</Box>
                                <Box variant="p">
                                    123-456-789
                                </Box>
                            </div>

                            <div>
                                <Box variant="awsui-key-label">Co-applicant name</Box>
                                <Box variant="p">
                                    {applicationData.applicant_details.co_borrower?.name || '-'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Relationship with primary applicant</Box>
                                <Box variant="p">
                                {applicationData?.applicant_details?.co_borrower?.name ? 'Spouse' : '-'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Co-applicant annual income</Box>
                                <Box variant="p">
                                    {applicationData?.applicant_details?.co_borrower?.annual_income 
                                        ? `$${applicationData.applicant_details.co_borrower.annual_income.toLocaleString()}`
                                        : '-'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Email</Box>
                                <Box variant="p">
                                    doefamily@gmail.com
                                </Box>
                            </div>
                        </ColumnLayout>
                    </Container>
    
                    <Container header={<Header variant="h2">Loan details</Header>}>
                        <ColumnLayout columns={4} variant="text-grid">
                            <div>
                                <Box variant="awsui-key-label">Loan Amount Requested</Box>
                                <Box variant="p">
                                    ${applicationData?.property_details?.mortgage_amount?.toLocaleString() || '-'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Loan Type</Box>
                                <Box variant="p">
                                    Fixed-rate
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">DTI ratio</Box>
                                <Box variant="p">
                                    {applicationData?.debt_to_income ? (
                                        <>
                                            {applicationData.debt_to_income}%
                                            <Button 
                                                variant="inline-icon" 
                                                iconName={Number(applicationData.debt_to_income) >= 43 ? "face-sad" : "face-happy"}
                                                ariaLabel={`DTI ratio ${applicationData.debt_to_income}% is ${Number(applicationData.debt_to_income) >= 43 ? 'above' : 'below'} 43%`}
                                            />
                                        </>
                                    ) : (
                                        '-'
                                    )}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Down payment</Box>
                                <Box variant="p">
                                    ${applicationData?.property_details?.down_payment?.toLocaleString() || '-'}
                                </Box>
                            </div>

                            <div>
                                <Box variant="awsui-key-label">Loan-to-Value (LTV) Ratio</Box>
                                <Box variant="p">
                                    {applicationData?.property_details?.financing_percentage || '-'}%
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Loan Term</Box>
                                <Box variant="p">
                                    {applicationData?.property_details?.loan_term || '30'} Years
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Co-applicant included</Box>
                                <Box variant="p">
                                    <StatusIndicator type="success">
                                        Yes
                                    </StatusIndicator>
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Down payment percentage</Box>
                                <Box variant="p">
                                    {100 - (applicationData?.property_details?.financing_percentage || 0)}%
                                </Box>
                            </div>
                        </ColumnLayout>
                    </Container>
    
                    <Container 
                        header={
                            <Header variant="h2">
                                Applicant's Files
                            </Header>
                        }
                    >
                        <Table
                            loading={documentsLoading || loadingResults}
                            contentDensity="compact"
                            wrapLines
                            columnDefinitions={[
                                { 
                                    id: "type",
                                    header: "Type",
                                    cell: item => getDocumentType(documentResults[item.itemName], item.documentName),
                                    minWidth: 180
                                },
                                { 
                                    id: "verificationStatus",
                                    header: "Verification Status",
                                    cell: item =>{
                                        const status = getVerificationStatus(documentResults[item.itemName]);
                                        return (
                                            <StatusIndicator type={status.type}>
                                                {status.status}
                                            </StatusIndicator>
                                        );
                                    },
                                    minWidth: 180
                                },
                                { 
                                    id: "thumbnail",
                                    header: (
                                        <SpaceBetween direction="horizontal" size="xxxs">
                                            <span>Thumbnail</span>
                                                <Button 
                                                    variant="inline-icon" 
                                                    iconName="expand"
                                                    ariaLabel="Expand to see the doc"
                                                />
                                        </SpaceBetween>
                                    ),
                                    cell: item => (
                                        <div 
                                            onClick={() => handleThumbnailClick(item)}
                                            style={{ 
                                                cursor: 'pointer',
                                                display: 'inline-block'
                                            }}
                                        >
                                            <Box>
                                                <Thumbnail 
                                                    url={item.url} 
                                                    documentName={item.itemName}
                                                />
                                            </Box>
                                        </div>
                                    ),
                                    minWidth: 250
                                },
                                
                                { 
                                    id: "confidenceScore",
                                    header: "AI Confidence Score",
                                    cell: item => {
                                        const bdaResult = documentResults[item.itemName];
                                        const confidence = bdaResult?.matched_blueprint?.confidence;
                                        if (confidence) {
                                            return `${(confidence * 100)}%`;
                                        }
                                        return '-';
                                    },
                                    minWidth: 160
                                },
                                {
                                    id: "comments",
                                    header: "Comments (AI-extracted)",
                                    cell: item => {
                                        const comment = getComments(item);
                                        return (
                                            <Box
                                                margin={{ left: 'xxxs', right: 'xxxs' }}
                                                display="inline"
                                            >
                                                {comment}
                                            </Box>
                                        );
                                    },
                                    minWidth: 200
                                }
                            ]}
                            items={documentItems?.map(item => ({
                                documentName: item.itemName.replace(/\.(png|pdf|jpg|jpeg)$/i, '').split('_').join(' '), // For display
                                itemName: item.itemName,
                                url: item.url,
                            })) || []}
                            variant="stacked"
                            sortingDisabled
                        />
                    </Container>
    
                    <Container
                        header={
                            <Header variant="h2">
                                Approval Documents
                                <Link variant="info"> info</Link>
                            </Header>
                        }
                    >
                        <Table
                            columnDefinitions={[
                                {
                                    id: "documentName",
                                    header: "Document name",
                                    cell: item => item.documentName
                                },
                                {
                                    id: "brief",
                                    header: "AI-Generated Summary",
                                    cell: item => (
                                        <Box variant="p">
                                            {applicationData?.summary?.analysis || '-'}
                                        </Box>
                                    ),
                                    minWidth: 400
                                },
                                {
                                    id: "status",
                                    header: "Status",
                                    cell: item => (
                                        <StatusIndicator type="pending">
                                            Ready to generate
                                        </StatusIndicator>
                                    ),
                                    minWidth: 150
                                },
                                {
                                    id: "recipient",
                                    header: "Recipient",
                                    cell: item => item.recipient
                                },
                                {
                                    id: "action",
                                    header: "Action",
                                    cell: item => (
                                        <SpaceBetween direction="horizontal" size="xs">
                                            <Button iconAlign="right" iconName="gen-ai" ariaLabel="Generative AI - Normal button" onClick={handleGenerateClick} >
                                                Generate
                                            </Button>
                                        </SpaceBetween>
                                    ),
                                    minWidth: 180
                                }
                            ]}
                            items={[
                                {
                                    documentName: "Loan Approval Letter",
                                    brief: "-",
                                    recipient: "Applicant"
                                }
                            ]}
                            variant="embedded"
                            wrapLines={true}
                            stripedRows
                            stickyHeader
                        />
                    </Container>
    
                    <Container
                        header={<Header variant="h2">
                            Action Log
                            <Link variant="info"> info</Link>
                            </Header>
                        }>
                        <Table
                            columnDefinitions={[
                                {
                                    id: "timestamp",
                                    header: "Timestamp",
                                    cell: item => item.timestamp,
                                    sortingField: "timestamp"
                                },
                                {
                                    id: "action",
                                    header: "Action",
                                    cell: item => item.action,
                                    sortingField: "action"
                                },
                                {
                                    id: "performedBy",
                                    header: "Performed by",
                                    cell: item => item.performedBy,
                                    sortingField: "performedBy"
                                },
                                {
                                    id: "details",
                                    header: "Details",
                                    cell: item => item.details,
                                    sortingField: "details"
                                }
                            ]}
                            items={(() => {
                                // Get base timestamp from application data
                                const baseTime = new Date(applicationData.timestamp);
                                
                                // Helper function to add minutes and format
                                const addMinutesAndFormat = (date: Date, minutes: number) => {
                                    const newDate = new Date(date.getTime() + minutes * 60000);
                                    return newDate.toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                    }).replace(',', '');
                                };
                            
                                return [
                                    {
                                        timestamp: addMinutesAndFormat(baseTime, 0), // Original timestamp
                                        action: "Loan Application Received",
                                        performedBy: "Applicant",
                                        details: "Application submitted by applicant."
                                    },
                                    {
                                        timestamp: addMinutesAndFormat(baseTime, 30), // +30 minutes
                                        action: "Initial Review Completed",
                                        performedBy: "Loan Approver",
                                        details: "Verified applicant identity and documents."
                                    },
                                    {
                                        timestamp: addMinutesAndFormat(baseTime, 45), // +45 minutes
                                        action: "Confirme doucment details",
                                        performedBy: "AI assistant & Loan Approver",
                                        details: "AI extracted income details; approver confirmed"
                                    },
                                    {
                                        timestamp: addMinutesAndFormat(baseTime, 59), // +59 minutes
                                        action: "Approval Letter generated",
                                        performedBy: "AI assistant",
                                        details: "Approval letter generated"
                                    }
                                ];
                            })()}
                            
                            variant="embedded"
                            stripedRows
                            sortingColumn={sortingColumn}
                            sortingDescending={sortingDescending}
                            // onSortingChange={({ detail }) => {
                            //     setSortingColumn(detail.sortingColumn);
                            //     setSortingDescending(detail.sortingDescending);
                            // }}
                            wrapLines={false}
                            contentDensity="compact"
                        />
                    </Container>
                </SpaceBetween>
            }
            splitPanelOpen={splitPanelOpen}
            splitPanel={
                showApprovalForm ? (
                    <ApprovalForm 
                        initialData={formData}
                        onPreview={handlePreview}
                        onCancel={() => {
                            setShowApprovalForm(false);
                            setSplitPanelOpen(false);
                        }
                      }
                    />
                ) : (
                    selectedDocument && (
                        <DocPanel
                            documentUrl={selectedDocument.url}
                            documentName={selectedDocument.name}
                            documentType={selectedDocument.type}
                            aiAnalysis={selectedDocument.aiAnalysis}
                        />
                    )
                )
            }
            splitPanelPreferences={{
                position: 'side'
            }}
            onSplitPanelToggle={({ detail }) => {
                setSplitPanelOpen(detail.open);
                if (!detail.open) {
                    setShowApprovalForm(false);
                }
            }}
            navigationOpen={false}
            toolsOpen={false}
            toolsHide={true} 
            navigationHide={true}
        />
    );
};
