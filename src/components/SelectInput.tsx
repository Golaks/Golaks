import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import XButton from './XButton';

export interface SelectItem {
  id: string;
  label: string;
}

interface SelectInputProps {
  label?: string;
  icon?: string;
  placeholder?: string;
  value: string;
  items: SelectItem[];
  onSelect: (id: string) => void;
  searchPlaceholder?: string;
  onAdd?: () => void;
  onAddInline?: (value: string) => Promise<{ id: string; label: string } | null>;
  onItemEdit?: (item: SelectItem, newLabel: string) => Promise<boolean>;
  onItemDelete?: (item: SelectItem) => Promise<boolean>;
  addLabel?: string;
  addPlaceholder?: string;
  modalTitle?: string;
  modalIcon?: string;
  compact?: boolean;
  noClear?: boolean;
  containerStyle?: any;
  error?: boolean;
  shake?: boolean;
  onSearchChange?: (text: string) => void;
  searchLoading?: boolean;
  searchDebounceMs?: number;
}

export default function SelectInput({
  label,
  icon,
  placeholder = 'Seçiniz...',
  value,
  items,
  onSelect,
  searchPlaceholder = 'Ara...',
  onAdd,
  onAddInline,
  onItemEdit,
  onItemDelete,
  addLabel = 'Ekle',
  addPlaceholder = 'Yeni tanım girin...',
  modalTitle: modalTitleProp,
  modalIcon,
  compact = false,
  noClear = false,
  containerStyle,
  error = false,
  shake = false,
  onSearchChange,
  searchLoading = false,
  searchDebounceMs = 300,
}: SelectInputProps) {
  const { colors, isDark } = useTheme();
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [inlineValue, setInlineValue] = useState('');
  const [inlineAdding, setInlineAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const styles = createStyles(colors, isDark);

  const selectedItem = useMemo(
    () => (value ? items.find((i) => i.id === value) : undefined),
    [items, value],
  );

  const filtered = useMemo(() => {
    if (onSearchChange) return items;
    if (!search.trim()) return items;
    const q = search.toLowerCase().trim();
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, search, onSearchChange]);

  useEffect(() => {
    if (!onSearchChange || !open) return;
    const t = setTimeout(() => onSearchChange(search), searchDebounceMs);
    return () => clearTimeout(t);
  }, [search, open, onSearchChange, searchDebounceMs]);

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onSelect('');
    setSearch('');
  };

  const handleOpen = () => {
    setOpen(true);
    setSearch('');
  };

  const handleClose = () => {
    setOpen(false);
    setSearch('');
    setInlineValue('');
    setEditingId(null);
  };

  const handleInlineAdd = async () => {
    const trimmed = inlineValue.trim();
    if (!trimmed || !onAddInline) return;
    setInlineAdding(true);
    try {
      const result = await onAddInline(trimmed);
      if (result) {
        onSelect(result.id);
        setInlineValue('');
        setOpen(false);
        setSearch('');
      }
    } catch {}
    setInlineAdding(false);
  };

  const handleStartEdit = (item: SelectItem) => {
    setEditingId(item.id);
    setEditingLabel(item.label);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingLabel.trim() || !onItemEdit) return;
    const item = items.find(i => i.id === editingId);
    if (!item) return;
    setSavingId(editingId);
    try {
      const ok = await onItemEdit(item, editingLabel.trim());
      if (ok) setEditingId(null);
    } catch {}
    setSavingId(null);
  };

  const handleDeleteItem = async (item: SelectItem) => {
    if (!onItemDelete) return;
    setSavingId(item.id);
    try {
      const ok = await onItemDelete(item);
      if (ok && value === item.id) onSelect('');
    } catch {}
    setSavingId(null);
  };

  useEffect(() => {
    if (shake && error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [shake, error]);

  const editable = !!onItemEdit || !!onItemDelete;
  const resolvedModalTitle = modalTitleProp || label || placeholder;
  const resolvedModalIcon = modalIcon || icon;

  return (
    <View style={[styles.container, compact && { marginBottom: 0, zIndex: 10 }, containerStyle]}>
      {(label || onAdd || onAddInline) && !compact && (
        <View style={styles.labelRow}>
          {label && <Text style={styles.label}>{label}</Text>}
          {onAdd && (
            <Pressable
              style={styles.addLabelBtn}
              onPress={() => {
                setOpen(false);
                setSearch('');
                onAdd();
              }}
              hitSlop={8}
            >
              <Icon name="add-circle-outline" size={14} color={colors.primary} />
              <Text style={[styles.addLabelText, { color: colors.primary }]}>{addLabel}</Text>
            </Pressable>
          )}
        </View>
      )}
      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <Pressable style={[styles.inputWrapper, compact && styles.inputWrapperCompact, error && { borderColor: colors.danger, borderWidth: 1 }]} onPress={handleOpen}>
          {icon && (
            <Icon name={icon} size={20} color={colors.textSecondary} style={styles.icon} />
          )}
          <Text
            style={[styles.inputText, compact && { fontSize: 13 }, !selectedItem && styles.placeholderText]}
            numberOfLines={1}
          >
            {selectedItem ? selectedItem.label : placeholder}
          </Text>
          {selectedItem && !compact && !noClear && (
            <Pressable onPress={handleClear} style={styles.clearBtn} hitSlop={8}>
              <Icon name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
          <Icon
            name="chevron-down"
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>
      </Animated.View>

      {/* Modal Dropdown */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={handleClose} />
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                {resolvedModalIcon && (
                  <View style={styles.modalIconWrapper}>
                    <Icon name={resolvedModalIcon} size={16} color={colors.primary} />
                  </View>
                )}
                <Text style={styles.modalTitle}>{resolvedModalTitle}</Text>
                {editable && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{items.length}</Text>
                  </View>
                )}
              </View>
              <XButton onPress={handleClose} size={36} iconSize={20} />
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
              <View style={styles.searchInputWrapper}>
                <Icon name="search-outline" size={15} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
                {searchLoading && (
                  <ActivityIndicator size="small" color={colors.textSecondary} style={{ marginRight: 4 }} />
                )}
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch('')} hitSlop={8}>
                    <Icon name="close-circle" size={15} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Inline Add */}
            {onAddInline && (
              <View style={styles.inlineAddRow}>
                <View style={styles.inlineAddInputWrapper}>
                  <TextInput
                    style={styles.inlineAddInput}
                    value={inlineValue}
                    onChangeText={setInlineValue}
                    placeholder={addPlaceholder}
                    placeholderTextColor={colors.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={handleInlineAdd}
                    returnKeyType="done"
                  />
                </View>
                <Pressable
                  style={[styles.inlineAddBtn, (!inlineValue.trim() || inlineAdding) && styles.inlineAddBtnDisabled]}
                  onPress={handleInlineAdd}
                  disabled={inlineAdding || !inlineValue.trim()}
                >
                  {inlineAdding ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon name="add" size={15} color="#fff" />
                      <Text style={styles.inlineAddBtnText}>Ekle</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}

            {/* List */}
            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {filtered.length === 0 ? (
                <View style={styles.emptyContainer}>
                  {searchLoading ? (
                    <ActivityIndicator size="small" color={colors.textSecondary} />
                  ) : (
                    <>
                      <Icon name="file-tray-outline" size={32} color={colors.textSecondary + '60'} />
                      <Text style={styles.emptyText}>
                        {search.trim() ? 'Sonuç bulunamadı' : 'Henüz kayıt yok'}
                      </Text>
                    </>
                  )}
                </View>
              ) : (
                filtered.map((item) => {
                  const isSelected = item.id === value;
                  const isEditing = editingId === item.id;
                  const isSaving = savingId === item.id;

                  if (isEditing) {
                    return (
                      <View key={item.id} style={styles.editRow}>
                        <View style={styles.editInputWrapper}>
                          <TextInput
                            style={styles.editInput}
                            value={editingLabel}
                            onChangeText={setEditingLabel}
                            autoFocus
                            autoCapitalize="none"
                            autoCorrect={false}
                            onSubmitEditing={handleSaveEdit}
                            returnKeyType="done"
                            selectTextOnFocus
                          />
                        </View>
                        <Pressable
                          style={[styles.editIconBtn, styles.editIconBtnSave]}
                          onPress={handleSaveEdit}
                          disabled={isSaving || !editingLabel.trim()}
                        >
                          {isSaving ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Icon name="checkmark" size={16} color="#fff" />
                          )}
                        </Pressable>
                        <Pressable
                          style={[styles.editIconBtn, styles.editIconBtnCancel]}
                          onPress={() => setEditingId(null)}
                        >
                          <Icon name="close" size={16} color={colors.textSecondary} />
                        </Pressable>
                      </View>
                    );
                  }

                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.option, isSelected && styles.optionSelected]}
                      onPress={() => handleSelect(item.id)}
                    >
                      <View style={[styles.optionDot, isSelected && styles.optionDotSelected]} />
                      <Text
                        style={[
                          styles.optionText,
                          isSelected && styles.optionTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                      {isSaving ? (
                        <ActivityIndicator size="small" color={colors.textSecondary} />
                      ) : editable ? (
                        <View style={styles.itemActions}>
                          {onItemEdit && (
                            <Pressable
                              style={styles.itemActionBtn}
                              onPress={() => handleStartEdit(item)}
                              hitSlop={4}
                            >
                              <Icon name="pencil" size={14} color={colors.textSecondary} />
                            </Pressable>
                          )}
                          {onItemDelete && (
                            <Pressable
                              style={[styles.itemActionBtn, styles.itemActionBtnDelete]}
                              onPress={() => handleDeleteItem(item)}
                              hitSlop={4}
                            >
                              <Icon name="trash" size={14} color="#EF4444" />
                            </Pressable>
                          )}
                        </View>
                      ) : isSelected ? (
                        <Icon name="checkmark-circle" size={18} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      marginBottom: 12,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.inputLabel,
    },
    addLabelBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    addLabelText: {
      fontSize: 12,
      fontWeight: '600',
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 48,
    },
    inputWrapperCompact: {
      height: 36,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: isDark ? colors.card : '#fff',
    },
    icon: {
      marginRight: 10,
    },
    inputText: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    placeholderText: {
      color: colors.placeholder,
    },
    clearBtn: {
      padding: 4,
      marginRight: 4,
    },
    // ─── Modal ───────────────────────────────────────────────
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
      width: '90%',
      maxWidth: 400,
      maxHeight: '70%',
      backgroundColor: isDark ? colors.card : '#fff',
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? colors.border : 'transparent',
    },
    // Header
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    modalTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    modalIconWrapper: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: colors.primary + '14',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    badge: {
      backgroundColor: colors.primary + '18',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 10,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
    },
    // Search
    searchRow: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    searchInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? colors.background : '#F1F5F9',
      borderRadius: 10,
      paddingHorizontal: 10,
      height: 38,
      gap: 6,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      paddingVertical: 0,
    },
    // ─── Inline Add ──────────────────────────────────────────
    inlineAddRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: isDark ? colors.primary + '08' : '#EFF6FF',
    },
    inlineAddInputWrapper: {
      flex: 1,
      backgroundColor: isDark ? colors.inputBackground : '#fff',
      borderWidth: 1,
      borderColor: isDark ? colors.inputBorder : '#DBEAFE',
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 38,
      justifyContent: 'center',
    },
    inlineAddInput: {
      fontSize: 13,
      color: colors.text,
      paddingVertical: 0,
    },
    inlineAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      height: 38,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
    inlineAddBtnDisabled: {
      opacity: 0.4,
    },
    inlineAddBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#fff',
    },
    // ─── List ────────────────────────────────────────────────
    list: {
      maxHeight: 350,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    optionSelected: {
      backgroundColor: isDark ? colors.primary + '15' : '#EFF6FF',
    },
    optionDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: isDark ? colors.border : '#CBD5E1',
      marginRight: 10,
    },
    optionDotSelected: {
      backgroundColor: colors.primary,
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    optionText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    optionTextSelected: {
      color: colors.primary,
      fontWeight: '600',
    },
    // ─── Item Actions ────────────────────────────────────────
    itemActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginLeft: 8,
    },
    itemActionBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? colors.background : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E2E8F0',
    },
    itemActionBtnDelete: {
      backgroundColor: isDark ? '#FEE2E2' + '20' : '#FEF2F2',
      borderColor: isDark ? '#EF4444' + '40' : '#FECACA',
    },
    // ─── Edit Row ────────────────────────────────────────────
    editRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: isDark ? colors.primary + '08' : '#FFFBEB',
      gap: 6,
    },
    editInputWrapper: {
      flex: 1,
      backgroundColor: isDark ? colors.inputBackground : '#fff',
      borderWidth: 1.5,
      borderColor: '#F59E0B',
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 38,
      justifyContent: 'center',
    },
    editInput: {
      fontSize: 14,
      color: colors.text,
      paddingVertical: 0,
    },
    editIconBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editIconBtnSave: {
      backgroundColor: '#10B981',
    },
    editIconBtnCancel: {
      backgroundColor: isDark ? colors.background : '#F1F5F9',
    },
    // ─── Empty ───────────────────────────────────────────────
    emptyContainer: {
      paddingVertical: 32,
      alignItems: 'center',
      gap: 8,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
  });
