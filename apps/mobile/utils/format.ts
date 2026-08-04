export function formatPesoMinor(
  minor: number | null | undefined,
): string {
  return `₱${((minor ?? 0) / 100).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPesoMajor(
  value: number | string | null | undefined,
): string {
  return `₱${Number(value ?? 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatWholeNumber(
  value: number | string | null | undefined,
): string {
  return Number(value ?? 0).toLocaleString();
}

export function formatPesoWithSpace(
  value: number | string | null | undefined,
): string {
  return `₱ ${Number(value ?? 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
  })}`;
}

export function formatDateTime(value: Date | string): string {
  return new Date(value).toLocaleString();
}

export function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString();
}

export function formatKm(
  meters: number | null | undefined,
  digits = 1,
): string {
  return `${((meters ?? 0) / 1000).toFixed(digits)}`;
}

export function formatCoordinates(
  latitude: number,
  longitude: number,
  digits = 4,
): string {
  return `${latitude.toFixed(digits)}, ${longitude.toFixed(digits)}`;
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString();
}

export function formatSchedule(date: Date): string {
  return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function formatCountdown(totalSeconds: number): string {
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

export function formatElapsedTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatRating(
  value: number | string | null | undefined,
): string {
  return Number(value).toFixed(1);
}

export function etaMinutes(
  etaSeconds: number | null | undefined,
): number {
  return Math.max(1, Math.ceil((etaSeconds ?? 0) / 60));
}

export function ratingToPercent(
  rating: number | null | undefined,
  max = 5,
): number {
  return Math.round(((rating ?? 0) / max) * 100);
}

export function formatAddressParts(
  parts: Array<string | null | undefined>,
): string {
  return parts.filter(Boolean).join(', ');
}

export function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
