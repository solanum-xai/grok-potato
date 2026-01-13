/**
 * Grok Solanum Type Definitions
 *
 * These types define the core data structures used throughout the system.
 */

// =============================================================================
// Sensor Types
// =============================================================================

export interface SensorReading {
  id: number;
  temperature: number;
  humidity: number;
  createdAt: Date;
}

export interface SensorData {
  temperature: number;
  humidity: number;
  timestamp: string;
  error: string | null;
}

// =============================================================================
// Grok Analysis Types
// =============================================================================

export type SoilAssessment = 'dry' | 'moist' | 'wet' | 'unknown';
export type LightAssessment = 'dark' | 'low' | 'adequate' | 'bright';
export type ActionType = 'water' | 'light_on' | 'light_off' | 'none';

export interface Action {
  type: ActionType;
  reason: string;
  execute: boolean;
}

export interface GrokAnalysis {
  id: number;
  healthScore: number;
  observations: string[];
  issues: string[];
  soilAssessment: SoilAssessment;
  lightAssessment: LightAssessment;
  actions: Action[];
  message: string;
  detailedThoughts: string;
  imageBase64?: string;
  createdAt: Date;
}

export interface GrokAnalysisResponse {
  health_score: number;
  observations: string[];
  issues: string[];
  soil_assessment: SoilAssessment;
  light_assessment: LightAssessment;
  actions: Action[];
  message: string;
  detailed_thoughts: string;
}

// =============================================================================
// Command Types
// =============================================================================

export interface Command {
  id: number;
  commandType: ActionType;
  reason: string;
  success: boolean;
  error: string | null;
  createdAt: Date;
}

// =============================================================================
// Chat Types
// =============================================================================

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: number;
  role: ChatRole;
  content: string;
  createdAt: Date;
}

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  response: string;
  createdAt: Date;
}

// =============================================================================
// Pi Service Types
// =============================================================================

export interface RelayState {
  light: boolean;
  water: boolean;
}

export interface PiStatus {
  status: 'online' | 'offline' | 'error';
  sensors: SensorData | null;
  relays: RelayState | null;
  timestamp: string;
}

export interface RelayCommand {
  state: boolean;
}

// =============================================================================
// WebSocket Event Types
// =============================================================================

export type WebSocketEventType =
  | 'sensor_update'
  | 'analysis_update'
  | 'command_executed'
  | 'chat_message';

export interface WebSocketEvent<T = unknown> {
  type: WebSocketEventType;
  data: T;
}

export interface SensorUpdateEvent extends WebSocketEvent<SensorData> {
  type: 'sensor_update';
}

export interface AnalysisUpdateEvent extends WebSocketEvent<GrokAnalysis> {
  type: 'analysis_update';
}

export interface CommandExecutedEvent extends WebSocketEvent<Command> {
  type: 'command_executed';
}

export interface ChatMessageEvent extends WebSocketEvent<ChatMessage> {
  type: 'chat_message';
}

// =============================================================================
// API Response Types
// =============================================================================

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
}

export interface StateResponse {
  analysis: GrokAnalysis | null;
  recentSensors: SensorReading[];
  piStatus: PiStatus;
}

export interface HistoryQuery {
  hours?: number;
}

export interface PaginationQuery {
  limit?: number;
}

export interface ErrorResponse {
  error: string;
  statusCode: number;
}

// =============================================================================
// Configuration Types
// =============================================================================

export interface BackendConfig {
  xaiApiKey: string;
  piTunnelUrl: string;
  databaseUrl: string;
  apiSecret?: string;
  captureApiKey?: string;
  port: number;
  host: string;
}

export interface SchedulerConfig {
  lightOnHour: number;
  lightOffHour: number;
  dayIntervalMinutes: number;
  nightIntervalMinutes: number;
  sensorIntervalMinutes: number;
}
