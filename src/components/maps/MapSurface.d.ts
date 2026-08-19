import type { ComponentType } from 'react';
export type MapPoint={id:string;latitude:number;longitude:number;color?:string};
export const MapSurface:ComponentType<{center:{latitude:number;longitude:number};points:MapPoint[];route?:GeoJSON.FeatureCollection;interactive?:boolean;radiusMeters?:number;animateRadius?:boolean}>;
