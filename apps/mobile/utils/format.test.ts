import { describe, expect, it } from 'vitest';

import {
  capitalizeFirst,
  etaMinutes,
  formatAddressParts,
  getInitials,
  formatCoordinates,
  formatCountdown,
  formatElapsedTime,
  formatKm,
  formatPesoMajor,
  formatPesoMinor,
  formatSchedule,
  formatTime,
  formatWholeNumber,
} from './format';

describe('formatPesoMinor', () => {
  it('formats minor units with two decimals', () => {
    expect(formatPesoMinor(125050)).toBe('₱1,250.50');
    expect(formatPesoMinor(0)).toBe('₱0.00');
  });

  it('treats nullish as zero', () => {
    expect(formatPesoMinor(null)).toBe('₱0.00');
    expect(formatPesoMinor(undefined)).toBe('₱0.00');
  });
});

describe('formatPesoMajor', () => {
  it('formats major values with two decimals', () => {
    expect(formatPesoMajor(1250.5)).toBe('₱1,250.50');
    expect(formatPesoMajor('1250.5')).toBe('₱1,250.50');
  });

  it('treats nullish as zero', () => {
    expect(formatPesoMajor(null)).toBe('₱0.00');
  });
});

describe('formatWholeNumber', () => {
  it('uses the default locale grouping without decimals', () => {
    expect(formatWholeNumber(1250)).toBe('1,250');
    expect(formatWholeNumber(0)).toBe('0');
  });
});

describe('formatKm', () => {
  it('converts meters to kilometers with the requested digits', () => {
    expect(formatKm(12500)).toBe('12.5');
    expect(formatKm(12500, 0)).toBe('13');
  });
});

describe('formatCoordinates', () => {
  it('pins four decimals by default', () => {
    expect(formatCoordinates(14.6017, 120.9767)).toBe('14.6017, 120.9767');
  });
});

describe('formatTime', () => {
  it('formats a timestamp using the local time', () => {
    const date = new Date('2026-08-04T09:30:00');
    expect(formatTime(date)).toBe(date.toLocaleTimeString());
  });
});

describe('formatSchedule', () => {
  it('formats date and time the same way job cards did', () => {
    const date = new Date('2026-08-04T09:30:00');
    expect(formatSchedule(date)).toBe(
      `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    );
  });
});

describe('formatCountdown', () => {
  it('formats minutes and padded seconds', () => {
    expect(formatCountdown(125)).toBe('2:05');
    expect(formatCountdown(0)).toBe('0:00');
  });
});

describe('formatElapsedTime', () => {
  it('formats hh:mm:ss with padding', () => {
    expect(formatElapsedTime(3661)).toBe('01:01:01');
    expect(formatElapsedTime(0)).toBe('00:00:00');
  });
});

describe('etaMinutes', () => {
  it('rounds up seconds to whole minutes with a one-minute floor', () => {
    expect(etaMinutes(30)).toBe(1);
    expect(etaMinutes(125)).toBe(3);
    expect(etaMinutes(null)).toBe(1);
  });
});

describe('formatAddressParts', () => {
  it('joins present parts and skips blanks', () => {
    expect(formatAddressParts(['123', 'Brgy. X', 'Manila'])).toBe(
      '123, Brgy. X, Manila',
    );
    expect(formatAddressParts(['123', '', undefined])).toBe('123');
  });
});

describe('capitalizeFirst', () => {
  it('capitalizes the first character and keeps the rest', () => {
    expect(capitalizeFirst('completed')).toBe('Completed');
    expect(capitalizeFirst('')).toBe('');
  });
});

describe('getInitials', () => {
  it('combines the first letters of the first and last words', () => {
    expect(getInitials('Juan Dela Cruz')).toBe('JC');
    expect(getInitials('Maria Santos')).toBe('MS');
  });

  it('uses a single letter for a one-word name', () => {
    expect(getInitials('Maria')).toBe('M');
  });

  it('uppercases the initials', () => {
    expect(getInitials('juan dela cruz')).toBe('JC');
  });

  it('handles extra whitespace and empty values', () => {
    expect(getInitials('  Juan   Dela   Cruz  ')).toBe('JC');
    expect(getInitials('')).toBe('');
    expect(getInitials('   ')).toBe('');
  });
});
