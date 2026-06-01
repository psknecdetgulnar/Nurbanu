'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet varsayılan ikon sorunu (Next.js ile)
const icon = L.icon({
  iconUrl:    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize:   [25, 41],
  iconAnchor: [12, 41],
  popupAnchor:[1, -34],
  shadowUrl:  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
});

interface Props {
  pin: [number, number] | null;
  onPin: (latlng: [number, number]) => void;
  center: [number, number];
  zoom?: number;
}

function ClickHandler({ onPin }: { onPin: (latlng: [number, number]) => void }) {
  useMapEvents({
    click(e) { onPin([e.latlng.lat, e.latlng.lng]); },
  });
  return null;
}

function FlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, zoom, { duration: 1.2 }); }, [center, zoom, map]);
  return null;
}

export default function KonumMap({ pin, onPin, center, zoom = 13 }: Props) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full rounded-xl"
      scrollWheelZoom
    >
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyTo center={center} zoom={zoom} />
      <ClickHandler onPin={onPin} />
      {pin && (
        <Marker
          position={pin}
          icon={icon}
          draggable
          eventHandlers={{
            dragend(e) {
              const m = e.target as L.Marker;
              const p = m.getLatLng();
              onPin([p.lat, p.lng]);
            },
          }}
        />
      )}
    </MapContainer>
  );
}
