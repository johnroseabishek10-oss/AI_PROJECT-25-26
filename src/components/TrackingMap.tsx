import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Technician, UserLocation } from '../types';
import { MapPin, Navigation, User } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const techIcon = L.divIcon({
  html: renderToStaticMarkup(
    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-white shadow-lg">
      <Navigation size={20} className="rotate-45" />
    </div>
  ),
  className: 'custom-div-icon',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const userIcon = L.divIcon({
  html: renderToStaticMarkup(
    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-zinc-900 text-white shadow-lg">
      <User size={20} />
    </div>
  ),
  className: 'custom-div-icon',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
    // Force map to recalculate size, especially important for mobile/flexbox
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [center, map]);
  return null;
}

interface TrackingMapProps {
  technician: Technician;
  userLocation?: UserLocation;
}

export default function TrackingMap({ technician, userLocation }: TrackingMapProps) {
  const techPos = technician.currentLocation || technician.location;
  const center: [number, number] = [techPos.lat, techPos.lng];

  return (
    <div className="h-full w-full overflow-hidden rounded-3xl border border-zinc-200 shadow-inner">
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <Marker position={[techPos.lat, techPos.lng]} icon={techIcon}>
          <Popup>
            <div className="text-sm font-bold">{technician.name} is on the way!</div>
          </Popup>
        </Marker>

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>
              <div className="text-sm font-bold">Your Location</div>
            </Popup>
          </Marker>
        )}

        <MapUpdater center={center} />
      </MapContainer>
    </div>
  );
}
