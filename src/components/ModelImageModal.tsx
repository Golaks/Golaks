import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import XButton from './XButton';
import AddTanimModal from './AddTanimModal';
import { ModelColor } from '../services/model.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_HEIGHT = SCREEN_WIDTH * 0.75;
const THUMB_SIZE = Math.floor((SCREEN_WIDTH - 32 - 32) / 5);

interface PendingPhoto {
  uri: string;
  fileName: string;
  type: string;
}

interface ModelImage {
  id: number;
  url: string;
  renkAdi?: string | null;
}

interface ModelImageModalProps {
  visible: boolean;
  onClose: () => void;
  images: ModelImage[];
  modelName: string;
  onCamera: () => void;
  onGallery: () => void;
  isUploading?: boolean;
  colorList: ModelColor[];
  colorsLoading?: boolean;
  pendingPhotos: PendingPhoto[];
  onRemovePending: (index: number) => void;
  onUploadAll: (colorId?: number) => void;
  onDeleteImage: (imageId: number) => void | Promise<void>;
  onColorAdded?: (id: string, name: string) => void;
}

export default function ModelImageModal({
  visible,
  onClose,
  images,
  modelName,
  onCamera,
  onGallery,
  isUploading = false,
  colorList,
  colorsLoading = false,
  pendingPhotos,
  onRemovePending,
  onUploadAll,
  onDeleteImage,
  onColorAdded,
}: ModelImageModalProps) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedColorId, setSelectedColorId] = useState<number | undefined>(undefined);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddColor, setShowAddColor] = useState(false);
  const [hiddenForTanim, setHiddenForTanim] = useState(false);
  const sliderRef = useRef<FlatList>(null);

  const selectedColor = colorList.find(c => c.id === selectedColorId);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < images.length) {
      setActiveIndex(index);
    }
  };

  const handleThumbPress = (index: number) => {
    setActiveIndex(index);
    sliderRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleColorSelect = (colorId: number) => {
    setSelectedColorId(selectedColorId === colorId ? undefined : colorId);
    setColorDropdownOpen(false);
  };

  const sliderItemWidth = SCREEN_WIDTH - 24;
  const sliderItemHeight = sliderItemWidth * 0.75;

  const renderSliderItem = ({ item }: { item: ModelImage }) => (
    <View style={[styles.slideContainer, { width: sliderItemWidth, height: sliderItemHeight }]}>
      <Image source={{ uri: item.url }} style={[styles.slideImage, { width: sliderItemWidth, height: sliderItemHeight }]} resizeMode="contain" />
      {item.renkAdi && (
        <View style={styles.slideColorBadge}>
          <Icon name="color-palette-outline" size={12} color="#fff" />
          <Text style={styles.slideColorText}>{item.renkAdi}</Text>
        </View>
      )}
    </View>
  );

  return (
    <>
    <Modal
      visible={visible && !hiddenForTanim}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <Icon name="images" size={20} color={colors.primary} />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.title} numberOfLines={1}>{modelName}</Text>
                <Text style={styles.subtitle}>
                  {images.length > 0 ? `${images.length} resim` : 'Resim yok'}
                </Text>
              </View>
            </View>
            <XButton onPress={onClose} size={36} iconSize={20} />
          </View>

          {/* Content */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {images.length > 0 ? (
              <>
                {/* Image Slider Card */}
                <View style={[styles.sliderCardOuter, { position: 'relative' }]}>
                  <View style={styles.sliderCard}>
                    <FlatList
                      ref={sliderRef}
                      data={images}
                      renderItem={renderSliderItem}
                      keyExtractor={(_, i) => `slide-${i}`}
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      onMomentumScrollEnd={handleScroll}
                      getItemLayout={(_, index) => ({
                        length: SCREEN_WIDTH - 24,
                        offset: (SCREEN_WIDTH - 24) * index,
                        index,
                      })}
                    />
                    {images.length > 1 && (
                      <View style={styles.pageIndicator}>
                        <Text style={styles.pageIndicatorText}>
                          {activeIndex + 1} / {images.length}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Delete Button - top right corner */}
                  <TouchableOpacity
                    style={styles.slideDeleteButton}
                    onPress={() => setDeleteConfirmId(images[activeIndex].id)}
                    activeOpacity={0.7}
                  >
                    <Icon name="trash-outline" size={18} color="#fff" />
                  </TouchableOpacity>

                  {/* Inline Delete Confirmation Overlay */}
                  {deleteConfirmId !== null && (
                    <View style={styles.deleteOverlay}>
                      <View style={styles.deleteOverlayContent}>
                        <Icon name="trash-outline" size={28} color="#EF4444" />
                        <Text style={styles.deleteOverlayTitle}>Resmi Sil</Text>
                        <Text style={styles.deleteOverlayMessage}>
                          Bu resmi silmek istediğinize emin misiniz?
                        </Text>
                        <View style={styles.deleteOverlayButtons}>
                          <TouchableOpacity
                            style={styles.deleteOverlayCancelBtn}
                            onPress={() => setDeleteConfirmId(null)}
                            activeOpacity={0.7}
                            disabled={isDeleting}
                          >
                            <Icon name="close-outline" size={18} color="#333" />
                            <Text style={styles.deleteOverlayCancelText}>İptal</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.deleteOverlayConfirmBtn, isDeleting && { opacity: 0.6 }]}
                            onPress={async () => {
                              setIsDeleting(true);
                              try {
                                await onDeleteImage(deleteConfirmId);
                              } finally {
                                setIsDeleting(false);
                                setDeleteConfirmId(null);
                              }
                            }}
                            activeOpacity={0.7}
                            disabled={isDeleting}
                          >
                            <Icon name="trash-outline" size={18} color="#fff" />
                            <Text style={styles.deleteOverlayConfirmText}>
                              {isDeleting ? 'Siliniyor...' : 'Sil'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* Thumbnails row */}
                {images.length > 1 && (
                  <View style={styles.sliderActions}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.thumbRow}
                    >
                      {images.map((img, index) => (
                        <Pressable
                          key={`thumb-${index}`}
                          onPress={() => handleThumbPress(index)}
                          style={[
                            styles.thumbContainer,
                            activeIndex === index && styles.thumbActive,
                          ]}
                        >
                          <Image source={{ uri: img.url }} style={styles.thumbImage} />
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

              </>
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Icon name="images-outline" size={48} color={colors.textTertiary} />
                </View>
                <Text style={styles.emptyTitle}>Henüz resim eklenmemiş</Text>
                <Text style={styles.emptySubtitle}>Renk seçip kamera veya galeriden resim ekleyebilirsiniz</Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {/* Color Select */}
            <View style={styles.colorSection}>
              <View style={styles.colorLabelRow}>
                <Text style={styles.colorSectionLabel}>{'Renk'.toLocaleUpperCase('tr-TR')}</Text>
                <Pressable
                  style={styles.addColorBtn}
                  onPress={() => {
                    setHiddenForTanim(true);
                    setTimeout(() => setShowAddColor(true), 300);
                  }}
                  hitSlop={6}
                >
                  <Icon name="add" size={14} color={colors.primary} />
                  <Text style={styles.addColorText}>Ekle</Text>
                </Pressable>
              </View>
              {colorsLoading ? (
                <View style={styles.colorsLoadingRow}>
                  <Icon name="color-palette-outline" size={16} color={colors.textTertiary} />
                  <Text style={styles.colorsLoadingText}>Renkler yükleniyor...</Text>
                </View>
              ) : colorList.length === 0 ? (
                <View style={styles.colorsLoadingRow}>
                  <Icon name="color-palette-outline" size={16} color={colors.textTertiary} />
                  <Text style={styles.colorsLoadingText}>Renk tanımı bulunamadı</Text>
                </View>
              ) : (
                <Pressable
                  style={styles.selectButton}
                  onPress={() => setColorDropdownOpen(true)}
                >
                  <View style={styles.selectLeft}>
                    {selectedColor?.code ? (
                      <View style={[styles.colorDot, { backgroundColor: selectedColor.code }]} />
                    ) : (
                      <Icon name="color-palette-outline" size={18} color={colors.textSecondary} />
                    )}
                    <Text style={[styles.selectText, !selectedColor && styles.selectPlaceholder]}>
                      {selectedColor ? selectedColor.name : 'Renk seçiniz...'}
                    </Text>
                  </View>
                  <View style={styles.selectRight}>
                    {selectedColor && (
                      <Pressable
                        style={styles.clearButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedColorId(undefined);
                        }}
                        hitSlop={8}
                      >
                        <Icon name="close-circle" size={18} color={colors.textTertiary} />
                      </Pressable>
                    )}
                    <Icon name="chevron-down" size={18} color={colors.textSecondary} />
                  </View>
                </Pressable>
              )}
            </View>

            {/* Pending Photos */}
            {pendingPhotos.length > 0 && (
              <View style={styles.pendingSection}>
                <Text style={styles.pendingSectionLabel}>
                  {`Yüklenecek resimler (${pendingPhotos.length})`.toLocaleUpperCase('tr-TR')}
                </Text>
                <View style={styles.pendingGrid}>
                  {pendingPhotos.map((photo, index) => (
                    <View key={`pending-${index}`} style={styles.pendingItem}>
                      <Image source={{ uri: photo.uri }} style={styles.pendingImage} />
                      <Pressable
                        style={styles.pendingRemove}
                        onPress={() => onRemovePending(index)}
                        hitSlop={6}
                      >
                        <Icon name="close-circle" size={20} color="#EF4444" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Upload Buttons */}
            {isUploading ? (
              <View style={styles.uploadingContainer}>
                <Icon name="cloud-upload-outline" size={20} color={colors.primary} />
                <Text style={styles.uploadingText}>Yükleniyor...</Text>
              </View>
            ) : (
              <View style={styles.buttonsWrapper}>
                <View style={styles.buttonRow}>
                  <Pressable
                    style={[styles.actionButton, styles.cameraButton]}
                    onPress={() => onCamera()}
                  >
                    <Icon name="camera" size={22} color="#fff" />
                    <Text style={styles.actionButtonText}>Fotoğraf Çek</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.galleryButton]}
                    onPress={() => onGallery()}
                  >
                    <Icon name="images" size={22} color="#fff" />
                    <Text style={styles.actionButtonText}>Galeriden Seç</Text>
                  </Pressable>
                </View>
                {pendingPhotos.length > 0 && (
                  <Pressable
                    style={styles.uploadAllButton}
                    onPress={() => onUploadAll(selectedColorId)}
                  >
                    <Icon name="cloud-upload" size={22} color="#fff" />
                    <Text style={styles.uploadAllButtonText}>
                      Tümünü Yükle ({pendingPhotos.length})
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* Color Picker Modal */}
          <Modal
            visible={colorDropdownOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setColorDropdownOpen(false)}
          >
            <Pressable style={styles.colorModalOverlay} onPress={() => setColorDropdownOpen(false)}>
              <View style={styles.colorModalContent}>
                <View style={styles.colorModalHeader}>
                  <Text style={styles.colorModalTitle}>Renk Seçimi</Text>
                  <XButton onPress={() => setColorDropdownOpen(false)} size={32} iconSize={18} />
                </View>
                <FlatList
                  data={colorList}
                  keyExtractor={(item) => String(item.id)}
                  style={styles.colorModalList}
                  renderItem={({ item: color }) => {
                    const isSelected = selectedColorId === color.id;
                    return (
                      <Pressable
                        style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                        onPress={() => handleColorSelect(color.id)}
                      >
                        {color.code ? (
                          <View style={[styles.colorDot, { backgroundColor: color.code }]} />
                        ) : (
                          <View style={[styles.colorDot, { backgroundColor: colors.textTertiary + '30' }]} />
                        )}
                        <Text
                          style={[
                            styles.dropdownItemText,
                            isSelected && { color: colors.primary, fontWeight: '700' },
                          ]}
                          numberOfLines={1}
                        >
                          {color.name}
                        </Text>
                        {isSelected && (
                          <Icon name="checkmark" size={18} color={colors.primary} />
                        )}
                      </Pressable>
                    );
                  }}
                />
              </View>
            </Pressable>
          </Modal>
        </View>
      </View>
    </Modal>
    <AddTanimModal
      visible={showAddColor}
      onClose={() => {
        setShowAddColor(false);
        setTimeout(() => setHiddenForTanim(false), 300);
      }}
      tanimKodu="RENK"
      title="Renk Yönetimi"
      placeholder="Renk adı girin..."
      onSuccess={(id, deger) => {
        onColorAdded?.(id, deger);
        setShowAddColor(false);
        setTimeout(() => setHiddenForTanim(false), 300);
      }}
    />
    </>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '92%',
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      marginRight: 12,
    },
    headerIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTextContainer: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },
    body: {
      flexGrow: 0,
    },
    bodyContent: {
      paddingBottom: 8,
    },
    sliderCardOuter: {
      marginHorizontal: 12,
      marginTop: 12,
      position: 'relative',
    },
    sliderCard: {
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)',
      borderWidth: 1,
      borderColor: colors.border,
    },
    slideContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    slideImage: {
      borderRadius: 0,
    },
    slideColorBadge: {
      position: 'absolute',
      bottom: 12,
      left: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      zIndex: 10,
      elevation: 10,
    },
    slideColorText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    sliderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
    },
    slideDeleteButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: 'rgba(239,68,68,0.85)',
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      elevation: 50,
    },
    deleteOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100,
      elevation: 100,
      borderRadius: 16,
    },
    deleteOverlayContent: {
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingVertical: 24,
    },
    deleteOverlayTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#fff',
      marginTop: 10,
      marginBottom: 6,
    },
    deleteOverlayMessage: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      textAlign: 'center',
      marginBottom: 20,
    },
    deleteOverlayButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    deleteOverlayCancelBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.9)',
    },
    deleteOverlayCancelText: {
      fontSize: 14,
      fontWeight: '600',
    },
    deleteOverlayConfirmBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: '#EF4444',
    },
    deleteOverlayConfirmText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    pageIndicator: {
      position: 'absolute',
      bottom: 12,
      right: 20,
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    pageIndicatorText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    thumbRow: {
      gap: 8,
    },
    thumbContainer: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: 'transparent',
      overflow: 'hidden',
    },
    thumbActive: {
      borderColor: colors.primary,
    },
    thumbImage: {
      width: '100%',
      height: '100%',
      borderRadius: 8,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      paddingHorizontal: 32,
    },
    emptyIconContainer: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 32,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    // Color Select
    colorSection: {
      marginBottom: 12,
    },
    colorLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    colorSectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    addColorBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: colors.primary + '12',
    },
    addColorText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    selectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
    },
    selectButtonOpen: {
      borderColor: colors.primary,
    },
    selectLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    selectRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    selectText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    selectPlaceholder: {
      fontWeight: '400',
      color: colors.textTertiary,
    },
    clearButton: {
      padding: 2,
    },
    colorDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.1)',
    },
    colorModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    colorModalContent: {
      width: '100%',
      maxHeight: '70%',
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 16,
      overflow: 'hidden',
    },
    colorModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    colorModalTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    colorModalList: {
      flexGrow: 0,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    dropdownItemSelected: {
      backgroundColor: colors.primary + '08',
    },
    dropdownItemText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      flex: 1,
    },
    colorsLoadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: 'dashed',
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
    },
    colorsLoadingText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    pendingSection: {
      marginBottom: 12,
      paddingTop: 4,
    },
    pendingSectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 10,
      letterSpacing: 0.5,
    },
    pendingGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      paddingTop: 4,
    },
    pendingItem: {
      position: 'relative',
      width: Math.floor((SCREEN_WIDTH - 38 - 18) / 4),
      height: Math.floor((SCREEN_WIDTH - 38 - 18) / 4),
      borderRadius: 10,
    },
    pendingImage: {
      width: '100%',
      height: '100%',
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.primary + '40',
    },
    pendingRemove: {
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: colors.card,
      borderRadius: 10,
      zIndex: 1,
    },
    buttonsWrapper: {
      gap: 10,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
    },
    uploadAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: '#F59E0B',
    },
    uploadAllButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
    },
    cameraButton: {
      backgroundColor: '#3B82F6',
    },
    galleryButton: {
      backgroundColor: '#10B981',
    },
    actionButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
    },
    uploadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 14,
    },
    uploadingText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    },
  });
