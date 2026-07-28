import { supabase } from '@/lib/supabase';

export interface SavedAddress {
  id: string;
  label: string;
  line1: string;
  line2: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  provider: string;
  providerId?: string;
  confidence?: number | null;
  providerPayload?: Record<string, unknown>;
}

export interface SavedAddressInput {
  id?: string | null;
  label: string;
  line1: string;
  line2?: string;
  barangay: string;
  city: string;
  province: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

const mapAddress = (row: any): SavedAddress => ({
  id: row.id,
  label: row.label,
  line1: row.line1,
  line2: row.line2 ?? '',
  barangay: row.barangay,
  city: row.city,
  province: row.province,
  postalCode: row.postal_code ?? '',
  latitude: Number(row.latitude),
  longitude: Number(row.longitude),
  isDefault: Boolean(row.is_default),
  provider: row.geocoding_provider ?? 'MANUAL',
  providerId: row.geocoding_provider_id ?? undefined,
  confidence:
    row.geocoding_confidence == null ? null : Number(row.geocoding_confidence),
  providerPayload: row.geocoding_payload ?? {},
});

export async function fetchSavedAddresses(): Promise<SavedAddress[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select(
      'id,label,line1,line2,barangay,city,province,postal_code,latitude,longitude,is_default,geocoding_provider,geocoding_provider_id,geocoding_confidence,geocoding_payload',
    )
    .is('archived_at', null)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapAddress).filter(
    (address) =>
      Number.isFinite(address.latitude) && Number.isFinite(address.longitude),
  );
}

export async function saveSavedAddress(
  input: SavedAddressInput,
): Promise<SavedAddress> {
  const { data, error } = await supabase.rpc('upsert_my_address', {
    p_id: input.id ?? null,
    p_label: input.label.trim(),
    p_line1: input.line1.trim(),
    p_line2: input.line2?.trim() || null,
    p_barangay: input.barangay.trim(),
    p_city: input.city.trim(),
    p_province: input.province.trim(),
    p_postal_code: input.postalCode?.trim() || null,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_is_default: input.isDefault,
  });
  if (error) throw error;
  return mapAddress(data);
}

export async function archiveSavedAddress(id: string): Promise<void> {
  const { data, error } = await supabase.rpc('archive_my_address', {
    p_address_id: id,
  });
  if (error) throw error;
  if (!data)
    throw new Error('This address is being used by an active booking and cannot be removed.');
}

export function formatSavedAddress(address: SavedAddress): string {
  return [
    address.line1,
    address.line2,
    address.barangay,
    address.city,
    address.province,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(', ');
}
