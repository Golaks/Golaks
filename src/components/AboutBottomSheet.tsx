import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import DeviceInfo from 'react-native-device-info';
import { useTheme } from '../contexts/ThemeContext';
import BottomSheet from './BottomSheet';

const Logo = require('../assets/images/golaks-logo.png');

interface AboutBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

const SERVICES = [
  { icon: 'layers-outline', color: '#3B82F6', title: 'Deri Yazılımları', desc: 'Sektöre özel ERP çözümleri' },
  { icon: 'laptop-outline', color: '#8B5CF6', title: 'Özel Yazılım', desc: 'Kurumsal yazılım projeleri' },
  { icon: 'server-outline', color: '#10B981', title: 'Sunucu & Barındırma', desc: 'Güvenli bulut altyapısı' },
  { icon: 'headset-outline', color: '#F59E0B', title: 'Destek Servisleri', desc: '7/24 müşteri desteği' },
];

export default function AboutBottomSheet({ visible, onClose }: AboutBottomSheetProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const appVersion = DeviceInfo.getVersion();
  const buildNumber = DeviceInfo.getBuildNumber();
  const year = new Date().getFullYear();
  const years = year - 1995;

  const handleLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const stats = [
    { value: '1995', label: 'Kuruluş', icon: 'calendar-outline', color: '#3B82F6' },
    { value: '300+', label: 'Müşteri', icon: 'business-outline', color: '#8B5CF6' },
    { value: `${years}`, label: 'Yıl Tecrübe', icon: 'trophy-outline', color: '#F59E0B' },
  ];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Uygulama Hakkında"
      icon="information-circle-outline"
      iconColor={colors.primary}>

      {/* Logo & Version */}
      <View style={styles.logoSection}>
        <Image source={Logo} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>
          Versiyon {appVersion} ({buildNumber})
        </Text>
      </View>

      {/* Company Intro Card */}
      <View style={[styles.sectionCard, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
        <View style={styles.sectionCardHeader}>
          <View style={[styles.sectionCardIcon, { backgroundColor: colors.primary + '15' }]}>
            <Icon name="business-outline" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.sectionCardTitle, { color: colors.text }]}>Golaks Yazılım</Text>
        </View>
        <Text style={[styles.sectionCardDesc, { color: colors.textSecondary }]}>
          1995 yılında kurulan Golaks, Türkiye'nin deri yazılımları alanında hizmet veren ilk firmasıdır. {years} yılı aşkın tecrübesiyle 300'ü aşkın firmaya hizmet vermektedir.
        </Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {stats.map((stat, idx) => (
          <View key={idx} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconWrap, { backgroundColor: stat.color + '15' }]}>
              <Icon name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Mission Card */}
      <View style={[styles.sectionCard, { backgroundColor: '#10B98108', borderColor: '#10B98120' }]}>
        <View style={styles.sectionCardHeader}>
          <View style={[styles.sectionCardIcon, { backgroundColor: '#10B98115' }]}>
            <Icon name="flag-outline" size={18} color="#10B981" />
          </View>
          <Text style={[styles.sectionCardTitle, { color: colors.text }]}>Vizyonumuz</Text>
        </View>
        <Text style={[styles.sectionCardDesc, { color: colors.textSecondary }]}>
          "Siz işinize odaklanın, operasyon ve finansınızı yazılımlarımız yönetsin." Yenilenme ve teknolojiyi takip etme felsefesiyle yolumuza devam ediyoruz.
        </Text>
      </View>

      {/* Services Section */}
      <View style={styles.sectionTitleRow}>
        <Icon name="grid-outline" size={18} color={colors.primary} />
        <Text style={[styles.sectionTitleText, { color: colors.text }]}>Hizmetlerimiz</Text>
      </View>

      {SERVICES.map((service, idx) => (
        <View key={idx} style={[styles.serviceItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.serviceIcon, { backgroundColor: service.color + '15' }]}>
            <Icon name={service.icon} size={20} color={service.color} />
          </View>
          <View style={styles.serviceContent}>
            <Text style={[styles.serviceTitle, { color: colors.text }]}>{service.title}</Text>
            <Text style={[styles.serviceDesc, { color: colors.textSecondary }]}>{service.desc}</Text>
          </View>
        </View>
      ))}

      {/* Contact Section */}
      <View style={[styles.sectionTitleRow, { marginTop: 8 }]}>
        <Icon name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
        <Text style={[styles.sectionTitleText, { color: colors.text }]}>İletişim</Text>
      </View>

      {[
        { icon: 'call-outline', color: '#10B981', label: '(850)466-4664', url: 'tel:+908504664664' },
        { icon: 'mail-outline', color: '#3B82F6', label: 'info@golaks.com', url: 'mailto:info@golaks.com' },
        { icon: 'globe-outline', color: '#8B5CF6', label: 'www.golaks.com', url: 'https://www.golaks.com' },
      ].map((item, index) => (
        <Pressable
          key={index}
          onPress={() => handleLink(item.url)}
          style={[styles.contactItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.contactItemIcon, { backgroundColor: item.color + '15' }]}>
            <Icon name={item.icon} size={18} color={item.color} />
          </View>
          <Text style={[styles.contactItemLabel, { color: colors.text }]}>{item.label}</Text>
          <Icon name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>
      ))}

      {/* Office Section */}
      <View style={[styles.sectionTitleRow, { marginTop: 8 }]}>
        <Icon name="location-outline" size={18} color={colors.primary} />
        <Text style={[styles.sectionTitleText, { color: colors.text }]}>Ofisler</Text>
      </View>

      {/* Turkey Office */}
      <View style={[styles.addressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.addressCardHeader}>
          <Text style={{ fontSize: 28 }}>{'\u{1F1F9}\u{1F1F7}'}</Text>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.addressTitle, { color: colors.text }]}>Türkiye (Merkez)</Text>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>Aktif</Text>
            </View>
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <View style={styles.addressRow}>
            <Icon name="location-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.addressText, { color: colors.textSecondary }]}>
              Alipaşa Mah. Sülün Cad.{'\n'}Ballıoğlu İş Merkezi, Çorlu/Tekirdağ
            </Text>
          </View>
          <View style={styles.addressRow}>
            <Icon name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.addressText, { color: colors.textSecondary }]}>09:00 - 18:00 (GMT+3)</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <Text style={[styles.footer, { color: colors.textSecondary }]}>
        © 1995-{year} Golaks Yazılım. Tüm Hakları Saklıdır.
      </Text>
    </BottomSheet>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    logoSection: {
      alignItems: 'center',
      marginBottom: 20,
    },
    logo: {
      height: 50,
      width: 160,
    },
    versionText: {
      fontSize: 12,
      marginTop: 4,
    },
    sectionCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 16,
      marginBottom: 12,
    },
    sectionCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 10,
    },
    sectionCardIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sectionCardTitle: {
      fontSize: 15,
      fontWeight: '700',
      flex: 1,
    },
    sectionCardDesc: {
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'justify',
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
      gap: 4,
    },
    statIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 2,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '800',
    },
    statLabel: {
      fontSize: 10,
      fontWeight: '500',
      textAlign: 'center',
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    sectionTitleText: {
      fontSize: 16,
      fontWeight: '700',
    },
    serviceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 8,
      gap: 12,
    },
    serviceIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    serviceContent: {
      flex: 1,
    },
    serviceTitle: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 2,
    },
    serviceDesc: {
      fontSize: 12,
      lineHeight: 17,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
      marginBottom: 8,
    },
    contactItemIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contactItemLabel: {
      fontSize: 14,
      fontWeight: '600',
      flex: 1,
    },
    addressCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 16,
      marginBottom: 12,
    },
    addressCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    addressTitle: {
      fontSize: 15,
      fontWeight: '700',
    },
    activeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: '#10B98115',
      gap: 4,
    },
    activeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#10B981',
    },
    activeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#10B981',
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    addressText: {
      fontSize: 13,
      flex: 1,
      lineHeight: 18,
    },
    footer: {
      fontSize: 11,
      textAlign: 'center',
      marginTop: 4,
    },
  });
