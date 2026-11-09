import axios from "axios";
import type { Session, User } from "../types";
import type { Http } from "./http";

export interface SessionStorage {
  load(): Promise<string | null>;
  save(token: string | null): Promise<void>;
}
export interface ClientOptions {
  baseUrl: () => string;
  storage: SessionStorage;
}
/**
 * True when the request could not reach the server at all (offline, DNS, connection refused).
 * Such failures keep the stored session: the refresh token was never presented, so it is still valid.
 *
 * A timeout is deliberately excluded: the server may have rotated the token before the response
 * was lost, leaving the stored token revoked. Retrying with it would fail later and less clearly,
 * so a timeout ends the session like a rejection.
 */
export function isNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error) || error.response) return false;
  return error.code !== "ECONNABORTED" && error.code !== "ETIMEDOUT";
}
/** Session state, refresh-token rotation and auth endpoints. */
export function createSessionManager(options: ClientOptions) {
  let session: Session | null = null;
  let refreshing: Promise<Session> | null = null;
  let generation = 0;
  let persist = true;
  const listeners = new Set<(value: Session | null) => void>();
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
        // Only a server rejection ends the session; a network failure keeps it for a later retry.
        if (generation === currentGeneration && !isNetworkError(error))
          await clear();
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
  return {
    current: () => session,
    subscribe(listener: (value: Session | null) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    rotate,
    clear,
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
    /** Restores a saved session. Throws a network error (see isNetworkError) when offline. */
    async restore() {
      const token = await options.storage.load();
      if (token) await rotate(token);
    },
  };
}
export type SessionManager = ReturnType<typeof createSessionManager>;
export function authApi(http: Http, sessions: SessionManager) {
  return {
    login: sessions.login,
    restore: sessions.restore,
    rotate: sessions.rotate,
    clear: sessions.clear,
    async logout() {
      const raw = sessions.current()?.refreshToken;
      try {
        if (raw) await http.post("/api/auth/logout", { refreshToken: raw });
      } finally {
        await sessions.clear();
      }
    },
    async changePassword(currentPassword: string, newPassword: string) {
      await http.post("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      await sessions.clear();
    },
    me: () => http.get<User>("/api/auth/me"),
  };
}
