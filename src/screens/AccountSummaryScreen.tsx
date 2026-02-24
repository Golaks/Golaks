import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import BackButton from '../components/BackButton';
import IconButton from '../components/IconButton';
import SearchInput from '../components/SearchInput';
import CariCard from '../components/CariCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import AnimatedFilterBar from '../components/AnimatedFilterBar';
import { ACCOUNT_FILTER_OPTIONS, AccountFilterType } from '../constants/FilterOptions';
import accountService, { CariAccount } from '../services/account.service';
import { authService } from '../services/auth.service';

interface AccountSummaryScreenProps {
  onBack?: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

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
          rightButton={<IconButton icon="search-outline" onPress={handleToggleSearch} />}
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

          {/* Filter */}
          <AnimatedFilterBar
            options={ACCOUNT_FILTER_OPTIONS}
            selectedId={selectedFilter}
            onSelect={handleFilterPress}
          />

          {/* Account List */}
          <View style={styles.listContainer}>
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
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      opacity: 0.6,
    },
    listContainer: {
      marginTop: 16,
    },
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 500,
    },
    searchContainer: {
      paddingTop: 0,
      paddingBottom: 12,
      backgroundColor: colors.background,
    },
  });
