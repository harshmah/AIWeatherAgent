import {
  Role as RoleEnum,
  SendMessageRequest,
  SendMessageResponse,
  Task,
  CancelTaskRequest,
  CancelTaskResponse,
  TaskResubscriptionRequest,
  SendMessageStreamingRequest,
  SendMessageStreamingResponse,
  Part,
  TextPart,
  AgentExecutor
} from "a2a-js";
import { WeatherResult, WeatherSource } from "../shared/schema";

//const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL || "http://localhost:11434/v1/chat/completions"; #ollama
const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL || "http://localhost:8000/v1/chat/completions";
const LOCAL_LLM_MODEL = process.env.LOCAL_LLM_MODEL || "Qwen3.6-35B-A3B-MLX-4bit"; //"qwen3.5:32b";

interface LLMPrompt {
  model: string;
  messages: Array<{ role: string; content: string }>;
  response_format: { type: string };
  max_tokens: number;
}

interface LLMResponse {
  choices: Array<{ message: { content: string } }>;
}

// WeatherHandler: tries LLM first for real weather, falls back to dummy
export class WeatherHandler {
  generateDummyWeather(city: string): WeatherResult {
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
      source: "dummy",
    };
  }

  private WEATHER_PROMPT = (city: string) =>
    `You are a weather assistant. Return current weather and 3-day forecast for "${city}" as a JSON object matching this schema exactly (no markdown, no extra text, just raw JSON):
{
  "city": "string",
  "temperature": number (Celsius),
  "feelsLike": number (Celsius),
  "humidity": number (0-100),
  "wind": { "speed": number (km/h), "direction": "string" },
  "forecast": [
    { "day": "Monday", "high": number, "low": number, "condition": "string" },
    { "day": "Tuesday", "high": number, "low": number, "condition": "string" },
    { "day": "Wednesday", "high": number, "low": number, "condition": "string" }
  ]
}
Use real current weather data if you know it. If you don't know the exact data, make your best educated estimate based on typical climate for this city.`;

  async fetchRealWeatherFromLLM(city: string): Promise<WeatherResult | null> {
    try {
      const prompt = this.WEATHER_PROMPT(city);

      const llmPayload: LLMPrompt = {
        model: LOCAL_LLM_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 1024,
      };

      const response = await fetch(LOCAL_LLM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer <<replace_by_token>>" },
        body: JSON.stringify(llmPayload),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) return null;

      const data: LLMResponse = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const weatherData = JSON.parse(jsonMatch[0]);

      const forecastDays = ["Monday", "Tuesday", "Wednesday"];
      const forecast = forecastDays.map((day, i) => ({
        day,
        high: weatherData.forecast?.[i]?.high ?? Math.floor(Math.random() * 30) + 5,
        low: weatherData.forecast?.[i]?.low ?? Math.floor(Math.random() * 30) + 5,
        condition: weatherData.forecast?.[i]?.condition ?? "Sunny",
      }));

      return {
        city: weatherData.city || city,
        temperature: weatherData.temperature ?? Math.floor(Math.random() * 30) + 5,
        feelsLike: weatherData.feelsLike ?? 0,
        humidity: weatherData.humidity ?? 50,
        wind: weatherData.wind ?? { speed: 10, direction: "N" },
        forecast,
        source: "real" as WeatherSource,
      };
    } catch {
      return null;
    }
  }

  async generateWeather(city: string): Promise<WeatherResult> {
    const realWeather = await this.fetchRealWeatherFromLLM(city);
    if (realWeather) return realWeather;
    return this.generateDummyWeather(city);
  }
}

// WeatherAgentExecutor: implements A2A protocol interface
export class WeatherAgentExecutor implements AgentExecutor {
  constructor(private handler: WeatherHandler) {}

  async onMessageSend(request: SendMessageRequest, task?: Task): Promise<SendMessageResponse> {
    const city = this.extractCity(request);
    if (!city) {
      throw new Error("Invalid params: 'city' is required");
    }

    const weather = await this.handler.generateWeather(city);
    const textPart = { type: "text" as const, text: JSON.stringify(this.toWeatherJson(weather)) };
    const parts: TextPart[] = [textPart];

    return {
      jsonrpc: "2.0",
      id: request.id,
      result: { role: RoleEnum.Agent, parts }
    };
  }

  async *onMessageStream(_request: SendMessageStreamingRequest, _task?: Task): AsyncGenerator<SendMessageStreamingResponse, void, unknown> {
    yield {
      jsonrpc: "2.0",
      error: { code: -32604, message: "Streaming not supported" },
      id: _request.id
    };
  }

  async onCancel(request: CancelTaskRequest, task: Task): Promise<CancelTaskResponse> {
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32604, message: "Cancel not supported" }
    };
  }

  async *onResubscribe(_request: TaskResubscriptionRequest, _task: Task): AsyncGenerator<SendMessageStreamingResponse, void, unknown> {
    yield {
      jsonrpc: "2.0",
      error: { code: -32604, message: "Resubscribe not supported" },
      id: _request.id
    };
  }

  private extractCity(request: SendMessageRequest): string | null {
    const params = (request as { params?: { message?: { parts?: { text?: string }[] } } }).params;
    if (!params?.message?.parts?.[0]) return null;
    const text = params.message.parts[0].text;
    if (text) return text;
    try {
      const parsed = JSON.parse(text!);
      return typeof parsed.city === "string" ? parsed.city : null;
    } catch {
      return null;
    }
  }

  private toWeatherJson(weather: WeatherResult): Record<string, unknown> {
    return {
      city: weather.city,
      temperature: weather.temperature,
      feelsLike: weather.feelsLike,
      humidity: weather.humidity,
      wind: weather.wind,
      forecast: weather.forecast,
      source: weather.source
    };
  }
}
