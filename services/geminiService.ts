
import { GoogleGenAI, Type } from "@google/genai";
import { HealthData, AQIData, BreathAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: (import.meta as any).env?.VITE_GEMINI_API_KEY || '' });

export const getHealthAnalysis = async (
  health: HealthData, 
  aqi: AQIData
): Promise<BreathAnalysis> => {
  const prompt = `
    Analyze respiratory health (Breath Score 0-100) based on:
    - Age: ${health.age}
    - Blood Pressure: ${health.systolicBP}/${health.diastolicBP}
    - Smoking Status: ${health.smokingStatus}
    - Current Local AQI: ${aqi.aqi} (${aqi.status}) in ${aqi.city}

    Please provide a structured analysis including:
    1. A numeric breath score (0-100).
    2. A brief clinical summary of respiratory risk.
    3. 3-4 specific actionable recommendations.
    4. Key identified risk factors.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: "A score from 0-100." },
          summary: { type: Type.STRING },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          riskFactors: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["score", "summary", "recommendations", "riskFactors"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const fetchLocationAQI = async (lat: number, lon: number): Promise<AQIData> => {
  // We use Google Search grounding via Gemini to find real-time air quality 
  // since this provides the most up-to-date regional information.
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `What is the current Air Quality Index (AQI) near latitude ${lat}, longitude ${lon}? 
    Return the information in a JSON format including the numeric aqi value, city name, dominant pollutant, and a short status description (e.g. Good, Moderate, Unhealthy).`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          aqi: { type: Type.NUMBER },
          city: { type: Type.STRING },
          dominantPollutant: { type: Type.STRING },
          status: { type: Type.STRING }
        },
        required: ["aqi", "city", "dominantPollutant", "status"]
      }
    }
  });

  return JSON.parse(response.text);
};
