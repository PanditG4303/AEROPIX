export type ThemePreference = "light" | "dark" | "system";

export interface User {
  id: number;
  name: string;
  email: string;
  theme: ThemePreference;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface AlbumRef {
  id: number;
  name: string;
}

export interface ImageItem {
  id: number;
  original_filename: string;
  mime_type: string;
  extension: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  is_favorite: boolean;
  is_demo: boolean;
  created_at: string;
  albums: AlbumRef[];
  url: string | null;
  thumbnail_url: string | null;
  storage_backend: "local" | "s3";
  storage_provider: string;
  object_key: string;
}

export interface ImageList {
  items: ImageItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface Album {
  id: number;
  name: string;
  description: string | null;
  image_count: number;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlbumDetail extends Album {
  images: ImageItem[];
}

export interface ActivityPoint {
  date: string;
  uploads: number;
}

export interface TypeUsage {
  type: string;
  count: number;
  bytes: number;
}

export interface DashboardStats {
  total_images: number;
  total_albums: number;
  total_favorites: number;
  storage_used_bytes: number;
  storage_quota_bytes: number;
  storage_used_percent: number;
  recent_uploads: ImageItem[];
  recent_albums: Album[];
  activity: ActivityPoint[];
  storage_by_type: TypeUsage[];
  largest_image_bytes: number;
}

export interface StorageStatus {
  backend: "local" | "s3";
  provider: string;
  mode: string;
  configured: boolean;
  reachable: boolean | null;
  health_detail: string;
  latency_ms: number | null;
  bucket: string | null;
  region: string | null;
  encryption: string;
  presign_ttl_seconds: number;
  max_upload_mb: number;
  quota_mb: number;
  allowed_types: string[];
  private: boolean;
  prefix?: string | null;
  local_path?: string | null;
}

export interface HealthStatus {
  status: string;
  app: string;
  version: string;
  environment: string;
  storage_backend: "local" | "s3";
  database: string;
  time: string;
  demo_enabled: boolean;
}

export interface ImageFilters {
  search?: string;
  album_id?: number;
  file_type?: string;
  favorite?: boolean;
  sort?: "newest" | "oldest" | "name_asc" | "name_desc" | "size_desc" | "size_asc";
  limit?: number;
  offset?: number;
}
