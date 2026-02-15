
import { vectorSearchService, VectorMatch } from '../src/services/VectorSearchService';
import { open } from '@op-engineering/op-sqlite';
import { loadTensorflowModel } from 'react-native-fast-tflite';
import RNFS from 'react-native-fs';
import decodeJpeg from 'jpeg-js';

// Mocks are mostly handled in jest.setup.js or auto-mocked, but we need to refine them here
jest.mock('@op-engineering/op-sqlite');
jest.mock('react-native-fast-tflite');
jest.mock('react-native-fs');
jest.mock('jpeg-js');

describe('VectorSearchService', () => {
    let mockDbExecute: jest.Mock;
    let mockModelRun: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDbExecute = jest.fn();
        (open as jest.Mock).mockReturnValue({
            execute: mockDbExecute,
        });

        mockModelRun = jest.fn();
        (loadTensorflowModel as jest.Mock).mockResolvedValue({
            run: mockModelRun,
        });
    });

    it('initializes db and model', async () => {
        await vectorSearchService.init();

        expect(open).toHaveBeenCalledWith({ name: 'mydiecast_vectors.db' });
        expect(mockDbExecute).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS embeddings'));
        expect(loadTensorflowModel).toHaveBeenCalled();
    });

    it('generates embedding from image', async () => {
        (RNFS.readFile as jest.Mock).mockResolvedValue('base64data');
        (decodeJpeg.decode as jest.Mock).mockReturnValue({
            width: 224,
            height: 224,
            data: new Uint8Array(224 * 224 * 4).fill(100), // RGBA
        });
        mockModelRun.mockResolvedValue([new Float32Array(1280).fill(0.1)]);

        const vector = await vectorSearchService.generateEmbedding('file://test.jpg');

        expect(RNFS.readFile).toHaveBeenCalledWith('test.jpg', 'base64');
        expect(decodeJpeg.decode).toHaveBeenCalled();
        expect(mockModelRun).toHaveBeenCalled();
        expect(vector).toBeDefined();
        expect(vector).toHaveLength(1280);
    });

    it('stores embedding', async () => {
        const vector = new Float32Array([0.1, 0.2, 0.3]);
        await vectorSearchService.storeEmbedding('car1', vector);

        expect(mockDbExecute).toHaveBeenCalledWith(
            expect.stringContaining('INSERT OR REPLACE INTO embeddings'),
            expect.any(Array)
        );
    });

    it('finds similar vectors correctly', async () => {
        const queryVector = new Float32Array([1.0, 0.0, 0.0]); // Unit X

        // Mock DB return with 2 vectors
        // carA: [1.0, 0.0, 0.0] -> Identical (Sim 1.0)
        // carB: [0.0, 1.0, 0.0] -> Orthogonal (Sim 0.0)
        const storedVectorA = new Float32Array([1.0, 0.0, 0.0]);
        const storedVectorB = new Float32Array([0.0, 1.0, 0.0]);

        const mockRows = {
            length: 2,
            item: (i: number) => {
                if (i === 0) return { carId: 'carA', vector: new Uint8Array(storedVectorA.buffer) };
                if (i === 1) return { carId: 'carB', vector: new Uint8Array(storedVectorB.buffer) };
                return null;
            },
            _array: []
        };

        mockDbExecute.mockReturnValue({ rows: mockRows });

        const results = await vectorSearchService.findSimilar(queryVector);

        expect(results).toHaveLength(2);
        expect(results[0].carId).toBe('carA');
        expect(results[0].similarity).toBeCloseTo(1.0);
        expect(results[1].carId).toBe('carB');
        expect(results[1].similarity).toBeCloseTo(0.0);
    });

    it('handles empty db results gracefully', async () => {
        mockDbExecute.mockReturnValue({ rows: { length: 0, item: () => null } });
        const vector = new Float32Array([0.1]);
        const results = await vectorSearchService.findSimilar(vector);
        expect(results).toEqual([]);
    });
});
