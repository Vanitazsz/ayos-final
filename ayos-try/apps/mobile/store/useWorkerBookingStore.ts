import { create } from 'zustand';
import type { WorkerBooking } from '@/services/api';

interface WorkerBookingState {
  currentBookingId: string | null;
  currentStatus: WorkerBooking['status'] | null;
  isCurrentlyWorking: boolean;
  timerStart: number | null;
  elapsedSeconds: number;
  completionTimestamp: number | null;

  setStatus: (bookingId: string, status: WorkerBooking['status']) => void;
  startTimer: () => void;
  stopTimer: () => void;
  tick: () => void;
  setCompletionTimer: () => void;
  clearCurrentBooking: () => void;
}

export const useWorkerBookingStore = create<WorkerBookingState>((set, get) => ({
  currentBookingId: null,
  currentStatus: null,
  isCurrentlyWorking: false,
  timerStart: null,
  elapsedSeconds: 0,
  completionTimestamp: null,

  setStatus: (bookingId, status) => {
    set({
      currentBookingId: bookingId,
      currentStatus: status,
      isCurrentlyWorking: status === 'in_progress',
    });
    if (status === 'in_progress') {
      set({ timerStart: Date.now(), elapsedSeconds: 0 });
    }
    if (status === 'completed' || status === 'cancelled') {
      set({ timerStart: null, elapsedSeconds: 0, completionTimestamp: null, isCurrentlyWorking: false });
    }
  },

  startTimer: () => {
    const { timerStart } = get();
    if (!timerStart) {
      set({ timerStart: Date.now(), elapsedSeconds: 0 });
    }
  },

  stopTimer: () => {
    set({ timerStart: null });
  },

  tick: () => {
    const { timerStart } = get();
    if (timerStart) {
      set({ elapsedSeconds: Math.floor((Date.now() - timerStart) / 1000) });
    }
  },

  setCompletionTimer: () => {
    set({ completionTimestamp: Date.now() + 3 * 1000 });
  },

  clearCurrentBooking: () => {
    set({
      currentBookingId: null,
      currentStatus: null,
      isCurrentlyWorking: false,
      timerStart: null,
      elapsedSeconds: 0,
      completionTimestamp: null,
    });
  },
}));
