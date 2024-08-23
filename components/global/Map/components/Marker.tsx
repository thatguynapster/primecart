"use client";

import { HtmlHTMLAttributes, forwardRef, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

export interface MarkerProps extends HtmlHTMLAttributes<HTMLDivElement> {
  map: google.maps.Map | undefined;
  zIndex?: number;
  position?: google.maps.LatLngLiteral;
}

export const Marker = forwardRef<
  google.maps.marker.AdvancedMarkerElement,
  MarkerProps
>(({ map, zIndex = 1, position, children, onClick }, ref) => {
  /**
   * ref
   */
  const markerRef = useRef<any>();
  const rootRef = useRef<any>();

  /**
   * effect
   */
  useEffect(() => {
    if (!rootRef.current) {
      // allows us to parse jsx to google maps
      const container = document.createElement("div");
      rootRef.current = createRoot(container);

      // instance of advance marker
      markerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map,
        zIndex,
        position,
        content: container,
      });

      if (ref) {
        // @ts-expect-error Valid
        ref.current = markerRef.current;
      }
    }

    return () => {
      markerRef.current.setMap(null);
      markerRef.current = null;
      rootRef.current = null;
    };
  }, []);

  useEffect(() => {
    rootRef.current.render(children);
    markerRef.current.position = position;
    markerRef.current.map = map;
    markerRef.current.zIndex = zIndex;

    const clickListener = markerRef.current.addListener("gmp-click", (e: any) =>
      onClick?.(e)
    );

    return () => {
      clickListener.remove();
    };
  }, [map, position, children, zIndex, onClick]);

  return <></>;
});

Marker.displayName = "Marker";
