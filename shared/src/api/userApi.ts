import type { Role, User } from "../types";
import type { Http, PageParams } from "./http";

export interface UserFilter extends PageParams {
  role?: Role;
  status?: User["status"];
  search?: string;
}
export interface UserInput {
  username?: string;
  email?: string;
  password?: string;
  fullName?: string;
  role?: Role;
}
export function userApi(http: Http) {
  return {
    list: (params?: UserFilter) => http.page<User>("/api/users", params),
    /** Active staff only, for handler pickers. */
    staff: () => http.page<User>("/api/users/staff", { size: 100 }),
    get: (id: string) => http.get<User>(`/api/users/${id}`),
    create: (body: UserInput) => http.post<User>("/api/users", body),
    update: (id: string, body: UserInput) =>
      http.patch<User>(`/api/users/${id}`, body),
    status: (id: string, status: User["status"]) =>
      http.patch<User>(`/api/users/${id}/status`, { status }),
    resetPassword: (id: string, newPassword: string) =>
      http.patch<void>(`/api/users/${id}/password`, { newPassword }),
  };
}
