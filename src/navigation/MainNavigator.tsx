import React, { useState } from 'react';
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
import TanneryScreen from '../screens/TanneryScreen';
import ConfectionScreen from '../screens/ConfectionScreen';
import ShopScreen from '../screens/ShopScreen';
import CariListScreen from '../screens/CariListScreen';
import BarcodeResultScreen from '../screens/BarcodeResultScreen';

type AppScreen = TabName | 'account' | 'accountSummary' | 'cariDetay' | 'cariList' | 'cashBank' | 'checkBill' | 'tannery' | 'confection' | 'shop' | 'barcodeResult';

interface MainNavigatorProps {
  onLogout?: () => void;
}

export default function MainNavigator({ onLogout }: MainNavigatorProps) {
  const [activeScreen, setActiveScreen] = useState<AppScreen>('dashboard');

  // Persistent internal tab states (survive sub-screen navigation)
  const [accountTab, setAccountTab] = useState<'reports' | 'transactions'>('reports');
  const [tanneryTab, setTanneryTab] = useState<'reports' | 'transactions'>('reports');
  const [confectionTab, setConfectionTab] = useState<'reports' | 'transactions'>('reports');
  const [shopTab, setShopTab] = useState<'reports' | 'transactions'>('reports');

  // Barcode result screen state
  const [barcodeQuery, setBarcodeQuery] = useState<{ barcode: string; queryType: 'barcode' | 'model' }>({ barcode: '', queryType: 'barcode' });

  const handleBarcodeQuery = (barcode: string, queryType: 'barcode' | 'model') => {
    setBarcodeQuery({ barcode, queryType });
    setActiveScreen('barcodeResult');
  };

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
        return <ApplicationsScreen onTabChange={setActiveScreen} onLogout={onLogout} onAppPress={handleAppNavigation} />;
      case 'aiChat':
        return null;
      case 'qrScan':
        return <QRScanScreen onTabChange={setActiveScreen} onLogout={onLogout} onBarcodeQuery={handleBarcodeQuery} />;
      case 'barcodeResult':
        return (
          <BarcodeResultScreen
            barcode={barcodeQuery.barcode}
            queryType={barcodeQuery.queryType}
            onGoBack={() => setActiveScreen('qrScan')}
            onTabChange={setActiveScreen}
            onLogout={onLogout}
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
            onCariList={() => setActiveScreen('cariList')}
            onCheckBill={() => setActiveScreen('checkBill')}
            accountTab={accountTab}
            onAccountTabChange={setAccountTab}
          />
        );
      case 'accountSummary':
        return <AccountSummaryScreen onBack={() => setActiveScreen('account')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'cariDetay':
        return <CariDetayScreen onBack={() => setActiveScreen('account')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'cariList':
        return <CariListScreen onBack={() => setActiveScreen('account')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'cashBank':
        return <CashBankScreen onBack={() => setActiveScreen('account')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'checkBill':
        return <CheckBillScreen onGoBack={() => setActiveScreen('account')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'tannery':
        return <TanneryScreen onBack={() => setActiveScreen('dashboard')} onTabChange={setActiveScreen} onLogout={onLogout} tanneryTab={tanneryTab} onTanneryTabChange={setTanneryTab} />;
      case 'confection':
        return <ConfectionScreen onBack={() => setActiveScreen('dashboard')} onTabChange={setActiveScreen} onLogout={onLogout} confectionTab={confectionTab} onConfectionTabChange={setConfectionTab} />;
      case 'shop':
        return <ShopScreen onBack={() => setActiveScreen('dashboard')} onTabChange={setActiveScreen} onLogout={onLogout} shopTab={shopTab} onShopTabChange={setShopTab} />;
      default:
        return <ApplicationsScreen onTabChange={setActiveScreen} onLogout={onLogout} onAppPress={handleAppNavigation} />;
    }
  };

  const isAiChat = activeScreen === 'aiChat';

  return (
    <View style={styles.container}>
      {/* AI Chat her zaman mount kalır, tab değişince gizlenir */}
      <View style={[styles.persistentScreen, { display: isAiChat ? 'flex' : 'none' }]}>
        <AIChatScreen onTabChange={setActiveScreen} onLogout={onLogout} />
      </View>
      {!isAiChat && renderScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  persistentScreen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
});
