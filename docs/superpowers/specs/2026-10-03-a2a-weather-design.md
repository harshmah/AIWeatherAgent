# A2A Protocol - Weather Agent Design

## Overview

Two Node.js agents communicate via JSON-RPC over HTTP:

- **Client Agent** - Exposes an HTTP API that wraps calls to the Weather Agent
- **Weather Agent** - Accepts JSON-RPC calls and returns dummy weather data

## Architecture

```
Browser
  └── GET /weather?city=Paris
       └── Client Agent (port 3001)
            └── POST /rpc (JSON-RPC)
                 └── Weather Agent (port 3000)
                      └── Dummy weather data
```

## JSON-RPC Contract

### Request
```json
{
  "jsonrpc": "2.0",
  "method": "getWeather",
  "params": { "city": "Paris" },
  "id": 1
}
```

### Success Response
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "city": "Paris",
    "temperature": 22,
    "feelsLike": 20,
    "humidity": 65,
    "wind": { "speed": 12, "direction": "NW" },
    "forecast": [
      { "day": "Monday", "high": 24, "low": 16, "condition": "Sunny" },
      { "day": "Tuesday", "high": 21, "low": 14, "condition": "Cloudy" },
      { "day": "Wednesday", "high": 19, "low": 13, "condition": "Rain" }
    ]
  }
}
```

### Error Response
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": { "code": -32600, "message": "Invalid request" }
}
```

## Shared Types

`shared/schema.ts` - TypeScript interfaces for request, response, result, error, and forecast types shared between agents.

## Error Handling

- Unknown JSON-RPC methods return `-32601` (Method not found)
- Missing/invalid params return `-32602` (Invalid params)
- Client-to-WeatherAgent transport failures return HTTP 502 with error message
- WeatherAgent unreachable returns HTTP 503 from Client Agent

## Ports

- Weather Agent: `3000`
- Client Agent: `3001`
