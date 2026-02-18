import { open } from '@op-engineering/op-sqlite';
import { loadTensorflowModel } from 'react-native-fast-tflite';
import RNFS from 'react-native-fs';
import decodeJpeg from 'jpeg-js';
import { Buffer } from 'buffer';

const DB_NAME = 'mydiecast_vectors.db';
const MODEL_SIZE = 224;

export interface VectorMatch {
    carId: string;
    similarity: number;
}

class VectorSearchService {
    private db: any = null;
    private model: any = null;

    async init() {
        if (!this.db) {
            try {
                console.log('VectorSearchService: Opening database:', DB_NAME);
                this.db = await open({ name: DB_NAME });
                
                // Check if table exists
                console.log('VectorSearchService: Checking table structure...');
                const tableCheck = await this.db.execute(`
                    SELECT name FROM sqlite_master WHERE type='table' AND name='embeddings'
                `);
                console.log('VectorSearchService: Table check results:', tableCheck.rows[0]);
                
                await this.db.execute(`
                    CREATE TABLE IF NOT EXISTS embeddings (
                        carId TEXT PRIMARY KEY,
                        vector BLOB NOT NULL
                    )
                `);
                console.log("done creating table");

                var { rows } = await this.db.execute(
                    'SELECT count(*) as count FROM embeddings');
                console.log(rows);
               
                
                console.log('VectorSearchService: Database initialized successfully');
            } catch (e) {
                console.error('VectorSearchService: DB Init failed:', e);
            }
        }

        if (!this.model) {
            try {
                // In production, you'd want to handle the asset path correctly for each platform
                // require() works with metro, but TFLite loader needs the actual path or the required number
                this.model = await loadTensorflowModel(require('../../assets/mobilenet_v2.tflite'));
                console.log('TFLite Model loaded successfully');
            } catch (error) {
                console.error('VectorSearchService: Failed to load TFLite model', error);
            }
        }
    }

    async generateEmbedding(imageUri: string): Promise<Float32Array | null> {
        if (!this.model) await this.init();
        if (!this.model) return null;

        try {
            // 1. Read image as base64 and convert to Buffer
            // Note: imageUri might have 'file://' prefix which RNFS handles
            const cleanUri = imageUri.replace('file://', '');
            const base64 = await RNFS.readFile(cleanUri, 'base64');
            const jpegBuffer = Buffer.from(base64, 'base64');

            // 2. Decode JPEG
            const { width, height, data } = decodeJpeg.decode(jpegBuffer, { useTArray: true });

            // 3. Prepare tensor (RGB normalized to [-1, 1])
            // MobileNetV2 usually expects 224x224x3
            // decodeJpeg returns RGBA (4 channels)
            const inputTensor = new Float32Array(MODEL_SIZE * MODEL_SIZE * 3);

            // Simple sampling/resize if dimensions don't match (highly recommended to use 224x224 input)
            for (let y = 0; y < MODEL_SIZE; y++) {
                for (let x = 0; x < MODEL_SIZE; x++) {
                    const srcX = Math.floor((x / MODEL_SIZE) * width);
                    const srcY = Math.floor((y / MODEL_SIZE) * height);
                    const srcOffset = (srcY * width + srcX) * 4;
                    const destOffset = (y * MODEL_SIZE + x) * 3;

                    // Normalize pixels: (val / 127.5) - 1 -> [-1, 1]
                    inputTensor[destOffset] = (data[srcOffset] / 127.5) - 1.0;     // R
                    inputTensor[destOffset + 1] = (data[srcOffset + 1] / 127.5) - 1.0; // G
                    inputTensor[destOffset + 2] = (data[srcOffset + 2] / 127.5) - 1.0; // B
                }
            }

            // 4. Run Inference
            const output = await this.model.run([inputTensor]);

            // output is an array of Tensors. The feature vector is usually the first element.
            // MobileNetV2 feature vector is typically 1280 floats.
            if (output && output.length > 0) {
                console.log('Embedding generated successfully. Vector length:', output[0].length);
                return output[0] as Float32Array;
            }
            return null;
        } catch (error) {
            console.error('Embedding generation failed', error);
            return null;
        }
    }

    async storeEmbedding(carId: string, vector: Float32Array) {
        if (!this.db) await this.init();
        if (!this.db) return;

        try {
            const dataToStore = new Uint8Array(vector.buffer);
            console.log(`VectorSearchService: Storing embedding for ${carId}, vector size: ${vector.length} floats (${dataToStore.length} bytes)`);
            await this.db.execute(
                'INSERT OR REPLACE INTO embeddings (carId, vector) VALUES (?, ?)',
                [carId, dataToStore]
            );
            console.log(`VectorSearchService: Successfully stored embedding for ${carId}`);
            
            // Verify the store worked by querying
            const { verifyResults } = await this.db.execute('SELECT * FROM embeddings WHERE carId = ?', [carId]);
            if (verifyResults){
                console.log(`VectorSearchService: Verification - found row:`, verifyResults);
            }
            
            // Log database stats
            this.logDatabaseStats();
        } catch (e) {
            console.error('Failed to store embedding:', e);
        }
    }

    private logDatabaseStats() {
        if (!this.db) return;
        try {
            const results = this.db.execute('SELECT COUNT(*) as count, SUM(length(vector)) as totalBytes FROM embeddings');
            if (results && results.rows && results.rows.length > 0) {
                const row = results.rows.item(0);
                console.log(`VectorSearchService: DB Stats - ${row.count} embeddings, ${row.totalBytes} total bytes`);
            }
        } catch (e) {
            console.error('VectorSearchService: Failed to get DB stats', e);
        }
    }

    async findSimilar(queryVector: Float32Array, limit: number = 5): Promise<VectorMatch[]> {
        try {
            if (!this.db) await this.init();
            if (!this.db || !queryVector) return [];

            // Log database stats before querying
            this.logDatabaseStats();

            console.log('VectorSearchService: Executing SQL query...');
            const {rows} = await this.db.execute(
               'SELECT carId, vector FROM embeddings');

            if (!rows) {
                console.warn('VectorSearchService: No results object returned from query');
                return [];
            }else{
                //console.log(rows)
            }
            //console.log(results.item(0))

    

            if (rows.keys().length === 0) {
                console.warn('VectorSearchService: No rows found in embeddings query results');
                return [];
            }

            const matches: VectorMatch[] = [];

            for (var row of rows) {

                if (!row || !row.vector) {
                    console.warn(`VectorSearchService: Row missing vector data`, row);
                    continue;
                }

                try {
                    // row.vector is a Uint8Array from SQLite BLOB
                    // Float32Array constructor needs (buffer, byteOffset, length)
                    // MobileNetV2 usually returns 1280 floats -> 5120 bytes
                    const vectorData = row.vector;
                    const storedVector = new Float32Array(
                        vectorData.buffer,
                        vectorData.byteOffset || 0,
                        vectorData.byteLength / 4
                    );
                    console.log(queryVector)
                    console.log(storedVector);
                    const similarity = this.cosineSimilarity(queryVector, storedVector);
                    matches.push({ carId: row.carId, similarity });
                } catch (rowError) {
                    console.error(`Error processing row at index`, rowError);
                }
            }

            const sortedMatches = matches
                .filter(m => !isNaN(m.similarity))
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);

            console.log('Vector Search - Top Matches:', JSON.stringify(sortedMatches, null, 2));
            return sortedMatches;
            //return [];
        } catch (e) {
            console.error('Similarity search failed:', e);
            return [];
        }
    }

    private cosineSimilarity(a: Float32Array, b: Float32Array): number {
        if (!a || !b || a.length !== b.length) {
            return 0;
        }
        let dotProduct = 0;
        let mA = 0;
        let mB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            mA += a[i] * a[i];
            mB += b[i] * b[i];
        }
        mA = Math.sqrt(mA);
        mB = Math.sqrt(mB);
        if (mA === 0 || mB === 0) return 0;
        return dotProduct / (mA * mB);
    }

    async removeEmbedding(carId: string) {
        if (!this.db) await this.init();
        if (this.db) {
            this.db.execute('DELETE FROM embeddings WHERE carId = ?', [carId]);
        }
    }
}

export const vectorSearchService = new VectorSearchService();
