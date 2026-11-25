import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import type { ImageFilters } from "../types";

export const queryKeys = {
  dashboard: ["dashboard"] as const,
  storage: ["storage-status"] as const,
  health: ["health"] as const,
  images: (filters: ImageFilters) => ["images", filters] as const,
  image: (id: number) => ["image", id] as const,
  albums: ["albums"] as const,
  album: (id: number) => ["album", id] as const,
};

export function useDashboard(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: api.dashboard,
    enabled,
    staleTime: 20_000,
  });
}

export function useStorageStatus(enabled = true) {
  return useQuery({
    queryKey: queryKeys.storage,
    queryFn: api.storageStatus,
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: api.health,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function useImages(filters: ImageFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.images(filters),
    queryFn: () => api.images.list(filters),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useImage(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.image(id ?? 0),
    queryFn: () => api.images.get(id as number),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useAlbums(sort: "recent" | "name" | "images" = "recent") {
  return useQuery({
    queryKey: [...queryKeys.albums, sort],
    queryFn: () => api.albums.list(sort),
    staleTime: 30_000,
  });
}

export function useAlbum(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.album(id ?? 0),
    queryFn: () => api.albums.get(id as number),
    enabled: Boolean(id),
    staleTime: 20_000,
  });
}

export function useDeleteImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.images.remove(id),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

/** Refresh every library-derived query after a write. */
export function useLibraryRefresh() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["images"] });
    void queryClient.invalidateQueries({ queryKey: ["image"] });
    void queryClient.invalidateQueries({ queryKey: ["albums"] });
    void queryClient.invalidateQueries({ queryKey: ["album"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    void queryClient.invalidateQueries({ queryKey: queryKeys.storage });
  };
}
