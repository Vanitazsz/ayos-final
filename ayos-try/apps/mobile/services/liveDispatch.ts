import * as Location from 'expo-location';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { getWorkerMatchingReadiness } from '@/services/workerMatching';

export type DispatchStatus = 'OFFERED'|'VIEWED'|'ACCEPTED'|'DECLINED'|'EXPIRED'|'SELECTED';
export type LiveWorkerCandidate={dispatchId:string;workerId:string;status:DispatchStatus;name:string;avatar:string|null;distanceMeters:number;latitude:number;longitude:number;rating:number;reviewCount:number};
export type DispatchSnapshot={serviceRequestId:string;startedAt:string;expiresAt:string;wave:1|2|3;candidates:LiveWorkerCandidate[]};
export type DispatchOffer={dispatchId:string;serviceRequestId:string;status:DispatchStatus;distanceMeters:number;expiresAt:string;category:string;description:string;budget:number;area:string};
export type PresenceState='starting'|'online'|'offline'|'permission_denied'|'not_ready'|'error';

export function normalizeSupabaseError(error:unknown,fallback='Request failed'){
  if(error instanceof Error)return error;
  if(error&&typeof error==='object'){
    const value=error as {message?:unknown;code?:unknown;details?:unknown};
    const message=typeof value.message==='string'?value.message:fallback;
    const normalized=new Error(message) as Error&{code?:string;details?:string};
    if(typeof value.code==='string')normalized.code=value.code;
    if(typeof value.details==='string')normalized.details=value.details;
    return normalized;
  }
  return new Error(fallback);
}

async function rpc<T>(name:string,args?:Record<string,unknown>){
  const {data,error}=await supabase.rpc(name,args);
  if(error)throw normalizeSupabaseError(error);
  return data as T;
}
export const startLiveDispatch=(serviceRequestId:string)=>rpc<DispatchSnapshot>('start_live_dispatch',{p_service_request_id:serviceRequestId});
export const getLiveDispatchSnapshot=(serviceRequestId:string)=>rpc<DispatchSnapshot>('get_live_dispatch_snapshot',{p_service_request_id:serviceRequestId});
export const getMyDispatchOffers=()=>rpc<DispatchOffer[]>('get_my_dispatch_offers');
export const respondToDispatch=(dispatchId:string,response:'ACCEPTED'|'DECLINED')=>rpc<{dispatchId:string;status:DispatchStatus}>('respond_to_dispatch',{p_dispatch_id:dispatchId,p_response:response});

export function subscribeToDispatch(onChange:()=>void,filter?:string){
  const channel=supabase.channel(`live-dispatch:${filter??'mine'}:${Date.now()}`).on('postgres_changes',{event:'*',schema:'public',table:'service_request_dispatches',filter},onChange).subscribe();
  return()=>{void supabase.removeChannel(channel);};
}

export async function startForegroundWorkerPresence(onState:(state:PresenceState,message?:string)=>void){
  const readiness=await getWorkerMatchingReadiness();
  if(!readiness.matchable){onState('not_ready','Complete Service Availability and switch Available for matching on.');return()=>{};}
  const permission=await Location.requestForegroundPermissionsAsync();
  if(permission.status!=='granted'){onState('permission_denied','Location permission is required to receive nearby requests.');return()=>{};}
  let stopped=false;let subscription:Location.LocationSubscription|null=null;
  const publish=async(position:Location.LocationObject,online=true)=>{
    try{await rpc('update_worker_presence',{p_latitude:position.coords.latitude,p_longitude:position.coords.longitude,p_accuracy_meters:position.coords.accuracy,p_online:online});if(!stopped)onState(online?'online':'offline');}
    catch(error){if(!stopped)onState('error',normalizeSupabaseError(error).message);}
  };
  const begin=async()=>{if(stopped||subscription)return;onState('starting');subscription=await Location.watchPositionAsync({accuracy:Location.Accuracy.Balanced,timeInterval:10000,distanceInterval:20},position=>void publish(position,true));};
  await begin();
  const appState=AppState.addEventListener('change',state=>{if(state==='active'){void begin();return;}const current=subscription;subscription=null;current?.remove();void Location.getLastKnownPositionAsync().then(position=>position&&publish(position,false));});
  return()=>{stopped=true;appState.remove();subscription?.remove();subscription=null;void Location.getLastKnownPositionAsync().then(position=>position&&publish(position,false));};
}
