import { Calendar, DollarSign, Star, Shield } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

export const QUICK_ACTIONS = [
  {
    id: 'schedule',
    icon: Calendar,
    label: 'My Schedule',
    color: Colors.cta,
    bg: Colors.primarySurface,
    route: '/(worker)/bookings' as const,
  },
  {
    id: 'earnings',
    icon: DollarSign,
    label: 'Earnings',
    color: Colors.success,
    bg: Colors.successBg,
    route: '/(worker)/wallet' as const,
  },
  {
    id: 'premium',
    icon: Star,
    label: 'Premium',
    color: Colors.warning,
    bg: Colors.warningBg,
    route: null,
  },
  {
    id: 'verification',
    icon: Shield,
    label: 'Verification',
    color: Colors.info,
    bg: Colors.infoBg,
    route: '/(worker)/verification' as const,
  },
];
