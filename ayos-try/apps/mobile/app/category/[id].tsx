import React,{useEffect,useMemo,useState}from'react';
import{View,Text,StyleSheet,TouchableOpacity}from'react-native';
import{useLocalSearchParams,useRouter}from'expo-router';
import{Screen}from'@/components/layout/Screen';
import{theme}from'@/constants/theme';
import{ArrowLeft,Star,MapPin,CheckCircle2,Search}from'lucide-react-native';
import{Image}from'expo-image';
import{fetchProviders}from'@/services/api';
import type{ProviderData}from'@/components/ProviderCard';

export default function CategoryScreen(){
 const router=useRouter();const{id}=useLocalSearchParams();const categoryName=typeof id==='string'?decodeURIComponent(id).toLowerCase():'';const[providers,setProviders]=useState<ProviderData[]>([]);
 useEffect(()=>{void fetchProviders().then(result=>setProviders(result.data));},[]);
 const workers=useMemo(()=>providers.filter(worker=>worker.category.toLowerCase().includes(categoryName)),[categoryName,providers]);
 const title=categoryName?categoryName.charAt(0).toUpperCase()+categoryName.slice(1):'Workers';
 return <Screen safeArea scrollable backgroundColor={theme.colors.background}>
  <View style={[styles.header,{paddingHorizontal:theme.layout.screenPadding}]}><TouchableOpacity onPress={()=>router.back()} style={styles.backButton}><ArrowLeft color={theme.colors.textPrimary} size={24}/></TouchableOpacity><Text style={[theme.typography.h4,{color:theme.colors.textPrimary}]}>{title} Experts</Text><View style={{width:40}}/></View>
  <View style={styles.content}><Text style={[theme.typography.body2,{color:theme.colors.textSecondary,marginBottom:theme.spacing.lg}]}>Showing {workers.length} available verified workers for {title}.</Text>
  {workers.length?workers.map(worker=><TouchableOpacity key={worker.id} style={styles.workerCard} onPress={()=>router.push(`/provider/${worker.id}`)}><Image source={worker.avatarUri} style={styles.workerAvatar} contentFit="cover"/><View style={styles.workerInfo}><View style={styles.workerHeader}><Text style={theme.typography.h4}>{worker.name}</Text>{worker.verified&&<CheckCircle2 color={theme.colors.primary} size={16} style={{marginLeft:4}}/>}</View><View style={styles.statsRow}><View style={styles.statItem}><Star color={theme.colors.warning} fill={theme.colors.warning} size={14}/><Text style={[theme.typography.caption,{marginLeft:3}]}>{worker.rating.toFixed(1)} ({worker.reviewCount})</Text></View><View style={styles.statItem}><MapPin color={theme.colors.textSecondary} size={14}/><Text style={[theme.typography.caption,{marginLeft:3}]}>{worker.distance}</Text></View></View></View><View style={styles.priceContainer}><Text style={[theme.typography.label,{color:theme.colors.primary}]}>{worker.price??'Quote required'}</Text></View></TouchableOpacity>):<View style={styles.emptyState}><Search color={theme.colors.textTertiary} size={48}/><Text style={[theme.typography.h4,{color:theme.colors.textSecondary,marginTop:theme.spacing.md}]}>No workers found</Text><Text style={[theme.typography.body2,{color:theme.colors.textTertiary,textAlign:'center',marginTop:4}]}>Try adjusting your location or checking back later.</Text></View>}
  </View>
 </Screen>;
}
const styles=StyleSheet.create({header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:theme.spacing.md},backButton:{width:40,height:40,justifyContent:'center',alignItems:'flex-start'},content:{paddingHorizontal:theme.layout.screenPadding,paddingBottom:theme.spacing.xxxl},workerCard:{flexDirection:'row',backgroundColor:theme.colors.surface,borderRadius:theme.radius.lg,padding:theme.spacing.md,marginBottom:theme.spacing.md,...theme.shadows.sm,borderWidth:1,borderColor:theme.colors.borderLight},workerAvatar:{width:72,height:72,borderRadius:36,backgroundColor:theme.colors.border},workerInfo:{flex:1,marginLeft:theme.spacing.md,justifyContent:'center'},workerHeader:{flexDirection:'row',alignItems:'center'},statsRow:{flexDirection:'row',alignItems:'center'},statItem:{flexDirection:'row',alignItems:'center',marginRight:theme.spacing.md},priceContainer:{justifyContent:'flex-start',alignItems:'flex-end',paddingTop:4},emptyState:{alignItems:'center',justifyContent:'center',paddingVertical:theme.spacing.xxxl,marginTop:theme.spacing.xl}});
