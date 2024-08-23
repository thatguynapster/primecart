"use client";

import { ReactElement, useEffect, useRef, useState } from "react";

function MapProvider({
  zoom,
  mapId,
  center,
  children,
}: {
  zoom?: number;
  mapId: string;
  center: google.maps.LatLngLiteral;
  children: ({
    ref,
    map,
  }: {
    ref: any;
    map: google.maps.Map | undefined;
  }) => ReactElement;
}) {
  /**
   * state
   */
  const [map, setMap] = useState<google.maps.Map>();

  /**
   * ref
   */
  const mapRef = useRef<any>();

  /**
   * effect
   */
  useEffect(() => {
    setMap(
      new google.maps.Map(mapRef.current, {
        mapId,
        center,
        zoom: zoom ?? 12,
        disableDefaultUI: true,
      })
    );
  }, []);

  useEffect(() => {
    if (map) {
      if (center?.lat && center?.lng) {
        map?.setCenter(center);
      }

      if (zoom) {
        map?.setZoom(zoom);
      }
    }
  }, [center, map, zoom]);

  return <>{children({ map, ref: mapRef })}</>;
}

export default MapProvider;
