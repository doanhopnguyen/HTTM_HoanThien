import type { AxiosInstance } from "axios";
import type { PageResponse } from "../types";

/** Thin typed helpers over the authenticated axios instance, shared by every feature API. */
export function createHttp(http: AxiosInstance) {
  const get = async <T>(url: string, params?: object) =>
    (await http.get<T>(url, { params })).data;
  return {
    get,
    page: <T>(url: string, params?: object) =>
      get<PageResponse<T>>(url, params),
    post: async <T>(url: string, body?: object) =>
      (await http.post<T>(url, body)).data,
    patch: async <T>(url: string, body?: object) =>
      (await http.patch<T>(url, body)).data,
    remove: async (url: string) => {
      await http.delete(url);
    },
  };
}
export type Http = ReturnType<typeof createHttp>;
/** Query parameters common to paged list endpoints. */
export interface PageParams {
  page?: number;
  size?: number;
}
