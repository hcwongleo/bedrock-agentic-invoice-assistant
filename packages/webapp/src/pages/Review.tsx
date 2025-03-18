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
  
interface ApplicationData {
    applicationId: string;
    applicantName: string;
    loanAmount: number;
    ltvRatio: number;
    propertyAddress: string;
    status: string;
    notes: string;
    timestamp: string;
}

interface FilterToken extends PropertyFilterProps.Token {
    propertyKey: keyof ApplicationData;
    operator: ":" | "=" | "!=" | ">" | "<";
    value: string;
}

interface FilterQuery extends PropertyFilterProps.Query {
    tokens: readonly FilterToken[]; 
    operation: 'and' | 'or';
}

const filterApplications = (
    applications: ApplicationData[], 
    query: PropertyFilterProps.Query
) => {
    if (!query.tokens.length) return applications;

    return applications.filter(app => {
        const results = query.tokens.map(token => {
            if (!token.propertyKey) return true;
            
            const value = String(app[token.propertyKey as keyof ApplicationData]);
            
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
    const { data: applicationItems, isLoading, refetch } = useS3ListItems(QUERY_KEYS.APPLICATIONS);
    const [applications, setApplications] = useState<ApplicationData[]>([]);
    const [query, setQuery] = useState<PropertyFilterProps.Query>({
        tokens: [],
        operation: "and"
      });
    const filteredApplications = filterApplications(applications, query);
    const [isDeleted, setIsDeleted] = useState(false);

    const getApplicationCounts = (applications: ApplicationData[]) => {
        return {
            new: applications.filter(app => app.status === "New application").length,
            underReview: applications.filter(app => app.status === "Under review").length,
            awaitingDocs: applications.filter(app => app.status.startsWith("Awaiting")).length
        };
    };

    useEffect(() => {
        queryClient.invalidateQueries({ 
            queryKey: [QUERY_KEYS.APPLICATIONS] 
        });
        refetch();
    }, [refetch]); 

    useEffect(() => {
        console.log('Application Items:', applicationItems);
        if (!applicationItems) {
            setApplications([]);
            return;
        }

        const fetchApplications = async () => {
            try {
                const applicationsData = await Promise.all(
                    applicationItems.map(async (item) => {
                        const fullPath = `${item.path}${item.itemName}`;
                        const jsonData = await fetchJsonFromPath(fullPath);
                        if (!jsonData || typeof jsonData === 'string') {
                            console.error('Invalid JSON data received');
                            return null;
                        }
                        return {
                            applicationId: jsonData.application_id,
                            applicantName: `${jsonData.applicant_details.primary_borrower.name}${
                                jsonData.applicant_details.co_borrower?.name 
                                ? `, ${jsonData.applicant_details.co_borrower.name}` 
                                : ''
                            }`,
                            loanAmount: jsonData.property_details.mortgage_amount,
                            ltvRatio: jsonData.property_details.financing_percentage,
                            propertyAddress: jsonData.property_details.address || jsonData.property_details.property_address,
                            status: jsonData.status || 
                            (item === applicationItems[0] ? "New application" : "Under review"),
                            notes: jsonData.notes || 
                            (item === applicationItems[0] ? "New submission, needs review" : "-"),
                            timestamp: jsonData.timestamp
                        };
                    })
                );
                
                // Filter out any null values and sort by timestamp
                const validApplications = applicationsData
                    .filter(app => app !== null)
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((app, index) => ({
                        ...app,
                        status: index === 0 ? "New application" : app.status,
                        notes: index === 0 ? "New submission, needs review" : (app.notes || "-")
                    }));

                console.log('Processed and sorted applications:', validApplications);
                setApplications(validApplications);
            } catch (error) {
                console.error('Error loading applications:', error);
            }
        };

        fetchApplications();
    }, [applicationItems]);
  
    return(
        <SpaceBetween size="l">
            <BreadcrumbGroup
              items={[
              { text: "Morgage Loan Approval", href: "/" },
              {
                  text: "Loan Application List",
                  href: "#"
              }
              ]}
              ariaLabel="Breadcrumbs"
            />

            <Container
                header={<Header variant="h2">Application Overview</Header>}
            >
                <ColumnLayout columns={3} variant="text-grid">
                    <div>
                        <Box variant="awsui-key-label">New Applications</Box>
                        <Box variant="awsui-value-large">{getApplicationCounts(applications).new}</Box>
                    </div>
                    <div>
                        <Box variant="awsui-key-label">Under Review</Box>
                        <Box variant="awsui-value-large">{getApplicationCounts(applications).underReview}</Box>
                    </div>
                    <div>
                        <Box variant="awsui-key-label">Awaiting Additional Documents</Box>
                        <Box variant="awsui-value-large">{getApplicationCounts(applications).awaitingDocs}</Box>
                    </div>
                </ColumnLayout>
            </Container>
  

            <PropertyFilter
                query={query}
                onChange={({ detail }) => setQuery(detail)}
                filteringPlaceholder="Find application by applicant's name, email or phone number"
                filteringProperties={[
                    {
                        key: "applicationId",
                        operators: [":", "=", "!="],
                        propertyLabel: "Application ID",
                        groupValuesLabel: "Application ID values"
                    },
                    {
                        key: "applicantName",
                        operators: [":", "=", "!="],
                        propertyLabel: "Applicant name",
                        groupValuesLabel: "Applicant names"
                    },
                    {
                        key: "loanAmount",
                        operators: ["=", "!=", ">", "<"],
                        propertyLabel: "Loan Amount",
                        groupValuesLabel: "Loan amounts"
                    },
                    {
                        key: "status",
                        operators: ["=", "!="],
                        propertyLabel: "Status",
                        groupValuesLabel: "Status values"
                    }
                ]}
                filteringOptions={[
                    // Add some common values for filtering
                    { propertyKey: "status", value: "New application" },
                    { propertyKey: "status", value: "Under review" },
                    { propertyKey: "status", value: "Awaiting updated W2" },
                    { propertyKey: "status", value: "Awaiting contract" }
                ]}
            />
    
            <Table
                loading={isLoading}
                loadingText="Loading applications"
                items={filteredApplications}
                columnDefinitions={[
                {
                    id: "applicationId",
                    header: "Application ID",
                    cell: item => {
                        const isLatest = item === applications[0];
                        if (isLatest) {
                            return (
                                <Link
                                    onClick={() => navigate(`/portal/${item.applicationId}`)}
                                >
                                    {item.applicationId}
                                </Link>
                            );
                        }
                        return item.applicationId;
                    },
                    sortingField: "applicationId"
                },
                {
                    id: "applicantName",
                    header: "Applicant name",
                    cell: item => item.applicantName,
                    sortingField: "applicantName"
                },
                {
                    id: "loanAmount",
                    header: "Loan Amount Requested",
                    cell: item => `$${item.loanAmount.toLocaleString()}`,
                    sortingField: "loanAmount"
                },
                {
                    id: "ltvRatio",
                    header: "Loan-to-Value Ratio",
                    cell: item => `${item.ltvRatio}%`,
                    sortingField: "ltvRatio"
                },
                {
                    id: "propertyAddress",
                    header: "Property Address",
                    cell: item => item.propertyAddress
                },
                {
                    id: "status",
                    header: "Application Status",
                    cell: item => {
                        const getStatusType = (status: string, isLatest: boolean) => {
                            if (isLatest) return "info";
                            if (status.startsWith("Awaiting")) return "warning"; 
                            return "in-progress"; 
                        };
                
                        // Check if this is the latest application by timestamp
                        const isLatest = item === applications[0];
                
                        return (
                            <StatusIndicator 
                                type={getStatusType(item.status, isLatest)}
                            >
                                {isLatest ? "New application" : item.status}
                            </StatusIndicator>
                        )
                    }
                },
                {
                    id: "notes",
                    header: "Notes/Comments",
                    cell: item => item.notes
                }]}
                empty={
                    <Box textAlign="center" color="inherit">
                        <b>No applications found</b>
                    </Box>
                }
                header={
                    <Header
                        variant="h2"
                        actions={             
                            <Button 
                                iconName={isDeleted ? "status-positive" : "remove"}
                                onClick={async () => {
                                   if (applicationItems) {
                                       // Get the items in reverse order to get the latest one
                                       const items = [...applicationItems].reverse();
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
                    >Loan Applications</Header>
                }
            />
        </SpaceBetween>
    );
}