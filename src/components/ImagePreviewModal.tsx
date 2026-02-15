import React from 'react';
import { Modal, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import { IconButton } from 'react-native-paper';

interface ImagePreviewModalProps {
    visible: boolean;
    imageUrl: string;
    onDismiss: () => void;
}

const ImagePreviewModal = ({ visible, imageUrl, onDismiss }: ImagePreviewModalProps) => {
    if (!imageUrl) return null;

    const images = [{
        url: imageUrl,
        props: {
            // source: require('../background.png') // Optional if you want to verify source
        }
    }];

    return (
        <Modal
            visible={visible}
            transparent={true}
            onRequestClose={onDismiss}
        >
            <ImageViewer
                imageUrls={images}
                enableSwipeDown={true}
                onSwipeDown={onDismiss}
                renderHeader={() => (
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
                            <IconButton
                                icon="close"
                                iconColor="white"
                                size={30}
                                onPress={onDismiss}
                            />
                        </TouchableOpacity>
                    </View>
                )}
                renderIndicator={() => <View />} // Hide "1/1" indicator
            />
        </Modal>
    );
};

const styles = StyleSheet.create({
    header: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 9999,
        alignItems: 'flex-end',
    },
    closeButton: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    }
});

export default ImagePreviewModal;
