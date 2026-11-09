import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { Capabilities } from "./types";
import {
  createHttp,
  createSessionManager,
  authApi,
  cameraApi,
  userApi,
  incidentApi,
  notificationApi,
  dashboardApi,
  auditApi,
  type ClientOptions,
} from "./api";

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
/** Composes the per-feature API modules over one authenticated axios instance. */
export function createClient(options: ClientOptions) {
  const sessions = createSessionManager(options);
  // Repeated keys (status=NEW&status=ACKNOWLEDGED) are what Spring binds to a List parameter.
  const instance = axios.create({
    timeout: 15000,
    paramsSerializer: { indexes: null },
  });
  instance.interceptors.request.use((config) => {
    config.baseURL = options.baseUrl();
    const session = sessions.current();
    if (session) config.headers.Authorization = `Bearer ${session.accessToken}`;
    return config;
  });
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as RetryConfig | undefined;
      const session = sessions.current();
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
        await sessions.rotate();
      return instance(config);
    },
  );
  const http = createHttp(instance);
  return {
    session: sessions.current,
    subscribe: sessions.subscribe,
    auth: authApi(http, sessions),
    cameras: cameraApi(http),
    users: userApi(http),
    incidents: incidentApi(http),
    notifications: notificationApi(http),
    dashboard: dashboardApi(http),
    capabilities: () => http.get<Capabilities>("/api/capabilities"),
    audit: auditApi(http),
  };
}
export type ApiClient = ReturnType<typeof createClient>;
