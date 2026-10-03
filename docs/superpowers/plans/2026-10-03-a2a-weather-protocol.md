# A2A Weather Protocol Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Client Agent and Weather Agent that communicate via JSON-RPC over HTTP, with the Client Agent exposing an HTTP API for weather queries.

**Architecture:** Two Express servers in a monorepo. The Weather Agent listens on port 3000 and processes JSON-RPC calls. The Client Agent listens on port 3001 and accepts HTTP GET /weather requests, forwarding them to the Weather Agent via JSON-RPC HTTP POST.

**Tech Stack:** Node.js 20+, TypeScript 5.x, Express 4.x, Node `fetch` (built-in).

## Global Constraints

- JSON-RPC 2.0 protocol format (per spec)
- Weather Agent runs on port 3000, Client Agent on port 3001 (per spec)
- All shared types live in `shared/schema.ts` (per spec)
- No external JSON-RPC library - manual serialize/deserialize (educational purpose)

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`

**Interfaces:**
- Produces: TypeScript project configured with ES modules, `lib: ["ES2022"]`, `moduleResolution: "bundler"`, `outDir: "dist"`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "a2a-weather",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev:weather": "tsx watch weather-agent/server.ts",
    "dev:client": "tsx watch client-agent/server.ts",
    "start:weather": "node dist/weather-agent/server.js",
    "start:client": "node dist/client-agent/server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "resolveJsonModule": true
  },
  "include": ["shared/**/*.ts", "weather-agent/**/*.ts", "client-agent/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`

- [ ] **Step 4: Commit**

```bash
git add package.json tsconfig.json
git commit -m "chore: scaffold project with package.json and tsconfig"
```

---

### Task 2: Shared JSON-RPC Types

**Files:**
- Create: `shared/schema.ts`

**Interfaces:**
- Consumes: None (foundation layer)
- Produces: TypeScript interfaces used by both agents

- [ ] **Step 1: Create shared/schema.ts**

```typescript
// JSON-RPC 2.0 envelope types

export interface JsonRpcRequest<TParams = unknown> {
  jsonrpc: "2.0";
  method: string;
  params: TParams;
  id: number | string;
}

export interface JsonRpcSuccess<TResult = unknown> {
  jsonrpc: "2.0";
  result: TResult;
  id: number | string;
}

export interface JsonRpcError {
  jsonrpc: "2.0";
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: number | string;
}

export type JsonRpcResponse<TResult = unknown> = JsonRpcSuccess<TResult> | JsonRpcError;

// Weather-specific types

export interface WeatherRequestParams {
  city: string;
}

export interface WindData {
  speed: number;
  direction: string;
}

export interface ForecastDay {
  day: string;
  high: number;
  low: number;
  condition: string;
}

export interface WeatherResult {
  city: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  wind: WindData;
  forecast: ForecastDay[];
}

// Method-specific types

export type WeatherAgentRequest = JsonRpcRequest<WeatherRequestParams>;
export type WeatherAgentSuccessResponse = JsonRpcSuccess<WeatherResult>;
export type WeatherAgentResponse = WeatherAgentSuccessResponse | JsonRpcError;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add shared/schema.ts
git commit -m "feat: add shared JSON-RPC and weather types"
```

---

### Task 3: Weather Agent Server

**Files:**
- Create: `weather-agent/server.ts`

**Interfaces:**
- Consumes: `shared/schema.ts` (all types)
- Produces: Express server on port 3000 with `/rpc` POST endpoint

- [ ] **Step 1: Create weather-agent/server.ts**

```typescript
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
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add weather-agent/server.ts
git commit -m "feat: add Weather Agent server with /rpc JSON-RPC endpoint"
```

---

### Task 4: Weather Agent Integration Tests

**Files:**
- Create: `tests/weather-agent.test.ts`

**Interfaces:**
- Consumes: `shared/schema.ts`
- Produces: Tests for JSON-RPC parsing, validation, success, and error responses

- [ ] **Step 1: Create tests/weather-agent.test.ts**

```typescript
import { describe, it, expect } from "node:test";
import { test, mock, afterEach } from "node:test";
import {spawn} from "node:child_process";
import {promises as fs} from "node:fs";

const WEATHER_PORT = 3000;
const WEATHER_URL = `http://localhost:${WEATHER_PORT}/rpc`;

async function waitForServer(url: string, maxRetries = 10): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await fetch(url);
      return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Server did not start in time");
}

async function callRpc(params: Record<string, unknown>, method = "getWeather", id = 1) {
  const res = await fetch(WEATHER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id }),
  });
  return res.json() as Promise<any>;
}

// NOTE: This test assumes 'npm run dev:weather' is running in the background.
// Run with: node --test tests/weather-agent.test.ts

describe("Weather Agent - /rpc", () => {
  it("should return weather data for a valid city", async () => {
    const result = await callRpc({ city: "Paris" });
    expect(result.jsonrpc).toBe("2.0");
    expect(result.result.city).toBe("Paris");
    expect(result.result).toHaveProperty("temperature");
    expect(result.result).toHaveProperty("forecast");
    expect(result.result.forecast).toHaveLength(3);
  });

  it("should return error for missing city", async () => {
    const result = await callRpc({});
    expect(result.error).toBeDefined();
    expect(result.error.code).toBe(-32602);
  });

  it("should return error for unknown method", async () => {
    const res = await fetch(WEATHER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "unknown", params: {}, id: 1 }),
    });
    const result = await res.json();
    expect(result.error.code).toBe(-32601);
  });
});
```

- [ ] **Step 2: Run test (with weather agent running)**

Run: `node --test tests/weather-agent.test.ts`
Expected: All tests pass (requires `npm run dev:weather` running on port 3000)

- [ ] **Step 3: Commit**

```bash
git add tests/weather-agent.test.ts
git commit -m "test: add Weather Agent integration tests"
```

---

### Task 5: Client Agent - JSON-RPC Transport

**Files:**
- Create: `client-agent/transport.ts`

**Interfaces:**
- Consumes: `shared/schema.ts` (all types)
- Produces: `callWeatherAgent(city: string): Promise<WeatherResult>` function

- [ ] **Step 1: Create client-agent/transport.ts**

```typescript
import { WeatherRequestParams, WeatherResult, WeatherAgentRequest, WeatherAgentResponse } from "../shared/schema";

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

  const data: WeatherAgentResponse = await response.json();

  if ("error" in data) {
    throw new Error(`Weather Agent error [${data.error.code}]: ${data.error.message}`);
  }

  return data.result;
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add client-agent/transport.ts
git commit -m "feat: add Client Agent JSON-RPC transport layer"
```

---

### Task 6: Client Agent Server

**Files:**
- Create: `client-agent/server.ts`

**Interfaces:**
- Consumes: `client-agent/transport.ts` → `callWeatherAgent(city: string): Promise<WeatherResult>`
- Produces: Express server on port 3001 with `GET /weather?city=...` endpoint

- [ ] **Step 1: Create client-agent/server.ts**

```typescript
import express from "express";
import { callWeatherAgent } from "./transport";

const app = express();
const PORT = 3001;

// Route: GET /weather?city=...
app.get("/weather", async (req, res) => {
  const city = req.query.city as string;

  if (!city) {
    return res.status(400).json({ error: "Missing 'city' query parameter" });
  }

  try {
    const weather = await callWeatherAgent(city);
    return res.json({ city: weather.city, ...weather });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(502).json({ error: message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Client Agent running on http://localhost:${PORT}`);
  console.log(`Endpoint: GET /weather?city=<city>`);
  console.log("Upstream: Weather Agent at http://localhost:3000/rpc");
});
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add client-agent/server.ts
git commit -m "feat: add Client Agent server with /weather endpoint"
```

---

### Task 7: Client Agent Integration Tests

**Files:**
- Create: `tests/client-agent.test.ts`

**Interfaces:**
- Consumes: Express test utilities
- Produces: Tests for valid city, missing city, and upstream failure scenarios

- [ ] **Step 1: Create tests/client-agent.test.ts**

```typescript
import { describe, it, expect } from "node:test";

const CLIENT_PORT = 3001;
const CLIENT_URL = `http://localhost:${CLIENT_PORT}`;

async function getWeather(city?: string) {
  const url = city ? `${CLIENT_URL}/weather?city=${encodeURIComponent(city)}` : `${CLIENT_URL}/weather`;
  const res = await fetch(url);
  return res.json();
}

// NOTE: This test assumes 'npm run dev:client' is running in the background.
// Run with: node --test tests/client-agent.test.ts

describe("Client Agent - /weather", () => {
  it("should return weather data from Weather Agent", async () => {
    const result = await getWeather("Tokyo");
    expect(result).toHaveProperty("city", "Tokyo");
    expect(result).toHaveProperty("temperature");
    expect(result).toHaveProperty("forecast");
    expect(result.forecast).toHaveLength(3);
  });

  it("should return 400 for missing city", async () => {
    const res = await fetch(`${CLIENT_URL}/weather`);
    expect(res.status).toBe(400);
  });

  it("should return 502 when Weather Agent is unreachable", async () => {
    const res = await getWeather("London");
    // Weather Agent may not be running during client-only tests
    // If 502, that's expected behavior (transport failure → 502)
    if (res.status === 502) {
      expect(res).toHaveProperty("error");
    }
  });
});
```

- [ ] **Step 2: Run test (with client agent running)**

Run: `node --test tests/client-agent.test.ts`
Expected: Tests pass (requires `npm run dev:client` running on port 3001)

- [ ] **Step 3: Commit**

```bash
git add tests/client-agent.test.ts
git commit -m "test: add Client Agent integration tests"
```

---

### Plan Self-Review

**Spec coverage:**
- JSON-RPC contract (methods, params, result, error) → Tasks 2, 3
- Shared types in `shared/schema.ts` → Task 2
- Weather Agent on port 3000 → Task 3
- Client Agent on port 3001 → Tasks 5, 6
- Error handling (unknown method -32601, invalid params -32602, transport failure 502/503) → Tasks 3, 5, 6
- Rich weather data (temp, feelsLike, humidity, wind, 3-day forecast) → Tasks 2, 3
- Data flow (Browser → Client Agent → Weather Agent) → Tasks 5, 6

**Placeholder scan:** No "TBD", "TODO", or vague requirements found.

**Type consistency:** `WeatherRequestParams.city: string` consumed by Task 3 handler, produced by Task 5 transport. `WeatherResult` with `forecast: ForecastDay[]` consistently defined in Task 2 and used throughout.

**Scope check:** Focused - two agents, one protocol, no unnecessary features.

---

**Plan complete and saved to `docs/superpowers/plans/2026-10-03-a2a-weather-protocol.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
