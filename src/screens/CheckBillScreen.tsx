import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import DateFilter, { DatePreset } from '../components/DateFilter';
import BackButton from '../components/BackButton';
import SearchButton from '../components/SearchButton';
import TabBar, { TabName } from '../components/TabBar';
import checkBillService, { CheckBillItem, CheckBillMovement } from '../services/checkbill.service';
import { authService } from '../services/auth.service';

interface CheckBillScreenProps {
  onGoBack: () => void;
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

// Document type options
const DOCUMENT_TYPES = [
  { id: 'all', label: 'Tümü', value: '%' },
  { id: 'check', label: 'Çek', value: 'Çek' },
  { id: 'bill', label: 'Senet', value: 'Senet' },
];

// Document location options
const DOCUMENT_LOCATIONS = [
  { id: 'all', label: 'Tümü', value: '%' },
  { id: 'portfolio', label: 'Portföy', value: 'Portföy' },
  { id: 'endorsed', label: 'Ciro', value: 'Ciro' },
  { id: 'bank', label: 'Banka', value: 'Banka' },
  { id: 'returned', label: 'İade', value: 'İade' },
  { id: 'collected', label: 'Tahsilat', value: 'Tahsilat' },
  { id: 'paid', label: 'Ödeme', value: 'Ödeme' },
  { id: 'given', label: 'Verilen', value: 'Verilen' },
  { id: 'received', label: 'Alınan', value: 'Alınan' },
  { id: 'returnedReceived', label: 'İade Alınan', value: 'İade Alınan' },
  { id: 'partialCollected', label: 'Parçalı Tahsil', value: 'Parçalı Tahsil' },
  { id: 'partialPaid', label: 'Parçalı Ödeme', value: 'Parçalı Ödeme' },
];

export default function CheckBillScreen({ onGoBack, onTabChange, onLogout }: CheckBillScreenProps) {
  const { colors, isDark } = useTheme();
  const { user, logout, notificationCount } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');

  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CheckBillItem[]>([]);
  const [filterVisible, setFilterVisible] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Date filters
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset | null>('month');

  // Document filters
  const [documentType, setDocumentType] = useState('%');
  const [documentLocation, setDocumentLocation] = useState('%');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Date formatters
  const formatDateToDisplay = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}.${month}.${year}`;
  };

  // Initial dates - first and last day of month
  const getInitialDates = () => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
      start: formatDateToDisplay(monthStart),
      end: formatDateToDisplay(monthEnd),
      startObj: monthStart,
      endObj: monthEnd,
    };
  };

  const initialDates = getInitialDates();
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [startDateObj, setStartDateObj] = useState(initialDates.startObj);
  const [endDateObj, setEndDateObj] = useState(initialDates.endObj);

  const styles = createStyles(colors, isDark);

  // Get document type label
  const getDocumentTypeLabel = (type: string): string => {
    if (!type) return '';
    const normalized = type.toLocaleUpperCase('tr-TR').trim();
    const mapping: { [key: string]: string } = {
      'ÇEK': 'Çek',
      'CEK': 'Çek',
      'SENET': 'Senet',
    };
    return mapping[normalized] || type.charAt(0).toLocaleUpperCase('tr-TR') + type.slice(1).toLowerCase();
  };

  // Get document location label
  const getDocumentLocationLabel = (location: string): string => {
    if (!location) return '';
    const normalized = location.toLocaleUpperCase('tr-TR').replace(/_/g, ' ').trim();
    const mapping: { [key: string]: string } = {
      'PORTFÖY': 'Portföy',
      'PORTFÖYDE': 'Portföy',
      'CİRO': 'Ciro',
      'BANKA': 'Banka',
      'İADE': 'İade',
      'TAHSİLAT': 'Tahsilat',
      'TAHSILAT': 'Tahsilat',
      'ÖDEME': 'Ödeme',
      'ODEME': 'Ödeme',
      'VERİLEN': 'Verilen',
      'VERILEN': 'Verilen',
      'ALINAN': 'Alınan',
      'İADE ALINAN': 'İade Alınan',
      'IADE ALINAN': 'İade Alınan',
      'PARÇALI TAHSİL': 'Parçalı Tahsil',
      'PARCALI TAHSIL': 'Parçalı Tahsil',
      'PARÇALI TAHSİLAT': 'Parçalı Tahsil',
      'PARCALI TAHSILAT': 'Parçalı Tahsil',
      'PARÇALI ÖDEME': 'Parçalı Ödeme',
      'PARCALI ODEME': 'Parçalı Ödeme',
    };
    if (mapping[normalized]) {
      return mapping[normalized];
    }
    return location
      .toLowerCase()
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Calculate date range based on preset
  const calculateDateRange = (preset: DatePreset) => {
    const today = new Date();
    let start = today;
    let end = today;

    switch (preset) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'week':
        const day = today.getDay();
        const diffStart = today.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(today.getFullYear(), today.getMonth(), diffStart);
        const diffEnd = diffStart + 6;
        end = new Date(today.getFullYear(), today.getMonth(), diffEnd);
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'year':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
    }

    return {
      start: formatDateToDisplay(start),
      end: formatDateToDisplay(end),
      startObj: start,
      endObj: end,
    };
  };

  // Update dates when preset changes
  useEffect(() => {
    if (selectedDatePreset) {
      const { start, end, startObj, endObj } = calculateDateRange(selectedDatePreset);
      setStartDate(start);
      setEndDate(end);
      setStartDateObj(startObj);
      setEndDateObj(endObj);
    }
  }, [selectedDatePreset]);

  // Date handlers
  const handleStartDateChange = (date: Date) => {
    setStartDateObj(date);
    setStartDate(formatDateToDisplay(date));
    setSelectedDatePreset(null);
  };

  const handleEndDateChange = (date: Date) => {
    setEndDateObj(date);
    setEndDate(formatDateToDisplay(date));
    setSelectedDatePreset(null);
  };

  const handlePresetChange = (preset: DatePreset) => {
    setSelectedDatePreset(preset);
  };

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCardId(prev => prev === cardId ? null : cardId);
  };

  // Filtered data (search only - document filters done in API)
  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) {
      return [];
    }

    let filtered = data;

    // Search filter (frontend only)
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.documentNo?.toLowerCase().includes(searchLower) ||
        item.customerName?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [data, searchText]);

  // Monthly summary calculation
  const monthlySummary = useMemo(() => {
    if (!Array.isArray(filteredData) || filteredData.length === 0) {
      return [];
    }

    const monthlyData: { [key: string]: { collected: number; paid: number } } = {};

    filteredData.forEach((item) => {
      const month = item.dueMonth || 'Bilinmeyen';
      if (!monthlyData[month]) {
        monthlyData[month] = { collected: 0, paid: 0 };
      }

      const amount = item.remaining || 0;
      const locationNormalized = (item.documentLocation || '').toUpperCase().replace(/_/g, ' ');

      // Collection category (income)
      const isCollection = [
        'TAHSİLAT', 'PARÇALI TAHSİL', 'İADE ALINAN',
        'TAHSILAT', 'PARCALI TAHSIL', 'IADE ALINAN',
        'ALINAN'
      ].includes(locationNormalized);

      // Payment category (expense)
      const isPayment = [
        'ÖDEME', 'PARÇALI ÖDEME',
        'ODEME', 'PARCALI ODEME',
        'VERİLEN', 'VERILEN'
      ].includes(locationNormalized);

      if (isCollection) {
        monthlyData[month].collected += amount;
      } else if (isPayment) {
        monthlyData[month].paid += amount;
      } else {
        monthlyData[month].collected += amount;
      }
    });

    return Object.entries(monthlyData).map(([month, values]) => ({
      month,
      collected: values.collected,
      paid: values.paid,
      difference: values.collected - values.paid,
    }));
  }, [filteredData]);

  // Amount formatter
  const formatAmount = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toFixed(0);
  };

  // Close dropdowns when filter is hidden
  useEffect(() => {
    if (!filterVisible) {
      setShowTypeDropdown(false);
      setShowLocationDropdown(false);
    }
  }, [filterVisible]);

  // Convert display date (dd.MM.yyyy) to API date (yyyy-MM-dd)
  const toApiDate = (displayDate: string): string => {
    const parts = displayDate.split('.');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return displayDate;
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await authService.getToken();
      if (!token) {
        setError('Oturum bilgisi bulunamadı');
        return;
      }
      const dataName = user?.firmaAyarlar?.veritabani?.veriAdi || '';
      if (!dataName) {
        setError('Firma veritabanı bilgisi bulunamadı');
        return;
      }
      const response = await checkBillService.getList(token, dataName, {
        startDate: toApiDate(startDate),
        endDate: toApiDate(endDate),
        documentType,
        documentLocation,
      });
      if (response.success && response.data) {
        setData(response.data.data || []);
      } else {
        setError(response.message || 'Veri alınamadı');
      }
    } catch (err: any) {
      setError(err.message || 'Çek/Senet listesi alınamadı');
    } finally {
      setIsLoading(false);
    }
  }, [user, startDate, endDate, documentType, documentLocation]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // Filter button for header
  const FilterButton = (
    <SearchButton onPress={() => setFilterVisible(!filterVisible)} />
  );

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {/* Header */}
        <Header
          title="Çek / Senet"
          leftButton={<BackButton onPress={onGoBack} />}
          rightButton={FilterButton}
          showMenu={true}
          onLogout={handleLogout}
        />

      {/* Filter Section */}
      {filterVisible && (
        <DateFilter
          selectedPreset={selectedDatePreset}
          onPresetChange={handlePresetChange}
          startDate={startDate}
          endDate={endDate}
          startDateObj={startDateObj}
          endDateObj={endDateObj}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
          showSearch={true}
          searchValue={searchText}
          onSearchChange={setSearchText}
        />
      )}

      {/* Document Filters */}
      {filterVisible && (
        <View style={styles.documentFilters}>
          <View style={styles.selectRow}>
            {/* Document Type Select */}
            <View style={styles.selectContainer}>
              <Pressable
                style={[styles.selectButton, showTypeDropdown && styles.selectButtonActive]}
                onPress={() => {
                  setShowTypeDropdown(!showTypeDropdown);
                  setShowLocationDropdown(false);
                }}
              >
                <Text style={styles.selectLabel}>Evrak Tipi</Text>
                <View style={styles.selectValueRow}>
                  <Text style={styles.selectValue}>
                    {DOCUMENT_TYPES.find(t => t.value === documentType)?.label || 'Tümü'}
                  </Text>
                  <Icon
                    name={showTypeDropdown ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.text}
                  />
                </View>
              </Pressable>

              {showTypeDropdown && (
                <View style={styles.dropdown}>
                  {DOCUMENT_TYPES.map((type) => {
                    const isSelected = documentType === type.value;
                    return (
                      <Pressable
                        key={type.id}
                        style={[styles.dropdownOption, isSelected && styles.dropdownOptionSelected]}
                        onPress={() => {
                          setDocumentType(type.value);
                          setShowTypeDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextSelected]}>
                          {type.label}
                        </Text>
                        {isSelected && <Icon name="checkmark" size={18} color={colors.primary} />}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Document Location Select */}
            <View style={styles.selectContainer}>
              <Pressable
                style={[styles.selectButton, showLocationDropdown && styles.selectButtonActive]}
                onPress={() => {
                  setShowLocationDropdown(!showLocationDropdown);
                  setShowTypeDropdown(false);
                }}
              >
                <Text style={styles.selectLabel}>Evrak Yeri</Text>
                <View style={styles.selectValueRow}>
                  <Text style={styles.selectValue}>
                    {DOCUMENT_LOCATIONS.find(l => l.value === documentLocation)?.label || 'Tümü'}
                  </Text>
                  <Icon
                    name={showLocationDropdown ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.text}
                  />
                </View>
              </Pressable>

              {showLocationDropdown && (
                <View style={styles.dropdown}>
                  {DOCUMENT_LOCATIONS.map((loc) => {
                    const isSelected = documentLocation === loc.value;
                    return (
                      <Pressable
                        key={loc.id}
                        style={[styles.dropdownOption, isSelected && styles.dropdownOptionSelected]}
                        onPress={() => {
                          setDocumentLocation(loc.value);
                          setShowLocationDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextSelected]}>
                          {loc.label}
                        </Text>
                        {isSelected && <Icon name="checkmark" size={18} color={colors.primary} />}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <View style={styles.emptyContainer}>
          <EmptyState title={error} icon="alert-circle-outline" />
          <Pressable style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={fetchData}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      ) : filteredData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Monthly Summary Chart */}
          {monthlySummary.length > 0 && (
            <View style={styles.chartContainer}>
              <View style={styles.chartHeader}>
                <View style={styles.chartTitleRow}>
                  <Icon name="bar-chart-outline" size={20} color={colors.primary} />
                  <Text style={styles.chartTitle}>Aylık Özet</Text>
                </View>
                <View style={styles.filterInfo}>
                  <Text style={styles.filterInfoText}>
                    {startDate} • {endDate}
                    {' • '}
                    {documentType === '%' ? 'Tümü' : getDocumentTypeLabel(documentType)}
                    {' • '}
                    {documentLocation === '%' ? 'Tümü' : getDocumentLocationLabel(documentLocation)}
                  </Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chartContent}>
                  {monthlySummary.map((item, index) => {
                    const maxValue = Math.max(
                      ...monthlySummary.map(m => Math.max(m.collected, m.paid))
                    );
                    const collectedHeight = maxValue > 0 ? (item.collected / maxValue) * 100 : 0;
                    const paidHeight = maxValue > 0 ? (item.paid / maxValue) * 100 : 0;

                    return (
                      <View key={index} style={styles.chartBar}>
                        <View style={styles.barContainer}>
                          <View style={[styles.bar, styles.barCollected, { height: `${collectedHeight}%` }]} />
                          <View style={[styles.bar, styles.barPaid, { height: `${paidHeight}%` }]} />
                        </View>
                        <Text style={styles.monthLabel} numberOfLines={1}>
                          {item.month.substring(0, 3)}
                        </Text>
                        <View style={styles.amountContainer}>
                          <Text style={[styles.amountText, styles.collectedText]}>
                            {formatAmount(item.collected)}
                          </Text>
                          <Text style={[styles.amountText, styles.paidText]}>
                            {formatAmount(item.paid)}
                          </Text>
                          <Text style={[styles.amountText, item.difference >= 0 ? styles.positiveText : styles.negativeText]}>
                            {item.difference >= 0 ? '+' : ''}{formatAmount(Math.abs(item.difference))}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Legend */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.legendText}>Tahsil</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.legendText}>Tediye</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: colors.primary }]} />
                  <Text style={styles.legendText}>Fark</Text>
                </View>
              </View>
            </View>
          )}

          {/* Check/Bill List */}
          <View style={styles.listContainer}>
            <Text style={styles.listTitle}>Çek/Senet Kayıtları ({filteredData.length})</Text>

            {filteredData.map((item) => {
              const isCheck = item.documentType === 'check';
              const locationNormalized = (item.documentLocation || '').toUpperCase().replace(/_/g, ' ');

              const isCollection = [
                'TAHSİLAT', 'PARÇALI TAHSİL', 'İADE ALINAN',
                'TAHSILAT', 'PARCALI TAHSIL', 'IADE ALINAN',
                'ALINAN'
              ].includes(locationNormalized);

              const isPayment = [
                'ÖDEME', 'PARÇALI ÖDEME',
                'ODEME', 'PARCALI ODEME',
                'VERİLEN', 'VERILEN'
              ].includes(locationNormalized);

              const cardColor = isCollection ? '#10B981' : isPayment ? '#EF4444' : '#F59E0B';
              const typeColor = isCheck ? '#06B6D4' : '#8B5CF6';
              const isExpanded = expandedCardId === item.id;

              return (
                <View key={item.id} style={styles.card}>
                  {/* Header - Clickable */}
                  <Pressable
                    style={styles.cardHeader}
                    onPress={() => toggleCardExpansion(item.id)}
                  >
                    <View style={styles.cardHeaderLeft}>
                      <View style={[styles.typeIndicator, { backgroundColor: `${typeColor}30` }]}>
                        <Icon
                          name={isCheck ? 'card-outline' : 'document-text-outline'}
                          size={16}
                          color={typeColor}
                        />
                        <Text style={[styles.typeText, { color: typeColor }]}>
                          {isCheck ? 'Çek' : 'Senet'}
                        </Text>
                      </View>

                      <View style={[styles.statusBadge, { backgroundColor: `${cardColor}30` }]}>
                        <View style={[styles.statusDot, { backgroundColor: cardColor }]} />
                        <Text style={[styles.statusText, { color: cardColor }]}>
                          {getDocumentLocationLabel(item.documentLocation)}
                        </Text>
                      </View>

                      <View style={[styles.currencyBadge, { backgroundColor: `${cardColor}30` }]}>
                        <Text style={[styles.currencyText, { color: cardColor }]}>
                          {item.currency || 'TL'}
                        </Text>
                      </View>
                    </View>

                    <Icon
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </Pressable>

                  {/* Customer - Always visible */}
                  <View style={[styles.customerContainer, isExpanded && styles.customerContainerExpanded]}>
                    <Icon name="person-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.customerName} numberOfLines={1}>
                      {item.customerName}
                    </Text>
                  </View>

                  {/* Details - Expandable */}
                  {isExpanded && (
                    <>
                      {/* Document No */}
                      <View style={styles.cardRow}>
                        <Text style={styles.cardLabel}>Evrak No</Text>
                        <Text style={styles.cardValue}>{item.documentNo}</Text>
                      </View>

                      {/* Date · Due Date */}
                      <View style={styles.cardRow}>
                        <Text style={styles.cardLabel}>Vade Tarihi</Text>
                        <Text style={styles.cardValue}>
                          {item.documentDate} • {item.dueDate}
                        </Text>
                      </View>

                      {/* Payment Date */}
                      {item.paymentDate && (
                        <View style={styles.cardRow}>
                          <Text style={styles.cardLabel}>Ödeme Tarihi</Text>
                          <Text style={styles.cardValue}>{item.paymentDate}</Text>
                        </View>
                      )}

                      {/* Bank */}
                      {item.bank && (
                        <View style={styles.cardRow}>
                          <Text style={styles.cardLabel}>Banka</Text>
                          <Text style={styles.cardValue} numberOfLines={1}>{item.bank}</Text>
                        </View>
                      )}

                      {/* Bank Branch */}
                      {item.bankBranch && (
                        <View style={styles.cardRow}>
                          <Text style={styles.cardLabel}>Banka Şube</Text>
                          <Text style={styles.cardValue} numberOfLines={1}>{item.bankBranch}</Text>
                        </View>
                      )}

                      {/* Bank Account */}
                      {item.bankAccount && (
                        <View style={styles.cardRow}>
                          <Text style={styles.cardLabel}>Banka Hesap</Text>
                          <Text style={styles.cardValue} numberOfLines={1}>{item.bankAccount}</Text>
                        </View>
                      )}

                      {/* Movements Timeline */}
                      {item.movements && item.movements.length > 0 && (
                        <View style={styles.movementsSection}>
                          <View style={styles.movementsHeader}>
                            <Icon name="list-outline" size={16} color={colors.primary} />
                            <Text style={styles.movementsTitle}>Hareketler</Text>
                            <Text style={styles.movementsCount}>({item.movements.length})</Text>
                          </View>

                          {item.movements.map((movement, index) => {
                            const isLast = index === item.movements!.length - 1;
                            const movementColor = movement.type === 'in' ? '#10B981' : colors.textSecondary;

                            return (
                              <View key={movement.id} style={styles.movementItem}>
                                <View style={styles.movementTimeline}>
                                  <View style={[styles.movementDot, { backgroundColor: movementColor }]} />
                                  {!isLast && <View style={styles.movementLine} />}
                                </View>

                                <View style={styles.movementContent}>
                                  <View style={styles.movementTopRow}>
                                    <View style={styles.movementLeftColumn}>
                                      <View style={[styles.movementBadge, { backgroundColor: `${movementColor}15` }]}>
                                        <Text style={[styles.movementLocation, { color: movementColor }]}>
                                          {getDocumentLocationLabel(movement.location)}
                                        </Text>
                                      </View>
                                      <Text style={styles.movementDate}>{movement.date}</Text>
                                    </View>
                                    <Text style={[styles.movementAmount, { color: movementColor }]}>
                                      {movement.type === 'in' ? '+' : ''}
                                      {movement.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {movement.currency}
                                    </Text>
                                  </View>

                                  {movement.customer && (
                                    <Text style={styles.movementCustomer} numberOfLines={1}>
                                      {movement.customer}
                                    </Text>
                                  )}

                                  {movement.description && (
                                    <Text style={styles.movementDescription} numberOfLines={2}>
                                      {movement.description}
                                    </Text>
                                  )}
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </>
                  )}

                  {/* Footer - Always visible */}
                  <View style={styles.cardFooter}>
                    <View style={styles.amountSection}>
                      <Text style={styles.amountLabel}>{'TUTAR'.toLocaleUpperCase('tr-TR')}</Text>
                      <Text style={[styles.amountValue, { color: cardColor }]}>
                        {item.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>

                    <View style={styles.footerDivider} />

                    <View style={styles.amountSection}>
                      <Text style={styles.amountLabel}>{'ÖDENEN'.toLocaleUpperCase('tr-TR')}</Text>
                      <Text style={[styles.amountValue, { color: colors.success }]}>
                        {(item.paid || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>

                    <View style={styles.footerDivider} />

                    <View style={styles.amountSection}>
                      <Text style={styles.amountLabel}>{'KALAN'.toLocaleUpperCase('tr-TR')}</Text>
                      <Text style={[styles.amountValue, { color: colors.warning }]}>
                        {item.remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

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

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  listContainer: {
    gap: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  currencyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
  },
  customerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerContainerExpanded: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  customerName: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '700',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  amountSection: {
    flex: 1,
    gap: 4,
  },
  footerDivider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.border,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  chartContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  filterInfoText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chartContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingVertical: 16,
  },
  chartBar: {
    alignItems: 'center',
    gap: 8,
    width: 70,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 120,
    gap: 4,
  },
  bar: {
    width: 18,
    borderRadius: 4,
    minHeight: 4,
  },
  barCollected: {
    backgroundColor: '#10B981',
  },
  barPaid: {
    backgroundColor: '#EF4444',
  },
  monthLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  amountContainer: {
    gap: 2,
    alignItems: 'center',
  },
  amountText: {
    fontSize: 10,
    fontWeight: '600',
  },
  collectedText: {
    color: '#10B981',
  },
  paidText: {
    color: '#EF4444',
  },
  positiveText: {
    color: colors.primary,
  },
  negativeText: {
    color: '#F59E0B',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  documentFilters: {
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectContainer: {
    flex: 1,
    position: 'relative',
  },
  selectButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  selectButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBackground,
  },
  selectLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  selectValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 1000,
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownOptionSelected: {
    backgroundColor: colors.primaryBackground,
  },
  dropdownOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  dropdownOptionTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  // Movements Timeline Styles
  movementsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  movementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  movementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  movementsCount: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  movementItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  movementTimeline: {
    width: 24,
    alignItems: 'center',
    paddingTop: 4,
  },
  movementDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  movementLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    minHeight: 40,
  },
  movementContent: {
    flex: 1,
    paddingBottom: 12,
  },
  movementTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  movementLeftColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  movementBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  movementLocation: {
    fontSize: 11,
    fontWeight: '600',
  },
  movementDate: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  movementAmount: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 0,
  },
  movementCustomer: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  movementDescription: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
