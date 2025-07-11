import { useQuery } from "@tanstack/react-query";
import { downloadData, list } from 'aws-amplify/storage';
import { QUERY_KEYS } from "../utils/types";

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
}

export interface BDAResultFile {
    fileName: string;
    path: string;
    lastModified?: Date;
    result?: BDAResult;
}

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
                    
                    return {
                        fileName: item.path!.split('/').pop() || '',
                        path: item.path!,
                        lastModified: item.lastModified,
                        result: jsonResult
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
