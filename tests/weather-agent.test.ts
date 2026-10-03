import { describe, it } from "node:test";
import assert from "node:assert";

const WEATHER_PORT = 3000;
const WEATHER_URL = `http://localhost:${WEATHER_PORT}/rpc`;

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
    assert.strictEqual(result.jsonrpc, "2.0");
    assert.strictEqual(result.result.city, "Paris");
    assert.ok("temperature" in result.result);
    assert.ok("forecast" in result.result);
    assert.strictEqual(result.result.forecast.length, 3);
  });

  it("should return error for missing city", async () => {
    const result = await callRpc({});
    assert.ok(result.error);
    assert.strictEqual(result.error.code, -32602);
  });

  it("should return error for unknown method", async () => {
    const res = await fetch(WEATHER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "unknown", params: {}, id: 1 }),
    });
    const result = await res.json();
    assert.strictEqual(result.error.code, -32601);
  });
});
