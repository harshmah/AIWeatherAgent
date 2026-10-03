import { WeatherResult, WeatherAgentRequest, WeatherAgentResponse } from "../shared/schema";

const WEATHER_AGENT_URL = "http://localhost:3000/rpc";

export async function callWeatherAgent(city: string): Promise<WeatherResult> {
  const request: WeatherAgentRequest = {
    jsonrpc: "2.0",
    method: "getWeather",
    params: { city },
    id: 1,
  };

  const response = await fetch(WEATHER_AGENT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Weather Agent unavailable: HTTP ${response.status}`);
  }

  const data = (await response.json()) as WeatherAgentResponse;

  if ("error" in data) {
    throw new Error(`Weather Agent error [${data.error.code}]: ${data.error.message}`);
  }

  return data.result;
}
