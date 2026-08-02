import {
  recoverPendingImage,
  selectImage,
  type CameraCapturedPicture,
  prepareRequestAudioRecording,
  useRequestAudioRecorder,
  fetchCustomerProfile,
  fetchServiceCategories,
  geocodeSearch,
  assistRequestMedia,
  EdgeFunctionError,
  type GeocodingResult,
  deleteRequestMedia,
  uploadRequestMedia,
  filterServiceCatalog,
  fetchSavedAddresses,
  formatSavedAddress,
  type SavedAddress,
} from '../logic/NewRequestCreateScreenLogic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useRequestStore } from '@/store/useRequestStore';
import {
  type AddressDetails,
  type LocationPickerHandle,
} from '@/components/LocationPicker';
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
export function useNewRequestCreateScreenController() {
  const router = useRouter();
  const locationPickerRef = useRef<LocationPickerHandle>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [serviceSearchOpen, setServiceSearchOpen] = useState(false);
  const [serviceQuery, setServiceQuery] = useState('');
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
  const [cameraOpen, setCameraOpen] = useState(false);
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
  const { recorder, recorderState } = useRequestAudioRecorder();
  const recordingRef = useRef(false);
  const recordingActionRef = useRef(false);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consentRef = useRef(false);
  const mediaGenerationRef = useRef({ photo: 0, voice: 0 });
  const mediaIdempotencyRef = useRef({ photo: '', voice: '' });
  const mediaUploadTaskRef = useRef<Partial<Record<MediaKind, Promise<void>>>>(
    {},
  );
  const uploadedMediaRef = useRef<{
    photo: MediaInput | null;
    voice: MediaInput | null;
  }>({
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
    });
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
      const preserved =
        previous && current.includes(previous)
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
        current.includes(previous)
          ? current.replace(previous, '').trim()
          : current,
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
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let active = true;
    void recoverPendingImage().then((asset) => {
      if (!active || !asset) return;
      setCameraPhoto(asset.uri);
      queueCapturedMedia('photo', asset.uri, asset.mimeType ?? 'image/jpeg');
    });
    return () => {
      active = false;
    };
  }, [queueCapturedMedia]);
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
    if (description.trim().length < 10 && (!useAi || media.length === 0))
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
    const media = [
      uploadedMediaRef.current.photo,
      uploadedMediaRef.current.voice,
    ].filter((item): item is MediaInput => Boolean(item));
    if ((cameraPhoto || voiceRecord) && media.length === 0) {
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
  const useCapturedPhoto = (photo: CameraCapturedPicture) => {
    setCameraOpen(false);
    setCameraPhoto(photo.uri);
    queueCapturedMedia('photo', photo.uri, 'image/jpeg');
  };
  const handleUploadPhoto = async () => {
    const asset = await selectImage({ quality: 0.8 });
    if (asset) {
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
      const ready = await prepareRequestAudioRecording();
      if (!ready) {
        Alert.alert('Microphone permission required');
        return;
      }
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
  return {
    router,
    locationPickerRef,
    scrollRef,
    selectedCategory,
    setSelectedCategory,
    serviceSearchOpen,
    setServiceSearchOpen,
    serviceQuery,
    address,
    setAddress,
    savedAddresses,
    addressDetails,
    setAddressDetails,
    description,
    setDescription,
    coords,
    setCoords,
    visibleServiceCount,
    setVisibleServiceCount,
    addressResults,
    addressSearchLoading,
    addressSearchError,
    locationLoading,
    setLocationLoading,
    locationWarning,
    setLocationWarning,
    setLocationSource,
    setConfirmedAddressLabel,
    errors,
    setErrors,
    consent,
    setConsent,
    saving,
    submissionError,
    setSubmissionError,
    cameraPhoto,
    cameraOpen,
    setCameraOpen,
    customerProfile,
    profileLoading,
    profileError,
    voiceRecord,
    photoStatus,
    voiceStatus,
    photoError,
    voiceError,
    manualAddressMode,
    setManualAddressMode,
    manualAddress,
    setManualAddress,
    voiceRecording,
    voiceBusy,
    recorderState,
    consentRef,
    mediaGenerationRef,
    uploadedMediaRef,
    savedAddressSelectionRef,
    setDraft,
    filteredCategories,
    hasMoreServices,
    activeSavedAddressId,
    updateServiceQuery,
    runMediaAssist,
    removeMedia,
    retryMediaAssist,
    handleNext,
    applySavedAddress,
    selectAddress,
    updateAddress,
    updateManualAddress,
    useCapturedPhoto,
    handleUploadPhoto,
    handleVoiceClick,
    Image,
  };
}
