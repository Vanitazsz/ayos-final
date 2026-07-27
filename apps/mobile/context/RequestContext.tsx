import React, { createContext, useContext, useState } from 'react';

export type UrgencyLevel = 'ASAP' | 'This Week' | 'Open Bidding';

export type RequestState = {
  photos: string[];
  description: string;
  category: string;
  aiSummary: string;
  aiRecommendations: string[];
  confidenceScore: number;
  hasParts?: boolean | null;
  partsDescription?: string;
  urgency: UrgencyLevel | null;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  } | null;
  selectedWorkerId: string | null;
  status: 'Draft' | 'Searching' | 'Accepted' | 'En_Route' | 'Arrived' | 'In_Progress' | 'Completed' | 'Pending_Confirmation' | 'Scheduled' | 'Posted';
  estimatedPriceRange?: string;
  scheduledDate?: Date;
};

const initialState: RequestState = {
  photos: [],
  description: '',
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

type RequestContextType = {
  request: RequestState;
  updateRequest: (updates: Partial<RequestState>) => void;
  resetRequest: () => void;
};

const RequestContext = createContext<RequestContextType | undefined>(undefined);

export const RequestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [request, setRequest] = useState<RequestState>(initialState);

  const updateRequest = (updates: Partial<RequestState>) => {
    setRequest((prev) => ({ ...prev, ...updates }));
  };

  const resetRequest = () => {
    setRequest(initialState);
  };

  return (
    <RequestContext.Provider value={{ request, updateRequest, resetRequest }}>
      {children}
    </RequestContext.Provider>
  );
};

export const useRequest = () => {
  const context = useContext(RequestContext);
  if (context === undefined) {
    throw new Error('useRequest must be used within a RequestProvider');
  }
  return context;
};
