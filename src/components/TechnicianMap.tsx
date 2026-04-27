import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Technician, UserLocation } from '../types';
import { MapPin, Navigation, User, ShieldCheck, Star, Clock, AlertCircle } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createTechIcon = (category: string, isBusy: boolean) => {
  const colorClass = isBusy ? 'bg-amber-500' : 'bg-emerald-600';
  return L.divIcon({
    html: renderToStaticMarkup(
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white ${colorClass} text-white shadow-md transition-all hover:scale-105`}>
        <Navigation size={18} className="rotate-45" />
        {isBusy && (
          <div className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-amber-500 shadow-sm border border-amber-100">
            <Clock size={10} />
          </div>
        )}
      </div>
    ),
    className: 'custom-div-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const userIcon = L.divIcon({
  html: renderToStaticMarkup(
    <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white bg-zinc-900 text-white shadow-md">
      <User size={18} />
    </div>
  ),
  className: 'custom-div-icon',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

function MapUpdater({ center, userLocationDetected }: { center: [number, number], userLocationDetected: boolean }) {
  const map = useMap();
  const [hasCenteredOnUser, setHasCenteredOnUser] = useState(false);

  useEffect(() => {
    if (userLocationDetected && !hasCenteredOnUser) {
      map.setView(center, 14);
      setHasCenteredOnUser(true);
    } else if (!userLocationDetected && !hasCenteredOnUser) {
      map.setView(center, map.getZoom());
    }
    
    // Force map to recalculate size, especially important for mobile/flexbox
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [center, userLocationDetected, hasCenteredOnUser, map]);

  return null;
}

const TechMarker: React.FC<{ tech: Technician, onSelectTech: (t: Technician) => void }> = ({ tech, onSelectTech }) => {
  const map = useMap();
  
  return (
    <Marker
      position={[tech.location.lat, tech.location.lng]}
      icon={createTechIcon(tech.category, !!tech.isBusy)}
      eventHandlers={{
        click: (e) => {
          map.setView(e.latlng, 15);
        },
      }}
    >
      <Popup className="tech-popup">
        <div className="w-52 space-y-3 p-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-lg bg-zinc-100 border border-zinc-200">
              <img
                src={`https://picsum.photos/seed/${tech.id}/100/100`}
                alt={tech.name}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-black text-zinc-900 tracking-tight">{tech.name}</h4>
                {tech.verified && <ShieldCheck size={14} className="text-emerald-600" />}
              </div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{tech.category}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs border-t border-zinc-100 pt-2">
            <div className="flex items-center gap-1">
              <Star size={12} className="fill-amber-500 text-amber-500" />
              <span className="font-bold text-zinc-900">{tech.rating}</span>
            </div>
            <span className="font-black text-emerald-600">₹{tech.basePrice}</span>
          </div>

          <div className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
            tech.isBusy ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
          }`}>
            {tech.isBusy ? <AlertCircle size={12} /> : <Clock size={12} />}
            <span>{tech.isBusy ? 'Currently Busy' : 'Available Now'}</span>
          </div>

          <button
            onClick={() => onSelectTech(tech)}
            className="w-full rounded-xl bg-zinc-900 py-2.5 text-xs font-bold text-white transition-all hover:bg-zinc-800 active:scale-95 shadow-sm"
          >
            Book Now
          </button>
        </div>
      </Popup>
    </Marker>
  );
};

interface TechnicianMapProps {
  technicians: Technician[];
  userLocation: UserLocation | null;
  onSelectTech: (tech: Technician) => void;
}

export default function TechnicianMap({ technicians, userLocation, onSelectTech }: TechnicianMapProps) {
  const defaultCenter: [number, number] = [19.0760, 72.8777]; // Mumbai
  const center: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : defaultCenter;

  return (
    <div className="h-[600px] w-full overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50 shadow-sm">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>
              <div className="text-sm font-bold tracking-tight">Your Location</div>
            </Popup>
          </Marker>
        )}

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          showCoverageOnHover={false}
        >
          {technicians.map((tech) => (
            <TechMarker key={tech.id} tech={tech} onSelectTech={onSelectTech} />
          ))}
        </MarkerClusterGroup>

        <MapUpdater center={center} userLocationDetected={!!userLocation} />
      </MapContainer>
    </div>
  );
}
