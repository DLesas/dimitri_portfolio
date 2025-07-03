"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useTheme as useNextTheme } from "next-themes";
import { useTheme } from "@/contexts/ThemeContext";
import { renderToStaticMarkup } from "react-dom/server";
import "leaflet/dist/leaflet.css";

// Fix for default markers in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;

// Custom pin component
const CustomPin = ({
  color,
  borderColor,
  size = 32,
}: {
  color: string;
  borderColor: string;
  size?: number;
}) => (
  <div
    className="relative rounded-tl-full rounded-tr-full rounded-bl-full shadow-lg"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      background: color,
      transform: "rotate(45deg)",
      border: `3px solid ${borderColor}`,
    }}
  >
    <div
      className="absolute top-1/2 left-1/2 bg-white rounded-full"
      style={{
        width: `${size * 0.375}px`,
        height: `${size * 0.375}px`,
        transform: "translate(-50%, -50%)",
      }}
    />
  </div>
);

export default function Map() {
  const { theme } = useNextTheme();
  const { colors } = useTheme();
  const isDark = theme === "dark";

  // London coordinates
  const londonPosition: [number, number] = [51.5074, -0.1278];

  // Romsey coordinates
  const romseyPosition: [number, number] = [50.9893, -1.4956];

  // Create custom icon using theme colors (both pins use primary color)
  const createCustomIcon = () => {
    const pinColor = colors.secondary.shades[500].hex;
    const borderColor = isDark
      ? colors.background.base.hex
      : colors.foreground.base.hex;

    const pinHtml = renderToStaticMarkup(
      <CustomPin color={pinColor} borderColor={borderColor} size={32} />
    );

    return L.divIcon({
      html: pinHtml,
      className: "custom-map-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  };

  // Dark theme map tiles
  const darkTileUrl =
    "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png";
  const darkAttribution =
    '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';

  // Light theme map tiles
  const lightTileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const lightAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <MapContainer
      center={londonPosition}
      zoom={8}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
      className="rounded-lg"
    >
      <TileLayer
        attribution={isDark ? darkAttribution : lightAttribution}
        url={isDark ? darkTileUrl : lightTileUrl}
      />

      {/* London marker */}
      <Marker position={londonPosition} icon={createCustomIcon()}>
        <Popup>
          <div className="text-center">
            <h3 className="font-semibold mb-1">Dimitri Lesas</h3>
            <p className="text-sm">London, UK</p>
            <p className="text-xs text-gray-600 mt-2">
              Available for remote and on-site opportunities
            </p>
          </div>
        </Popup>
      </Marker>

      {/* Romsey marker */}
      <Marker position={romseyPosition} icon={createCustomIcon()}>
        <Popup>
          <div className="text-center">
            <h3 className="font-semibold mb-1">Home Base</h3>
            <p className="text-sm">Romsey, UK</p>
            <p className="text-xs text-gray-600 mt-2">Hampshire countryside</p>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
