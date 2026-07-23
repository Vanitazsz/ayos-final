import * as Location from 'expo-location';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { getWorkerMatchingReadiness } from '@/services/workerMatching';

export type DispatchStatus = 'OFFERED'|'VIEWED'|'ACCEPTED'|'DECLINED'|'EXPIRED'|'SELECTED';
export type LiveWorkerCandidate={dispatchId:string;workerId:string;status:DispatchStatus;name:string;avatar:string|null;distanceMeters:number;latitude:number;longitude:number;rating:number;reviewCount:number};
export type DispatchDiagnostics={reasonCode:'NO_ACTIVE_WORKERS'|'NO_CATEGORY_WORKERS'|'NO_APPROVED_WORKERS'|'WORKERS_OFFLINE'|'NO_FRESH_PRESENCE'|'OUTSIDE_SEARCH_RADIUS'|'OUTSIDE_WORKING_HOURS'|'WAITING_FOR_RESPONSE';counts:{active:number;skilled:number;approved:number;available:number;freshPresence:number;withinWave:number;scheduled:number;subdivisionCompatible:number}};
export type DispatchSnapshot={serviceRequestId:string;startedAt:string;expiresAt:string;wave:1|2|3;diagnostics:DispatchDiagnostics;candidates:LiveWorkerCandidate[]};
export type DispatchOffer={dispatchId:string;serviceRequestId:string;status:DispatchStatus;distanceMeters:number;expiresAt:string;category:string;description:string;budget:number;area:string};
export type PresenceState='starting'|'online'|'offline'|'permission_denied'|'not_ready'|'error';
export type WorkerLiveStatus={subdivisionId:string|null;subdivisionName:string|null;serviceArea:string|null;radiusMeters:number|null;presenceOnline:boolean;lastSeenAt:string|null;latitude:number|null;longitude:number|null;accuracyMeters:number|null};

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
export const getMyWorkerLiveStatus=()=>rpc<WorkerLiveStatus>('get_my_worker_live_status');
export const respondToDispatch=(dispatchId:string,response:'ACCEPTED'|'DECLINED')=>rpc<{dispatchId:string;status:DispatchStatus}>('respond_to_dispatch',{p_dispatch_id:dispatchId,p_response:response});

export function subscribeToDispatch(onChange:()=>void,filter?:string){
  const channel=supabase.channel(`live-dispatch:${filter??'mine'}:${Date.now()}`).on('postgres_changes',{event:'*',schema:'public',table:'service_request_dispatches',filter},onChange).subscribe();
  return()=>{void supabase.removeChannel(channel);};
}

export function sanitizeAccuracy(accuracy: number | null | undefined): number | null {
  if (accuracy == null || !Number.isFinite(accuracy)) return null;
  if (accuracy < 0 || accuracy > 10000) return null;
  return Math.round(accuracy * 100) / 100;
}

async function publishWorkerPosition(position:Location.LocationObject,online=true){
  return rpc<{online:boolean;lastSeenAt:string}>('update_worker_presence',{p_latitude:position.coords.latitude,p_longitude:position.coords.longitude,p_accuracy_meters:sanitizeAccuracy(position.coords.accuracy),p_online:online});
}

export async function refreshWorkerPresence(){
  const permission=await Location.requestForegroundPermissionsAsync();
  if(permission.status!=='granted')throw new Error('Location permission is required to receive nearby requests.');
  const position=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
  await publishWorkerPosition(position,true);
  return getMyWorkerLiveStatus();
}

export async function startForegroundWorkerPresence(onState:(state:PresenceState,message?:string)=>void){
  const readiness=await getWorkerMatchingReadiness();
  if(!readiness.matchable){onState('not_ready','Complete Service Availability and switch Available for matching on.');return()=>{};}
  const permission=await Location.requestForegroundPermissionsAsync();
  if(permission.status!=='granted'){onState('permission_denied','Location permission is required to receive nearby requests.');return()=>{};}
  let stopped=false;
  let active=false;
  let publishing=false;
  let subscription:Location.LocationSubscription|null=null;
  let heartbeatTimer:ReturnType<typeof setInterval>|null=null;
  let latestPosition:Location.LocationObject|null=null;

  const publish=async(position:Location.LocationObject,online=true)=>{
    if(publishing)return;
    publishing=true;
    try{
      latestPosition=position;
      await publishWorkerPosition(position,online);
      if(!stopped)onState(online?'online':'offline');
    }
    catch(error){
      if(!stopped)onState('error',normalizeSupabaseError(error).message);
    }
    finally{publishing=false;}
  };

  const heartbeat=async()=>{
    if(stopped||!active||publishing)return;
    try{
      const position=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
      if(!stopped&&active)await publish(position,true);
    }
    catch(error){
      if(!stopped&&active)onState('error',normalizeSupabaseError(error,'Unable to refresh the browser location.').message);
    }
  };

  const stopActivePresence=()=>{
    active=false;
    if(heartbeatTimer){clearInterval(heartbeatTimer);heartbeatTimer=null;}
    subscription?.remove();
    subscription=null;
  };

  const begin=async()=>{
    if(stopped||active)return;
    active=true;
    onState('starting');
    try{
      await heartbeat();
      if(stopped||!active)return;
      subscription=await Location.watchPositionAsync(
        {accuracy:Location.Accuracy.Balanced,timeInterval:10000,distanceInterval:20},
        position=>{latestPosition=position;void publish(position,true);},
        message=>{if(!stopped&&active)onState('error',message||'Browser location updates stopped.');},
      );
      heartbeatTimer=setInterval(()=>void heartbeat(),10000);
    }
    catch(error){
      stopActivePresence();
      if(!stopped)onState('error',normalizeSupabaseError(error,'Unable to read the browser location.').message);
    }
  };

  const publishOffline=async()=>{
    const position=latestPosition??await Location.getLastKnownPositionAsync();
    if(position)await publish(position,false);
  };

  await begin();
  const appState=AppState.addEventListener('change',state=>{
    if(state==='active'){void begin();return;}
    stopActivePresence();
    void publishOffline();
  });
  return()=>{
    stopped=true;
    appState.remove();
    stopActivePresence();
    void publishOffline();
  };
}
