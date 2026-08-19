import {
  Sparkles,
  Droplets,
  Zap,
  Wrench,
  Paintbrush,
  Shovel,
  Fan,
  Monitor,
  Sprout,
  Home,
  type LucideIcon,
} from 'lucide-react-native';

export interface IndustryPresentation {
  icon: LucideIcon;
  color: string;
  bg: string;
}

export const DEFAULT_INDUSTRY_PRESENTATION: IndustryPresentation = {
  icon: Wrench,
  color: '#64748b',
  bg: '#f1f5f9',
};

const INDUSTRY_PRESENTATION: Record<string, IndustryPresentation> = {
  cleaning: { icon: Sparkles, color: '#0ea5e9', bg: '#e0f2fe' },
  electrical: { icon: Zap, color: '#f59e0b', bg: '#fef3c7' },
  plumbing: { icon: Droplets, color: '#10b981', bg: '#d1fae5' },
  carpentry: { icon: Wrench, color: '#06b6d4', bg: '#cffafe' },
  painting: { icon: Paintbrush, color: '#6366f1', bg: '#e0e7ff' },
  'masonry-tiling': { icon: Shovel, color: '#3b82f6', bg: '#dbeafe' },
  'air-conditioning-refrigeration': {
    icon: Fan,
    color: '#8b5cf6',
    bg: '#ede9fe',
  },
  'appliance-repair': { icon: Monitor, color: '#22c55e', bg: '#dcfce7' },
  'landscaping-gardening': { icon: Sprout, color: '#16a34a', bg: '#dcfce7' },
  'roofing-waterproofing': { icon: Home, color: '#f97316', bg: '#ffedd5' },
};

export function industryPresentation(
  slug: string,
): IndustryPresentation {
  return INDUSTRY_PRESENTATION[slug] ?? DEFAULT_INDUSTRY_PRESENTATION;
}
