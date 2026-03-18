import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable, Image, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import BackButton from '../components/BackButton';
import SearchButton from '../components/SearchButton';
import AddButton from '../components/AddButton';
import SearchInput from '../components/SearchInput';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ModelImageModal from '../components/ModelImageModal';
import BottomSheet, { BottomSheetToastRef } from '../components/BottomSheet';
import TanimSelectInput from '../components/TanimSelectInput';
import BedenSetSelect from '../components/BedenSetSelect';
import SelectInput from '../components/SelectInput';
import modelService, { ModelKart, ModelColor } from '../services/model.service';
import { authService } from '../services/auth.service';
import ordersService, { DetailBedenSetItem } from '../services/orders.service';
import { useFieldErrors } from '../hooks/useFieldErrors';

interface ModelOperationsScreenProps {
  onBack?: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

export default function ModelOperationsScreen({ onBack, onTabChange, onLogout }: ModelOperationsScreenProps) {
  const { colors, isDark } = useTheme();
  const { user, logout, notificationCount } = useAuth();
  const { showError, showSuccess, showInfo } = useAlert();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [modelList, setModelList] = useState<ModelKart[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [expandedModelId, setExpandedModelId] = useState<number | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [selectedModelIdForUpload, setSelectedModelIdForUpload] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [colorList, setColorList] = useState<ModelColor[]>([]);
  const [colorsLoading, setColorsLoading] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<{ uri: string; fileName: string; type: string }[]>([]);

  // Form states
  const [formVisible, setFormVisible] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [formEditingId, setFormEditingId] = useState<number | null>(null);
  const [formAnaModelId, setFormAnaModelId] = useState('');
  const [formModelAdi, setFormModelAdi] = useState('');
  const [formBarkodTipi, setFormBarkodTipi] = useState('tekil');
  const [formModelTipiId, setFormModelTipiId] = useState('');
  const [formCinsiyetId, setFormCinsiyetId] = useState('');
  const [formSezonId, setFormSezonId] = useState('');
  const [formTarzId, setFormTarzId] = useState('');
  const [formBoy, setFormBoy] = useState('');
  const [formMarka, setFormMarka] = useState('');
  const [formModelist, setFormModelist] = useState('');
  const [formTasarimci, setFormTasarimci] = useState('');
  const [formBedenSetleriId, setFormBedenSetleriId] = useState('');
  const [formBazBeden, setFormBazBeden] = useState('');
  const [formSetParca, setFormSetParca] = useState('');
  const [formSetIcerik, setFormSetIcerik] = useState('');
  const [formAciklama, setFormAciklama] = useState('');
  const formFieldErrors = useFieldErrors();
  const [bedenSetleri, setBedenSetleri] = useState<DetailBedenSetItem[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(false);
  const formToastRef = useRef<BottomSheetToastRef | null>(null);

  const styles = createStyles(colors, isDark);

  const loadColors = async () => {
    try {
      setColorsLoading(true);
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || 'golaks_demo';
      const response = await modelService.getColors(token, dataName);
      if (response.success) {
        setColorList(response.data.data);
      }
    } catch (err: any) {
    } finally {
      setColorsLoading(false);
    }
  };

  const loadModelList = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = await authService.getToken();
      if (!token) {
        throw new Error('Token bulunamadı');
      }

      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || 'golaks_demo';

      const response = await modelService.getModelList(token, dataName, searchQuery);

      if (response.success) {
        setModelList(response.data.data);
      } else {
        throw new Error(response.message || 'Model listesi alınamadı');
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadModelList();
  }, [searchQuery]);

  useEffect(() => {
    loadColors();
  }, []);

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
    } catch (error) {
    }
  };

  const handleToggleSearch = () => {
    setSearchVisible(!searchVisible);
    if (searchVisible) {
      setSearchQuery('');
    }
  };

  const handleModelToggle = (modelId: number) => {
    setExpandedModelId(expandedModelId === modelId ? null : modelId);
  };

  const getBarkodTipiBadge = (tip: string) => {
    switch (tip) {
      case 'tekil': return { label: 'Tekil', color: '#3B82F6', icon: 'barcode-outline' };
      case 'seri': return { label: 'Seri', color: '#F59E0B', icon: 'layers-outline' };
      case 'cogul': return { label: 'Çoğul', color: '#8B5CF6', icon: 'copy-outline' };
      default: return { label: tip, color: '#6B7280', icon: 'qr-code-outline' };
    }
  };

  const handleImageButtonPress = (modelId: number) => {
    setSelectedModelIdForUpload(modelId);
    setShowImagePicker(true);
  };

  const handleCamera = () => {
    launchCamera({ mediaType: 'photo', quality: 0.6, maxWidth: 1200, maxHeight: 1200 }, (response) => {
      if (response.didCancel || response.errorCode) return;
      const asset = response.assets?.[0];
      if (asset?.uri) {
        setPendingPhotos(prev => [...prev, {
          uri: asset.uri!,
          fileName: asset.fileName || 'photo.jpg',
          type: asset.type || 'image/jpeg',
        }]);
      }
    });
  };

  const handleGallery = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.6, maxWidth: 1200, maxHeight: 1200, selectionLimit: 0 }, (response) => {
      if (response.didCancel || response.errorCode) return;
      const assets = response.assets || [];
      const newPhotos = assets
        .filter(a => a.uri)
        .map(a => ({
          uri: a.uri!,
          fileName: a.fileName || 'photo.jpg',
          type: a.type || 'image/jpeg',
        }));
      if (newPhotos.length > 0) {
        setPendingPhotos(prev => [...prev, ...newPhotos]);
      }
    });
  };

  const handleRemovePending = (index: number) => {
    setPendingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadAll = async (colorId?: number) => {
    if (!selectedModelIdForUpload || pendingPhotos.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const token = await authService.getToken();
      if (!token) throw new Error('Token bulunamadı');
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || 'golaks_demo';

      for (const photo of pendingPhotos) {
        try {
          await modelService.uploadModelImage(token, selectedModelIdForUpload, dataName, photo.uri, photo.fileName, photo.type, colorId);
          successCount++;
        } catch {
          failCount++;
        }
      }
    } catch (err: any) {
      showError(err.message || 'Yükleme başarısız');
      setIsUploading(false);
      return;
    }

    setPendingPhotos([]);
    setIsUploading(false);
    loadModelList();

    if (failCount === 0) {
      showSuccess(`${successCount} resim başarıyla yüklendi`);
    } else {
      showInfo(`${successCount} resim yüklendi, ${failCount} resim yüklenemedi`);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    try {
      const token = await authService.getToken();
      if (!token) throw new Error('Token bulunamadı');
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || 'golaks_demo';
      await modelService.deleteModelImage(token, dataName, imageId);
      loadModelList();
    } catch (err: any) {
      showError(err.message || 'Resim silinemedi');
    }
  };

  const resetForm = () => {
    setFormEditingId(null);
    setFormAnaModelId('');
    setFormModelAdi('');
    setFormBarkodTipi('tekil');
    setFormModelTipiId('');
    setFormCinsiyetId('');
    setFormSezonId('');
    setFormTarzId('');
    setFormBoy('');
    setFormMarka('');
    setFormModelist('');
    setFormTasarimci('');
    setFormBedenSetleriId('');
    setFormBazBeden('');
    setFormSetParca('');
    setFormSetIcerik('');
    setFormAciklama('');
    formFieldErrors.clearAll();
  };

  const fetchBedenSetleri = async () => {
    try {
      setLookupsLoading(true);
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || 'golaks_demo';
      const res = await ordersService.getDetailLookups(token, dataName);
      if (res.success && res.data) {
        setBedenSetleri(res.data.bedenSetleri);
      }
    } catch {
    } finally {
      setLookupsLoading(false);
    }
  };

  const handleOpenCreateForm = () => {
    resetForm();
    setFormVisible(true);
    if (bedenSetleri.length === 0) {
      fetchBedenSetleri();
    }
  };

  const handleEditModel = (model: ModelKart) => {
    setFormEditingId(model.id);
    setFormAnaModelId(model.anaModelId ? String(model.anaModelId) : '');
    setFormModelAdi(model.modelAdi);
    setFormBarkodTipi(model.barkodTipi);
    setFormModelTipiId(model.modelTipiId ? String(model.modelTipiId) : '');
    setFormCinsiyetId(model.cinsiyetId ? String(model.cinsiyetId) : '');
    setFormSezonId(model.sezonId ? String(model.sezonId) : '');
    setFormTarzId(model.tarzId ? String(model.tarzId) : '');
    setFormBoy(model.boy || '');
    setFormMarka(model.marka || '');
    setFormModelist(model.modelist || '');
    setFormTasarimci(model.tasarimci || '');
    setFormBedenSetleriId(model.bedenSetleriId ? String(model.bedenSetleriId) : '');
    setFormBazBeden(model.bazBeden || '');
    setFormSetParca(model.setParca ? String(model.setParca) : '');
    setFormSetIcerik(model.setIcerik || '');
    setFormAciklama(model.aciklama || '');
    formFieldErrors.clearAll();
    setFormVisible(true);
    if (bedenSetleri.length === 0) {
      fetchBedenSetleri();
    }
  };

  const handleSaveModel = async () => {
    if (!formFieldErrors.validateRequired({
      modelAdi: formModelAdi.trim(),
      anaModelId: formAnaModelId,
      barkodTipi: formBarkodTipi,
    })) return;

    try {
      setFormSaving(true);
      const token = await authService.getToken();
      if (!token) throw new Error('Token bulunamadı');
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || 'golaks_demo';

      const modelData = {
        modelAdi: formModelAdi.trim(),
        barkodTipi: formBarkodTipi,
        anaModelId: parseInt(formAnaModelId, 10),
        modelTipiId: formModelTipiId ? parseInt(formModelTipiId, 10) : undefined,
        cinsiyetId: formCinsiyetId ? parseInt(formCinsiyetId, 10) : undefined,
        sezonId: formSezonId ? parseInt(formSezonId, 10) : undefined,
        tarzId: formTarzId ? parseInt(formTarzId, 10) : undefined,
        marka: formMarka.trim() || undefined,
        modelist: formModelist.trim() || undefined,
        tasarimci: formTasarimci.trim() || undefined,
        boy: formBoy.trim() || undefined,
        bedenSetleriId: formBedenSetleriId ? parseInt(formBedenSetleriId, 10) : undefined,
        bazBeden: formBazBeden || undefined,
        setParca: formSetParca ? parseInt(formSetParca, 10) : undefined,
        setIcerik: formSetIcerik.trim() || undefined,
        aciklama: formAciklama.trim() || undefined,
      };

      const res = formEditingId
        ? await modelService.updateModel(token, dataName, { id: formEditingId, ...modelData })
        : await modelService.createModel(token, dataName, modelData);

      if (res.success) {
        setFormVisible(false);
        showSuccess(formEditingId ? 'Model kartı başarıyla güncellendi' : 'Model kartı başarıyla oluşturuldu');
        loadModelList();
      } else {
        formToastRef.current?.show({ type: 'error', message: res.message || 'İşlem başarısız' });
      }
    } catch (err: any) {
      formToastRef.current?.show({ type: 'error', message: err.message || 'İşlem başarısız' });
    } finally {
      setFormSaving(false);
    }
  };

  // Seçili beden setinin bedenleri
  const selectedBedenSet = bedenSetleri.find(b => b.id.toString() === formBedenSetleriId);
  const bazBedenItems = selectedBedenSet
    ? selectedBedenSet.bedenler.map(b => ({ id: b, label: b }))
    : [];

  const renderModelCard = (model: ModelKart) => {
    const isExpanded = expandedModelId === model.id;
    const badge = getBarkodTipiBadge(model.barkodTipi);

    // Kapalı halde gösterilecek chip'ler
    const chips: { label: string; color: string; icon: string }[] = [];
    if (model.sezon) chips.push({ label: model.sezon, icon: 'sunny-outline', color: '#F59E0B' });
    if (model.cinsiyet) chips.push({ label: model.cinsiyet, icon: 'person-outline', color: '#EC4899' });
    if (model.tarz) chips.push({ label: model.tarz, icon: 'color-palette-outline', color: '#8B5CF6' });

    return (
      <Pressable
        key={model.id}
        style={[styles.modelCard, isExpanded && styles.modelCardExpanded]}
        onPress={() => handleModelToggle(model.id)}
      >
        {/* Üst kısım: Resim + Bilgi + Badge */}
        <View style={styles.modelCardHeader}>
          <View style={styles.modelCardLeft}>
            <View style={styles.modelImageColumn}>
              {model.resimler.length > 0 ? (
                <Image source={{ uri: model.resimler[0].url }} style={styles.modelImage} />
              ) : (
                <View style={[styles.modelImagePlaceholder, { backgroundColor: colors.primary + '15' }]}>
                  <Icon name="shirt-outline" size={24} color={colors.primary} />
                </View>
              )}
              <Pressable
                style={[styles.imageButton, { backgroundColor: model.resimler.length > 0 ? '#10B981' + '15' : colors.border + '40' }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleImageButtonPress(model.id);
                }}
              >
                <Icon name="images-outline" size={14} color={model.resimler.length > 0 ? '#10B981' : colors.textTertiary} />
                <Text style={[styles.imageButtonText, { color: model.resimler.length > 0 ? '#10B981' : colors.textTertiary }]}>
                  {model.resimler.length}
                </Text>
              </Pressable>
            </View>
            <View style={styles.modelInfo}>
              <Text style={styles.modelName} numberOfLines={1}>{model.modelAdi}</Text>
              <View style={styles.modelMeta}>
                {model.anaModel ? (
                  <Text style={styles.modelMetaText} numberOfLines={1}>{model.anaModel}</Text>
                ) : null}
                {model.marka ? (
                  <>
                    {model.anaModel ? <Text style={styles.modelMetaDot}>·</Text> : null}
                    <Text style={styles.modelMetaText} numberOfLines={1}>{model.marka}</Text>
                  </>
                ) : null}
              </View>
            </View>
          </View>
          <View style={styles.modelCardRight}>
            <View style={styles.badgeGroup}>
              <View style={[styles.badge, { backgroundColor: '#3B82F6' + '20' }]}>
                <Icon name="shirt-outline" size={12} color="#3B82F6" />
                <Text style={[styles.badgeText, { color: '#3B82F6' }]}>{model.modelTipi || '-'}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: badge.color + '20' }]}>
                <Icon name={badge.icon} size={12} color={badge.color} />
                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            </View>
            <View style={[styles.expandButton, isExpanded && { backgroundColor: colors.primary + '15' }]}>
              <Icon
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={isExpanded ? colors.primary : colors.textSecondary}
              />
            </View>
          </View>
        </View>

        {/* Alt kısım: Chip'ler + Expand butonu */}
        <View style={styles.cardFooter}>
          {chips.length > 0 ? (
            <View style={styles.chipRow}>
              {chips.map((chip, i) => (
                <View key={i} style={[styles.chip, { backgroundColor: chip.color + '12' }]}>
                  <Icon name={chip.icon} size={12} color={chip.color} />
                  <Text style={[styles.chipText, { color: chip.color }]}>{chip.label}</Text>
                </View>
              ))}
            </View>
          ) : <View />}
        </View>

        {/* Açılır detay bölümü */}
        {isExpanded && (
          <View style={styles.modelCardDetails}>
            <View style={styles.detailDivider} />

            {/* Resim galerisi - üstte göster */}
            {/* Temel Bilgiler */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{'Temel Bilgiler'.toLocaleUpperCase('tr-TR')}</Text>
            <DetailRow icon="albums-outline" label="Ana Model" value={model.anaModel || '-'} colors={colors} />
            <DetailRow icon="pricetag-outline" label="Model Tipi" value={model.modelTipi || '-'} colors={colors} />
            <DetailRow icon="barcode-outline" label="Barkod Tipi" value={badge.label} colors={colors} />
            {model.marka ? (
              <DetailRow icon="shield-outline" label="Marka" value={model.marka} colors={colors} />
            ) : null}

            {/* Kategori Bilgileri */}
            {(model.cinsiyet || model.sezon || model.tarz) ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{'Kategori'.toLocaleUpperCase('tr-TR')}</Text>
                {model.cinsiyet ? (
                  <DetailRow icon="person-outline" label="Cinsiyet" value={model.cinsiyet} colors={colors} />
                ) : null}
                {model.sezon ? (
                  <DetailRow icon="sunny-outline" label="Sezon" value={model.sezon} colors={colors} />
                ) : null}
                {model.tarz ? (
                  <DetailRow icon="color-palette-outline" label="Tarz" value={model.tarz} colors={colors} />
                ) : null}
              </>
            ) : null}

            {/* Tasarım Bilgileri */}
            {(model.modelist || model.tasarimci) ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{'Tasarım'.toLocaleUpperCase('tr-TR')}</Text>
                {model.modelist ? (
                  <DetailRow icon="create-outline" label="Modelist" value={model.modelist} colors={colors} />
                ) : null}
                {model.tasarimci ? (
                  <DetailRow icon="brush-outline" label="Tasarımcı" value={model.tasarimci} colors={colors} />
                ) : null}
              </>
            ) : null}

            {/* Beden & Ölçü */}
            {(model.bazBeden || model.boy) ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{'Beden & Ölçü'.toLocaleUpperCase('tr-TR')}</Text>
                {model.bazBeden ? (
                  <DetailRow icon="resize-outline" label="Baz Beden" value={model.bazBeden} colors={colors} />
                ) : null}
                {model.boy ? (
                  <DetailRow icon="swap-vertical-outline" label="Boy" value={model.boy} colors={colors} />
                ) : null}
              </>
            ) : null}

            {/* Set Bilgileri */}
            {model.setParca > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{'Set Bilgileri'.toLocaleUpperCase('tr-TR')}</Text>
                <DetailRow icon="layers-outline" label="Parça Sayısı" value={`${model.setParca} parça`} colors={colors} />
                {model.setIcerik ? (
                  <DetailRow icon="list-outline" label="Set İçerik" value={model.setIcerik} colors={colors} />
                ) : null}
              </>
            ) : null}

            {/* Açıklama */}
            {model.aciklama ? (
              <View style={styles.descriptionBox}>
                <Icon name="information-circle-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.descriptionText, { color: colors.text }]}>{model.aciklama}</Text>
              </View>
            ) : null}

            {/* Alt bilgi + Düzenle */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
              {model.kayitTarihi ? (
                <Text style={[styles.footerDate, { color: colors.textTertiary, marginTop: 0 }]}>
                  Kayıt: {new Date(model.kayitTarihi).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
              ) : <View />}
              <Pressable
                style={[styles.editButton, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleEditModel(model);
                }}
              >
                <Icon name="create-outline" size={14} color={colors.primary} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Düzenle</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title="Model İşlemleri"
          leftButton={<BackButton onPress={onBack} />}
          rightButton={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AddButton onPress={handleOpenCreateForm} />
              <SearchButton onPress={handleToggleSearch} />
            </View>
          }
          showMenu={true}
          onLogout={handleLogout}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {searchVisible && (
            <View style={styles.searchContainer}>
              <SearchInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Model ara..."
              />
            </View>
          )}

          <View style={styles.pageHeader}>
            <View style={styles.pageTitleContainer}>
              <View style={[styles.pageTitleIcon, { backgroundColor: colors.primary + '15' }]}>
                <Icon name="layers" size={18} color={colors.primary} />
              </View>
              <Text style={styles.pageTitle}>Model Kartları</Text>
            </View>
            {!isLoading && !error && (
              <Text style={styles.countText}>{modelList.length} model</Text>
            )}
          </View>

          {isLoading ? (
            <LoadingSpinner />
          ) : error ? (
            <View style={styles.errorContainer}>
              <EmptyState
                icon="alert-circle-outline"
                title="Hata"
                subtitle={error}
              />
              <Pressable style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadModelList}>
                <Icon name="refresh-outline" size={18} color="#fff" />
                <Text style={styles.retryButtonText}>Tekrar Dene</Text>
              </Pressable>
            </View>
          ) : modelList.length === 0 ? (
            <EmptyState
              icon="layers-outline"
              title="Model Bulunamadı"
              subtitle={searchQuery ? 'Aramanızla eşleşen model bulunamadı' : 'Henüz model kartı eklenmemiş'}
            />
          ) : (
            modelList.map(renderModelCard)
          )}
        </ScrollView>

        <TabBar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          notificationCount={notificationCount}
        />

        <ModelImageModal
          visible={showImagePicker}
          onClose={() => { setShowImagePicker(false); setPendingPhotos([]); }}
          images={modelList.find(m => m.id === selectedModelIdForUpload)?.resimler ?? []}
          modelName={modelList.find(m => m.id === selectedModelIdForUpload)?.modelAdi ?? ''}
          onCamera={handleCamera}
          onGallery={handleGallery}
          isUploading={isUploading}
          colorList={colorList}
          colorsLoading={colorsLoading}
          pendingPhotos={pendingPhotos}
          onRemovePending={handleRemovePending}
          onDeleteImage={handleDeleteImage}
          onUploadAll={handleUploadAll}
          onColorAdded={() => loadColors()}
        />

        {/* Yeni Model Ekle BottomSheet */}
        <BottomSheet
          visible={formVisible}
          onClose={() => setFormVisible(false)}
          title={formEditingId ? 'Model Düzenle' : 'Yeni Model Ekle'}
          icon={formEditingId ? 'create-outline' : 'add-circle-outline'}
          iconColor={colors.primary}
          toastRef={formToastRef}
          footer={
            <>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: colors.border }]}
                onPress={() => setFormVisible(false)}
                disabled={formSaving}
              >
                <Icon name="close-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>İptal</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveModel}
                disabled={formSaving}
              >
                {formSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="checkmark-outline" size={18} color="#fff" />
                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>{formEditingId ? 'Güncelle' : 'Kaydet'}</Text>
                  </>
                )}
              </Pressable>
            </>
          }
        >
          {lookupsLoading ? (
            <LoadingSpinner />
          ) : (
            <View style={{ gap: 12 }}>
              {/* Satır 1: Ana Model + Model Adı */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <TanimSelectInput
                    tanimKodu="ANA_MODEL"
                    label="Ana Model *"
                    placeholder="Seçiniz..."
                    value={formAnaModelId}
                    onSelect={setFormAnaModelId}
                    useDbId
                    containerStyle={{ marginBottom: 0 }}
                    error={formFieldErrors.errors.anaModelId}
                    shake={formFieldErrors.shakes.anaModelId}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Model Adı *</Text>
                  <View style={[styles.formInputRow, { borderColor: formFieldErrors.errors.modelAdi ? '#EF4444' : colors.inputBorder, backgroundColor: colors.inputBackground }]}>
                    <Icon name="text-outline" size={18} color={colors.textTertiary} />
                    <TextInput
                      style={[styles.formInputInner, { color: colors.text }]}
                      value={formModelAdi}
                      onChangeText={(v) => { setFormModelAdi(v); formFieldErrors.clearFieldError('modelAdi'); }}
                      placeholder="Model adı..."
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                </View>
              </View>

              {/* Satır 2: Barkod Tipi + Model Tipi */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <SelectInput
                    label="Barkod Tipi *"
                    icon="barcode-outline"
                    placeholder="Seçiniz..."
                    value={formBarkodTipi}
                    items={[
                      { id: 'tekil', label: 'Tekil' },
                      { id: 'seri', label: 'Seri' },
                      { id: 'cogul', label: 'Çoğul' },
                    ]}
                    onSelect={setFormBarkodTipi}
                    noClear
                    containerStyle={{ marginBottom: 0 }}
                    error={formFieldErrors.errors.barkodTipi}
                    shake={formFieldErrors.shakes.barkodTipi}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TanimSelectInput
                    tanimKodu="MODEL_TIPI"
                    label="Model Tipi"
                    placeholder="Seçiniz..."
                    value={formModelTipiId}
                    onSelect={setFormModelTipiId}
                    useDbId
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </View>

              {/* Satır 3: Cinsiyet + Sezon */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <TanimSelectInput
                    tanimKodu="CINSIYET"
                    label="Cinsiyet"
                    placeholder="Seçiniz..."
                    value={formCinsiyetId}
                    onSelect={setFormCinsiyetId}
                    useDbId
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TanimSelectInput
                    tanimKodu="SEZON"
                    label="Sezon"
                    placeholder="Seçiniz..."
                    value={formSezonId}
                    onSelect={setFormSezonId}
                    useDbId
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </View>

              {/* Satır 4: Tarz + Boy */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <TanimSelectInput
                    tanimKodu="TARZ"
                    label="Tarz"
                    placeholder="Seçiniz..."
                    value={formTarzId}
                    onSelect={setFormTarzId}
                    useDbId
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Boy</Text>
                  <View style={[styles.formInputRow, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
                    <Icon name="swap-vertical-outline" size={18} color={colors.textTertiary} />
                    <TextInput
                      style={[styles.formInputInner, { color: colors.text }]}
                      value={formBoy}
                      onChangeText={setFormBoy}
                      placeholder="Boy..."
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                </View>
              </View>

              {/* Satır 5: Marka + Modelist */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Marka</Text>
                  <View style={[styles.formInputRow, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
                    <Icon name="shield-outline" size={18} color={colors.textTertiary} />
                    <TextInput
                      style={[styles.formInputInner, { color: colors.text }]}
                      value={formMarka}
                      onChangeText={setFormMarka}
                      placeholder="Marka..."
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Modelist</Text>
                  <View style={[styles.formInputRow, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
                    <Icon name="create-outline" size={18} color={colors.textTertiary} />
                    <TextInput
                      style={[styles.formInputInner, { color: colors.text }]}
                      value={formModelist}
                      onChangeText={setFormModelist}
                      placeholder="Modelist..."
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                </View>
              </View>

              {/* Satır 6: Tasarımcı + Beden Seti */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Tasarımcı</Text>
                  <View style={[styles.formInputRow, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
                    <Icon name="brush-outline" size={18} color={colors.textTertiary} />
                    <TextInput
                      style={[styles.formInputInner, { color: colors.text }]}
                      value={formTasarimci}
                      onChangeText={setFormTasarimci}
                      placeholder="Tasarımcı..."
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <BedenSetSelect
                    label="Beden Seti"
                    value={formBedenSetleriId}
                    bedenSetleri={bedenSetleri}
                    onSelect={(val) => {
                      setFormBedenSetleriId(val);
                      setFormBazBeden('');
                    }}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </View>

              {/* Satır 7: Baz Beden + Set Parça */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <SelectInput
                    label="Baz Beden"
                    icon="resize-outline"
                    placeholder={formBedenSetleriId ? 'Seçiniz...' : 'Önce beden seti seçin'}
                    value={formBazBeden}
                    items={bazBedenItems}
                    onSelect={setFormBazBeden}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Set Parça Sayısı</Text>
                  <View style={[styles.formInputRow, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
                    <Icon name="layers-outline" size={18} color={colors.textTertiary} />
                    <TextInput
                      style={[styles.formInputInner, { color: colors.text, textAlign: 'right' }]}
                      value={formSetParca}
                      onChangeText={(t) => setFormSetParca(t.replace(/[^0-9]/g, ''))}
                      placeholder="0"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>

              {/* Set İçerik */}
              <View>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Set İçerik</Text>
                <View style={[styles.formInputRow, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}>
                  <Icon name="list-outline" size={18} color={colors.textTertiary} />
                  <TextInput
                    style={[styles.formInputInner, { color: colors.text }]}
                    value={formSetIcerik}
                    onChangeText={setFormSetIcerik}
                    placeholder="Set içerik..."
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>

              {/* Açıklama */}
              <View>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Açıklama</Text>
                <View style={[styles.formInputRow, { borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, height: 80, alignItems: 'flex-start', paddingTop: 14 }]}>
                  <Icon name="document-text-outline" size={18} color={colors.textTertiary} />
                  <TextInput
                    style={[styles.formInputInner, { color: colors.text, textAlignVertical: 'top', height: '100%' }]}
                    value={formAciklama}
                    onChangeText={setFormAciklama}
                    placeholder="Açıklama..."
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>
            </View>
          )}
        </BottomSheet>

      </View>
    </SafeAreaProvider>
  );
}

function DetailRow({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: any }) {
  return (
    <View style={detailStyles.row}>
      <View style={detailStyles.labelContainer}>
        <Icon name={icon} size={16} color={colors.textSecondary} />
        <Text style={[detailStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[detailStyles.value, { color: colors.text }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
});

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 100,
    },
    searchContainer: {
      marginBottom: 12,
    },
    pageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    pageTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    pageTitleIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      opacity: 0.6,
    },
    countText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    modelCard: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modelCardExpanded: {
      borderColor: colors.primary + '40',
    },
    modelCardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    modelCardLeft: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      flex: 1,
      gap: 12,
    },
    modelImageColumn: {
      alignItems: 'center',
      gap: 6,
    },
    modelImage: {
      width: 60,
      height: 60,
      borderRadius: 12,
    },
    modelImagePlaceholder: {
      width: 60,
      height: 60,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modelInfo: {
      flex: 1,
    },
    modelName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 3,
    },
    modelMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    modelMetaText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    modelMetaDot: {
      fontSize: 12,
      color: colors.textTertiary,
    },
    modelCardRight: {
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginLeft: 4,
      alignSelf: 'stretch',
    },
    badgeGroup: {
      alignItems: 'flex-end',
      gap: 4,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
    },
    expandButton: {
      width: 36,
      height: 26,
      borderRadius: 7,
      backgroundColor: colors.border + '50',
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      flex: 1,
    },
    imageButton: {
      width: 60,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 5,
      borderRadius: 7,
    },
    imageButtonText: {
      fontSize: 12,
      fontWeight: '600',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    chipText: {
      fontSize: 11,
      fontWeight: '600',
    },
    modelCardDetails: {
      marginTop: 8,
    },
    detailDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      marginTop: 12,
      marginBottom: 6,
      opacity: 0.5,
      letterSpacing: 0.5,
    },
    imageGallery: {
      marginBottom: 4,
    },
    galleryImage: {
      width: 90,
      height: 90,
      borderRadius: 10,
      marginRight: 8,
    },
    descriptionBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 12,
      padding: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      borderRadius: 8,
    },
    descriptionText: {
      fontSize: 13,
      lineHeight: 18,
      flex: 1,
    },
    footerDate: {
      fontSize: 11,
      marginTop: 12,
      textAlign: 'right',
    },
    errorContainer: {
      alignItems: 'center',
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      marginTop: 16,
    },
    retryButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    formRow: {
      flexDirection: 'row' as const,
      gap: 10,
    },
    formLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
      marginBottom: 6,
    },
    formInputRow: {
      height: 48,
      borderWidth: 1.5,
      borderRadius: 12,
      paddingHorizontal: 12,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    formInputInner: {
      flex: 1,
      fontSize: 14,
      height: '100%' as any,
      padding: 0,
    },
    modalBtn: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 6,
      height: 48,
      borderRadius: 12,
    },
    modalBtnCancel: {
      backgroundColor: 'transparent',
      borderWidth: 1,
    },
    modalBtnText: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    editButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
    },
  });
