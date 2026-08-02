export interface AddressDetailsRecord {
  streetNumber?: string;
  street?: string;
  line?: string;
  barangay?: string;
  district?: string;
  city?: string;
  province?: string;
  region?: string;
  postalCode?: string;
  providerId?: string;
  confidence?: number | null;
  displayLabel?: string;
  providerPayload?: Record<string, unknown>;
  raw?: Record<string, unknown>;
}
