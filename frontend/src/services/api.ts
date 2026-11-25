import type {
  Album,
  AlbumDetail,
  AuthResponse,
  DashboardStats,
  HealthStatus,
  ImageFilters,
  ImageItem,
  ImageList,
  StorageStatus,
  ThemePreference,
  User,
} from "../types";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";
const TOKEN_KEY = "aeropix.token";

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage may be unavailable in private mode */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* noop */
    }
  },
};

function notifyUnauthorized(): void {
  window.dispatchEvent(new CustomEvent("aeropix:unauthorized"));
}

async function parseError(response: Response): Promise<ApiError> {
  let detail = `Request failed with status ${response.status}.`;
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") {
      detail = body.detail;
    } else if (Array.isArray(body?.detail) && body.detail[0]?.msg) {
      detail = String(body.detail[0].msg);
    }
  } catch {
    /* non-JSON error */
  }
  return new ApiError(response.status, detail);
}

interface RequestOptions extends RequestInit {
  skipUnauthorizedEvent?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipUnauthorizedEvent, ...init } = options;
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");
  const token = tokenStore.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Cannot reach the AEROPIX API. Is the backend running?");
  }

  if (response.status === 401 && !skipUnauthorizedEvent) {
    notifyUnauthorized();
  }
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function queryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const api = {
  auth: {
    register(payload: { name: string; email: string; password: string }): Promise<AuthResponse> {
      return request("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
        skipUnauthorizedEvent: true,
      });
    },
    login(payload: { email: string; password: string }): Promise<AuthResponse> {
      return request("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
        skipUnauthorizedEvent: true,
      });
    },
    me(): Promise<User> {
      return request("/auth/me");
    },
    updateProfile(payload: { name?: string; theme?: ThemePreference }): Promise<User> {
      return request("/auth/me", { method: "PATCH", body: JSON.stringify(payload) });
    },
    changePassword(payload: { current_password: string; new_password: string }): Promise<{ message: string }> {
      return request("/auth/change-password", { method: "POST", body: JSON.stringify(payload) });
    },
    logout(): Promise<{ message: string }> {
      return request("/auth/logout", { method: "POST" });
    },
  },

  images: {
    list(filters: ImageFilters = {}): Promise<ImageList> {
      return request(`/images${queryString(filters as Record<string, unknown>)}`);
    },
    get(id: number): Promise<ImageItem> {
      return request(`/images/${id}`);
    },
    update(
      id: number,
      payload: { original_filename?: string; is_favorite?: boolean },
    ): Promise<ImageItem> {
      return request(`/images/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
    },
    remove(id: number): Promise<{ message: string }> {
      return request(`/images/${id}`, { method: "DELETE" });
    },
    bulkRemove(ids: number[]): Promise<{ message: string; deleted: number; errors: string[] }> {
      return request("/images/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ image_ids: ids }),
      });
    },
  },

  albums: {
    list(sort: "recent" | "name" | "images" = "recent"): Promise<Album[]> {
      return request(`/albums?sort=${sort}`);
    },
    get(id: number): Promise<AlbumDetail> {
      return request(`/albums/${id}`);
    },
    create(payload: { name: string; description?: string }): Promise<Album> {
      return request("/albums", { method: "POST", body: JSON.stringify(payload) });
    },
    update(id: number, payload: { name?: string; description?: string }): Promise<Album> {
      return request(`/albums/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
    },
    remove(id: number): Promise<{ message: string }> {
      return request(`/albums/${id}`, { method: "DELETE" });
    },
    addImages(id: number, imageIds: number[]): Promise<AlbumDetail> {
      return request(`/albums/${id}/images`, {
        method: "POST",
        body: JSON.stringify({ image_ids: imageIds }),
      });
    },
    removeImage(id: number, imageId: number): Promise<{ message: string }> {
      return request(`/albums/${id}/images/${imageId}`, { method: "DELETE" });
    },
  },

  dashboard(): Promise<DashboardStats> {
    return request("/dashboard");
  },

  storageStatus(): Promise<StorageStatus> {
    return request("/storage/status");
  },

  health(): Promise<HealthStatus> {
    return request("/health", { skipUnauthorizedEvent: true });
  },
};

/**
 * XMLHttpRequest is used for uploads so real per-file progress can be shown.
 * Fetch does not expose upload progress in browsers.
 */
export function uploadImage(
  file: File,
  albumId: number | null,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<ImageItem> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/images`);
    const token = tokenStore.get();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Accept", "application/json");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      let body: any = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as ImageItem);
        return;
      }
      if (xhr.status === 401) notifyUnauthorized();
      const detail =
        typeof body?.detail === "string"
          ? body.detail
          : body?.detail?.[0]?.msg ?? `Upload failed (${xhr.status}).`;
      reject(new ApiError(xhr.status, detail));
    };
    xhr.onerror = () => reject(new ApiError(0, "Network error while uploading. Check your connection."));
    xhr.onabort = () => reject(new ApiError(0, "Upload cancelled."));

    if (signal) {
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    const form = new FormData();
    form.append("file", file, file.name);
    if (albumId) form.append("album_id", String(albumId));
    xhr.send(form);
  });
}
