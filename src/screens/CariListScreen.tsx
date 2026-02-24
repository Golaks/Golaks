import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable, RefreshControl, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import BackButton from '../components/BackButton';
import IconButton from '../components/IconButton';
import SearchInput from '../components/SearchInput';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import BottomSheet from '../components/BottomSheet';
import Input from '../components/Input';
import DovizSelect from '../components/DovizSelect';
import AnimatedFilterBar from '../components/AnimatedFilterBar';
import { ACCOUNT_FILTER_OPTIONS, AccountFilterType } from '../constants/FilterOptions';
import accountService, { CariAccount, CariBalance } from '../services/account.service';
import { authService } from '../services/auth.service';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import { useFormValidation } from '../hooks/useFormValidation';

interface Sube {
  id: string;
  name: string;
}

interface CariListScreenProps {
  onBack?: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
  onCariSelect?: (cari: CariAccount) => void;
}

export default function CariListScreen({ onBack, onTabChange, onLogout, onCariSelect }: CariListScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [selectedFilter, setSelectedFilter] = useState<AccountFilterType>('all');
  const [cariList, setCariList] = useState<CariAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [balances, setBalances] = useState<Record<number, CariBalance[]>>({});
  const [loadingBalanceId, setLoadingBalanceId] = useState<number | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const { fields, setValue, validateForm, resetForm } = useFormValidation({
    subeId: '',
    hesapKodu: '',
    unvan: '',
    kisaUnvan: '',
    doviz: 'TL',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [subeler, setSubeler] = useState<Sube[]>([]);
  const [selectedSube, setSelectedSube] = useState<string>('');

  const styles = createStyles(colors, isDark);

  useEffect(() => {
    fetchSubeler();
  }, []);

  useEffect(() => {
    loadCariList();
  }, [selectedFilter, searchQuery, selectedSube]);

  const fetchSubeler = async () => {
    try {
      const token = await authService.getToken();
      if (!token) return;
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || 'golaks_demo';
      const response = await fetch(API_ENDPOINTS.ACCOUNT_SUBELER, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dataName }),
      });
      const data = await response.json();
      if (data.success && data.data?.subeler) {
        setSubeler(data.data.subeler);
      }
    } catch {}
  };

  const loadCariList = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = await authService.getToken();
      if (!token) {
        throw new Error('Token bulunamadı');
      }

      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || 'golaks_demo';

      const response = await accountService.getCariList(
        token,
        dataName,
        selectedFilter,
        searchQuery,
        selectedSube
      );

      if (response.success) {
        setCariList(response.data.data);
      } else {
        throw new Error(response.message || 'Cari listesi alınamadı');
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

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

  const handleRefresh = () => {
    setRefreshing(true);
    setExpandedId(null);
    loadCariList();
  };

  const handleToggleExpand = async (cari: CariAccount) => {
    if (expandedId === cari.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(cari.id);

    if (!balances[cari.id]) {
      try {
        setLoadingBalanceId(cari.id);
        const token = await authService.getToken();
        if (!token) return;

        const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || 'golaks_demo';
        const response = await accountService.getCariBalance(token, dataName, cari.id);

        if (response.success) {
          setBalances(prev => ({ ...prev, [cari.id]: response.data.bakiyeler }));
        }
      } catch {
      } finally {
        setLoadingBalanceId(null);
      }
    }
  };

  const formatCurrency = (amount: number, doviz: string = 'TL') => {
    return `${Math.abs(amount).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${doviz}`;
  };

  const handleResetForm = () => {
    resetForm();
    setValue('doviz', 'TL');
  };

  const handleSaveCari = async () => {
    const isValid = validateForm({
      subeId: [{ required: true, message: 'Şube seçimi zorunludur' }],
      hesapKodu: [{ required: true, message: 'Hesap kodu zorunludur' }],
      unvan: [{ required: true, message: 'Ünvan zorunludur' }],
    });

    if (!isValid) return;

    setIsSaving(true);
    try {
      const token = await authService.getToken();
      if (!token) {
        throw new Error('Token bulunamadı');
      }

      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || 'golaks_demo';

      const response = await accountService.createCari(token, {
        dataName,
        subeId: fields.subeId.value,
        hesapKodu: fields.hesapKodu.value.trim(),
        unvan: fields.unvan.value.trim(),
        kisaUnvan: fields.kisaUnvan.value.trim(),
        doviz: fields.doviz.value,
      });

      if (response.success) {
        setShowAddSheet(false);
        handleResetForm();
        loadCariList();
        Alert.alert('Başarılı', 'Cari hesap başarıyla oluşturuldu.');
      } else {
        throw new Error(response.message || 'Cari hesap oluşturulamadı');
      }
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Cari hesap oluşturulamadı');
    } finally {
      setIsSaving(false);
    }
  };

  const getAccountTypeInfo = (hesapKodu: string) => {
    if (hesapKodu.startsWith('120')) {
      return { color: '#3B82F6', icon: 'person-outline', label: 'Müşteri' };
    } else if (hesapKodu.startsWith('320')) {
      return { color: '#8B5CF6', icon: 'business-outline', label: 'Tedarikçi' };
    } else if (hesapKodu.startsWith('100')) {
      return { color: '#10B981', icon: 'wallet-outline', label: 'Kasa' };
    } else if (hesapKodu.startsWith('102')) {
      return { color: '#F59E0B', icon: 'card-outline', label: 'Banka' };
    } else if (hesapKodu.startsWith('335')) {
      return { color: '#EF4444', icon: 'people-outline', label: 'Personel' };
    }
    return { color: colors.primary, icon: 'person-outline', label: 'Cari' };
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title="Cari Hesaplar"
          leftButton={<BackButton onPress={onBack} />}
          rightButton={
            <View style={styles.headerButtons}>
              <IconButton icon="search-outline" onPress={handleToggleSearch} />
              <IconButton icon="add-outline" onPress={() => {
                const userSubeler = user?.yetkiler?.sube_yetkileri as string[] | undefined;
                if (userSubeler && userSubeler.length > 0) {
                  const matchedSube = subeler.find(s => userSubeler.includes(s.id));
                  if (matchedSube) {
                    setValue('subeId', matchedSube.id);
                  }
                } else if (subeler.length === 1) {
                  setValue('subeId', subeler[0].id);
                }
                setShowAddSheet(true);
              }} />
            </View>
          }
          showMenu={true}
          onLogout={handleLogout}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* Search Input */}
          {searchVisible && (
            <View style={styles.searchContainer}>
              <SearchInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Cari ara..."
              />
            </View>
          )}

          {/* Account Type Filter */}
          <AnimatedFilterBar
            options={ACCOUNT_FILTER_OPTIONS}
            selectedId={selectedFilter}
            onSelect={setSelectedFilter}
          />

          {/* Branch Filter */}
          {subeler.length > 0 && (
            <AnimatedFilterBar
              options={[
                { id: '', label: 'Tüm Şubeler', icon: 'layers-outline', color: colors.primary },
                ...subeler.map(s => ({
                  id: s.id,
                  label: s.name,
                  icon: 'business-outline',
                  color: colors.primary,
                })),
              ]}
              selectedId={selectedSube}
              onSelect={setSelectedSube}
              size="compact"
              style={{ marginTop: 8 }}
            />
          )}

          {/* Cari List */}
          <View style={styles.listContainer}>
            {isLoading ? (
              <View style={styles.centerContainer}>
                <LoadingSpinner />
              </View>
            ) : error ? (
              <EmptyState
                icon="alert-circle-outline"
                title="Hata"
                subtitle={error}
              />
            ) : cariList.length === 0 ? (
              <EmptyState />
            ) : (
              cariList.map((item) => {
                const typeInfo = getAccountTypeInfo(item.hesapKodu);
                const isExpanded = expandedId === item.id;
                const itemBalances = balances[item.id];
                const isLoadingBalance = loadingBalanceId === item.id;

                return (
                  <View key={item.id} style={styles.cariItemWrapper}>
                    <Pressable
                      style={[styles.cariItem, isExpanded && styles.cariItemExpanded]}
                      onPress={() => handleToggleExpand(item)}
                    >
                      <View style={[styles.cariIconContainer, { backgroundColor: typeInfo.color + '15' }]}>
                        <Icon name={typeInfo.icon} size={22} color={typeInfo.color} />
                      </View>
                      <View style={styles.cariInfo}>
                        <Text style={styles.cariUnvan} numberOfLines={1}>
                          {item.unvan}
                        </Text>
                        <View style={styles.cariMeta}>
                          <Text style={styles.cariHesapKodu}>{item.hesapKodu}</Text>
                          <View style={styles.dotSeparator} />
                          <Text style={styles.cariSube}>{item.sube}</Text>
                        </View>
                      </View>
                      <Icon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </Pressable>

                    {/* Expanded Balance Section */}
                    {isExpanded && (
                      <View style={styles.balanceSection}>
                        {isLoadingBalance ? (
                          <View style={styles.balanceLoading}>
                            <LoadingSpinner size={30} showText={false} />
                            <Text style={styles.balanceLoadingText}>Bakiye yükleniyor...</Text>
                          </View>
                        ) : itemBalances && itemBalances.length > 0 ? (
                          itemBalances.map((bakiye, index) => (
                            <View key={index} style={styles.balanceRow}>
                              <View style={styles.balanceLeft}>
                                <View style={[styles.dovizBadge, { backgroundColor: typeInfo.color + '10' }]}>
                                  <Text style={[styles.dovizText, { color: typeInfo.color }]}>
                                    {bakiye.doviz}
                                  </Text>
                                </View>
                                <Text style={styles.balanceLabel}>
                                  {bakiye.durum === 'AB' ? 'Alacak Bakiye' : 'Borç Bakiye'}
                                </Text>
                              </View>
                              <Text style={[
                                styles.balanceAmount,
                                { color: bakiye.durum === 'AB' ? '#10B981' : '#EF4444' }
                              ]}>
                                {formatCurrency(bakiye.bakiye, bakiye.doviz)}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.noBalanceText}>Bakiye bulunamadı</Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        <TabBar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          notificationCount={notificationCount}
        />

        {/* Add Cari Bottom Sheet */}
        <BottomSheet
          visible={showAddSheet}
          title="Yeni Cari Hesap"
          icon="person-add-outline"
          iconColor="#10B981"
          onClose={() => {
            setShowAddSheet(false);
            handleResetForm();
          }}
          onSave={handleSaveCari}
          saveText="Kaydet"
          saveDisabled={isSaving}
        >
          {/* Şube Seçimi */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: fields.subeId.error ? colors.danger : colors.textSecondary, marginBottom: 8 }}>
              Şube *
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {subeler.map((sube) => {
                const isSelected = fields.subeId.value === sube.id;
                return (
                  <Pressable
                    key={sube.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 16,
                      borderWidth: 1,
                      backgroundColor: isSelected ? colors.primary : colors.card,
                      borderColor: isSelected ? colors.primary : fields.subeId.error ? colors.danger : colors.border,
                      gap: 5,
                    }}
                    onPress={() => setValue('subeId', sube.id)}
                  >
                    <Icon name="business-outline" size={14} color={isSelected ? '#FFFFFF' : colors.textSecondary} />
                    <Text style={{ fontSize: 13, fontWeight: '500', color: isSelected ? '#FFFFFF' : colors.text }}>
                      {sube.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
          <Input
            label="Hesap Kodu"
            icon="key-outline"
            value={fields.hesapKodu.value}
            onChangeText={(v) => setValue('hesapKodu', v)}
            error={fields.hesapKodu.error}
            shake={fields.hesapKodu.shake}
            placeholder="Örn: 120.01.001"
            keyboardType="default"
            containerStyle={{ marginBottom: 16 }}
          />
          <Input
            label="Ünvan"
            icon="business-outline"
            value={fields.unvan.value}
            onChangeText={(v) => setValue('unvan', v)}
            error={fields.unvan.error}
            shake={fields.unvan.shake}
            placeholder="Firma veya kişi adı"
            containerStyle={{ marginBottom: 16 }}
          />
          <Input
            label="Kısa Ünvan"
            icon="text-outline"
            value={fields.kisaUnvan.value}
            onChangeText={(v) => setValue('kisaUnvan', v)}
            placeholder="Kısa ünvan (opsiyonel)"
            containerStyle={{ marginBottom: 16 }}
          />
          <DovizSelect
            value={fields.doviz.value}
            onChange={(kod) => setValue('doviz', kod)}
            required
            containerStyle={{ marginBottom: 16 }}
          />
        </BottomSheet>
      </View>
    </SafeAreaProvider>
  );
}

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
    headerButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    searchContainer: {
      paddingBottom: 12,
    },
    listContainer: {
      marginTop: 12,
    },
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 500,
    },
    cariItemWrapper: {
      marginBottom: 10,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    cariItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
    },
    cariItemExpanded: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    cariIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    cariInfo: {
      flex: 1,
    },
    cariUnvan: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    cariMeta: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cariHesapKodu: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    dotSeparator: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.textTertiary,
      marginHorizontal: 8,
    },
    cariSube: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    // Balance Section
    balanceSection: {
      padding: 14,
      gap: 10,
    },
    balanceLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      gap: 10,
    },
    balanceLoadingText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    balanceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    balanceLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    dovizBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      minWidth: 40,
      alignItems: 'center',
    },
    dovizText: {
      fontSize: 12,
      fontWeight: '700',
    },
    balanceLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    balanceAmount: {
      fontSize: 16,
      fontWeight: '700',
    },
    noBalanceText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
      paddingVertical: 8,
    },
  });
