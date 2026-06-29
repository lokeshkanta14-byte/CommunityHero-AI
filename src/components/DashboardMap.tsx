import React, { useEffect, useRef, useState } from 'react';
import { CivicIssue } from '../types';
import { Maximize2, Minimize2, MapPin, Layers, Info } from 'lucide-react';

interface DashboardMapProps {
  issues: CivicIssue[];
  onSelectIssue: (issue: CivicIssue) => void;
  selectedIssue?: CivicIssue | null;
}

export default function DashboardMap({
  issues,
  onSelectIssue,
  selectedIssue = null
}: DashboardMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [markerLayer, setMarkerLayer] = useState<any>(null);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);

  // Dynamic style injection for map markers & pulsing animations
  useEffect(() => {
    const styleId = 'leaflet-custom-marker-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .custom-map-marker {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 26px;
          height: 26px;
        }
        .marker-pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          animation: marker-ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
          opacity: 0.6;
        }
        .marker-center {
          position: relative;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          transition: transform 0.2s ease;
          z-index: 10;
        }
        .custom-map-marker:hover .marker-center {
          transform: scale(1.3);
        }
        @keyframes marker-ping {
          0% {
            transform: scale(0.6);
            opacity: 0.9;
          }
          100% {
            transform: scale(2.6);
            opacity: 0;
          }
        }
        /* Style customized Leaflet popups */
        .leaflet-popup-content-wrapper {
          border-radius: 16px;
          padding: 4px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(15, 23, 42, 0.05);
        }
        .leaflet-popup-content {
          margin: 12px;
          font-family: inherit;
        }
        .leaflet-popup-tip-container {
          display: block;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Load Leaflet resources dynamically from official CDN
  useEffect(() => {
    let isMounted = true;

    const loadLeaflet = (): Promise<any> => {
      return new Promise((resolve, reject) => {
        if ((window as any).L) {
          resolve((window as any).L);
          return;
        }

        // Add Leaflet CSS
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        // Add Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => {
          resolve((window as any).L);
        };
        script.onerror = (err) => {
          reject(err);
        };
        document.body.appendChild(script);
      });
    };

    loadLeaflet()
      .then((L) => {
        if (isMounted) {
          setLeafletLoaded(true);
        }
      })
      .catch((err) => {
        console.error("Failed to load Leaflet from CDN:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || map) return;

    const L = (window as any).L;
    
    // Default starting point (e.g., India or average center of coordinates)
    const initialLat = 17.3850;
    const initialLng = 78.4867;
    const initialZoom = 11;

    // Create Leaflet Map Instance
    const mapInstance = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false, // Move zoom controls to bottom-right or top-right custom
      attributionControl: false
    });

    // Elegant CartoDB Positron (light gray muted map style that matches dashboard aesthetics perfectly)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(mapInstance);

    // Add scale indicator to map
    L.control.scale({ position: 'bottomleft' }).addTo(mapInstance);

    // Add custom zoom control in more elegant top-right position
    L.control.zoom({ position: 'topright' }).addTo(mapInstance);

    // Layer group to manage markers dynamically
    const layerGroup = L.layerGroup().addTo(mapInstance);
    setMarkerLayer(layerGroup);

    setMap(mapInstance);

    return () => {
      mapInstance.remove();
    };
  }, [leafletLoaded]);

  // Adjust Leaflet map sizing on resize
  useEffect(() => {
    if (!map) return;
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });

    if (mapContainerRef.current) {
      observer.observe(mapContainerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [map]);

  // Handle updates of markers based on issues array
  useEffect(() => {
    if (!map || !markerLayer || !leafletLoaded) return;

    const L = (window as any).L;

    // Clear existing markers
    markerLayer.clearLayers();

    if (issues.length === 0) return;

    const bounds: any[] = [];

    issues.forEach((issue) => {
      const { latitude, longitude, title, priority, status, address, id, category, imageUrl } = issue;

      // Skip invalid coordinates
      if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
        return;
      }

      bounds.push([latitude, longitude]);

      // Determine colors and labels based on AI-analyzed severity (priority)
      let color = '#10b981'; // Default Maintenance (Green)
      let severityLabel = 'Maintenance';
      let severityBadgeClass = 'bg-emerald-600 border-emerald-600 text-white';

      if (priority === 'critical') {
        color = '#ef4444'; // Red: Critical
        severityLabel = 'Critical';
        severityBadgeClass = 'bg-rose-600 border-rose-600 text-white animate-pulse';
      } else if (priority === 'high' || priority === 'medium') {
        color = '#eab308'; // Yellow: Warning
        severityLabel = 'Warning';
        severityBadgeClass = 'bg-amber-500 border-amber-500 text-white';
      } else {
        color = '#10b981'; // Green: Maintenance
        severityLabel = 'Maintenance';
        severityBadgeClass = 'bg-emerald-600 border-emerald-600 text-white';
      }

      // Create a gorgeous custom pulsing HTML element marker
      const customIcon = L.divIcon({
        className: 'custom-leaflet-icon',
        html: `
          <div class="custom-map-marker" id="marker-elm-${id}">
            <div class="marker-pulse" style="background-color: ${color}"></div>
            <div class="marker-center" style="background-color: ${color}"></div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      // Construct a premium HTML popup block with custom elements
      const popupHtml = `
        <div class="flex flex-col gap-2.5 max-w-[240px]" style="font-family: inherit;">
          ${imageUrl ? `
            <div class="w-full h-24 rounded-lg overflow-hidden relative shadow-sm">
              <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover" />
              <div class="absolute top-1 left-1 bg-slate-900/80 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                ${category}
              </div>
            </div>
          ` : ''}
          <div class="flex flex-col">
            <div class="flex items-center gap-1.5 mb-2 flex-wrap">
              <span class="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200/50 bg-slate-50 text-slate-600">
                ${category}
              </span>
              <span class="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border text-white ${status === 'resolved' ? 'bg-emerald-700' : 'bg-slate-700'}">
                ${status.replace('_', ' ')}
              </span>
            </div>
            
            {/* AI-Analyzed Severity Badge System */}
            <div class="mb-2 flex items-center gap-1">
              <span class="text-[8px] uppercase tracking-widest font-extrabold text-slate-400">AI SEVERITY:</span>
              <span class="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${severityBadgeClass}">
                ${severityLabel}
              </span>
            </div>

            <h4 class="font-bold text-xs text-slate-800 line-clamp-2 leading-snug">
              ${title}
            </h4>
            <div class="flex items-center gap-1 text-[10px] text-slate-400 mt-1.5">
              <span class="shrink-0">📍</span>
              <span class="truncate max-w-[190px] font-medium" title="${address}">${address}</span>
            </div>
          </div>
          <button
            type="button"
            data-issue-id="${id}"
            class="view-issue-details-btn mt-1 w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <span>View Full Details</span>
            <span>➔</span>
          </button>
        </div>
      `;

      // Create and attach marker
      const marker = L.marker([latitude, longitude], { icon: customIcon })
        .bindPopup(popupHtml, {
          closeButton: false,
          minWidth: 200,
          maxWidth: 240,
          offset: L.point(0, -5)
        })
        .addTo(markerLayer);

      // Handle click events on marker
      marker.on('click', () => {
        setActiveMarkerId(id);
      });
    });

    // Auto fit map bounds if we have valid geo-tags
    if (bounds.length > 0 && map) {
      try {
        map.fitBounds(bounds, {
          padding: [40, 40],
          maxZoom: 15,
          animate: true,
          duration: 1.2
        });
      } catch (err) {
        console.warn("Could not fit map bounds:", err);
      }
    }
  }, [issues, map, markerLayer, leafletLoaded]);

  // Setup click delegator on map container for the 'View Full Details' popup action
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const handlePopupClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Navigate to find button with view-issue-details-btn class
      const btn = target.closest('.view-issue-details-btn');
      if (btn) {
        const issueId = btn.getAttribute('data-issue-id');
        if (issueId) {
          const selectedIssueObject = issues.find(issue => issue.id === issueId);
          if (selectedIssueObject) {
            onSelectIssue(selectedIssueObject);
          }
        }
      }
    };

    const container = mapContainerRef.current;
    container.addEventListener('click', handlePopupClick);

    return () => {
      container.removeEventListener('click', handlePopupClick);
    };
  }, [issues, onSelectIssue, leafletLoaded]);

  // Center Map on a selectedIssue if triggered externally (e.g. from table selection)
  useEffect(() => {
    if (!map || !selectedIssue || !leafletLoaded) return;

    const { latitude, longitude } = selectedIssue;
    if (typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude)) {
      map.setView([latitude, longitude], 16, {
        animate: true,
        duration: 1.5
      });
    }
  }, [selectedIssue, map, leafletLoaded]);

  return (
    <div 
      className={`relative rounded-3xl overflow-hidden border border-slate-100 bg-white transition-all duration-300 shadow-md ${
        isFullscreen 
          ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' 
          : 'w-full h-[400px]'
      }`}
      id="dashboard-leaflet-map-wrapper"
    >
      {/* Map Loader / Fallback overlay */}
      {!leafletLoaded && (
        <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center z-20">
          <span className="w-8 h-8 border-3 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading Geospatial Leaflet Map...</p>
        </div>
      )}

      {/* Map Control Toolbar overlay */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/50 shadow-lg flex items-center gap-2 pointer-events-auto">
          <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">Civic Incident Visualizer</span>
            <span className="text-[10px] font-medium text-slate-500 block leading-tight">
              {issues.length} active issues plotted on map
            </span>
          </div>
        </div>
      </div>

      {/* Map Action Toolbar top-right */}
      <div className="absolute top-4 right-14 z-10 flex items-center gap-2">
        <button
          id="btn-map-toggle-fullscreen"
          onClick={() => setIsFullscreen(prev => !prev)}
          className="bg-white/90 hover:bg-white backdrop-blur-md p-2.5 rounded-2xl border border-slate-200/50 shadow-lg transition-all hover:scale-105 active:scale-95 text-slate-700 flex items-center justify-center cursor-pointer"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Actual Map Target Div */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing" 
        id="dashboard-leaflet-map"
      />

      {/* Map Legend Overlay bottom-right */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md px-3 py-2.5 rounded-2xl border border-slate-200/50 shadow-lg flex flex-col gap-1.5 pointer-events-auto text-[10px] font-bold text-slate-600">
          <div className="flex items-center gap-1.5 pb-1 mb-1 border-b border-slate-100">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-700 font-extrabold uppercase tracking-wider text-[9px]">AI Severity Legend</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-200 animate-pulse" />
            <span className="text-rose-600">Red: Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-200" />
            <span className="text-amber-600">Yellow: Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
            <span className="text-emerald-600">Green: Maintenance</span>
          </div>
        </div>
      </div>
    </div>
  );
}
