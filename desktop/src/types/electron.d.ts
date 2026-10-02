export {};
declare global {
  interface Window {
    poolSafety: {
      loadToken(): Promise<string | null>;
      saveToken(token: string | null): Promise<void>;
      loadConfig(): Promise<{ baseUrl: string }>;
      saveConfig(baseUrl: string): Promise<void>;
    };
  }
}
