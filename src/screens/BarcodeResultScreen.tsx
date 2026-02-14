import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  StatusBar,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import { useAuth } from '../contexts/AuthContext';
import ImageUploadModal, { ImageUploadResult } from '../components/ImageUploadModal';

// ─── Types ──────────────────────────────────────────────

interface ProductImage {
  id: string;
  url: string;
}

interface ProductInfo {
  barcode: string;
  model: string;
  size: string;
  color: string;
  branch: string;
  warehouse: string;
  manufacturer: string;
  year: string;
  info: string;
  entryPrice: string;
  costPrice: string;
  labelPrice: string;
  entryCostCurrency?: string;
  labelCurrency?: string;
}

interface ProductDistribution {
  id: string;
  branch: string;
  warehouse: string;
  type: string;
  color: string;
  size: string;
  quantity: number;
}

interface ProductionDistribution {
  id: string;
  branchWarehouse: string;
  type: string;
  color: string;
  size: string;
  quantity: number;
  status: 'stock' | 'process';
}

// ─── Mock Data ──────────────────────────────────────────

const MOCK_PRODUCT_INFO: ProductInfo = {
  barcode: '869456789012',
  model: 'GK-2024-PRO',
  size: '42',
  color: 'Siyah',
  branch: 'Merkez',
  warehouse: 'Ana Depo',
  manufacturer: 'Golaks Üretim',
  year: '2024',
  info: 'Premium kalite, ithal kumaş',
  entryPrice: '245.50',
  costPrice: '189.90',
  labelPrice: '499.90',
  entryCostCurrency: 'TRY',
  labelCurrency: 'TRY',
};

const MOCK_DISTRIBUTION: ProductDistribution[] = [
  { id: '1', branch: 'Merkez', warehouse: 'Ana Depo', type: 'Normal', color: 'Siyah', size: '40', quantity: 12 },
  { id: '2', branch: 'Merkez', warehouse: 'Ana Depo', type: 'Normal', color: 'Siyah', size: '42', quantity: 8 },
  { id: '3', branch: 'Kadıköy', warehouse: 'Mağaza', type: 'Normal', color: 'Siyah', size: '42', quantity: 5 },
  { id: '4', branch: 'Kadıköy', warehouse: 'Mağaza', type: 'İade', color: 'Lacivert', size: '44', quantity: 2 },
  { id: '5', branch: 'Bakırköy', warehouse: 'Depo', type: 'Normal', color: 'Beyaz', size: '38', quantity: 15 },
  { id: '6', branch: 'Ankara', warehouse: 'Showroom', type: 'Normal', color: 'Siyah', size: '40', quantity: 3 },
];

const MOCK_IMAGES: ProductImage[] = [
  { id: '1', url: 'https://picsum.photos/seed/golaks1/400/600' },
  { id: '2', url: 'https://picsum.photos/seed/golaks2/400/600' },
  { id: '3', url: 'https://picsum.photos/seed/golaks3/400/600' },
];

const MOCK_PRODUCTION: ProductionDistribution[] = [
  { id: '1', branchWarehouse: 'Üretim Merkezi', type: 'Kesim', color: 'Siyah', size: '42', quantity: 50, status: 'process' },
  { id: '2', branchWarehouse: 'Üretim Merkezi', type: 'Dikim', color: 'Siyah', size: '40', quantity: 30, status: 'process' },
  { id: '3', branchWarehouse: 'Kalite Kontrol', type: 'Kontrol', color: 'Lacivert', size: '44', quantity: 20, status: 'stock' },
  { id: '4', branchWarehouse: 'Paketleme', type: 'Paket', color: 'Beyaz', size: '38', quantity: 45, status: 'stock' },
];

// ─── Props ──────────────────────────────────────────────

interface BarcodeResultScreenProps {
  barcode: string;
  queryType: 'barcode' | 'model';
  onGoBack: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

// ─── InfoRow Component ──────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  isLast,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  isLast?: boolean;
  colors: any;
}) {
  return (
    <View style={[infoRowStyles.row, isLast && infoRowStyles.rowLast, { borderBottomColor: colors.border }]}>
      <View style={infoRowStyles.left}>
        <Icon name={icon} size={16} color={colors.textSecondary} />
        <Text style={[infoRowStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[infoRowStyles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const infoRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
});

// ─── Main Component ─────────────────────────────────────

export default function BarcodeResultScreen({
  barcode,
  queryType,
  onGoBack,
  onTabChange,
  onLogout,
}: BarcodeResultScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('qrScan');

  // Image gallery
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);

  // Filters
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  // Upload modal
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  // Detail modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ProductDistribution | ProductionDistribution | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<'store' | 'production'>('store');

  // Mock data
  const productInfo = MOCK_PRODUCT_INFO;
  const productDistribution = MOCK_DISTRIBUTION;
  const productionDistribution = MOCK_PRODUCTION;

  const productImages = MOCK_IMAGES;

  const styles = createStyles(colors, isDark);

  const formatPrice = (price: string | undefined): string => {
    if (!price || price === '-') return '0.00';
    const num = parseFloat(price);
    if (isNaN(num)) return price;
    if (num % 1 === 0) return num.toFixed(0);
    return num.toFixed(2).replace(/\.?0+$/, '');
  };

  // Filter options from distribution data
  const filterOptions = {
    branches: [...new Set(productDistribution.map(d => d.branch))],
    types: [...new Set(productDistribution.map(d => d.type))],
    colors: [...new Set(productDistribution.map(d => d.color))],
    sizes: [...new Set(productDistribution.map(d => d.size))],
  };

  const hasActiveFilters = selectedBranches.length > 0 || selectedTypes.length > 0 || selectedColors.length > 0 || selectedSizes.length > 0;

  const toggleFilter = (value: string, selected: string[], setSelected: (v: string[]) => void) => {
    if (selected.includes(value)) {
      setSelected(selected.filter(s => s !== value));
    } else {
      setSelected([...selected, value]);
    }
  };

  const clearFilters = () => {
    setSelectedBranches([]);
    setSelectedTypes([]);
    setSelectedColors([]);
    setSelectedSizes([]);
  };

  // Filtered distributions
  const filteredDistribution = productDistribution.filter(item => {
    if (selectedBranches.length > 0 && !selectedBranches.includes(item.branch)) return false;
    if (selectedTypes.length > 0 && !selectedTypes.includes(item.type)) return false;
    if (selectedColors.length > 0 && !selectedColors.includes(item.color)) return false;
    if (selectedSizes.length > 0 && !selectedSizes.includes(item.size)) return false;
    return true;
  });

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const handleDistributionRowPress = (item: ProductDistribution) => {
    setSelectedItem(item);
    setSelectedItemType('store');
    setDetailModalVisible(true);
  };

  const handleProductionRowPress = (item: ProductionDistribution) => {
    setSelectedItem(item);
    setSelectedItemType('production');
    setDetailModalVisible(true);
  };

  const handleImageSelected = (result: ImageUploadResult) => {
    // TODO: API'ye bağlandığında gerçek upload yapılacak
    // Mock: seçilen görselleri listeye ekle
    const newImages = result.assets.map((asset, index) => ({
      id: `upload-${Date.now()}-${index}`,
      url: asset.uri || '',
    }));
    // Şimdilik console log - API bağlantısında kullanılacak
  };

  const handleLogout = async () => {
    try {
      await logout();
      if (onLogout) onLogout();
    } catch (e) {}
  };

  // ─── Filter Chip Renderer ──────────────────────────

  const renderFilterRow = (
    label: string,
    options: string[],
    selected: string[],
    setSelected: (v: string[]) => void,
  ) => (
    <View style={styles.filterRow}>
      <View style={styles.filterLabelRow}>
        <Text style={styles.filterLabel}>{label}</Text>
        {selected.length > 0 && (
          <Text style={styles.filterCount}>({selected.length})</Text>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filterOptionsRow}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              style={[styles.filterChip, selected.includes(opt) && styles.filterChipActive]}
              onPress={() => toggleFilter(opt, selected, setSelected)}
            >
              {selected.includes(opt) && (
                <Icon name="checkmark" size={14} color={colors.primary} style={{ marginRight: 4 }} />
              )}
              <Text style={[styles.filterChipText, selected.includes(opt) && styles.filterChipTextActive]}>
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title="Ürün Bilgisi"
          showBackButton
          onBackPress={onGoBack}
          showLogo={false}
          rightButton={
            <Pressable
              onPress={() => setUploadModalVisible(true)}
              style={styles.headerUploadButton}
            >
              <Icon name="camera-outline" size={22} color={colors.text} />
            </Pressable>
          }
        />

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Image Gallery */}
          {productImages.length > 0 ? (
            <View style={styles.galleryWrapper}>
              <View style={styles.galleryContainer}>
                {/* Left Arrow */}
                <Pressable
                  onPress={() => setCurrentImageIndex(i => Math.max(0, i - 1))}
                  disabled={currentImageIndex === 0}
                  style={styles.arrowButton}
                >
                  <View style={[
                    styles.arrowCircle,
                    { backgroundColor: currentImageIndex === 0 ? colors.border : colors.primary },
                  ]}>
                    <Icon
                      name="chevron-back"
                      size={20}
                      color={currentImageIndex === 0 ? colors.textSecondary : '#FFFFFF'}
                    />
                  </View>
                </Pressable>

                {/* Image */}
                <Pressable
                  style={styles.galleryImageContainer}
                  onPress={() => setFullScreenVisible(true)}
                >
                  <Image
                    source={{ uri: productImages[currentImageIndex]?.url }}
                    style={styles.galleryImage}
                    resizeMode="cover"
                  />
                  {/* Zoom hint */}
                  <View style={styles.zoomHint}>
                    <Icon name="expand-outline" size={14} color="#FFFFFF" />
                  </View>
                  {/* Counter badge */}
                  <View style={styles.imageCounter}>
                    <Icon name="images-outline" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.imageCounterText}>
                      {currentImageIndex + 1}/{productImages.length}
                    </Text>
                  </View>
                </Pressable>

                {/* Right Arrow */}
                <Pressable
                  onPress={() => setCurrentImageIndex(i => Math.min(productImages.length - 1, i + 1))}
                  disabled={currentImageIndex === productImages.length - 1}
                  style={styles.arrowButton}
                >
                  <View style={[
                    styles.arrowCircle,
                    { backgroundColor: currentImageIndex === productImages.length - 1 ? colors.border : colors.primary },
                  ]}>
                    <Icon
                      name="chevron-forward"
                      size={20}
                      color={currentImageIndex === productImages.length - 1 ? colors.textSecondary : '#FFFFFF'}
                    />
                  </View>
                </Pressable>
              </View>

              {/* Thumbnails */}
              {productImages.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.thumbnailRow}
                  style={styles.thumbnailContainer}
                >
                  {productImages.map((img, idx) => (
                    <Pressable
                      key={img.id}
                      onPress={() => setCurrentImageIndex(idx)}
                      style={[
                        styles.thumbnail,
                        currentImageIndex === idx && styles.thumbnailActive,
                      ]}
                    >
                      <Image source={{ uri: img.url }} style={styles.thumbnailImage} resizeMode="cover" />
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : (
            <View style={styles.noImageContainer}>
              <View style={styles.noImageIconWrapper}>
                <Icon name="image-outline" size={48} color={colors.textSecondary} />
              </View>
              <Text style={styles.noImageText}>Ürün görseli bulunamadı</Text>
              <Pressable
                style={styles.uploadImageButton}
                onPress={() => setUploadModalVisible(true)}
              >
                <Icon name="cloud-upload-outline" size={16} color={colors.primary} />
                <Text style={styles.uploadImageButtonText}>Görsel Yükle</Text>
              </Pressable>
            </View>
          )}

          {/* Filter Section */}
          <Pressable
            style={styles.filterSection}
            onPress={() => setIsFilterExpanded(!isFilterExpanded)}
          >
            <View style={styles.filterLeft}>
              <Icon name="options-outline" size={20} color={colors.text} />
              <Text style={styles.filterText}>Filtrele</Text>
            </View>
            <Icon
              name={isFilterExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>

          {isFilterExpanded && (
            <View style={styles.filterContent}>
              {renderFilterRow('Şube', filterOptions.branches, selectedBranches, setSelectedBranches)}
              {renderFilterRow('Tip', filterOptions.types, selectedTypes, setSelectedTypes)}
              {renderFilterRow('Renk', filterOptions.colors, selectedColors, setSelectedColors)}
              {renderFilterRow('Beden', filterOptions.sizes, selectedSizes, setSelectedSizes)}
              {hasActiveFilters && (
                <Pressable style={styles.clearFiltersButton} onPress={clearFilters}>
                  <Icon name="close-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.clearFiltersText}>Filtreleri Temizle</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Product Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Icon name="information-circle" size={22} color={colors.textSecondary} />
                <Text style={styles.sectionHeaderText}>Ürün Detayları</Text>
              </View>
            </View>
            <View style={styles.infoContent}>
              {queryType === 'barcode' && (
                <InfoRow icon="barcode-outline" label="Barkod" value={barcode} colors={colors} />
              )}
              <InfoRow icon="shirt-outline" label="Model" value={productInfo.model} colors={colors} />
              {queryType === 'barcode' && (
                <>
                  <InfoRow icon="accessibility-outline" label="Beden" value={productInfo.size} colors={colors} />
                  <InfoRow icon="color-palette-outline" label="Renk" value={productInfo.color} colors={colors} />
                  <InfoRow icon="business-outline" label="Şube" value={productInfo.branch} colors={colors} />
                  <InfoRow icon="archive-outline" label="Depo" value={productInfo.warehouse} colors={colors} />
                  <InfoRow icon="construct-outline" label="Üretici" value={productInfo.manufacturer} colors={colors} />
                  <InfoRow icon="calendar-outline" label="Yıl" value={productInfo.year} colors={colors} />
                  <InfoRow icon="document-text-outline" label="Bilgi" value={productInfo.info} isLast colors={colors} />
                </>
              )}
              {queryType === 'model' && (
                <InfoRow icon="shirt-outline" label="Model" value={productInfo.model} isLast colors={colors} />
              )}
            </View>
          </View>

          {/* Price Section */}
          <View style={styles.priceSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Icon name="cash-outline" size={22} color={colors.textSecondary} />
                <Text style={styles.sectionHeaderText}>Fiyat Bilgisi</Text>
              </View>
            </View>
            <View style={styles.priceCardsContainer}>
              {/* Entry Price */}
              <View style={[styles.priceCard, styles.priceCardEntry]}>
                <View style={styles.priceCardIcon}>
                  <Icon name="enter-outline" size={24} color={isDark ? '#94A3B8' : '#64748B'} />
                </View>
                <Text style={styles.priceCardTitle}>Giriş</Text>
                <Text style={styles.priceCardValue}>{formatPrice(productInfo.entryPrice)}</Text>
                <Text style={styles.priceCardCurrency}>{productInfo.entryCostCurrency || 'TRY'}</Text>
              </View>

              {/* Cost Price */}
              <View style={[styles.priceCard, styles.priceCardCost]}>
                <View style={styles.priceCardIcon}>
                  <Icon name="calculator-outline" size={24} color={isDark ? '#F87171' : '#EF4444'} />
                </View>
                <Text style={styles.priceCardTitle}>Maliyet</Text>
                <Text style={styles.priceCardValue}>{formatPrice(productInfo.costPrice)}</Text>
                <Text style={styles.priceCardCurrency}>{productInfo.entryCostCurrency || 'TRY'}</Text>
              </View>

              {/* Label Price */}
              <View style={[styles.priceCard, styles.priceCardLabel]}>
                <View style={styles.priceCardIcon}>
                  <Icon name="pricetag-outline" size={24} color={isDark ? '#4ADE80' : '#22C55E'} />
                </View>
                <Text style={styles.priceCardTitle}>Etiket</Text>
                <Text style={styles.priceCardValue}>{formatPrice(productInfo.labelPrice)}</Text>
                <Text style={styles.priceCardCurrency}>{productInfo.labelCurrency || 'TRY'}</Text>
              </View>
            </View>
          </View>

          {/* Store Distribution Table */}
          <View style={styles.distributionSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Icon name="storefront-outline" size={22} color={colors.textSecondary} />
                <Text style={styles.sectionHeaderText}>Mağaza Dağılımı</Text>
              </View>
              <View style={styles.totalBadge}>
                <Text style={styles.totalBadgeText}>
                  {filteredDistribution.reduce((sum, d) => sum + d.quantity, 0)}
                </Text>
              </View>
            </View>

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.cellBranch]}>Şube</Text>
              <Text style={[styles.tableHeaderCell, styles.cellWarehouse]}>Depo</Text>
              <Text style={[styles.tableHeaderCell, styles.cellType]}>Tip</Text>
              <Text style={[styles.tableHeaderCell, styles.cellColor]}>Renk</Text>
              <Text style={[styles.tableHeaderCell, styles.cellSize]}>Bdn</Text>
              <Text style={[styles.tableHeaderCell, styles.cellQty]}>Adet</Text>
            </View>

            {/* Table Rows */}
            {filteredDistribution.length > 0 ? (
              filteredDistribution.map((item, index) => (
                <Pressable
                  key={item.id}
                  style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}
                  onPress={() => handleDistributionRowPress(item)}
                >
                  <Text style={[styles.tableCell, styles.cellBranch]} numberOfLines={1}>{item.branch}</Text>
                  <Text style={[styles.tableCell, styles.cellWarehouse]} numberOfLines={1}>{item.warehouse}</Text>
                  <Text style={[styles.tableCell, styles.cellType]} numberOfLines={1}>{item.type}</Text>
                  <Text style={[styles.tableCell, styles.cellColor]} numberOfLines={1}>{item.color}</Text>
                  <Text style={[styles.tableCell, styles.cellSize]}>{item.size}</Text>
                  <View style={styles.cellQty}>
                    <View style={styles.quantityBadge}>
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                    </View>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyTableRow}>
                <Icon name="file-tray-outline" size={32} color={colors.textSecondary} />
                <Text style={styles.emptyTableText}>Dağılım bulunamadı</Text>
              </View>
            )}
          </View>

          {/* Production Distribution Table */}
          <View style={styles.distributionSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Icon name="cut-outline" size={22} color={colors.textSecondary} />
                <Text style={styles.sectionHeaderText}>Üretim Dağılımı</Text>
              </View>
              <View style={styles.totalBadge}>
                <Text style={styles.totalBadgeText}>
                  {productionDistribution.reduce((sum, d) => sum + d.quantity, 0)}
                </Text>
              </View>
            </View>

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <View style={styles.cellIcon} />
              <Text style={[styles.tableHeaderCell, styles.cellLocation]}>Konum</Text>
              <Text style={[styles.tableHeaderCell, styles.cellType]}>Tip</Text>
              <Text style={[styles.tableHeaderCell, styles.cellColor]}>Renk</Text>
              <Text style={[styles.tableHeaderCell, styles.cellSize]}>Bdn</Text>
              <Text style={[styles.tableHeaderCell, styles.cellQty]}>Adet</Text>
            </View>

            {/* Table Rows */}
            {productionDistribution.length > 0 ? (
              productionDistribution.map((item, index) => (
                <Pressable
                  key={item.id}
                  style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}
                  onPress={() => handleProductionRowPress(item)}
                >
                  <View style={styles.cellIcon}>
                    <Icon
                      name={item.status === 'stock' ? 'cube-outline' : 'sync-outline'}
                      size={16}
                      color={item.status === 'stock' ? '#22C55E' : '#F59E0B'}
                    />
                  </View>
                  <Text style={[styles.tableCell, styles.cellLocation]} numberOfLines={1}>{item.branchWarehouse}</Text>
                  <Text style={[styles.tableCell, styles.cellType]} numberOfLines={1}>{item.type}</Text>
                  <Text style={[styles.tableCell, styles.cellColor]} numberOfLines={1}>{item.color}</Text>
                  <Text style={[styles.tableCell, styles.cellSize]}>{item.size}</Text>
                  <View style={styles.cellQty}>
                    <View style={[
                      styles.quantityBadge,
                      item.status === 'process' && styles.quantityBadgeProcess,
                    ]}>
                      <Text style={[
                        styles.quantityText,
                        item.status === 'process' && styles.quantityTextProcess,
                      ]}>{item.quantity}</Text>
                    </View>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyTableRow}>
                <Icon name="file-tray-outline" size={32} color={colors.textSecondary} />
                <Text style={styles.emptyTableText}>Üretim dağılımı bulunamadı</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Full Screen Image Modal */}
        <Modal
          visible={fullScreenVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setFullScreenVisible(false)}
        >
          <View style={styles.fullScreenContainer}>
            {/* Close Button */}
            <Pressable
              style={styles.fullScreenCloseButton}
              onPress={() => setFullScreenVisible(false)}
            >
              <Icon name="close" size={24} color="#FFFFFF" />
            </Pressable>

            {/* Image */}
            <View style={styles.fullScreenImageWrapper}>
              <View style={styles.fullScreenImageFrame}>
                {productImages.length > 0 && (
                  <Image
                    source={{ uri: productImages[currentImageIndex]?.url }}
                    style={styles.fullScreenImage}
                    resizeMode="contain"
                  />
                )}
              </View>
            </View>

            {/* Navigation */}
            <View style={styles.fullScreenNav}>
              <Pressable
                style={[styles.fullScreenArrow, currentImageIndex === 0 && styles.fullScreenArrowDisabled]}
                onPress={() => setCurrentImageIndex(i => Math.max(0, i - 1))}
                disabled={currentImageIndex === 0}
              >
                <Icon name="chevron-back" size={28} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.fullScreenCounter}>
                {currentImageIndex + 1} / {productImages.length}
              </Text>
              <Pressable
                style={[styles.fullScreenArrow, currentImageIndex === productImages.length - 1 && styles.fullScreenArrowDisabled]}
                onPress={() => setCurrentImageIndex(i => Math.min(productImages.length - 1, i + 1))}
                disabled={currentImageIndex === productImages.length - 1}
              >
                <Icon name="chevron-forward" size={28} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Detail Modal */}
        <Modal
          visible={detailModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setDetailModalVisible(false)}
        >
          <Pressable
            style={styles.detailOverlay}
            onPress={() => setDetailModalVisible(false)}
          >
            <Pressable style={styles.detailContent} onPress={(e) => e.stopPropagation()}>
              {/* Handle */}
              <View style={styles.detailHandleContainer}>
                <View style={styles.detailHandle} />
              </View>

              {/* Header */}
              <View style={styles.detailHeader}>
                <View style={styles.detailTitleRow}>
                  <Icon name="grid-outline" size={20} color={colors.primary} />
                  <Text style={styles.detailTitle}>Detay</Text>
                  {selectedItemType === 'production' && selectedItem && (
                    <View style={[
                      styles.detailStatusBadge,
                      (selectedItem as ProductionDistribution).status === 'stock'
                        ? styles.statusBadgeStock
                        : styles.statusBadgeProcess,
                    ]}>
                      <Icon
                        name={(selectedItem as ProductionDistribution).status === 'stock' ? 'cube' : 'sync'}
                        size={12}
                        color={(selectedItem as ProductionDistribution).status === 'stock' ? '#22C55E' : '#F59E0B'}
                      />
                      <Text style={[
                        styles.detailStatusText,
                        (selectedItem as ProductionDistribution).status === 'stock'
                          ? { color: '#22C55E' }
                          : { color: '#F59E0B' },
                      ]}>
                        {(selectedItem as ProductionDistribution).status === 'stock' ? 'Stokta' : 'Proseste'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Big Quantity Badge */}
                {selectedItem && (
                  <View style={[
                    styles.detailBigQtyBadge,
                    selectedItemType === 'production' && (selectedItem as ProductionDistribution).status === 'process' && styles.detailBigQtyProcess,
                  ]}>
                    <Text style={[
                      styles.detailBigQtyText,
                      selectedItemType === 'production' && (selectedItem as ProductionDistribution).status === 'process' && { color: '#F59E0B' },
                    ]}>{selectedItem.quantity}</Text>
                    <Text style={styles.detailBigQtyLabel}>Adet</Text>
                  </View>
                )}
              </View>

              {/* Detail Cards */}
              {selectedItem && (
                <View style={styles.detailCardsGrid}>
                  {selectedItemType === 'production' ? (
                    <View style={styles.detailCard}>
                      <Icon name="location-outline" size={18} color={colors.primary} />
                      <Text style={styles.detailCardLabel}>Konum</Text>
                      <Text style={styles.detailCardValue} numberOfLines={2}>
                        {(selectedItem as ProductionDistribution).branchWarehouse}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.detailCard}>
                        <Icon name="business-outline" size={18} color={colors.primary} />
                        <Text style={styles.detailCardLabel}>Şube</Text>
                        <Text style={styles.detailCardValue} numberOfLines={2}>
                          {(selectedItem as ProductDistribution).branch}
                        </Text>
                      </View>
                      <View style={styles.detailCard}>
                        <Icon name="archive-outline" size={18} color={colors.primary} />
                        <Text style={styles.detailCardLabel}>Depo</Text>
                        <Text style={styles.detailCardValue} numberOfLines={2}>
                          {(selectedItem as ProductDistribution).warehouse}
                        </Text>
                      </View>
                    </>
                  )}
                  <View style={styles.detailCard}>
                    <Icon name="pricetag-outline" size={18} color={colors.primary} />
                    <Text style={styles.detailCardLabel}>Tip</Text>
                    <Text style={styles.detailCardValue}>{selectedItem.type}</Text>
                  </View>
                  <View style={styles.detailCard}>
                    <Icon name="color-palette-outline" size={18} color={colors.primary} />
                    <Text style={styles.detailCardLabel}>Renk</Text>
                    <Text style={styles.detailCardValue}>{selectedItem.color}</Text>
                  </View>
                  <View style={styles.detailCard}>
                    <Icon name="resize-outline" size={18} color={colors.primary} />
                    <Text style={styles.detailCardLabel}>Beden</Text>
                    <Text style={styles.detailCardValue}>{selectedItem.size}</Text>
                  </View>
                </View>
              )}

              {/* Close Button */}
              <Pressable
                style={styles.detailCloseButton}
                onPress={() => setDetailModalVisible(false)}
              >
                <Icon name="close-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.detailCloseText}>Kapat</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Image Upload Modal */}
        <ImageUploadModal
          visible={uploadModalVisible}
          onClose={() => setUploadModalVisible(false)}
          onImageSelected={handleImageSelected}
          model={productInfo?.model}
          availableColors={filterOptions.colors}
        />

        {/* Bottom TabBar */}
        <TabBar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          notificationCount={notificationCount}
        />
      </View>
    </SafeAreaProvider>
  );
}

// ─── Styles ─────────────────────────────────────────────

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 120,
    },
    headerUploadButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
      borderRadius: 12,
    },

    // Image Gallery
    galleryWrapper: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    galleryContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    arrowButton: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    arrowCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    galleryImageContainer: {
      flex: 1,
      height: 300,
      backgroundColor: isDark ? '#1A1A2E' : '#F8FAFC',
      borderRadius: 14,
      overflow: 'hidden',
    },
    galleryImage: {
      width: '100%',
      height: '100%',
    },
    zoomHint: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    imageCounter: {
      position: 'absolute',
      bottom: 10,
      left: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    imageCounterText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    thumbnailContainer: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    thumbnailRow: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
    },
    thumbnail: {
      width: 52,
      height: 68,
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
      opacity: 0.5,
    },
    thumbnailActive: {
      borderColor: colors.primary,
      opacity: 1,
    },
    thumbnailImage: {
      width: '100%',
      height: '100%',
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
      top: Platform.OS === 'ios' ? 54 : 30,
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
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 100 : 80,
    },
    fullScreenImageFrame: {
      width: '100%',
      height: '85%',
      borderRadius: 20,
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
      gap: 36,
    },
    fullScreenArrow: {
      width: 48,
      height: 48,
      borderRadius: 24,
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
      height: 180,
      backgroundColor: colors.card,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      marginBottom: 12,
    },
    noImageIconWrapper: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    noImageText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 12,
    },
    uploadImageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
    },
    uploadImageButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },

    // Filter Section
    filterSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    filterLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    filterText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    filterContent: {
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    filterRow: {
      marginBottom: 14,
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
      marginTop: 4,
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
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    sectionHeaderText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    infoContent: {
      padding: 16,
    },

    // Price Section
    priceSection: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 12,
    },
    priceCardsContainer: {
      flexDirection: 'row',
      padding: 12,
      gap: 8,
    },
    priceCard: {
      flex: 1,
      borderRadius: 12,
      padding: 12,
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
    priceCardLabel: {
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#F0FDF4',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : '#BBF7D0',
    },
    priceCardIcon: {
      marginBottom: 6,
    },
    priceCardTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    priceCardValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    priceCardCurrency: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textSecondary,
      marginTop: 2,
    },

    // Distribution Section
    distributionSection: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 12,
    },
    totalBadge: {
      backgroundColor: colors.primary + '15',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    totalBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },

    // Table
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
      paddingVertical: 10,
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
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border + '60',
    },
    tableRowEven: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
    },
    tableCell: {
      fontSize: 13,
      color: colors.text,
    },

    // Table cell widths
    cellIcon: {
      width: 24,
      alignItems: 'center',
    },
    cellBranch: {
      flex: 2,
      marginRight: 4,
    },
    cellWarehouse: {
      flex: 2,
      marginRight: 4,
    },
    cellLocation: {
      flex: 3,
      marginRight: 4,
    },
    cellType: {
      flex: 1.5,
      marginRight: 4,
    },
    cellColor: {
      flex: 1.5,
      marginRight: 4,
    },
    cellSize: {
      width: 32,
      textAlign: 'center',
    },
    cellQty: {
      width: 44,
      alignItems: 'center',
    },
    quantityBadge: {
      backgroundColor: colors.primary + '15',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      minWidth: 32,
      alignItems: 'center',
    },
    quantityBadgeProcess: {
      backgroundColor: '#F59E0B20',
    },
    quantityText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    quantityTextProcess: {
      color: '#F59E0B',
    },
    emptyTableRow: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
      gap: 8,
    },
    emptyTableText: {
      fontSize: 14,
      color: colors.textSecondary,
    },

    // Detail Modal
    detailOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    detailContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    detailHandleContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    detailHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    detailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    detailTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    detailTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    detailStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 8,
    },
    statusBadgeStock: {
      backgroundColor: '#22C55E15',
    },
    statusBadgeProcess: {
      backgroundColor: '#F59E0B15',
    },
    detailStatusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    detailBigQtyBadge: {
      backgroundColor: colors.primary + '15',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 16,
      alignItems: 'center',
    },
    detailBigQtyProcess: {
      backgroundColor: '#F59E0B15',
    },
    detailBigQtyText: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.primary,
    },
    detailBigQtyLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    detailCardsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 20,
    },
    detailCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
      borderRadius: 12,
      padding: 14,
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    detailCardLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    detailCardValue: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    detailCloseButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
    },
    detailCloseText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
