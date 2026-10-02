import type { ApiClient } from "./client";
import type { RealtimeEvent } from "./types";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";
export class RealtimeClient {
  private socket: WebSocket | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = true;
  private attempts = 0;
  constructor(
    private api: ApiClient,
    private baseUrl: () => string,
    private onEvent: (event: RealtimeEvent) => void,
    private onStatus: (status: ConnectionStatus) => void,
    private onSync: () => void,
  ) {}
  start() {
    this.stop();
    this.stopped = false;
    void this.connect();
  }
  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this.onStatus("disconnected");
  }
  private async connect() {
    if (this.stopped || !this.api.session()) return;
    this.onStatus("connecting");
    try {
      if (this.attempts > 0) await this.api.auth.rotate();
      if (this.stopped || !this.api.session()) return;
      const socket = new WebSocket(
        this.baseUrl().replace(/^http/, "ws") + "/ws",
      );
      this.socket = socket;
      socket.onopen = () =>
        socket.send(
          JSON.stringify({
            type: "AUTH",
            token: this.api.session()?.accessToken,
          }),
        );
      socket.onmessage = (message) => {
        if (socket !== this.socket || this.stopped) return;
        try {
          const event: RealtimeEvent = JSON.parse(String(message.data));
          if (event.type === "AUTHENTICATED") {
            this.attempts = 0;
            this.onStatus("connected");
            this.onSync();
          } else if (event.type !== "HEARTBEAT") this.onEvent(event);
        } catch {
          /* Invalid messages never replace application state. */
        }
      };
      socket.onclose = () => {
        if (socket === this.socket) this.reconnect();
      };
      socket.onerror = () => socket.close();
    } catch {
      this.reconnect();
    }
  }
  private reconnect() {
    this.onStatus("disconnected");
    if (this.stopped || !this.api.session()) return;
    this.attempts++;
    this.timer = setTimeout(
      () => void this.connect(),
      Math.min(1000 * 2 ** Math.min(this.attempts, 5), 30000),
    );
  }
}
