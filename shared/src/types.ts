export type Role = "ADMIN" | "STAFF";
export type IncidentStatus =
  "NEW" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED" | "FALSE_ALARM";
export type CameraStatus = "ONLINE" | "OFFLINE" | "DISABLED";
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
}
export interface Camera {
  id: string;
  code: string;
  name: string;
  locationDescription: string | null;
  streamUrl: string | null;
  streamUrlMasked: string | null;
  status: CameraStatus;
  monitoringEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface DetectionEvent {
  id: string;
  cameraId: string;
  eventType: string;
  confidence: number | null;
  snapshotUrl: string | null;
  videoUrl: string | null;
  detectedAt: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}
export interface Incident {
  id: string;
  detectionEvent: DetectionEvent;
  camera: Camera;
  status: IncidentStatus;
  handledBy: User | null;
  acknowledgedAt: string | null;
  startedAt: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface IncidentHistory {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  performedBy: User | null;
  note: string | null;
  createdAt: string;
}
export interface Notification {
  id: string;
  incidentId: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}
export interface DashboardSummary {
  totalCameras: number;
  onlineCameras: number;
  offlineCameras: number;
  monitoringCameras: number;
  activeIncidents: number;
  incidentsToday: number;
  resolvedToday: number;
  falseAlarmToday: number;
}
export interface DayStatistic {
  date: string;
  total: number;
  resolved: number;
  falseAlarms: number;
}
export interface CameraStatistic {
  cameraId: string;
  name: string;
  status: CameraStatus;
  incidents: number;
}
export interface Report {
  total: number;
  resolved: number;
  falseAlarms: number;
  averageHandlingSeconds: number | null;
}
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
  first: boolean;
}
export interface ApiResponse {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  path: string;
}
export interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
}
export interface Capabilities {
  staffFalseAlarm: boolean;
  timezone: string;
}
export interface RealtimeEvent {
  type: string;
  timestamp?: string;
  data?: unknown;
}
export type IncidentAction =
  "acknowledge" | "start" | "resolve" | "false-alarm";
export const activeStatuses: IncidentStatus[] = [
  "NEW",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
];
export function incidentActions(
  incident: Incident,
  user: User,
  staffFalseAlarm: boolean,
): IncidentAction[] {
  if (incident.handledBy && incident.handledBy.id !== user.id) return [];
  const falseAlarm = user.role === "ADMIN" || staffFalseAlarm;
  if (incident.status === "NEW")
    return falseAlarm ? ["acknowledge", "false-alarm"] : ["acknowledge"];
  if (incident.status === "ACKNOWLEDGED")
    return falseAlarm
      ? ["start", "resolve", "false-alarm"]
      : ["start", "resolve"];
  return incident.status === "IN_PROGRESS" ? ["resolve"] : [];
}
export const actionLabels: Record<IncidentAction, string> = {
  acknowledge: "Acknowledge",
  start: "Start handling",
  resolve: "Resolve",
  "false-alarm": "False alarm",
};
export const theme = {
  primary: "#2563eb",
  critical: "#dc2626",
  warning: "#d97706",
  success: "#16a34a",
  text: "#172b4d",
  muted: "#64748b",
  background: "#f1f5f9",
  surface: "#ffffff",
  border: "#e2e8f0",
};
