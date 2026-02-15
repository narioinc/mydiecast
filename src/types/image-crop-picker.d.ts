declare module 'react-native-image-crop-picker' {
    export interface Options {
        cropping?: boolean;
        width?: number;
        height?: number;
        multiple?: boolean;
        path?: string;
        includeBase64?: boolean;
        includeExif?: boolean;
        avoidEmptySpaceAroundImage?: boolean;
        cropperActiveWidgetColor?: string;
        cropperStatusBarColor?: string;
        cropperToolbarColor?: string;
        cropperToolbarTitle?: string;
        freeStyleCropEnabled?: boolean;
        mediaType?: 'photo' | 'video';
        forceJpg?: boolean;
        [key: string]: any;
    }

    export interface Image {
        path: string;
        size: number;
        data: string | null;
        width: number;
        height: number;
        mime: string;
        exif: null | object;
        cropRect: null | {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        modificationDate?: string;
        filename?: string;
    }

    export function openPicker(options: Options): Promise<Image | Image[]>;
    export function openCamera(options: Options): Promise<Image | Image[]>;
    export function openCropper(options: Options): Promise<Image | Image[]>;
    export function clean(): Promise<void>;
    export function cleanSingle(path: string): Promise<void>;

    const ImagePicker: {
        openPicker(options: Options): Promise<Image | Image[]>;
        openCamera(options: Options): Promise<Image | Image[]>;
        openCropper(options: Options): Promise<Image | Image[]>;
        clean(): Promise<void>;
        cleanSingle(path: string): Promise<void>;
    };

    export default ImagePicker;
}
