import { create } from 'zustand';
import type { MediaInput } from '@/types/ai';

type RequestDraft={categoryId:string;description:string;addressId:string|null;address:string;addressDetails:Record<string,any>|null;coords:{latitude:number;longitude:number}|null;media:MediaInput[];aiConsent:boolean;aiJobId:string|null;aiResult:Record<string,any>|null;budgetMinor:number;requestId:string|null;bookingId:string|null;searchRadiusKm:number;scheduledAt:string|null;matchingMode:'direct'|'bidding'};
const initial:RequestDraft={categoryId:'',description:'',addressId:null,address:'',addressDetails:null,coords:null,media:[],aiConsent:false,aiJobId:null,aiResult:null,budgetMinor:0,requestId:null,bookingId:null,searchRadiusKm:10,scheduledAt:null,matchingMode:'direct'};
export const useRequestStore=create<RequestDraft&{setDraft:(value:Partial<RequestDraft>)=>void;reset:()=>void}>((set)=>({...initial,setDraft:(value)=>set(value),reset:()=>set(initial)}));
