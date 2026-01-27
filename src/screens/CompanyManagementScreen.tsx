import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import TabBar, { TabName } from '../components/TabBar';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import { useAlert } from '../contexts/AlertContext';
import SaveButton from '../components/SaveButton';
import CancelButton from '../components/CancelButton';
import ConfirmButton from '../components/ConfirmButton';
import SearchInput from '../components/SearchInput';
import Header from '../components/Header';
import BackButton from '../components/BackButton';
import IconButton from '../components/IconButton';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import Input from '../components/Input';
import InputPhone from '../components/InputPhone';
import DateInput from '../components/DateInput';

// Firma lisans bilgisi
interface CompanyLicense {
  id: string;
  companyName: string;
  companyCode: string;
  totalLicense: number;
  usedLicense: number;
  expiryDate: string;
  isActive: boolean;
  dataVersiyon: string;
  modules: {
    muhasebe: boolean;
    tabakhane: boolean;
    magaza: boolean;
    konfeksiyon: boolean;
  };
  firmaAyarlar?: FirmaAyarlar;
}

// Program ayarları
interface ProgramAyar {
  aktif: boolean;
}

// Yeni firma form verisi için JSON yapısı (Türkçe anahtarlar)
interface FirmaAyarlar {
  lisans: {
    anahtar: string;
    apiAnahtar: string;
    apiSecret: string;
    adet: string;
    versiyon: string;
    paketBitisTarihi: string;
  };
  veritabani: {
    sunucu: string;
    port: string;
    kullanici: string;
    sifre: string;
    veriAdi: string; // V2+ için tek veritabanı adı
  };
  programlar: {
    muhasebe: ProgramAyar;
    tabakhane: ProgramAyar;
    magaza: ProgramAyar;
    konfeksiyon: ProgramAyar;
  };
  ftp: {
    sunucu: string;
    port: string;
    kullanici: string;
    sifre: string;
    resimKlasor: string;
    dosyaKlasor: string;
  };
  url: {
    domain: string;
    resimKlasor: string;
    dosyaKlasor: string;
  };
}

interface CompanyManagementScreenProps {
  onGoBack: () => void;
  onTabPress: (tab: TabName) => void;
}

export default function CompanyManagementScreen({
  onGoBack,
  onTabPress,
}: CompanyManagementScreenProps) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const alert = useAlert();

  // State
  const [companies, setCompanies] = useState<CompanyLicense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyLicense | null>(null);

  // Add Company State
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [firmaUnvani, setFirmaUnvani] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showFtpPassword, setShowFtpPassword] = useState(false);

  // Varsayılan Kullanıcı State (Sadece Firma Eklerken)
  const [defaultUser, setDefaultUser] = useState({
    adSoyad: '',
    email: '',
    telefon: '',
    sifre: '',
  });
  const [showDefaultUserPassword, setShowDefaultUserPassword] = useState(false);

  // Form Data - Tüm firma ayarlarını tek JSON'da tutan state
  const [firmaAyarlar, setFirmaAyarlar] = useState<FirmaAyarlar>({
    lisans: {
      anahtar: '',
      apiAnahtar: '',
      apiSecret: '',
      adet: '1',
      versiyon: 'v1',
      paketBitisTarihi: `${new Date().getFullYear() + 1}-01-01`,
    },
    veritabani: {
      sunucu: '45.43.154.230',
      port: '3306',
      kullanici: '',
      sifre: '',
      veriAdi: '',
    },
    programlar: {
      muhasebe: { aktif: false },
      tabakhane: { aktif: false },
      magaza: { aktif: false },
      konfeksiyon: { aktif: false },
    },
    ftp: {
      sunucu: '',
      port: '21',
      kullanici: '',
      sifre: '',
      resimKlasor: '',
      dosyaKlasor: '',
    },
    url: {
      domain: '',
      resimKlasor: '',
      dosyaKlasor: '',
    },
  });

  // Helper function to update nested state
  const updateFirmaAyarlar = <K extends keyof FirmaAyarlar>(
    section: K,
    field: keyof FirmaAyarlar[K],
    value: any
  ) => {
    setFirmaAyarlar(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  // Helper function to update program settings
  const updateProgramAyar = (
    program: keyof FirmaAyarlar['programlar'],
    aktif: boolean
  ) => {
    setFirmaAyarlar(prev => ({
      ...prev,
      programlar: {
        ...prev.programlar,
        [program]: {
          aktif,
        },
      },
    }));
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const sessionStr = await AsyncStorage.getItem('@golaks_auth');
      if (!sessionStr) return;

      const session = JSON.parse(sessionStr);
      console.log('Fetching companies from:', API_ENDPOINTS.COMPANY_LIST);
      console.log('Token available:', !!session.token);

      const response = await fetch(API_ENDPOINTS.COMPANY_LIST, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.token}`,
        },
      });

      console.log('Company response status:', response.status);
      const data = await response.json();
      console.log('Company response data:', JSON.stringify(data, null, 2));

      if (data.success && data.data?.companies) {
        console.log('Companies loaded:', data.data.companies.length);
        setCompanies(data.data.companies);
      } else {
        console.log('No companies or wrong format:', data);
        alert.showError('Hata', data.error?.message || 'Firma listesi yüklenemedi');
      }
    } catch (error) {
      console.error('Company load error:', error);
      alert.showError('Hata', 'Firma yönetimi yüklenemedi');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadCompanies();
  };

  const handleSelectCompany = (company: CompanyLicense) => {
    // Direkt düzenleme sayfasını aç
    handleEditCompanySettings(company);
  };

  // Handle edit company - populate form with existing data
  const handleEditCompanySettings = (company: CompanyLicense) => {
    setEditingCompanyId(company.id);
    setFirmaUnvani(company.companyName);

    // Populate form with existing firma_ayarlar or defaults
    const ayarlar = company.firmaAyarlar;
    if (ayarlar) {
      setFirmaAyarlar({
        lisans: {
          anahtar: ayarlar.lisans?.anahtar || company.companyCode || '',
          apiAnahtar: ayarlar.lisans?.apiAnahtar || '',
          apiSecret: ayarlar.lisans?.apiSecret || '',
          adet: ayarlar.lisans?.adet?.toString() || company.totalLicense?.toString() || '1',
          versiyon: ayarlar.lisans?.versiyon || 'v1',
          paketBitisTarihi: ayarlar.lisans?.paketBitisTarihi || `${new Date().getFullYear() + 1}-01-01`,
        },
        veritabani: {
          sunucu: ayarlar.veritabani?.sunucu || '45.43.154.230',
          port: ayarlar.veritabani?.port || '3306',
          kullanici: ayarlar.veritabani?.kullanici || '',
          sifre: ayarlar.veritabani?.sifre || '',
          veriAdi: ayarlar.veritabani?.veriAdi || '',
        },
        programlar: {
          muhasebe: {
            aktif: ayarlar.programlar?.muhasebe?.aktif || company.modules.muhasebe || false,
          },
          tabakhane: {
            aktif: ayarlar.programlar?.tabakhane?.aktif || company.modules.tabakhane || false,
          },
          magaza: {
            aktif: ayarlar.programlar?.magaza?.aktif || company.modules.magaza || false,
          },
          konfeksiyon: {
            aktif: ayarlar.programlar?.konfeksiyon?.aktif || company.modules.konfeksiyon || false,
          },
        },
        ftp: {
          sunucu: ayarlar.ftp?.sunucu || '',
          port: ayarlar.ftp?.port || '21',
          kullanici: ayarlar.ftp?.kullanici || '',
          sifre: ayarlar.ftp?.sifre || '',
          resimKlasor: ayarlar.ftp?.resimKlasor || '',
          dosyaKlasor: ayarlar.ftp?.dosyaKlasor || '',
        },
        url: {
          domain: ayarlar.url?.domain || '',
          resimKlasor: ayarlar.url?.resimKlasor || '',
          dosyaKlasor: ayarlar.url?.dosyaKlasor || '',
        },
      });
    } else {
      // No firma_ayarlar, use defaults with company info
      setFirmaAyarlar({
        lisans: {
          anahtar: company.companyCode || generateLicenseKey(),
          apiAnahtar: generateApiKey(),
          apiSecret: generateApiSecret(),
          adet: company.totalLicense?.toString() || '1',
          versiyon: 'v1',
          paketBitisTarihi: company.expiryDate || '',
        },
        veritabani: {
          sunucu: '',
          port: '3306',
          kullanici: '',
          sifre: '',
          veriAdi: '',
        },
        programlar: {
          muhasebe: { aktif: company.modules.muhasebe },
          tabakhane: { aktif: company.modules.tabakhane },
          magaza: { aktif: company.modules.magaza },
          konfeksiyon: { aktif: company.modules.konfeksiyon },
        },
        ftp: {
          sunucu: '',
          port: '21',
          kullanici: '',
          sifre: '',
          resimKlasor: '',
          dosyaKlasor: '',
          resimYuklemeTipi: 'model',
        },
        url: {
          domain: '',
          resimKlasor: '',
          dosyaKlasor: '',
        },
      });
    }

    setSelectedCompany(null); // Close detail view if open
    setShowAddCompany(true);
  };

  const filteredCompanies = companies.filter(c => {
    const query = searchQuery.toLowerCase();
    const nameMatch = c.companyName?.toLowerCase().includes(query);
    const codeMatch = c.companyCode?.toString().toLowerCase().includes(query);
    return nameMatch || codeMatch;
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Version badge colors


  const isExpiringSoon = (dateStr: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  // Generate license key in format: XXXX-XXXX-XXXX-XXXX-XXXX (20 characters)
  const generateLicenseKey = () => {
    const chars = '0123456789ABCDEF';
    const segments = [];
    for (let i = 0; i < 5; i++) {
      let segment = '';
      for (let j = 0; j < 4; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(segment);
    }
    return segments.join('-');
  };

  // Generate API key in format: XXXX-XXXX-XXXX-XXXX-XXXX (20 characters)
  const generateApiKey = () => {
    const chars = '0123456789ABCDEF';
    const segments = [];
    for (let i = 0; i < 5; i++) {
      let segment = '';
      for (let j = 0; j < 4; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(segment);
    }
    return segments.join('-');
  };

  // Generate API secret (128 character hexadecimal string)
  const generateApiSecret = () => {
    const chars = '0123456789abcdef';
    let secret = '';
    for (let i = 0; i < 128; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  // Generate 6 digit password
  const generatePassword = () => {
    const chars = '0123456789';
    let password = '';
    for (let i = 0; i < 6; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Reset add company form
  const resetAddCompanyForm = () => {
    setFirmaUnvani('');
    setDefaultUser({
      adSoyad: '',
      email: '',
      telefon: '',
      sifre: generatePassword(),
    });
    setShowDefaultUserPassword(false);
    setShowPassword(false);
    setShowFtpPassword(false);
    setFirmaAyarlar({
      lisans: {
        anahtar: generateLicenseKey(),
        apiAnahtar: generateApiKey(),
        apiSecret: generateApiSecret(),
        adet: '1',
        versiyon: 'v1',
        paketBitisTarihi: `${new Date().getFullYear() + 1}-01-01`,
      },
      veritabani: {
        sunucu: '45.43.154.230',
        port: '3306',
        kullanici: '',
        sifre: '',
        veriAdi: '',
      },
      programlar: {
        muhasebe: { aktif: false },
        tabakhane: { aktif: false },
        magaza: { aktif: false },
        konfeksiyon: { aktif: false },
      },
      ftp: {
        sunucu: '',
        port: '21',
        kullanici: '',
        sifre: '',
        resimKlasor: '',
        dosyaKlasor: '',
      },
      url: {
        domain: '',
        resimKlasor: '',
        dosyaKlasor: '',
      },
    });
  };

  // API'ye göndermek için veri hazırlama fonksiyonu
  const buildApiPayload = (includeDefaultUser: boolean = false) => {
    const payload: any = {
      firma_unvani: firmaUnvani,
      firma_ayarlar: JSON.stringify(firmaAyarlar),
      aktif: 1,
    };

    // Sadece firma eklerken varsayılan kullanıcı bilgilerini ekle
    if (includeDefaultUser) {
      payload.default_user = {
        ad_soyad: defaultUser.adSoyad,
        email: defaultUser.email,
        telefon: defaultUser.telefon,
        sifre: defaultUser.sifre,
      };
    }

    return payload;
  };

  // Firma Ekleme
  const handleAddCompany = async () => {
    // Validasyon
    if (!firmaUnvani.trim()) {
      alert.showError('Hata', 'Lütfen gerekli alanları doldurun');
      return;
    }

    // Varsayılan kullanıcı validasyonları
    if (!defaultUser.adSoyad.trim()) {
      alert.showError('Hata', 'Lütfen gerekli alanları doldurun');
      return;
    }
    if (!defaultUser.email.trim()) {
      alert.showError('Hata', 'Lütfen gerekli alanları doldurun');
      return;
    }
    if (!defaultUser.telefon.trim()) {
      alert.showError('Hata', 'Lütfen gerekli alanları doldurun');
      return;
    }
    if (!defaultUser.sifre.trim() || defaultUser.sifre.length < 6) {
      alert.showError('Hata', 'Lütfen gerekli alanları doldurun');
      return;
    }

    setIsAddingCompany(true);
    try {
      const sessionStr = await AsyncStorage.getItem('@golaks_auth');
      if (!sessionStr) return;

      const session = JSON.parse(sessionStr);
      const payload = buildApiPayload(true); // Varsayılan kullanıcı bilgilerini ekle



      const response = await fetch(API_ENDPOINTS.COMPANY_LIST, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        
        alert.showError('Hata', 'Sunucu yanıtı işlenemedi: ' + responseText.substring(0, 200));
        return;
      }

      if (data.success) {
        alert.showSuccess('Başarılı', 'Firma başarıyla eklendi');
        handleCloseAddCompany();
        loadCompanies();
      } else {
        const errorMsg = data.message || data.error?.message || JSON.stringify(data);
        alert.showError('Hata', errorMsg);
      }
    } catch (error: any) {
      
      alert.showError('Hata', error?.message || 'Firma eklenemedi');
    } finally {
      setIsAddingCompany(false);
    }
  };

  // Firma Düzenleme
  const handleUpdateCompany = async () => {
    if (!editingCompanyId) return;

    // Validasyon
    if (!firmaUnvani.trim()) {
      alert.showError('Hata', 'Lütfen gerekli alanları doldurun');
      return;
    }

    setIsAddingCompany(true);
    try {
      const sessionStr = await AsyncStorage.getItem('@golaks_auth');
      if (!sessionStr) return;

      const session = JSON.parse(sessionStr);
      const payload = {
        ...buildApiPayload(),
        firma_id: editingCompanyId,
      };



      const response = await fetch(API_ENDPOINTS.COMPANY_LIST, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        
        alert.showError('Hata', 'Sunucu yanıtı işlenemedi');
        return;
      }

      if (data.success) {
        alert.showSuccess('Başarılı', 'Değişiklikler kaydedildi');
        handleCloseAddCompany();
        loadCompanies();
      } else {
        const errorMsg = data.message || data.error?.message || JSON.stringify(data);
        alert.showError('Hata', errorMsg);
      }
    } catch (error: any) {
      
      alert.showError('Hata', error?.message || 'Değişiklikler kaydedilemedi');
    } finally {
      setIsAddingCompany(false);
    }
  };

  // Handle open add company
  const handleToggleSearch = () => {
    setSearchVisible(!searchVisible);
    if (searchVisible) {
      // Arama kapatılırken query'yi temizle
      setSearchQuery('');
    }
  };

  const handleOpenAddCompany = () => {
    setEditingCompanyId(null);
    resetAddCompanyForm();
    setShowAddCompany(true);
  };

  // Handle close add company
  const handleCloseAddCompany = () => {
    setShowAddCompany(false);
    setEditingCompanyId(null);
    resetAddCompanyForm();
  };

  // Add Company View
  if (showAddCompany) {
    return (
      <View style={styles.container}>
        <Header
          title={editingCompanyId ? 'Firma Düzenle' : 'Yeni Firma Ekle'}
          showBackButton={true}
          onBackPress={handleCloseAddCompany}
        />

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Page Title */}
            <View style={[styles.pageHeader, { paddingTop: 16, paddingHorizontal: 0 }]}>
              <View style={styles.pageTitleContainer}>
                <View style={[styles.pageTitleIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Icon name={editingCompanyId ? "create" : "add-circle"} size={18} color={colors.primary} />
                </View>
                <Text style={styles.pageTitle}>{editingCompanyId ? 'Firma Düzenle' : 'Firma Ekle'}</Text>
              </View>
            </View>

            {/* Company Info Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionIcon}>
                  <Icon name="business" size={18} color={colors.textSecondary} />
                </View>
                <Text style={styles.sectionTitle}>{'Firma Bilgileri'}</Text>
              </View>

              <View style={styles.formCard}>
                {/* Firma Ünvanı */}
                <Input
                  label="Firma Ünvanı"
                  icon="business-outline"
                  value={firmaUnvani}
                  onChangeText={setFirmaUnvani}
                  placeholder="Firma ünvanını giriniz"
                />

                {/* Lisans Anahtarı */}
                <Input
                  label="Lisans Anahtarı"
                  icon="key-outline"
                  value={firmaAyarlar.lisans.anahtar}
                  onChangeText={(text) => updateFirmaAyarlar('lisans', 'anahtar', text)}
                  placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                  autoCapitalize="characters"
                  editable={false}
                  rightIcon="refresh"
                  onRightIconPress={() => updateFirmaAyarlar('lisans', 'anahtar', generateLicenseKey())}
                />

                {/* API Key */}
                <Input
                  label="API Anahtarı"
                  icon="code-outline"
                  value={firmaAyarlar.lisans.apiAnahtar}
                  onChangeText={(text) => updateFirmaAyarlar('lisans', 'apiAnahtar', text)}
                  placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                  autoCapitalize="characters"
                  editable={false}
                  rightIcon="refresh"
                  onRightIconPress={() => updateFirmaAyarlar('lisans', 'apiAnahtar', generateApiKey())}
                />

                {/* API Secret */}
                <Input
                  label="API Secret"
                  icon="key-outline"
                  value={firmaAyarlar.lisans.apiSecret}
                  onChangeText={(text) => updateFirmaAyarlar('lisans', 'apiSecret', text)}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  autoCapitalize="none"
                  editable={false}
                  rightIcon="refresh"
                  onRightIconPress={() => updateFirmaAyarlar('lisans', 'apiSecret', generateApiSecret())}
                />

                {/* Lisans Adet ve Paket Bitiş Tarihi */}
                <View style={styles.formGroupRow}>
                  <Input
                    label="Lisans Adedi"
                    icon="people-outline"
                    value={firmaAyarlar.lisans.adet}
                    onChangeText={(text) => updateFirmaAyarlar('lisans', 'adet', text)}
                    placeholder="1"
                    keyboardType="numeric"
                    textAlign="right"
                    containerStyle={{ flex: 0.65 }}
                  />

                  <DateInput
                    label="Paket Bitiş Tarihi"
                    value={firmaAyarlar.lisans.paketBitisTarihi ? new Date(firmaAyarlar.lisans.paketBitisTarihi) : undefined}
                    onChange={(date) => {
                      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                      updateFirmaAyarlar('lisans', 'paketBitisTarihi', formattedDate);
                    }}
                    placeholder="Tarih"
                    containerStyle={{ flex: 1.35 }}
                  />
                </View>
              </View>
            </View>

            {/* Database Settings Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionIcon}>
                  <Icon name="server" size={18} color={colors.textSecondary} />
                </View>
                <Text style={styles.sectionTitle}>{'Veritabanı Ayarları'}</Text>
              </View>

              <View style={styles.formCard}>
                {/* Data Server */}
                <Input
                  label="Sunucu"
                  icon="globe-outline"
                  value={firmaAyarlar.veritabani.sunucu}
                  onChangeText={(text) => updateFirmaAyarlar('veritabani', 'sunucu', text)}
                  placeholder="Veritabanı sunucusu"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {/* Data Port */}
                <Input
                  label="Port"
                  icon="link-outline"
                  value={firmaAyarlar.veritabani.port}
                  onChangeText={(text) => updateFirmaAyarlar('veritabani', 'port', text)}
                  placeholder="3306"
                  keyboardType="numeric"
                />

                {/* Data User */}
                <Input
                  label="Kullanıcı Adı"
                  icon="person-outline"
                  value={firmaAyarlar.veritabani.kullanici}
                  onChangeText={(text) => updateFirmaAyarlar('veritabani', 'kullanici', text)}
                  placeholder="Veritabanı kullanıcısı"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {/* Data Password */}
                <Input
                  label="Şifre"
                  icon="lock-closed-outline"
                  value={firmaAyarlar.veritabani.sifre}
                  onChangeText={(text) => updateFirmaAyarlar('veritabani', 'sifre', text)}
                  placeholder="Veritabanı şifresi"
                  isPassword
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {/* Database Name */}
                <Input
                  label="Veritabanı Adı"
                  icon="file-tray-full-outline"
                  value={firmaAyarlar.veritabani.veriAdi}
                  onChangeText={(text) => updateFirmaAyarlar('veritabani', 'veriAdi', text)}
                  placeholder="Veritabanı adı"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Program Settings Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionIcon}>
                  <Icon name="apps" size={18} color={colors.textSecondary} />
                </View>
                <Text style={styles.sectionTitle}>{'Program Ayarları'}</Text>
              </View>

              <View style={styles.formCard}>
                {/* Muhasebe */}
                <View style={styles.programItem}>
                  <Pressable
                    style={styles.programCheckboxRow}
                    onPress={() => updateProgramAyar('muhasebe', !firmaAyarlar.programlar.muhasebe.aktif)}
                  >
                    <View style={[
                      styles.checkbox,
                      firmaAyarlar.programlar.muhasebe.aktif && styles.checkboxChecked
                    ]}>
                      {firmaAyarlar.programlar.muhasebe.aktif && (
                        <Icon name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                    <View style={[styles.programIcon, { backgroundColor: colors.primaryBackground }]}>
                      <Icon name="calculator-outline" size={18} color={colors.primary} />
                    </View>
                    <Text style={[
                      styles.programLabel,
                      firmaAyarlar.programlar.muhasebe.aktif && styles.programLabelActive
                    ]}>
                      {'Muhasebe'}
                    </Text>
                  </Pressable>
                </View>

                {/* Tabakhane */}
                <View style={styles.programItem}>
                  <Pressable
                    style={styles.programCheckboxRow}
                    onPress={() => updateProgramAyar('tabakhane', !firmaAyarlar.programlar.tabakhane.aktif)}
                  >
                    <View style={[
                      styles.checkbox,
                      firmaAyarlar.programlar.tabakhane.aktif && styles.checkboxChecked
                    ]}>
                      {firmaAyarlar.programlar.tabakhane.aktif && (
                        <Icon name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                    <View style={[styles.programIcon, { backgroundColor: colors.greenBackground }]}>
                      <Icon name="business-outline" size={18} color={colors.green} />
                    </View>
                    <Text style={[
                      styles.programLabel,
                      firmaAyarlar.programlar.tabakhane.aktif && styles.programLabelActive
                    ]}>
                      {'Tabakhane'}
                    </Text>
                  </Pressable>
                </View>

                {/* Konfeksiyon */}
                <View style={styles.programItem}>
                  <Pressable
                    style={styles.programCheckboxRow}
                    onPress={() => updateProgramAyar('konfeksiyon', !firmaAyarlar.programlar.konfeksiyon.aktif)}
                  >
                    <View style={[
                      styles.checkbox,
                      firmaAyarlar.programlar.konfeksiyon.aktif && styles.checkboxChecked
                    ]}>
                      {firmaAyarlar.programlar.konfeksiyon.aktif && (
                        <Icon name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                    <View style={[styles.programIcon, { backgroundColor: colors.orangeBackground }]}>
                      <Icon name="shirt-outline" size={18} color={colors.orange} />
                    </View>
                    <Text style={[
                      styles.programLabel,
                      firmaAyarlar.programlar.konfeksiyon.aktif && styles.programLabelActive
                    ]}>
                      {'Konfeksiyon'}
                    </Text>
                  </Pressable>
                </View>

                {/* Mağaza */}
                <View style={styles.programItem}>
                  <Pressable
                    style={styles.programCheckboxRow}
                    onPress={() => updateProgramAyar('magaza', !firmaAyarlar.programlar.magaza.aktif)}
                  >
                    <View style={[
                      styles.checkbox,
                      firmaAyarlar.programlar.magaza.aktif && styles.checkboxChecked
                    ]}>
                      {firmaAyarlar.programlar.magaza.aktif && (
                        <Icon name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                    <View style={[styles.programIcon, { backgroundColor: colors.purpleBackground }]}>
                      <Icon name="storefront-outline" size={18} color={colors.purple} />
                    </View>
                    <Text style={[
                      styles.programLabel,
                      firmaAyarlar.programlar.magaza.aktif && styles.programLabelActive
                    ]}>
                      {'Mağaza'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* FTP Settings Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionIcon}>
                  <Icon name="cloud-upload" size={18} color={colors.textSecondary} />
                </View>
                <Text style={styles.sectionTitle}>{'FTP Ayarları'}</Text>
              </View>

              <View style={styles.formCard}>
                {/* FTP Server */}
                <Input
                  label="FTP Sunucu"
                  icon="globe-outline"
                  value={firmaAyarlar.ftp.sunucu}
                  onChangeText={(text) => updateFirmaAyarlar('ftp', 'sunucu', text)}
                  placeholder="FTP sunucu adresi"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {/* FTP Port */}
                <Input
                  label="FTP Port"
                  icon="link-outline"
                  value={firmaAyarlar.ftp.port}
                  onChangeText={(text) => updateFirmaAyarlar('ftp', 'port', text)}
                  placeholder="21"
                  keyboardType="numeric"
                />

                {/* FTP User */}
                <Input
                  label="FTP Kullanıcı"
                  icon="person-outline"
                  value={firmaAyarlar.ftp.kullanici}
                  onChangeText={(text) => updateFirmaAyarlar('ftp', 'kullanici', text)}
                  placeholder="FTP kullanıcı adı"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {/* FTP Password */}
                <Input
                  label="FTP Şifre"
                  icon="lock-closed-outline"
                  value={firmaAyarlar.ftp.sifre}
                  onChangeText={(text) => updateFirmaAyarlar('ftp', 'sifre', text)}
                  placeholder="FTP şifresi"
                  isPassword
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {/* FTP Klasörler - Yan Yana */}
                <View style={styles.formGroupRow}>
                  <Input
                    label="FTP Resim Klasörü"
                    icon="image-outline"
                    value={firmaAyarlar.ftp.resimKlasor}
                    onChangeText={(text) => updateFirmaAyarlar('ftp', 'resimKlasor', text)}
                    placeholder="/images"
                    autoCapitalize="none"
                    autoCorrect={false}
                    containerStyle={{ flex: 1 }}
                  />
                  <Input
                    label="FTP Dosya Klasörü"
                    icon="folder-outline"
                    value={firmaAyarlar.ftp.dosyaKlasor}
                    onChangeText={(text) => updateFirmaAyarlar('ftp', 'dosyaKlasor', text)}
                    placeholder="/files"
                    autoCapitalize="none"
                    autoCorrect={false}
                    containerStyle={{ flex: 1 }}
                  />
                </View>

                {/* Domain URL - Full Width */}
                <Input
                  label="Domain URL"
                  icon="earth-outline"
                  value={firmaAyarlar.url.domain}
                  onChangeText={(text) => updateFirmaAyarlar('url', 'domain', text)}
                  placeholder="https://example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />

                {/* Resim ve Dosya Klasörü - Yan Yana */}
                <View style={styles.formGroupRow}>
                  <Input
                    label="Resim Klasörü"
                    icon="image-outline"
                    value={firmaAyarlar.url.resimKlasor}
                    onChangeText={(text) => updateFirmaAyarlar('url', 'resimKlasor', text)}
                    placeholder="Resim klasör yolu"
                    autoCapitalize="none"
                    autoCorrect={false}
                    containerStyle={{ flex: 1 }}
                  />

                  <Input
                    label="Dosya Klasörü"
                    icon="folder-outline"
                    value={firmaAyarlar.url.dosyaKlasor}
                    onChangeText={(text) => updateFirmaAyarlar('url', 'dosyaKlasor', text)}
                    placeholder="Dosya klasör yolu"
                    autoCapitalize="none"
                    autoCorrect={false}
                    containerStyle={{ flex: 1 }}
                  />
                </View>
              </View>
            </View>

            {/* Default User Section - Sadece Firma Eklerken Göster */}
            {!editingCompanyId && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionIcon}>
                    <Icon name="person-add" size={18} color={colors.textSecondary} />
                  </View>
                  <Text style={styles.sectionTitle}>{'Varsayılan Kullanıcı'}</Text>
                </View>

                <View style={styles.formCard}>
                  {/* Ad Soyad */}
                  <Input
                    label="Ad Soyad"
                    icon="person-outline"
                    value={defaultUser.adSoyad}
                    onChangeText={(text) => setDefaultUser(prev => ({ ...prev, adSoyad: text }))}
                    placeholder="Kullanıcı adı soyadı"
                  />

                  {/* E-posta */}
                  <Input
                    label="E-posta"
                    icon="mail-outline"
                    value={defaultUser.email}
                    onChangeText={(text) => setDefaultUser(prev => ({ ...prev, email: text }))}
                    placeholder="kullanici@firma.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  {/* Telefon */}
                  <InputPhone
                    label="Telefon"
                    value={defaultUser.telefon}
                    onChangeText={(text) => setDefaultUser(prev => ({ ...prev, telefon: text }))}
                    placeholder="0 5__ ___ ____"
                  />

                  {/* Şifre */}
                  <Input
                    label="Şifre"
                    icon="lock-closed-outline"
                    value={defaultUser.sifre}
                    onChangeText={(text) => setDefaultUser(prev => ({ ...prev, sifre: text.replace(/[^0-9]/g, '').slice(0, 6) }))}
                    placeholder="123456"
                    keyboardType="numeric"
                    maxLength={6}
                    rightIcon="refresh"
                    onRightIconPress={() => setDefaultUser(prev => ({ ...prev, sifre: generatePassword() }))}
                  />

                  {/* Bilgi Notu */}
                  <View style={styles.infoNote}>
                    <Icon name="information-circle-outline" size={18} color={colors.primary} />
                    <Text style={styles.infoNoteText}>{'Bu kullanıcı, firma eklendiğinde otomatik olarak oluşturulacaktır'}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Save Button */}
            <View style={styles.saveButtonContainer}>
              <SaveButton
                onPress={editingCompanyId ? handleUpdateCompany : handleAddCompany}
                loading={isAddingCompany}
                text={editingCompanyId ? 'Kaydet' : 'Yeni Firma Ekle'}
              />
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>

          <TabBar activeTab="profile" onTabPress={onTabPress} />

      </View>
    );
  }

  // List View
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.backgroundSecondary}
      />

      <Header
        title="Firma Yönetimi"
        leftButton={<BackButton onPress={onGoBack} />}
        rightButton={
          <View style={styles.headerRight}>
            <IconButton icon="search-outline" onPress={handleToggleSearch} />
            <IconButton icon="add" onPress={handleOpenAddCompany} />
          </View>
        }
      />

        {/* Search */}
        {searchVisible && (
          <View style={styles.searchContainer}>
            <SearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={'Firma ara...'}
            />
          </View>
        )}

        {/* Page Title */}
        <View style={[styles.pageHeader, !searchVisible && { paddingTop: 16 }]}>
          <View style={styles.pageTitleContainer}>
            <View style={[styles.pageTitleIcon, { backgroundColor: colors.primary + '15' }]}>
              <Icon name="business" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>Firma Yönetimi</Text>
            </View>
          </View>
        </View>

        {/* Stats Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{companies.length}</Text>
            <Text style={styles.summaryLabel}>{'Toplam'}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {companies.filter(c => c.isActive).length}
            </Text>
            <Text style={styles.summaryLabel}>{'Aktif'}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {companies.filter(c => isExpiringSoon(c.expiryDate)).length}
            </Text>
            <Text style={styles.summaryLabel}>{'Süresi Dolacak'}</Text>
          </View>
        </View>

        {/* Company List */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={isDark ? '#D1D5DB' : '#6B7280'}
              colors={[isDark ? '#D1D5DB' : '#6B7280']}
            />
          }
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner size={80} />
            </View>
          ) : filteredCompanies.length === 0 ? (
            <EmptyState
              icon="business-outline"
              title="Firma Bulunamadı"
              subtitle="Henüz firma eklenmemiş veya arama kriterlerine uygun firma bulunamadı"
            />
          ) : (
            filteredCompanies.map((company) => (
              <Pressable
                key={company.id}
                style={styles.companyListItem}
                onPress={() => handleSelectCompany(company)}
              >
                <View style={[styles.companyListIcon, { backgroundColor: colors.backgroundSecondary }]}>
                  <Icon name="business" size={26} color={colors.textSecondary} />
                </View>
                <View style={styles.companyListInfo}>
                  <Text style={styles.companyListName}>{company.companyName}</Text>
                  <View style={styles.companyListStats}>
                    <View style={styles.companyListStat}>
                      <Icon name="people-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.companyListStatText}>
                        {company.usedLicense}/{company.totalLicense}
                      </Text>
                    </View>
                    <View style={styles.companyListStat}>
                      <Icon name="calendar-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.companyListStatText}>
                        {formatDate(company.expiryDate)}
                      </Text>
                    </View>
                  </View>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>
            ))
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        <TabBar activeTab="profile" onTabPress={onTabPress} />

    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerRight: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      justifyContent: 'center',
    },
    headerTitleText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    headerPlaceholder: {
      width: 40,
      height: 40,
    },
    editButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background,
    },
    pageHeader: {
      paddingHorizontal: 16,
      marginBottom: 8,
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
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      opacity: 0.6,
      marginBottom: 1,
    },
    pageSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    summaryContainer: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginVertical: 12,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryItem: {
      flex: 1,
      alignItems: 'center',
    },
    summaryValue: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
    },
    summaryLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    summaryDivider: {
      width: 1,
      backgroundColor: colors.border,
      marginHorizontal: 12,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.textSecondary,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.textSecondary,
    },
    companyListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    companyListIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    companyListInfo: {
      flex: 1,
    },
    companyListName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    companyListCode: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    companyListStats: {
      flexDirection: 'row',
      marginTop: 2,
      gap: 16,
    },
    companyListStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    companyListStatText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    licenseIndicator: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    licenseIndicatorText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    companyCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginTop: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    companyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    companyIcon: {
      width: 56,
      height: 56,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    companyInfo: {
      flex: 1,
    },
    companyName: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    companyCode: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    section: {
      marginTop: 8,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    statsContainer: {
      flexDirection: 'row',
      gap: 10,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    statIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
    },
    statInput: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.primary,
      textAlign: 'center',
      minWidth: 50,
      borderBottomWidth: 1,
      borderBottomColor: colors.primary,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
    },
    expiryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    expiryCardExpired: {
      borderColor: colors.danger,
      backgroundColor: colors.dangerBackground,
    },
    expiryCardWarning: {
      borderColor: colors.warning,
      backgroundColor: colors.warningBackground,
    },
    expiryDate: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    dateInput: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
      borderBottomWidth: 1,
      borderBottomColor: colors.primary,
    },
    expiryBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    expiryBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    modulesContainer: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    moduleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    moduleItemActive: {
      backgroundColor: colors.successBackground + '50',
    },
    moduleText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    moduleTextActive: {
      color: colors.text,
      fontWeight: '500',
    },
    saveButtonContainer: {
      marginTop: 16,
      marginBottom: 16,
    },
    editAllButtonContainer: {
      marginTop: 24,
      marginBottom: 16,
    },
    editAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.goldBackground,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.gold,
    },
    editAllButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.gold,
      flex: 1,
    },
    bottomPadding: {
      height: 100,
    },
    // Add Company Form Styles
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    sectionIcon: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    formCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      padding: 16,
    },
    formGroup: {
    },
    formGroupRow: {
      flexDirection: 'row',
      gap: 12,
    },
    formGroupHalf: {
      flex: 1,
    },
    formGroupRow3: {
      flexDirection: 'row',
      paddingHorizontal: 14,
      paddingVertical: 6,
      gap: 8,
    },
    formGroupThird: {
      flex: 1,
    },
    versionButtonsContainer: {
      flexDirection: 'row',
      gap: 6,
    },
    versionButton: {
      flex: 1,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    versionButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    versionButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    versionButtonTextActive: {
      color: '#FFFFFF',
    },
    formLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputIcon: {
      marginLeft: 12,
    },
    formInput: {
      flex: 1,
      height: 44,
      paddingHorizontal: 12,
      fontSize: 15,
      color: colors.text,
    },
    passwordInput: {
      paddingRight: 48,
    },
    licenseKeyInput: {
      fontSize: 12,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      letterSpacing: 0.5,
      paddingRight: 48,
    },
    refreshButton: {
      position: 'absolute',
      right: 12,
      padding: 4,
    },
    passwordToggle: {
      position: 'absolute',
      right: 12,
      padding: 4,
    },
    formDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginLeft: 16,
    },
    programItem: {
      paddingVertical: 2,
    },
    programCheckboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 10,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSecondary,
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    programIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    programLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    programLabelActive: {
      color: colors.text,
      fontWeight: '600',
    },
    programDataNameContainer: {
      paddingHorizontal: 12,
      paddingBottom: 8,
      marginLeft: 44,
    },
    dataNameLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    dataNameInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      gap: 6,
    },
    dataNameInput: {
      flex: 1,
      height: 36,
      fontSize: 13,
      color: colors.text,
    },
    textAlignRight: {
      textAlign: 'right',
    },
    // Period styles
    periodsContainer: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    periodsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    periodsTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    addPeriodButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    addPeriodText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    periodItem: {
      marginBottom: 8,
    },
    periodInputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },
    periodInputWrapper: {
      flex: 1,
    },
    periodInputLabel: {
      fontSize: 10,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    periodInput: {
      height: 36,
      fontSize: 13,
      color: colors.text,
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
    },
    removePeriodButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.dangerBackground,
      borderRadius: 8,
    },
    noPeriodsText: {
      fontSize: 12,
      color: colors.textTertiary,
      fontStyle: 'italic',
      textAlign: 'center',
      paddingVertical: 8,
    },
    uploadTypeContainer: {
      gap: 10,
    },
    uploadTypeOption: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 12,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    uploadTypeOptionActive: {
      backgroundColor: colors.goldBackground,
      borderColor: colors.gold,
    },
    uploadTypeTextContainer: {
      flex: 1,
    },
    uploadTypeLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    uploadTypeLabelActive: {
      color: colors.gold,
    },
    uploadTypeDesc: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    // Date Picker Styles
    dateInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      height: 44,
      paddingRight: 12,
    },
    dateInputText: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      paddingHorizontal: 12,
    },
    dateInputPlaceholder: {
      color: colors.placeholder,
    },
    clearDateButton: {
      padding: 4,
    },
    datePickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    datePickerContainer: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 340,
    },
    datePickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    datePickerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    datePickerInputs: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    datePickerInputGroup: {
      flex: 1,
    },
    datePickerLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
      textAlign: 'center',
    },
    datePickerInput: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      height: 48,
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    datePickerButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    datePickerButton: {
      flex: 1,
    },
    // Info Note
    infoNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.primaryBackground,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    infoNoteText: {
      flex: 1,
      fontSize: 12,
      color: colors.primary,
      lineHeight: 18,
    },
    // Eye button for password
    eyeButton: {
      padding: 10,
    },
  });
