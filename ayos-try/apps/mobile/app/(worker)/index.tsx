import React,{useEffect,useState} from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable } from 'react-native';
import { Bell, Search, ChevronRight, Briefcase } from 'lucide-react-native';
import { router } from 'expo-router';
import { theme } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { IncomingJobAlert } from '@/components/IncomingJobAlert';
import { QuickActionsGrid } from '@/components/QuickActionsGrid';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { fetchWalletTransactions, fetchWorkerBookings, fetchWorkerJobs, fetchWorkerProfile, subscribeToTable, type JobOpportunity, type WorkerBooking, type WorkerProfile } from '@/services/api';
import { useWorkerBookingStore } from '@/store/useWorkerBookingStore';
import { getMyDispatchOffers, getMyWorkerLiveStatus, refreshWorkerPresence, respondToDispatch, startForegroundWorkerPresence, subscribeToDispatch, type DispatchOffer, type PresenceState, type WorkerLiveStatus } from '@/services/liveDispatch';

const statusConfig:Record<string,{label:string;variant:any}>={pending:{label:'Pending',variant:'warning'},accepted:{label:'Accepted',variant:'info'},worker_preparing:{label:'Preparing',variant:'info'},worker_en_route:{label:'En Route',variant:'info'},worker_arrived:{label:'Arrived',variant:'info'},service_started:{label:'Started',variant:'warning'},in_progress:{label:'In Progress',variant:'warning'},completed:{label:'Completed',variant:'success'},cancelled:{label:'Cancelled',variant:'error'}};

export default function WorkerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const isCurrentlyWorking = useWorkerBookingStore((s) => s.isCurrentlyWorking);
  const currentBookingId = useWorkerBookingStore((s) => s.currentBookingId);
  const[workerProfile,setWorkerProfile]=useState<WorkerProfile|null>(null);const[workerBookings,setWorkerBookings]=useState<WorkerBooking[]>([]);const[workerJobs,setWorkerJobs]=useState<JobOpportunity[]>([]);const[earnings,setEarnings]=useState(0);
  const[dispatchOffers,setDispatchOffers]=useState<DispatchOffer[]>([]);const[presenceState,setPresenceState]=useState<PresenceState>('starting');const[presenceMessage,setPresenceMessage]=useState('');
  const[liveStatus,setLiveStatus]=useState<WorkerLiveStatus|null>(null);const[refreshingLocation,setRefreshingLocation]=useState(false);
<<<<<<< Updated upstream
  useEffect(()=>{const load=()=>void Promise.all([fetchWorkerProfile(),fetchWorkerBookings(),fetchWorkerJobs(),fetchWalletTransactions()]).then(([profile,bookings,jobs,transactions])=>{if(!profile.error)setWorkerProfile(profile.data);setWorkerBookings(bookings.data);setWorkerJobs(jobs.data);setEarnings(transactions.data.filter(row=>row.credit).reduce((sum,row)=>sum+Number(row.amount.replace(/[^0-9.]/g,'')),0));});load();const stops=['bookings','service_requests','wallet_transactions'].map(table=>subscribeToTable(table,load));return()=>stops.forEach(stop=>stop());},[]);
  useEffect(()=>{let active=true;let stopPresence=()=>{};const loadOffers=()=>void getMyDispatchOffers().then(rows=>{if(active)setDispatchOffers(rows)}).catch(()=>{});const loadLiveStatus=()=>void getMyWorkerLiveStatus().then(status=>{if(active)setLiveStatus(status)}).catch(()=>{});loadOffers();loadLiveStatus();const stopDispatch=subscribeToDispatch(loadOffers);void startForegroundWorkerPresence((state,message)=>{if(active){setPresenceState(state);setPresenceMessage(message??'');if(state==='online')loadLiveStatus();}}).then(stop=>{if(active)stopPresence=stop;else stop()});return()=>{active=false;stopDispatch();stopPresence();};},[]);
  const refreshLocation=async()=>{setRefreshingLocation(true);setPresenceMessage('Refreshing location and matching setup…');try{const status=await refreshWorkerPresence();setLiveStatus(status);setPresenceState('online');setPresenceMessage('Location and matching setup refreshed.');}catch(error){setPresenceState('error');setPresenceMessage(error instanceof Error?error.message:'Unable to refresh location.');}finally{setRefreshingLocation(false);}};
=======
  useEffect(()=>{const load=()=>void Promise.all([fetchWorkerProfile(),fetchWorkerBookings(),fetchWorkerJobs(),fetchWalletTransactions()]).then(([profile,bookings,jobs,transactions])=>{if(!profile.error)setWorkerProfile(profile.data);setWorkerBookings(bookings.data);setWorkerJobs(jobs.data);setEarnings(transactions.data.filter(row=>row.credit).reduce((sum,row)=>sum+Number(row.amount.replace(/[^0-9.]/g,'')),0));});load();const stops=['bookings','service_requests','wallet_transactions','reviews'].map(table=>subscribeToTable(table,load));return()=>stops.forEach(stop=>stop());},[]);
  useEffect(()=>{let active=true;const loadOffers=()=>void getMyDispatchOffers().then(rows=>{if(active)setDispatchOffers(rows)}).catch(()=>{});const loadLiveStatus=()=>void getMyWorkerLiveStatus().then(status=>{if(active)setLiveStatus(status)}).catch(()=>{});loadOffers();loadLiveStatus();const stopDispatch=subscribeToDispatch(loadOffers);return()=>{active=false;stopDispatch();};},[]);
  const refreshLocation=async()=>{setRefreshingLocation(true);try{const status=await refreshWorkerPresence();setLiveStatus(status);}catch(error){console.warn(error);}finally{setRefreshingLocation(false);}};
>>>>>>> Stashed changes
  const respond=async(offer:DispatchOffer,response:'ACCEPTED'|'DECLINED')=>{await respondToDispatch(offer.dispatchId,response);setDispatchOffers(current=>current.map(item=>item.dispatchId===offer.dispatchId?{...item,status:response}:item));};
  const activeBookings=workerBookings.filter(row=>!['completed','cancelled'].includes(row.status));const incomingJob=workerJobs[0];const completed=workerBookings.filter(row=>row.status==='completed').length;const todayStats=[{label:'Active',value:workerBookings.filter(row=>['worker_en_route','worker_arrived','service_started','in_progress'].includes(row.status)).length.toString()},{label:'Pending',value:workerBookings.filter(row=>['pending','accepted','worker_preparing'].includes(row.status)).length.toString()},{label:'Completed',value:completed.toString()},{label:'Earnings',value:`₱${earnings.toLocaleString()}`}];const completionRate=workerBookings.length?Math.round(completed/workerBookings.length*100):0;

  return (
    <View style={styles.container}>
      {isCurrentlyWorking && (
        <Pressable
          style={[styles.workingBanner, { paddingTop: insets.top + theme.spacing.sm }]}
          onPress={() => router.push(`/(worker)/booking-request/${currentBookingId}`)}
        >
          <Briefcase size={16} color={theme.colors.surface} />
          <Text style={[theme.typography.caption, { color: theme.colors.surface, fontWeight: '600' }]}>
            You are currently working on a job — Tap to view
          </Text>
        </Pressable>
      )}
      <View style={[styles.topNav, { paddingTop: (isCurrentlyWorking ? 0 : insets.top) + theme.spacing.sm }]}>
        <View style={styles.greetingRow}>
          <View>
            <Text style={[theme.typography.body2, { color: 'rgba(255,255,255,0.8)' }]}>Good morning,</Text>
            <Text style={[theme.typography.h3, { color: theme.colors.surface }]}>{workerProfile?.name.split(' ')[0]??''} 👋</Text>
          </View>
        </View>
        <View style={styles.headerTopRow}>
          <View style={styles.searchBar}>
            <Search color={theme.colors.textSecondary} size={20} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search for everything"
              style={styles.searchInput}
              placeholderTextColor={theme.colors.textTertiary}
              editable={false}
            />
          </View>
          <Pressable style={styles.iconButton} onPress={() => router.push('/notifications')}>
            <Bell color={theme.colors.surface} size={24} />
            <View style={styles.badge} />
          </Pressable>
          <Pressable style={styles.avatarButton} onPress={() => router.push('/(worker)/profile')}>
            <Image
              source={workerProfile?.avatarUri}
              style={styles.headerAvatar}
              contentFit="cover"
            />
          </Pressable>
        </View>
        {/* Stats Row */}
        <View style={styles.statsRow}>
          {todayStats.map((stat, index) => (
            <React.Fragment key={stat.label}>
              <View style={styles.statItemHeader}>
                <Text style={[theme.typography.h3, { color: theme.colors.surface }]}>{stat.value}</Text>
                <Text style={[theme.typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>{stat.label}</Text>
              </View>
              {index < todayStats.length - 1 && <View style={styles.statDividerHeader} />}
            </React.Fragment>
          ))}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <View style={[styles.presenceCard,presenceState==='online'&&styles.presenceOnline]}>
            <Text style={[theme.typography.body2,{fontWeight:'700'}]}>{presenceState==='online'?'Live and receiving nearby requests':'Live matching is not active'}</Text>
            <Text style={[theme.typography.caption,{color:theme.colors.textSecondary}]}>{presenceMessage||({starting:'Starting location sharing…',paused:'Tab inactive — matching will pause after 60 seconds.',offline:'Return to this tab to go online.',permission_denied:'Allow location access in your browser.',not_ready:'Complete Service Availability and go online.',error:'Location sharing could not start.',online:'Your foreground location updates every 10–15 seconds.'}[presenceState])}</Text>
            <View style={styles.liveDetails}>
              <Text style={styles.liveDetail}>Subdivision: {liveStatus?.subdivisionName??'Not assigned — using live distance and service radius'}</Text>
              <Text style={styles.liveDetail}>Service area: {liveStatus?.serviceArea??'Not configured'}{liveStatus?.radiusMeters?` · ${(liveStatus.radiusMeters/1000).toFixed(0)} km radius`:''}</Text>
              <Text style={styles.liveDetail}>Current location: {liveStatus?.latitude!=null&&liveStatus.longitude!=null?`${liveStatus.latitude.toFixed(4)}, ${liveStatus.longitude.toFixed(4)}`:'Waiting for coordinates'}</Text>
              <Text style={styles.liveDetail}>Last update: {liveStatus?.lastSeenAt?new Date(liveStatus.lastSeenAt).toLocaleTimeString():'No heartbeat received'}</Text>
            </View>
            <Pressable disabled={refreshingLocation} style={[styles.refreshLocationButton,refreshingLocation&&{opacity:.6}]} onPress={()=>void refreshLocation()}>
              <Text style={styles.refreshLocationText}>{refreshingLocation?'Refreshing…':'Refresh location and matching setup'}</Text>
            </Pressable>
          </View>
        </View>
        {dispatchOffers.map(offer=><View key={offer.dispatchId} style={styles.section}><View style={styles.dispatchCard}>
          <Text style={theme.typography.h4}>Nearby {offer.category} request</Text>
          <Text style={[theme.typography.body2,{color:theme.colors.textSecondary}]}>{offer.area} · {(offer.distanceMeters/1000).toFixed(1)} km · ₱{Number(offer.budget).toLocaleString()}</Text>
          <Text style={theme.typography.body2}>{offer.description}</Text>
          {offer.status==='ACCEPTED'?<Text style={{color:theme.colors.success,fontWeight:'700'}}>Accepted — waiting for the customer to choose.</Text>:<View style={styles.dispatchActions}><Pressable style={styles.declineButton} onPress={()=>void respond(offer,'DECLINED')}><Text style={{color:theme.colors.primary,fontWeight:'700'}}>Decline</Text></Pressable><Pressable style={styles.acceptButton} onPress={()=>void respond(offer,'ACCEPTED')}><Text style={{color:'#fff',fontWeight:'700'}}>Accept request</Text></Pressable></View>}
        </View></View>)}
        {/* Incoming Job Alert */}
        <View style={styles.section}>
          {incomingJob&&<IncomingJobAlert
            service={incomingJob.service}
            location={incomingJob.location}
            distance={incomingJob.distance}
            postedTime={incomingJob.postedTime}
            onAccept={() => router.push(`/(worker)/booking-request/${incomingJob.id}`)}
            onMoreDetails={() => router.push(`/(worker)/booking-request/${incomingJob.id}`)}
          />}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[theme.typography.h4, { marginBottom: theme.spacing.md }]}>Quick Actions</Text>
          <QuickActionsGrid />
        </View>

        {/* Active Bookings */}
        <View style={styles.section}>
          <Text style={[theme.typography.h4, { marginBottom: theme.spacing.md }]}>Active Bookings</Text>
          {activeBookings.map((booking) => (
            <Pressable
              key={booking.id}
              style={({ pressed }) => [styles.bookingCard, { opacity: pressed ? 0.95 : 1 }]}
              onPress={() => router.push(`/(worker)/booking-request/${booking.id}`)}
            >
              <View style={styles.bookingHeader}>
                <Avatar uri={booking.customerAvatar} size={40} />
                <View style={styles.bookingInfo}>
                  <Text style={theme.typography.body1}>{booking.customerName}</Text>
                  <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>{booking.service}</Text>
                </View>
                <Badge label={(statusConfig[booking.status]??{label:booking.status}).label} variant={(statusConfig[booking.status]??{variant:'info'}).variant} />
              </View>
              <View style={styles.bookingMeta}>
                <Text style={[theme.typography.caption, { color: theme.colors.textTertiary }]}>{booking.time}</Text>
                <Text style={[theme.typography.caption, { color: theme.colors.textTertiary }]}>·</Text>
                <Text style={[theme.typography.caption, { color: theme.colors.textTertiary }]}>{booking.address}</Text>
              </View>
            </Pressable>
          ))}
          <Pressable style={styles.seeAllBtn} onPress={() => router.push('/(worker)/bookings')}>
            <Text style={[theme.typography.button, { color: theme.colors.primary }]}>See All Bookings</Text>
            <ChevronRight size={18} color={theme.colors.primary} />
          </Pressable>
        </View>

        {/* Worker Profile Card */}
        <View style={styles.section}>
          <View style={styles.perfCard}>
            <View style={styles.perfHeader}>
              <View style={styles.perfAvatar}>
                <Text style={[theme.typography.h4, { color: theme.colors.surface }]}>JR</Text>
              </View>
              <View style={styles.perfInfo}>
                <Text style={theme.typography.h4}>{workerProfile?.name??''}</Text>
                <Badge label={workerProfile?.verificationStatus==='verified'?'VERIFIED':'PENDING'} variant="warning" size="sm" />
              </View>
            </View>
            <View style={styles.perfStats}>
              {[
                { label: 'Completion Rate', val: completionRate, color: theme.colors.success },
                { label: 'Average Rating', val: Math.round((workerProfile?.rating??0)/5*100), color: theme.colors.info },
                { label: 'Profile Completion', val: workerProfile?.bio?100:75, color: theme.colors.warning },
              ].map((s) => (
                <View key={s.label} style={styles.perfRow}>
                  <View style={styles.perfRowTop}>
                    <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>{s.label}</Text>
                    <Text style={[theme.typography.caption, { fontWeight: '600', color: s.color }]}>{s.val}%</Text>
                  </View>
                  <View style={styles.perfTrack}>
                    <View style={[styles.perfFill, { width: `${s.val}%`, backgroundColor: s.color }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  topNav: { backgroundColor: '#1e3a8a', paddingHorizontal: theme.layout.screenPadding, paddingBottom: theme.spacing.md },
  greetingRow: { marginBottom: theme.spacing.md },
  headerTopRow: { flexDirection: 'row', alignItems: 'center' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing.md, height: 44, marginRight: theme.spacing.sm },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.textPrimary },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.sm },
  badge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.error, borderWidth: 1, borderColor: '#1e3a8a' },
  avatarButton: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: theme.colors.surface },
  headerAvatar: { width: '100%', height: '100%' },
  content: { flex: 1, zIndex: 5 },
  contentContainer: { paddingBottom: theme.spacing.xxxl, paddingTop: theme.spacing.lg },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xs },
  statItemHeader: { alignItems: 'center', flex: 1 },
  statDividerHeader: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  section: { marginBottom: theme.spacing.xl, paddingHorizontal: theme.layout.screenPadding },
  bookingCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, padding: theme.spacing.md, marginBottom: theme.spacing.md, ...theme.shadows.sm },
  bookingHeader: { flexDirection: 'row', alignItems: 'center' },
  bookingInfo: { flex: 1, marginLeft: theme.spacing.sm },
  bookingMeta: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface },
  perfCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, padding: theme.spacing.lg, ...theme.shadows.sm },
  perfHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  perfAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.info, alignItems: 'center', justifyContent: 'center' },
  perfInfo: { flex: 1, gap: 2 },
  perfStats: { gap: theme.spacing.md },
  perfRow: { gap: theme.spacing.xs },
  perfRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  perfTrack: { height: 6, backgroundColor: theme.colors.borderLight, borderRadius: theme.radius.full, overflow: 'hidden' },
  perfFill: { height: '100%', borderRadius: theme.radius.full },
  workingBanner: {
    backgroundColor: theme.colors.warning,
    paddingHorizontal: theme.layout.screenPadding,
    paddingBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  presenceCard:{backgroundColor:theme.colors.surface,borderRadius:theme.radius.lg,padding:theme.spacing.md,borderWidth:1,borderColor:theme.colors.warning,gap:4},
  presenceOnline:{borderColor:theme.colors.success},
  liveDetails:{marginTop:theme.spacing.sm,paddingTop:theme.spacing.sm,borderTopWidth:1,borderTopColor:theme.colors.borderLight,gap:3},
  liveDetail:{...theme.typography.caption,color:theme.colors.textSecondary},
  refreshLocationButton:{marginTop:theme.spacing.sm,alignItems:'center',paddingVertical:theme.spacing.sm,borderRadius:theme.radius.md,backgroundColor:theme.colors.primary},
  refreshLocationText:{...theme.typography.button,color:theme.colors.surface},
  dispatchCard:{backgroundColor:theme.colors.surface,borderRadius:theme.radius.xl,padding:theme.spacing.lg,gap:theme.spacing.sm,...theme.shadows.md},
  dispatchActions:{flexDirection:'row',gap:theme.spacing.sm,marginTop:theme.spacing.sm},
  declineButton:{flex:1,alignItems:'center',padding:theme.spacing.md,borderWidth:1,borderColor:theme.colors.primary,borderRadius:theme.radius.lg},
  acceptButton:{flex:1,alignItems:'center',padding:theme.spacing.md,backgroundColor:theme.colors.primary,borderRadius:theme.radius.lg},
});
