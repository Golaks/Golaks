import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { authService } from '../services/auth.service';
import { API_ENDPOINTS } from '../constants/ApiConfig';
import BottomSheet from './BottomSheet';
import Input from './Input';

interface TanimItem {
  id: string;
  tanimDeger: string;
}

interface AddTanimModalProps {
  visible: boolean;
  onClose: () => void;
  tanimKodu: string;
  title?: string;
  placeholder?: string;
  onSuccess: (id: string, deger: string) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, deger: string) => void;
}

export default function AddTanimModal({
  visible,
  onClose,
  tanimKodu,
  title,
  placeholder,
  onSuccess,
  onDelete,
  onUpdate,
}: AddTanimModalProps) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

  const [newValue, setNewValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [items, setItems] = useState<TanimItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const modalTitle = title || `${tanimKodu.charAt(0) + tanimKodu.slice(1).toLowerCase()} Yönetimi`;
  const inputPlaceholder = placeholder || 'Tanım adı girin...';

  const getToken = async () => {
    const token = await authService.getToken();
    if (!token) throw new Error('Token bulunamadı');
    return token;
  };

  const fetchList = useCallback(async () => {
    if (!tanimKodu) return;
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(API_ENDPOINTS.TANIMLAR_LIST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tanimKodu }),
      });
      const data = await response.json();
      if (response.ok && data.data?.items) {
        setItems(data.data.items.map((i: any) => ({ id: i.id, tanimDeger: i.tanimDeger })));
      }
    } catch (_err) {
    } finally {
      setIsLoading(false);
    }
  }, [tanimKodu]);

  useEffect(() => {
    if (visible) {
      fetchList();
      setNewValue('');
      setEditingId(null);
    }
  }, [visible, fetchList]);

  const handleCreate = async () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;

    setIsCreating(true);
    try {
      const token = await getToken();
      const response = await fetch(API_ENDPOINTS.TANIMLAR_CREATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tanimKodu, tanimDeger: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Tanım oluşturulamadı');
      }
      const newItem = { id: data.data.id, tanimDeger: trimmed };
      setItems(prev => [...prev, newItem]);
      setNewValue('');
      onSuccess(data.data.id, trimmed);
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Tanım oluşturulamadı');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (id: string) => {
    const trimmed = editingValue.trim();
    if (!trimmed) return;

    setSavingId(id);
    try {
      const token = await getToken();
      const response = await fetch(API_ENDPOINTS.TANIMLAR_UPDATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, tanimDeger: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Güncellenemedi');
      }
      setItems(prev => prev.map(i => (i.id === id ? { ...i, tanimDeger: trimmed } : i)));
      setEditingId(null);
      onUpdate?.(id, trimmed);
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Güncellenemedi');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = (id: string, deger: string) => {
    Alert.alert('Silme Onayı', `"${deger}" silinecek. Emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          setSavingId(id);
          try {
            const token = await getToken();
            const response = await fetch(API_ENDPOINTS.TANIMLAR_DELETE, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ id }),
            });
            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.error?.message || 'Silinemedi');
            }
            setItems(prev => prev.filter(i => i.id !== id));
            if (editingId === id) setEditingId(null);
            onDelete?.(id);
          } catch (err: any) {
            Alert.alert('Hata', err.message || 'Silinemedi');
          } finally {
            setSavingId(null);
          }
        },
      },
    ]);
  };

  const startEditing = (item: TanimItem) => {
    setEditingId(item.id);
    setEditingValue(item.tanimDeger);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const handleClose = () => {
    setNewValue('');
    setEditingId(null);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={modalTitle}
      icon="list-outline"
    >
      {/* Yeni ekleme */}
      <View style={styles.addRow}>
        <View style={styles.addInputWrapper}>
          <Icon name="add-circle-outline" size={18} color={colors.primary} style={styles.addIcon} />
          <TextInput
            style={styles.addInput}
            value={newValue}
            onChangeText={setNewValue}
            placeholder={inputPlaceholder}
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleCreate}
            returnKeyType="done"
          />
        </View>
        <Pressable
          style={[styles.addBtn, !newValue.trim() && styles.addBtnDisabled]}
          onPress={handleCreate}
          disabled={isCreating || !newValue.trim()}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="checkmark" size={20} color="#fff" />
          )}
        </Pressable>
      </View>

      {/* Liste */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Henüz tanım yok</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          {items.map(item => {
            const isEditing = editingId === item.id;
            const isSaving = savingId === item.id;

            return (
              <View key={item.id} style={styles.itemRow}>
                {isEditing ? (
                  <>
                    <TextInput
                      style={styles.editInput}
                      value={editingValue}
                      onChangeText={setEditingValue}
                      autoFocus
                      autoCapitalize="none"
                      autoCorrect={false}
                      onSubmitEditing={() => handleUpdate(item.id)}
                      returnKeyType="done"
                    />
                    <Pressable
                      style={styles.iconBtn}
                      onPress={() => handleUpdate(item.id)}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Icon name="checkmark-circle" size={22} color={colors.primary} />
                      )}
                    </Pressable>
                    <Pressable style={styles.iconBtn} onPress={cancelEditing}>
                      <Icon name="close-circle" size={22} color={colors.textSecondary} />
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.itemText} numberOfLines={1}>{item.tanimDeger}</Text>
                    <Pressable
                      style={styles.iconBtn}
                      onPress={() => startEditing(item)}
                      hitSlop={6}
                    >
                      <Icon name="create-outline" size={18} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable
                      style={styles.iconBtn}
                      onPress={() => handleDelete(item.id, item.tanimDeger)}
                      disabled={isSaving}
                      hitSlop={6}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <Icon name="trash-outline" size={18} color={colors.danger} />
                      )}
                    </Pressable>
                  </>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </BottomSheet>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    addRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    addInputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 10,
      height: 44,
    },
    addIcon: {
      marginRight: 6,
    },
    addInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      paddingVertical: 0,
    },
    addBtn: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnDisabled: {
      opacity: 0.5,
    },
    loadingContainer: {
      paddingVertical: 30,
      alignItems: 'center',
    },
    emptyContainer: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 13,
    },
    list: {
      maxHeight: 300,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    itemText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    editInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginRight: 4,
    },
    iconBtn: {
      padding: 6,
    },
  });
