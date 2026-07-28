import React,{useEffect}from'react';
import{ActivityIndicator,View}from'react-native';
import{useRouter}from'expo-router';
import{Colors}from'@/constants/theme';

export default function MatchingCompatibilityRoute(){const router=useRouter();useEffect(()=>{router.replace('/new-request/matching');},[router]);return <View style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:Colors.background}}><ActivityIndicator color={Colors.primary}/></View>;}
