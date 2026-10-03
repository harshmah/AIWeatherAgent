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
    return res.json(weather);
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
