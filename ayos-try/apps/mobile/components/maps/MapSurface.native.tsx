import React from 'react';
import { StyleSheet, View } from 'react-native';
import * as MapLibreGL from '@maplibre/maplibre-react-native';
import { mapStyleUrl } from '@/lib/supabase';

export type MapPoint={id:string;latitude:number;longitude:number;color?:string};
const radiusGeoJson=(center:{latitude:number;longitude:number},meters:number):GeoJSON.FeatureCollection=>({type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[...Array.from({length:65},(_,index)=>{const angle=index/64*Math.PI*2;return[center.longitude+(meters/111320)*Math.cos(angle)/Math.cos(center.latitude*Math.PI/180),center.latitude+(meters/110540)*Math.sin(angle)];})]]}}]});
export function MapSurface({center,points,route,interactive=true,radiusMeters}:{center:{latitude:number;longitude:number};points:MapPoint[];route?:GeoJSON.FeatureCollection;interactive?:boolean;radiusMeters?:number}){
  return <MapLibreGL.Map style={styles.map} mapStyle={mapStyleUrl} dragPan={interactive} touchZoom={interactive} doubleTapZoom={interactive} touchRotate={interactive}>
    <MapLibreGL.Camera initialViewState={{center:[center.longitude,center.latitude],zoom:13}}/>
    {radiusMeters&&<MapLibreGL.GeoJSONSource id="radius" data={radiusGeoJson(center,radiusMeters)}><MapLibreGL.Layer id="radius-fill" type="fill" paint={{'fill-color':'#1e3a8a','fill-opacity':0.16}}/><MapLibreGL.Layer id="radius-line" type="line" paint={{'line-color':'#1e3a8a','line-width':2}}/></MapLibreGL.GeoJSONSource>}
    {route&&<MapLibreGL.GeoJSONSource id="route" data={route}><MapLibreGL.Layer id="route-line" type="line" paint={{'line-color':'#1e3a8a','line-width':4}}/></MapLibreGL.GeoJSONSource>}
    {points.map((point)=><MapLibreGL.Marker key={point.id} id={point.id} lngLat={[point.longitude,point.latitude]}><View style={[styles.marker,{backgroundColor:point.color??'#1e3a8a'}]}/></MapLibreGL.Marker>)}
  </MapLibreGL.Map>;
}
const styles=StyleSheet.create({map:{flex:1},marker:{width:20,height:20,borderRadius:10,borderWidth:3,borderColor:'#fff'}});
