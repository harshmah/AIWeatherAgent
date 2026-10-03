import { describe, it } from "node:test";
import assert from "node:assert";

const CLIENT_PORT = 3001;
const CLIENT_URL = `http://localhost:${CLIENT_PORT}`;

async function getWeather(city?: string) {
  const url = city ? `${CLIENT_URL}/weather?city=${encodeURIComponent(city)}` : `${CLIENT_URL}/weather`;
  const res = await fetch(url);
  return res.json();
}

// NOTE: This test assumes both agents are running:
//   npm run dev:weather  (port 3000)
//   npm run dev:client   (port 3001)
// Run with: node --test tests/client-agent.test.ts

describe("Client Agent - /weather", () => {
  it("should return weather data from Weather Agent", async () => {
    const result = await getWeather("Tokyo");
    assert.strictEqual(result.city, "Tokyo");
    assert.ok("temperature" in result);
    assert.ok("forecast" in result);
    assert.strictEqual(result.forecast.length, 3);
  });

  it("should return 400 for missing city", async () => {
    const res = await fetch(`${CLIENT_URL}/weather`);
    assert.strictEqual(res.status, 400);
  });

  it("should return 502 when Weather Agent is unreachable", async () => {
    const res = await getWeather("London");
    // If Weather Agent is not running, the client should return 502
    if (res.status === 502) {
      assert.ok("error" in (await fetch(`${CLIENT_URL}/weather?city=London`).then(r => r.json())));
    }
  });
});
