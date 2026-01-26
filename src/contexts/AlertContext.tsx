import React, {createContext, useContext, useState, ReactNode} from 'react';
import {View, StyleSheet} from 'react-native';
import AlertDialog, {AlertType, AlertDialogProps} from '../components/AlertDialog';

interface AlertMessage {
  id: string;
  type: AlertType;
  title?: string;
  message: string;
  duration?: number;
}

interface AlertContextType {
  showAlert: (
    type: AlertType,
    message: string,
    title?: string,
    duration?: number,
  ) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({children}) => {
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);

  const showAlert = (
    type: AlertType,
    message: string,
    title?: string,
    duration: number = 4000,
  ) => {
    const id = Date.now().toString() + Math.random().toString(36);
    const newAlert: AlertMessage = {
      id,
      type,
      title,
      message,
      duration,
    };

    setAlerts(prev => [...prev, newAlert]);
  };

  const showSuccess = (message: string, title?: string) => {
    showAlert('success', message, title || 'Başarılı');
  };

  const showError = (message: string, title?: string) => {
    showAlert('error', message, title || 'Hata');
  };

  const showWarning = (message: string, title?: string) => {
    showAlert('warning', message, title || 'Uyarı');
  };

  const showInfo = (message: string, title?: string) => {
    showAlert('info', message, title || 'Bilgi');
  };

  const handleClose = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  return (
    <AlertContext.Provider
      value={{
        showAlert,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}>
      {children}
      <View style={styles.alertContainer} pointerEvents="box-none">
        {alerts.map(alert => (
          <AlertDialog
            key={alert.id}
            id={alert.id}
            type={alert.type}
            title={alert.title}
            message={alert.message}
            duration={alert.duration}
            onClose={handleClose}
          />
        ))}
      </View>
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  alertContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
});
