import { downloadData } from 'aws-amplify/storage';

export interface SupplierRecord {
    supplier: string;
    name1: string;
    name2: string;
    combinedName: string;
    embedding?: number[];
    group1?: string;
    group2?: string;
    cr1?: string;
    cr2?: string;
    awsVendor?: string;
}

export interface MatchResult {
    supplierCode: string;
    supplierName: string;
    similarity: number;
    confidence: 'high' | 'medium' | 'low';
}

// Simple text preprocessing
const preprocessText = (text: string): string => {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
};

// Simple TF-IDF based vector embedding (for demonstration)
// In production, you'd want to use a proper embedding service like Amazon Bedrock Embeddings
class SimpleEmbedding {
    private vocabulary: Map<string, number> = new Map();
    private idf: Map<string, number> = new Map();
    private documents: string[] = [];

    buildVocabulary(texts: string[]) {
        this.documents = texts.map(preprocessText);
        const wordCounts = new Map<string, number>();
        
        // Build vocabulary
        this.documents.forEach(doc => {
            const words = new Set(doc.split(' ').filter(w => w.length > 2));
            words.forEach(word => {
                wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            });
        });

        // Create vocabulary index
        let index = 0;
        wordCounts.forEach((count, word) => {
            if (count > 1) { // Only include words that appear more than once
                this.vocabulary.set(word, index++);
            }
        });

        // Calculate IDF
        const totalDocs = this.documents.length;
        this.vocabulary.forEach((_, word) => {
            const docsWithWord = this.documents.filter(doc => doc.includes(word)).length;
            this.idf.set(word, Math.log(totalDocs / docsWithWord));
        });
    }

    getEmbedding(text: string): number[] {
        const processedText = preprocessText(text);
        const words = processedText.split(' ').filter(w => w.length > 2);
        const vector = new Array(this.vocabulary.size).fill(0);
        
        // Calculate TF
        const tf = new Map<string, number>();
        words.forEach(word => {
            tf.set(word, (tf.get(word) || 0) + 1);
        });

        // Calculate TF-IDF vector
        tf.forEach((count, word) => {
            const vocabIndex = this.vocabulary.get(word);
            if (vocabIndex !== undefined) {
                const tfValue = count / words.length;
                const idfValue = this.idf.get(word) || 0;
                vector[vocabIndex] = tfValue * idfValue;
            }
        });

        return vector;
    }
}

// Cosine similarity calculation
const cosineSimilarity = (a: number[], b: number[]): number => {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

class SupplierMatcher {
    private suppliers: SupplierRecord[] = [];
    private embedding: SimpleEmbedding = new SimpleEmbedding();
    private isInitialized = false;

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Try to download from S3 first, fallback to local file
            let csvContent: string;
            try {
                const downloadResult = await downloadData({ 
                    path: 'SupplierList.csv' 
                }).result;
                csvContent = await downloadResult.body.text();
                console.log('Loaded supplier list from S3');
            } catch (s3Error) {
                console.log('Could not load from S3, trying local fallback');
                try {
                    // Fallback to public folder (for development)
                    const response = await fetch('/SupplierList.csv');
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    csvContent = await response.text();
                    console.log('Loaded supplier list from public folder');
                } catch (localError) {
                    throw new Error('SupplierList.csv not found in S3 or public folder. Please upload it using the Supplier Management tab.');
                }
            }

            this.suppliers = this.parseCSV(csvContent);
            
            // Build embeddings
            const combinedNames = this.suppliers.map(s => s.combinedName);
            this.embedding.buildVocabulary(combinedNames);
            
            // Generate embeddings for all suppliers
            this.suppliers.forEach(supplier => {
                supplier.embedding = this.embedding.getEmbedding(supplier.combinedName);
            });

            this.isInitialized = true;
            console.log(`Initialized supplier matcher with ${this.suppliers.length} suppliers`);
        } catch (error) {
            console.error('Error initializing supplier matcher:', error);
            throw error;
        }
    }

    private parseCSV(csvContent: string): SupplierRecord[] {
        const lines = csvContent.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        return lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
                const values = this.parseCSVLine(line);
                const supplier = values[0] || '';
                const name1 = values[1] || '';
                const name2 = values[2] || '';
                const combinedName = `${name1} ${name2}`.trim();
                
                return {
                    supplier,
                    name1,
                    name2,
                    combinedName,
                    group1: values[3] || '',
                    group2: values[4] || '',
                    cr1: values[5] || '',
                    cr2: values[6] || '',
                    awsVendor: values[7] || ''
                };
            })
            .filter(record => record.supplier && record.combinedName);
    }

    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    async findBestMatch(vendorName: string): Promise<MatchResult | null> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!vendorName || this.suppliers.length === 0) {
            return null;
        }

        const queryEmbedding = this.embedding.getEmbedding(vendorName);
        let bestMatch: MatchResult | null = null;
        let bestSimilarity = 0;

        for (const supplier of this.suppliers) {
            if (!supplier.embedding) continue;
            
            const similarity = cosineSimilarity(queryEmbedding, supplier.embedding);
            
            if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                const confidence: 'high' | 'medium' | 'low' = similarity > 0.8 ? 'high' : similarity > 0.5 ? 'medium' : 'low';
                bestMatch = {
                    supplierCode: supplier.supplier,
                    supplierName: supplier.combinedName,
                    similarity,
                    confidence
                } as MatchResult;
            }
        }

        // Only return matches with reasonable similarity
        if (bestMatch !== null && bestMatch.similarity > 0.3) {
            return bestMatch;
        }
        return null;
    }

    async findTopMatches(vendorName: string, topK: number = 3): Promise<MatchResult[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!vendorName || this.suppliers.length === 0) {
            return [];
        }

        const queryEmbedding = this.embedding.getEmbedding(vendorName);
        const matches: MatchResult[] = [];

        this.suppliers.forEach(supplier => {
            if (!supplier.embedding) return;
            
            const similarity = cosineSimilarity(queryEmbedding, supplier.embedding);
            
            if (similarity > 0.3) { // Minimum threshold
                const confidence: 'high' | 'medium' | 'low' = similarity > 0.8 ? 'high' : similarity > 0.5 ? 'medium' : 'low';
                matches.push({
                    supplierCode: supplier.supplier,
                    supplierName: supplier.combinedName,
                    similarity,
                    confidence
                });
            }
        });

        return matches
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);
    }

    getSuppliers(): SupplierRecord[] {
        return this.suppliers;
    }
}

// Singleton instance
export const supplierMatcher = new SupplierMatcher();
