import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const style = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

export default function SubdivisionMapPicker({ latitude, longitude, onChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const initialCenterRef = useRef([Number(longitude) || 121.0244, Number(latitude) || 14.5547]);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    const center = initialCenterRef.current;
    const map = new maplibregl.Map({ container: containerRef.current, style, center, zoom: 14 });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    const marker = new maplibregl.Marker({ color: '#0B63D6', draggable: true })
      .setLngLat(center)
      .addTo(map);
    const publish = () => {
      const point = marker.getLngLat();
      onChangeRef.current({ latitude: point.lat, longitude: point.lng });
    };
    marker.on('dragend', publish);
    map.on('click', (event) => {
      marker.setLngLat(event.lngLat);
      publish();
    });
    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      marker.remove();
      map.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    markerRef.current?.setLngLat([lng, lat]);
    mapRef.current?.easeTo({ center: [lng, lat], duration: 300 });
  }, [latitude, longitude]);

  return (
    <div
      ref={containerRef}
      className="h-72 w-full overflow-hidden rounded-xl border border-gray-200"
    />
  );
}
