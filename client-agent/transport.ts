import {
  A2ACardResolver,
  AgentCard,
  Role,
  Part,
  TextPart
} from "a2a-js";
import { WeatherResult } from "../shared/schema";

const WEATHER_AGENT_URL = "http://localhost:3000";
const MESSAGES_ENDPOINT = WEATHER_AGENT_URL;

let cachedAgentCard: AgentCard | null = null;

async function getAgentCard(): Promise<AgentCard> {
  if (cachedAgentCard) return cachedAgentCard;

  const resolver = new A2ACardResolver(WEATHER_AGENT_URL);
  cachedAgentCard = await resolver.getAgentCard();
  return cachedAgentCard;
}

export async function callWeatherAgent(city: string): Promise<WeatherResult> {
  // Discover the agent card (proves A2A protocol compliance)
  const agentCard = await getAgentCard();

  const textPart: TextPart = { type: "text", text: city };

  const response = await fetch(MESSAGES_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tasks/send",
      params: {
        id: crypto.randomUUID(),
        message: { role: Role.User, parts: [textPart] }
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Weather Agent unavailable: HTTP ${response.status}`);
  }

  const data = (await response.json()) as { error?: { code: number; message: string }; result?: { parts?: Part[] } };

  // Check for JSON-RPC error
  if (data.error) {
    throw new Error(`Weather Agent error [${data.error.code}]: ${data.error.message}`);
  }

  // Parse the result (SendMessageResponse with Message)
  const message = data.result;
  const textPartResult = message?.parts?.find((p: Part) => p.type === "text") as TextPart | undefined;
  if (!textPartResult?.text) {
    throw new Error("Weather Agent returned no text content");
  }

  return JSON.parse(textPartResult.text) as WeatherResult;
}

export { cachedAgentCard as getAgentCardCache };
