import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchCamera, launchImageLibrary, ImagePickerResponse, Asset } from 'react-native-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import BottomSheet from './BottomSheet';

export interface ImageUploadResult {
  assets: Asset[];
  color?: string;
}

interface ImageUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (result: ImageUploadResult) => void;
  model?: string;
  availableColors?: string[];
}

// Mock renk verileri - API bağlantısında servis ile değiştirilecek
const MOCK_COLORS = ['Siyah', 'Beyaz', 'Lacivert', 'Kahverengi', 'Kırmızı', 'Gri', 'Bej', 'Yeşil'];

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
// 4 per row: BottomSheet content padding (20*2) + 3 gaps (8*3) = 64
const IMAGE_SIZE = Math.floor((SCREEN_WIDTH - 64) / 4);

export default function ImageUploadModal({
  visible,
  onClose,
  onImageSelected,
  model,
  availableColors,
}: ImageUploadModalProps) {
  const { colors, isDark } = useTheme();
  const [selectedImages, setSelectedImages] = useState<Asset[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [colorSheetVisible, setColorSheetVisible] = useState(false);
  const [colorSearch, setColorSearch] = useState('');

  const colorList = availableColors && availableColors.length > 0 ? availableColors : MOCK_COLORS;
  const filteredColors = useMemo(() => {
    if (!colorSearch.trim()) return colorList;
    const search = colorSearch.trim().toLowerCase();
    return colorList.filter(c => c.toLowerCase().includes(search));
  }, [colorList, colorSearch]);

  const styles = createStyles(colors, isDark);

  const handleClose = () => {
    setSelectedImages([]);
    setSelectedColor('');
    onClose();
  };

  const handleImagePicked = (response: ImagePickerResponse) => {
    if (response.didCancel) return;

    if (response.errorCode) {
      Alert.alert('Hata', response.errorMessage || 'Görsel seçilemedi');
      return;
    }

    if (response.assets && response.assets.length > 0) {
      setSelectedImages(prev => [...prev, ...response.assets!]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedImages.length === 0 || !selectedColor) return;
    onImageSelected({ assets: selectedImages, color: selectedColor });
    handleClose();
  };

  const handleTakePhoto = () => {
    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.5,
        maxWidth: 800,
        maxHeight: 1200,
        includeBase64: true,
      },
      handleImagePicked,
    );
  };

  const handleChooseFromGallery = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.5,
        maxWidth: 800,
        maxHeight: 1200,
        selectionLimit: 0,
        includeBase64: true,
      },
      handleImagePicked,
    );
  };

  return (
    <BottomSheet
      visible={visible}
      title="Görsel Yükle"
      icon="image-outline"
      iconColor={colors.primary}
      onClose={handleClose}
      onSave={handleUpload}
      saveText={selectedImages.length > 0 ? `Yükle (${selectedImages.length})` : 'Yükle'}
      saveIcon="cloud-upload-outline"
      saveDisabled={selectedImages.length === 0 || !selectedColor}
      cancelText="İptal"
      height={SCREEN_HEIGHT * 0.85}
      autoHeight
    >
      {/* Model Badge */}
      {model && (
        <View style={styles.modelSection}>
          <Text style={styles.modelLabel}>Model</Text>
          <View style={styles.modelBadge}>
            <View style={styles.modelIcon}>
              <Icon name="pricetag-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.modelText} numberOfLines={1}>{model}</Text>
          </View>
        </View>
      )}

      {/* Color Selector */}
      <View style={styles.colorSection}>
        <Text style={styles.colorLabel}>Renk</Text>
        <Pressable
          style={[
            styles.colorSelectButton,
            !selectedColor && styles.colorSelectEmpty,
          ]}
          onPress={() => setColorSheetVisible(true)}
        >
          <View style={styles.colorSelectLeft}>
            <View style={[styles.colorSelectIcon, selectedColor ? { backgroundColor: colors.primary + '15' } : {}]}>
              <Icon
                name="color-palette-outline"
                size={18}
                color={selectedColor ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text style={[
              styles.colorSelectText,
              !selectedColor && styles.colorSelectPlaceholder,
            ]}>
              {selectedColor || 'Renk seçiniz'}
            </Text>
          </View>
          <Icon name="chevron-down" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Upload Buttons */}
      <View style={styles.uploadButtonsRow}>
        <Pressable
          style={[styles.uploadButton, styles.cameraUploadButton]}
          onPress={handleTakePhoto}
        >
          <View style={styles.uploadButtonIcon}>
            <Icon name="camera" size={26} color="#FFFFFF" />
          </View>
          <Text style={styles.uploadButtonText}>Fotoğraf Çek</Text>
          <Text style={styles.uploadButtonHint}>Kamera ile çekim</Text>
        </Pressable>

        <Pressable
          style={[styles.uploadButton, styles.galleryUploadButton]}
          onPress={handleChooseFromGallery}
        >
          <View style={styles.uploadButtonIcon}>
            <Icon name="images" size={26} color="#FFFFFF" />
          </View>
          <Text style={styles.uploadButtonText}>Galeriden Seç</Text>
          <Text style={styles.uploadButtonHint}>Mevcut görseller</Text>
        </Pressable>
      </View>

      {/* Selected Images Preview - Grid */}
      {selectedImages.length > 0 && (
        <View style={styles.previewSection}>
          <View style={styles.previewHeader}>
            <View style={styles.sectionTitleRow}>
              <Icon name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>
                Seçilen Görseller ({selectedImages.length})
              </Text>
            </View>
            <Pressable style={styles.clearAllButton} onPress={() => setSelectedImages([])}>
              <Icon name="trash-outline" size={14} color="#FFFFFF" />
              <Text style={styles.clearAllText}>Tümünü Sil</Text>
            </Pressable>
          </View>
          <View style={styles.previewGrid}>
            {selectedImages.map((asset, index) => (
              <View key={`${asset.uri}-${index}`} style={styles.previewImageContainer}>
                <Image
                  source={{ uri: asset.uri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <View style={styles.previewImageOverlay}>
                  <View style={styles.previewImageIndex}>
                    <Text style={styles.previewImageIndexText}>{index + 1}</Text>
                  </View>
                  <Pressable
                    style={styles.removeImageButton}
                    onPress={() => handleRemoveImage(index)}
                  >
                    <Icon name="close" size={12} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Color Selection BottomSheet - nested inside main BottomSheet's Modal */}
      <BottomSheet
        visible={colorSheetVisible}
        title="Renk Seçimi"
        icon="color-palette-outline"
        iconColor={colors.primary}
        onClose={() => { setColorSheetVisible(false); setColorSearch(''); }}
        showFooter={false}
        height={SCREEN_HEIGHT * 0.7}
      >
        {/* Search Input */}
        <View style={styles.colorSearchContainer}>
          <Icon name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.colorSearchInput, { color: colors.text }]}
            placeholder="Renk ara..."
            placeholderTextColor={colors.textSecondary}
            value={colorSearch}
            onChangeText={setColorSearch}
            autoCapitalize="none"
          />
          {colorSearch.length > 0 && (
            <Pressable onPress={() => setColorSearch('')}>
              <Icon name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {filteredColors.length === 0 && (
          <View style={styles.colorEmptyState}>
            <Icon name="search-outline" size={24} color={colors.textSecondary} />
            <Text style={[styles.colorEmptyText, { color: colors.textSecondary }]}>
              Sonuç bulunamadı
            </Text>
          </View>
        )}

        {filteredColors.map((color) => {
          const isSelected = selectedColor === color;
          return (
            <Pressable
              key={color}
              style={[
                styles.colorOption,
                isSelected && styles.colorOptionSelected,
              ]}
              onPress={() => {
                setSelectedColor(color);
                setColorSheetVisible(false);
                setColorSearch('');
              }}
            >
              <View style={[styles.colorOptionIcon, isSelected && { backgroundColor: colors.primary + '15' }]}>
                <Icon name="color-palette" size={18} color={isSelected ? colors.primary : colors.textSecondary} />
              </View>
              <Text style={[styles.colorOptionText, isSelected && { color: colors.primary, fontWeight: '700' }]}>
                {color}
              </Text>
              {isSelected && (
                <View style={[styles.colorOptionCheck, { backgroundColor: colors.primary }]}>
                  <Icon name="checkmark" size={14} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
          );
        })}
      </BottomSheet>
    </BottomSheet>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    modelSection: {
      marginBottom: 16,
    },
    modelLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    modelBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary + '30',
      backgroundColor: colors.primary + '08',
    },
    modelIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    modelText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    colorSection: {
      marginBottom: 16,
    },
    colorLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    colorSelectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    colorSelectEmpty: {
      borderStyle: 'dashed' as any,
    },
    colorSelectLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    colorSelectIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorSelectText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    colorSelectPlaceholder: {
      color: colors.textSecondary,
      fontWeight: '400',
    },
    colorSearchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
      marginBottom: 12,
    },
    colorSearchInput: {
      flex: 1,
      fontSize: 14,
      paddingVertical: 0,
    },
    colorEmptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
      gap: 8,
    },
    colorEmptyText: {
      fontSize: 14,
      fontWeight: '500',
    },
    colorOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginBottom: 8,
    },
    colorOptionSelected: {
      borderColor: colors.primary + '40',
      backgroundColor: colors.primary + '08',
    },
    colorOptionIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    colorOptionText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    colorOptionCheck: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    uploadButtonsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    uploadButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 18,
      borderRadius: 14,
    },
    cameraUploadButton: {
      backgroundColor: colors.primary,
    },
    galleryUploadButton: {
      backgroundColor: isDark ? '#6366F1' : '#8B5CF6',
    },
    uploadButtonIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    uploadButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
      marginBottom: 2,
    },
    uploadButtonHint: {
      fontSize: 11,
      color: 'rgba(255, 255, 255, 0.7)',
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    previewSection: {
      marginBottom: 16,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    clearAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#EF4444',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    clearAllText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    previewGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    previewImageContainer: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    previewImage: {
      width: IMAGE_SIZE,
      height: IMAGE_SIZE,
      backgroundColor: isDark ? '#1A1A2E' : '#F1F5F9',
    },
    previewImageOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: 4,
    },
    previewImageIndex: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewImageIndexText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    removeImageButton: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(239, 68, 68, 0.9)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
