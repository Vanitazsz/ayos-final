import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { mapStyleUrl } from '@/lib/supabase';

import type { MapPoint } from './MapSurface.native';
import { easeOutCubic, radiusBounds, radiusGeoJson } from './radiusGeometry';

type MapSurfaceProps = {
  center: { latitude: number; longitude: number };
  points: MapPoint[];
  route?: GeoJSON.FeatureCollection;
  interactive?: boolean;
  radiusMeters?: number;
  animateRadius?: boolean;
};

const RADIUS_ANIMATION_MS = 320;
const RADIUS_PADDING = 32;

export function MapSurface({
  center,
  points,
  route,
  interactive = true,
  radiusMeters,
  animateRadius = false,
}: MapSurfaceProps) {
  const mapCenter = useMemo(
    () => ({ latitude: center.latitude, longitude: center.longitude }),
    [center.latitude, center.longitude],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const initialMapOptionsRef = useRef({ center: mapCenter, interactive });
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const displayedRadiusRef = useRef<number | undefined>(undefined);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialMapOptions = initialMapOptionsRef.current;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyleUrl,
      center: [initialMapOptions.center.longitude, initialMapOptions.center.latitude],
      zoom: 13,
      interactive: initialMapOptions.interactive,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }));
    map.on('load', () => setIsMapLoaded(true));
    mapRef.current = map;

    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      markerRefs.current.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    map.setCenter([mapCenter.longitude, mapCenter.latitude]);
    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = points.map((point) =>
      new maplibregl.Marker({ color: point.color ?? '#1e3a8a' })
        .setLngLat([point.longitude, point.latitude])
        .addTo(map),
    );

    const routeSource = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
    if (route) {
      if (routeSource) routeSource.setData(route);
      else {
        map.addSource('route', { type: 'geojson', data: route });
        map.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': '#1e3a8a', 'line-width': 4 } });
      }
    } else if (routeSource) {
      map.removeLayer('route-line');
      map.removeSource('route');
    }
  }, [isMapLoaded, mapCenter, points, route]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);

    const radiusSource = map.getSource('radius') as maplibregl.GeoJSONSource | undefined;
    if (!radiusMeters) {
      displayedRadiusRef.current = undefined;
      if (radiusSource) {
        map.removeLayer('radius-line');
        map.removeLayer('radius-fill');
        map.removeSource('radius');
      }
      return;
    }

    const setRadiusData = (meters: number) => {
      const source = map.getSource('radius') as maplibregl.GeoJSONSource | undefined;
      if (source) source.setData(radiusGeoJson(mapCenter, meters));
      else {
        map.addSource('radius', { type: 'geojson', data: radiusGeoJson(mapCenter, meters) });
        map.addLayer({ id: 'radius-fill', type: 'fill', source: 'radius', paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.18 } });
        map.addLayer({ id: 'radius-line', type: 'line', source: 'radius', paint: { 'line-color': '#1d4ed8', 'line-width': 2.5, 'line-opacity': 0.9 } });
      }
    };

    const startRadius = displayedRadiusRef.current ?? radiusMeters;
    displayedRadiusRef.current = startRadius;
    map.fitBounds(radiusBounds(mapCenter, radiusMeters), {
      padding: RADIUS_PADDING,
      duration: animateRadius ? RADIUS_ANIMATION_MS : 0,
    });

    if (!animateRadius || startRadius === radiusMeters) {
      setRadiusData(radiusMeters);
      displayedRadiusRef.current = radiusMeters;
      return;
    }

    const startedAt = performance.now();
    const renderFrame = (now: number) => {
      const progress = Math.min((now - startedAt) / RADIUS_ANIMATION_MS, 1);
      const displayedRadius = startRadius + (radiusMeters - startRadius) * easeOutCubic(progress);
      setRadiusData(displayedRadius);
      displayedRadiusRef.current = displayedRadius;
      if (progress < 1) animationFrameRef.current = requestAnimationFrame(renderFrame);
      else {
        displayedRadiusRef.current = radiusMeters;
        animationFrameRef.current = null;
      }
    };
    animationFrameRef.current = requestAnimationFrame(renderFrame);
  }, [animateRadius, isMapLoaded, mapCenter, radiusMeters]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
import React,{useEffect,useRef}from'react';
import maplibregl from'maplibre-gl';
import'maplibre-gl/dist/maplibre-gl.css';
import{mapStyleUrl}from'@/lib/supabase';
import type{MapPoint}from'./MapSurface.native';
const radiusGeoJson=(center:{latitude:number;longitude:number},meters:number):GeoJSON.FeatureCollection=>({type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[...Array.from({length:65},(_,index)=>{const angle=index/64*Math.PI*2;return[center.longitude+(meters/111320)*Math.cos(angle)/Math.cos(center.latitude*Math.PI/180),center.latitude+(meters/110540)*Math.sin(angle)];})]]}}]});
export function MapSurface({center,points,route,interactive=true,radiusMeters}:{center:{latitude:number;longitude:number};points:MapPoint[];route?:GeoJSON.FeatureCollection;interactive?:boolean;radiusMeters?:number}){const ref=useRef<HTMLDivElement>(null);useEffect(()=>{if(!ref.current)return;if(!Number.isFinite(center.latitude)||!Number.isFinite(center.longitude))return;const map=new maplibregl.Map({container:ref.current,style:mapStyleUrl,center:[center.longitude,center.latitude],zoom:13,interactive});map.addControl(new maplibregl.AttributionControl({compact:true}));map.on('load',()=>{if(radiusMeters){map.addSource('radius',{type:'geojson',data:radiusGeoJson(center,radiusMeters)});map.addLayer({id:'radius-fill',type:'fill',source:'radius',paint:{'fill-color':'#1e3a8a','fill-opacity':.16}});map.addLayer({id:'radius-line',type:'line',source:'radius',paint:{'line-color':'#1e3a8a','line-width':2}});}if(route){map.addSource('route',{type:'geojson',data:route});map.addLayer({id:'route-line',type:'line',source:'route',paint:{'line-color':'#1e3a8a','line-width':4}});}points.forEach((point)=>{if(Number.isFinite(point.latitude)&&Number.isFinite(point.longitude)){new maplibregl.Marker({color:point.color??'#1e3a8a'}).setLngLat([point.longitude,point.latitude]).addTo(map);}});});return()=>map.remove();},[center.latitude,center.longitude,interactive,points,route,radiusMeters]);return <div ref={ref} style={{width:'100%',height:'100%'}}/>;}
