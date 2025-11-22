import React, { useEffect, useState, useRef } from 'react';
import { Globe, RefreshCw, Info, ZoomIn, ZoomOut, Filter, Layers, Share2, Crosshair, Wind, Flame, Waves, Activity, AlertTriangle } from 'lucide-react';
import { GlobalEvent, DisasterType } from '../types';
import { fetchGlobalDisasterHotspots } from '../services/geminiService';

const GlobalMonitor: React.FC = () => {
  const [events, setEvents] = useState<GlobalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBackgroundUpdating, setIsBackgroundUpdating] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GlobalEvent | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Interactive Map State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeFilter, setActiveFilter] = useState<DisasterType | 'ALL'>('ALL');
  
  const mapRef = useRef<HTMLDivElement>(null);

  const refreshData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setIsBackgroundUpdating(true);
    }

    try {
      const data = await fetchGlobalDisasterHotspots();
      setEvents(data);
    } catch (error) {
      console.error("Failed to fetch global events", error);
    } finally {
      if (!silent) {
        setLoading(false);
      } else {
        setIsBackgroundUpdating(false);
      }
    }
  };

  useEffect(() => {
    // Initial Fetch
    refreshData();

    // Setup Live Data Stream (Poll every 30 seconds)
    const intervalId = setInterval(() => {
      refreshData(true);
    }, 30000);
    
    let watchId: number;

    // Use watchPosition for live location updates instead of just one-time get
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => {
          console.error("Geolocation error:", err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }

    // Cleanup watch and interval on unmount
    return () => {
      clearInterval(intervalId);
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // --- Map Interaction Handlers ---
  const handleWheel = (e: React.WheelEvent) => {
    const delta = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(1, scale + delta), 8);
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setScale(s => Math.min(s * 1.5, 8));
  const handleZoomOut = () => setScale(s => Math.max(s / 1.5, 1));
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // --- Equirectangular Projection Logic ---
  const getCoordinates = (lat: number, lng: number) => {
    let normalizedLng = lng;
    // Normalize longitude to -180 to 180
    while (normalizedLng > 180) normalizedLng -= 360;
    while (normalizedLng < -180) normalizedLng += 360;

    // Map dimensions are 800x400
    const x = ((normalizedLng + 180) / 360) * 800;
    const y = ((90 - lat) / 180) * 400;
    return { x, y };
  };

  const getDisasterColor = (type: DisasterType) => {
    switch (type) {
      case DisasterType.EARTHQUAKE: return '#dc2626'; // Red
      case DisasterType.FLOOD: return '#2563eb'; // Blue
      case DisasterType.WILDFIRE: return '#ea580c'; // Orange
      case DisasterType.HURRICANE: return '#7c3aed'; // Purple
      case DisasterType.VOLCANO: return '#9f1239'; // Dark Red
      case DisasterType.TSUNAMI: return '#0891b2'; // Cyan
      default: return '#ca8a04'; // Yellow
    }
  };

  const getDisasterIcon = (type: DisasterType) => {
    switch (type) {
      case DisasterType.EARTHQUAKE: return <Activity className="w-3 h-3" />;
      case DisasterType.FLOOD: return <Waves className="w-3 h-3" />;
      case DisasterType.WILDFIRE: return <Flame className="w-3 h-3" />;
      case DisasterType.HURRICANE: return <Wind className="w-3 h-3" />;
      default: return <AlertTriangle className="w-3 h-3" />;
    }
  }

  const filteredEvents = activeFilter === 'ALL' 
    ? events 
    : events.filter(e => e.type === activeFilter);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
      
      {/* Map Panel */}
      <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl relative flex flex-col overflow-hidden group shadow-2xl h-[600px]">
        
        {/* Map Header / Controls */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
          <div className="bg-white/90 backdrop-blur border border-slate-200 p-2 rounded-lg shadow-lg pointer-events-auto">
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Real-Time Global Monitor
            </h2>
            <div className="flex items-center gap-2 mt-2">
               <div className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-100 px-2 py-1 rounded border border-emerald-200 font-bold transition-all">
                 <div className={`w-2 h-2 rounded-full bg-emerald-500 ${isBackgroundUpdating ? 'animate-ping' : 'animate-pulse'}`}></div>
                 {isBackgroundUpdating ? 'UPDATING STREAM...' : 'SATELLITE LIVE'}
               </div>
               <button 
                  onClick={() => refreshData(false)}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                  title="Force Refresh Data"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/90 backdrop-blur border border-slate-200 p-2 rounded-lg shadow-lg flex flex-col gap-1 pointer-events-auto">
            <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filters
            </span>
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              <button 
                onClick={() => setActiveFilter('ALL')}
                className={`text-[10px] px-2 py-1 rounded border font-bold ${activeFilter === 'ALL' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
              >
                ALL
              </button>
              {Object.values(DisasterType).map(type => (
                <button 
                  key={type}
                  onClick={() => setActiveFilter(type)}
                  className={`text-[10px] px-2 py-1 rounded border font-bold ${activeFilter === type ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
                >
                  {type.slice(0,4)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
           <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-lg shadow-lg overflow-hidden flex flex-col">
             <button onClick={handleZoomIn} className="p-3 hover:bg-slate-100 text-slate-600 border-b border-slate-200"><ZoomIn className="w-5 h-5" /></button>
             <button onClick={handleZoomOut} className="p-3 hover:bg-slate-100 text-slate-600 border-b border-slate-200"><ZoomOut className="w-5 h-5" /></button>
             <button onClick={resetView} className="p-3 hover:bg-slate-100 text-slate-600" title="Reset View"><Crosshair className="w-5 h-5" /></button>
           </div>
        </div>

        {/* Map Viewport */}
        <div 
          ref={mapRef}
          className="flex-grow relative bg-[#bae6fd] overflow-hidden cursor-move" // Day Mode Ocean Blue
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
           <div 
             style={{ 
               transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
               transformOrigin: 'center',
               transition: isDragging ? 'none' : 'transform 0.3s ease-out',
               width: '100%',
               height: '100%'
             }}
             className="w-full h-full flex items-center justify-center"
           >
             <svg viewBox="0 0 800 400" className="w-full h-full object-cover pointer-events-none select-none">
               
               {/* Grid Lines (Graticule) */}
               <g stroke="rgba(0, 0, 0, 0.1)" strokeWidth="0.5" fill="none">
                 {/* Longitude Lines */}
                 {[100, 200, 300, 400, 500, 600, 700].map(x => <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="400" />)}
                 {/* Latitude Lines */}
                 {[50, 100, 150, 200, 250, 300, 350].map(y => <line key={`h-${y}`} x1="0" y1={y} x2="800" y2={y} />)}
                 
                 {/* Equator & Prime Meridian (Stronger) */}
                 <line x1="0" y1="200" x2="800" y2="200" stroke="rgba(0, 0, 0, 0.3)" strokeWidth="1" />
                 <line x1="400" y1="0" x2="400" y2="400" stroke="rgba(0, 0, 0, 0.3)" strokeWidth="1" />
               </g>

               {/* Continents - Cream/Yellow Style */}
               <g fill="#fef9c3" stroke="#64748b" strokeWidth="0.5">
                  {/* North America */}
                  <path d="M 130 40 L 250 30 L 350 50 L 330 90 L 280 120 L 260 160 L 220 180 L 200 160 L 150 140 L 80 120 L 60 80 Z" />
                  <path d="M 60 60 L 120 40 L 200 30 L 280 30 L 260 60 L 220 80 L 180 120 L 120 100 Z" /> {/* Canada top */}
                  
                  {/* South America */}
                  <path d="M 220 180 L 300 200 L 320 240 L 300 300 L 260 360 L 240 350 L 220 300 L 220 180 Z" />
                  
                  {/* Europe */}
                  <path d="M 380 80 L 450 60 L 500 70 L 480 120 L 440 130 L 400 120 L 380 100 Z" />
                  
                  {/* Africa */}
                  <path d="M 380 140 L 440 130 L 480 140 L 520 160 L 500 280 L 460 320 L 420 280 L 400 220 L 360 160 Z" />
                  
                  {/* Asia */}
                  <path d="M 480 70 L 600 60 L 700 80 L 720 140 L 680 200 L 620 240 L 560 200 L 540 160 L 500 120 Z" />
                  <path d="M 600 180 L 640 200 L 660 220 L 620 240 Z" /> {/* SE Asia */}
                  
                  {/* Australia */}
                  <path d="M 620 280 L 700 280 L 720 320 L 660 350 L 620 320 Z" />
                  
                  {/* Greenland */}
                  <path d="M 280 20 L 340 20 L 350 50 L 300 70 Z" fill="#ffffff" /> 
                  
                  {/* Antarctica */}
                  <path d="M 50 380 L 750 380 L 780 400 L 20 400 Z" fill="#ffffff" />
               </g>

               {/* Labels (Static) - Dark text for light map */}
               <g fill="rgba(0,0,0,0.6)" fontSize="10" fontWeight="bold" style={{ pointerEvents: 'none' }}>
                  <text x="220" y="100">NORTH AMERICA</text>
                  <text x="250" y="260">SOUTH AMERICA</text>
                  <text x="450" y="220">AFRICA</text>
                  <text x="430" y="90">EUROPE</text>
                  <text x="600" y="120">ASIA</text>
                  <text x="640" y="310">AUSTRALIA</text>
                  <text x="10" y="205" fontSize="8" fill="rgba(0,0,0,0.4)">EQUATOR</text>
                  <text x="405" y="395" fontSize="8" fill="rgba(0,0,0,0.4)">PRIME MERIDIAN</text>
               </g>

               {/* --- Markers --- */}

               {/* User Location (Green Point) */}
               {userLocation && (
                 <g>
                    {(() => {
                      const { x, y } = getCoordinates(userLocation.lat, userLocation.lng);
                      return (
                        <g className="pointer-events-auto cursor-help" onClick={() => alert("You are here")}>
                          {/* Pulse Effect */}
                          <circle cx={x} cy={y} r={20 / scale} fill="#16a34a" fillOpacity="0.3">
                            <animate attributeName="r" values={`${10/scale};${30/scale};${10/scale}`} dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                          </circle>
                          {/* Core Point */}
                          <circle cx={x} cy={y} r={6 / scale} fill="#16a34a" stroke="#fff" strokeWidth={2 / scale} />
                          {/* Label with white halo for readability */}
                          <text x={x} y={y - (15/scale)} textAnchor="middle" fill="#14532d" fontSize={12/scale} fontWeight="900" stroke="white" strokeWidth={0.5/scale} style={{ paintOrder: 'stroke' }}>YOU</text>
                        </g>
                      );
                    })()}
                 </g>
               )}

               {/* Events (Red/Color Points) */}
               {filteredEvents.map((event) => {
                  const { x, y } = getCoordinates(event.coordinates.lat, event.coordinates.lng);
                  const isSelected = selectedEvent?.id === event.id;
                  return (
                    <g 
                      key={event.id} 
                      className="pointer-events-auto cursor-pointer" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                    >
                      {/* Impact Zone (Ripple) */}
                      <circle cx={x} cy={y} r={(event.severity * 0.8) / scale} fill={getDisasterColor(event.type)} fillOpacity="0.2" stroke={getDisasterColor(event.type)} strokeWidth={0.5 / scale} strokeOpacity="0.5">
                         {isSelected && <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />}
                      </circle>
                      
                      {/* Core Dot */}
                      <circle cx={x} cy={y} r={5 / scale} fill={getDisasterColor(event.type)} stroke="#fff" strokeWidth={1.5 / scale} />
                      
                      {/* Label on hover/select */}
                      {isSelected && (
                         <g>
                            <line x1={x} y1={y} x2={x + 20/scale} y2={y - 20/scale} stroke="#334155" strokeWidth={1/scale} />
                            <rect x={x + 20/scale} y={y - 45/scale} width={120/scale} height={30/scale} fill="white" stroke="#cbd5e1" strokeWidth={0.5/scale} rx={4/scale} />
                            <text x={x + 25/scale} y={y - 28/scale} fill="#1e293b" fontSize={10/scale} fontWeight="bold">{event.title}</text>
                         </g>
                      )}
                    </g>
                  );
               })}
             </svg>
           </div>
        </div>
      </div>

      {/* Right Panel: Incident Feed */}
      <div className="lg:col-span-1 flex flex-col gap-4">
         
         {/* Selected Event Details (Top) */}
         <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 transition-all duration-300 ${selectedEvent ? 'block' : 'hidden lg:block'} h-[350px] flex flex-col`}>
            {selectedEvent ? (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-3">
                   <h3 className="font-bold text-white text-lg leading-tight">{selectedEvent.title}</h3>
                   <button onClick={() => setSelectedEvent(null)} className="text-slate-500 hover:text-white lg:hidden">✕</button>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                   <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      selectedEvent.type === DisasterType.EARTHQUAKE ? 'bg-red-950 text-red-400 border border-red-900' :
                      'bg-blue-950 text-blue-400 border border-blue-900'
                   }`}>
                     {selectedEvent.type}
                   </span>
                   <span className="text-xs text-slate-400 font-mono">
                     SEVERITY: <span className="text-white font-bold">{selectedEvent.severity}</span>/100
                   </span>
                </div>

                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-sm text-slate-300 mb-4 leading-relaxed overflow-y-auto custom-scrollbar flex-grow">
                  {selectedEvent.description}
                </div>

                <div className="space-y-2 mt-auto">
                   <div className="flex justify-between text-xs border-b border-slate-800 pb-2">
                     <span className="text-slate-500">Coordinates</span>
                     <span className="font-mono text-slate-300">{selectedEvent.coordinates.lat.toFixed(2)}, {selectedEvent.coordinates.lng.toFixed(2)}</span>
                   </div>
                   
                   <button className="w-full mt-3 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-900/20">
                     <Layers className="w-4 h-4" />
                     Initiate Relief Protocol
                   </button>
                   <button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                     <Share2 className="w-4 h-4" />
                     Share Situation Report
                   </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-600 opacity-50">
                 <Globe className="w-12 h-12 mb-3" />
                 <p className="text-sm font-medium">Select a red zone on the map<br/>to view tactical intelligence.</p>
              </div>
            )}
         </div>

         {/* Live Feed List (Bottom) */}
         <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-[250px] flex flex-col">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
              <Activity className="w-3 h-3" /> Incoming Signals ({filteredEvents.length})
            </h3>
            <div className="overflow-y-auto space-y-2 custom-scrollbar flex-grow">
              {loading && !isBackgroundUpdating ? (
                 <div className="flex justify-center py-4"><RefreshCw className="w-5 h-5 animate-spin text-slate-600" /></div>
              ) : (
                filteredEvents.map(event => (
                  <div 
                    key={event.id}
                    onClick={() => {
                      setSelectedEvent(event);
                      const { x, y } = getCoordinates(event.coordinates.lat, event.coordinates.lng);
                      setPosition({ x: -x + 400, y: -y + 200 }); // Center map on click
                      setScale(2);
                    }}
                    className={`p-2 rounded border cursor-pointer transition-all flex items-center justify-between ${selectedEvent?.id === event.id ? 'bg-slate-800 border-blue-500/50' : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'}`}
                  >
                     <div className="flex items-center gap-2">
                        <div className={`p-1 rounded bg-opacity-20 ${
                           event.type === DisasterType.EARTHQUAKE ? 'bg-red-500 text-red-400' : 
                           event.type === DisasterType.FLOOD ? 'bg-blue-500 text-blue-400' : 'bg-slate-500 text-slate-300'
                        }`}>
                           {getDisasterIcon(event.type)}
                        </div>
                        <span className="text-xs font-medium text-slate-300 truncate max-w-[120px]">{event.title}</span>
                     </div>
                     <span className={`text-[10px] font-bold ${event.severity > 70 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {event.severity}%
                     </span>
                  </div>
                ))
              )}
            </div>
         </div>

      </div>
    </div>
  );
};

export default GlobalMonitor;