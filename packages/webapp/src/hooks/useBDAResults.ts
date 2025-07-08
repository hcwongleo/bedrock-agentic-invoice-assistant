import { useQuery } from "@tanstack/react-query";
import { downloadData, list } from 'aws-amplify/storage';
import { QUERY_KEYS } from "../utils/types";

export interface BDAResult {
    matched_blueprint?: string;
    document_class?: string;
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
        // List all files in the bda-result folder
        const result = await list({
            path: 'bda-result/',
            options: {
                listAll: true
            }
        });

        if (!result.items) {
            return [];
        }

        // Filter for JSON result files
        const resultFiles = result.items.filter(item => 
            item.path && item.path.endsWith('-result.json')
        );

        // Fetch the content of each result file
        const bdaResults = await Promise.all(
            resultFiles.map(async (item) => {
                try {
                    const downloadResult = await downloadData({ 
                        path: item.path! 
                    }).result;
                    
                    const text = await downloadResult.body.text();
                    const jsonResult = JSON.parse(text) as BDAResult;
                    
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
    // Extract base name without extension and timestamp
    const baseName = fileName.replace(/^\d+_/, '').split('.')[0];
    const normalizedBaseName = baseName.replace(/_/g, '-');
    
    const matchingResult = bdaResults.find(result => 
        result.fileName.includes(normalizedBaseName)
    );
    
    return matchingResult?.result;
};
