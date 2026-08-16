import {
  Droplets,
  HardHat,
  Home,
  Leaf,
  Monitor,
  Paintbrush,
  Snowflake,
  Sparkles,
  TreePine,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

export interface IndustryVisual {
  icon: LucideIcon;
  color: string;
  bg: string;
}

const DEFAULT_VISUAL: IndustryVisual = {
  icon: Wrench,
  color: '#64748b',
  bg: '#e2e8f0',
};

export const INDUSTRY_VISUALS: Record<string, IndustryVisual> = {
  cleaning: { icon: Sparkles, color: '#0ea5e9', bg: '#e0f2fe' },
  electrical: { icon: Zap, color: '#10b981', bg: '#d1fae5' },
  plumbing: { icon: Droplets, color: '#f59e0b', bg: '#fef3c7' },
  carpentry: { icon: Wrench, color: '#06b6d4', bg: '#cffafe' },
  painting: { icon: Paintbrush, color: '#6366f1', bg: '#e0e7ff' },
  'masonry-tiling': { icon: HardHat, color: '#64748b', bg: '#e2e8f0' },
  'air-conditioning-refrigeration': {
    icon: Snowflake,
    color: '#3b82f6',
    bg: '#dbeafe',
  },
  'appliance-repair': { icon: Monitor, color: '#8b5cf6', bg: '#ede9fe' },
  'landscaping-gardening': { icon: TreePine, color: '#22c55e', bg: '#dcfce7' },
  'roofing-waterproofing': { icon: Home, color: '#f97316', bg: '#ffedd5' },
};

export function industryVisual(slug?: string | null): IndustryVisual {
  if (slug && INDUSTRY_VISUALS[slug]) return INDUSTRY_VISUALS[slug];
  return DEFAULT_VISUAL;
}

export function industryVisualByName(name?: string | null): IndustryVisual {
  if (!name) return DEFAULT_VISUAL;
  const lower = name.toLowerCase();
  if (lower.includes('clean')) return industryVisual('cleaning');
  if (lower.includes('electr')) return industryVisual('electrical');
  if (lower.includes('plumb')) return industryVisual('plumbing');
  if (lower.includes('carpent')) return industryVisual('carpentry');
  if (lower.includes('paint')) return industryVisual('painting');
  if (lower.includes('masonry') || lower.includes('tiling'))
    return industryVisual('masonry-tiling');
  if (
    lower.includes('air condition') ||
    lower.includes('refriger') ||
    lower.includes('cool')
  )
    return industryVisual('air-conditioning-refrigeration');
  if (lower.includes('appliance')) return industryVisual('appliance-repair');
  if (lower.includes('landscap') || lower.includes('garden'))
    return industryVisual('landscaping-gardening');
  if (lower.includes('roof') || lower.includes('waterproof'))
    return industryVisual('roofing-waterproofing');
  return DEFAULT_VISUAL;
}
