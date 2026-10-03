import {
  AgentCard,
  A2AApplication,
  DefaultA2ARequestHandler
} from "a2a-js";
import { WeatherResult } from "../shared/schema";
import { WEATHER_AGENT_CARD } from "./agentCard";
import { WeatherHandler, WeatherAgentExecutor } from "./handler";

// Create the weather handler (business logic)
const weatherHandler = new WeatherHandler();

// Create A2A request handler implementing the weather skill
const a2aRequestHandler = new DefaultA2ARequestHandler(
  new WeatherAgentExecutor(weatherHandler)
);

// Create A2A Application which handles all routing:
// - GET /.well-known/agent.json (AgentCard discovery)
// - POST / (A2A JSON-RPC: tasks/send, tasks/get, tasks/cancel, etc.)
const a2aApp = new A2AApplication(WEATHER_AGENT_CARD, a2aRequestHandler);
const app = a2aApp.build();

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Weather Agent running on http://localhost:${PORT}`);
  console.log(`  AgentCard: GET  /.well-known/agent.json`);
  console.log(`  A2A RPC:   POST / (tasks/send, tasks/get, tasks/cancel, etc.)`);
  console.log(`  Legacy:    POST /rpc (backward compat)`);
});

// Legacy: Keep POST /rpc for backward compatibility (deprecated)
app.post("/rpc", (req, res) => {
  const request = req.body as { jsonrpc?: string; method?: string; params?: unknown; id?: number | string };
  const cityParam = (request.params as { city?: string })?.city;

  if (!cityParam || typeof cityParam !== "string") {
    return res.json({
      jsonrpc: "2.0",
      error: { code: -32602, message: "Invalid params: 'city' is required" },
      id: request.id ?? 0
    });
  }

  const result = weatherHandler.generateDummyWeather(cityParam);
  return res.json({
    jsonrpc: "2.0",
    result,
    id: request.id ?? 0
  });
});
