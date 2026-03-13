import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import BottomSheet from './BottomSheet';
import Button from './Button';
import IOSSwitch from './IOSSwitch';
import { PROGRAM_MENUS, ProgramKey, CategoryKey } from '../constants/menuDefinitions';

// Yetki veri yapısı: her program → her kategori → her menü item key → boolean
export type ProgramYetkileri = Partial<Record<
  ProgramKey,
  Partial<Record<CategoryKey, Record<string, boolean>>>
>>;

interface UserPermissionsSheetProps {
  visible: boolean;
  userName: string;
  activePrograms: Partial<Record<ProgramKey, boolean>>;
  initialYetkiler: ProgramYetkileri;
  isSaving: boolean;
  onClose: () => void;
  onSave: (yetkiler: ProgramYetkileri) => void;
}

export default function UserPermissionsSheet({
  visible,
  userName,
  activePrograms,
  initialYetkiler,
  isSaving,
  onClose,
  onSave,
}: UserPermissionsSheetProps) {
  const { colors, isDark } = useTheme();
  const [yetkiler, setYetkiler] = useState<ProgramYetkileri>({});
  // Hangi program-kategori açık: 'muhasebe-raporlar' gibi
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const init: ProgramYetkileri = {};
    PROGRAM_MENUS.forEach(prog => {
      if (!activePrograms[prog.key]) return;
      const existing = initialYetkiler[prog.key] ?? {};
      init[prog.key] = {};
      (['raporlar', 'islemler'] as CategoryKey[]).forEach(cat => {
        const items = prog[cat];
        if (items.length === 0) return;
        const existingCat = existing[cat] ?? {};
        const catMap: Record<string, boolean> = {};
        items.forEach(item => { catMap[item.key] = existingCat[item.key] ?? false; });
        init[prog.key]![cat] = catMap;
      });
    });
    setYetkiler(init);
    setExpanded(null);
  }, [visible]);

  const toggleExpand = (progKey: ProgramKey, cat: CategoryKey) => {
    const id = `${progKey}-${cat}`;
    setExpanded(prev => prev === id ? null : id);
  };

  const toggleItem = (progKey: ProgramKey, cat: CategoryKey, itemKey: string) => {
    setYetkiler(prev => ({
      ...prev,
      [progKey]: {
        ...prev[progKey],
        [cat]: {
          ...prev[progKey]?.[cat],
          [itemKey]: !prev[progKey]?.[cat]?.[itemKey],
        },
      },
    }));
  };

  const toggleAll = (progKey: ProgramKey, cat: CategoryKey, items: { key: string }[], allOn: boolean) => {
    const newMap: Record<string, boolean> = {};
    items.forEach(i => { newMap[i.key] = !allOn; });
    setYetkiler(prev => ({
      ...prev,
      [progKey]: { ...prev[progKey], [cat]: newMap },
    }));
  };

  const getCatState = (progKey: ProgramKey, cat: CategoryKey, items: { key: string }[]) => {
    const catMap = yetkiler[progKey]?.[cat] ?? {};
    const count = items.filter(i => catMap[i.key]).length;
    if (count === 0) return 'none';
    if (count === items.length) return 'all';
    return 'some';
  };

  const visiblePrograms = PROGRAM_MENUS.filter(p => activePrograms[p.key]);
  const styles = createStyles(colors, isDark);

  const renderCategory = (prog: typeof PROGRAM_MENUS[0], cat: CategoryKey) => {
    const items = prog[cat];
    if (items.length === 0) return null;
    const expandId = `${prog.key}-${cat}`;
    const isOpen = expanded === expandId;
    const state = getCatState(prog.key, cat, items);
    const allOn = state === 'all';

    return (
      <View key={cat}>
        {/* Kategori satırı */}
        <View style={[styles.catRow, { borderTopColor: colors.border }]}>
          {/* Sol: aç/kapat */}
          <Pressable style={styles.catLeft} onPress={() => toggleExpand(prog.key, cat)}>
            <Icon
              name={isOpen ? 'chevron-down-outline' : 'chevron-forward-outline'}
              size={14}
              color={colors.textTertiary}
            />
            <Text style={[styles.catLabel, { color: state === 'none' ? colors.textTertiary : colors.text }]}>
              {cat === 'raporlar' ? 'Raporlar' : 'İşlemler'}
            </Text>
            {state === 'some' && (
              <Text style={[styles.countBadge, { color: prog.color }]}>
                {items.filter(i => yetkiler[prog.key]?.[cat]?.[i.key]).length}/{items.length}
              </Text>
            )}
          </Pressable>

          {/* Sağ: tümünü aç/kapat switch */}
          <IOSSwitch
            value={allOn}
            onValueChange={() => toggleAll(prog.key, cat, items, allOn)}
            color={prog.color}
          />
        </View>

        {/* Menü item listesi */}
        {isOpen && (
          <View style={[styles.itemList, { borderTopColor: colors.border, backgroundColor: isDark ? colors.background : prog.color + '06' }]}>
            {items.map(item => {
              const checked = yetkiler[prog.key]?.[cat]?.[item.key] ?? false;
              return (
                <View
                  key={item.key}
                  style={[styles.itemRow, { borderBottomColor: colors.border }]}
                >
                  <Icon name={item.icon} size={15} color={checked ? prog.color : colors.textTertiary} style={{ marginRight: 8 }} />
                  <Text style={[styles.itemLabel, { color: checked ? colors.text : colors.textSecondary }]}>
                    {item.label}
                  </Text>
                  <IOSSwitch
                    value={checked}
                    onValueChange={() => toggleItem(prog.key, cat, item.key)}
                    color={prog.color}
                  />
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={`${userName} — Yetkiler`}
      icon="lock-open-outline"
      iconColor={colors.green}
      footer={
        <>
          <Button text="İptal" variant="secondary" icon="close-outline" onPress={onClose} style={{ flex: 1 }} />
          <Button text="Kaydet" icon="checkmark-outline" onPress={() => onSave(yetkiler)} loading={isSaving} style={{ flex: 1 }} />
        </>
      }
    >
      <View>
        {visiblePrograms.length === 0 ? (
          <View style={styles.emptyBox}>
            <Icon name="alert-circle-outline" size={24} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Erişilebilir program yok</Text>
          </View>
        ) : (
          visiblePrograms.map((prog, pi) => (
            <View
              key={prog.key}
              style={[
                styles.programCard,
                { borderColor: colors.border },
                pi > 0 && { marginTop: 10 },
              ]}
            >
              {/* Program başlığı */}
              <View style={[styles.progHeader, { backgroundColor: isDark ? colors.card : prog.color + '10' }]}>
                <View style={[styles.progIconBox, { backgroundColor: prog.color + '20' }]}>
                  <Icon name={prog.icon} size={16} color={prog.color} />
                </View>
                <Text style={[styles.progLabel, { color: colors.text }]}>{prog.label}</Text>
              </View>

              {renderCategory(prog, 'raporlar')}
              {renderCategory(prog, 'islemler')}
            </View>
          ))
        )}
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    programCard: {
      borderRadius: 12,
      borderWidth: 1,
      overflow: 'hidden',
    },
    progHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    progIconBox: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progLabel: {
      fontSize: 14,
      fontWeight: '600',
    },
    catRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderTopWidth: 1,
    },
    catLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    catLabel: {
      fontSize: 13,
      fontWeight: '500',
    },
    countBadge: {
      fontSize: 11,
      fontWeight: '600',
    },
    itemList: {
      borderTopWidth: 1,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderBottomWidth: 1,
    },
    itemLabel: {
      fontSize: 13,
      flex: 1,
    },
    emptyBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 16,
    },
    emptyText: { fontSize: 13 },
  });
