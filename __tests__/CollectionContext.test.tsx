
import React, { act } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { CollectionProvider, useCollection } from '../src/context/CollectionContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { vectorSearchService } from '../src/services/VectorSearchService';

describe('CollectionContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(null);
        (vectorSearchService.generateEmbedding as jest.Mock).mockResolvedValue(new Float32Array([0.1, 0.2, 0.3]));
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CollectionProvider>{children}</CollectionProvider>
    );

    it('loads cars from storage on mount', async () => {
        const mockCars = [{ id: '1', brand: 'Hot Wheels', model: 'Test Car', condition: 'Mint' }];
        (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
            if (key === '@mydiecast_cars') return Promise.resolve(JSON.stringify(mockCars));
            return Promise.resolve(null);
        });

        const { result } = renderHook(() => useCollection(), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.cars).toHaveLength(1);
        expect(result.current.cars[0].model).toBe('Test Car');
        expect(vectorSearchService.init).toHaveBeenCalled();
    });

    it('adds a new car and saves to storage and vector db', async () => {
        const { result } = renderHook(() => useCollection(), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.addCar({
                brand: 'Matchbox',
                model: 'New Car',
                condition: 'Good',
                scale: '1:64',
                imageUrl: 'file://test.jpg',
            });
        });

        expect(result.current.cars).toHaveLength(1);
        expect(result.current.cars[0].brand).toBe('Matchbox');
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
            '@mydiecast_cars',
            expect.stringContaining('Matchbox')
        );
        expect(vectorSearchService.generateEmbedding).toHaveBeenCalledWith('file://test.jpg');
        expect(vectorSearchService.storeEmbedding).toHaveBeenCalled();
    });

    it('removes a car', async () => {
        const mockCars = [{ id: '1', brand: 'Delete Me', model: 'Car', condition: 'Bad', scale: '1:64' }];
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockCars));

        const { result } = renderHook(() => useCollection(), { wrapper });
        await waitFor(() => expect(result.current.cars).toHaveLength(1));

        await act(async () => {
            await result.current.removeCar('1');
        });

        expect(result.current.cars).toHaveLength(0);
        expect(vectorSearchService.removeEmbedding).toHaveBeenCalledWith('1');
    });

    it('updates a car', async () => {
        const mockCars = [{ id: '1', brand: 'Hot Wheels', model: 'Old Name', condition: 'Mint', scale: '1:64' }];
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockCars));

        const { result } = renderHook(() => useCollection(), { wrapper });
        await waitFor(() => expect(result.current.cars).toHaveLength(1));

        const updatedCar = { ...result.current.cars[0], model: 'New Name' };

        await act(async () => {
            await result.current.updateCar(updatedCar);
        });

        expect(result.current.cars[0].model).toBe('New Name');
        expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('findSimilarCars calls vector service', async () => {
        const { result } = renderHook(() => useCollection(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        (vectorSearchService.findSimilar as jest.Mock).mockResolvedValue([{ carId: '1', similarity: 0.9 }]);

        await act(async () => {
            await result.current.findSimilarCars('file://query.jpg');
        });

        expect(vectorSearchService.generateEmbedding).toHaveBeenCalledWith('file://query.jpg');
        expect(vectorSearchService.findSimilar).toHaveBeenCalled();
    });
});
