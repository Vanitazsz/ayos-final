import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Bell,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Globe2,
  Heart,
  History,
  Languages,
  LockKeyhole,
  LogOut,
  MapPin,
  ShieldCheck,
  UserRound,
  Wallet,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  CustomerPage,
  MenuRow,
  PageHeader,
  StatusPill,
  SurfaceCard,
  customerColors,
} from '@/components/customer/CustomerUI';
import { fetchCustomerProfile } from '@/services/api';
import { uploadMyAvatar } from '@/services/profile';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';

const sections = [
  {
    title: 'Personal',
    rows: [
      [UserRound, 'Personal Information', '/account/personal-information'],
      [MapPin, 'Saved Addresses', '/settings/addresses'],
      [Heart, 'Favorite Workers', '/account/favorites'],
    ],
  },
  {
    title: 'Payments',
    rows: [
      [Wallet, 'My Wallet', '/account/wallet'],
      [CreditCard, 'Payment Methods', '/account/payments'],
      [History, 'Payment History', '/account/transactions'],
    ],
  },
  {
    title: 'Settings',
    rows: [
      [Bell, 'Preferences', '/account/preferences'],
      [Bell, 'Notifications', '/notifications'],
      [Languages, 'Language and Region', '/settings/language'],
    ],
  },
  {
    title: 'Support',
    rows: [
      [CircleHelp, 'Help Center', '/account/help-center'],
      [Globe2, 'Support & Legal', '/account/support'],
      [Globe2, 'Contact Us', '/account/contact-support'],
    ],
  },
  {
    title: 'Security',
    rows: [
      [LockKeyhole, 'Change Password', '/account/security'],
      [ShieldCheck, 'Login and Security', '/(auth)/verify-identity'],
      [LogOut, 'Delete Account', '/account/delete-account'],
    ],
  },
] as const;

export default function AccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState('');

  const load = async () => {
    const result = await fetchCustomerProfile();
    setProfile(result.data || null);
    setError(result.error ?? '');
  };

  useEffect(() => {
    void load();
  }, []);

  const chooseAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled) return;
      const updated = await uploadMyAvatar(
        result.assets[0].uri,
        result.assets[0].mimeType ?? 'image/jpeg',
      );
      setProfile((current: any) => ({ ...current, avatarUri: updated.avatarUri }));
    } catch (uploadError) {
      Alert.alert('Profile photo', uploadError instanceof Error ? uploadError.message : 'Unable to update your photo.');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    logout();
    router.replace('/');
  };

  return (
    <CustomerPage testID="customer-account">
      <PageHeader title="Account" subtitle="Manage your profile, payments, and preferences" />

      <SurfaceCard style={styles.profileCard}>
        <Pressable accessibilityLabel="Change profile photo" onPress={chooseAvatar}>
          {profile?.avatarUri ? (
            <Image source={profile.avatarUri} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.initial}>{(profile?.name || user?.name || 'A').charAt(0)}</Text>
            </View>
          )}
          <View style={styles.editDot}><UserRound size={13} color={customerColors.surface} /></View>
        </Pressable>
        <View style={styles.profileCopy}>
          <Text style={styles.name}>{profile?.name || user?.name || 'Loading profile…'}</Text>
          <Text style={styles.email}>{profile?.email || user?.email || error}</Text>
          <View style={styles.verification}>
            <StatusPill
              label={profile?.emailVerified ? 'Verified account' : 'Verification pending'}
              tone={profile?.emailVerified ? 'success' : 'warning'}
            />
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          onPress={() => router.push('/account/personal-information')}
          style={styles.editButton}
        >
          <ChevronRight size={20} color={customerColors.primary} />
        </Pressable>
      </SurfaceCard>

      {sections.map((section, sectionIndex) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <SurfaceCard>
            {section.rows.map(([icon, label, route], index) => (
              <MenuRow
                key={label}
                icon={icon}
                label={label}
                onPress={() => router.push(route as any)}
                last={index === section.rows.length - 1}
                color={sectionIndex === 1 ? customerColors.purple : undefined}
                background={sectionIndex === 1 ? customerColors.purpleSoft : undefined}
              />
            ))}
          </SurfaceCard>
        </View>
      ))}

      <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.logout}>
        <LogOut size={20} color={customerColors.danger} />
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
      <Text style={styles.version}>A-yos customer app · Secure home services</Text>
    </CustomerPage>
  );
}

const styles = StyleSheet.create({
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: customerColors.border },
  avatarFallback: { width: 68, height: 68, borderRadius: 34, backgroundColor: customerColors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  initial: { color: customerColors.primary, fontSize: 25, fontWeight: '800' },
  editDot: { position: 'absolute', right: 0, bottom: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: customerColors.primary, borderWidth: 2, borderColor: customerColors.surface, alignItems: 'center', justifyContent: 'center' },
  profileCopy: { flex: 1, marginLeft: 14 },
  name: { color: customerColors.navy, fontSize: 18, fontWeight: '800' },
  email: { color: customerColors.muted, fontSize: 12, marginTop: 4 },
  verification: { marginTop: 8 },
  editButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: customerColors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: 24 },
  sectionTitle: { color: customerColors.navy, fontSize: 17, fontWeight: '700', marginBottom: 10, marginLeft: 3 },
  logout: { minHeight: 54, borderRadius: 17, backgroundColor: customerColors.dangerSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 26 },
  logoutText: { color: customerColors.danger, fontSize: 15, fontWeight: '700' },
  version: { color: customerColors.subtle, fontSize: 11, textAlign: 'center', marginTop: 16 },
});
