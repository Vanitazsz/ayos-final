import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { TextInput } from '@/components/inputs/TextInput';
import { theme } from '@/constants/theme';
import {
  ArrowLeft,
  X,
  Wrench,
  Droplets,
  Zap,
  Paintbrush,
  Navigation,
  Camera,
  Mic,
  Settings,
  Info,
  ChevronDown,
  Search,
  MapPin,
  ShieldCheck,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import {
  fetchCustomerProfile,
  fetchServiceCategories,
  geocodeSearch,
  assistRequestMedia,
  EdgeFunctionError,
  type GeocodingResult,
} from '@/services/api';
import {
  deleteRequestMedia,
  uploadRequestMedia,
} from '@/services/uploads';
import { useRequestStore } from '@/store/useRequestStore';
import {
  LocationPicker,
  type AddressDetails,
  type LocationPickerHandle,
} from '@/components/LocationPicker';
import { filterServiceCatalog } from '@/services/catalogSearch';
import {
  fetchSavedAddresses,
  formatSavedAddress,
  type SavedAddress,
} from '@/services/addresses';
import { randomUUID } from '@/lib/crypto';
import type { MediaInput } from '@/types/ai';

type MediaKind = 'photo' | 'voice';
type MediaStatus =
  | 'idle'
  | 'uploading'
  | 'awaiting-consent'
  | 'processing'
  | 'completed'
  | 'failed';

const iconFor = (name: string) =>
  name.toLowerCase().includes('elect')
    ? Zap
    : name.toLowerCase().includes('paint')
      ? Paintbrush
      : name.toLowerCase().includes('plumb')
        ? Droplets
        : Wrench;

export default function CreateRequestScreen() {
  const router = useRouter();
  const locationPickerRef = useRef<LocationPickerHandle>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [serviceSearchOpen, setServiceSearchOpen] = useState(false);
  const [serviceQuery, setServiceQuery] = useState('');
  const [address, setAddress] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressDetails, setAddressDetails] = useState<AddressDetails | null>(null);
  const [description, setDescription] = useState('');
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [categories, setCategories] = useState<
    { id: string; name: string; slug: string; minimumPriceMinor: number }[]
  >([]);
  const [visibleServiceCount, setVisibleServiceCount] = useState(4);
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
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [voiceRecord, setVoiceRecord] = useState<string | null>(null);
  const [photoMedia, setPhotoMedia] = useState<MediaInput | null>(null);
  const [voiceMedia, setVoiceMedia] = useState<MediaInput | null>(null);
  const [photoStatus, setPhotoStatus] = useState<MediaStatus>('idle');
  const [voiceStatus, setVoiceStatus] = useState<MediaStatus>('idle');
  const [photoError, setPhotoError] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [manualAddressMode, setManualAddressMode] = useState(false);
  const [manualAddress, setManualAddress] = useState({
    barangay: '',
    city: '',
    province: '',
    postalCode: '',
  });
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const recordingRef = useRef(false);
  const recordingActionRef = useRef(false);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consentRef = useRef(false);
  const mediaGenerationRef = useRef({ photo: 0, voice: 0 });
  const mediaIdempotencyRef = useRef({ photo: '', voice: '' });
  const mediaUploadTaskRef = useRef<Partial<Record<MediaKind, Promise<void>>>>({});
  const uploadedMediaRef = useRef<{ photo: MediaInput | null; voice: MediaInput | null }>({
    photo: null,
    voice: null,
  });
  const savedAddressSelectionRef = useRef<string | null>(null);
  const generatedTextRef = useRef({ photo: '', voice: '' });
  const queuedVoiceUriRef = useRef('');
  const geocodeCooldownUntilRef = useRef(0);
  const setDraft = useRequestStore((state) => state.setDraft);
  const selectedSavedAddressId = useRequestStore((state) => state.addressId);
  const filteredCategories = useMemo(
    () => filterServiceCatalog(categories, serviceQuery),
    [categories, serviceQuery],
  );
  const hasMoreServices = visibleServiceCount < filteredCategories.length;
  const matchingSavedAddressId = useMemo(() => {
    return (
      savedAddresses.find(
        (item) => formatSavedAddress(item) === address,
      )?.id ?? null
    );
  }, [address, savedAddresses]);
  const activeSavedAddressId =
    selectedSavedAddressId ?? matchingSavedAddressId ?? savedAddressSelectionRef.current;

  useEffect(() => {
    let active = true;
    void fetchServiceCategories().then(
      (result) => {
        if (!active) return;
        if (result.error) Alert.alert('Services unavailable', result.error);
        else
          setCategories(
            result.data.map((row: any) => ({
              id: row.id,
              name: row.label,
              slug: row.slug,
              minimumPriceMinor: row.minimumPriceMinor,
            })),
          );
      },
    );
    return () => {
      active = false;
    };
  }, []);

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
    }, []),
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

  useEffect(
    () => () => {
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
      if (recordingRef.current) void recorder.stop().catch(() => undefined);
      recordingRef.current = false;
    },
    [recorder],
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

  const updateServiceQuery = (value: string) => {
    setServiceQuery(value);
    setVisibleServiceCount(4);
  };

  const setMediaStatus = (kind: MediaKind, status: MediaStatus) => {
    if (kind === 'photo') setPhotoStatus(status);
    else setVoiceStatus(status);
  };

  const setMediaError = (kind: MediaKind, message: string) => {
    if (kind === 'photo') setPhotoError(message);
    else setVoiceError(message);
  };

  const setUploadedMedia = (kind: MediaKind, media: MediaInput | null) => {
    uploadedMediaRef.current[kind] = media;
    if (kind === 'photo') setPhotoMedia(media);
    else setVoiceMedia(media);
  };

  const mergeGeneratedDescription = (kind: MediaKind, value: string) => {
    const nextGenerated = value.trim();
    if (!nextGenerated) return;
    setDescription((current) => {
      const previous = generatedTextRef.current[kind];
      const preserved = previous && current.includes(previous)
        ? current.replace(previous, '').trim()
        : current.trim();
      generatedTextRef.current[kind] = nextGenerated;
      return [preserved, nextGenerated].filter(Boolean).join('\n\n');
    });
    setErrors((current) => ({ ...current, description: '' }));
  };

  const removeGeneratedDescription = (kind: MediaKind) => {
    const previous = generatedTextRef.current[kind];
    if (previous)
      setDescription((current) =>
        current.includes(previous) ? current.replace(previous, '').trim() : current,
      );
    generatedTextRef.current[kind] = '';
  };

  const runMediaAssist = useCallback(
    async (kind: MediaKind, media: MediaInput, generation: number) => {
      if (!consentRef.current) {
        setMediaStatus(kind, 'awaiting-consent');
        return;
      }
      setMediaStatus(kind, 'processing');
      setMediaError(kind, '');
      try {
        const result = await assistRequestMedia({
          media,
          description,
          consentVersion:
            process.env.EXPO_PUBLIC_AI_CONSENT_VERSION ?? '2026-07-21',
          idempotencyKey:
            mediaIdempotencyRef.current[kind] ||
            (mediaIdempotencyRef.current[kind] = randomUUID()),
        });
        if (mediaGenerationRef.current[kind] !== generation) return;
        const generated =
          kind === 'voice'
            ? result.transcript || result.requestDraft
            : result.problemDescription || result.requestDraft;
        mergeGeneratedDescription(kind, generated);
        setMediaStatus(kind, 'completed');
      } catch (error) {
        if (mediaGenerationRef.current[kind] !== generation) return;
        setMediaStatus(kind, 'failed');
        setMediaError(
          kind,
          error instanceof Error
            ? error.message
            : 'AI assistance is temporarily unavailable.',
        );
      }
    },
    [description],
  );

  const queueCapturedMedia = useCallback(
    (
      kind: MediaKind,
      uri: string,
      fallbackContentType: string,
      durationSeconds?: number,
    ) => {
      const generation = ++mediaGenerationRef.current[kind];
      mediaIdempotencyRef.current[kind] = randomUUID();
      setMediaStatus(kind, 'uploading');
      setMediaError(kind, '');
      setUploadedMedia(kind, null);
      const task = (async () => {
        try {
          const media = await uploadRequestMedia(
            uri,
            fallbackContentType,
            durationSeconds,
          );
          if (mediaGenerationRef.current[kind] !== generation) {
            await deleteRequestMedia(media).catch(() => undefined);
            return;
          }
          setUploadedMedia(kind, media);
          if (consentRef.current) void runMediaAssist(kind, media, generation);
          else setMediaStatus(kind, 'awaiting-consent');
        } catch (error) {
          if (mediaGenerationRef.current[kind] !== generation) return;
          setMediaStatus(kind, 'failed');
          setMediaError(
            kind,
            error instanceof Error ? error.message : 'Unable to upload media.',
          );
        } finally {
          delete mediaUploadTaskRef.current[kind];
        }
      })();
      mediaUploadTaskRef.current[kind] = task;
    },
    [runMediaAssist],
  );

  const removeMedia = (kind: MediaKind) => {
    mediaGenerationRef.current[kind] += 1;
    mediaIdempotencyRef.current[kind] = '';
    const remote = kind === 'photo' ? photoMedia : voiceMedia;
    if (remote) void deleteRequestMedia(remote).catch(() => undefined);
    setUploadedMedia(kind, null);
    setMediaStatus(kind, 'idle');
    setMediaError(kind, '');
    removeGeneratedDescription(kind);
    if (kind === 'photo') setCameraPhoto(null);
    else {
      queuedVoiceUriRef.current = '';
      setVoiceRecord(null);
    }
  };

  const retryMediaAssist = (kind: MediaKind) => {
    const media = kind === 'photo' ? photoMedia : voiceMedia;
    if (media)
      void runMediaAssist(kind, media, mediaGenerationRef.current[kind]);
    else {
      const uri = kind === 'photo' ? cameraPhoto : voiceRecord;
      if (uri)
        queueCapturedMedia(
          kind,
          uri,
          kind === 'photo'
            ? 'image/jpeg'
            : Platform.OS === 'web'
              ? 'audio/webm'
              : 'audio/m4a',
          kind === 'voice'
            ? Math.ceil(recorderState.durationMillis / 1000)
            : undefined,
        );
    }
  };

  const validateRequest = (useAi: boolean, media: MediaInput[]) => {
    const next: Record<string, string> = {};
    if (!selectedCategory) next.service = 'Select a service.';
    if (
      description.trim().length < 10 &&
      (!useAi || media.length === 0)
    )
      next.description = useAi
        ? 'Enter at least 10 characters or add a photo or voice recording.'
        : 'Describe the issue using at least 10 characters.';
    if (address.trim().length < 5)
      next.address = 'Enter a complete service address.';
    if (!coords)
      next.location =
        'Select a suggested address or confirm your current location.';
    if (manualAddressMode) {
      if (!manualAddress.barangay.trim()) next.barangay = 'Enter the barangay.';
      if (!manualAddress.city.trim()) next.city = 'Enter the city or municipality.';
      if (!manualAddress.province.trim()) next.province = 'Enter the province.';
    } else if (
      coords &&
      (!addressDetails?.district || !addressDetails.city || !addressDetails.region)
    ) {
      next.locationDetails = 'Complete the barangay, city, and province.';
      setManualAddressMode(true);
    }
    setErrors((current) => ({ ...next, consent: current.consent }));
    if (Object.keys(next).length) {
      setSubmissionError(
        `Please complete: ${Array.from(new Set(Object.values(next))).join(' ')}`,
      );
      if (next.service || next.description) scrollRef.current?.scrollTo({ y: 0, animated: true });
      else scrollRef.current?.scrollToEnd({ animated: true });
    }
    return Object.keys(next).length === 0;
  };

  const handleNext = async (useAi = true) => {
    setSubmissionError('');
    if (profileLoading) {
      setSubmissionError('Your profile is still loading. Please wait a moment.');
      return;
    }
    if (profileError || !customerProfile) {
      setSubmissionError('Your profile could not be loaded. Reopen this screen and try again.');
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
    const media = [
      uploadedMediaRef.current.photo,
      uploadedMediaRef.current.voice,
    ].filter((item): item is MediaInput => Boolean(item));
    if ((cameraPhoto || voiceRecord) && media.length === 0) {
      setSubmissionError('Media upload failed. Retry it or remove it before continuing.');
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
      const category = categories.find((item) => item.id === selectedCategory);
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
        budgetMinor: category?.minimumPriceMinor ?? 10000,
        requestId: null,
        scheduledAt: null,
        matchingMode: 'direct',
      });
      router.push(
        useAi ? '/new-request/issue-summary' : '/new-request/matching',
      );
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : 'Unable to continue.',
      );
      Alert.alert(
        'Upload failed',
        error instanceof Error ? error.message : 'Unable to upload media',
      );
    } finally {
      setSaving(false);
    }
  };

  function applySavedAddress(savedAddress: SavedAddress) {
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
  }

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

  const handleCameraClick = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission required');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setCameraPhoto(asset.uri);
      queueCapturedMedia('photo', asset.uri, asset.mimeType ?? 'image/jpeg');
    }
  };

  const stopVoiceRecording = useCallback(async () => {
    if (!recordingRef.current || recordingActionRef.current) return;
    recordingActionRef.current = true;
    setVoiceBusy(true);
    if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    autoStopTimerRef.current = null;
    try {
      await recorder.stop();
      recordingRef.current = false;
      setVoiceRecording(false);
      if (recorder.uri && recorder.uri !== queuedVoiceUriRef.current) {
        queuedVoiceUriRef.current = recorder.uri;
        setVoiceRecord(recorder.uri);
        queueCapturedMedia(
          'voice',
          recorder.uri,
          Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a',
          Math.max(1, Math.ceil(recorderState.durationMillis / 1000)),
        );
      }
    } catch (error) {
      recordingRef.current = false;
      setVoiceRecording(false);
      Alert.alert(
        'Voice recording unavailable',
        error instanceof Error
          ? error.message
          : 'Unable to stop the recording.',
      );
    } finally {
      recordingActionRef.current = false;
      setVoiceBusy(false);
    }
  }, [queueCapturedMedia, recorder, recorderState.durationMillis]);

  const handleVoiceClick = async () => {
    if (recordingActionRef.current) return;
    if (recordingRef.current) {
      await stopVoiceRecording();
      return;
    }
    recordingActionRef.current = true;
    setVoiceBusy(true);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone permission required');
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      recordingRef.current = true;
      setVoiceRecording(true);
      autoStopTimerRef.current = setTimeout(() => {
        void stopVoiceRecording();
      }, 60_000);
    } catch (error) {
      recordingRef.current = false;
      setVoiceRecording(false);
      Alert.alert(
        'Voice recording unavailable',
        error instanceof Error
          ? error.message
          : 'Unable to start the recording.',
      );
    } finally {
      recordingActionRef.current = false;
      setVoiceBusy(false);
    }
  };

  useEffect(() => {
    if (
      !recorderState.isRecording &&
      recorder.uri &&
      recorderState.durationMillis > 0 &&
      recorder.uri !== queuedVoiceUriRef.current
    ) {
      queuedVoiceUriRef.current = recorder.uri;
      setVoiceRecord(recorder.uri);
      queueCapturedMedia(
        'voice',
        recorder.uri,
        Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a',
        Math.max(1, Math.ceil(recorderState.durationMillis / 1000)),
      );
    }
  }, [
    queueCapturedMedia,
    recorder.uri,
    recorderState.durationMillis,
    recorderState.isRecording,
  ]);

  return (
    <Screen safeArea scrollable scrollViewRef={scrollRef}>
      <View
        style={[
          styles.header,
          { paddingHorizontal: theme.layout.screenPadding },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text
          style={[theme.typography.h4, { color: theme.colors.textPrimary }]}
        >
          A-yos AI
        </Text>
        <View style={{ width: 40 }} />
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
            <Text style={styles.fieldError}>Profile unavailable: {profileError}</Text>
          </View>
        ) : null}
        {customerProfile?.subdivisionName ? (
          <View style={styles.subdivisionBanner}>
            <MapPin color={theme.colors.primary} size={16} />
            <Text
              style={[
                theme.typography.body2,
                { color: theme.colors.primary, marginLeft: 6 },
              ]}
            >
              {customerProfile.subdivisionName}
            </Text>
          </View>
        ) : null}
        <Text style={[theme.typography.h2, styles.title]}>
          What do you need help with?
        </Text>

        {/* Categories */}
        <View style={styles.serviceSectionHeader}>
          <Text
            style={[
              theme.typography.label,
              styles.sectionTitle,
              { marginBottom: 0 },
            ]}
          >
            Select Service
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              serviceSearchOpen ? 'Close service search' : 'Search services'
            }
            style={styles.serviceSearchToggle}
            onPress={() => {
              if (serviceSearchOpen) {
                updateServiceQuery('');
                setServiceSearchOpen(false);
              } else setServiceSearchOpen(true);
            }}
          >
            {serviceSearchOpen ? (
              <X color={theme.colors.primary} size={17} />
            ) : (
              <Search color={theme.colors.primary} size={17} />
            )}
            <Text style={styles.serviceSearchToggleText}>
              {serviceSearchOpen ? 'Close' : 'Search'}
            </Text>
          </TouchableOpacity>
        </View>
        {serviceSearchOpen && (
          <TextInput
            autoFocus
            placeholder="Search available services"
            value={serviceQuery}
            onChangeText={updateServiceQuery}
            leftIcon={Search}
            rightIcon={serviceQuery ? X : undefined}
            onRightIconPress={() => updateServiceQuery('')}
            returnKeyType="search"
            accessibilityLabel="Search available services"
            style={styles.serviceSearchInput}
          />
        )}
        <View
          style={[
            styles.categoriesRow,
            !hasMoreServices && styles.categoriesRowComplete,
          ]}
        >
          {filteredCategories.slice(0, visibleServiceCount).map((cat) => {
            const Icon = iconFor(cat.name);
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                testID="request-service-option"
                accessibilityRole="radio"
                accessibilityLabel={cat.name}
                accessibilityState={{ checked: isSelected }}
                aria-checked={isSelected}
                style={[
                  styles.categoryItemRow,
                  isSelected && styles.categoryItemSelected,
                ]}
                onPress={() => {
                  setSelectedCategory(cat.id);
                  setErrors((current) => ({ ...current, service: '' }));
                }}
              >
                <Icon
                  color={
                    isSelected
                      ? theme.colors.primary
                      : theme.colors.textSecondary
                  }
                  size={24}
                />
                <Text
                  style={[
                    theme.typography.caption,
                    {
                      color: isSelected
                        ? theme.colors.primary
                        : theme.colors.textSecondary,
                      marginTop: theme.spacing.xs,
                      fontSize: 10,
                      textAlign: 'center',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {serviceQuery.trim() && filteredCategories.length === 0 ? (
          <View style={styles.noServicesState}>
            <Search color={theme.colors.textTertiary} size={28} />
            <Text style={styles.noServicesText}>No services found</Text>
          </View>
        ) : null}
        {errors.service ? (
          <Text style={styles.fieldError}>{errors.service}</Text>
        ) : null}
        {hasMoreServices && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="See more services"
            style={styles.seeMoreServicesButton}
            onPress={() =>
              setVisibleServiceCount((count) =>
                Math.min(count + 4, filteredCategories.length),
              )
            }
          >
            <Text style={styles.seeMoreServicesText}>See more services</Text>
            <ChevronDown color={theme.colors.primary} size={18} />
          </TouchableOpacity>
        )}

        {/* Camera */}
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
              onPress={() => removeMedia('photo')}
            >
              <X color={theme.colors.surface} size={16} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.mediaUploadBtn}
            onPress={handleCameraClick}
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
              <TouchableOpacity onPress={() => retryMediaAssist('photo')}>
                <Text style={styles.mediaRetryText}>Retry</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Voice */}
        <Text
          style={[
            theme.typography.label,
            styles.sectionTitle,
            { marginTop: theme.spacing.lg },
          ]}
        >
          Voice
        </Text>
        {voiceRecord ? (
          <View style={styles.mediaPreview}>
            <View
              style={[
                styles.mediaImg,
                { backgroundColor: theme.colors.primary },
              ]}
            />
            <View style={styles.voiceLabelOverlay}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                Voice Content:{' '}
                {Math.max(1, Math.ceil(recorderState.durationMillis / 1000))}s
              </Text>
            </View>
            <TouchableOpacity
              style={styles.removeMediaBtn}
              onPress={() => removeMedia('voice')}
            >
              <X color={theme.colors.surface} size={16} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.mediaUploadBtn}
            disabled={voiceBusy}
            onPress={handleVoiceClick}
          >
            <Mic color={theme.colors.primary} size={32} />
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.primary, marginTop: theme.spacing.xs },
              ]}
            >
              {voiceBusy
                ? 'Please wait…'
                : voiceRecording
                  ? `Stop (${Math.floor(recorderState.durationMillis / 1000)}s)`
                  : 'Record Voice'}
            </Text>
          </TouchableOpacity>
        )}
        {voiceRecord && voiceStatus !== 'idle' ? (
          <View style={styles.mediaStatusRow}>
            {voiceStatus === 'uploading' || voiceStatus === 'processing' ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : null}
            <Text style={styles.mediaStatusText}>
              {voiceStatus === 'uploading'
                ? 'Uploading voice recording…'
                : voiceStatus === 'awaiting-consent'
                  ? 'Ready. Accept AI consent to transcribe this recording.'
                  : voiceStatus === 'processing'
                    ? 'Transcribing your recording…'
                    : voiceStatus === 'completed'
                      ? 'Transcript added to the description.'
                      : voiceError}
            </Text>
            {voiceStatus === 'failed' ? (
              <TouchableOpacity onPress={() => retryMediaAssist('voice')}>
                <Text style={styles.mediaRetryText}>Retry</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Description */}
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
          style={styles.textArea}
          textAlignVertical="top"
        />

        {/* Location Picker */}
        <View style={styles.locationHeaderRow}>
          <Text
            style={[
              theme.typography.label,
              styles.sectionTitle,
              { marginBottom: 0 },
            ]}
          >
            Service Location
          </Text>
          <View style={styles.locationControls}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Use current location"
              style={styles.currentLocationBtn}
              onPress={() =>
                void locationPickerRef.current?.useCurrentLocation()
              }
              disabled={locationLoading}
            >
              <Navigation color={theme.colors.primary} size={14} />
              <Text
                style={[
                  theme.typography.caption,
                  {
                    color: theme.colors.primary,
                    marginLeft: 4,
                    fontWeight: '600',
                  },
                ]}
              >
                {locationLoading ? 'Detecting…' : 'Use Current'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.gearBtn}
              onPress={() => router.push('/new-request/radius-config')}
            >
              <Settings color={theme.colors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>
        </View>
        {savedAddresses.length ? (
          <View style={styles.savedAddressSection}>
            <View style={styles.savedAddressHeader}>
              <Text style={styles.savedAddressTitle}>Saved addresses</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Manage saved addresses"
                onPress={() => router.push('/settings/addresses')}
              >
                <Text style={styles.savedAddressManage}>Manage</Text>
              </TouchableOpacity>
            </View>
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
                      color={selected ? theme.colors.surface : theme.colors.primary}
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
        ) : (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add a saved address"
            style={styles.addSavedAddressButton}
            onPress={() => router.push('/settings/addresses')}
          >
            <MapPin color={theme.colors.primary} size={16} />
            <Text style={styles.savedAddressManage}>Save an address for future bookings</Text>
          </TouchableOpacity>
        )}
        <TextInput
          placeholder="Enter complete address"
          value={address}
          onChangeText={updateAddress}
          leftIcon={MapPin}
          rightIcon={address ? X : undefined}
          onRightIconPress={() => updateAddress('')}
          error={errors.address}
          style={styles.addressInput}
        />
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
            <Text style={styles.attribution}>
              © OpenStreetMap contributors, OpenRouteService
            </Text>
          </View>
        ) : null}
        {addressSearchError ? (
          <Text style={styles.addressSearchError}>{addressSearchError}</Text>
        ) : null}
        {locationWarning ? (
          <Text style={styles.locationWarning}>{locationWarning}</Text>
        ) : null}
        {manualAddressMode ? (
          <View style={styles.manualAddressCard}>
            <Text style={styles.manualAddressTitle}>Complete the address</Text>
            <Text style={styles.manualAddressHelp}>
              Your map point is saved. These details are required so the worker can find you.
            </Text>
            <TextInput
              placeholder="Barangay"
              value={manualAddress.barangay}
              onChangeText={(value) => updateManualAddress('barangay', value)}
              error={errors.barangay}
            />
            <TextInput
              placeholder="City or municipality"
              value={manualAddress.city}
              onChangeText={(value) => updateManualAddress('city', value)}
              error={errors.city}
            />
            <TextInput
              placeholder="Province"
              value={manualAddress.province}
              onChangeText={(value) => updateManualAddress('province', value)}
              error={errors.province}
            />
            <TextInput
              placeholder="Postal code (optional)"
              value={manualAddress.postalCode}
              onChangeText={(value) => updateManualAddress('postalCode', value)}
              keyboardType="number-pad"
            />
            {errors.locationDetails ? (
              <Text style={styles.fieldError}>{errors.locationDetails}</Text>
            ) : null}
          </View>
        ) : null}
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
            setErrors((current) => ({ ...current, location: '' }));
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
              !details.district.trim() || !details.city.trim() || !details.region.trim(),
            );
            setLocationWarning('');
            setErrors((current) => ({ ...current, address: '', location: '' }));
            setDraft({ addressId: null, addressDetails: details });
          }}
        />

        {/* AI Workflow Info */}
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
          <View style={{ marginLeft: 24 }}>
            <Text style={[theme.typography.caption, styles.infoBullet]}>
              • Customer uploads a photo of the problem
            </Text>
            <Text style={[theme.typography.caption, styles.infoBullet]}>
              • Customer records or enters a spoken or written description
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
              setErrors((current) => ({ ...current, consent: '' }));
              setSubmissionError('');
              if (nextConsent) {
                if (uploadedMediaRef.current.photo && photoStatus === 'awaiting-consent')
                  void runMediaAssist(
                    'photo',
                    uploadedMediaRef.current.photo,
                    mediaGenerationRef.current.photo,
                  );
                if (uploadedMediaRef.current.voice && voiceStatus === 'awaiting-consent')
                  void runMediaAssist(
                    'voice',
                    uploadedMediaRef.current.voice,
                    mediaGenerationRef.current.voice,
                  );
              }
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
          >
            <View
              style={[styles.consentBox, consent && styles.consentBoxChecked]}
            />
            <Text
              style={[
                theme.typography.caption,
                { flex: 1, color: theme.colors.textSecondary },
              ]}
            >
              I consent for Gemini to process this request and for OpenAI to
              process it only after retryable Gemini failures. Consent version{' '}
              {process.env.EXPO_PUBLIC_AI_CONSENT_VERSION ?? '2026-07-21'}.
            </Text>
          </TouchableOpacity>
          {errors.consent ? (
            <Text style={styles.fieldError}>{errors.consent}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.footer}>
        {submissionError ? (
          <View style={styles.submissionErrorCard}>
            <Text accessibilityRole="alert" style={styles.submissionError}>
              {submissionError}
            </Text>
            {customerProfile?.verificationStatus !== 'verified' &&
            customerProfile?.verificationStatus !== 'pending' ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Verify identity now"
                onPress={() => router.push('/(auth)/verify-identity')}
              >
                <Text style={styles.submissionErrorAction}>Verify identity now</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
        <Button
          title={profileLoading ? 'Loading profile…' : 'Continue'}
          accessibilityLabel="Continue with AI"
          onPress={() => void handleNext(true)}
          loading={saving}
          disabled={saving || profileLoading}
          fullWidth
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.layout.screenPadding,
    paddingVertical: theme.spacing.xl,
  },
  title: { marginBottom: theme.spacing.xl, color: theme.colors.textPrimary },
  sectionTitle: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.textPrimary,
  },
  serviceSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
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
  voiceLabelOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
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

  textArea: {
    minHeight: 100,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.xl,
  },

  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  locationControls: { flexDirection: 'row', alignItems: 'center' },
  savedAddressSection: {
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  savedAddressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  savedAddressList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  savedAddressChip: {
    minWidth: 150,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
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
    backgroundColor: theme.colors.infoBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: theme.spacing.sm,
  },
  gearBtn: { padding: 4 },
  addressSearchStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: -theme.spacing.sm,
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
    marginTop: -theme.spacing.md,
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
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  locationWarning: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    backgroundColor: theme.colors.warningBackground,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  manualAddressCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.xs,
  },
  manualAddressTitle: {
    ...theme.typography.label,
    color: theme.colors.textPrimary,
  },
  manualAddressHelp: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
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
  addressInput: {
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.xl,
  },

  infoCard: {
    backgroundColor: theme.colors.infoBackground,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  infoBullet: {
    color: theme.colors.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: theme.spacing.md,
  },
  consentBox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 4,
  },
  consentBoxChecked: { backgroundColor: theme.colors.primary },
  manualButton: { alignItems: 'center', paddingVertical: theme.spacing.md },
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
});
