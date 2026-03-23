import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import BackButton from '../components/BackButton';
import Tab, { TabOption } from '../components/Tab';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import accountService, { CashBankItem } from '../services/account.service';
import { authService } from '../services/auth.service';

interface CashBankScreenProps {
  onBack?: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

type CashBankTabType = 'all' | 'byBranch';

const CASHBANK_TABS: TabOption<CashBankTabType>[] = [
  { id: 'all', label: 'Tüm Şubeler', icon: 'business-outline' },
  { id: 'byBranch', label: 'Şubeye Göre', icon: 'location-outline' },
];

export default function CashBankScreen({ onBack, onTabChange, onLogout }: CashBankScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, notificationCount } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [selectedTab, setSelectedTab] = useState<CashBankTabType>('all');
  const [kasaList, setKasaList] = useState<CashBankItem[]>([]);
  const [bankaList, setBankaList] = useState<CashBankItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
  const [loadedTabs, setLoadedTabs] = useState<Set<CashBankTabType>>(new Set());
  const isFirstRender = useRef(true);

  const styles = createStyles(colors, isDark);

  // İlk yükleme - "Tüm Şubeler" tabını otomatik yükle
  useEffect(() => {
    loadCashBankSummary();
  }, []);

  // Load cash & bank summary - Lazy loading: Sadece tab değiştiğinde yükle
  useEffect(() => {
    // İlk render'ı skip et - kullanıcı tab'a tıkladığında yükle
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Bu tab daha önce yüklenmediyse yükle
    if (!loadedTabs.has(selectedTab)) {
      loadCashBankSummary();
    }

    // Tab değiştiğinde açık şubeleri sıfırla
    setExpandedBranches(new Set());
  }, [selectedTab]);

  const loadCashBankSummary = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = await authService.getToken();
      if (!token) {
        throw new Error('Token bulunamadı');
      }

      // TODO: dataName'i firma ayarlarından al
      const dataName = 'golaks_demo';
      const groupBy = selectedTab === 'all' ? 'all' : 'branch';

      const response = await accountService.getCashBankSummary(token, dataName, groupBy);

      if (response.success) {
        setKasaList(response.data.kasa);
        setBankaList(response.data.banka);
        // Başarılı yüklemeden sonra bu tab'ı yüklenmiş olarak işaretle
        setLoadedTabs(prev => new Set(prev).add(selectedTab));
      } else {
        throw new Error(response.message || 'Kasa-Banka raporu alınamadı');
      }
    } catch (err: any) {

      // Token süresi dolmuşsa veya geçersizse kullanıcıyı logout et
      if (err.message && (err.message.includes('Invalid or expired token') ||
          err.message.includes('token') || err.message.includes('Token'))) {
        try {
          await logout();
          if (onLogout) {
            onLogout();
          }
        } catch (logoutError) {
        }
      } else {
        setError(err.message || 'Bir hata oluştu');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Döviz bazında grupla (Tüm Şubeler modu için)
  const groupByCurrency = () => {
    const grouped: { [doviz: string]: { kasa: number; banka: number } } = {};

    // Kasa verilerini işle
    kasaList.forEach((item) => {
      if (!grouped[item.doviz]) {
        grouped[item.doviz] = { kasa: 0, banka: 0 };
      }
      grouped[item.doviz].kasa += item.bakiye;
    });

    // Banka verilerini işle
    bankaList.forEach((item) => {
      if (!grouped[item.doviz]) {
        grouped[item.doviz] = { kasa: 0, banka: 0 };
      }
      grouped[item.doviz].banka += item.bakiye;
    });

    return grouped;
  };

  // Şubelere göre grupla
  const groupByBranch = () => {
    const grouped: { [sube: string]: { [doviz: string]: { kasa: number; banka: number } } } = {};

    // Kasa verilerini işle
    kasaList.forEach((item) => {
      if (!grouped[item.sube]) {
        grouped[item.sube] = {};
      }
      if (!grouped[item.sube][item.doviz]) {
        grouped[item.sube][item.doviz] = { kasa: 0, banka: 0 };
      }
      grouped[item.sube][item.doviz].kasa += item.bakiye;
    });

    // Banka verilerini işle
    bankaList.forEach((item) => {
      if (!grouped[item.sube]) {
        grouped[item.sube] = {};
      }
      if (!grouped[item.sube][item.doviz]) {
        grouped[item.sube][item.doviz] = { kasa: 0, banka: 0 };
      }
      grouped[item.sube][item.doviz].banka += item.bakiye;
    });

    return grouped;
  };

  // Şube açma/kapama
  const toggleBranch = (branchName: string) => {
    setExpandedBranches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(branchName)) {
        newSet.delete(branchName);
      } else {
        newSet.add(branchName);
      }
      return newSet;
    });
  };

  // Döviz renkleri
  const getCurrencyColor = (currency: string) => {
    const currencyColors: { [key: string]: { bg: string; text: string; gradient: [string, string] } } = {
      'TL': { bg: '#EF444420', text: '#EF4444', gradient: ['#EF4444', '#DC2626'] },
      'TRY': { bg: '#EF444420', text: '#EF4444', gradient: ['#EF4444', '#DC2626'] },
      'USD': { bg: '#10B98120', text: '#10B981', gradient: ['#10B981', '#059669'] },
      'EUR': { bg: '#3B82F620', text: '#3B82F6', gradient: ['#3B82F6', '#2563EB'] },
      'GBP': { bg: '#8B5CF620', text: '#8B5CF6', gradient: ['#8B5CF6', '#7C3AED'] },
      'BGN': { bg: '#F59E0B20', text: '#F59E0B', gradient: ['#F59E0B', '#D97706'] },
      'CHF': { bg: '#EC489920', text: '#EC4899', gradient: ['#EC4899', '#DB2777'] },
    };
    return currencyColors[currency] || { bg: '#6B728020', text: '#6B7280', gradient: ['#6B7280', '#4B5563'] };
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

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {/* Header */}
        <Header
          title="Kasa & Banka"
          leftButton={<BackButton onPress={onBack} />}
          showMenu={true}
          onLogout={handleLogout}
        />

        {/* Content Area */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Page Title */}
          <View style={styles.pageHeader}>
            <View style={styles.pageTitleContainer}>
              <View style={[styles.pageTitleIcon, { backgroundColor: colors.primary + '15' }]}>
                <Icon name="wallet" size={18} color={colors.primary} />
              </View>
              <Text style={styles.pageTitle}>Kasa & Banka</Text>
            </View>
          </View>

          {/* Tabs */}
          <Tab
            options={CASHBANK_TABS}
            activeTab={selectedTab}
            onTabChange={setSelectedTab}
          />

          {/* Content */}
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
          ) : (
            <View style={[styles.listSection, (!loadedTabs.has(selectedTab) || (kasaList.length === 0 && bankaList.length === 0)) && { flex: 1, justifyContent: 'center' }]}>
              {!loadedTabs.has(selectedTab) && !isLoading ? (
                <EmptyState
                  icon="bar-chart-outline"
                  title="Rapor Hazır"
                  description="Raporu görmek için yukarıdaki sekmelere tıklayın"
                />
              ) : kasaList.length === 0 && bankaList.length === 0 ? (
                <EmptyState />
              ) : (<>
              <View style={styles.listTitleContainer}>
                <Icon
                  name={selectedTab === 'all' ? 'cash-outline' : 'business-outline'}
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={[styles.listTitle, { color: colors.textSecondary }]}>
                  {selectedTab === 'all' ? 'Döviz Bazında Kasa & Banka' : 'Şube Bazında Kasa & Banka'}
                </Text>
              </View>
              {selectedTab === 'byBranch' ? (
                // Şubeye göre accordion view
                Object.entries(groupByBranch()).map(([subeName, dovizler]) => {
                  const isExpanded = expandedBranches.has(subeName);
                  const dovizCount = Object.keys(dovizler).length;

                  return (
                    <View key={subeName} style={styles.subeSection}>
                      {/* Şube Header - Tıklanabilir */}
                      <Pressable
                        style={({ pressed }) => [
                          styles.subeSectionHeader,
                          { backgroundColor: colors.primary + '15' },
                          pressed && styles.subeSectionHeaderPressed,
                        ]}
                        onPress={() => toggleBranch(subeName)}
                      >
                        <View style={[styles.subeHeaderIcon, { backgroundColor: colors.card }]}>
                          <Icon name="business-outline" size={18} color={colors.primary} />
                        </View>
                        <Text style={[styles.subeSectionTitle, { color: colors.text }]}>
                          {subeName}
                        </Text>
                        <View style={[styles.subeHeaderBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.subeHeaderBadgeText}>
                            {dovizCount} Döviz
                          </Text>
                        </View>
                        <Icon
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={colors.primary}
                        />
                      </Pressable>

                      {/* Şube Döviz Kartları - Sadece açıkken göster */}
                      {isExpanded && (
                        <View style={styles.subeCardsContainer}>
                          {Object.entries(dovizler).map(([doviz, data]) => {
                            const currencyStyle = getCurrencyColor(doviz);
                            const total = data.kasa + data.banka;

                            return (
                              <View key={doviz} style={[styles.dovizCard, { backgroundColor: colors.card }]}>
                                {/* Currency Header */}
                                <View style={styles.dovizHeader}>
                                  <LinearGradient
                                    colors={currencyStyle.gradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.currencyBadgeLarge}
                                  >
                                    <Text style={styles.currencyCodeLarge}>{doviz}</Text>
                                  </LinearGradient>
                                  <View style={styles.dovizInfo}>
                                    <Text style={[styles.dovizTitle, { color: colors.text }]}>
                                      {doviz === 'TL' || doviz === 'TRY' ? 'Türk Lirası' :
                                       doviz === 'USD' ? 'Amerikan Doları' :
                                       doviz === 'EUR' ? 'Euro' :
                                       doviz === 'GBP' ? 'İngiliz Sterlini' :
                                       doviz === 'BGN' ? 'Bulgar Levası' :
                                       doviz === 'CHF' ? 'İsviçre Frangı' : doviz}
                                    </Text>
                                    <Text style={[styles.dovizSubtitle, { color: colors.textSecondary }]}>
                                      Döviz Bakiyesi
                                    </Text>
                                  </View>
                                </View>

                                {/* Details */}
                                <View style={styles.dovizDetails}>
                                  <View style={styles.detailRow}>
                                    {/* Kasa */}
                                    <View style={styles.detailItem}>
                                      <View style={[styles.detailIcon, { backgroundColor: '#10B98115' }]}>
                                        <Icon name="wallet-outline" size={16} color="#10B981" />
                                      </View>
                                      <View>
                                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                                          Kasa
                                        </Text>
                                        <Text style={[styles.detailValue, { color: '#10B981' }]}>
                                          {data.kasa.toLocaleString('tr-TR', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </Text>
                                      </View>
                                    </View>

                                    {/* Banka */}
                                    <View style={styles.detailItem}>
                                      <View style={[styles.detailIcon, { backgroundColor: '#3B82F615' }]}>
                                        <Icon name="card-outline" size={16} color="#3B82F6" />
                                      </View>
                                      <View>
                                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                                          Banka
                                        </Text>
                                        <Text style={[styles.detailValue, { color: '#3B82F6' }]}>
                                          {data.banka.toLocaleString('tr-TR', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </Text>
                                      </View>
                                    </View>
                                  </View>

                                  {/* Total */}
                                  <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                                    <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                                      Toplam
                                    </Text>
                                    <Text style={[styles.totalValue, { color: currencyStyle.text }]}>
                                      {total.toLocaleString('tr-TR', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })} {doviz}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                // Döviz bazında view (Tüm Şubeler)
                Object.entries(groupByCurrency()).map(([doviz, data]) => {
                  const currencyStyle = getCurrencyColor(doviz);
                  const total = data.kasa + data.banka;

                  return (
                    <View key={doviz} style={[styles.dovizCard, { backgroundColor: colors.card }]}>
                      {/* Currency Header */}
                      <View style={styles.dovizHeader}>
                        <LinearGradient
                          colors={currencyStyle.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.currencyBadgeLarge}
                        >
                          <Text style={styles.currencyCodeLarge}>{doviz}</Text>
                        </LinearGradient>
                        <View style={styles.dovizInfo}>
                          <Text style={[styles.dovizTitle, { color: colors.text }]}>
                            {doviz === 'TL' || doviz === 'TRY' ? 'Türk Lirası' :
                             doviz === 'USD' ? 'Amerikan Doları' :
                             doviz === 'EUR' ? 'Euro' :
                             doviz === 'GBP' ? 'İngiliz Sterlini' :
                             doviz === 'BGN' ? 'Bulgar Levası' :
                             doviz === 'CHF' ? 'İsviçre Frangı' : doviz}
                          </Text>
                          <Text style={[styles.dovizSubtitle, { color: colors.textSecondary }]}>
                            Döviz Bakiyesi
                          </Text>
                        </View>
                      </View>

                      {/* Details */}
                      <View style={styles.dovizDetails}>
                        <View style={styles.detailRow}>
                          {/* Kasa */}
                          <View style={styles.detailItem}>
                            <View style={[styles.detailIcon, { backgroundColor: '#10B98115' }]}>
                              <Icon name="wallet-outline" size={16} color="#10B981" />
                            </View>
                            <View>
                              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                                Kasa
                              </Text>
                              <Text style={[styles.detailValue, { color: '#10B981' }]}>
                                {data.kasa.toLocaleString('tr-TR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </Text>
                            </View>
                          </View>

                          {/* Banka */}
                          <View style={styles.detailItem}>
                            <View style={[styles.detailIcon, { backgroundColor: '#3B82F615' }]}>
                              <Icon name="card-outline" size={16} color="#3B82F6" />
                            </View>
                            <View>
                              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                                Banka
                              </Text>
                              <Text style={[styles.detailValue, { color: '#3B82F6' }]}>
                                {data.banka.toLocaleString('tr-TR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Total */}
                        <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                            Toplam
                          </Text>
                          <Text style={[styles.totalValue, { color: currencyStyle.text }]}>
                            {total.toLocaleString('tr-TR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} {doviz}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </>)}
          </View>
          )}
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
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      opacity: 0.6,
    },
    centerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 400,
    },
    listSection: {
      marginTop: 4,
    },
    listTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
    },
    listTitle: {
      fontSize: 14,
      fontWeight: '600',
    },
    dovizCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dovizHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 14,
    },
    currencyBadgeLarge: {
      width: 56,
      height: 56,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    currencyCodeLarge: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 1,
    },
    dovizInfo: {
      flex: 1,
    },
    subeLabel: {
      fontSize: 11,
      marginBottom: 2,
    },
    dovizTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    dovizSubtitle: {
      fontSize: 12,
      marginTop: 2,
    },
    dovizDetails: {
      gap: 12,
    },
    detailRow: {
      flexDirection: 'row',
      gap: 12,
    },
    detailItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    detailIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailLabel: {
      fontSize: 11,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '600',
    },
    totalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 12,
      borderTopWidth: 1,
    },
    totalLabel: {
      fontSize: 13,
      fontWeight: '500',
    },
    totalValue: {
      fontSize: 16,
      fontWeight: '700',
    },
    subeSection: {
      marginBottom: 12,
    },
    subeSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 10,
    },
    subeSectionHeaderPressed: {
      opacity: 0.7,
    },
    subeHeaderIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    subeSectionTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
    },
    subeHeaderBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    subeHeaderBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    subeCardsContainer: {
      marginTop: 10,
    },
  });
