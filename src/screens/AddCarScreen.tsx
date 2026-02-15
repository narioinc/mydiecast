import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, FlatList, Alert } from 'react-native';
import { TextInput, Button, Appbar, useTheme, Surface, Portal, Dialog, Text, List, Menu, Divider } from 'react-native-paper';
import { useCollection } from '../context/CollectionContext';
import { useNavigation } from '@react-navigation/native';
import ImagePicker, { Image as CroppedImage } from 'react-native-image-crop-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { parseOCRText, ParsedDiecastInfo } from '../utils/ocrParser';

const SCALES = ['1:8', '1:9', '1:12', '1:18', '1:24', '1:32', '1:43', '1:64'];
const YEARS = Array.from({ length: 127 }, (_, i) => (2026 - i).toString()); // From 2026 down to 1900
const CONDITIONS = [
    'Mint',
    'Mint in Box',
    'Near Mint',
    'Good',
    'Fair',
    'Light play',
    'Moderate play',
    'Heavy play'
];

const AddCarScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const { addCar, brands, addBrand } = useCollection();

    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [modelId, setModelId] = useState('');
    const [scale, setScale] = useState('1:64');
    const [year, setYear] = useState('');
    const [condition, setCondition] = useState('New');
    const [notes, setNotes] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);


    const [ocrDialogVisible, setOcrDialogVisible] = useState(false);
    const [parsedInfo, setParsedInfo] = useState<ParsedDiecastInfo | null>(null);

    // Editable OCR Fields
    const [editBrand, setEditBrand] = useState('');
    const [editModel, setEditModel] = useState('');
    const [editScale, setEditScale] = useState('');
    const [editModelId, setEditModelId] = useState('');
    const [editManufacturer, setEditManufacturer] = useState('');

    const [brandMenuVisible, setBrandMenuVisible] = useState(false);
    const [isCustomBrand, setIsCustomBrand] = useState(false);

    const [scaleMenuVisible, setScaleMenuVisible] = useState(false);
    const [yearPickerVisible, setYearPickerVisible] = useState(false);
    const [conditionMenuVisible, setConditionMenuVisible] = useState(false);

    const [editBrandMenuVisible, setEditBrandMenuVisible] = useState(false);
    const [isCustomEditBrand, setIsCustomEditBrand] = useState(false);
    const [editScaleMenuVisible, setEditScaleMenuVisible] = useState(false);

    const handleAdd = () => {
        if (brand && model) {
            if (isCustomBrand) {
                addBrand(brand);
            }
            addCar({ brand, model, modelId, scale, year, condition, notes, imageUrl: imageUri || undefined });
            navigation.goBack();
        }
    };

    const handlePickImage = async (useCamera: boolean) => {
        try {
            const options = {
                mediaType: 'photo' as const,
                cropping: true,
                freeStyleCropEnabled: true,
                forceJpg: true,
            };

            const image = useCamera
                ? await ImagePicker.openCamera(options)
                : await ImagePicker.openPicker(options);

            if (image) {
                setImageUri((image as CroppedImage).path);
            }
        } catch (error: any) {
            if (error.code !== 'E_PICKER_CANCELLED') {
                console.error('ImagePicker Error: ', error);
                Alert.alert('Error', 'Failed to pick image');
            }
        }
    };

    const handleScanBox = async () => {
        try {
            const image = await ImagePicker.openCamera({
                mediaType: 'photo',
                cropping: true,
                freeStyleCropEnabled: true,
                forceJpg: true,
            });

            if (image) {
                const p = (image as CroppedImage).path;
                setImageUri(p);
                try {
                    const visionResult = await TextRecognition.recognize(p);
                    const info = parseOCRText(visionResult.text);
                    setParsedInfo(info);

                    // Populate editable fields
                    setEditBrand(info.brand || '');
                    setEditModel(info.model || '');
                    setEditScale(info.scale || '1:64');
                    setEditModelId(info.modelId || '');
                    setEditManufacturer(info.manufacturer || '');

                    setOcrDialogVisible(true);
                } catch (e) {
                    console.error('OCR failed', e);
                    Alert.alert('Error', 'Failed to scan box');
                }
            }
        } catch (error: any) {
            if (error.code !== 'E_PICKER_CANCELLED') {
                console.error('ScanBox Error: ', error);
            }
        }
    };

    const confirmOCR = () => {
        setBrand(editBrand || editManufacturer);
        setModel(editModel);
        setScale(editScale);
        setModelId(editModelId);
        // Notes updated separately if needed, but modelId is now a field
        setOcrDialogVisible(false);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Appbar.Header>
                <Appbar.BackAction onPress={() => navigation.goBack()} />
                <Appbar.Content title="Add New Car" />
            </Appbar.Header>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Surface style={styles.surface} elevation={1}>
                    <View style={styles.imageContainer}>
                        {imageUri ? (
                            <Image source={{ uri: imageUri }} style={styles.image} />
                        ) : (
                            <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
                                <Text variant="bodyMedium">No image selected</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.buttonRow}>
                        <Button icon="camera" mode="contained-tonal" style={styles.flexButton} onPress={() => handlePickImage(true)}>
                            Photo
                        </Button>
                        <Button icon="image" mode="contained-tonal" style={styles.flexButton} onPress={() => handlePickImage(false)}>
                            Gallery
                        </Button>
                        <Button icon="scan-helper" mode="contained" style={styles.flexButton} onPress={handleScanBox}>
                            Scan Box
                        </Button>
                    </View>

                    <View style={styles.inputContainer}>
                        <Menu
                            visible={brandMenuVisible}
                            onDismiss={() => setBrandMenuVisible(false)}
                            anchor={
                                <TouchableOpacity onPress={() => setBrandMenuVisible(true)}>
                                    <TextInput
                                        label="Brand"
                                        value={brand}
                                        editable={isCustomBrand}
                                        onChangeText={setBrand}
                                        style={styles.input}
                                        mode="outlined"
                                        right={<TextInput.Icon icon="chevron-down" onPress={() => setBrandMenuVisible(true)} />}
                                    />
                                </TouchableOpacity>
                            }
                        >
                            {brands.map((b) => (
                                <Menu.Item key={b} onPress={() => { setBrand(b); setIsCustomBrand(false); setBrandMenuVisible(false); }} title={b} />
                            ))}
                            <Divider />
                            <Menu.Item onPress={() => { setBrand(''); setIsCustomBrand(true); setBrandMenuVisible(false); }} title="Add Custom Brand..." />
                        </Menu>

                        <TextInput
                            label="Model"
                            value={model}
                            onChangeText={setModel}
                            style={styles.input}
                            mode="outlined"
                        />

                        <TextInput
                            label="Model ID"
                            value={modelId}
                            onChangeText={setModelId}
                            style={styles.input}
                            mode="outlined"
                        />

                        <View style={styles.row}>
                            <Menu
                                visible={scaleMenuVisible}
                                onDismiss={() => setScaleMenuVisible(false)}
                                anchor={
                                    <TouchableOpacity onPress={() => setScaleMenuVisible(true)} style={{ flex: 1, marginRight: 8 }}>
                                        <TextInput
                                            label="Scale"
                                            value={scale}
                                            editable={false}
                                            style={styles.input}
                                            mode="outlined"
                                            right={<TextInput.Icon icon="chevron-down" onPress={() => setScaleMenuVisible(true)} />}
                                        />
                                    </TouchableOpacity>
                                }
                            >
                                {SCALES.map((s) => (
                                    <Menu.Item key={s} onPress={() => { setScale(s); setScaleMenuVisible(false); }} title={s} />
                                ))}
                            </Menu>

                            <TouchableOpacity onPress={() => setYearPickerVisible(true)} style={{ flex: 1 }}>
                                <TextInput
                                    label="Year"
                                    value={year}
                                    editable={false}
                                    style={styles.input}
                                    mode="outlined"
                                    right={<TextInput.Icon icon="calendar" onPress={() => setYearPickerVisible(true)} />}
                                />
                            </TouchableOpacity>
                        </View>

                        <Menu
                            visible={conditionMenuVisible}
                            onDismiss={() => setConditionMenuVisible(false)}
                            anchor={
                                <TouchableOpacity onPress={() => setConditionMenuVisible(true)}>
                                    <TextInput
                                        label="Condition"
                                        value={condition}
                                        editable={false}
                                        style={styles.input}
                                        mode="outlined"
                                        right={<TextInput.Icon icon="chevron-down" onPress={() => setConditionMenuVisible(true)} />}
                                    />
                                </TouchableOpacity>
                            }
                        >
                            {CONDITIONS.map((c) => (
                                <Menu.Item key={c} onPress={() => { setCondition(c); setConditionMenuVisible(false); }} title={c} />
                            ))}
                        </Menu>

                        <TextInput
                            label="Notes"
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={3}
                            style={styles.input}
                            mode="outlined"
                        />
                    </View>

                    <Button
                        mode="contained"
                        onPress={handleAdd}
                        style={styles.button}
                        disabled={!brand || !model}
                    >
                        Add to Collection
                    </Button>
                </Surface>
            </ScrollView>

            <Portal>
                <Dialog visible={ocrDialogVisible} onDismiss={() => setOcrDialogVisible(false)}>
                    <Dialog.Title>Verify Detection</Dialog.Title>
                    <Dialog.Content>
                        <ScrollView style={{ maxHeight: 300 }}>
                            <Text variant="bodySmall" style={{ marginBottom: 16, opacity: 0.7 }}>
                                Review and correct the information detected from the box art.
                            </Text>

                            <Menu
                                visible={editBrandMenuVisible}
                                onDismiss={() => setEditBrandMenuVisible(false)}
                                anchor={
                                    <TouchableOpacity onPress={() => setEditBrandMenuVisible(true)}>
                                        <TextInput
                                            label="Brand"
                                            value={editBrand}
                                            editable={isCustomEditBrand}
                                            onChangeText={setEditBrand}
                                            mode="outlined"
                                            dense
                                            style={styles.dialogInput}
                                            right={<TextInput.Icon icon="chevron-down" onPress={() => setEditBrandMenuVisible(true)} />}
                                        />
                                    </TouchableOpacity>
                                }
                            >
                                {brands.map((b) => (
                                    <Menu.Item key={b} onPress={() => { setEditBrand(b); setIsCustomEditBrand(false); setEditBrandMenuVisible(false); }} title={b} />
                                ))}
                                <Divider />
                                <Menu.Item onPress={() => { setEditBrand(''); setIsCustomEditBrand(true); setEditBrandMenuVisible(false); }} title="Add Custom Brand..." />
                            </Menu>

                            <TextInput
                                label="Model"
                                value={editModel}
                                onChangeText={setEditModel}
                                mode="outlined"
                                dense
                                style={styles.dialogInput}
                            />

                            <TextInput
                                label="Manufacturer"
                                value={editManufacturer}
                                onChangeText={setEditManufacturer}
                                mode="outlined"
                                dense
                                style={styles.dialogInput}
                            />

                            <View style={styles.row}>
                                <Menu
                                    visible={editScaleMenuVisible}
                                    onDismiss={() => setEditScaleMenuVisible(false)}
                                    anchor={
                                        <TouchableOpacity onPress={() => setEditScaleMenuVisible(true)} style={{ flex: 1, marginRight: 8 }}>
                                            <TextInput
                                                label="Scale"
                                                value={editScale}
                                                editable={false}
                                                mode="outlined"
                                                dense
                                                style={styles.dialogInput}
                                                right={<TextInput.Icon icon="chevron-down" onPress={() => setEditScaleMenuVisible(true)} />}
                                            />
                                        </TouchableOpacity>
                                    }
                                >
                                    {SCALES.map((s) => (
                                        <Menu.Item key={s} onPress={() => { setEditScale(s); setEditScaleMenuVisible(false); }} title={s} />
                                    ))}
                                </Menu>

                                <TextInput
                                    label="Model ID"
                                    value={editModelId}
                                    onChangeText={setEditModelId}
                                    mode="outlined"
                                    dense
                                    style={[styles.dialogInput, { flex: 1 }]}
                                />
                            </View>
                        </ScrollView>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setOcrDialogVisible(false)}>Cancel</Button>
                        <Button onPress={confirmOCR}>Confirm & Fill</Button>
                    </Dialog.Actions>
                </Dialog>
                <Dialog visible={yearPickerVisible} onDismiss={() => setYearPickerVisible(false)}>
                    <Dialog.Title>Select Year</Dialog.Title>
                    <Dialog.Content style={{ height: 300, paddingHorizontal: 0 }}>
                        <FlatList
                            data={YEARS}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <List.Item
                                    title={item}
                                    onPress={() => {
                                        setYear(item);
                                        setYearPickerVisible(false);
                                    }}
                                />
                            )}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setYearPickerVisible(false)}>Cancel</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    surface: {
        padding: 16,
        borderRadius: 8,
    },
    imageContainer: {
        height: 200,
        width: '100%',
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    imagePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonRow: {
        flexDirection: 'row',
        marginBottom: 24,
        gap: 8,
    },
    flexButton: {
        flex: 1,
    },
    inputContainer: {
        marginBottom: 16,
    },
    input: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
    },
    button: {
        marginTop: 8,
    },
    dialogInput: {
        marginBottom: 12,
    },
});

export default AddCarScreen;
