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
import CashBankScreen from '../screens/CashBankScreen';
import TanneryScreen from '../screens/TanneryScreen';
import ConfectionScreen from '../screens/ConfectionScreen';
import ShopScreen from '../screens/ShopScreen';

type AppScreen = TabName | 'account' | 'accountSummary' | 'cashBank' | 'tannery' | 'confection' | 'shop';

interface MainNavigatorProps {
  onLogout?: () => void;
}

export default function MainNavigator({ onLogout }: MainNavigatorProps) {
  const [activeScreen, setActiveScreen] = useState<AppScreen>('dashboard');

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
        return <AIChatScreen onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'qrScan':
        return <QRScanScreen onTabChange={setActiveScreen} onLogout={onLogout} />;
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
          />
        );
      case 'accountSummary':
        return <AccountSummaryScreen onBack={() => setActiveScreen('account')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'cashBank':
        return <CashBankScreen onBack={() => setActiveScreen('account')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'tannery':
        return <TanneryScreen onBack={() => setActiveScreen('dashboard')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'confection':
        return <ConfectionScreen onBack={() => setActiveScreen('dashboard')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      case 'shop':
        return <ShopScreen onBack={() => setActiveScreen('dashboard')} onTabChange={setActiveScreen} onLogout={onLogout} />;
      default:
        return <ApplicationsScreen onTabChange={setActiveScreen} onLogout={onLogout} onAppPress={handleAppNavigation} />;
    }
  };

  return <View style={styles.container}>{renderScreen()}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
