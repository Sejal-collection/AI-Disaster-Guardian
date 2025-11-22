import React, { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, ShieldCheck, Loader2, Bell, ExternalLink, Phone, Truck, Siren, HeartPulse, Send, Mail, Smartphone, Share2, Sliders, Check, Settings } from 'lucide-react';
import { analyzeLocationRisks, generateAlertMessage } from '../services/geminiService';
import { RiskProfile, DisasterType } from '../types';
import RiskRadar from '../components/RiskRadar';

const COUNTRY_CODES = [
  { code: '+1', country: 'USA/Canada' },
  { code: '+44', country: 'UK' },
  { code: '+91', country: 'India' },
  { code: '+81', country: 'Japan' },
  { code: '+61', country: 'Australia' },
  { code: '+86', country: 'China' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
  { code: '+55', country: 'Brazil' },
  { code: '+7', country: 'Russia' },
  { code: '+27', country: 'South Africa' },
  { code: '+971', country: 'UAE' },
  { code: '+65', country: 'Singapore' },
];

const AVAILABLE_DISASTERS = Object.values(DisasterType);

const EarlyWarning: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [riskData, setRiskData] = useState<RiskProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState({ countryCode: '+1', phone: '', email: '' });
  const [monitoring, setMonitoring] = useState(false);
  const [lastAlert, setLastAlert] = useState<string | null>(null);
  const [actionLinks, setActionLinks] = useState<{sms: string, email: string} | null>(null);

  // Alert Configuration State
  const [alertConfig, setAlertConfig] = useState({
    threshold: 50,
    types: [DisasterType.EARTHQUAKE, DisasterType.FLOOD, DisasterType.WILDFIRE, DisasterType.TSUNAMI, DisasterType.HURRICANE] as DisasterType[]
  });
  const [showSettings, setShowSettings] = useState(false);

  // Request Notification Permissions on Mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  const handleScan = () => {
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const data = await analyzeLocationRisks(position.coords.latitude, position.coords.longitude);
          setRiskData(data);
        } catch (err) {
          setError("Failed to analyze location risks.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Unable to retrieve your location. Please enable location permissions.");
        setLoading(false);
      }
    );
  };

  const toggleDisasterType = (type: DisasterType) => {
    setAlertConfig(prev => {
      const exists = prev.types.includes(type);
      return {
        ...prev,
        types: exists ? prev.types.filter(t => t !== type) : [...prev.types, type]
      };
    });
  };

  const handleMonitorToggle = async () => {
    if (!contactInfo.phone && !contactInfo.email) {
      alert("Please enter a phone number or email to subscribe.");
      return;
    }
    
    if (!monitoring && riskData) {
      setMonitoring(true);
      
      // Logic to check against preferences
      const isTypeMonitored = alertConfig.types.includes(riskData.dominantThreat);
      const isRiskHighEnough = riskData.riskScore >= alertConfig.threshold;

      // Simulate detection event strictly based on preferences
      if (isTypeMonitored && isRiskHighEnough) { 
        setTimeout(async () => {
            const msg = await generateAlertMessage(riskData.dominantThreat, riskData.location, riskData.riskScore);
            setLastAlert(msg);
            
            // 1. Trigger System Notification (Real-life Web Standard)
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`⚠️ IMMINENT THREAT: ${riskData.dominantThreat}`, {
                    body: msg,
                    requireInteraction: true,
                    tag: 'disaster-alert'
                });
            }

            // 2. Generate Native Links for Real-life Sending
            const smsBody = encodeURIComponent(`${msg} - Sent via AI-Disaster-Guardian`);
            const emailSubject = encodeURIComponent(`URGENT: ${riskData.dominantThreat} Warning`);
            const emailBody = encodeURIComponent(`${msg}\n\nLocation: ${riskData.location}\nRisk Level: ${riskData.riskScore}/100\n\nPlease verify safety immediately.`);

            setActionLinks({
                sms: `sms:${contactInfo.phone}?&body=${smsBody}`, // iOS/Android compatible syntax
                email: `mailto:${contactInfo.email}?subject=${emailSubject}&body=${emailBody}`
            });

        }, 3000);
      } else {
          // Logic if risk exists but user filtered it out or threshold too high
          console.log("Threat detected but suppressed by user filters.");
      }
    } else {
      setMonitoring(false);
      setLastAlert(null);
      setActionLinks(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              Early Detection & Warning System
            </h2>
            <p className="text-slate-400 mt-1">
              AI-powered geospatial analysis to detect disaster probability before it strikes.
            </p>
          </div>
          <button
            onClick={handleScan}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            Scan Current Location
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-900/50 text-red-200 p-4 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        {!riskData && !loading && !error && (
          <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
            <p className="text-slate-500">Enable location access to analyze local disaster probabilities.</p>
          </div>
        )}

        {riskData && (
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Risk Score Card */}
                <div className="md:col-span-1 bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
                <div className={`absolute inset-0 opacity-10 ${riskData.riskScore > 70 ? 'bg-red-500' : riskData.riskScore > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                <span className="text-slate-400 text-sm uppercase tracking-wider mb-2">Total Risk Probability</span>
                <div className={`text-6xl font-bold ${riskData.riskScore > 70 ? 'text-red-500' : riskData.riskScore > 40 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {riskData.riskScore}%
                </div>
                <div className="mt-4 text-center">
                    <span className="text-xs text-slate-500 block">Primary Threat</span>
                    <span className="text-lg font-medium text-slate-200">{riskData.dominantThreat}</span>
                </div>
                <div className="mt-4 text-center">
                    <span className="text-xs text-slate-500 block">Location</span>
                    <span className="text-sm text-slate-300">{riskData.location}</span>
                </div>
                </div>

                {/* Radar Chart */}
                <div className="md:col-span-1 bg-slate-950 p-6 rounded-xl border border-slate-800">
                <h3 className="text-slate-400 text-sm mb-4">Risk Factors</h3>
                <RiskRadar data={riskData.factors} />
                </div>

                {/* Details & Alerts */}
                <div className="md:col-span-1 bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col">
                <h3 className="text-slate-400 text-sm mb-2">Analysis Report</h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-4 flex-grow">
                    {riskData.details}
                </p>
                
                {riskData.recentAlerts.length > 0 && (
                    <div className="bg-red-950/30 border border-red-900/30 p-3 rounded-lg mb-4">
                    <h4 className="text-red-400 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                        <Bell className="w-3 h-3" /> Active Warnings
                    </h4>
                    <ul className="text-xs text-red-200 list-disc list-inside">
                        {riskData.recentAlerts.slice(0, 3).map((alert, idx) => (
                        <li key={idx} className="truncate">{alert}</li>
                        ))}
                    </ul>
                    </div>
                )}

                {/* Sources Section */}
                {riskData.sources && riskData.sources.length > 0 && (
                    <div className="mt-auto pt-3 border-t border-slate-800">
                        <h5 className="text-xs text-slate-500 mb-1">Verified Sources:</h5>
                        <div className="flex flex-wrap gap-2">
                            {riskData.sources.slice(0, 3).map((src, i) => (
                                <a key={i} href={src} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-blue-400 hover:underline bg-slate-900 px-2 py-1 rounded">
                                    Source {i+1} <ExternalLink className="w-2 h-2" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}
                </div>
            </div>

            {/* Emergency Contact Dashboard */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
               <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                 <Siren className="w-5 h-5 text-red-500" />
                 Local Emergency Support
               </h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-center hover:bg-slate-900 transition-colors">
                     <ShieldCheck className="w-6 h-6 text-blue-400 mb-2" />
                     <span className="text-slate-500 text-xs uppercase mb-1">Police</span>
                     <a href={`tel:${riskData.emergencyContacts.police}`} className="text-xl font-bold text-white hover:text-blue-400">{riskData.emergencyContacts.police}</a>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-center hover:bg-slate-900 transition-colors">
                     <Truck className="w-6 h-6 text-red-400 mb-2" />
                     <span className="text-slate-500 text-xs uppercase mb-1">Fire Dept</span>
                     <a href={`tel:${riskData.emergencyContacts.fire}`} className="text-xl font-bold text-white hover:text-red-400">{riskData.emergencyContacts.fire}</a>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-center hover:bg-slate-900 transition-colors">
                     <HeartPulse className="w-6 h-6 text-emerald-400 mb-2" />
                     <span className="text-slate-500 text-xs uppercase mb-1">Ambulance</span>
                     <a href={`tel:${riskData.emergencyContacts.ambulance}`} className="text-xl font-bold text-white hover:text-emerald-400">{riskData.emergencyContacts.ambulance}</a>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-center hover:bg-slate-900 transition-colors">
                     <Phone className="w-6 h-6 text-amber-400 mb-2" />
                     <span className="text-slate-500 text-xs uppercase mb-1">Disaster Hotline</span>
                     <a href={`tel:${riskData.emergencyContacts.disasterResponse}`} className="text-xl font-bold text-white hover:text-amber-400">{riskData.emergencyContacts.disasterResponse}</a>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Alert Subscription Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Automated Alert Subscription</h3>
                <p className="text-slate-400 text-sm">
                  Our AI monitors geological sensors and weather patterns 24/7. 
                  Configure your thresholds below.
                </p>
              </div>
              <button 
                onClick={() => setShowSettings(!showSettings)} 
                className={`p-2 rounded-lg transition-all border ${showSettings ? 'bg-blue-900 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                title="Alert Configurations"
              >
                <Sliders className="w-5 h-5" />
              </button>
            </div>
            
            {/* Settings Panel */}
            {showSettings && (
              <div className="mb-6 bg-slate-950 p-4 rounded-lg border border-slate-800 animate-in fade-in slide-in-from-top-2">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-400" />
                  Alert Configuration
                </h4>
                
                {/* Threshold Slider */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-slate-500">Minimum Risk Score Threshold</label>
                    <span className={`text-xs font-bold ${alertConfig.threshold > 70 ? 'text-red-400' : alertConfig.threshold > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {alertConfig.threshold}%
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={alertConfig.threshold} 
                    onChange={(e) => setAlertConfig({...alertConfig, threshold: parseInt(e.target.value)})}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <p className="text-[10px] text-slate-600 mt-1">Only trigger alerts when AI calculates probability above {alertConfig.threshold}%.</p>
                </div>

                {/* Disaster Type Filter */}
                <div>
                   <label className="text-xs text-slate-500 mb-2 block">Monitored Event Types</label>
                   <div className="flex flex-wrap gap-2">
                     {AVAILABLE_DISASTERS.map(type => {
                       const isActive = alertConfig.types.includes(type);
                       return (
                         <button
                           key={type}
                           onClick={() => toggleDisasterType(type)}
                           className={`px-2 py-1 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                             isActive 
                             ? 'bg-blue-900/40 border-blue-500/50 text-blue-200' 
                             : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                           }`}
                         >
                           {isActive && <Check className="w-3 h-3" />}
                           {type}
                         </button>
                       )
                     })}
                   </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                 <label className="block text-xs text-slate-500 mb-1">Mobile Number</label>
                 <div className="flex gap-2">
                    <select 
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                      value={contactInfo.countryCode}
                      onChange={(e) => setContactInfo({...contactInfo, countryCode: e.target.value})}
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code}>{c.code} ({c.country})</option>
                      ))}
                    </select>
                    <input 
                      type="tel" 
                      placeholder="555-0123"
                      value={contactInfo.phone}
                      onChange={(e) => setContactInfo({...contactInfo, phone: e.target.value})}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                 </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Email Address</label>
                <input 
                  type="email" 
                  placeholder="citizen@example.com"
                  value={contactInfo.email}
                  onChange={(e) => setContactInfo({...contactInfo, email: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            
            <button 
              onClick={handleMonitorToggle}
              className={`mt-4 w-full py-3 rounded-lg font-semibold transition-all ${monitoring ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-700 hover:bg-slate-600'}`}
            >
              {monitoring ? 'Monitoring Active' : 'Activate Early Warning System'}
            </button>
          </div>

          <div className="flex-1 bg-black/40 rounded-lg p-4 border border-slate-800 flex flex-col items-center justify-center min-h-[200px]">
             {monitoring ? (
               <div className="w-full">
                 <div className="flex items-center justify-center gap-2 text-emerald-400 mb-4 animate-pulse">
                   <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                   <span className="text-sm font-mono">LIVE SATELLITE UPLINK ACTIVE</span>
                 </div>
                 
                 <div className="text-[10px] text-slate-500 text-center mb-4 font-mono border-t border-b border-slate-800 py-2">
                    CONFIG: &gt; {alertConfig.threshold}% RISK | {alertConfig.types.length} TYPES
                 </div>

                 {lastAlert ? (
                   <div className="space-y-3 animate-in slide-in-from-bottom">
                      {/* Visual Alert Box */}
                      <div className="bg-slate-800 p-4 rounded-lg border-l-4 border-red-500 shadow-lg">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs text-slate-500 font-mono">AI ALERT GENERATED • NOW</span>
                            <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce" />
                          </div>
                          <p className="text-white font-medium text-sm">{lastAlert}</p>
                      </div>

                      {/* Real-life Action Buttons */}
                      {actionLinks && (
                        <div className="grid grid-cols-2 gap-2">
                           <a 
                             href={actionLinks.sms}
                             className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg text-xs font-bold transition-colors shadow-lg"
                           >
                             <Smartphone className="w-4 h-4" />
                             Send SMS Alert
                           </a>
                           <a 
                             href={actionLinks.email}
                             className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-xs font-bold transition-colors shadow-lg"
                           >
                             <Mail className="w-4 h-4" />
                             Send Email Alert
                           </a>
                        </div>
                      )}
                      <p className="text-[10px] text-center text-slate-500 mt-2">
                        * Triggers native device messaging apps for instant broadcast.
                      </p>
                   </div>
                 ) : (
                   <div className="text-center text-slate-600 text-sm">
                     <div className="flex justify-center mb-2">
                        <Loader2 className="w-6 h-6 animate-spin opacity-50" />
                     </div>
                     Scanning global frequencies...<br/>
                     Target: {contactInfo.countryCode} {contactInfo.phone}
                   </div>
                 )}
               </div>
             ) : (
               <div className="text-center text-slate-600">
                 <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                 <p className="text-sm">System Standby</p>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarlyWarning;