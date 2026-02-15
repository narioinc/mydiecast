
import 'react-native-gesture-handler/jestSetup';


jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

jest.mock('@react-navigation/native', () => {
    return {
        ...jest.requireActual('@react-navigation/native'),
        useNavigation: () => ({
            navigate: jest.fn(),
            goBack: jest.fn(),
        }),
        useRoute: () => ({
            params: {},
        }),
    };
});

jest.mock('react-native-fs', () => ({
    readFile: jest.fn(),
    writeFile: jest.fn(),
    TemporaryDirectoryPath: 'tmp',
}));

jest.mock('react-native-share', () => ({
    default: {
        open: jest.fn(),
    },
}));

jest.mock('@react-native-documents/picker', () => ({
    pick: jest.fn(),
}));

jest.mock('react-native-image-crop-picker', () => ({
    openCamera: jest.fn(),
    openPicker: jest.fn(),
}));

jest.mock('@react-native-ml-kit/text-recognition', () => ({
    recognize: jest.fn(),
}));

jest.mock('react-native-fast-tflite', () => ({
    loadTensorflowModel: jest.fn(),
}));

jest.mock('@op-engineering/op-sqlite', () => ({
    open: jest.fn(() => ({
        execute: jest.fn(),
    })),
}));

jest.mock('./src/services/VectorSearchService', () => ({
    vectorSearchService: {
        init: jest.fn(),
        generateEmbedding: jest.fn(),
        storeEmbedding: jest.fn(),
        removeEmbedding: jest.fn(),
        findSimilar: jest.fn(),
    },
}));
