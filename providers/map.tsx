"use client";

import { Wrapper } from "@googlemaps/react-wrapper";

export function MapProvider({ children }: { children: any }) {
  return (
    <Wrapper
      version="beta"
      libraries={["marker", "places"]}
      apiKey={process.env["NEXT_PUBLIC_MAP_API_KEY"] as string}
    >
      {children}
    </Wrapper>
  );
}
