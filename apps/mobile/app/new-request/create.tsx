import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { TextInput } from '@/components/inputs/TextInput';
import { theme } from '@/constants/theme';
import {
  ArrowLeft,
  X,
  Navigation,
  Camera,
  ImageUp,
  Info,
  MapPin,
  ShieldCheck,
  Check,
  Plus,
  Pencil,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import type { CameraCapturedPicture } from 'expo-camera';
import {
  fetchCustomerProfile,
  fetchIndustriesAndSkills,
  fetchServiceCategories,
  geocodeSearch,
  assistRequestMedia,
  EdgeFunctionError,
  type GeocodingResult,
  type IndustryWithSkills,
} from '@/services/api';
import { ServiceCategoryGrid } from '@/features/customer/ServiceCategoryGrid';
import { ServiceCategorySheet } from '@/features/customer/ServiceCategorySheet';
import { AddressEditorModal } from '@/features/customer/AddressEditorModal';
import { industryVisualByName } from '@/features/customer/serviceIndustries';
import { deleteRequestMedia, uploadRequestMedia } from '@/services/uploads';
import { useRequestStore } from '@/store/useRequestStore';
import {
  LocationPicker,
  type AddressDetails,
  type LocationPickerHandle,
} from '@/components/LocationPicker';
import {
  fetchSavedAddresses,
  formatSavedAddress,
  type SavedAddress,
} from '@/services/addresses';
import { randomUUID } from '@/lib/crypto';
import { isPhilippinesCoordinates } from '@/lib/coordinates';
import type { MediaInput } from '@/types/ai';
import { PhotoCaptureModal } from '@/components/media/PhotoCaptureModal';
import { showAlert } from '@/components/AppAlert';
import { aiMediaErrorMessage } from '@/utils/aiMedia';

type MediaStatus =
  | 'idle'
  | 'uploading'
  | 'awaiting-consent'
  | 'processing'
  | 'completed'
  | 'failed';

export default function CreateRequestScreen() {
  const router = useRouter();
  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const locationPickerRef = useRef<LocationPickerHandle>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressDetails, setAddressDetails] = useState<AddressDetails | null>(
    null,
  );
  const [description, setDescription] = useState('');
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [categories, setCategories] = useState<
    {
      id: string;
      name: string;
      slug: string;
      minimumPriceMinor: number | null;
    }[]
  >([]);
  const [industries, setIndustries] = useState<IndustryWithSkills[]>([]);
  const [addressResults, setAddressResults] = useState<GeocodingResult[]>([]);
  const [addressSearchLoading, setAddressSearchLoading] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationWarning, setLocationWarning] = useState('');
  const [locationSource, setLocationSource] = useState<
    'gps' | 'geocoded' | 'saved' | null
  >(null);
  const [confirmedAddressLabel, setConfirmedAddressLabel] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [cameraPhoto, setCameraPhoto] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [photoMedia, setPhotoMedia] = useState<MediaInput | null>(null);
  const [photoStatus, setPhotoStatus] = useState<MediaStatus>('idle');
  const [photoError, setPhotoError] = useState('');
  const [manualAddressMode, setManualAddressMode] = useState(false);
  const [addressEditorOpen, setAddressEditorOpen] = useState(false);
  const [manualAddress, setManualAddress] = useState({
    barangay: '',
    city: '',
    province: '',
    postalCode: '',
  });

  const selectedCategoryObj = useMemo(() => categories.find(c => c.id === selectedCategory), [categories, selectedCategory]);
  const selectedIndustry = useMemo(
    () => industries.find((item) => item.name === selectedParent) ?? null,
    [industries, selectedParent],
  );
  const selectedSkills = useMemo(
    () => selectedIndustry?.skills ?? [],
    [selectedIndustry],
  );

  const consentRef = useRef(false);
  const mediaGenerationRef = useRef({ photo: 0 });
  const mediaIdempotencyRef = useRef({ photo: '' });
  const mediaUploadTaskRef = useRef<Partial<Record<'photo', Promise<void>>>>(
    {},
  );
  const uploadedMediaRef = useRef<{
    photo: MediaInput | null;
  }>({
    photo: null,
  });
  const savedAddressSelectionRef = useRef<string | null>(null);
  const generatedTextRef = useRef({ photo: '' });
  const geocodeCooldownUntilRef = useRef(0);
  const setDraft = useRequestStore((state) => state.setDraft);
  const selectedSavedAddressId = useRequestStore((state) => state.addressId);

const applySavedAddress = useCallback(
    (savedAddress: SavedAddress) => {
      const label = formatSavedAddress(savedAddress);
      const nextCoords = {
        latitude: savedAddress.latitude,
        longitude: savedAddress.longitude,
      };
      const details: AddressDetails = {
        streetNumber: '',
        street: savedAddress.line1,
        district: savedAddress.barangay,
        city: savedAddress.city,
        region: savedAddress.province,
        postalCode: savedAddress.postalCode,
        providerId: savedAddress.providerId,
        confidence: savedAddress.confidence,
        providerPayload: savedAddress.providerPayload,
      };
      savedAddressSelectionRef.current = savedAddress.id;
      setAddress(label);
      setConfirmedAddressLabel(label);
      setCoords(nextCoords);
      setLocationSource('saved');
      setAddressDetails(details);
      setManualAddress({
        barangay: savedAddress.barangay,
        city: savedAddress.city,
        province: savedAddress.province,
        postalCode: savedAddress.postalCode,
      });
      setManualAddressMode(false);
      setAddressResults([]);
      setAddressSearchError('');
      setLocationWarning('');
      setErrors((current) => ({ ...current, address: '', location: '' }));
      setDraft({ addressId: savedAddress.id, addressDetails: details });
    },
    [setDraft],
  )


  const matchingSavedAddressId = useMemo(() => {
    return (
      savedAddresses.find((item) => formatSavedAddress(item) === address)?.id ??
      null
    );
  }, [address, savedAddresses]);
  const activeSavedAddressId =
    selectedSavedAddressId ??
    matchingSavedAddressId ??
    savedAddressSelectionRef.current;

  useEffect(() => {
    let active = true;
    void fetchServiceCategories().then((result) => {
      if (!active) return;
      if (result.error) showAlert('Services unavailable', result.error);
      else {
        const loaded = result.data.map((row: any) => ({
          id: row.id,
          name: row.label,
          slug: row.slug,
          minimumPriceMinor: row.minimumPriceMinor,
        }));
        setCategories(loaded);
        if (
          typeof categoryId === 'string' &&
          loaded.some((row) => row.id === categoryId)
        ) {
          setSelectedCategory(categoryId);
        }
      }
    });
    void fetchIndustriesAndSkills().then((result) => {
      if (!active) return;
      if (result.error) showAlert('Services unavailable', result.error);
      else setIndustries(result.data);
    });
    return () => {
      active = false;
    };
  }, [categoryId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void fetchSavedAddresses()
        .then((items) => {
          if (!active) return;
          setSavedAddresses(items);
          const defaultAddress = items.find((item) => item.isDefault);
          if (defaultAddress) applySavedAddress(defaultAddress);
        })
        .catch(() => {
          if (active) setSavedAddresses([]);
        });
      return () => {
        active = false;
      };
    }, [applySavedAddress]),
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setProfileLoading(true);
      setProfileError('');
      void fetchCustomerProfile().then((account) => {
        if (!active) return;
        if (account.error) {
          setProfileError(account.error);
          setCustomerProfile(null);
        } else {
          setCustomerProfile(account.data);
        }
        setProfileLoading(false);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  useEffect(() => {
    const query = address.trim();
    if (
      query.length < 3 ||
      (confirmedAddressLabel && query === confirmedAddressLabel) ||
      Date.now() < geocodeCooldownUntilRef.current
    ) {
      setAddressResults([]);
      setAddressSearchError('');
      setAddressSearchLoading(false);
      return;
    }
    let active = true;
    const timeout = setTimeout(() => {
      setAddressSearchLoading(true);
      setAddressSearchError('');
      void geocodeSearch(query, coords ?? undefined)
        .then((items) => {
          if (!active) return;
          setAddressResults(items);
          if (items.length === 0) {
            setAddressSearchError('');
            setManualAddressMode(true);
            setLocationWarning(
              'No automatic address match was found. Your typed address is saved; complete the details manually.',
            );
          }
        })
        .catch((error) => {
          if (!active) return;
          setAddressResults([]);
          if (
            error instanceof EdgeFunctionError &&
            error.code === 'geocoding_rate_limited'
          )
            geocodeCooldownUntilRef.current = Date.now() + 60_000;
          setAddressSearchError('');
          setManualAddressMode(true);
          setLocationWarning(
            error instanceof EdgeFunctionError &&
              error.code === 'geocoding_rate_limited'
              ? 'Address suggestions are temporarily busy. Your typed address is saved; complete the details manually.'
              : 'Automatic address lookup is unavailable. Your typed address is saved; complete the details manually.',
          );
        })
        .finally(() => {
          if (active) setAddressSearchLoading(false);
        });
    }, 650);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [address, confirmedAddressLabel, coords, locationSource]);

  const setMediaStatus = (status: MediaStatus) => {
    setPhotoStatus(status);
  };

  const setMediaError = (message: string) => {
    setPhotoError(message);
  };

  const setUploadedMedia = (media: MediaInput | null) => {
    uploadedMediaRef.current.photo = media;
    setPhotoMedia(media);
  };

  const mergeGeneratedDescription = (value: string) => {
    const nextGenerated = value.trim();
    if (!nextGenerated) return;
    setDescription((current) => {
      const previous = generatedTextRef.current.photo;
      const preserved =
        previous && current.includes(previous)
          ? current.replace(previous, '').trim()
          : current.trim();
      generatedTextRef.current.photo = nextGenerated;
      return [preserved, nextGenerated].filter(Boolean).join('\n\n');
    });
    setErrors((current) => ({ ...current, description: '' }));
  };

  const removeGeneratedDescription = () => {
    const previous = generatedTextRef.current.photo;
    if (previous)
      setDescription((current) =>
        current.includes(previous)
          ? current.replace(previous, '').trim()
          : current,
      );
    generatedTextRef.current.photo = '';
  };

  const runMediaAssist = useCallback(
    async (media: MediaInput, generation: number) => {
      if (!consentRef.current) {
        setMediaStatus('awaiting-consent');
        return;
      }
      setMediaStatus('processing');
      setMediaError('');
      try {
        const result = await assistRequestMedia({
          media,
          description,
          consentVersion: (
            process.env.EXPO_PUBLIC_AI_CONSENT_VERSION ?? '2026-07-21'
          )
            .replace(/^"|"$/g, '')
            .trim(),
          idempotencyKey:
            mediaIdempotencyRef.current.photo ||
            (mediaIdempotencyRef.current.photo = randomUUID()),
        });
        if (mediaGenerationRef.current.photo !== generation) return;
        const generated = result.problemDescription || result.requestDraft;
        mergeGeneratedDescription(generated);
        setMediaStatus('completed');
      } catch (error) {
        if (mediaGenerationRef.current.photo !== generation) return;
        setMediaStatus('failed');
        setMediaError(aiMediaErrorMessage(error));
      }
    },
    [description],
  );

  const queueCapturedMedia = useCallback(
    (uri: string, fallbackContentType: string) => {
      const generation = ++mediaGenerationRef.current.photo;
      mediaIdempotencyRef.current.photo = randomUUID();
      setMediaStatus('uploading');
      setMediaError('');
      setUploadedMedia(null);
      const task = (async () => {
        try {
          const media = await uploadRequestMedia(uri, fallbackContentType);
          if (mediaGenerationRef.current.photo !== generation) {
            await deleteRequestMedia(media).catch(() => undefined);
            return;
          }
          setUploadedMedia(media);
          if (consentRef.current) void runMediaAssist(media, generation);
          else setMediaStatus('awaiting-consent');
        } catch (error) {
          if (mediaGenerationRef.current.photo !== generation) return;
          setMediaStatus('failed');
          setMediaError(
            error instanceof Error ? error.message : 'Unable to upload media.',
          );
        } finally {
          delete mediaUploadTaskRef.current.photo;
        }
      })();
      mediaUploadTaskRef.current.photo = task;
    },
    [runMediaAssist],
  );

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let active = true;
    void ImagePicker.getPendingResultAsync().then((pending) => {
      if (
        !active ||
        !pending ||
        'code' in pending ||
        pending.canceled ||
        !pending.assets[0]
      )
        return;
      const asset = pending.assets[0];
      setCameraPhoto(asset.uri);
      queueCapturedMedia(asset.uri, asset.mimeType ?? 'image/jpeg');
    });
    return () => {
      active = false;
    };
  }, [queueCapturedMedia]);

  const removeMedia = useCallback(() => {
    mediaGenerationRef.current.photo += 1;
    mediaIdempotencyRef.current.photo = '';
    const remote = uploadedMediaRef.current.photo;
    if (remote) void deleteRequestMedia(remote).catch(() => undefined);
    setUploadedMedia(null);
    setMediaStatus('idle');
    setMediaError('');
    removeGeneratedDescription();
    setCameraPhoto(null);
  }, []);

  const retryMediaAssist = () => {
    const media = photoMedia;
    if (media)
      void runMediaAssist(media, mediaGenerationRef.current.photo);
    else {
      const uri = cameraPhoto;
      if (uri) queueCapturedMedia(uri, 'image/jpeg');
    }
  };

  const validateRequest = (useAi: boolean, media: MediaInput[]) => {
    const next: Record<string, string> = {};
    if (!selectedCategory) next.service = 'Select a service.';
    if (description.trim().length < 10 && (!useAi || media.length === 0))
      next.description = useAi
        ? 'Enter at least 10 characters or add a photo.'
        : 'Describe the issue using at least 10 characters.';
    if (address.trim().length < 5)
      next.address = 'Enter a complete service address.';
    if (!isPhilippinesCoordinates(coords))
      next.location =
        'Select a suggested address or confirm your current location.';
    if (manualAddressMode) {
      if (!manualAddress.barangay.trim()) next.barangay = 'Enter the barangay.';
      if (!manualAddress.city.trim())
        next.city = 'Enter the city or municipality.';
      if (!manualAddress.province.trim()) next.province = 'Enter the province.';
    } else if (
      coords &&
      (!addressDetails?.district ||
        !addressDetails.city ||
        !addressDetails.region)
    ) {
      next.locationDetails = 'Complete the barangay, city, and province.';
      setManualAddressMode(true);
    }
    setErrors((current) => ({ ...next, consent: current.consent }));
    if (Object.keys(next).length) {
      setSubmissionError(
        `Please complete: ${Array.from(new Set(Object.values(next))).join(' ')}`,
      );
      if (next.service || next.description)
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      else scrollRef.current?.scrollToEnd({ animated: true });
    }
    return Object.keys(next).length === 0;
  };

  const handleNext = async (useAi = true) => {
    setSubmissionError('');
    if (profileLoading) {
      setSubmissionError(
        'Your profile is still loading. Please wait a moment.',
      );
      return;
    }
    if (profileError || !customerProfile) {
      setSubmissionError(
        'Your profile could not be loaded. Reopen this screen and try again.',
      );
      return;
    }
    if (customerProfile?.verificationStatus !== 'verified') {
      const status = customerProfile?.verificationStatus;
      const message =
        status === 'pending'
          ? 'Your identity verification is pending admin review. You can book after it is approved.'
          : status === 'rejected'
            ? 'Your identity verification was rejected. Update and resubmit your ID before booking.'
            : 'Verify your identity before creating a booking.';
      setSubmissionError(message);
      return;
    }
    const uploadTasks = Object.values(mediaUploadTaskRef.current).filter(
      (task): task is Promise<void> => Boolean(task),
    );
    if (uploadTasks.length) {
      setSaving(true);
      setSubmissionError('Finishing your media upload…');
      await Promise.all(uploadTasks);
      setSaving(false);
      setSubmissionError('');
    }
    const media = [uploadedMediaRef.current.photo].filter(
      (item): item is MediaInput => Boolean(item),
    );
    if (cameraPhoto && media.length === 0) {
      setSubmissionError(
        'Media upload failed. Retry it or remove it before continuing.',
      );
      return;
    }
    if (!validateRequest(useAi, media)) return;
    if (useAi && !consent) {
      setErrors((current) => ({
        ...current,
        consent: 'Accept AI processing consent or continue without AI.',
      }));
      setSubmissionError('Please review the AI consent requirement above.');
      scrollRef.current?.scrollToEnd({ animated: true });
      return;
    }
    setErrors((current) => ({ ...current, consent: '' }));
    setSaving(true);
    try {
      const nextAddressDetails: AddressDetails = manualAddressMode
        ? {
            streetNumber: '',
            street: address.trim(),
            district: manualAddress.barangay.trim(),
            city: manualAddress.city.trim(),
            region: manualAddress.province.trim(),
            postalCode: manualAddress.postalCode.trim(),
          }
        : (addressDetails as AddressDetails);
      setDraft({
        categoryId: selectedCategory as string,
        description: description.trim(),
        addressId: activeSavedAddressId,
        address: address.trim(),
        addressDetails: nextAddressDetails,
        coords: coords as { latitude: number; longitude: number },
        media,
        aiConsent: useAi && consent,
        aiJobId: null,
        aiResult: null,
        requestId: null,
        scheduledAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      });
      router.push(
        useAi ? '/new-request/issue-summary' : '/new-request/matching',
      );
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : 'Unable to continue.',
      );
      showAlert(
        'Upload failed',
        error instanceof Error ? error.message : 'Unable to upload media',
      );
    } finally {
      setSaving(false);
    }
  };

;

  const selectAddress = (result: GeocodingResult) => {
    const nextCoords = {
      latitude: result.latitude,
      longitude: result.longitude,
    };
    const details: AddressDetails = {
      streetNumber: '',
      street: result.line,
      district: result.barangay,
      city: result.city,
      region: result.province,
      postalCode: result.postalCode,
      providerId: result.providerId,
      confidence: result.confidence,
      providerPayload: result.raw,
    };
    const label =
      result.displayLabel ||
      [
        result.line,
        result.barangay,
        result.city,
        result.province,
        result.postalCode,
      ]
        .filter(Boolean)
        .join(', ');
    savedAddressSelectionRef.current = null;
    setAddress(label);
    setConfirmedAddressLabel(label);
    setCoords(nextCoords);
    setLocationSource('geocoded');
    setAddressDetails(details);
    setManualAddress({
      barangay: result.barangay,
      city: result.city,
      province: result.province,
      postalCode: result.postalCode,
    });
    setManualAddressMode(
      !result.barangay.trim() || !result.city.trim() || !result.province.trim(),
    );
    setAddressResults([]);
    setAddressSearchError('');
    setLocationWarning('');
    setErrors((current) => ({ ...current, address: '', location: '' }));
    setDraft({ addressId: null, addressDetails: details });
  };

  const updateAddress = (value: string) => {
    setAddress(value);
    const selectedSavedAddress = savedAddresses.find(
      (item) => item.id === activeSavedAddressId,
    );
    const selectedSavedAddressLabel = selectedSavedAddress
      ? formatSavedAddress(selectedSavedAddress)
      : '';
    setAddressSearchError('');
    setErrors((current) => ({
      ...current,
      address: value.trim().length >= 5 ? '' : current.address,
    }));
    if (
      (locationSource === 'geocoded' || locationSource === 'saved') &&
      value !==
        (locationSource === 'saved'
          ? selectedSavedAddressLabel
          : confirmedAddressLabel)
    ) {
      savedAddressSelectionRef.current = null;
      setCoords(null);
      setLocationSource(null);
      setConfirmedAddressLabel('');
      setAddressDetails(null);
      setDraft({ addressId: null, addressDetails: null });
    }
  };

  const updateManualAddress = (
    field: keyof typeof manualAddress,
    value: string,
  ) => {
    const next = { ...manualAddress, [field]: value };
    if (activeSavedAddressId) {
      savedAddressSelectionRef.current = null;
      setDraft({ addressId: null });
    }
    setManualAddress(next);
    if (value.trim()) setErrors((current) => ({ ...current, [field]: '' }));
    if (
      coords &&
      address.trim().length >= 5 &&
      next.barangay.trim() &&
      next.city.trim() &&
      next.province.trim()
    )
      setLocationWarning('');
  };

  const useCapturedPhoto = (photo: CameraCapturedPicture) => {
    setCameraOpen(false);
    setCameraPhoto(photo.uri);
    queueCapturedMedia(photo.uri, 'image/jpeg');
  };

  const handleUploadPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setCameraPhoto(asset.uri);
      queueCapturedMedia(asset.uri, asset.mimeType ?? 'image/jpeg');
    }
  };

  return (
    <Screen
      safeArea
      scrollable
      scrollViewRef={scrollRef}
      contentContainerStyle={styles.wideColumn}
    >
      <PhotoCaptureModal
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onUsePhoto={useCapturedPhoto}
      />
      <View
        style={[
          styles.header,
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/home');
          }}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text
          style={[theme.typography.h4, { color: theme.colors.textPrimary }]}
        >
          Create Booking
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        {!profileLoading &&
        customerProfile &&
        customerProfile.verificationStatus !== 'verified' ? (
          <TouchableOpacity
            style={styles.verificationBanner}
            onPress={() => router.push('/(auth)/verify-identity')}
          >
            <ShieldCheck color={theme.colors.warning} size={20} />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  theme.typography.label,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {customerProfile.verificationStatus === 'pending'
                  ? 'Identity verification pending'
                  : customerProfile.verificationStatus === 'rejected'
                    ? 'Identity verification rejected'
                    : 'Verify your identity to book services'}
              </Text>
              <Text
                style={[
                  theme.typography.caption,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {customerProfile.verificationStatus === 'pending'
                  ? 'Waiting for an administrator to review your ID.'
                  : 'Tap to submit a government-issued ID.'}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}
        {profileError ? (
          <View style={styles.profileErrorBanner}>
            <Text style={styles.fieldError}>
              Profile unavailable: {profileError}
            </Text>
          </View>
        ) : null}
        <Text style={[theme.typography.h2, styles.title, { textAlign: 'center' }]}>
          What do you need help with?
        </Text>

        <View style={[styles.sectionCard, styles.serviceSectionCard]}>
        <View style={styles.serviceSectionHeader}>
          <Text
            style={[
              theme.typography.label,
              styles.sectionTitle,
              styles.serviceSectionTitle,
            ]}
          >
            Select Service
          </Text>
        </View>

        {selectedCategoryObj ? (
          <>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Change selected service: ${selectedCategoryObj.name}`}
              style={styles.selectedServiceBanner}
              onPress={() => setSelectedCategory(null)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.categoryIconContainer, { backgroundColor: industryVisualByName(selectedCategoryObj.name).bg, width: 40, height: 40, marginRight: 12 }]}>
                  {(() => {
                    const Icon = industryVisualByName(selectedCategoryObj.name).icon;
                    return <Icon color={industryVisualByName(selectedCategoryObj.name).color} size={20} />;
                  })()}
                </View>
                <View>
                  <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>Selected Service</Text>
                  <Text style={[theme.typography.body1, { fontWeight: '600', color: theme.colors.textPrimary }]}>{selectedCategoryObj.name}</Text>
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.changeServiceHint}>
              Tap the card to change your selected service.
            </Text>
          </>
        ) : (
          <ServiceCategoryGrid
            industries={industries}
            onSelect={(industry) => setSelectedParent(industry.name)}
            flushBottom
          />
        )}

        {errors.service ? (
          <Text style={styles.fieldError}>{errors.service}</Text>
        ) : null}
        </View>

        <View style={[styles.sectionCard, styles.cameraSectionCard]}>
        <Text style={[theme.typography.label, styles.sectionTitle]}>
          Camera
        </Text>
        {cameraPhoto ? (
          <View style={styles.mediaPreview}>
            <Image
              source={cameraPhoto}
              style={styles.mediaImg}
              contentFit="cover"
            />
            <TouchableOpacity
              style={styles.removeMediaBtn}
              onPress={() => removeMedia()}
            >
              <X color={theme.colors.surface} size={16} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.photoActionRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Take Photo"
              style={[styles.mediaUploadBtn, styles.photoAction]}
              onPress={() => setCameraOpen(true)}
            >
              <Camera color={theme.colors.primary} size={32} />
              <Text
                style={[
                  theme.typography.caption,
                  { color: theme.colors.primary, marginTop: theme.spacing.xs },
                ]}
              >
                Take Photo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Upload Photo"
              style={[styles.mediaUploadBtn, styles.photoAction]}
              onPress={() => void handleUploadPhoto()}
            >
              <ImageUp color={theme.colors.primary} size={32} />
              <Text
                style={[
                  theme.typography.caption,
                  { color: theme.colors.primary, marginTop: theme.spacing.xs },
                ]}
              >
                Upload Photo
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {cameraPhoto && photoStatus !== 'idle' ? (
          <View style={styles.mediaStatusRow}>
            {photoStatus === 'uploading' || photoStatus === 'processing' ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : null}
            <Text style={styles.mediaStatusText}>
              {photoStatus === 'uploading'
                ? 'Uploading photo…'
                : photoStatus === 'awaiting-consent'
                  ? 'Ready. Accept AI consent to analyze this photo.'
                  : photoStatus === 'processing'
                    ? 'AI is explaining the visible problem…'
                    : photoStatus === 'completed'
                      ? 'Photo explanation added to the description.'
                      : photoError}
            </Text>
            {photoStatus === 'failed' ? (
              <TouchableOpacity
                onPress={() => retryMediaAssist()}
                style={styles.mediaRetryBtn}
              >
                <Text style={styles.mediaRetryText}>Retry</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <Text
          style={[
            theme.typography.label,
            styles.sectionTitle,
            { marginTop: theme.spacing.lg },
          ]}
        >
          Describe the problem
        </Text>
        <TextInput
          placeholder="e.g. The sink is leaking under the cabinet..."
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={(value) => {
            setDescription(value);
            if (value.trim().length >= 10)
              setErrors((current) => ({ ...current, description: '' }));
          }}
          error={errors.description}
          helperText="At least 10 characters helps match the right worker."
          style={styles.textArea}
          textAlignVertical="top"
          autoCapitalize="sentences"
        />
        </View>

        <View style={[styles.sectionCard, styles.addressSectionCard]}>
        <LocationPicker
          ref={locationPickerRef}
          coords={coords}
          showAction={false}
          error={errors.location}
          onLoadingChange={setLocationLoading}
          onWarning={(message) => {
            setLocationWarning(message ?? '');
            if (message) setManualAddressMode(true);
          }}
          onCoordinatesDetected={(nextCoords) => {
            setCoords(nextCoords);
            savedAddressSelectionRef.current = null;
            setLocationSource('gps');
            setConfirmedAddressLabel('');
            setAddressDetails(null);
            setDraft({ addressId: null, addressDetails: null });
          }}
          onLocationDetected={(details, nextCoords, displayLabel) => {
            const label =
              displayLabel ||
              [
                details.streetNumber,
                details.street,
                details.district,
                details.city,
                details.region,
                details.postalCode,
              ]
                .filter(Boolean)
                .join(', ');
            setCoords(nextCoords);
            savedAddressSelectionRef.current = null;
            setAddress(label);
            setConfirmedAddressLabel(label);
            setLocationSource('gps');
            setAddressDetails(details);
            setManualAddress({
              barangay: details.district,
              city: details.city,
              province: details.region,
              postalCode: details.postalCode,
            });
            setManualAddressMode(
              !details.district.trim() ||
                !details.city.trim() ||
                !details.region.trim(),
            );
            setLocationWarning('');
            setDraft({ addressId: null, addressDetails: details });
          }}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Edit full address"
          testID="address-display"
          style={[
            styles.addressDisplay,
            errors.address && styles.addressDisplayError,
          ]}
          onPress={() => setAddressEditorOpen(true)}
        >
          <MapPin color={theme.colors.primary} size={20} />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.addressDisplayText,
              !address && styles.addressDisplayPlaceholder,
            ]}
          >
            {address || 'Tap to enter service address'}
          </Text>
          <Pencil color={theme.colors.textSecondary} size={18} />
        </TouchableOpacity>
        {errors.address ? (
          <Text style={styles.addressErrorText}>{errors.address}</Text>
        ) : null}
        {addressSearchLoading ? (
          <View style={styles.addressSearchStatus}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.addressSearchStatusText}>
              Searching Philippine addresses…
            </Text>
          </View>
        ) : null}
        {addressResults.length > 0 ? (
          <View style={styles.addressResults}>
            {addressResults.map((result) => (
              <TouchableOpacity
                key={`${result.providerId}:${result.longitude}:${result.latitude}`}
                accessibilityRole="button"
                accessibilityLabel={`Use address ${result.displayLabel}`}
                style={styles.addressResultRow}
                onPress={() => selectAddress(result)}
              >
                <MapPin color={theme.colors.primary} size={18} />
                <Text style={styles.addressResultText}>
                  {result.displayLabel ||
                    [result.line, result.barangay, result.city, result.province]
                      .filter(Boolean)
                      .join(', ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        {addressSearchError ? (
          <Text style={styles.addressSearchError}>{addressSearchError}</Text>
        ) : null}
        {locationWarning ? (
          <Text style={styles.locationWarning}>{locationWarning}</Text>
        ) : null}
        <View style={styles.locationControls}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Use current location"
              style={[
                styles.currentLocationBtn,
                locationLoading && styles.currentLocationBtnDisabled,
              ]}
              onPress={() =>
                void locationPickerRef.current?.useCurrentLocation()
              }
              disabled={locationLoading}
            >
              <Navigation color={theme.colors.surface} size={16} />
              <Text style={styles.currentLocationText}>
                {locationLoading ? 'Detecting…' : 'Use Current'}
              </Text>
            </TouchableOpacity>
            {savedAddresses.length ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Manage main house address"
                onPress={() => router.push('/settings/addresses')}
                style={styles.manageButton}
              >
                <Plus color={theme.colors.primary} size={16} />
                <Text style={styles.savedAddressManage}>Manage</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        {savedAddresses.length ? (
          <View style={styles.savedAddressSection}>
            <Text style={styles.savedAddressTitle}>Saved addresses</Text>
            <View style={styles.savedAddressList}>
              {savedAddresses.map((savedAddress) => {
                const selected = activeSavedAddressId === savedAddress.id;
                return (
                  <TouchableOpacity
                    key={savedAddress.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    aria-checked={selected}
                    accessibilityLabel={`Use saved address ${savedAddress.label}`}
                    style={[
                      styles.savedAddressChip,
                      selected && styles.savedAddressChipSelected,
                    ]}
                    onPress={() => applySavedAddress(savedAddress)}
                  >
                    <MapPin
                      color={
                        selected ? theme.colors.surface : theme.colors.primary
                      }
                      size={15}
                    />
                    <View style={styles.savedAddressChipText}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.savedAddressChipLabel,
                          selected && styles.savedAddressChipLabelSelected,
                        ]}
                      >
                        {savedAddress.label}
                        {savedAddress.isDefault ? ' · Default' : ''}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.savedAddressChipDetail,
                          selected && styles.savedAddressChipDetailSelected,
                        ]}
                      >
                        {savedAddress.barangay}, {savedAddress.city}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}
        {manualAddressMode ? (
          <View style={styles.manualAddressCard}>
            <Text style={styles.manualAddressTitle}>Complete the address</Text>
            <Text style={styles.manualAddressHelp}>
              Your map point is saved. These details are required so the worker
              can find you.
            </Text>
            <TextInput
              label="Barangay"
              placeholder="Barangay"
              value={manualAddress.barangay}
              onChangeText={(value) => updateManualAddress('barangay', value)}
              error={errors.barangay}
              autoCapitalize="words"
              containerStyle={styles.manualField}
            />
            <TextInput
              label="City or municipality"
              placeholder="City or municipality"
              value={manualAddress.city}
              onChangeText={(value) => updateManualAddress('city', value)}
              error={errors.city}
              autoCapitalize="words"
              containerStyle={styles.manualField}
            />
            <TextInput
              label="Province"
              placeholder="Province"
              value={manualAddress.province}
              onChangeText={(value) => updateManualAddress('province', value)}
              error={errors.province}
              autoCapitalize="words"
              containerStyle={styles.manualField}
            />
            <TextInput
              label="Postal code (optional)"
              placeholder="Postal code (optional)"
              value={manualAddress.postalCode}
              onChangeText={(value) => updateManualAddress('postalCode', value)}
              keyboardType="number-pad"
              containerStyle={styles.manualField}
            />
          </View>
        ) : null}
        </View>

        <View style={styles.infoCard}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.sm,
            }}
          >
            <Info color={theme.colors.primary} size={16} />
            <Text
              style={[
                theme.typography.label,
                { marginLeft: 8, color: theme.colors.primary },
              ]}
            >
              How A-yos AI Works
            </Text>
          </View>
          <View style={{ marginLeft: 24, paddingRight: 8, gap: 2 }}>
            <Text style={[theme.typography.caption, styles.infoBullet]}>
              • Customer uploads a photo of the problem
            </Text>
            <Text style={[theme.typography.caption, styles.infoBullet]}>
              • Customer enters a written description
            </Text>
            <Text style={[theme.typography.caption, styles.infoBullet]}>
              • AI identifies the likely issue
            </Text>
            <Text style={[theme.typography.caption, styles.infoBullet]}>
              • AI shows urgency, possible cause, suggested service category,
              estimated cost, and safety advice
            </Text>
            <Text style={[theme.typography.caption, styles.infoBullet]}>
              • AI creates an editable request draft
            </Text>
            <Text style={[theme.typography.caption, styles.infoBullet]}>
              • Customer can save the draft and continue later
            </Text>
          </View>
          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => {
              const nextConsent = !consent;
              consentRef.current = nextConsent;
              setConsent(nextConsent);
              if (nextConsent) {
                if (
                  uploadedMediaRef.current.photo &&
                  photoStatus === 'awaiting-consent'
                )
                  void runMediaAssist(
                    uploadedMediaRef.current.photo,
                    mediaGenerationRef.current.photo,
                  );
              }
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
          >
            <View
              style={[styles.consentBox, consent && styles.consentBoxChecked]}
            >
              {consent ? <Check color={theme.colors.surface} size={14} /> : null}
            </View>
            <Text
              style={[
                theme.typography.caption,
                { flex: 1, color: theme.colors.textSecondary },
              ]}
            >
              I consent to the AI processing of this request to provide smart suggestions and a summary of my problem. Consent version{' '}
              {process.env.EXPO_PUBLIC_AI_CONSENT_VERSION ?? '2026-07-21'}.
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {submissionError ? (
        <View style={styles.submissionErrorCard}>
          <Text style={styles.submissionError}>{submissionError}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Button
          title={profileLoading ? 'Loading profile…' : 'Continue'}
          onPress={() => void handleNext(true)}
          loading={saving}
          disabled={saving || profileLoading}
          fullWidth
          size="lg"
        />
        <TouchableOpacity
          style={styles.manualButton}
          onPress={() => void handleNext(false)}
          disabled={saving || profileLoading}
        >
          <Text
            style={[theme.typography.button, { color: theme.colors.primary }]}
          >
            Continue without AI
          </Text>
        </TouchableOpacity>
      </View>

      <ServiceCategorySheet
        visible={!!selectedParent}
        industry={selectedIndustry}
        items={selectedSkills}
        onSelect={(skill) => {
          setSelectedCategory(skill.id);
          setErrors((current) => ({ ...current, service: '' }));
          setSelectedParent(null);
        }}
        onClose={() => setSelectedParent(null)}
      />
      <AddressEditorModal
        visible={addressEditorOpen}
        initialValue={address}
        onClose={() => setAddressEditorOpen(false)}
        onConfirm={(value) => {
          updateAddress(value);
          setAddressEditorOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wideColumn: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    marginHorizontal: 'auto',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  title: { marginBottom: theme.spacing.xl, color: theme.colors.textPrimary },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  serviceSectionTitle: {
    marginBottom: theme.spacing.md,
  },
  serviceSectionCard: {
    marginBottom: theme.spacing.xs,
  },
  cameraSectionCard: {
    paddingBottom: theme.spacing.sm,
  },
  addressSectionCard: {
    paddingVertical: theme.spacing.md,
  },
  sectionTitle: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.textPrimary,
  },
  serviceSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  serviceSearchToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.infoBackground,
  },
  serviceSearchToggleText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  serviceSearchInput: { minHeight: 44 },

  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  categoriesRowComplete: { marginBottom: theme.spacing.xl },
  categoryItemRow: {
    width: '23%',
    height: 80,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryItemSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.infoBackground,
  },
  seeMoreServicesButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  seeMoreServicesText: {
    ...theme.typography.button,
    color: theme.colors.primary,
    fontSize: 13,
  },
  noServicesState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  noServicesText: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  fieldError: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },

  mediaUploadBtn: {
    width: '100%',
    height: 80,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.infoBackground,
    marginBottom: theme.spacing.sm,
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  photoAction: {
    flex: 1,
    width: undefined,
  },
  mediaPreview: {
    width: '100%',
    height: 120,
    borderRadius: theme.radius.md,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  mediaImg: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.border,
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.infoBackground,
  },
  mediaStatusText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  mediaRetryText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  mediaRetryBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  mediaRecoveryActions: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
  },

  textArea: {
    minHeight: 100,
    backgroundColor: theme.colors.surface,
  },

  locationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  savedAddressSection: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  savedAddressTitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '700',
  },
  savedAddressManage: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flex: 1,
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.full,
  },
  savedAddressList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  savedAddressChip: {
    minWidth: 150,
    minHeight: 48,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  savedAddressChipSelected: { backgroundColor: theme.colors.primary },
  savedAddressChipText: { flexShrink: 1 },
  savedAddressChipLabel: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  savedAddressChipLabelSelected: { color: theme.colors.surface },
  savedAddressChipDetail: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 10,
  },
  savedAddressChipDetailSelected: { color: theme.colors.surface },
  addSavedAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  currentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    minHeight: 44,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
  },
  currentLocationBtnDisabled: {
    opacity: 0.6,
  },
  currentLocationText: {
    ...theme.typography.caption,
    color: theme.colors.surface,
    fontWeight: '700',
  },
  addressSearchStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  addressSearchStatusText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  addressResults: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  addressResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  addressResultText: {
    ...theme.typography.body2,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  attribution: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    fontSize: 9,
  },
  addressSearchError: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  locationWarning: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    backgroundColor: theme.colors.warningBackground,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  manualAddressCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.md,
  },
  manualAddressTitle: {
    ...theme.typography.label,
    color: theme.colors.textPrimary,
  },
  manualAddressHelp: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  manualField: {
    marginBottom: 0,
  },

  mapGridPattern: {
    position: 'absolute',
    width: '150%',
    height: '150%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    opacity: 0.5,
    borderRadius: 20,
  },
  mapPin: { zIndex: 2 },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  addressDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    minHeight: 56,
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  addressDisplayError: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorBackground,
  },
  addressDisplayText: {
    flex: 1,
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
  },
  addressDisplayPlaceholder: {
    color: theme.colors.textTertiary,
  },
  addressErrorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginTop: -theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },

  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  infoBullet: {
    color: theme.colors.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
    textAlign: 'justify',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: 44,
    paddingVertical: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  consentBox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentBoxChecked: { backgroundColor: theme.colors.primary },
  manualButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  submissionError: {
    ...theme.typography.caption,
    color: theme.colors.error,
    textAlign: 'center',
  },
  submissionErrorCard: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.errorBackground,
  },
  submissionErrorAction: {
    ...theme.typography.label,
    color: theme.colors.primary,
  },
  profileErrorBanner: {
    backgroundColor: theme.colors.errorBackground,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },

  footer: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.layout.screenPadding,
  },
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.warningBackground,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  subdivisionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.infoBackground,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  selectedServiceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  changeServiceHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  categoryIconContainer: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.xs },
});
