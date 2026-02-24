import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
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
import UserForm from '../components/UserForm';
import LoadingSpinner from '../components/LoadingSpinner';
import BottomSheet from '../components/BottomSheet';

interface Sube {
  id: string;
  name: string;
}

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
  permissions: {
    muhasebe?: boolean;
    tabakhane?: boolean;
    konfeksiyon?: boolean;
    magaza?: boolean;
  };
  subeYetkileri?: string[];
  barcodePermissions?: {
    entryPrice?: boolean;
    costPrice?: boolean;
    labelPrice?: boolean;
  };
}

interface UserManagementScreenProps {
  onTabChange?: (tab: TabName) => void;
  onLogout?: () => void;
}

export default function UserManagementScreen({ onTabChange, onLogout }: UserManagementScreenProps) {
  const { colors, isDark } = useTheme();
  const { logout, user: authUser } = useAuth();
  const { showSuccess, showError } = useAlert();

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
  const [permissionsUser, setPermissionsUser] = useState<User | null>(null);
  const [permPrices, setPermPrices] = useState({ entryPrice: false, costPrice: false, labelPrice: false });
  const [isSavingPerms, setIsSavingPerms] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  // Şube Yetkileri
  const [showBranchSheet, setShowBranchSheet] = useState(false);
  const [branchUser, setBranchUser] = useState<User | null>(null);
  const [subeler, setSubeler] = useState<Sube[]>([]);
  const [selectedSubeler, setSelectedSubeler] = useState<Set<string>>(new Set());
  const [isLoadingSubeler, setIsLoadingSubeler] = useState(false);
  const [isSavingBranch, setIsSavingBranch] = useState(false);

  const styles = createStyles(colors, isDark);

  useEffect(() => {
    fetchUsers();
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

    // Normalize phone number: remove +90, 90, spaces, and ensure it starts with 0
    let normalizedPhone = (user.phone || '').replace(/\s/g, ''); // Remove spaces
    if (normalizedPhone.startsWith('+90')) {
      normalizedPhone = '0' + normalizedPhone.slice(3);
    } else if (normalizedPhone.startsWith('90') && normalizedPhone.length === 12) {
      normalizedPhone = '0' + normalizedPhone.slice(2);
    } else if (!normalizedPhone.startsWith('0') && normalizedPhone.length === 10) {
      normalizedPhone = '0' + normalizedPhone;
    }
    // Remove all non-digit characters for clean storage
    normalizedPhone = normalizedPhone.replace(/\D/g, '');

    setFormPhone(normalizedPhone);
    setFormPassword('');
    setFormRole(user.role);
    setFormDefaultScreen(user.defaultScreen || 'apps');
    setFormPermissions({
      muhasebe: user.permissions.muhasebe ?? false,
      tabakhane: user.permissions.tabakhane ?? false,
      konfeksiyon: user.permissions.konfeksiyon ?? false,
      magaza: user.permissions.magaza ?? false,
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    // Validasyon
    if (!formName.trim()) {
      showError('Ad soyad gerekli');
      return;
    }

    if (!formEmail.trim()) {
      showError('E-posta gerekli');
      return;
    }

    if (!isEditMode && !formPassword.trim()) {
      showError('Şifre gerekli');
      return;
    }

    setIsSaving(true);

    try {
      const requestBody: any = {
        name: formName,
        email: formEmail,
        phone: formPhone,
        role: formRole,
        defaultScreen: formDefaultScreen,
        permissions: formPermissions,
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
        showSuccess(isEditMode ? 'Kullanıcı güncellendi' : 'Kullanıcı oluşturuldu');
        setShowUserModal(false);
        await fetchUsers();
      } else {
        showError(data.error?.message || 'İşlem başarısız');
      }
    } catch (error) {
      showError('Bağlantı hatası. Lütfen tekrar deneyin.');
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
    setPermissionsUser(user);
    setPermPrices({
      entryPrice: user.barcodePermissions?.entryPrice ?? false,
      costPrice: user.barcodePermissions?.costPrice ?? false,
      labelPrice: user.barcodePermissions?.labelPrice ?? false,
    });
    setShowPermissionsSheet(true);
  };

  const handleSavePermissions = async () => {
    if (!permissionsUser) return;

    setIsSavingPerms(true);
    try {
      const token = await getToken();

      const response = await fetch(API_ENDPOINTS.USER_UPDATE, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: permissionsUser.id,
          name: permissionsUser.name,
          email: permissionsUser.email,
          phone: permissionsUser.phone,
          role: permissionsUser.role,
          active: permissionsUser.active,
          permissions: permissionsUser.permissions,
          barcodePermissions: permPrices,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Yetkiler güncellendi');
        setUsers(prev =>
          prev.map(u =>
            u.id === permissionsUser.id
              ? { ...u, barcodePermissions: { ...permPrices } }
              : u
          )
        );
        setShowPermissionsSheet(false);
        setPermissionsUser(null);
      } else {
        showError(data.message || data.error?.message || 'Yetkiler güncellenemedi');
      }
    } catch (error: any) {
      console.error('Permissions kaydetme hatası:', error);
      showError(error?.message || 'Bağlantı hatası');
    } finally {
      setIsSavingPerms(false);
    }
  };

  const handleBranchPermissions = async (user: User) => {
    setBranchUser(user);
    setSelectedSubeler(new Set(user.subeYetkileri || []));
    setShowBranchSheet(true);
    await fetchSubeler();
  };

  const fetchSubeler = async () => {
    setIsLoadingSubeler(true);
    try {
      const token = await getToken();
      const dataName = authUser?.firmaAyarlar?.veritabani?.veriAdi;

      if (!dataName) {
        showError('Firma bilgisi bulunamadı');
        return;
      }

      const response = await fetch(API_ENDPOINTS.ACCOUNT_SUBELER, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dataName }),
      });

      const data = await response.json();

      if (data.success && data.data?.subeler) {
        setSubeler(data.data.subeler);
      } else {
        showError(data.error?.message || 'Şubeler yüklenemedi');
      }
    } catch {
      showError('Şubeler yüklenirken bağlantı hatası oluştu');
    } finally {
      setIsLoadingSubeler(false);
    }
  };

  const toggleSube = (subeId: string) => {
    setSelectedSubeler(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subeId)) {
        newSet.delete(subeId);
      } else {
        newSet.add(subeId);
      }
      return newSet;
    });
  };

  const handleSaveBranchPermissions = async () => {
    if (!branchUser) return;

    setIsSavingBranch(true);
    try {
      const token = await getToken();

      const response = await fetch(API_ENDPOINTS.USER_BRANCH_PERMISSIONS, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: branchUser.id,
          subeler: Array.from(selectedSubeler),
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Şube yetkileri güncellendi');
        setShowBranchSheet(false);
        // Update local user data
        setUsers(prev =>
          prev.map(u =>
            u.id === branchUser.id
              ? { ...u, subeYetkileri: Array.from(selectedSubeler) }
              : u
          )
        );
      } else {
        showError(data.error?.message || 'Şube yetkileri güncellenemedi');
      }
    } catch {
      showError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setIsSavingBranch(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
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
            {user.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
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
          <IconButton
            icon="business-outline"
            onPress={() => handleBranchPermissions(user)}
            size={40}
            iconSize={20}
            color={colors.orange}
            backgroundColor={`${colors.orange}15`}
            badge={(user.subeYetkileri?.length ?? 0)}
          />
          <IconButton
            icon="lock-closed-outline"
            onPress={() => handlePermissions(user)}
            size={40}
            iconSize={20}
            color={colors.green}
            backgroundColor={`${colors.green}15`}
          />
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
              <IconButton icon="search-outline" onPress={handleToggleSearch} />
              <IconButton icon="add" onPress={handleAddUser} />
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
        <BottomSheet
          visible={showUserModal}
          title={isEditMode ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
          icon={isEditMode ? 'create-outline' : 'person-add-outline'}
          iconColor={colors.primary}
          onClose={() => setShowUserModal(false)}
          onSave={handleSaveUser}
          saveText="Kaydet"
          cancelText="İptal"
          saveDisabled={isSaving}
          height={SCREEN_HEIGHT * 0.9}
        >
          <UserForm
            formName={formName}
            formEmail={formEmail}
            formPhone={formPhone}
            formPassword={formPassword}
            formRole={formRole}
            formDefaultScreen={formDefaultScreen}
            formPermissions={formPermissions}
            isEditMode={isEditMode}
            availablePrograms={availablePrograms}
            onNameChange={setFormName}
            onEmailChange={setFormEmail}
            onPhoneChange={setFormPhone}
            onPasswordChange={setFormPassword}
            onRoleChange={handleRoleChange}
            onDefaultScreenChange={setFormDefaultScreen}
            onPermissionsChange={setFormPermissions}
          />
        </BottomSheet>

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

        {/* Şube Yetkileri Bottom Sheet */}
        <BottomSheet
          visible={showBranchSheet}
          title={`Şube Yetkileri${branchUser ? ` - ${branchUser.name}` : ''}`}
          icon="business-outline"
          iconColor={colors.orange}
          onClose={() => {
            setShowBranchSheet(false);
            setBranchUser(null);
          }}
          onSave={handleSaveBranchPermissions}
          saveText="Kaydet"
          saveDisabled={isSavingBranch}
        >
          {isLoadingSubeler ? (
            <View style={styles.branchLoading}>
              <LoadingSpinner size={50} />
            </View>
          ) : subeler.length === 0 ? (
            <View style={styles.branchEmpty}>
              <Icon name="business-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.branchEmptyText}>Şube bulunamadı</Text>
            </View>
          ) : (
            <View style={styles.branchList}>
              {/* Tümünü Seç */}
              <Pressable
                style={styles.branchSelectAll}
                onPress={() => {
                  if (selectedSubeler.size === subeler.length) {
                    setSelectedSubeler(new Set());
                  } else {
                    setSelectedSubeler(new Set(subeler.map(s => s.id)));
                  }
                }}
              >
                <View style={styles.branchSelectAllLeft}>
                  <Icon
                    name={selectedSubeler.size === subeler.length ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={selectedSubeler.size === subeler.length ? colors.primary : colors.textSecondary}
                  />
                  <Text style={styles.branchSelectAllText}>Tümünü Seç</Text>
                </View>
                <Text style={styles.branchCount}>
                  {selectedSubeler.size}/{subeler.length}
                </Text>
              </Pressable>

              {/* Şube Listesi */}
              {subeler.map((sube) => {
                const isSelected = selectedSubeler.has(sube.id);
                return (
                  <Pressable
                    key={sube.id}
                    style={[styles.branchItem, isSelected && styles.branchItemSelected]}
                    onPress={() => toggleSube(sube.id)}
                  >
                    <View style={styles.branchItemLeft}>
                      <View style={[
                        styles.branchIcon,
                        { backgroundColor: isSelected ? colors.orange + '15' : colors.card }
                      ]}>
                        <Icon
                          name="location-outline"
                          size={20}
                          color={isSelected ? colors.orange : colors.textSecondary}
                        />
                      </View>
                      <Text style={[
                        styles.branchName,
                        isSelected && { color: colors.text, fontWeight: '600' }
                      ]}>
                        {sube.name}
                      </Text>
                    </View>
                    <IOSSwitch
                      value={isSelected}
                      onValueChange={() => toggleSube(sube.id)}
                    />
                  </Pressable>
                );
              })}
            </View>
          )}
        </BottomSheet>

        {/* Kullanıcı Yetkileri Bottom Sheet */}
        <BottomSheet
          visible={showPermissionsSheet}
          title={`Yetkiler${permissionsUser ? ` - ${permissionsUser.name}` : ''}`}
          icon="lock-closed-outline"
          iconColor={colors.green}
          onClose={() => {
            setShowPermissionsSheet(false);
            setPermissionsUser(null);
          }}
          onSave={handleSavePermissions}
          saveText="Kaydet"
          saveDisabled={isSavingPerms}
        >
          {/* Fiyat Görüntüleme Yetkileri */}
          <View style={styles.permSectionHeader}>
            <View style={[styles.permSectionIcon, { backgroundColor: '#22C55E15' }]}>
              <Icon name="cash-outline" size={18} color="#22C55E" />
            </View>
            <View>
              <Text style={styles.permSectionTitle}>Fiyat Görüntüleme Yetkileri</Text>
              <Text style={styles.permSectionDesc}>Barkod sorgusunda görüntülenecek fiyatlar</Text>
            </View>
          </View>

          <View style={styles.permCard}>
            {([
              { key: 'entryPrice' as const, label: 'Giriş Fiyatı', icon: 'enter-outline', color: '#3B82F6' },
              { key: 'costPrice' as const, label: 'Maliyet Fiyatı', icon: 'calculator-outline', color: '#F59E0B' },
              { key: 'labelPrice' as const, label: 'Etiket Fiyatı', icon: 'pricetag-outline', color: '#22C55E' },
            ]).map((item, index, arr) => (
              <React.Fragment key={item.key}>
                <Pressable
                  style={styles.permRow}
                  onPress={() => setPermPrices(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                >
                  <View style={styles.permRowLeft}>
                    <View style={[styles.permRowIcon, { backgroundColor: item.color + '15' }]}>
                      <Icon name={item.icon} size={18} color={item.color} />
                    </View>
                    <Text style={styles.permRowLabel}>{item.label}</Text>
                  </View>
                  <IOSSwitch
                    value={permPrices[item.key]}
                    onValueChange={(val) => setPermPrices(prev => ({ ...prev, [item.key]: val }))}
                  />
                </Pressable>
                {index < arr.length - 1 && <View style={styles.permDivider} />}
              </React.Fragment>
            ))}
          </View>
        </BottomSheet>
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
      gap: 8,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    // Branch permissions styles
    branchLoading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
    },
    branchEmpty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
      gap: 12,
    },
    branchEmptyText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    branchList: {
      gap: 8,
    },
    branchSelectAll: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 4,
    },
    branchSelectAllLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    branchSelectAllText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    branchCount: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    branchItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    branchItemSelected: {
      borderColor: colors.orange + '40',
      backgroundColor: colors.orange + '08',
    },
    branchItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    branchIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    branchName: {
      fontSize: 15,
      color: colors.textSecondary,
      flex: 1,
    },
    permSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },
    permSectionIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    permSectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    permSectionDesc: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    permCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    permRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    permRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    permRowIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    permRowLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    permDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: 14,
    },
  });
