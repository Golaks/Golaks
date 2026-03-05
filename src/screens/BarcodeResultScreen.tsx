import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  StatusBar,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import BackButton from '../components/BackButton';
import LoadingSpinner from '../components/LoadingSpinner';
import TabBar, { TabName } from '../components/TabBar';
import SearchInput from '../components/SearchInput';
import { authService } from '../services/auth.service';
import barcodeService, {
  ProductImage,
  ProductInfo,
  ProductDistribution,
  ProductionDistribution,
} from '../services/barcode.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BarcodeResultScreenProps {
  queryType: 'barcode' | 'model';
  queryValue: string;
  onGoBack: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

export default function BarcodeResultScreen({
  queryType,
  queryValue,
  onGoBack,
  onTabChange,
  onLogout,
}: BarcodeResultScreenProps) {
  const { colors, isDark } = useTheme();
  const { user, logout, notificationCount } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('qrScan');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'connection' | 'notFound'>('connection');
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [productDistribution, setProductDistribution] = useState<ProductDistribution[]>([]);
  const [productionDistribution, setProductionDistribution] = useState<ProductionDistribution[]>([]);
  const [noMagazaModule, setNoMagazaModule] = useState(false);
  const [noKonfeksiyonModule, setNoKonfeksiyonModule] = useState(false);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDistributionItem, setSelectedDistributionItem] = useState<ProductDistribution | ProductionDistribution | null>(null);
  const [selectedDistributionType, setSelectedDistributionType] = useState<'store' | 'production'>('store');
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Filter states
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  // Search states
  const [distributionSearchText, setDistributionSearchText] = useState('');
  const [productionSearchText, setProductionSearchText] = useState('');
  const [isDistributionSearchVisible, setIsDistributionSearchVisible] = useState(false);
  const [isProductionSearchVisible, setIsProductionSearchVisible] = useState(false);

  const barcodePermissions = user?.barcodePermissions;

  const styles = createStyles(colors, isDark);

  const formatPrice = (price: string | undefined): string => {
    if (!price || price === '-') return '0.00';
    const num = parseFloat(price);
    if (isNaN(num)) return price;
    if (num % 1 === 0) {
      return num.toFixed(0);
    }
    return num.toFixed(2).replace(/\.?0+$/, '');
  };

  // Filter helpers
  const getFilterOptions = () => {
    const branches = [...new Set(productDistribution.map(item => item.branch))];
    const warehouses = [...new Set(productDistribution.map(item => item.warehouse))];
    const types = [...new Set(productDistribution.map(item => item.type))];
    const colors_list = [...new Set(productDistribution.map(item => item.color))];
    const sizes = [...new Set(productDistribution.map(item => item.size))];
    return { branches, warehouses, types, colors: colors_list, sizes };
  };

  const filterOptions = getFilterOptions();

  const filteredDistribution = productDistribution.filter(item => {
    if (selectedBranches.length > 0 && !selectedBranches.includes(item.branch)) return false;
    if (selectedWarehouses.length > 0 && !selectedWarehouses.includes(item.warehouse)) return false;
    if (selectedTypes.length > 0 && !selectedTypes.includes(item.type)) return false;
    if (selectedColors.length > 0 && !selectedColors.includes(item.color)) return false;
    if (selectedSizes.length > 0 && !selectedSizes.includes(item.size)) return false;
    if (distributionSearchText.trim()) {
      const searchLower = distributionSearchText.toLowerCase();
      const match = item.branch.toLowerCase().includes(searchLower) ||
        item.warehouse.toLowerCase().includes(searchLower) ||
        item.type.toLowerCase().includes(searchLower) ||
        item.color.toLowerCase().includes(searchLower) ||
        item.size.toLowerCase().includes(searchLower);
      if (!match) return false;
    }
    return true;
  });

  const filteredProductionDistribution = productionDistribution.filter(item => {
    if (productionSearchText.trim()) {
      const searchLower = productionSearchText.toLowerCase();
      const match = item.branchWarehouse.toLowerCase().includes(searchLower) ||
        item.type.toLowerCase().includes(searchLower) ||
        item.color.toLowerCase().includes(searchLower) ||
        item.size.toLowerCase().includes(searchLower);
      if (!match) return false;
    }
    return true;
  });

  const toggleFilter = (
    value: string,
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (selected.includes(value)) {
      setSelected(selected.filter(v => v !== value));
    } else {
      setSelected([...selected, value]);
    }
  };

  const clearFilters = () => {
    setSelectedBranches([]);
    setSelectedWarehouses([]);
    setSelectedTypes([]);
    setSelectedColors([]);
    setSelectedSizes([]);
  };

  const hasActiveFilters =
    selectedBranches.length > 0 ||
    selectedWarehouses.length > 0 ||
    selectedTypes.length > 0 ||
    selectedColors.length > 0 ||
    selectedSizes.length > 0;

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      if (onLogout) {
        onLogout();
      }
    } catch {}
  };

  // Fetch product data
  useEffect(() => {
    fetchProductData();
  }, [queryValue, queryType]);

  const fetchProductData = async () => {
    setIsLoading(true);
    setError(null);
    setErrorType('connection');

    try {
      const token = await authService.getToken();
      if (!token) {
        setErrorType('connection');
        setError('Oturum bilgisi bulunamadı.\nLütfen tekrar giriş yapın.');
        setIsLoading(false);
        return;
      }

      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) {
        setErrorType('connection');
        setError('Veritabanı bilgisi bulunamadı.');
        setIsLoading(false);
        return;
      }

      const data = await barcodeService.queryStock(token, dataName, queryType, queryValue);

      if (data.success && data.data) {
        const result = data.data;
        setProductImages(result.images || []);
        setProductInfo(result.product || null);
        setNoMagazaModule(result.noMagazaModule || false);
        setNoKonfeksiyonModule(result.noKonfeksiyonModule || false);

        // Magaza distribution
        if (result.noMagazaModule) {
          setProductDistribution([]);
        } else {
          const magazaDist = (result.magazaDistribution || []).map((item: any, index: number) => ({
            id: `dist-${index + 1}`,
            branch: item.branch || '-',
            warehouse: item.warehouse || '-',
            type: '-',
            color: item.color || '-',
            size: item.size || '-',
            quantity: item.quantity || 0,
            height: item.height || '-',
            outlet: item.outlet || '-',
          }));
          setProductDistribution(magazaDist);
        }

        // Konfeksiyon distribution
        if (result.noKonfeksiyonModule) {
          setProductionDistribution([]);
        } else {
          const stockData = (result.konfeksiyonDistribution || []).map((item: any, index: number) => ({
            ...item,
            id: `stock-${index + 1}`,
            branchWarehouse: item.warehouse || item.branchWarehouse || '-',
            status: 'stock' as const,
          }));
          const prodData = (result.productionDistribution || []).map((item: any, index: number) => ({
            ...item,
            id: `prod-${index + 1}`,
          }));
          setProductionDistribution([...stockData, ...prodData]);
        }

        if (!result.product) {
          setErrorType('notFound');
          setError(`${queryType === 'barcode' ? 'Barkod' : 'Model'}: ${queryValue}`);
        }
      } else {
        let errorMessage = 'Bilinmeyen hata';
        if (data.message) {
          errorMessage = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
        } else if (data.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.error.message) {
            errorMessage = data.error.message;
          } else {
            errorMessage = JSON.stringify(data.error);
          }
        }
        setErrorType('connection');
        setError(errorMessage);
      }
    } catch (err: any) {
      setErrorType('connection');
      setError(err.message || 'Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDistributionRowPress = (item: ProductDistribution) => {
    setSelectedDistributionItem(item);
    setSelectedDistributionType('store');
    setDetailModalVisible(true);
  };

  const handleProductionRowPress = (item: ProductionDistribution) => {
    setSelectedDistributionItem(item);
    setSelectedDistributionType('production');
    setDetailModalVisible(true);
  };

  // Image navigation
  const goToPreviousImage = () => {
    if (currentImageIndex > 0) setCurrentImageIndex(currentImageIndex - 1);
  };
  const goToNextImage = () => {
    if (currentImageIndex < productImages.length - 1) setCurrentImageIndex(currentImageIndex + 1);
  };
  const handleArrowPressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true }).start();
  };
  const handleArrowPressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const renderThumbnails = () => (
    <View style={styles.thumbnailContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailScroll}>
        {productImages.map((image, index) => (
          <Pressable
            key={image.id}
            style={[styles.thumbnail, index === currentImageIndex && styles.thumbnailActive]}
            onPress={() => setCurrentImageIndex(index)}
          >
            <Image source={{ uri: image.url }} style={styles.thumbnailImage} resizeMode="cover" />
            {index === currentImageIndex && (
              <View style={styles.thumbnailOverlay}>
                <Icon name="checkmark-circle" size={16} color="#FFFFFF" />
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  const renderFullScreenModal = () => (
    <Modal visible={fullScreenVisible} transparent animationType="fade" onRequestClose={() => setFullScreenVisible(false)}>
      <View style={styles.fullScreenContainer}>
        <Pressable style={styles.fullScreenCloseButton} onPress={() => setFullScreenVisible(false)}>
          <Icon name="close" size={28} color="#FFFFFF" />
        </Pressable>
        <View style={styles.fullScreenImageWrapper}>
          <View style={styles.fullScreenImageFrame}>
            <Image source={{ uri: productImages[currentImageIndex]?.url }} style={styles.fullScreenImage} resizeMode="cover" />
          </View>
        </View>
        <View style={styles.fullScreenNav}>
          <Pressable
            style={[styles.fullScreenArrow, currentImageIndex === 0 && styles.fullScreenArrowDisabled]}
            onPress={goToPreviousImage}
            disabled={currentImageIndex === 0}
          >
            <Icon name="chevron-back" size={32} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.fullScreenCounter}>{currentImageIndex + 1} / {productImages.length}</Text>
          <Pressable
            style={[styles.fullScreenArrow, currentImageIndex === productImages.length - 1 && styles.fullScreenArrowDisabled]}
            onPress={goToNextImage}
            disabled={currentImageIndex === productImages.length - 1}
          >
            <Icon name="chevron-forward" size={32} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  const InfoRow = ({ icon, label, value, isLast }: { icon: string; label: string; value: string; isLast?: boolean }) => (
    <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
      <View style={styles.infoRowLeft}>
        <Icon name={icon} size={18} color={colors.textSecondary} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <View style={styles.infoRowRight}>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  const renderFilterChips = (
    label: string,
    options: string[],
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>
  ) => (
    <View style={styles.filterRow}>
      <View style={styles.filterLabelRow}>
        <Text style={styles.filterLabel}>{label}</Text>
        {selected.length > 0 && <Text style={styles.filterCount}>({selected.length})</Text>}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptionsScroll}>
        <View style={styles.filterOptionsRow}>
          {options.map((option) => (
            <Pressable
              key={option}
              style={[styles.filterChip, selected.includes(option) && styles.filterChipActive]}
              onPress={() => toggleFilter(option, selected, setSelected)}
            >
              {selected.includes(option) && (
                <Icon name="checkmark" size={14} color={colors.primary} style={styles.filterChipIcon} />
              )}
              <Text style={[styles.filterChipText, selected.includes(option) && styles.filterChipTextActive]}>
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <Header title="Ürün Bilgisi" showMenu={true} onLogout={handleLogout} leftButton={<BackButton onPress={onGoBack} />} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Yükleniyor...</Text>
          </View>
          <TabBar activeTab={activeTab} onTabPress={handleTabPress} notificationCount={notificationCount} />
        </View>
      </SafeAreaProvider>
    );
  }

  // Error state
  if (error) {
    const isNotFound = errorType === 'notFound';
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <Header
            title={isNotFound ? 'Sonuç Yok' : 'Bağlantı Hatası'}
            showMenu={true}
            onLogout={handleLogout}
            leftButton={<BackButton onPress={onGoBack} />}
          />
          <View style={styles.errorCenterWrapper}>
            {isNotFound ? (
              <>
                {/* Not Found - Red Alert Style */}
                <View style={styles.connectionIconWrapper}>
                  <View style={styles.notFoundIconOuter}>
                    <View style={styles.notFoundIconInner}>
                      <Icon name="search-outline" size={40} color="#EF4444" />
                    </View>
                  </View>
                  <View style={styles.notFoundBadge}>
                    <Icon name="close" size={16} color="#FFFFFF" />
                  </View>
                  <View style={styles.connectionPulse1} />
                  <View style={styles.connectionPulse2} />
                </View>
                <Text style={styles.connectionTitle}>Ürün Bulunamadı</Text>
                <Text style={styles.connectionSubtitle}>
                  Aradığınız ürün sistemde kayıtlı değil veya farklı bir sorgu deneyebilirsiniz.
                </Text>
                <View style={styles.notFoundQueryCard}>
                  <Icon
                    name={queryType === 'barcode' ? 'barcode-outline' : 'shirt-outline'}
                    size={20}
                    color={isDark ? '#F87171' : '#DC2626'}
                  />
                  <Text style={styles.notFoundQueryText}>{error}</Text>
                </View>
                <Pressable style={styles.errorPrimaryButton} onPress={onGoBack}>
                  <Icon name="arrow-back" size={20} color="#FFFFFF" />
                  <Text style={styles.errorPrimaryButtonText}>Yeni Sorgu Yap</Text>
                </Pressable>
                <Pressable style={styles.errorSecondaryButton} onPress={fetchProductData}>
                  <Icon name="refresh" size={18} color={colors.primary} />
                  <Text style={styles.errorSecondaryButtonText}>Tekrar Dene</Text>
                </Pressable>
              </>
            ) : (
              <>
                {/* Connection Error - Modern Illustration */}
                <View style={styles.connectionIconWrapper}>
                  <View style={styles.connectionIconOuter}>
                    <View style={styles.connectionIconInner}>
                      <Icon name="cloud-offline-outline" size={40} color="#EF4444" />
                    </View>
                  </View>
                  <View style={styles.connectionPulse1} />
                  <View style={styles.connectionPulse2} />
                </View>
                <Text style={styles.connectionTitle}>Bağlantı Hatası</Text>
                <Text style={styles.connectionSubtitle}>
                  Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edip tekrar deneyin.
                </Text>
                <View style={styles.connectionErrorCard}>
                  <Icon name="code-slash-outline" size={16} color={isDark ? '#F87171' : '#DC2626'} />
                  <Text style={styles.connectionErrorText} numberOfLines={3}>{error}</Text>
                </View>
                <Pressable style={styles.errorPrimaryButton} onPress={fetchProductData}>
                  <Icon name="refresh" size={20} color="#FFFFFF" />
                  <Text style={styles.errorPrimaryButtonText}>Tekrar Dene</Text>
                </Pressable>
                <Pressable style={styles.errorSecondaryButton} onPress={onGoBack}>
                  <Icon name="arrow-back" size={18} color={colors.primary} />
                  <Text style={styles.errorSecondaryButtonText}>Geri Dön</Text>
                </Pressable>
              </>
            )}
          </View>
          <TabBar activeTab={activeTab} onTabPress={handleTabPress} notificationCount={notificationCount} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header title="Ürün Bilgisi" showMenu={true} onLogout={handleLogout} leftButton={<BackButton onPress={onGoBack} />} />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Image Gallery */}
          {productImages.length > 0 ? (
            <View style={styles.galleryWrapper}>
              <View style={styles.galleryContainer}>
                {/* Left Arrow */}
                <Pressable
                  onPress={goToPreviousImage}
                  onPressIn={handleArrowPressIn}
                  onPressOut={handleArrowPressOut}
                  disabled={currentImageIndex === 0}
                  style={styles.arrowButtonWrapper}
                >
                  <Animated.View style={[styles.galleryArrow, currentImageIndex === 0 && styles.galleryArrowDisabled, { transform: [{ scale: scaleAnim }] }]}>
                    <LinearGradient
                      colors={currentImageIndex === 0
                        ? [isDark ? '#2D3748' : '#E2E8F0', isDark ? '#1A202C' : '#CBD5E1']
                        : [isDark ? '#2B7FFF' : '#60A5FA', isDark ? '#1D4ED8' : '#2B7FFF']}
                      style={styles.arrowGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Icon name="chevron-back" size={22} color={currentImageIndex === 0 ? (isDark ? '#4A5568' : '#94A3B8') : '#FFFFFF'} />
                    </LinearGradient>
                  </Animated.View>
                </Pressable>

                {/* Image */}
                <Pressable style={styles.galleryImageContainer} onPress={() => setFullScreenVisible(true)}>
                  <Image source={{ uri: productImages[currentImageIndex]?.url }} style={styles.galleryImage} resizeMode="cover" />
                  <View style={styles.zoomHint}>
                    <Icon name="expand-outline" size={16} color="#FFFFFF" />
                  </View>
                  <View style={styles.imageCounter}>
                    <Icon name="images-outline" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.imageCounterText}>{currentImageIndex + 1}/{productImages.length}</Text>
                  </View>
                </Pressable>

                {/* Right Arrow */}
                <Pressable
                  onPress={goToNextImage}
                  onPressIn={handleArrowPressIn}
                  onPressOut={handleArrowPressOut}
                  disabled={currentImageIndex === productImages.length - 1}
                  style={styles.arrowButtonWrapper}
                >
                  <Animated.View style={[styles.galleryArrow, currentImageIndex === productImages.length - 1 && styles.galleryArrowDisabled, { transform: [{ scale: scaleAnim }] }]}>
                    <LinearGradient
                      colors={currentImageIndex === productImages.length - 1
                        ? [isDark ? '#2D3748' : '#E2E8F0', isDark ? '#1A202C' : '#CBD5E1']
                        : [isDark ? '#2B7FFF' : '#60A5FA', isDark ? '#1D4ED8' : '#2B7FFF']}
                      style={styles.arrowGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Icon name="chevron-forward" size={22} color={currentImageIndex === productImages.length - 1 ? (isDark ? '#4A5568' : '#94A3B8') : '#FFFFFF'} />
                    </LinearGradient>
                  </Animated.View>
                </Pressable>
              </View>

              {productImages.length > 1 && renderThumbnails()}
            </View>
          ) : (
            <View style={styles.noImageContainer}>
              <View style={styles.noImageIconWrapper}>
                <Icon name="image-outline" size={48} color={colors.textTertiary} />
              </View>
              <Text style={styles.noImageText}>Ürün görseli bulunamadı</Text>
            </View>
          )}

          {/* Full Screen Modal */}
          {renderFullScreenModal()}

          {/* Filter Section */}
          <Pressable style={styles.filterSection} onPress={() => setIsFilterExpanded(!isFilterExpanded)}>
            <View style={styles.filterLeft}>
              <Icon name="options-outline" size={20} color={colors.text} />
              <Text style={styles.filterText}>Filtrele</Text>
            </View>
            <Icon name={isFilterExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
          </Pressable>

          {isFilterExpanded && (
            <View style={styles.filterContent}>
              {renderFilterChips('Şube', filterOptions.branches, selectedBranches, setSelectedBranches)}
              {renderFilterChips('Depo', filterOptions.warehouses, selectedWarehouses, setSelectedWarehouses)}
              {renderFilterChips('Tip', filterOptions.types, selectedTypes, setSelectedTypes)}
              {renderFilterChips('Renk', filterOptions.colors, selectedColors, setSelectedColors)}
              {renderFilterChips('Beden', filterOptions.sizes, selectedSizes, setSelectedSizes)}
              {hasActiveFilters && (
                <Pressable style={styles.clearFiltersButton} onPress={clearFilters}>
                  <Icon name="close-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.clearFiltersText}>Filtreleri Temizle</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Product Info Section */}
          {productInfo && (
            <View style={styles.infoSection}>
              <View style={styles.infoHeader}>
                <View style={styles.infoHeaderLeft}>
                  <Icon name="information-circle" size={22} color={colors.textSecondary} />
                  <Text style={styles.infoHeaderText}>Ürün Detayları</Text>
                </View>
              </View>
              <View style={styles.infoContent}>
                {queryType === 'barcode' && (
                  <InfoRow icon="barcode-outline" label="Barkod" value={queryValue} />
                )}
                <InfoRow icon="shirt-outline" label="Model" value={productInfo.model || '-'} isLast={queryType === 'model'} />
                {queryType === 'barcode' && (
                  <>
                    <InfoRow icon="accessibility-outline" label="Beden" value={productInfo.size || '-'} />
                    <InfoRow icon="color-palette-outline" label="Renk" value={productInfo.color || '-'} />
                    <InfoRow icon="business-outline" label="Şube" value={productInfo.branch || '-'} />
                    <InfoRow
                      icon="archive-outline"
                      label="Depo"
                      value={productInfo.warehouse || '-'}
                      isLast={barcodePermissions?.manufacturer === false && barcodePermissions?.year === false && barcodePermissions?.info === false}
                    />
                    {barcodePermissions?.manufacturer !== false && (
                      <InfoRow
                        icon="construct-outline"
                        label="Üretici"
                        value={productInfo.manufacturer || '-'}
                        isLast={barcodePermissions?.year === false && barcodePermissions?.info === false}
                      />
                    )}
                    {barcodePermissions?.year !== false && (
                      <InfoRow
                        icon="calendar-outline"
                        label="Yıl"
                        value={productInfo.year || '-'}
                        isLast={barcodePermissions?.info === false}
                      />
                    )}
                    {barcodePermissions?.info !== false && (
                      <InfoRow icon="document-text-outline" label="Bilgi" value={productInfo.info || '-'} isLast={true} />
                    )}
                  </>
                )}
              </View>
            </View>
          )}

          {/* Price Info Section */}
          {productInfo && (
            <View style={styles.priceSection}>
              <View style={styles.infoHeader}>
                <View style={styles.infoHeaderLeft}>
                  <Icon name="cash-outline" size={22} color={colors.textSecondary} />
                  <Text style={styles.infoHeaderText}>Fiyat Bilgisi</Text>
                </View>
              </View>
              <View style={styles.priceCardsContainer}>
                <View style={[styles.priceCard, styles.priceCardEntry]}>
                  <View style={styles.priceCardIcon}>
                    <Icon name="enter-outline" size={28} color={isDark ? '#94A3B8' : '#64748B'} />
                  </View>
                  <Text style={styles.priceCardTitle}>Giriş</Text>
                  <Text style={[styles.priceCardValue, barcodePermissions?.entryPrice === false && styles.priceCardUnauthorized]}>
                    {barcodePermissions?.entryPrice === false ? 'Yetkisiz' : formatPrice(productInfo.entryPrice)}
                  </Text>
                  {barcodePermissions?.entryPrice !== false && (
                    <Text style={styles.priceCardCurrency}>{productInfo.entryCostCurrency || productInfo.currency || 'TRY'}</Text>
                  )}
                </View>
                <View style={[styles.priceCard, styles.priceCardCost]}>
                  <View style={styles.priceCardIcon}>
                    <Icon name="calculator-outline" size={28} color={isDark ? '#F87171' : '#EF4444'} />
                  </View>
                  <Text style={styles.priceCardTitle}>Maliyet</Text>
                  <Text style={[styles.priceCardValue, barcodePermissions?.costPrice === false && styles.priceCardUnauthorized]}>
                    {barcodePermissions?.costPrice === false ? 'Yetkisiz' : formatPrice(productInfo.costPrice)}
                  </Text>
                  {barcodePermissions?.costPrice !== false && (
                    <Text style={styles.priceCardCurrency}>{productInfo.entryCostCurrency || productInfo.currency || 'TRY'}</Text>
                  )}
                </View>
                <View style={[styles.priceCard, styles.priceCardLabelBg]}>
                  <View style={styles.priceCardIcon}>
                    <Icon name="pricetag-outline" size={28} color={isDark ? '#4ADE80' : '#22C55E'} />
                  </View>
                  <Text style={styles.priceCardTitle}>Etiket</Text>
                  <Text style={[styles.priceCardValue, barcodePermissions?.labelPrice === false && styles.priceCardUnauthorized]}>
                    {barcodePermissions?.labelPrice === false ? 'Yetkisiz' : formatPrice(productInfo.labelPrice)}
                  </Text>
                  {barcodePermissions?.labelPrice !== false && (
                    <Text style={styles.priceCardCurrency}>{productInfo.labelCurrency || productInfo.currency || 'TRY'}</Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Distribution Table - Magaza */}
          <View style={styles.distributionSection}>
            <View style={styles.infoHeader}>
              <View style={styles.infoHeaderLeft}>
                <Icon name="storefront-outline" size={22} color={colors.textSecondary} />
                <Text style={styles.infoHeaderText}>Mağaza Dağılımı</Text>
              </View>
              <Pressable onPress={() => setIsDistributionSearchVisible(!isDistributionSearchVisible)} style={styles.searchToggleButton}>
                <Icon name={isDistributionSearchVisible ? 'close' : 'search'} size={20} color={colors.text} />
              </Pressable>
            </View>
            {isDistributionSearchVisible && (
              <View style={styles.searchContainer}>
                <SearchInput value={distributionSearchText} onChangeText={setDistributionSearchText} placeholder="Ara..." />
              </View>
            )}
            <View style={styles.tableHeader}>
              <View style={styles.tableCellDetail} />
              <Text style={[styles.tableHeaderCell, styles.tableCellBranch]}>Şube</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellWarehouse]}>Depo</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellType]}>Tip</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellColor]}>Renk</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellSize]}>Beden</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellQuantity]}>Adet</Text>
            </View>
            {noMagazaModule ? (
              <View style={styles.emptyTableRow}>
                <Icon name="storefront" size={32} color={colors.purple} />
                <Text style={styles.emptyTableText}>Mağaza modülünüz bulunmuyor</Text>
              </View>
            ) : filteredDistribution.length > 0 ? (
              filteredDistribution.map((item, index) => (
                <Pressable
                  key={item.id}
                  style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}
                  onPress={() => handleDistributionRowPress(item)}
                >
                  <View style={styles.tableCellDetail}>
                    <Icon name="chevron-forward-circle-outline" size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.tableCell, styles.tableCellBranch]} numberOfLines={1}>{item.branch}</Text>
                  <Text style={[styles.tableCell, styles.tableCellWarehouse]} numberOfLines={1}>{item.warehouse}</Text>
                  <Text style={[styles.tableCell, styles.tableCellType]} numberOfLines={1}>{item.type}</Text>
                  <Text style={[styles.tableCell, styles.tableCellColor]} numberOfLines={1}>{item.color}</Text>
                  <Text style={[styles.tableCell, styles.tableCellSize]}>{item.size}</Text>
                  <View style={[styles.tableCellQuantity, styles.quantityBadgeContainer]}>
                    <View style={styles.quantityBadge}>
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                    </View>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyTableRow}>
                <Icon name="file-tray-outline" size={32} color={colors.textTertiary} />
                <Text style={styles.emptyTableText}>Dağılım verisi bulunamadı</Text>
              </View>
            )}
          </View>

          {/* Production Distribution Table - Konfeksiyon */}
          <View style={styles.distributionSection}>
            <View style={styles.infoHeader}>
              <View style={styles.infoHeaderLeft}>
                <Icon name="cut-outline" size={22} color={colors.textSecondary} />
                <Text style={styles.infoHeaderText}>Üretim Dağılımı</Text>
              </View>
              <Pressable onPress={() => setIsProductionSearchVisible(!isProductionSearchVisible)} style={styles.searchToggleButton}>
                <Icon name={isProductionSearchVisible ? 'close' : 'search'} size={20} color={colors.text} />
              </Pressable>
            </View>
            {isProductionSearchVisible && (
              <View style={styles.searchContainer}>
                <SearchInput value={productionSearchText} onChangeText={setProductionSearchText} placeholder="Ara..." />
              </View>
            )}
            <View style={styles.tableHeader}>
              <View style={styles.tableCellDetail} />
              <Text style={[styles.tableHeaderCell, styles.tableCellBranch]}>Konum</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellType]}>Tip</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellColor]}>Renk</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellSize]}>Beden</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellQuantity]}>Adet</Text>
            </View>
            {noKonfeksiyonModule ? (
              <View style={styles.emptyTableRow}>
                <Icon name="shirt" size={32} color={colors.info} />
                <Text style={styles.emptyTableText}>Konfeksiyon modülünüz bulunmuyor</Text>
              </View>
            ) : filteredProductionDistribution.length > 0 ? (
              filteredProductionDistribution.map((item, index) => (
                <Pressable
                  key={item.id}
                  style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}
                  onPress={() => handleProductionRowPress(item)}
                >
                  <View style={styles.tableCellDetail}>
                    <Icon
                      name={item.status === 'stock' ? 'cube-outline' : 'sync-outline'}
                      size={18}
                      color={item.status === 'stock' ? colors.green : colors.orange}
                    />
                  </View>
                  <Text style={[styles.tableCell, styles.tableCellBranch]} numberOfLines={1}>{item.branchWarehouse}</Text>
                  <Text style={[styles.tableCell, styles.tableCellType]} numberOfLines={1}>{item.type}</Text>
                  <Text style={[styles.tableCell, styles.tableCellColor]} numberOfLines={1}>{item.color}</Text>
                  <Text style={[styles.tableCell, styles.tableCellSize]}>{item.size}</Text>
                  <View style={[styles.tableCellQuantity, styles.quantityBadgeContainer]}>
                    <View style={[styles.quantityBadge, item.status === 'process' && styles.quantityBadgeProcess]}>
                      <Text style={[styles.quantityText, item.status === 'process' && styles.quantityTextProcess]}>{item.quantity}</Text>
                    </View>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyTableRow}>
                <Icon name="file-tray-outline" size={32} color={colors.textTertiary} />
                <Text style={styles.emptyTableText}>Dağılım verisi bulunamadı</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Detail Modal */}
        <Modal visible={detailModalVisible} transparent animationType="slide" onRequestClose={() => setDetailModalVisible(false)}>
          <Pressable style={styles.detailModalOverlay} onPress={() => setDetailModalVisible(false)}>
            <Pressable style={styles.detailModalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.detailModalHandleContainer}>
                <View style={styles.detailModalHandle} />
              </View>
              <View style={styles.detailModalHeader}>
                <View style={styles.detailModalHeaderLeft}>
                  <View style={styles.detailModalTitleRow}>
                    <Icon name="grid-outline" size={20} color={colors.primary} />
                    <Text style={styles.detailModalTitle}>Detay</Text>
                  </View>
                  {selectedDistributionItem && selectedDistributionType === 'production' && (
                    <View style={[
                      styles.detailStatusBadge,
                      (selectedDistributionItem as ProductionDistribution).status === 'stock'
                        ? styles.detailStatusBadgeStock
                        : styles.detailStatusBadgeProcess
                    ]}>
                      <Icon
                        name={(selectedDistributionItem as ProductionDistribution).status === 'stock' ? 'cube' : 'sync'}
                        size={12}
                        color={(selectedDistributionItem as ProductionDistribution).status === 'stock' ? colors.green : colors.orange}
                      />
                      <Text style={[
                        styles.detailStatusText,
                        (selectedDistributionItem as ProductionDistribution).status === 'stock'
                          ? styles.detailStatusTextStock
                          : styles.detailStatusTextProcess
                      ]}>
                        {(selectedDistributionItem as ProductionDistribution).status === 'stock' ? 'Stokta' : 'Proseste'}
                      </Text>
                    </View>
                  )}
                </View>
                {selectedDistributionItem && (
                  <View style={[
                    styles.detailBigQuantityBadge,
                    selectedDistributionType === 'production' && (selectedDistributionItem as ProductionDistribution).status === 'process' && styles.detailBigQuantityBadgeProcess
                  ]}>
                    <Text style={[
                      styles.detailBigQuantityText,
                      selectedDistributionType === 'production' && (selectedDistributionItem as ProductionDistribution).status === 'process' && styles.detailBigQuantityTextProcess
                    ]}>{selectedDistributionItem.quantity}</Text>
                    <Text style={styles.detailBigQuantityLabel}>Adet</Text>
                  </View>
                )}
              </View>
              {selectedDistributionItem && (
                <View style={styles.detailModalBody}>
                  <View style={styles.detailCardsGrid}>
                    {selectedDistributionType === 'production' ? (
                      <View style={styles.detailCard}>
                        <Icon name="location-outline" size={18} color={colors.primary} />
                        <Text style={styles.detailCardLabel}>Konum</Text>
                        <Text style={styles.detailCardValue} numberOfLines={2}>
                          {(selectedDistributionItem as ProductionDistribution).branchWarehouse || '-'}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.detailCard}>
                          <Icon name="business-outline" size={18} color={colors.primary} />
                          <Text style={styles.detailCardLabel}>Şube</Text>
                          <Text style={styles.detailCardValue} numberOfLines={2}>
                            {(selectedDistributionItem as ProductDistribution).branch || '-'}
                          </Text>
                        </View>
                        <View style={styles.detailCard}>
                          <Icon name="archive-outline" size={18} color={colors.primary} />
                          <Text style={styles.detailCardLabel}>Depo</Text>
                          <Text style={styles.detailCardValue} numberOfLines={2}>
                            {(selectedDistributionItem as ProductDistribution).warehouse || '-'}
                          </Text>
                        </View>
                      </>
                    )}
                    <View style={styles.detailCard}>
                      <Icon name="pricetag-outline" size={18} color={colors.primary} />
                      <Text style={styles.detailCardLabel}>Tip</Text>
                      <Text style={styles.detailCardValue} numberOfLines={2}>{selectedDistributionItem.type || '-'}</Text>
                    </View>
                    <View style={styles.detailCard}>
                      <Icon name="color-palette-outline" size={18} color={colors.primary} />
                      <Text style={styles.detailCardLabel}>Renk</Text>
                      <Text style={styles.detailCardValue} numberOfLines={2}>{selectedDistributionItem.color || '-'}</Text>
                    </View>
                    <View style={styles.detailCard}>
                      <Icon name="resize-outline" size={18} color={colors.primary} />
                      <Text style={styles.detailCardLabel}>Beden</Text>
                      <Text style={styles.detailCardValue} numberOfLines={2}>{selectedDistributionItem.size || '-'}</Text>
                    </View>
                  </View>
                </View>
              )}
              <Pressable style={styles.detailModalCloseButton} onPress={() => setDetailModalVisible(false)}>
                <Icon name="close-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.detailModalCloseButtonText}>Kapat</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        <TabBar activeTab={activeTab} onTabPress={handleTabPress} notificationCount={notificationCount} />
      </View>
    </SafeAreaProvider>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.card,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: colors.textSecondary,
    },
    // Error styles - shared
    errorCenterWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    errorPrimaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 16,
      gap: 10,
      width: '100%',
      maxWidth: 300,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    errorPrimaryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    errorSecondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 14,
      gap: 8,
      marginTop: 12,
    },
    errorSecondaryButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    },
    // Not Found styles
    notFoundIconWrapper: {
      position: 'relative',
      marginBottom: 28,
    },
    notFoundIconOuter: {
      width: 100,
      height: 100,
      borderRadius: 32,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FECACA',
    },
    notFoundIconInner: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    notFoundBadge: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.card,
    },
    notFoundQueryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2',
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FECACA',
      marginBottom: 28,
      width: '100%',
      maxWidth: 300,
    },
    notFoundQueryText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#F87171' : '#DC2626',
      flex: 1,
    },
    // Connection Error styles
    connectionIconWrapper: {
      position: 'relative',
      marginBottom: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    connectionIconOuter: {
      width: 100,
      height: 100,
      borderRadius: 32,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FECACA',
      zIndex: 2,
    },
    connectionIconInner: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    connectionPulse1: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: 36,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.06)',
      zIndex: 1,
    },
    connectionPulse2: {
      position: 'absolute',
      width: 140,
      height: 140,
      borderRadius: 42,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.03)' : 'rgba(239, 68, 68, 0.03)',
      zIndex: 0,
    },
    connectionTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: '#EF4444',
      marginBottom: 10,
      textAlign: 'center',
    },
    connectionSubtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
      maxWidth: 280,
    },
    connectionErrorCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FFF5F5',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FECACA',
      marginBottom: 28,
      width: '100%',
      maxWidth: 300,
    },
    connectionErrorText: {
      fontSize: 13,
      lineHeight: 18,
      color: isDark ? '#FCA5A5' : '#DC2626',
      flex: 1,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    // Content
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: Platform.OS === 'ios' ? 120 : 100,
    },
    // Gallery
    galleryWrapper: {
      marginTop: 16,
      marginHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    galleryContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    arrowButtonWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    galleryArrow: {
      width: 40,
      height: 40,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#2B7FFF',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    },
    arrowGradient: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    galleryArrowDisabled: {
      shadowOpacity: 0,
      elevation: 0,
    },
    galleryImageContainer: {
      flex: 1,
      height: 320,
      backgroundColor: isDark ? '#1A1A2E' : '#F8FAFC',
      borderRadius: 16,
      overflow: 'hidden',
      position: 'relative',
    },
    galleryImage: {
      width: '100%',
      height: '100%',
    },
    zoomHint: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    imageCounter: {
      position: 'absolute',
      bottom: 12,
      left: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
    },
    imageCounterText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    // Thumbnails
    thumbnailContainer: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    thumbnailScroll: {
      paddingHorizontal: 4,
      gap: 8,
    },
    thumbnail: {
      width: 56,
      height: 72,
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
      opacity: 0.6,
    },
    thumbnailActive: {
      borderColor: colors.primary,
      opacity: 1,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    thumbnailImage: {
      width: '100%',
      height: '100%',
    },
    thumbnailOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(99, 102, 241, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Full Screen Modal
    fullScreenContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullScreenCloseButton: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 50 : 30,
      right: 20,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    fullScreenImageWrapper: {
      flex: 1,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 100 : 80,
    },
    fullScreenImageFrame: {
      width: '100%',
      height: '85%',
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: '#000',
    },
    fullScreenImage: {
      width: '100%',
      height: '100%',
    },
    fullScreenNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: Platform.OS === 'ios' ? 50 : 30,
      gap: 40,
    },
    fullScreenArrow: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullScreenArrowDisabled: {
      opacity: 0.3,
    },
    fullScreenCounter: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    // No Image
    noImageContainer: {
      marginTop: 16,
      marginHorizontal: 16,
      height: 220,
      backgroundColor: colors.card,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      padding: 24,
    },
    noImageIconWrapper: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    noImageText: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    // Filter Section
    filterSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,
      marginHorizontal: 16,
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    filterText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    filterContent: {
      marginHorizontal: 16,
      marginTop: 8,
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterRow: {
      marginBottom: 16,
    },
    filterLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 6,
    },
    filterLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
    },
    filterCount: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    filterOptionsScroll: {
      flexGrow: 0,
    },
    filterOptionsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
    },
    filterChipIcon: {
      marginRight: 4,
    },
    filterChipActive: {
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#EEF2FF',
      borderColor: colors.primary,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    clearFiltersButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 8,
      paddingVertical: 10,
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : '#F8FAFC',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#E2E8F0',
    },
    clearFiltersText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    // Info Section
    infoSection: {
      marginTop: 16,
      marginHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    infoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: isDark ? 'transparent' : '#FFFFFF',
    },
    infoHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    infoHeaderText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    searchToggleButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
    },
    infoContent: {
      padding: 16,
      gap: 0,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoRowLast: {
      borderBottomWidth: 0,
    },
    infoRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    infoLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    infoRowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    // Price Section
    priceSection: {
      marginTop: 16,
      marginHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    priceCardsContainer: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
    },
    priceCard: {
      flex: 1,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    priceCardEntry: {
      backgroundColor: isDark ? 'rgba(100, 116, 139, 0.2)' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(100, 116, 139, 0.3)' : '#E2E8F0',
    },
    priceCardCost: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
    },
    priceCardLabelBg: {
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#F0FDF4',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : '#BBF7D0',
    },
    priceCardIcon: {
      marginBottom: 8,
    },
    priceCardTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    priceCardValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    priceCardCurrency: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textTertiary,
      marginTop: 2,
    },
    priceCardUnauthorized: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#F87171' : '#DC2626',
    },
    // Distribution Table
    distributionSection: {
      marginTop: 16,
      marginHorizontal: 16,
      backgroundColor: isDark ? colors.card : '#F1F5F9',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E5E7EB',
      overflow: 'hidden',
    },
    searchContainer: {
      marginHorizontal: 12,
      marginTop: 12,
      marginBottom: 6,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tableHeaderCell: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: 'center',
    },
    tableRowEven: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#FAFAFA',
    },
    tableCell: {
      fontSize: 13,
      color: colors.text,
    },
    tableCellDetail: {
      width: 26,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    tableCellBranch: {
      flex: 1.1,
      paddingRight: 4,
    },
    tableCellWarehouse: {
      flex: 1.1,
      paddingRight: 4,
    },
    tableCellType: {
      flex: 0.9,
      paddingRight: 4,
    },
    tableCellColor: {
      flex: 0.9,
      paddingRight: 4,
    },
    tableCellSize: {
      flex: 0.75,
      textAlign: 'center',
    },
    tableCellQuantity: {
      flex: 0.75,
      alignItems: 'center',
      textAlign: 'center',
    },
    quantityBadgeContainer: {
      justifyContent: 'center',
    },
    quantityBadge: {
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      minWidth: 36,
      alignItems: 'center',
    },
    quantityText: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#4ADE80' : '#16A34A',
    },
    quantityBadgeProcess: {
      backgroundColor: isDark ? 'rgba(251, 146, 60, 0.2)' : '#FFF7ED',
    },
    quantityTextProcess: {
      color: isDark ? '#FB923C' : '#EA580C',
    },
    emptyTableRow: {
      padding: 32,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: isDark ? 'transparent' : '#FFFFFF',
    },
    emptyTableText: {
      fontSize: 14,
      color: colors.textTertiary,
    },
    // Detail Modal
    detailModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    detailModalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    },
    detailModalHandleContainer: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    detailModalHandle: {
      width: 40,
      height: 4,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.3)' : '#CBD5E1',
      borderRadius: 2,
    },
    detailModalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    detailModalHeaderLeft: {
      flex: 1,
    },
    detailModalTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    detailModalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    detailStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
      alignSelf: 'flex-start',
    },
    detailStatusBadgeStock: {
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7',
    },
    detailStatusBadgeProcess: {
      backgroundColor: isDark ? 'rgba(251, 146, 60, 0.15)' : '#FFF7ED',
    },
    detailStatusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    detailStatusTextStock: {
      color: isDark ? '#4ADE80' : '#16A34A',
    },
    detailStatusTextProcess: {
      color: isDark ? '#FB923C' : '#EA580C',
    },
    detailBigQuantityBadge: {
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 16,
      alignItems: 'center',
      minWidth: 70,
    },
    detailBigQuantityBadgeProcess: {
      backgroundColor: isDark ? 'rgba(251, 146, 60, 0.15)' : '#FFF7ED',
    },
    detailBigQuantityText: {
      fontSize: 28,
      fontWeight: '800',
      color: isDark ? '#4ADE80' : '#16A34A',
    },
    detailBigQuantityTextProcess: {
      color: isDark ? '#FB923C' : '#EA580C',
    },
    detailBigQuantityLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textSecondary,
      marginTop: 2,
    },
    detailModalBody: {
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    detailCardsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    detailCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    detailCardLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 8,
      marginBottom: 4,
    },
    detailCardValue: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    detailModalCloseButton: {
      marginHorizontal: 20,
      marginTop: 8,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailModalCloseButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
