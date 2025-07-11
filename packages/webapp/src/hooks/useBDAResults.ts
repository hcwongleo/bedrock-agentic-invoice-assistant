import { useQuery } from "@tanstack/react-query";
import { downloadData, list } from 'aws-amplify/storage';
import { QUERY_KEYS } from "../utils/types";
import { supplierMatcher, MatchResult } from "../services/supplierMatching";

export interface BDAResult {
    matched_blueprint?: {
        arn?: string;
        name?: string;
        confidence?: number;
    };
    document_class?: {
        type?: string;
    };
    inference_result?: any;
    // Enhanced with supplier matching
    supplier_match?: {
        matched_supplier?: MatchResult;
        top_matches?: MatchResult[];
        vendor_name_extracted?: string;
    };
}

export interface BDAResultFile {
    fileName: string;
    path: string;
    lastModified?: Date;
    result?: BDAResult;
}

// Helper function to extract vendor name from BDA inference result
const extractVendorName = (inferenceResult: any): string | null => {
    if (!inferenceResult) return null;
    
    // Try different possible paths where vendor name might be stored
    const possiblePaths = [
        'vendor_name',
        'supplier_name',
        'company_name',
        'from',
        'bill_from',
        'seller',
        'vendor',
        'supplier'
    ];
    
    // Check direct properties
    for (const path of possiblePaths) {
        if (inferenceResult[path]) {
            const value = inferenceResult[path];
            if (typeof value === 'string') return value;
            if (typeof value === 'object' && value.value) return value.value;
        }
    }
    
    // Check nested structures
    if (inferenceResult.fields) {
        for (const path of possiblePaths) {
            if (inferenceResult.fields[path]) {
                const field = inferenceResult.fields[path];
                if (typeof field === 'string') return field;
                if (typeof field === 'object' && field.value) return field.value;
            }
        }
    }
    
    // Check if there's a general structure with extracted text
    if (inferenceResult.extracted_text) {
        // Try to find vendor name in extracted text using patterns
        const text = inferenceResult.extracted_text.toLowerCase();
        const vendorPatterns = [
            /vendor[:\s]+([^\n\r]+)/i,
            /supplier[:\s]+([^\n\r]+)/i,
            /from[:\s]+([^\n\r]+)/i,
            /bill\s+from[:\s]+([^\n\r]+)/i
        ];
        
        for (const pattern of vendorPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
    }
    
    return null;
};

// Enhanced function to process BDA results with supplier matching
const enhanceBDAResultWithSupplierMatch = async (result: BDAResult): Promise<BDAResult> => {
    const vendorName = extractVendorName(result.inference_result);
    
    if (!vendorName) {
        return result;
    }
    
    try {
        const [bestMatch, topMatches] = await Promise.all([
            supplierMatcher.findBestMatch(vendorName),
            supplierMatcher.findTopMatches(vendorName, 3)
        ]);
        
        return {
            ...result,
            supplier_match: {
                vendor_name_extracted: vendorName,
                matched_supplier: bestMatch || undefined,
                top_matches: topMatches
            }
        };
    } catch (error) {
        console.error('Error matching supplier for vendor:', vendorName, error);
        return {
            ...result,
            supplier_match: {
                vendor_name_extracted: vendorName,
                matched_supplier: undefined,
                top_matches: []
            }
        };
    }
};
const fetchBDAResults = async (): Promise<BDAResultFile[]> => {
    try {
        console.log('🚀 ~ fetchBDAResults ~ Starting to fetch BDA results');
        // List all files in the bda-result folder
        const result = await list({
            path: 'bda-result/',
            options: {
                listAll: true
            }
        });

        console.log('🚀 ~ fetchBDAResults ~ list result:', result);

        if (!result.items) {
            console.log('🚀 ~ fetchBDAResults ~ No items found');
            return [];
        }

        // Filter for JSON result files
        const resultFiles = result.items.filter(item => 
            item.path && item.path.endsWith('-result.json')
        );

        console.log('🚀 ~ fetchBDAResults ~ filtered result files:', resultFiles);

        // Fetch the content of each result file
        const bdaResults = await Promise.all(
            resultFiles.map(async (item) => {
                try {
                    console.log('🚀 ~ fetchBDAResults ~ downloading:', item.path);
                    const downloadResult = await downloadData({ 
                        path: item.path! 
                    }).result;
                    
                    const text = await downloadResult.body.text();
                    console.log('🚀 ~ fetchBDAResults ~ downloaded text for', item.path, ':', text);
                    const jsonResult = JSON.parse(text) as BDAResult;
                    console.log('🚀 ~ fetchBDAResults ~ parsed JSON for', item.path, ':', jsonResult);
                    
                    // Enhance with supplier matching
                    const enhancedResult = await enhanceBDAResultWithSupplierMatch(jsonResult);
                    console.log('🚀 ~ fetchBDAResults ~ enhanced with supplier match:', enhancedResult);
                    
                    return {
                        fileName: item.path!.split('/').pop() || '',
                        path: item.path!,
                        lastModified: item.lastModified,
                        result: enhancedResult
                    };
                } catch (error) {
                    console.error(`Error fetching BDA result for ${item.path}:`, error);
                    return {
                        fileName: item.path!.split('/').pop() || '',
                        path: item.path!,
                        lastModified: item.lastModified,
                        result: undefined
                    };
                }
            })
        );

        console.log('🚀 ~ fetchBDAResults ~ final bdaResults:', bdaResults);
        return bdaResults;
    } catch (error) {
        console.error('Error fetching BDA results:', error);
        return [];
    }
};

export const useBDAResults = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.BDA_RESULTS],
        queryFn: fetchBDAResults,
        refetchInterval: 5000, // Poll every 5 seconds
        staleTime: 1000, // Consider data stale after 1 second
    });
};

// Helper function to match uploaded file with BDA result
export const findBDAResultForFile = (fileName: string, bdaResults: BDAResultFile[]): BDAResult | undefined => {
    console.log('🚀 ~ findBDAResultForFile ~ fileName:', fileName);
    console.log('🚀 ~ findBDAResultForFile ~ bdaResults:', bdaResults);
    
    // Extract base name without extension and timestamp
    const baseName = fileName.replace(/^\d+_/, '').split('.')[0];
    const normalizedBaseName = baseName.replace(/_/g, '-');
    
    console.log('🚀 ~ findBDAResultForFile ~ baseName:', baseName);
    console.log('🚀 ~ findBDAResultForFile ~ normalizedBaseName:', normalizedBaseName);
    
    const matchingResult = bdaResults.find(result => {
        const matches = result.fileName.includes(normalizedBaseName);
        console.log('🚀 ~ findBDAResultForFile ~ checking', result.fileName, 'against', normalizedBaseName, ':', matches);
        return matches;
    });
    
    console.log('🚀 ~ findBDAResultForFile ~ matchingResult:', matchingResult);
    console.log('🚀 ~ findBDAResultForFile ~ returning:', matchingResult?.result);
    
    return matchingResult?.result;
};
