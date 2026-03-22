import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import BackButton from '../components/BackButton';
import SearchButton from '../components/SearchButton';
import SearchInput from '../components/SearchInput';
import CariCard from '../components/CariCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import accountService, { CariAccount } from '../services/account.service';
import { authService } from '../services/auth.service';

interface AccountSummaryScreenProps {
  onBack?: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

type AccountFilterType = 'all' | 'customers' | 'suppliers' | 'safes' | 'banks' | 'personnel';

interface FilterOption {
  id: AccountFilterType;
  label: string;
  icon: string;
  color: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { id: 'all', label: 'Tümü', icon: 'grid-outline', color: '#6B7280' },
  { id: 'customers', label: 'Müşteriler', icon: 'person-outline', color: '#3B82F6' },
  { id: 'suppliers', label: 'Tedarikçiler', icon: 'business-outline', color: '#8B5CF6' },
  { id: 'safes', label: 'Kasalar', icon: 'wallet-outline', color: '#10B981' },
  { id: 'banks', label: 'Bankalar', icon: 'card-outline', color: '#F59E0B' },
  { id: 'personnel', label: 'Personeller', icon: 'people-outline', color: '#EF4444' },
];

export default function AccountSummaryScreen({ onBack, onTabChange, onLogout }: AccountSummaryScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [selectedFilter, setSelectedFilter] = useState<AccountFilterType>('customers');
  const [cariList, setCariList] = useState<CariAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [expandedCariId, setExpandedCariId] = useState<number | null>(null);
  const [loadingBalances, setLoadingBalances] = useState<Set<number>>(new Set());

  const styles = createStyles(colors, isDark);

  // Load cari list
  useEffect(() => {
    loadCariList();
  }, [selectedFilter, searchQuery]);

  const loadCariList = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = await authService.getToken();
      if (!token) {
        throw new Error('Token bulunamadı');
      }

      // TODO: dataName'i firma ayarlarından al
      const dataName = 'golaks_demo'; // Şimdilik hardcoded

      const response = await accountService.getCariList(
        token,
        dataName,
        selectedFilter,
        searchQuery
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

  const handleFilterPress = (filterId: AccountFilterType) => {
    setSelectedFilter(filterId);
  };

  const handleToggleSearch = () => {
    setSearchVisible(!searchVisible);
    if (searchVisible) {
      setSearchQuery('');
    }
  };

  const handleCariToggle = (cariId: number) => {
    setExpandedCariId(expandedCariId === cariId ? null : cariId);
  };

  const loadCariBalance = async (cariId: number) => {
    try {
      setLoadingBalances(prev => new Set(prev).add(cariId));

      const token = await authService.getToken();
      if (!token) {
        throw new Error('Token bulunamadı');
      }

      // TODO: dataName'i firma ayarlarından al
      const dataName = 'golaks_demo';

      const response = await accountService.getCariBalance(token, dataName, cariId);

      if (response.success) {
        // Update cariList with balance data
        setCariList(prevList =>
          prevList.map(cari =>
            cari.id === cariId
              ? { ...cari, bakiyeler: response.data.bakiyeler }
              : cari
          )
        );
      }
    } catch (err: any) {
    } finally {
      setLoadingBalances(prev => {
        const newSet = new Set(prev);
        newSet.delete(cariId);
        return newSet;
      });
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {/* Header */}
        <Header
          title="Cari Özet"
          leftButton={<BackButton onPress={onBack} />}
          rightButton={<SearchButton onPress={handleToggleSearch} />}
          showMenu={true}
          onLogout={handleLogout}
        />

        {/* Content Area */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
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

          {/* Page Title */}
          <View style={styles.pageHeader}>
            <View style={styles.pageTitleContainer}>
              <View style={[styles.pageTitleIcon, { backgroundColor: colors.primary + '15' }]}>
                <Icon name="people" size={18} color={colors.primary} />
              </View>
              <Text style={styles.pageTitle}>Cari Özet</Text>
            </View>
          </View>

          {/* Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            {FILTER_OPTIONS.map((filter) => {
              const isSelected = selectedFilter === filter.id;
              return (
                <Pressable
                  key={filter.id}
                  style={[
                    styles.filterChip,
                    isSelected && { backgroundColor: filter.color, borderColor: filter.color },
                  ]}
                  onPress={() => handleFilterPress(filter.id)}
                >
                  {filter.color && !isSelected && (
                    <View style={[styles.filterDot, { backgroundColor: filter.color }]} />
                  )}
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected && { color: '#FFF' },
                    ]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Account List */}
          <View style={[styles.listContainer, (cariList.length === 0 || isLoading || error) && { flex: 1, justifyContent: 'center' }]}>
            {isLoading ? (
              <View style={styles.centerContainer}>
                <LoadingSpinner />
              </View>
            ) : error ? (
              <EmptyState
                icon="alert-circle-outline"
                title="Hata"
                description={error}
              />
            ) : cariList.length === 0 ? (
              <EmptyState />
            ) : (
              cariList.map((cari) => (
                <CariCard
                  key={cari.id}
                  cari={cari}
                  expanded={expandedCariId === cari.id}
                  onToggle={() => handleCariToggle(cari.id)}
                  onLoadBalance={() => loadCariBalance(cari.id)}
                  isLoadingBalance={loadingBalances.has(cari.id)}
                />
              ))
            )}
          </View>
        </ScrollView>

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
      flexGrow: 1,
      padding: 16,
      paddingBottom: 100, // Space for TabBar
    },
    pageHeader: {
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
    filterScroll: {
      flexGrow: 0,
      marginBottom: 14,
    },
    filterContent: {
      gap: 8,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: isDark ? colors.card : '#fff',
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
      gap: 6,
    },
    filterDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    listContainer: {
      marginTop: 4,
    },
    centerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 400,
    },
    searchContainer: {
      paddingTop: 0,
      paddingBottom: 12,
      backgroundColor: colors.background,
    },
  });
