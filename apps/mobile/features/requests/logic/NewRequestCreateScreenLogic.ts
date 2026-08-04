export { recoverPendingImage, selectImage } from '@/services/deviceImages';
export {
  prepareRequestAudioRecording,
  useRequestAudioRecorder,
} from '@/features/requests/hooks/useRequestAudioRecorder';
export { type CameraCapturedPicture } from 'expo-camera';
export { fetchCustomerProfile } from '@/services/customerProfiles';
export { fetchServiceCategories } from '@/services/catalog';
export { geocodeSearch, type GeocodingResult } from '@/services/geocoding';
export { assistRequestMedia } from '@/services/ai';
export { EdgeFunctionError } from '@/services/functionErrors';
export { deleteRequestMedia, uploadRequestMedia } from '@/services/uploads';
export { filterServiceCatalog } from '@/services/catalogSearch';
export {
  fetchSavedAddresses,
  formatSavedAddress,
  type SavedAddress,
} from '@/services/addresses';
export { formatAddressParts } from '@/utils/format';

export const MIN_DESCRIPTION_LENGTH = 10;

export const descriptionIsValid = (value: string) =>
  value.trim().length >= MIN_DESCRIPTION_LENGTH;

export const addressRequiresCompletion = (details: {
  district?: string | null;
  city?: string | null;
  region?: string | null;
}) => !details.district?.trim() || !details.city?.trim() || !details.region?.trim();
