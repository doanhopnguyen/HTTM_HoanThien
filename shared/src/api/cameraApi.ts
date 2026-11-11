import type { Camera, CameraStatus, AiModel, AiRuntimeStatus } from "../types";
import type { Http, PageParams } from "./http";

export interface CameraFilter extends PageParams {
  status?: CameraStatus;
  search?: string;
}
export interface CameraInput {
  code?: string;
  name?: string;
  locationDescription?: string | null;
  streamUrl?: string | null;
  status?: CameraStatus;
  monitoringEnabled?: boolean;
  aiModel?: AiModel;
  modelAsset?: string | null;
  aiConfidence?: number;
}
export function cameraApi(http: Http) {
  return {
    uploadVideo: (file: File) =>
      http.upload<{ id: string; name: string }>("/api/media/videos", file),
    uploadModel: (file: File) =>
      http.upload<{ id: string; name: string }>("/api/media/models", file),
    aiStatus: () => http.get<AiRuntimeStatus[]>("/api/ai/status"),
    list: (params?: CameraFilter) => http.page<Camera>("/api/cameras", params),
    online: (params?: PageParams) =>
      http.page<Camera>("/api/cameras/online", params),
    get: (id: string) => http.get<Camera>(`/api/cameras/${id}`),
    create: (body: CameraInput) => http.post<Camera>("/api/cameras", body),
    update: (id: string, body: CameraInput) =>
      http.patch<Camera>(`/api/cameras/${id}`, body),
    monitoring: (id: string, enabled: boolean) =>
      http.patch<Camera>(`/api/cameras/${id}/monitoring`, { enabled }),
    status: (id: string, status: CameraStatus) =>
      http.patch<Camera>(`/api/cameras/${id}/status`, { status }),
    remove: (id: string) => http.remove(`/api/cameras/${id}`),
  };
}
