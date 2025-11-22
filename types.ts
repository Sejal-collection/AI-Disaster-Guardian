export enum DisasterType {
  EARTHQUAKE = 'Earthquake',
  FLOOD = 'Flood',
  WILDFIRE = 'Wildfire',
  HURRICANE = 'Hurricane',
  TSUNAMI = 'Tsunami',
  VOLCANO = 'Volcano',
  STORM = 'Severe Storm',
  GENERAL = 'General Emergency'
}

export enum AgentStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  PLANNING = 'PLANNING',
  EXECUTING = 'EXECUTING',
  PAUSED = 'PAUSED',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  COMPLETED = 'COMPLETED'
}

export interface EmergencyContacts {
  police: string;
  fire: string;
  ambulance: string;
  disasterResponse: string;
}

export interface RiskProfile {
  location: string;
  riskScore: number; // 0-100
  dominantThreat: DisasterType;
  details: string;
  recentAlerts: string[];
  sources?: string[]; // URLs from Google Search Grounding
  emergencyContacts: EmergencyContacts;
  factors: {
    seismic: number;
    weather: number;
    terrain: number;
    urban: number;
  };
}

export interface RecoveryTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignedAgent: string; // e.g., "Logistics", "Medical"
  estimatedTime: string;
}

export interface GlobalEvent {
  id: string;
  title: string;
  type: DisasterType;
  coordinates: {
    lat: number;
    lng: number;
  };
  severity: number; // 0-100
  description: string;
}