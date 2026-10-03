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
import { WeatherResult } from "../shared/schema";

// WeatherHandler: converts city name to dummy WeatherResult
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
    };
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

    const weather = this.handler.generateDummyWeather(city);
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
      forecast: weather.forecast
    };
  }
}
