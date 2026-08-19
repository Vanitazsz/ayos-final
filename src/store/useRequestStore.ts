import { create } from 'zustand';
import type { MediaInput } from '@/types/ai';
import type { AddressDetailsRecord } from '@/types/location';

export type RequestUrgency = 'ASAP' | 'This Week';

export type RequestStatus =
  | 'Draft'
  | 'Searching'
  | 'Accepted'
  | 'En_Route'
  | 'Arrived'
  | 'In_Progress'
  | 'Completed'
  | 'Pending_Confirmation'
  | 'Scheduled'
  | 'Posted';

export interface RequestLocation {
  latitude: number;
  longitude: number;
  address: string;
}

export interface RequestAiResult {
  urgency?: string;
  requestDraft?: string;
  analysisId?: string;
  safetyCritical?: boolean;
  safetyAdvice?: string[];
  detectedIssue?: string;
  estimatedDurationMinutes?: number;
}

export interface RequestDraft {
  categoryId: string;
  description: string;
  addressId: string | null;
  address: string;
  addressDetails: AddressDetailsRecord | null;
  coords: { latitude: number; longitude: number } | null;
  media: MediaInput[];
  aiConsent: boolean;
  aiJobId: string | null;
  aiResult: RequestAiResult | null;
  requestId: string | null;
  bookingId: string | null;
  searchRadiusKm: number;
  scheduledAt: string | null;
  photos: string[];
  category: string;
  aiSummary: string;
  aiRecommendations: string[];
  confidenceScore: number;
  hasParts: boolean | null;
  partsDescription: string;
  urgency: RequestUrgency | null;
  location: RequestLocation | null;
  selectedWorkerId: string | null;
  status: RequestStatus;
  estimatedPriceRange?: string;
  scheduledDate?: Date;
}

interface RequestStore extends RequestDraft {
  setDraft: (value: Partial<RequestDraft>) => void;
  reset: () => void;
}

export const initialRequestDraft: RequestDraft = {
  categoryId: '',
  description: '',
  addressId: null,
  address: '',
  addressDetails: null,
  coords: null,
  media: [],
  aiConsent: false,
  aiJobId: null,
  aiResult: null,
  requestId: null,
  bookingId: null,
  searchRadiusKm: 10,
  scheduledAt: null,
  photos: [],
  category: '',
  aiSummary: '',
  aiRecommendations: [],
  confidenceScore: 0,
  hasParts: null,
  partsDescription: '',
  urgency: null,
  location: null,
  selectedWorkerId: null,
  status: 'Draft',
};

export const useRequestStore = create<RequestStore>((set) => {
  const setDraft: RequestStore['setDraft'] = (value) => set(value);
  const reset: RequestStore['reset'] = () =>
    set(
      {
        ...initialRequestDraft,
        media: [],
        photos: [],
        aiRecommendations: [],
        setDraft,
        reset,
      },
      true,
    );

  return {
    ...initialRequestDraft,
    setDraft,
    reset,
  };
});
