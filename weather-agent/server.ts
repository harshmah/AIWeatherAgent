import express from "express";
import {
  DefaultA2ARequestHandler,
  SendMessageRequest,
  SendMessageResponse,
  CancelTaskRequest,
  CancelTaskResponse,
  Task
} from "a2a-js";
import { WeatherResult } from "../shared/schema";
import { WEATHER_AGENT_CARD, serveAgentCard } from "./agentCard";
import { WeatherHandler, WeatherAgentExecutor } from "./handler";

const app = express();
app.use(express.json());

const PORT = 3000;

// Serve AgentCard at /.well-known/agent.json (discovery endpoint)
app.get("/.well-known/agent.json", serveAgentCard);

// Create the weather handler (business logic)
const weatherHandler = new WeatherHandler();

// Create A2A request handler implementing the weather skill
const a2aRequestHandler = new DefaultA2ARequestHandler(
  new WeatherAgentExecutor(weatherHandler)
);

// Route: POST /messages (A2A sendTask endpoint)
app.post("/messages", (req, res) => {
  const request = req.body as SendMessageRequest;
  return a2aRequestHandler
    .onMessageSend(request)
    .then((response: SendMessageResponse) => {
      res.json(response);
    })
    .catch((err: Error) => {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: err.message },
        id: request?.id ?? 0
      });
    });
});

// Route: POST /cancel (A2A cancelTask endpoint)
app.post("/cancel", (req, res) => {
  const request = req.body as CancelTaskRequest;
  return a2aRequestHandler
    .onCancelTask(request)
    .then((response: CancelTaskResponse) => res.json(response))
    .catch(() => {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Cancel not supported" },
        id: request?.id ?? 0
      });
    });
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

// Start server
app.listen(PORT, () => {
  console.log(`Weather Agent running on http://localhost:${PORT}`);
  console.log(`  AgentCard: GET  /.well-known/agent.json`);
  console.log(`  SendTask:  POST /messages`);
  console.log(`  Cancel:    POST /cancel`);
  console.log(`  Legacy:    POST /rpc (backward compat)`);
});
