import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { useHelp } from '../lib/helpContext';
import { View, StyleSheet } from 'react-native';
import { TabName } from '../components/TabBar';
import ApplicationsScreen from '../screens/ApplicationsScreen';
import AIChatScreen from '../screens/AIChatScreen';
import QRScanScreen from '../screens/QRScanScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import NotificationSendScreen from '../screens/NotificationSendScreen';
import CompanyManagementScreen from '../screens/CompanyManagementScreen';
import AccountScreen from '../screens/AccountScreen';
import AccountSummaryScreen from '../screens/AccountSummaryScreen';
import CariDetayScreen from '../screens/CariDetayScreen';
import CashBankScreen from '../screens/CashBankScreen';
import CheckBillScreen from '../screens/CheckBillScreen';
import StockScreen from '../screens/StockScreen';
import TanneryScreen from '../screens/TanneryScreen';
import ConfectionScreen from '../screens/ConfectionScreen';
import ShopScreen from '../screens/ShopScreen';
import BarcodeResultScreen from '../screens/BarcodeResultScreen';
import ModelOperationsScreen from '../screens/ModelOperationsScreen';
import SalesScreen from '../screens/SalesScreen';
import PersonnelPerformanceScreen from '../screens/PersonnelPerformanceScreen';
import CompanyModelPerformanceScreen from '../screens/CompanyModelPerformanceScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ReservationsScreen from '../screens/ReservationsScreen';
import SatisIslemleriScreen from '../screens/SatisIslemleriScreen';
import AgencyPerformanceScreen from '../screens/AgencyPerformanceScreen';
import CariHesaplarScreen from '../screens/CariHesaplarScreen';
import BankaKomisyonScreen from '../screens/BankaKomisyonScreen';
import KasaIslemleriScreen from '../screens/KasaIslemleriScreen';
import FisIslemleriScreen from '../screens/FisIslemleriScreen';
import FiyatHesaplamaScreen from '../screens/FiyatHesaplamaScreen';
import KonfeksiyonUretimScreen from '../screens/KonfeksiyonUretimScreen';
import SiparisIslemleriScreen from '../screens/SiparisIslemleriScreen';
import TabakhaneSiparisScreen from '../screens/TabakhaneSiparisScreen';
import SubeAyarlariScreen from '../screens/SubeAyarlariScreen';

type AppScreen = TabName | 'account' | 'accountSummary' | 'cariDetay' | 'cariHesaplar' | 'cashBank' | 'checkBill' | 'stock' | 'tannery' | 'confection' | 'shop' | 'barcodeResult' | 'modelOperations' | 'shopStock' | 'confectionStock' | 'confectionHammaddeStock' | 'accountSales' | 'shopSales' | 'confectionSales' | 'accountPersonnelPerformance' | 'shopPersonnelPerformance' | 'confectionPersonnelPerformance' | 'accountCompanyModelPerformance' | 'shopCompanyModelPerformance' | 'confectionCompanyModelPerformance' | 'confectionOrders' | 'shopReservations' | 'shopAgencyPerformance' | 'bankaKomisyon' | 'fiyatHesaplama' | 'confectionUretimIslemleri' | 'confectionMaliyetler' | 'confectionSiparisIslemleri' | 'tannerySiparisIslemleri' | 'tanneryStock' | 'subeAyarlari';

interface MainNavigatorProps {
  onLogout?: () => void;
  onCheckUpdate?: () => void;
}

export interface MainNavigatorRef {
  navigateTo: (screen: AppScreen) => void;
}

function MainNavigatorInner({ onLogout, onCheckUpdate }: MainNavigatorProps, ref: React.Ref<MainNavigatorRef>) {
  const [activeScreen, setActiveScreen] = useState<AppScreen>('dashboard');
  const help = useHelp();

  // Help sheet'ten "AI'a Sor" tetiklendiğinde AI Chat tab'ına geç
  useEffect(() => {
    if (help.pendingNavigationTab === 'aiChat') {
      setActiveScreen('aiChat');
      help.clearPendingNavigation();
    }
  }, [help.pendingNavigationTab]);

  const [barcodeQuery, setBarcodeQuery] = useState<{ type: 'barcode' | 'model'; value: string }>({ type: 'barcode', value: '' });
  const [modelOpsFrom, setModelOpsFrom] = useState<'shop' | 'confection'>('shop');
  const [accountTab, setAccountTab] = useState<'reports' | 'transactions'>('reports');
  const [shopTab, setShopTab] = useState<'reports' | 'transactions'>('reports');
  const [confectionTab, setConfectionTab] = useState<'reports' | 'transactions'>('reports');
  const [tanneryTab, setTanneryTab] = useState<'reports' | 'transactions'>('reports');

  useImperativeHandle(ref, () => ({
    navigateTo: (screen: AppScreen) => setActiveScreen(screen),
  }));

  const handleAppNavigation = (appId: string) => {
    switch (appId) {
      case '1':
        setActiveScreen('account');
        break;
      case '2':
        setActiveScreen('tannery');
        break;
      case '3':
        setActiveScreen('confection');
        break;
      case '4':
        setActiveScreen('shop');
        break;
    }
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <ApplicationsScreen onTabChange={setActiveScreen} onLogout={onLogout} onAppPress={handleAppNavigation} onCheckUpdate={onCheckUpdate} />;
      case 'aiChat':
        return <AIChatScreen onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'qrScan':
        return (
          <QRScanScreen
            onTabChange={setActiveScreen}
            onLogout={onLogout}
            onQuery={(queryType, queryValue) => {
              setBarcodeQuery({ type: queryType, value: queryValue });
              setActiveScreen('barcodeResult');
            }}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            onTabChange={setActiveScreen}
            onLogout={onLogout}
            onUserManagement={() => setActiveScreen('userManagement')}
            onNotificationSend={() => setActiveScreen('notificationSend')}
            onCompanyManagement={() => setActiveScreen('companyManagement')}
            onFiyatHesaplama={() => setActiveScreen('fiyatHesaplama')}
            onSubeAyarlari={() => setActiveScreen('subeAyarlari')}
          />
        );
      case 'notifications':
        return <NotificationsScreen onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'userManagement':
        return <UserManagementScreen onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'notificationSend':
        return <NotificationSendScreen onBack={() => setActiveScreen('profile')} onTabChange={setActiveScreen} />;
      case 'companyManagement':
        return <CompanyManagementScreen onGoBack={() => setActiveScreen('profile')} onTabPress={setActiveScreen} />;
      case 'account':
        return (
          <AccountScreen
            onBack={() => setActiveScreen('dashboard')}
            onTabChange={setActiveScreen}
            onLogout={onLogout}
            onAccountSummary={() => setActiveScreen('accountSummary')}
            onCashBank={() => setActiveScreen('cashBank')}
            onCariDetay={() => setActiveScreen('cariDetay')}
            onCheckBill={() => setActiveScreen('checkBill')}
            onStock={() => setActiveScreen('stock')}
            onSales={() => setActiveScreen('accountSales')}
            onPersonnelPerformance={() => setActiveScreen('accountPersonnelPerformance')}
            onCompanyModelPerformance={() => setActiveScreen('accountCompanyModelPerformance')}
            onBankaKomisyon={() => setActiveScreen('bankaKomisyon')}
            onCariHesaplar={() => setActiveScreen('cariHesaplar')}
            onKasaIslemleri={() => setActiveScreen('kasaIslemleri')}
            onFisIslemleri={() => setActiveScreen('fisIslemleri')}
            initialTab={accountTab}
            onActiveTabChange={setAccountTab}
          />
        );
      case 'accountSummary':
        return <AccountSummaryScreen onBack={() => setActiveScreen('account')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'cariDetay':
        return <CariDetayScreen onBack={() => setActiveScreen('account')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'cashBank':
        return <CashBankScreen onBack={() => setActiveScreen('account')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'checkBill':
        return <CheckBillScreen onGoBack={() => setActiveScreen('account')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'stock':
        return <StockScreen onGoBack={() => setActiveScreen('account')} onTabChange={setActiveScreen} onLogout={onLogout} stokModul="muhasebe" />;
      case 'shopStock':
        return <StockScreen onGoBack={() => setActiveScreen('shop')} onTabChange={setActiveScreen} onLogout={onLogout} stokModul="magaza" />;
      case 'confectionStock':
        return <StockScreen onGoBack={() => setActiveScreen('confection')} onTabChange={setActiveScreen} onLogout={onLogout} stokModul="konfeksiyon" />;
      case 'confectionHammaddeStock':
        return <StockScreen onGoBack={() => setActiveScreen('confection')} onTabChange={setActiveScreen} onLogout={onLogout} stokModul="konfeksiyon" stokTipi="hammadde" />;
      case 'tannery':
        return <TanneryScreen onBack={() => setActiveScreen('dashboard')} onTabChange={setActiveScreen} onLogout={onLogout} onStock={() => setActiveScreen('tanneryStock')} onSiparisIslemleri={() => setActiveScreen('tannerySiparisIslemleri')} initialTab={tanneryTab} onActiveTabChange={setTanneryTab} />;
      case 'tanneryStock':
        return <StockScreen onGoBack={() => setActiveScreen('tannery')} onTabChange={setActiveScreen} onLogout={onLogout} stokModul="tabakhane" />;
      case 'tannerySiparisIslemleri':
        return <TabakhaneSiparisScreen onGoBack={() => { setTanneryTab('transactions'); setActiveScreen('tannery'); }} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'confection':
        return (
          <ConfectionScreen
            onBack={() => setActiveScreen('dashboard')}
            onTabChange={setActiveScreen}
            onLogout={onLogout}
            onModelOperations={() => { setModelOpsFrom('confection'); setActiveScreen('modelOperations'); }}
            onUretimIslemleri={() => setActiveScreen('confectionUretimIslemleri')}
            onStock={() => setActiveScreen('confectionStock')}
            onHammaddeStock={() => setActiveScreen('confectionHammaddeStock')}
            onSales={() => setActiveScreen('confectionSales')}
            onPersonnelPerformance={() => setActiveScreen('confectionPersonnelPerformance')}
            onCompanyModelPerformance={() => setActiveScreen('confectionCompanyModelPerformance')}
            onOrders={() => setActiveScreen('confectionOrders')}
            onMaliyetler={() => setActiveScreen('confectionMaliyetler')}
            onSiparisIslemleri={() => setActiveScreen('confectionSiparisIslemleri')}
            initialTab={confectionTab}
            onActiveTabChange={setConfectionTab}
          />
        );
      case 'confectionOrders':
        return <OrdersScreen onGoBack={() => setActiveScreen('confection')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'shop':
        return (
          <ShopScreen
            onBack={() => setActiveScreen('dashboard')}
            onTabChange={setActiveScreen}
            onLogout={onLogout}
            onModelOperations={() => { setModelOpsFrom('shop'); setActiveScreen('modelOperations'); }}
            onStock={() => setActiveScreen('shopStock')}
            onSales={() => setActiveScreen('shopSales')}
            onPersonnelPerformance={() => setActiveScreen('shopPersonnelPerformance')}
            onCompanyModelPerformance={() => setActiveScreen('shopCompanyModelPerformance')}
            onReservations={() => setActiveScreen('shopReservations')}
            onAgencyPerformance={() => setActiveScreen('shopAgencyPerformance')}
            onSalesTransactions={() => setActiveScreen('satisIslemleri')}
            initialTab={shopTab}
            onActiveTabChange={setShopTab}
          />
        );
      case 'satisIslemleri':
        return <SatisIslemleriScreen onGoBack={() => { setShopTab('transactions'); setActiveScreen('shop'); }} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'shopReservations':
        return <ReservationsScreen onGoBack={() => setActiveScreen('shop')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'modelOperations':
        return (
          <ModelOperationsScreen
            onBack={() => setActiveScreen(modelOpsFrom)}
            onTabChange={setActiveScreen}
            onLogout={onLogout}
          />
        );
      case 'barcodeResult':
        return (
          <BarcodeResultScreen
            queryType={barcodeQuery.type}
            queryValue={barcodeQuery.value}
            onGoBack={() => setActiveScreen('qrScan')}
            onTabChange={setActiveScreen}
            onLogout={onLogout}
          />
        );
      case 'accountSales':
        return <SalesScreen onGoBack={() => setActiveScreen('account')} onTabChange={setActiveScreen} onLogout={onLogout} modul="muhasebe" />;
      case 'shopSales':
        return <SalesScreen onGoBack={() => setActiveScreen('shop')} onTabChange={setActiveScreen} onLogout={onLogout} modul="magaza" />;
      case 'confectionSales':
        return <SalesScreen onGoBack={() => setActiveScreen('confection')} onTabChange={setActiveScreen} onLogout={onLogout} modul="konfeksiyon" />;
      case 'accountPersonnelPerformance':
        return <PersonnelPerformanceScreen onGoBack={() => setActiveScreen('account')} onTabChange={setActiveScreen} onLogout={onLogout} modul="muhasebe" />;
      case 'shopPersonnelPerformance':
        return <PersonnelPerformanceScreen onGoBack={() => setActiveScreen('shop')} onTabChange={setActiveScreen} onLogout={onLogout} modul="magaza" />;
      case 'confectionPersonnelPerformance':
        return <PersonnelPerformanceScreen onGoBack={() => setActiveScreen('confection')} onTabChange={setActiveScreen} onLogout={onLogout} modul="konfeksiyon" />;
      case 'accountCompanyModelPerformance':
        return <CompanyModelPerformanceScreen onGoBack={() => setActiveScreen('account')} onTabChange={setActiveScreen} onLogout={onLogout} modul="muhasebe" />;
      case 'shopCompanyModelPerformance':
        return <CompanyModelPerformanceScreen onGoBack={() => setActiveScreen('shop')} onTabChange={setActiveScreen} onLogout={onLogout} modul="magaza" />;
      case 'confectionCompanyModelPerformance':
        return <CompanyModelPerformanceScreen onGoBack={() => setActiveScreen('confection')} onTabChange={setActiveScreen} onLogout={onLogout} modul="konfeksiyon" />;
      case 'shopAgencyPerformance':
        return <AgencyPerformanceScreen onGoBack={() => setActiveScreen('shop')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'cariHesaplar':
        return <CariHesaplarScreen onGoBack={() => { setAccountTab('transactions'); setActiveScreen('account'); }} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'kasaIslemleri':
        return <KasaIslemleriScreen onGoBack={() => { setAccountTab('transactions'); setActiveScreen('account'); }} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'fisIslemleri':
        return <FisIslemleriScreen onGoBack={() => { setAccountTab('transactions'); setActiveScreen('account'); }} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'bankaKomisyon':
        return <BankaKomisyonScreen onGoBack={() => setActiveScreen('account')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'fiyatHesaplama':
        return <FiyatHesaplamaScreen onGoBack={() => setActiveScreen('profile')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'subeAyarlari':
        return <SubeAyarlariScreen onGoBack={() => setActiveScreen('profile')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'confectionUretimIslemleri':
        return <KonfeksiyonUretimScreen onGoBack={() => setActiveScreen('confection')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'confectionMaliyetler':
        return <KonfeksiyonUretimScreen onGoBack={() => setActiveScreen('confection')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'confectionSiparisIslemleri':
        return <SiparisIslemleriScreen onGoBack={() => { setConfectionTab('transactions'); setActiveScreen('confection'); }} onTabChange={setActiveScreen} onLogout={onLogout} />;
      default:
        return <ApplicationsScreen onTabChange={setActiveScreen} onLogout={onLogout} onAppPress={handleAppNavigation} onCheckUpdate={onCheckUpdate} />;
    }
  };

  return <View style={styles.container}>{renderScreen()}</View>;
}

const MainNavigator = forwardRef(MainNavigatorInner);
export default MainNavigator;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
