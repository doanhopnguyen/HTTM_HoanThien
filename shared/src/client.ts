import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type {
  Session,
  User,
  Camera,
  Incident,
  IncidentAction,
  IncidentHistory,
  Notification,
  DashboardSummary,
  PageResponse,
  DayStatistic,
  CameraStatistic,
  Report,
  Capabilities,
} from "./types";

export interface SessionStorage {
  load(): Promise<string | null>;
  save(token: string | null): Promise<void>;
}
export interface ClientOptions {
  baseUrl: () => string;
  storage: SessionStorage;
}
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error))
    return (
      error.response?.data?.message ||
      "Cannot connect to the server. Check your connection and backend address."
    );
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred";
}
type RetryConfig = InternalAxiosRequestConfig & { retried?: boolean };
export function createClient(options: ClientOptions) {
  let session: Session | null = null;
  let refreshing: Promise<Session> | null = null;
  let generation = 0;
  let persist = true;
  const listeners = new Set<(value: Session | null) => void>();
  const http = axios.create({ timeout: 15000 });
  const setSession = (value: Session | null) => {
    session = value;
    listeners.forEach((listener) => listener(value));
  };
  async function clear() {
    generation++;
    setSession(null);
    await options.storage.save(null);
  }
  async function rotate(token?: string) {
    if (refreshing) return refreshing;
    const currentGeneration = generation;
    const raw = token || session?.refreshToken;
    if (!raw) throw new Error("Please sign in again");
    const pending = (async () => {
      try {
        const response = await axios.post<Session>(
          `${options.baseUrl()}/api/auth/refresh`,
          { refreshToken: raw },
          { timeout: 15000 },
        );
        if (generation !== currentGeneration) throw new Error("Session ended");
        await options.storage.save(persist ? response.data.refreshToken : null);
        setSession(response.data);
        return response.data;
      } catch (error) {
        if (generation === currentGeneration) await clear();
        throw error;
      }
    })();
    refreshing = pending;
    try {
      return await pending;
    } finally {
      if (refreshing === pending) refreshing = null;
    }
  }
  http.interceptors.request.use((config) => {
    config.baseURL = options.baseUrl();
    if (session) config.headers.Authorization = `Bearer ${session.accessToken}`;
    return config;
  });
  http.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as RetryConfig | undefined;
      if (
        error.response?.status !== 401 ||
        !config ||
        config.retried ||
        !session
      )
        throw error;
      config.retried = true;
      // Another request may have already replaced the stale token.
      if (config.headers.Authorization === `Bearer ${session.accessToken}`)
        await rotate();
      return http(config);
    },
  );
  const get = async <T>(url: string, params?: object) =>
    (await http.get<T>(url, { params })).data;
  const patch = async <T>(url: string, body?: object) =>
    (await http.patch<T>(url, body)).data;
  const page = <T>(url: string, params?: object) =>
    get<PageResponse<T>>(url, params);
  return {
    session: () => session,
    subscribe(listener: (value: Session | null) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    auth: {
      async login(username: string, password: string, remember = true) {
        const result = await axios.post<Session>(
          `${options.baseUrl()}/api/auth/login`,
          { username, password },
          { timeout: 15000 },
        );
        generation++;
        persist = remember;
        await options.storage.save(remember ? result.data.refreshToken : null);
        setSession(result.data);
        return result.data;
      },
      async restore() {
        const token = await options.storage.load();
        if (token) await rotate(token);
      },
      rotate,
      async logout() {
        const raw = session?.refreshToken;
        try {
          if (raw) await http.post("/api/auth/logout", { refreshToken: raw });
        } finally {
          await clear();
        }
      },
      async changePassword(currentPassword: string, newPassword: string) {
        await http.post("/api/auth/change-password", {
          currentPassword,
          newPassword,
        });
        await clear();
      },
      me: () => get<User>("/api/auth/me"),
      clear,
    },
    cameras: {
      list: (params?: object) => page<Camera>("/api/cameras", params),
      get: (id: string) => get<Camera>(`/api/cameras/${id}`),
      create: async (body: object) =>
        (await http.post<Camera>("/api/cameras", body)).data,
      update: (id: string, body: object) =>
        patch<Camera>(`/api/cameras/${id}`, body),
      monitoring: (id: string, enabled: boolean) =>
        patch<Camera>(`/api/cameras/${id}/monitoring`, { enabled }),
      status: (id: string, status: string) =>
        patch<Camera>(`/api/cameras/${id}/status`, { status }),
      remove: async (id: string) => {
        await http.delete(`/api/cameras/${id}`);
      },
    },
    users: {
      list: (params?: object) => page<User>("/api/users", params),
      staff: () => page<User>("/api/users/staff", { size: 100 }),
      create: async (body: object) =>
        (await http.post<User>("/api/users", body)).data,
      update: (id: string, body: object) =>
        patch<User>(`/api/users/${id}`, body),
      status: (id: string, status: string) =>
        patch<User>(`/api/users/${id}/status`, { status }),
    },
    incidents: {
      list: (params?: object) => page<Incident>("/api/incidents", params),
      get: (id: string) => get<Incident>(`/api/incidents/${id}`),
      history: (id: string, params?: object) =>
        page<IncidentHistory>(`/api/incidents/${id}/history`, params),
      action: (id: string, action: IncidentAction, note?: string) =>
        patch<Incident>(
          `/api/incidents/${id}/${action}`,
          note ? { note } : undefined,
        ),
    },
    notifications: {
      list: (params?: object) =>
        page<Notification>("/api/notifications", params),
      count: async () =>
        (await get<{ count: number }>("/api/notifications/unread-count")).count,
      read: (id: string) =>
        patch<Notification>(`/api/notifications/${id}/read`),
      readAll: () => patch<void>("/api/notifications/read-all"),
    },
    dashboard: {
      summary: () => get<DashboardSummary>("/api/dashboard/summary"),
      recent: () => page<Incident>("/api/dashboard/recent-incidents"),
      statistics: (days = 7) =>
        get<DayStatistic[]>("/api/dashboard/incident-statistics", { days }),
      cameras: (days = 30) =>
        get<CameraStatistic[]>("/api/dashboard/camera-statistics", { days }),
      report: (days = 30) => get<Report>("/api/dashboard/report", { days }),
    },
    capabilities: () => get<Capabilities>("/api/capabilities"),
    audit: (params?: object) =>
      page<{
        id: string;
        action: string;
        description: string;
        createdAt: string;
      }>("/api/audit-logs", params),
  };
}
export type ApiClient = ReturnType<typeof createClient>;
