import type { Notification } from "../types";
import type { Http, PageParams } from "./http";

export function notificationApi(http: Http) {
  return {
    list: (params?: PageParams) =>
      http.page<Notification>("/api/notifications", params),
    count: async () =>
      (await http.get<{ count: number }>("/api/notifications/unread-count"))
        .count,
    read: (id: string) =>
      http.patch<Notification>(`/api/notifications/${id}/read`),
    readAll: () => http.patch<void>("/api/notifications/read-all"),
  };
}
