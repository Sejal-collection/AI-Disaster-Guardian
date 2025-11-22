import { GoogleGenAI, Type } from "@google/genai";
import { DisasterType, RiskProfile, RecoveryTask, GlobalEvent } from "../types";

// Initialize the API client
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const cleanJsonText = (text: string): string => {
  // Remove markdown code blocks and any text before/after the JSON object
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

/**
 * Analyzes the current location for disaster risks using Google Search Grounding.
 * NOTE: When using googleSearch, we cannot use responseSchema or responseMimeType.
 */
export const analyzeLocationRisks = async (lat: number, lng: number): Promise<RiskProfile> => {
  const modelId = "gemini-2.5-flash";
  
  const prompt = `
    Analyze the current disaster risks for the geolocation: Latitude ${lat}, Longitude ${lng}.
    
    Tasks:
    1. Identify the specific City, Region, and Country.
    2. Assess risks for Earthquake, Flood, Wildfire, Hurricane, Tsunami using Google Search for REAL-TIME active weather warnings and seismic reports.
    3. Find the specific LOCAL emergency contact numbers for this location (Police, Fire, Ambulance, Disaster Hotline).
    4. Provide a risk score (0-100) where 100 is imminent danger.
    
    CRITICAL: Return the result as a valid JSON object with this exact structure (no markdown):
    {
      "location": "City, Region, Country",
      "riskScore": number,
      "dominantThreat": "Earthquake" | "Flood" | "Wildfire" | "Hurricane" | "Tsunami" | "General Emergency",
      "details": "Summary string",
      "recentAlerts": ["string"],
      "emergencyContacts": {
        "police": "string",
        "fire": "string",
        "ambulance": "string",
        "disasterResponse": "string"
      },
      "factors": {
        "seismic": number,
        "weather": number,
        "terrain": number,
        "urban": number
      }
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Using Search Grounding
      }
    });

    // 1. Extract Text and parse JSON manually since we can't use responseSchema with search
    let jsonString = cleanJsonText(response.text || "{}");
    const startIdx = jsonString.indexOf('{');
    const endIdx = jsonString.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) {
      jsonString = jsonString.substring(startIdx, endIdx + 1);
    }
    
    let result;
    try {
      result = JSON.parse(jsonString);
    } catch (e) {
      console.error("JSON Parsing error", e);
      throw new Error("Failed to parse AI response");
    }

    // 2. Extract Grounding Sources
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources: string[] = groundingChunks
      ? groundingChunks
          .map((chunk: any) => chunk.web?.uri)
          .filter((uri: any): uri is string => typeof uri === 'string')
      : [];

    // 3. Map to internal type
    let threat = DisasterType.GENERAL;
    const threatStr = (result.dominantThreat || "").toUpperCase();
    if (threatStr.includes("QUAKE")) threat = DisasterType.EARTHQUAKE;
    else if (threatStr.includes("FLOOD")) threat = DisasterType.FLOOD;
    else if (threatStr.includes("FIRE")) threat = DisasterType.WILDFIRE;
    else if (threatStr.includes("CANE") || threatStr.includes("CYCLONE") || threatStr.includes("STORM")) threat = DisasterType.HURRICANE;
    else if (threatStr.includes("TSUNAMI")) threat = DisasterType.TSUNAMI;

    return {
      location: result.location || "Unknown Location",
      riskScore: typeof result.riskScore === 'number' ? result.riskScore : 0,
      dominantThreat: threat,
      details: result.details || "No specific details available.",
      recentAlerts: Array.isArray(result.recentAlerts) ? result.recentAlerts.map((a: any) => String(a)) : [],
      sources: [...new Set(sources)], // Deduplicate
      emergencyContacts: {
        police: result.emergencyContacts?.police || "911",
        fire: result.emergencyContacts?.fire || "911",
        ambulance: result.emergencyContacts?.ambulance || "911",
        disasterResponse: result.emergencyContacts?.disasterResponse || "N/A"
      },
      factors: {
        seismic: result.factors?.seismic || 0,
        weather: result.factors?.weather || 0,
        terrain: result.factors?.terrain || 0,
        urban: result.factors?.urban || 0,
      }
    };
  } catch (error) {
    console.error("Risk Analysis Failed:", error);
    // Fallback mock data for demo purposes if API fails
    return {
      location: `Lat: ${lat.toFixed(2)}, Lng: ${lng.toFixed(2)}`,
      riskScore: 15,
      dominantThreat: DisasterType.GENERAL,
      details: "Unable to connect to live risk assessment services. Showing baseline data.",
      recentAlerts: [],
      sources: [],
      emergencyContacts: {
        police: "112",
        fire: "112",
        ambulance: "112",
        disasterResponse: "Unknown"
      },
      factors: { seismic: 10, weather: 20, terrain: 5, urban: 50 }
    };
  }
};

/**
 * Fetches global active disaster hotspots using Google Search.
 */
export const fetchGlobalDisasterHotspots = async (): Promise<GlobalEvent[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        Find 5 major active natural disasters or extreme weather events occurring globally RIGHT NOW.
        Use Google Search.
        Return a valid JSON array of objects. Each object must have:
        - id: string (unique)
        - title: string (e.g., "Earthquake in Japan")
        - type: "Earthquake" | "Flood" | "Wildfire" | "Hurricane" | "Tsunami" | "Volcano"
        - coordinates: { "lat": number, "lng": number } (Approximate coordinates)
        - severity: number (0-100)
        - description: string (short summary)
      `,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    let jsonString = cleanJsonText(response.text || "[]");
    const startIdx = jsonString.indexOf('[');
    const endIdx = jsonString.lastIndexOf(']');
    if (startIdx !== -1 && endIdx !== -1) {
      jsonString = jsonString.substring(startIdx, endIdx + 1);
    }

    const events = JSON.parse(jsonString);
    return events.map((e: any) => ({
        ...e,
        type: Object.values(DisasterType).find(t => t.toUpperCase() === e.type?.toUpperCase()) || DisasterType.GENERAL
    }));
  } catch (error) {
    console.warn("Failed to fetch global events, using fallback", error);
    return [
      { id: '1', title: 'Pacific Typhoon', type: DisasterType.HURRICANE, coordinates: { lat: 18.0, lng: 135.0 }, severity: 85, description: 'Severe typhoon warning active for Philippine Sea.' },
      { id: '2', title: 'California Wildfire Risk', type: DisasterType.WILDFIRE, coordinates: { lat: 37.0, lng: -120.0 }, severity: 65, description: 'Red flag warnings due to high winds and dry conditions.' },
      { id: '3', title: 'Central Europe Floods', type: DisasterType.FLOOD, coordinates: { lat: 50.0, lng: 10.0 }, severity: 50, description: 'River levels rising above critical thresholds.' },
      { id: '4', title: 'Andes Earthquake', type: DisasterType.EARTHQUAKE, coordinates: { lat: -15.0, lng: -70.0 }, severity: 40, description: 'Moderate seismic activity detected in Peru region.' },
      { id: '5', title: 'Indonesian Volcano', type: DisasterType.VOLCANO, coordinates: { lat: -7.5, lng: 110.5 }, severity: 70, description: 'Increased volcanic ash emissions reported.' }
    ];
  }
};

/**
 * Generates an early warning message suitable for SMS/Email.
 */
export const generateAlertMessage = async (type: DisasterType, location: string, severity: number): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Write a short, urgent 160-character SMS alert for a ${type} at ${location}. Severity level: ${severity}/100. Include safety instruction. Do not use markdown.`,
    });
    return response.text || "EMERGENCY ALERT: Seek shelter immediately.";
  } catch (e) {
    return `EMERGENCY ALERT: ${type} detected in ${location}. Take cover immediately.`;
  }
};

/**
 * Generates a recovery plan based on a simulated or real scenario.
 */
export const generateRecoveryPlan = async (type: DisasterType, location: string): Promise<RecoveryTask[]> => {
  const prompt = `
    Create a detailed recovery operation plan for a ${type} in ${location}.
    Generate 5-7 specific, actionable tasks for a response team.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              assignedAgent: { type: Type.STRING },
              estimatedTime: { type: Type.STRING },
            }
          }
        }
      }
    });
    
    const tasks = JSON.parse(response.text || "[]");
    return tasks.map((t: any) => ({ ...t, status: 'pending' }));
  } catch (error) {
    console.error("Plan Generation Failed:", error);
    return [
      { id: '1', title: 'Assess Damage', description: 'Drone survey of affected area', assignedAgent: 'Recon Unit', estimatedTime: '2 hours', status: 'pending' },
      { id: '2', title: 'Establish Comms', description: 'Set up emergency mesh network', assignedAgent: 'Comms Team', estimatedTime: '1 hour', status: 'pending' },
      { id: '3', title: 'Medical Triage', description: 'Set up field hospital at safe zone', assignedAgent: 'Medical Unit', estimatedTime: '3 hours', status: 'pending' },
    ];
  }
};

/**
 * Processes voice commands to modify the recovery task list.
 */
export const processVoiceCommand = async (transcript: string, currentTasks: RecoveryTask[]): Promise<{ updatedTasks: RecoveryTask[], reply: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        You are an AI operations commander managing disaster recovery.
        Current Tasks JSON: ${JSON.stringify(currentTasks)}
        Voice Command: "${transcript}"

        Instructions:
        1. Analyze the voice command.
        2. Update the task list (mark as completed, add new task, reassign agent, etc.).
        3. Generate a short, military-style confirmation reply.
        4. Return JSON with "updatedTasks" and "reply".
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            updatedTasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  status: { type: Type.STRING },
                  assignedAgent: { type: Type.STRING },
                  estimatedTime: { type: Type.STRING },
                }
              }
            },
            reply: { type: Type.STRING }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      updatedTasks: result.updatedTasks || currentTasks,
      reply: result.reply || "Command acknowledged."
    };
  } catch (error) {
    console.error("Voice Processing Failed:", error);
    return {
      updatedTasks: currentTasks,
      reply: "Signal interference. Command not processed."
    };
  }
};