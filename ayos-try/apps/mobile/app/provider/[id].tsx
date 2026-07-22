import React, { useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  Share as NativeShare,
} from 'react-native';
import {
  ChevronLeft,
  Heart,
  Share,
  MapPin,
  Clock,
  Phone,
  Mail,
  Globe,
  ShieldCheck,
  Award,
  CheckCircle2,
  Star,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Radius, Spacing, Elevation } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { RatingStars } from '@/components/RatingStars';
import { SectionHeader } from '@/components/SectionHeader';
import { fetchProviderProfile } from '@/services/api';

const { width } = Dimensions.get('window');

export default function ProviderProfileScreen() {
  const { id, isApplicant } = useLocalSearchParams<{ id: string, isApplicant?: string }>();
  const [provider,setProvider]=React.useState<any>({id,name:'',avatarUri:'',category:'',verified:false,rating:0,reviewCount:0,distance:'',eta:'',price:'',bio:'',services:[],reviews:[]});
  const [isFav, setIsFav] = React.useState(false);
  useEffect(()=>{if(id)void fetchProviderProfile(id).then((result)=>{if(!result.error)setProvider(result.data)});},[id]);

  const handleBack = useCallback(() => router.back(), []);
  const handleBook = useCallback(() => router.push(`/booking/${provider.id}`), [provider.id]);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Cover Image */}
        <View style={styles.coverContainer}>
          <Image
            source={{ uri: provider.avatarUri }}
            style={styles.coverImage}
          />
          <View style={styles.coverOverlay} />

          {/* Top nav buttons */}
          <View style={styles.topNav}>
            <Pressable style={styles.navBtn} onPress={handleBack}>
              <ChevronLeft size={22} color={Colors.white} strokeWidth={2.5} />
            </Pressable>
            <View style={styles.navBtnsRight}>
              <Pressable style={styles.navBtn} onPress={() => setIsFav(!isFav)}>
                <Heart size={20} color={isFav ? Colors.error : Colors.white} fill={isFav ? Colors.error : 'transparent'} strokeWidth={2} />
              </Pressable>
              <Pressable style={[styles.navBtn, { marginLeft: Spacing['2'] }]} onPress={()=>void NativeShare.share({message:`A-yos worker: ${provider.name}`})}>
                <Share size={18} color={Colors.white} strokeWidth={2} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Profile Info Card */}
        <View style={styles.profileCard}>
          <Avatar uri={provider.avatarUri} size={72} style={styles.avatar} />
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <AppText variant="h3" weight="bold">
                {provider.name}
              </AppText>
              {provider.verified && <Badge label="Verified" variant="verified" />}
            </View>
            <AppText variant="bodySm" color={Colors.textSecondary} style={{ marginTop: 2 }}>
              {provider.category}
            </AppText>
            <View style={styles.ratingRow}>
              <RatingStars rating={provider.rating} size={15} showValue reviewCount={provider.reviewCount} />
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: Colors.primarySurface }]}>
              <MapPin size={18} color={Colors.cta} strokeWidth={2} />
            </View>
            <AppText variant="caption" color={Colors.textSecondary}>Distance</AppText>
            <AppText variant="bodySm" weight="semiBold">{provider.distance}</AppText>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: Colors.warningBg }]}>
              <Clock size={18} color={Colors.warning} strokeWidth={2} />
            </View>
            <AppText variant="caption" color={Colors.textSecondary}>ETA</AppText>
            <AppText variant="bodySm" weight="semiBold">{provider.eta}</AppText>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: Colors.infoBg }]}>
              <ShieldCheck size={18} color={Colors.info} strokeWidth={2} />
            </View>
            <AppText variant="caption" color={Colors.textSecondary}>Insured</AppText>
            <AppText variant="bodySm" weight="semiBold">Yes</AppText>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <SectionHeader title="About" />
          <AppText variant="body" color={Colors.textSecondary} style={{ marginTop: Spacing['2'], lineHeight: 24 }}>
            {provider.bio || `Verified ${provider.category} professional with ${provider.years} years of recorded experience.`}
          </AppText>
        </View>

        {/* Services Offered */}
        <View style={styles.section}>
          <SectionHeader title="Services Offered" />
          <View style={styles.servicesList}>
            {provider.services.map((s:string) => (
              <View key={s} style={styles.serviceItem}>
                <CheckCircle2 size={20} color={Colors.cta} fill={Colors.primarySurface} strokeWidth={2} />
                <AppText variant="body">{s}</AppText>
              </View>
            ))}
          </View>
        </View>

        {/* Reviews */}
        <View style={styles.section}>
          <SectionHeader title="Reviews" actionLabel="See all" onActionPress={() => router.push({ pathname: '/reviews', params: { providerId: provider.id } })} />
          {provider.reviews.slice(0, 2).map((r:any) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Avatar uri={r.avatarUri} size={36} />
                <View style={styles.reviewInfo}>
                  <AppText variant="bodySm" weight="semiBold">{r.author}</AppText>
                  <AppText variant="caption" color={Colors.textTertiary}>{r.date}</AppText>
                </View>
                <RatingStars rating={r.rating} size={13} />
              </View>
              <AppText variant="bodySm" color={Colors.textSecondary} style={{ marginTop: Spacing['2'], lineHeight: 20 }}>
                {r.comment}
              </AppText>
            </View>
          ))}
          <AppButton
            label="Write a Review"
            variant="primary"
            size="sm"
            fullWidth
            leftIcon={<Star size={18} color={Colors.white} strokeWidth={2} />}
            onPress={() => router.push('/(tabs)/bookings')}
            style={{ marginTop: Spacing['3'] }}
          />
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <SectionHeader title="Contact" />
          <View style={styles.contactList}>
            <View style={styles.contactItem}>
              <View style={styles.contactIcon}><Phone size={18} color={Colors.cta} strokeWidth={2} /></View>
              <AppText variant="body">Contact through your protected booking</AppText>
            </View>
            <View style={styles.contactItem}>
              <View style={styles.contactIcon}><Mail size={18} color={Colors.cta} strokeWidth={2} /></View>
              <AppText variant="body">Email remains private</AppText>
            </View>
            <View style={styles.contactItem}>
              <View style={styles.contactIcon}><Globe size={18} color={Colors.cta} strokeWidth={2} /></View>
              <AppText variant="body">A-yos verified profile</AppText>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View>
          <AppText variant="caption" color={Colors.textSecondary}>Starting from</AppText>
          <AppText variant="h3" weight="bold" color={Colors.cta}>{provider.price}</AppText>
        </View>
        
        {isApplicant === 'true' ? (
          <View style={{ flex: 1, flexDirection: 'row', marginLeft: Spacing['4'], gap: Spacing['2'] }}>
            <AppButton 
              label="Message" 
              variant="outline" 
              size="lg" 
              style={{ flex: 1 }} 
              onPress={() => router.push(`/chat/${provider.id}` as any)}
            />
            <AppButton 
              label="Hire Worker" 
              size="lg" 
              style={{ flex: 1 }} 
              onPress={() => router.push(`/accept-worker/${provider.id}` as any)}
            />
          </View>
        ) : (
          <AppButton label="Book Now" size="lg" onPress={handleBook} style={{ flex: 1, marginLeft: Spacing['4'] }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  coverContainer: { width: '100%', height: 240 },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  topNav: {
    position: 'absolute', top: 50, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: Spacing['4'],
  },
  navBtn: {
    width: 40, height: 40, borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  navBtnsRight: { flexDirection: 'row' },
  profileCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.white, marginHorizontal: Spacing['4'],
    marginTop: -36, borderRadius: Radius.xl, padding: Spacing['4'],
    ...Elevation.md,
  },
  avatar: { marginTop: -Spacing['8'], borderWidth: 3, borderColor: Colors.white },
  profileInfo: { flex: 1, marginLeft: Spacing['3'], marginTop: Spacing['2'] },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], flexWrap: 'wrap' },
  ratingRow: { marginTop: Spacing['1'] },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    marginTop: Spacing['5'], marginHorizontal: Spacing['4'],
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing['4'],
    ...Elevation.sm,
  },
  statItem: { alignItems: 'center', gap: 4 },
  statIcon: { width: 44, height: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: Spacing['6'], paddingHorizontal: Spacing['4'] },
  servicesList: { marginTop: Spacing['3'], flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['3'] },
  serviceItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], backgroundColor: Colors.white, paddingHorizontal: Spacing['3'], paddingVertical: Spacing['2'], borderRadius: Radius.lg, ...Elevation.sm },
  reviewCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing['4'], marginTop: Spacing['3'], ...Elevation.sm },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  reviewInfo: { flex: 1 },
  contactList: { marginTop: Spacing['3'], backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing['4'], ...Elevation.sm },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['2'] },
  contactIcon: { width: 40, height: 40, borderRadius: Radius.lg, backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, paddingHorizontal: Spacing['4'], paddingVertical: Spacing['3'],
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
});
