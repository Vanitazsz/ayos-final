import {
  fetchWorkerProfile,
  formatRating,
  signOut,
  selectImage,
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
  fetchActiveSubdivisions,
  setMySubdivision,
  normalizePhilippinePhone,
  type Subdivision,
} from '../logic/WorkerProfileScreenLogic';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';

export function useWorkerProfileScreenController() {
  const router = useRouter();
  const [workerProfile, setWorkerProfile] = useState<any>(null);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [bio, setBio] = useState('');
  const [subdivisions, setSubdivisions] = useState<Subdivision[]>([]);
  const [subdivisionId, setSubdivisionId] = useState('');
  const load = useCallback(async () => {
    setLoadError('');
    try {
      const result = await fetchWorkerProfile();
      if (result.error || !result.data) {
        throw new Error(result.error ?? 'Worker profile is not active');
      }

      let accountProfile: Awaited<ReturnType<typeof getMyProfile>> | null =
        null;
      try {
        accountProfile = await getMyProfile();
      } catch {
        // The worker profile data is sufficient to render this screen. Account
        // details are optional here and may be unavailable during migrations.
      }
      if (accountProfile?.role && accountProfile.role !== 'WORKER') {
        throw new Error('Worker profile is not active');
      }

      let areas: Subdivision[] = [];
      try {
        areas = await fetchActiveSubdivisions();
      } catch {
        // Subdivisions are only needed by the edit form and must not block the profile.
      }

      const workerAccountProfile =
        accountProfile?.role === 'WORKER' ? accountProfile : null;
      const selected = areas.find(
        (item) => item.id === workerAccountProfile?.subdivisionId,
      );
      setSubdivisions(areas);
      setSubdivisionId(workerAccountProfile?.subdivisionId ?? '');
      setWorkerProfile({
        ...result.data,
        subdivisionName: selected?.name ?? '',
      });
      setName(result.data.name);
      setMobile(workerAccountProfile?.mobile ?? '');
      setServiceArea(
        workerAccountProfile?.serviceArea ?? result.data.serviceAreas[0] ?? '',
      );
      setBio(workerAccountProfile?.bio ?? result.data.bio ?? '');
    } catch (error) {
      setWorkerProfile(null);
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load worker profile',
      );
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
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
      setWorkerProfile((current: any) => ({
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
      const normalizedMobile = normalizePhilippinePhone(mobile);
      await updateMyProfile({
        displayName: name,
        mobile: normalizedMobile || null,
        location: serviceArea || null,
        bio: bio || null,
        complete: true,
      });
      if (subdivisionId) await setMySubdivision(subdivisionId);
      await load();
      setEditing(false);
    } catch (error) {
      Alert.alert(
        'Profile update',
        error instanceof Error ? error.message : 'Unable to update profile',
      );
    }
  };
  const handleItemPress = (id: string) => {
    if (id === 'verification') {
      router.push('/(worker)/verification');
      return;
    }
    if (id === 'areas') {
      router.push('/(worker)/service-setup');
      return;
    }
    if (id === 'reviews') {
      router.push('/(worker)/reviews');
      return;
    }
    if (id === 'personal') {
      setEditing(true);
      return;
    }
    if (id === 'industry') {
      router.push('/(worker)/industry-skills' as any);
      return;
    }
    if (id === 'portfolio') {
      Alert.alert(
        'Coming Soon',
        'Portfolio features will be available in a future update.',
      );
      return;
    }
    if (id === 'payout-methods' || id === 'payout-history') {
      router.push('/(worker)/wallet');
      return;
    }
    if (id === 'topup-methods' || id === 'topup-history') {
      router.push('/(worker)/wallet');
      return;
    }
    if (id === 'notifications') {
      router.push('/notifications');
      return;
    }
    Alert.alert(
      'Coming Soon',
      'This feature will be available in a future update.',
    );
  };
  const handleLogout = () => {
    void signOut().then(() => router.replace('/'));
  };
  return {
    workerProfile,
    loadError,
    editing,
    setEditing,
    name,
    setName,
    mobile,
    setMobile,
    serviceArea,
    setServiceArea,
    bio,
    setBio,
    subdivisions,
    subdivisionId,
    setSubdivisionId,
    chooseAvatar,
    saveProfile,
    handleItemPress,
    handleLogout,
    formatRating,
    Image,
  };
}
