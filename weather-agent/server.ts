import express from "express";
import { JsonRpcError, WeatherAgentRequest, WeatherResult } from "../shared/schema";

const app = express();
app.use(express.json());

const PORT = 3000;

// JSON-RPC error builder
function buildError(id: number | string, code: number, message: string): JsonRpcError {
  return { jsonrpc: "2.0", error: { code, message }, id };
}

// Route: POST /rpc
app.post("/rpc", (req, res) => {
  const request = req.body as WeatherAgentRequest;

  // Validate JSON-RPC envelope
  if (!request.jsonrpc || request.jsonrpc !== "2.0" || !request.method) {
    return res.json(buildError(request?.id ?? 0, -32600, "Invalid Request"));
  }

  // Route to handler
  if (request.method === "getWeather") {
    return handleGetWeather(request, res);
  }

  // Unknown method
  return res.json(buildError(request.id, -32601, `Method not found: ${request.method}`));
});

// Handle getWeather method
function handleGetWeather(request: WeatherAgentRequest, res: import("express").Response) {
  const params = request.params as { city?: string };

  if (!params.city || typeof params.city !== "string") {
    return res.json(buildError(request.id, -32602, "Invalid params: 'city' is required"));
  }

  const result = generateDummyWeather(params.city);
  return res.json({
    jsonrpc: "2.0",
    result,
    id: request.id,
  });
}

// Generate dummy weather data
function generateDummyWeather(city: string): WeatherResult {
  const conditions = ["Sunny", "Cloudy", "Rainy", "Partly Cloudy", "Windy"];
  const condition = conditions[Math.floor(Math.random() * conditions.length)];
  const temp = Math.floor(Math.random() * 30) + 5;

  return {
    city,
    temperature: temp,
    feelsLike: temp - 2,
    humidity: Math.floor(Math.random() * 60) + 30,
    wind: { speed: Math.floor(Math.random() * 30) + 5, direction: "NW" },
    forecast: [
      { day: "Monday", high: temp + 2, low: temp - 6, condition },
      { day: "Tuesday", high: temp, low: temp - 4, condition: conditions[Math.floor(Math.random() * conditions.length)] },
      { day: "Wednesday", high: temp - 2, low: temp - 8, condition: conditions[Math.floor(Math.random() * conditions.length)] },
    ],
  };
}

// Start server
app.listen(PORT, () => {
  console.log(`Weather Agent running on http://localhost:${PORT}`);
  console.log(`Endpoint: POST /rpc`);
});
