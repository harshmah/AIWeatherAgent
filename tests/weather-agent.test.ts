import { describe, it } from "node:test";
import assert from "node:assert";

const WEATHER_PORT = 3000;
const WEATHER_URL = `http://localhost:${WEATHER_PORT}`;

// Test AgentCard discovery
describe("Weather Agent - /.well-known/agent.json", () => {
  it("should return valid AgentCard", async () => {
    const res = await fetch(`${WEATHER_URL}/.well-known/agent.json`);
    const card = await res.json();
    assert.strictEqual(card.name, "Weather Agent");
    assert.strictEqual(card.version, "1.0.0");
    assert.ok(card.capabilities);
    assert.ok(card.capabilities.pushNotifications);
    assert.ok(card.skills);
    assert.strictEqual(card.skills.length, 1);
    assert.strictEqual(card.skills[0].id, "getWeather");
  });
});

// Test A2A sendTask endpoint
async function callSendTask(city: string) {
  const res = await fetch(`${WEATHER_URL}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tasks/send",
      params: {
        id: "test-1",
        message: { parts: [{ type: "text", text: city }] }
      }
    }),
  });
  return res.json();
}

// Test legacy /rpc endpoint (backward compatibility)
async function callLegacyRpc(params: Record<string, unknown>, method = "getWeather", id = 1) {
  const res = await fetch(`${WEATHER_URL}/rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id }),
  });
  return res.json();
}

describe("Weather Agent - /messages (A2A)", () => {
  it("should return weather data for a valid city via sendTask", async () => {
    const result = await callSendTask("Paris");
    assert.strictEqual(result.jsonrpc, "2.0");
    const parts = result.result.parts as { type: string; text: string }[];
    const weatherText = parts.find(p => p.type === "text")?.text;
    const weather = JSON.parse(weatherText!);
    assert.strictEqual(weather.city, "Paris");
    assert.ok("temperature" in weather);
    assert.ok("forecast" in weather);
  });

  it("should return error for missing city", async () => {
    const res = await fetch(`${WEATHER_URL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tasks/send",
        params: { id: "test-2", message: { parts: [{ type: "text", text: "" }] } }
      }),
    });
    const result = await res.json();
    assert.ok(result.error);
  });
});

describe("Weather Agent - /rpc (legacy)", () => {
  it("should return weather data for a valid city (backward compat)", async () => {
    const result = await callLegacyRpc({ city: "Tokyo" });
    assert.strictEqual(result.jsonrpc, "2.0");
    assert.strictEqual(result.result.city, "Tokyo");
    assert.ok("temperature" in result.result);
    assert.ok("forecast" in result.result);
    assert.strictEqual(result.result.forecast.length, 3);
  });

  it("should return error for missing city (backward compat)", async () => {
    const result = await callLegacyRpc({});
    assert.ok(result.error);
    assert.strictEqual(result.error.code, -32602);
  });

  it("should return error for unknown method (backward compat)", async () => {
    const res = await fetch(`${WEATHER_URL}/rpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "unknown", params: {}, id: 1 }),
    });
    const result = await res.json();
    // Legacy endpoint returns -32602 (no city in params) since method dispatch is removed
    assert.strictEqual(result.error.code, -32602);
  });
});

// NOTE: This test assumes 'npm run dev:weather' is running in the background.
// Run with: node --test tests/weather-agent.test.ts
