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

export type WeatherSource = "real" | "dummy";

export interface WeatherResult {
  city: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  wind: WindData;
  forecast: ForecastDay[];
  source: WeatherSource;
}

// Method-specific types

export type WeatherAgentRequest = JsonRpcRequest<WeatherRequestParams>;
export type WeatherAgentSuccessResponse = JsonRpcSuccess<WeatherResult>;
export type WeatherAgentResponse = WeatherAgentSuccessResponse | JsonRpcError;
