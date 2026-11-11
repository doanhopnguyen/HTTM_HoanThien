export type Role = "ADMIN" | "STAFF";
export type IncidentStatus =
  "NEW" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED" | "FALSE_ALARM";
export type CameraStatus = "ONLINE" | "OFFLINE" | "DISABLED";
export type AiModel = "NONE" | "YOLO26N" | "ULTRALYTICS" | "REFERENCE";
export interface AiRuntimeStatus {
  cameraId: string;
  state: "LOADING" | "RUNNING" | "ERROR" | "STOPPED" | "FINISHED";
  message: string;
  frames: number;
  detections: number;
  updatedAt: string;
}
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
  sourceType?: "STREAM" | "LOCAL_VIDEO";
  aiModel?: AiModel;
  modelAsset?: string | null;
  aiConfidence?: number;
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
  resolved: number;
  falseAlarms: number;
  active: number;
}
export interface Report {
  total: number;
  resolved: number;
  falseAlarms: number;
  active: number;
  /** Acknowledged → resolved. */
  averageHandlingSeconds: number | null;
  /** Created → acknowledged. */
  averageResponseSeconds: number | null;
  /** Created → resolved or false alarm. */
  averageResolutionSeconds: number | null;
}
export interface AuditLog {
  id: string;
  userId: string | null;
  username: string | null;
  userFullName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string | null;
  createdAt: string;
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
/** True when an incident is assigned to someone other than `user`. */
export function handledByOther(incident: Incident, user: User): boolean {
  return !!incident.handledBy && incident.handledBy.id !== user.id;
}
/**
 * Actions the backend will accept from `user`. The handler continues their own incident; an
 * ADMIN may additionally close (resolve / false alarm) an incident someone else is handling.
 */
export function incidentActions(
  incident: Incident,
  user: User,
  staffFalseAlarm: boolean,
): IncidentAction[] {
  const falseAlarm = user.role === "ADMIN" || staffFalseAlarm;
  if (handledByOther(incident, user)) {
    if (user.role !== "ADMIN") return [];
    if (incident.status === "ACKNOWLEDGED") return ["resolve", "false-alarm"];
    return incident.status === "IN_PROGRESS" ? ["resolve"] : [];
  }
  if (incident.status === "NEW")
    return falseAlarm ? ["acknowledge", "false-alarm"] : ["acknowledge"];
  if (incident.status === "ACKNOWLEDGED")
    return falseAlarm
      ? ["start", "resolve", "false-alarm"]
      : ["start", "resolve"];
  return incident.status === "IN_PROGRESS" ? ["resolve"] : [];
}
/** Actions that require a note (resolution or false-alarm reason). */
export const noteActions: IncidentAction[] = ["resolve", "false-alarm"];
export const actionLabels: Record<IncidentAction, string> = {
  acknowledge: "Acknowledge",
  start: "Start handling",
  resolve: "Resolve",
  "false-alarm": "False alarm",
};
/** Single source of brand colours and layout scale for Desktop (CSS variables) and Mobile. */
export const theme = {
  primary: "#2563eb",
  primarySoft: "#eff6ff",
  critical: "#dc2626",
  criticalSoft: "#fef2f2",
  criticalBorder: "#fecaca",
  warning: "#d97706",
  warningSoft: "#fffbeb",
  success: "#16a34a",
  successSoft: "#f0fdf4",
  neutral: "#64748b",
  neutralSoft: "#f1f5f9",
  text: "#172b4d",
  muted: "#64748b",
  background: "#f1f5f9",
  surface: "#ffffff",
  border: "#e2e8f0",
  onPrimary: "#ffffff",
  overlay: "rgba(15, 23, 42, 0.55)",
} as const;
export type ThemeColor = keyof typeof theme;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;
/** Colour tone per status, shared by every StatusBadge. */
export type Tone = "critical" | "warning" | "primary" | "success" | "neutral";
export const statusTone: Record<IncidentStatus | CameraStatus, Tone> = {
  NEW: "critical",
  ACKNOWLEDGED: "warning",
  IN_PROGRESS: "primary",
  RESOLVED: "success",
  FALSE_ALARM: "neutral",
  ONLINE: "success",
  OFFLINE: "critical",
  DISABLED: "neutral",
};
export const toneColors: Record<Tone, { fg: string; bg: string }> = {
  critical: { fg: theme.critical, bg: theme.criticalSoft },
  warning: { fg: theme.warning, bg: theme.warningSoft },
  primary: { fg: theme.primary, bg: theme.primarySoft },
  success: { fg: theme.success, bg: theme.successSoft },
  neutral: { fg: theme.neutral, bg: theme.neutralSoft },
};
/** Human label for incident history actions, including administrator overrides. */
export const historyLabels: Record<string, string> = {
  DETECTED: "Detection received",
  ACKNOWLEDGED: "Acknowledged",
  STARTED: "Started handling",
  RESOLVED: "Resolved",
  MARKED_FALSE_ALARM: "Marked false alarm",
  ADMIN_OVERRIDE_RESOLVED: "Resolved by administrator (override)",
  ADMIN_OVERRIDE_FALSE_ALARM: "False alarm by administrator (override)",
};
export function historyLabel(action: string): string {
  return historyLabels[action] ?? action.replaceAll("_", " ").toLowerCase();
}
