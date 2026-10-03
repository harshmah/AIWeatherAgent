import { AgentCard, AgentSkill } from "a2a-js";

export const WEATHER_AGENT_CARD: AgentCard = {
  name: "Weather Agent",
  description: "Weather forecast service providing current conditions and 3-day forecasts",
  url: "http://localhost:3000/",
  version: "1.0.0",
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
  capabilities: {
    streaming: false,
    pushNotifications: true
  },
  authentication: {
    schemes: ["public"]
  },
  skills: [
    {
      id: "getWeather",
      name: "Get Weather Forecast",
      description: "Returns weather data for a specified city",
      tags: ["weather", "forecast"],
      examples: ["Weather in Paris", "Forecast for Tokyo"]
    } as AgentSkill
  ]
};

export function serveAgentCard(req: import("express").Request, res: import("express").Response) {
  res.json(WEATHER_AGENT_CARD);
}
