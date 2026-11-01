"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useTheme } from "next-themes";
import { useThemeColors } from "@/contexts/ThemeColorsContext";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { LOCATION, SITE_NAME } from "@/lib/site";

const MAP_LOCATIONS: {
  position: [number, number];
  title: string;
  place: string;
  note: string;
}[] = [
  {
    position: LOCATION.coordinates,
    title: SITE_NAME,
    place: LOCATION.label,
    note: "Available for remote and on-site opportunities",
  },
  {
    position: [50.9893, -1.4956],
    title: "Home Base",
    place: "Romsey, UK",
    note: "Hampshire countryside",
  },
];

const PIN_SIZE = 32;

/**
 * The pin's markup for Leaflet's divIcon: a teardrop (a square, three corners rounded,
 * turned 45deg) with a white dot. Written as HTML rather than rendered from JSX, so the
 * map's chunk doesn't need react-dom/server.
 */
const pinHtml = (color: string, borderColor: string) =>
  `<div class="relative rounded-tl-full rounded-tr-full rounded-bl-full shadow-lg" style="width:${PIN_SIZE}px;height:${PIN_SIZE}px;background:${color};transform:rotate(45deg);border:3px solid ${borderColor}">` +
  `<div class="absolute top-1/2 left-1/2 bg-white rounded-full" style="width:${PIN_SIZE * 0.375}px;height:${PIN_SIZE * 0.375}px;transform:translate(-50%, -50%)"></div>` +
  `</div>`;

export function Map() {
  const { theme } = useTheme();
  const { colors } = useThemeColors();
  const isDark = theme === "dark";

  // Both pins in the theme's secondary colour, outlined to stand off the basemap
  const pinColor = colors.secondary.shades[500].hex;
  const borderColor = isDark ? colors.background.base.hex : colors.foreground.base.hex;
  const icon = useMemo(
    () =>
      L.divIcon({
        html: pinHtml(pinColor, borderColor),
        className: "custom-map-marker",
        iconSize: [PIN_SIZE, PIN_SIZE],
        iconAnchor: [PIN_SIZE / 2, PIN_SIZE],
        popupAnchor: [0, -PIN_SIZE],
      }),
    [pinColor, borderColor]
  );

  // OpenStreetMap tiles for both themes: free and keyless. In dark mode the
  // .map-dark filter in globals.css turns them into a dark basemap (CARTO's dark
  // tiles now require an API key)
  const tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  // The theme class lives on a wrapper: react-leaflet applies MapContainer's
  // className only when the map is created, so it would not follow theme changes
  return (
    <div
      className={isDark ? "map-dark" : undefined}
      style={{ height: "100%", width: "100%" }}
    >
      <MapContainer
        center={LOCATION.coordinates}
        zoom={6}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
        className="rounded-lg"
      >
        <TileLayer attribution={attribution} url={tileUrl} />

        {MAP_LOCATIONS.map(({ position, title, place, note }) => (
          <Marker key={title} position={position} icon={icon}>
            <Popup>
              <div className="text-center">
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-sm">{place}</p>
                <p className="text-xs text-gray-600 mt-2">{note}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
