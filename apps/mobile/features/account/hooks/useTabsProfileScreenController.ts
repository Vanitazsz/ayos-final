import {
  fetchCustomerProfile,
  signOut,
  selectImage,
  updateMyProfile,
  uploadMyAvatar,
} from '../logic/TabsProfileScreenLogic';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

export function useTabsProfileScreenController() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const load = async () => {
    const result = await fetchCustomerProfile();
    if (result.error) {
      setLoadError(result.error);
      setProfile(null);
      return;
    }
    setProfile(result.data);
    setName(result.data.name);
    setMobile(user?.phone ?? '');
    setLoadError('');
  };
  useEffect(() => {
    void load();
  }, []);
  const chooseAvatar = async () => {
    try {
      const result = await selectImage({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result) return;
      const updated = await uploadMyAvatar(
        result.uri,
        result.mimeType ?? 'image/jpeg',
      );
      setProfile((current: any) => ({
        ...current,
        avatarUri: updated.avatarUri,
      }));
    } catch (error) {
      Alert.alert(
        'Profile photo',
        error instanceof Error
          ? error.message
          : 'Unable to update profile photo',
      );
    }
  };
  const saveProfile = async () => {
    try {
      const normalizedMobile = mobile.startsWith('0')
        ? `+63${mobile.slice(1)}`
        : mobile;
      const updated = await updateMyProfile({
        displayName: name,
        mobile: normalizedMobile || null,
        complete: true,
      });
      setProfile((current: any) => ({
        ...current,
        name: updated.displayName,
        profileComplete: updated.profileComplete,
      }));
      setEditing(false);
    } catch (error) {
      Alert.alert(
        'Profile update',
        error instanceof Error ? error.message : 'Unable to update profile',
      );
    }
  };
  const handleLogout = () => {
    void signOut().then(() => {
      logout();
      router.replace('/');
    });
  };
  return {
    router,
    profile,
    loadError,
    editing,
    setEditing,
    name,
    setName,
    mobile,
    setMobile,
    chooseAvatar,
    saveProfile,
    handleLogout,
    Image,
  };
}
