import { Wrench, Zap, Paintbrush, Droplets, Sparkles } from 'lucide-react-native';

export const iconFor = (name: string) =>
  name.toLowerCase().includes('elect')
    ? Zap
    : name.toLowerCase().includes('paint')
      ? Paintbrush
      : name.toLowerCase().includes('plumb')
        ? Droplets
        : name.toLowerCase().includes('clean')
          ? Sparkles
          : Wrench;
