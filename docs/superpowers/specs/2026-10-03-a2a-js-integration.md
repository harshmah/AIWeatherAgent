# A2A-js Integration - Weather Agent Design

## Overview

Refactor the existing manual JSON-RPC implementation to use `a2a-js` SDK, adding:
- **Agent Cards (C)** - Dynamic discovery via `.well-known/agent.json`
- **Task Management (A)** - Long-running tasks with state machine
- **Push Notifications (C)** - Agent-initiated callbacks configured in AgentCard

## Architecture

```
WeatherAgent/
├── shared/
│   └── schema.ts           (keep - minimal manual types)
├── weather-agent/
│   ├── server.ts           (rewritten: A2AServer + AgentCard)
│   └── handler.ts          (new: A2A request handler)
├── client-agent/
│   ├── server.ts           (rewritten: Express wraps A2AClient)
│   └── transport.ts        (rewritten: A2AClient wrapper)
```

**Data Flow (unchanged endpoints):**
```
Browser → GET /weather?city=Paris
   ↓
Client Agent (port 3001)
   → A2AClient.sendTask() (JSON-RPC 2.0)
   ↓
Weather Agent (port 3000)
   → /.well-known/agent.json (AgentCard)
   → /messages (SendTask)
   → Returns task with state machine (Working → Completed)
```

## AgentCard Spec

Weather Agent publishes:
```json
{
  "name": "Weather Agent",
  "description": "Weather forecast service",
  "url": "http://localhost:3000/",
  "version": "1.0.0",
  "defaultInputModes": ["text"],
  "defaultOutputModes": ["text"],
  "capabilities": {
    "streaming": false,
    "pushNotifications": true,
    "taskQueue": { "capabilities": ["resubscribe"] }
  },
  "skills": [{
    "id": "getWeather",
    "name": "Get Weather Forecast",
    "description": "Returns weather data for a city",
    "tags": ["weather"],
    "examples": ["Weather in Paris"]
  }]
}
```

Client Agent reads this on startup and discovers available skills.

## Task Management

Task states: `working` → `completed` (or `failed`/`canceled`)

Client uses `A2AClient.sendTask(params)` which:
1. Creates a task via `/messages` endpoint
2. Polls for status (state machine managed by SDK)
3. Returns the final result when `completed`

Client Agent server:
```typescript
const client = new A2AClient("http://localhost:3000/", fetch);
const params: TaskSendParams = {
  id: uuidv4(),
  message: { role: Role.User, parts: [{ type: "text", text: city }] }
};
const task = await client.sendTask(params);
// task.state: "completed" | "working" | "failed"
// task.message?.parts contains weather data
```

## Push Notifications

Configured in AgentCard under `capabilities.pushNotifications`.
Client can provide a `pushNotification.url` when sending a task.
Weather Agent will call back to this URL when the task is complete.

For this dummy weather agent, push notifications are configured but not
actively used (all tasks complete synchronously). The capability is there
for real production scenarios.

## Error Handling

- Unknown skill → `-32601` (Method not found) via A2A SDK
- Missing params → `-32602` via validation in handler
- Task not found → `-32600` via A2A SDK
- Transport failures → 502 from Client Agent server

## Ports

- Weather Agent: `3000` (AgentCard + /messages)
- Client Agent: `3001` (Express proxy → A2AClient)

## Dependencies

- Add: `a2a-js` (official A2A protocol SDK)
- Add: `uuid` (task ID generation)
- Existing: Express, TypeScript, tsx
