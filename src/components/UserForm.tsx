import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import Input from './Input';
import InputPhone from './InputPhone';
import IOSSwitch from './IOSSwitch';

export interface SubeItem {
  id: string;
  name: string;
}

interface AvailablePrograms {
  muhasebe: boolean;
  tabakhane: boolean;
  konfeksiyon: boolean;
  magaza: boolean;
}

interface UserFormProps {
  formName: string;
  formEmail: string;
  formPhone: string;
  formPassword: string;
  formRole: 'user' | 'admin' | 'superAdmin';
  formDefaultScreen: 'apps' | 'barcode';
  formPermissions: {
    muhasebe?: boolean;
    tabakhane?: boolean;
    konfeksiyon?: boolean;
    magaza?: boolean;
  };
  formSubeYetkileri: string[];
  formVarsayilanSube: string;
  subeler: SubeItem[];
  isEditMode: boolean;
  availablePrograms?: AvailablePrograms;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRoleChange: (role: 'user' | 'admin' | 'superAdmin') => void;
  onDefaultScreenChange: (screen: 'apps' | 'barcode') => void;
  onPermissionsChange: (permissions: any) => void;
  onSubeYetkileriChange: (subeYetkileri: string[]) => void;
  onVarsayilanSubeChange: (subeId: string) => void;
}

const PERMISSIONS = [
  { key: 'muhasebe', label: 'Muhasebe', icon: 'calculator-outline' },
  { key: 'tabakhane', label: 'Tabakhane', icon: 'business-outline' },
  { key: 'konfeksiyon', label: 'Konfeksiyon', icon: 'shirt-outline' },
  { key: 'magaza', label: 'Mağaza', icon: 'storefront-outline' },
];

const ROLES = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Tam Yetki',
    icon: 'shield-checkmark'
  },
  {
    value: 'user',
    label: 'Kullanıcı',
    description: 'Sınırlı Yetki',
    icon: 'person'
  },
];

export default function UserForm({
  formName,
  formEmail,
  formPhone,
  formPassword,
  formRole,
  formDefaultScreen,
  formPermissions,
  formSubeYetkileri,
  formVarsayilanSube,
  subeler,
  isEditMode,
  availablePrograms,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onPasswordChange,
  onRoleChange,
  onDefaultScreenChange,
  onPermissionsChange,
  onSubeYetkileriChange,
  onVarsayilanSubeChange,
}: UserFormProps) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <Input
        label="Ad Soyad"
        icon="person-outline"
        placeholder="Ad soyad girin"
        value={formName}
        onChangeText={onNameChange}
        clearable
        onClear={() => onNameChange('')}
      />

      <Input
        label="E-posta"
        icon="mail-outline"
        placeholder="E-posta girin"
        value={formEmail}
        onChangeText={onEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
        clearable
        onClear={() => onEmailChange('')}
        containerStyle={{ marginTop: 2 }}
      />

      <InputPhone
        label="Telefon"
        icon="call-outline"
        value={formPhone}
        onChangeText={onPhoneChange}
        clearable
        onClear={() => onPhoneChange('')}
        containerStyle={{ marginTop: 2 }}
      />

      <Input
        label={isEditMode ? 'Yeni Şifre - Boş bırakırsanız değişmez' : 'Şifre'}
        icon="lock-closed-outline"
        placeholder="Şifre girin"
        value={formPassword}
        onChangeText={onPasswordChange}
        isPassword
        autoCapitalize="none"
        clearable
        onClear={() => onPasswordChange('')}
        containerStyle={{ marginTop: 2 }}
      />

      {/* Role Selection - Hidden for superAdmin */}
      {!(isEditMode && formRole === 'superAdmin') && (
        <>
          <View style={styles.sectionTitle}>
            <Icon name="shield-checkmark-outline" size={18} color={colors.text} />
            <Text style={styles.sectionTitleText}>Rol</Text>
          </View>
          <View style={[styles.roleContainer, formRole !== 'user' && { marginBottom: 20 }]}>
            {ROLES.map((role) => (
              <Pressable
                key={role.value}
                style={[
                  styles.roleOption,
                  formRole === role.value && styles.roleOptionActive,
                ]}
                onPress={() => onRoleChange(role.value as any)}
              >
                {formRole === role.value && (
                  <View style={styles.checkmarkContainer}>
                    <Icon name="checkmark-circle" size={22} color={colors.primary} />
                  </View>
                )}
                <View style={[
                  styles.roleIconContainer,
                  formRole === role.value && styles.roleIconContainerActive,
                ]}>
                  <Icon
                    name={role.icon}
                    size={28}
                    color={formRole === role.value ? colors.primary : colors.textSecondary}
                  />
                </View>
                <Text
                  style={[
                    styles.roleOptionText,
                    formRole === role.value && styles.roleOptionTextActive,
                  ]}
                >
                  {role.label}
                </Text>
                <Text
                  style={[
                    styles.roleDescription,
                    formRole === role.value && styles.roleDescriptionActive,
                  ]}
                >
                  {role.description}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* Default Screen Selection */}
      <View style={[styles.sectionTitle, { marginTop: 16 }]}>
        <Icon name="home-outline" size={18} color={colors.text} />
        <Text style={styles.sectionTitleText}>Ana Ekran</Text>
      </View>
      <View style={styles.defaultScreenContainer}>
        <Pressable
          style={[
            styles.screenOption,
            formDefaultScreen === 'apps' && styles.screenOptionActive,
          ]}
          onPress={() => onDefaultScreenChange('apps')}
        >
          {formDefaultScreen === 'apps' && (
            <View style={styles.checkmarkContainer}>
              <Icon name="checkmark-circle" size={22} color={colors.primary} />
            </View>
          )}
          <View style={[
            styles.screenIconContainer,
            formDefaultScreen === 'apps' && styles.screenIconContainerActive,
          ]}>
            <Icon
              name="apps"
              size={28}
              color={formDefaultScreen === 'apps' ? colors.primary : colors.textSecondary}
            />
          </View>
          <Text
            style={[
              styles.screenOptionText,
              formDefaultScreen === 'apps' && styles.screenOptionTextActive,
            ]}
          >
            Uygulama
          </Text>
          <Text
            style={[
              styles.screenDescription,
              formDefaultScreen === 'apps' && styles.screenDescriptionActive,
            ]}
          >
            Uygulama Seçim Ekranı
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.screenOption,
            formDefaultScreen === 'barcode' && styles.screenOptionActive,
          ]}
          onPress={() => onDefaultScreenChange('barcode')}
        >
          {formDefaultScreen === 'barcode' && (
            <View style={styles.checkmarkContainer}>
              <Icon name="checkmark-circle" size={22} color={colors.primary} />
            </View>
          )}
          <View style={[
            styles.screenIconContainer,
            formDefaultScreen === 'barcode' && styles.screenIconContainerActive,
          ]}>
            <Icon
              name="qr-code"
              size={28}
              color={formDefaultScreen === 'barcode' ? colors.primary : colors.textSecondary}
            />
          </View>
          <Text
            style={[
              styles.screenOptionText,
              formDefaultScreen === 'barcode' && styles.screenOptionTextActive,
            ]}
          >
            Barkod
          </Text>
          <Text
            style={[
              styles.screenDescription,
              formDefaultScreen === 'barcode' && styles.screenDescriptionActive,
            ]}
          >
            Barkod Sorgulama
          </Text>
        </Pressable>
      </View>

      {/* Permissions - Hidden for admin and superAdmin */}
      {formRole === 'user' && (
        <>
          <View style={[styles.sectionTitle, { marginTop: 16 }]}>
            <Icon name="apps-outline" size={18} color={colors.text} />
            <Text style={styles.sectionTitleText}>Uygulama Yetkileri</Text>
          </View>
          <View style={styles.permissionList}>
            {PERMISSIONS.map((perm) => {
              const isAvailable = availablePrograms
                ? availablePrograms[perm.key as keyof AvailablePrograms]
                : true;
              const isEnabled = formPermissions[perm.key as keyof typeof formPermissions] || false;

              return (
                <View
                  key={perm.key}
                  style={[
                    styles.permissionItem,
                    !isAvailable && styles.permissionItemDisabled,
                  ]}
                >
                  <View style={styles.permissionLeft}>
                    <Icon
                      name={perm.icon}
                      size={20}
                      color={isAvailable ? colors.text : colors.textTertiary}
                    />
                    <View>
                      <Text
                        style={[
                          styles.permissionLabel,
                          !isAvailable && styles.permissionLabelDisabled,
                        ]}
                      >
                        {perm.label}
                      </Text>
                      {!isAvailable && (
                        <Text style={styles.permissionDisabledHint}>
                          Firma için aktif değil
                        </Text>
                      )}
                    </View>
                  </View>
                  {isAvailable ? (
                    <IOSSwitch
                      value={isEnabled}
                      onValueChange={(value) =>
                        onPermissionsChange({ ...formPermissions, [perm.key]: value })
                      }
                    />
                  ) : (
                    <View style={styles.lockIconContainer}>
                      <Icon name="lock-closed" size={18} color={colors.textTertiary} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Şube Yetkileri */}
      {subeler.length > 0 && (
        <>
          <View style={[styles.sectionTitle, { marginTop: 16 }]}>
            <Icon name="business-outline" size={18} color={colors.text} />
            <Text style={styles.sectionTitleText}>Şube Yetkileri</Text>
          </View>
          <View style={[styles.permissionList, { marginBottom: 20 }]}>
            {subeler.map((sube) => {
              const isSelected = formSubeYetkileri.includes(sube.id);
              const isDefault = formVarsayilanSube === sube.id;
              return (
                <Pressable
                  key={sube.id}
                  style={[styles.permissionItem, isSelected && styles.subeItemSelected]}
                  onPress={() => {
                    if (isSelected) {
                      const newYetkiler = formSubeYetkileri.filter(id => id !== sube.id);
                      onSubeYetkileriChange(newYetkiler);
                      // Varsayılan şube kaldırıldıysa ilk şubeyi varsayılan yap
                      if (isDefault && newYetkiler.length > 0) {
                        onVarsayilanSubeChange(newYetkiler[0]);
                      } else if (newYetkiler.length === 0) {
                        onVarsayilanSubeChange('');
                      }
                    } else {
                      const newYetkiler = [...formSubeYetkileri, sube.id];
                      onSubeYetkileriChange(newYetkiler);
                      // İlk şube eklendiyse otomatik varsayılan yap
                      if (newYetkiler.length === 1) {
                        onVarsayilanSubeChange(sube.id);
                      }
                    }
                  }}
                >
                  <View style={styles.permissionLeft}>
                    <Icon
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    <View>
                      <Text style={[styles.permissionLabel, isSelected && { color: colors.primary, fontWeight: '600' }]}>
                        {sube.name}
                      </Text>
                      {isDefault && (
                        <Text style={[styles.permissionDisabledHint, { color: colors.primary }]}>
                          Varsayılan Şube
                        </Text>
                      )}
                    </View>
                  </View>
                  {isSelected && (
                    <Pressable
                      onPress={() => onVarsayilanSubeChange(sube.id)}
                      hitSlop={8}
                      style={styles.defaultSubeBtn}
                    >
                      <Icon
                        name={isDefault ? 'star' : 'star-outline'}
                        size={20}
                        color={isDefault ? '#F59E0B' : colors.textSecondary}
                      />
                    </Pressable>
                  )}
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {},
    sectionTitle: {
      marginTop: 4,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionTitleText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    roleContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    roleOption: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      padding: 14,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.background,
      gap: 6,
    },
    roleOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '08',
    },
    roleIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardSecondary,
    },
    roleIconContainerActive: {
      backgroundColor: colors.primary + '15',
    },
    roleOptionText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    roleOptionTextActive: {
      color: colors.primary,
    },
    roleDescription: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    roleDescriptionActive: {
      color: colors.primary,
      opacity: 0.8,
    },
    defaultScreenContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    screenOption: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      padding: 14,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.background,
      gap: 6,
    },
    screenOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '08',
    },
    screenIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardSecondary,
    },
    screenIconContainerActive: {
      backgroundColor: colors.primary + '15',
    },
    screenOptionText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    screenOptionTextActive: {
      color: colors.primary,
    },
    screenDescription: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    screenDescriptionActive: {
      color: colors.primary,
      opacity: 0.8,
    },
    checkmarkContainer: {
      position: 'absolute',
      top: 8,
      right: 8,
    },
    permissionList: {
      gap: 10,
    },
    permissionItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 14,
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    permissionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    permissionLabel: {
      fontSize: 15,
      color: colors.text,
    },
    permissionLabelDisabled: {
      color: colors.textTertiary,
    },
    permissionItemDisabled: {
      opacity: 0.6,
      backgroundColor: colors.cardSecondary,
    },
    subeItemSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '08',
    },
    defaultSubeBtn: {
      padding: 4,
    },
    permissionDisabledHint: {
      fontSize: 11,
      color: colors.textTertiary,
      marginTop: 2,
    },
    lockIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
