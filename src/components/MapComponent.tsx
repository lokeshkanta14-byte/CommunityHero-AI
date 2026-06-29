import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Compass, Search } from 'lucide-react';

interface MapComponentProps {
  latitude: number;
  longitude: number;
  address: string;
  onChangeLocation?: (lat: number, lng: number, address: string) => void;
  readOnly?: boolean;
}

export default function MapComponent({
  latitude,
  longitude,
  address,
  onChangeLocation,
  readOnly = false,
}: MapComponentProps) {
  const [detecting, setDetecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generate bounding box for embeddable OpenStreetMap iframe
  const bboxSize = 0.003;
  const left = longitude - bboxSize;
  const bottom = latitude - bboxSize / 2;
  const right = longitude + bboxSize;
  const top = latitude + bboxSize / 2;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latitude}%2C${longitude}`;

  // Reverse geocode lat/lng to human address
  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }
    } catch (e) {
      console.warn("Reverse geocoding failed, using generic coordinates label.", e);
    }
    return `Location coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  };

  // Detect current browser location
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser");
      return;
    }

    setDetecting(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        const resolvedAddress = await fetchAddress(lat, lng);
        if (onChangeLocation) {
          onChangeLocation(lat, lng, resolvedAddress);
        }
        setDetecting(false);
      },
      (error) => {
        console.error("Geolocation error", error);
        let msg = "Could not access location. Please enter location manually.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location permission denied. Please allow location access in your browser settings.";
        }
        setErrorMsg(msg);
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Geocode text query search
  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !onChangeLocation) return;

    setSearching(true);
    setErrorMsg(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          searchQuery
        )}&format=json&limit=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          const resolvedAddress = data[0].display_name || searchQuery;
          onChangeLocation(lat, lng, resolvedAddress);
        } else {
          setErrorMsg("No results found for that location search query.");
        }
      } else {
        setErrorMsg("Location service is temporarily unavailable.");
      }
    } catch (error) {
      console.error("Geocoding failed", error);
      setErrorMsg("Failed to connect to location search service.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-inner" id="map-container-component">
      <div className="flex flex-col gap-3">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-800">Geospatial Location</span>
              <p className="text-xs text-slate-500">Auto-detects coordinates of the incident site</p>
            </div>
          </div>

          {!readOnly && (
            <button
              id="btn-auto-detect-location"
              type="button"
              onClick={handleDetectLocation}
              disabled={detecting}
              className="flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-emerald-400 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Navigation className={`w-3.5 h-3.5 ${detecting ? 'animate-spin' : ''}`} />
              <span>{detecting ? 'Detecting GPS...' : 'Auto Detect GPS'}</span>
            </button>
          )}
        </div>

        {/* Search Field (Only in edit mode) */}
        {!readOnly && onChangeLocation && (
          <form onSubmit={handleSearchLocation} className="flex gap-2" id="form-search-location">
            <div className="relative flex-1">
              <input
                id="input-location-search"
                type="text"
                placeholder="Search city, neighborhood, or landmark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <button
              id="btn-search-location"
              type="submit"
              disabled={searching}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center min-w-[70px]"
            >
              {searching ? 'Searching...' : 'Locate'}
            </button>
          </form>
        )}

        {/* Display Latitude & Longitude */}
        <div className="grid grid-cols-2 gap-3 bg-white p-3 border border-slate-100 rounded-xl shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">Latitude</span>
            <span className="font-mono text-xs text-slate-700 font-semibold">{latitude.toFixed(6)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">Longitude</span>
            <span className="font-mono text-xs text-slate-700 font-semibold">{longitude.toFixed(6)}</span>
          </div>
        </div>

        {/* Address Banner */}
        <div className="bg-slate-100 border border-slate-200/60 p-3 rounded-xl flex items-start space-x-2">
          <Compass className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 font-medium break-words w-full">
            <span className="font-semibold text-slate-500 block text-[10px] uppercase tracking-wider mb-0.5">Resolved Civic Address</span>
            {address || 'Awaiting location placement...'}
          </div>
        </div>

        {/* OSM Map Preview Iframe */}
        <div className="w-full h-48 bg-slate-200 rounded-xl overflow-hidden shadow-inner border border-slate-200 relative">
          <iframe
            id="osm-embed-iframe"
            title="OpenStreetMap Civic Location Tracker"
            width="100%"
            height="100%"
            frameBorder="0"
            marginHeight={0}
            marginWidth={0}
            src={mapUrl}
            className="filter saturate-[0.85] contrast-[1.05]"
          />
          {/* Accent Map Overlay */}
          <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-slate-500 border border-slate-200 select-none">
            © OpenStreetMap contributors
          </div>
        </div>

        {errorMsg && (
          <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-xl font-medium">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
