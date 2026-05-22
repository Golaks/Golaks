import React, { useState, useEffect, useRef } from 'react';
import { useRegisterHelp } from '../lib/helpContext';
import { userManagementHelp } from './userManagement/help';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { formatPhone } from '../utils/formatPhone';
import { authService } from '../services/auth.service';
import { API_ENDPOINTS, BASE_API_URL } from '../constants/ApiConfig';
import Header from '../components/Header';
import TabBar, { TabName } from '../components/TabBar';
import SearchInput from '../components/SearchInput';
import IOSSwitch from '../components/IOSSwitch';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import BackButton from '../components/BackButton';
import IconButton from '../components/IconButton';
import SearchButton from '../components/SearchButton';
import AddButton from '../components/AddButton';
import ActionFormModal from '../components/ActionFormModal';
import UserForm from '../components/UserForm';
import LoadingSpinner from '../components/LoadingSpinner';
import UserPermissionsSheet, { ProgramYetkileri } from '../components/UserPermissionsSheet';
import { ProgramKey } from '../constants/menuDefinitions';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'superAdmin' | 'admin' | 'user';
  active: boolean;
  avatar?: string;
  lastLogin?: string;
  defaultScreen?: 'apps' | 'barcode';
  permissions?: {
    muhasebe?: boolean;
    tabakhane?: boolean;
    konfeksiyon?: boolean;
    magaza?: boolean;
  };
  subeYetkileri?: string[];
  varsayilanSube?: string;
  programYetkileri?: ProgramYetkileri;
  barcodePermissions?: any;
}

interface SubeItem {
  id: string;
  name: string;
}

interface UserManagementScreenProps {
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

export default function UserManagementScreen({ onTabChange, onLogout }: UserManagementScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, user: authUser } = useAuth();
  const { showSuccess, showError } = useAlert();

  useRegisterHelp(userManagementHelp);

  // Get available programs from firma_ayarlar
  const getAvailablePrograms = () => {
    try {
      const firmaAyarlar = authUser?.firmaAyarlar;
      if (firmaAyarlar && typeof firmaAyarlar === 'object' && firmaAyarlar.programlar) {
        return {
          muhasebe: firmaAyarlar.programlar.muhasebe?.aktif || false,
          tabakhane: firmaAyarlar.programlar.tabakhane?.aktif || false,
          konfeksiyon: firmaAyarlar.programlar.konfeksiyon?.aktif || false,
          magaza: firmaAyarlar.programlar.magaza?.aktif || false,
        };
      }
      // Default: all programs available if no firma_ayarlar
      return {
        muhasebe: true,
        tabakhane: true,
        konfeksiyon: true,
        magaza: true,
      };
    } catch (error) {
      return {
        muhasebe: true,
        tabakhane: true,
        konfeksiyon: true,
        magaza: true,
      };
    }
  };

  const availablePrograms = getAvailablePrograms();
  const [activeTab, setActiveTab] = useState<TabName>('profile');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActiveConfirm, setShowActiveConfirm] = useState(false);
  const [showPermissionsSheet, setShowPermissionsSheet] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [formError, setFormError] = useState('');
  const toastRef = useRef<import('../components/BottomSheet').BottomSheetToastRef | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: boolean; email?: boolean; phone?: boolean; password?: boolean }>({});

  // Form fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'user' | 'admin' | 'superAdmin'>('user');
  const [formDefaultScreen, setFormDefaultScreen] = useState<'apps' | 'barcode'>('apps');
  const [formPermissions, setFormPermissions] = useState({
    muhasebe: false,
    tabakhane: false,
    konfeksiyon: false,
    magaza: false,
  });
  const [formSubeYetkileri, setFormSubeYetkileri] = useState<string[]>([]);
  const [formVarsayilanSube, setFormVarsayilanSube] = useState('');
  const [subeler, setSubeler] = useState<SubeItem[]>([]);

  const styles = createStyles(colors, isDark);

  useEffect(() => {
    fetchUsers();
    fetchSubeler();
  }, []);

  useEffect(() => {
    // Arama filtresi
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (user) =>
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const token = await getToken();

      const response = await fetch(API_ENDPOINTS.USER_LIST, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success && data.data?.users) {
        setUsers(data.data.users);
      } else {
        // Specific error handling
        let errorMessage = data.error?.message || 'Kullanıcılar yüklenemedi';

        if (response.status === 403 || data.error?.code === 'UNAUTHORIZED') {
          errorMessage = 'Bu sayfaya erişim yetkiniz yok. Lütfen yönetici ile iletişime geçin.';
        } else if (response.status === 401 || data.error?.code === 'INVALID_TOKEN') {
          errorMessage = 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
        }

        showError(errorMessage);
      }
    } catch (error) {
      showError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubeler = async () => {
    try {
      const token = await getToken();
      const response = await fetch(API_ENDPOINTS.USER_SUBELER, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success && data.data?.subeler) {
        setSubeler(data.data.subeler);
      }
    } catch (error) {
    }
  };

  const getToken = async (): Promise<string> => {
    const token = await authService.getToken();
    return token || '';
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
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

  const handleBack = () => {
    if (onTabChange) {
      onTabChange('profile');
    }
  };

  const handleToggleSearch = () => {
    setSearchVisible(!searchVisible);
    if (searchVisible) {
      // Arama kapatılırken query'yi temizle
      setSearchQuery('');
    }
  };

  const handleAddUser = () => {
    setIsEditMode(false);
    setSelectedUser(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setFormRole('user');
    setFormDefaultScreen('barcode');
    setFormPermissions({
      muhasebe: false,
      tabakhane: false,
      konfeksiyon: false,
      magaza: false,
    });
    // Tek şube varsa otomatik seçili ve varsayılan yap
    if (subeler.length === 1) {
      setFormSubeYetkileri([subeler[0].id]);
      setFormVarsayilanSube(subeler[0].id);
    } else {
      setFormSubeYetkileri([]);
      setFormVarsayilanSube('');
    }
    setFormError('');
    setFieldErrors({});
    setShowUserModal(true);
  };

  const handleRoleChange = (role: 'user' | 'admin' | 'superAdmin') => {
    setFormRole(role);
    // Auto-select default screen based on role
    if (role === 'user') {
      setFormDefaultScreen('barcode');
    } else {
      setFormDefaultScreen('apps');
    }
  };

  const handleEditUser = (user: User) => {
    setIsEditMode(true);
    setSelectedUser(user);
    setFormName(user.name);
    setFormEmail(user.email);

    // Normalize phone number: remove +90, 90, leading 0, spaces — keep 10 digits for (XXX)XXX-XXXX
    let normalizedPhone = (user.phone || '').replace(/\D/g, ''); // Only digits
    if (normalizedPhone.startsWith('90') && normalizedPhone.length === 12) {
      normalizedPhone = normalizedPhone.slice(2);
    } else if (normalizedPhone.startsWith('0') && normalizedPhone.length === 11) {
      normalizedPhone = normalizedPhone.slice(1);
    }

    setFormPhone(normalizedPhone);
    setFormPassword('');
    setFormRole(user.role);
    setFormDefaultScreen(user.defaultScreen || 'apps');
    setFormPermissions({
      muhasebe: user.permissions?.muhasebe ?? false,
      tabakhane: user.permissions?.tabakhane ?? false,
      konfeksiyon: user.permissions?.konfeksiyon ?? false,
      magaza: user.permissions?.magaza ?? false,
    });
    setFormSubeYetkileri(user.subeYetkileri ?? []);
    setFormVarsayilanSube(user.varsayilanSube ?? (user.subeYetkileri?.[0] ?? ''));
    setFormError('');
    setFieldErrors({});
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    // Validasyon
    const errors: { name?: boolean; email?: boolean; phone?: boolean; password?: boolean } = {};
    if (!formName.trim()) errors.name = true;
    if (!formEmail.trim() || !/\S+@\S+\.\S+/.test(formEmail)) errors.email = true;
    if (!formPhone.trim()) errors.phone = true;
    if (!isEditMode && !formPassword.trim()) errors.password = true;
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    setFormError('');

    try {
      const requestBody: any = {
        name: formName,
        email: formEmail,
        phone: formPhone,
        role: formRole,
        defaultScreen: formDefaultScreen,
        permissions: formPermissions,
        subeYetkileri: formSubeYetkileri,
        varsayilanSube: formVarsayilanSube,
      };

      let endpoint = API_ENDPOINTS.USER_CREATE;
      let method = 'POST';

      if (isEditMode && selectedUser) {
        endpoint = API_ENDPOINTS.USER_UPDATE;
        method = 'PUT';
        requestBody.id = selectedUser.id;
        requestBody.active = selectedUser.active;
        if (formPassword.trim()) {
          requestBody.password = formPassword;
        }
      } else {
        requestBody.password = formPassword;
      }

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Authorization': `Bearer ${await getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        setShowUserModal(false);
        setFormError('');
        await fetchUsers();
        showSuccess(isEditMode ? 'Kullanıcı güncellendi' : 'Kullanıcı oluşturuldu');
      } else {
        toastRef.current?.show({ type: 'error', text: data.error?.message || 'İşlem başarısız', duration: 4000 });
      }
    } catch (error) {
      toastRef.current?.show({ type: 'error', text: 'Bağlantı hatası. Lütfen tekrar deneyin.', duration: 4000 });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = (user: User) => {
    // SuperAdmin cannot be deactivated
    if (user.role === 'superAdmin') {
      showError('SuperAdmin kullanıcısı pasif yapılamaz');
      return;
    }

    const newActive = !user.active;

    // Son aktif kullanıcı pasife alınamaz
    if (user.active && !newActive) {
      const activeUserCount = users.filter(u => u.active).length;
      if (activeUserCount <= 1) {
        showError('Giriş yapabilmek için en az bir kullanıcı gerekir. Kullanıcıyı pasife alamazsınız');
        return;
      }
    }

    setSelectedUser(user);
    setShowActiveConfirm(true);
  };

  const handleActiveConfirm = async () => {
    if (!selectedUser) return;

    const newActive = !selectedUser.active;

    // Optimistic update
    setUsers(users.map(u => u.id === selectedUser.id ? { ...u, active: newActive } : u));
    setShowActiveConfirm(false);

    try {
      const response = await fetch(API_ENDPOINTS.USER_UPDATE, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${await getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedUser.id,
          name: selectedUser.name,
          email: selectedUser.email,
          phone: selectedUser.phone,
          role: selectedUser.role,
          active: newActive,
          permissions: selectedUser.permissions,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        // Rollback
        setUsers(users.map(u => u.id === selectedUser.id ? { ...u, active: !newActive } : u));
        showError(data.error?.message || 'İşlem başarısız');
      }
    } catch (error) {
      // Rollback
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, active: !newActive } : u));
      showError('Bağlantı hatası. Lütfen tekrar deneyin.');
    }
  };

  const handleDeleteUser = (user: User) => {
    // SuperAdmin cannot be deleted
    if (user.role === 'superAdmin') {
      showError('SuperAdmin kullanıcısı silinemez');
      return;
    }

    if (users.length <= 1) {
      showError('Giriş yapabilmek için en az bir kullanıcı gerekir. Kullanıcıyı silemezsiniz');
      return;
    }
    setSelectedUser(user);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(API_ENDPOINTS.USER_DELETE, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Kullanıcı silindi');
        setShowDeleteConfirm(false);
        await fetchUsers();
      } else {
        showError(data.error?.message || 'Silme işlemi başarısız');
      }
    } catch (error) {
      showError('Bağlantı hatası. Lütfen tekrar deneyin.');
    }
  };

  const handlePermissions = (user: User) => {
    if (user.role !== 'user') return;
    setSelectedUser(user);
    setShowPermissionsSheet(true);
  };

  const handleSavePermissions = async (yetkiler: ProgramYetkileri, barcodePerms?: any) => {
    if (!selectedUser) return;
    setIsSavingPermissions(true);
    try {
      const response = await fetch(API_ENDPOINTS.USER_UPDATE, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${await getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedUser.id,
          name: selectedUser.name,
          email: selectedUser.email,
          phone: selectedUser.phone,
          role: selectedUser.role,
          active: selectedUser.active,
          permissions: selectedUser.permissions,
          programYetkileri: yetkiler,
          barcodePermissions: barcodePerms,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setUsers(prev => prev.map(u =>
          u.id === selectedUser.id ? { ...u, programYetkileri: yetkiler } : u
        ));
        setShowPermissionsSheet(false);
        showSuccess('Yetkiler kaydedildi');
      } else {
        showError(data.error?.message || 'Kayıt başarısız');
      }
    } catch {
      showError('Bağlantı hatası');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toLocaleUpperCase('tr-TR')
      .slice(0, 2);
  };

  const getAvatarUrl = (avatarPath: string | null) => {
    if (!avatarPath) return null;
    // Eğer tam URL ise olduğu gibi döndür
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    // Göreceli yol ise BASE_API_URL ile birleştir
    const cleanPath = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;
    return `${BASE_API_URL}${cleanPath}`;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superAdmin':
        return '#14B8A6';
      case 'admin':
        return colors.primary;
      default:
        return '#818CF8';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'superAdmin':
        return 'Süper Admin';
      case 'admin':
        return 'Admin';
      default:
        return 'Kullanıcı';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superAdmin':
        return 'star';
      case 'admin':
        return 'shield-checkmark';
      default:
        return 'person';
    }
  };

  const renderUserCard = ({ item: user }: { item: User }) => (
    <View key={user.id} style={styles.userCard}>
      <View style={styles.userCardHeader}>
        <View style={styles.userCardLeft}>
          <View style={[styles.avatar, { backgroundColor: getRoleBadgeColor(user.role) }]}>
            {user.avatar && getAvatarUrl(user.avatar) ? (
              <Image
                source={{ uri: getAvatarUrl(user.avatar)! }}
                style={styles.avatarImage}
                onError={() => {}}
              />
            ) : (
              <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
            )}
          </View>
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{user.name}</Text>
              <View
                style={[
                  styles.roleBadge,
                  user.role === 'superAdmin'
                    ? styles.superAdminBadge
                    : user.role === 'admin'
                    ? styles.adminBadge
                    : styles.userBadge,
                ]}
              >
                <Icon name={getRoleIcon(user.role)} size={12} color={getRoleBadgeColor(user.role)} style={{ opacity: 0.7 }} />
                <Text
                  style={[
                    styles.roleText,
                    user.role === 'superAdmin'
                      ? styles.superAdminText
                      : user.role === 'admin'
                      ? styles.adminText
                      : styles.userText,
                  ]}
                >
                  {getRoleName(user.role)}
                </Text>
              </View>
            </View>
            <Text style={styles.userEmail}>{user.email}</Text>
            {user.phone && <Text style={styles.userPhone}>{formatPhone(user.phone)}</Text>}
          </View>
        </View>
      </View>

      <View style={styles.userCardActions}>
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, !user.active && styles.statusInactive]}>
            {user.active ? 'Aktif' : 'Pasif'}
          </Text>
          <IOSSwitch value={user.active} onValueChange={() => handleToggleActive(user)} />
        </View>
        <View style={styles.actionButtons}>
          <IconButton
            icon="create-outline"
            onPress={() => handleEditUser(user)}
            size={40}
            iconSize={20}
          />
          {user.role === 'user' && (
            <IconButton
              icon="lock-closed-outline"
              onPress={() => handlePermissions(user)}
              size={40}
              iconSize={20}
              color={colors.green}
              backgroundColor={`${colors.green}15`}
            />
          )}
          <IconButton
            icon="trash-outline"
            onPress={() => handleDeleteUser(user)}
            size={40}
            iconSize={20}
            color={colors.danger}
            backgroundColor={`${colors.danger}15`}
          />
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <EmptyState />
  );

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header
          title="Kullanıcı Yönetimi"
          leftButton={<BackButton onPress={handleBack} />}
          rightButton={
            <View style={styles.headerRight}>
              <AddButton onPress={handleAddUser} />
              <SearchButton onPress={handleToggleSearch} />
            </View>
          }
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={isDark ? '#D1D5DB' : '#6B7280'}
              colors={[isDark ? '#D1D5DB' : '#6B7280']}
            />
          }
        >

          {/* Search */}
          {searchVisible && (
            <View style={styles.searchContainer}>
              <SearchInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Kullanıcı ara..."
              />
            </View>
          )}

          {/* User List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner size={80} />
            </View>
          ) : (
            <View style={[
              styles.listContent,
              filteredUsers.length === 0 && styles.listContentEmpty,
              !searchVisible && { paddingTop: 16 }
            ]}>
              {filteredUsers.length === 0 ? (
                renderEmptyState()
              ) : (
                filteredUsers.map((user) =>
                  renderUserCard({ item: user })
                )
              )}
            </View>
          )}
        </ScrollView>

        <TabBar activeTab={activeTab} onTabPress={handleTabPress} />

        {/* User Modal */}
        <ActionFormModal
          visible={showUserModal}
          title={isEditMode ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
          icon={isEditMode ? 'create-outline' : 'person-add-outline'}
          iconColor={colors.primary}
          onClose={() => setShowUserModal(false)}
          onSave={handleSaveUser}
          saveButtonText="Kaydet"
          cancelButtonText="İptal"
          saveDisabled={isSaving}
          errorMessage={formError}
          toastRef={toastRef}
        >
          <UserForm
            formName={formName}
            formEmail={formEmail}
            formPhone={formPhone}
            formPassword={formPassword}
            formRole={formRole}
            formDefaultScreen={formDefaultScreen}
            formPermissions={formPermissions}
            formSubeYetkileri={formSubeYetkileri}
            formVarsayilanSube={formVarsayilanSube}
            subeler={subeler}
            isEditMode={isEditMode}
            availablePrograms={availablePrograms}
            onNameChange={(v) => { setFormName(v); setFieldErrors(e => ({ ...e, name: false })); }}
            onEmailChange={(v) => { setFormEmail(v); setFieldErrors(e => ({ ...e, email: false })); }}
            onPhoneChange={(v) => { setFormPhone(v); setFieldErrors(e => ({ ...e, phone: false })); }}
            onPasswordChange={(v) => { setFormPassword(v); setFieldErrors(e => ({ ...e, password: false })); }}
            onRoleChange={handleRoleChange}
            onDefaultScreenChange={setFormDefaultScreen}
            onPermissionsChange={setFormPermissions}
            onSubeYetkileriChange={setFormSubeYetkileri}
            onVarsayilanSubeChange={setFormVarsayilanSube}
            errors={fieldErrors}
            errorMessage={formError}
          />
        </ActionFormModal>

        {/* Delete Confirmation */}
        <ConfirmDialog
          visible={showDeleteConfirm}
          title="Kullanıcı Sil"
          message={`${selectedUser?.name} kullanıcısını silmek istediğinize emin misiniz?`}
          confirmText="Sil"
          cancelText="İptal"
          icon="trash-outline"
          iconColor={colors.danger}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
        />

        {/* Active/Inactive Confirmation */}
        <ConfirmDialog
          visible={showActiveConfirm}
          title={selectedUser?.active ? 'Kullanıcıyı Pasife Al' : 'Kullanıcıyı Aktif Et'}
          message={`${selectedUser?.name} kullanıcısını ${selectedUser?.active ? 'pasif' : 'aktif'} yapmak istediğinize emin misiniz?`}
          confirmText={selectedUser?.active ? 'Pasife Al' : 'Aktif Et'}
          cancelText="İptal"
          icon={selectedUser?.active ? 'close-circle-outline' : 'checkmark-circle-outline'}
          iconColor={selectedUser?.active ? colors.orange : colors.green}
          onConfirm={handleActiveConfirm}
          onCancel={() => setShowActiveConfirm(false)}
        />

        {/* Yetki Tanımlama Sheet */}
        {selectedUser && (
          <UserPermissionsSheet
            visible={showPermissionsSheet}
            userName={selectedUser.name}
            activePrograms={selectedUser.permissions ?? {}}
            initialYetkiler={selectedUser.programYetkileri ?? {}}
            initialBarcodePermissions={selectedUser.barcodePermissions}
            isSaving={isSavingPermissions}
            onClose={() => setShowPermissionsSheet(false)}
            onSave={handleSavePermissions}
          />
        )}
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
      paddingBottom: 100,
    },
    headerRight: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    searchContainer: {
      padding: 16,
    },
    listContent: {
      padding: 16,
      paddingTop: 0,
    },
    listContentEmpty: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    userCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
    },
    userCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    userCardLeft: {
      flexDirection: 'row',
      gap: 12,
      flex: 1,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 3,
      borderColor: colors.primary + '40',
    },
    avatarImage: {
      width: 56,
      height: 56,
    },
    avatarText: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    userInfo: {
      flex: 1,
    },
    userNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    userEmail: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    userPhone: {
      fontSize: 13,
      color: colors.textTertiary,
      marginTop: 2,
    },
    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    superAdminBadge: {
      backgroundColor: isDark ? 'rgba(20, 184, 166, 0.2)' : '#F0FDFA',
    },
    adminBadge: {
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#EEF2FF',
    },
    userBadge: {
      backgroundColor: isDark ? 'rgba(129, 140, 248, 0.2)' : '#E0E7FF',
    },
    roleText: {
      fontSize: 11,
      fontWeight: '600',
      opacity: 0.7,
    },
    superAdminText: {
      color: '#14B8A6',
    },
    adminText: {
      color: colors.primary,
    },
    userText: {
      color: '#818CF8',
    },
    userCardActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.green,
    },
    statusInactive: {
      color: colors.textTertiary,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
  });
