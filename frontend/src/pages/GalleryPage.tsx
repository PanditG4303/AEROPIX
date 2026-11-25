import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CheckSquare,
  ChevronDown,
  Grid2X2,
  Heart,
  Images,
  LayoutGrid,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ImageCard } from "../components/gallery/ImageCard";
import { ImagePreviewModal } from "../components/gallery/ImagePreviewModal";
import { EmptyState, PageLoader } from "../components/ui/Feedback";
import { EmptyGalleryArt } from "../components/illustrations/StateArt";
import { ConfirmDialog } from "../components/ui/Modal";
import { useToast } from "../context/ToastContext";
import { useImages, useLibraryRefresh } from "../hooks/useLibrary";
import { usePageTitle } from "../hooks/usePageTitle";
import { api, ApiError } from "../services/api";
import type { ImageFilters, ImageItem } from "../types";

type ViewMode = "masonry" | "grid" | "list";
type SortValue = NonNullable<ImageFilters["sort"]>;

const typeTabs = [
  { label: "All", value: "" },
  { label: "JPG", value: "jpg" },
  { label: "PNG", value: "png" },
  { label: "WEBP", value: "webp" },
  { label: "GIF", value: "gif" },
];

const sortOptions: Array<{ label: string; value: SortValue }> = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
  { label: "Name A → Z", value: "name_asc" },
  { label: "Name Z → A", value: "name_desc" },
  { label: "Largest first", value: "size_desc" },
  { label: "Smallest first", value: "size_asc" },
];

export function GalleryPage() {
  usePageTitle("Gallery");
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const refreshLibrary = useLibraryRefresh();
  const queryClient = useQueryClient();
  const reduced = useReducedMotion();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [fileType, setFileType] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(searchParams.get("favorite") === "true");
  const [sort, setSort] = useState<SortValue>("newest");
  const [view, setView] = useState<ViewMode>("masonry");
  const [limit, setLimit] = useState(48);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<ImageItem | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 320);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const filters = useMemo<ImageFilters>(
    () => ({
      search: search || undefined,
      file_type: fileType || undefined,
      favorite: favoriteOnly || undefined,
      sort,
      limit,
      offset: 0,
    }),
    [search, fileType, favoriteOnly, sort, limit],
  );

  const imagesQuery = useImages(filters);
  const items = imagesQuery.data?.items ?? [];
  const total = imagesQuery.data?.total ?? 0;
  const previewIndex = items.findIndex((image) => image.id === previewId);
  const preview = previewIndex >= 0 ? items[previewIndex] : null;

  const favoriteMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) =>
      api.images.update(id, { is_favorite: value }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["images"] });
      void queryClient.invalidateQueries({ queryKey: ["image"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(variables.value ? "Added to favourites" : "Removed from favourites");
    },
    onError: (error) => {
      toast.error(
        "Could not update favourite",
        error instanceof ApiError ? error.detail : undefined,
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.images.remove(id),
    onSuccess: () => {
      toast.success("Image deleted", "The file and its thumbnail were removed from storage.");
      refreshLibrary();
      setDeleteTarget(null);
      setPreviewId(null);
      setSelected(new Set());
    },
    onError: (error) => {
      toast.error("Image could not be deleted", error instanceof ApiError ? error.detail : undefined);
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (ids: number[]) => api.images.bulkRemove(ids),
    onSuccess: (data) => {
      toast.success(data.message, data.errors.length ? `${data.errors.length} item(s) failed.` : undefined);
      refreshLibrary();
      setBulkConfirm(false);
      setSelectionMode(false);
      setSelected(new Set());
    },
    onError: (error) => {
      toast.error("Bulk delete failed", error instanceof ApiError ? error.detail : undefined);
    },
  });

  const toggleSelected = (id: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allLoadedSelected = items.length > 0 && items.every((item) => selected.has(item.id));

  const toggleSelectAll = () => {
    if (allLoadedSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((item) => item.id)));
    }
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelected(new Set());
  };

  const activeFilterCount =
    Number(Boolean(search)) +
    Number(Boolean(fileType)) +
    Number(favoriteOnly) +
    Number(sort !== "newest");

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setFileType("");
    setFavoriteOnly(false);
    setSort("newest");
    setLimit(48);
  };

  return (
    <div className="page gallery-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Your library</p>
          <h1 className="page-title">
            The <em>gallery.</em>
          </h1>
          <p className="page-subtitle">
            {imagesQuery.isLoading
              ? "Reading your collection…"
              : `${total} photograph${total === 1 ? "" : "s"}${
                  activeFilterCount ? " match your filters" : " in your private library"
                }.`}
          </p>
        </div>
        <div className="page-head__actions">
          {items.length ? (
            <button
              type="button"
              className={`btn btn--ghost ${selectionMode ? "is-active" : ""}`}
              onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
            >
              <CheckSquare size={16} /> {selectionMode ? "Cancel select" : "Select"}
            </button>
          ) : null}
          <Link to="/app/upload" className="btn btn--primary">
            <Plus size={16} /> Add images
          </Link>
        </div>
      </header>

      <section className="gallery-toolbar" aria-label="Gallery filters">
        <div className="gallery-toolbar__row">
          <label className="search-field" aria-label="Search photographs">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setLimit(48);
              }}
              placeholder="Search by filename…"
            />
            {searchInput ? (
              <button type="button" onClick={() => setSearchInput("")} aria-label="Clear search">
                <X size={14} />
              </button>
            ) : null}
          </label>

          <div className="toolbar-actions">
            <button
              type="button"
              className={`toolbar-toggle ${favoriteOnly ? "is-active" : ""}`}
              aria-pressed={favoriteOnly}
              onClick={() => setFavoriteOnly((current) => !current)}
            >
              <Heart size={15} fill={favoriteOnly ? "currentColor" : "none"} />
              <span>Favourites</span>
            </button>

            <label className="sort-select">
              <SlidersHorizontal size={14} aria-hidden="true" />
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortValue)}
                aria-label="Sort photographs"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} aria-hidden="true" />
            </label>

            <div className="view-switch" role="group" aria-label="Gallery layout">
              <button
                type="button"
                className={view === "masonry" ? "is-active" : ""}
                onClick={() => setView("masonry")}
                aria-label="Masonry layout"
                aria-pressed={view === "masonry"}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                className={view === "grid" ? "is-active" : ""}
                onClick={() => setView("grid")}
                aria-label="Grid layout"
                aria-pressed={view === "grid"}
              >
                <Grid2X2 size={15} />
              </button>
              <button
                type="button"
                className={view === "list" ? "is-active" : ""}
                onClick={() => setView("list")}
                aria-label="List layout"
                aria-pressed={view === "list"}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        <div className="gallery-toolbar__row gallery-toolbar__row--filters">
          <div className="type-tabs" role="group" aria-label="Filter by file type">
            {typeTabs.map((tab) => (
              <button
                key={tab.value || "all"}
                type="button"
                className={fileType === tab.value ? "is-active" : ""}
                onClick={() => {
                  setFileType(tab.value);
                  setLimit(48);
                }}
                aria-pressed={fileType === tab.value}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeFilterCount ? (
            <button type="button" className="clear-filters" onClick={clearFilters}>
              Clear {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} <X size={13} />
            </button>
          ) : (
            <span className="gallery-toolbar__hint">
              <Images size={14} /> Images are private — previews use signed links
            </span>
          )}
        </div>
      </section>

      {imagesQuery.isLoading ? (
        <PageLoader label="Unlocking your gallery" />
      ) : imagesQuery.isError ? (
        <div className="panel panel--error">
          <h2>The gallery could not be loaded</h2>
          <p>{imagesQuery.error instanceof Error ? imagesQuery.error.message : "Unknown error."}</p>
          <button type="button" className="btn btn--primary" onClick={() => void imagesQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : !items.length ? (
        <EmptyState
          illustration={<EmptyGalleryArt />}
          eyebrow={activeFilterCount ? "No matches" : "An empty gallery"}
          title={activeFilterCount ? "No photographs match these filters." : "Your walls are still bare."}
          description={
            activeFilterCount
              ? "Try a different filename, file type or sort order — or clear the filters to see your whole library."
              : "Upload your first JPG, PNG, WEBP or GIF. AEROPIX will validate it, create a thumbnail and store it privately."
          }
          actions={
            activeFilterCount ? (
              <button type="button" className="btn btn--ghost" onClick={clearFilters}>
                Clear filters
              </button>
            ) : (
              <Link to="/app/upload" className="btn btn--primary">
                <UploadCloud size={16} /> Upload an image
              </Link>
            )
          }
        />
      ) : (
        <>
          <motion.div
            className={`gallery gallery--${view}`}
            layout={!reduced}
            transition={{ duration: reduced ? 0 : 0.3 }}
          >
            <AnimatePresence initial={false}>
              {items.map((image) => (
                <motion.div
                  key={image.id}
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0, scale: 0.98 }}
                  transition={{ duration: reduced ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className={`gallery__item gallery__item--${view}`}
                >
                  <ImageCard
                    image={image}
                    view={view}
                    selectionMode={selectionMode}
                    selected={selected.has(image.id)}
                    onOpen={() => setPreviewId(image.id)}
                    onToggleSelect={() => toggleSelected(image.id)}
                    onFavorite={() =>
                      favoriteMutation.mutate({ id: image.id, value: !image.is_favorite })
                    }
                    favoriteBusy={
                      favoriteMutation.isPending && favoriteMutation.variables?.id === image.id
                    }
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          <div className="gallery__footer">
            <p>
              Showing {items.length} of {total} photograph{total === 1 ? "" : "s"}
            </p>
            {items.length < total ? (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setLimit((current) => current + 36)}
                disabled={imagesQuery.isFetching}
              >
                {imagesQuery.isFetching ? "Loading…" : "Load more"}
              </button>
            ) : null}
          </div>
        </>
      )}

      {selectionMode ? (
        <div className="selection-bar" role="region" aria-label="Selection actions">
          <span>
            <strong>{selected.size}</strong> selected
          </span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={toggleSelectAll}>
            {allLoadedSelected ? "Deselect all" : "Select all loaded"}
          </button>
          <button
            type="button"
            className="btn btn--danger btn--sm"
            disabled={!selected.size}
            onClick={() => setBulkConfirm(true)}
          >
            <Trash2 size={15} /> Delete selected
          </button>
          <button type="button" className="icon-button" onClick={exitSelection} aria-label="Exit selection">
            <X size={17} />
          </button>
        </div>
      ) : null}

      <ImagePreviewModal
        image={preview}
        onClose={() => setPreviewId(null)}
        onPrevious={
          previewIndex > 0 ? () => setPreviewId(items[previewIndex - 1].id) : undefined
        }
        onNext={
          previewIndex >= 0 && previewIndex < items.length - 1
            ? () => setPreviewId(items[previewIndex + 1].id)
            : undefined
        }
        onFavorite={(image) =>
          favoriteMutation.mutate({ id: image.id, value: !image.is_favorite })
        }
        onDelete={(image) => setDeleteTarget(image)}
        favoriteBusy={favoriteMutation.isPending}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this photograph?"
        description={
          <>
            <p>
              <strong>{deleteTarget?.original_filename}</strong> will be removed from the gallery,
              every album, and storage. This cannot be undone.
            </p>
            <p className="confirm-copy__note">
              The original object and its generated thumbnail will both be deleted.
            </p>
          </>
        }
        confirmLabel="Delete photograph"
        busy={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={bulkConfirm}
        title={`Delete ${selected.size} photograph${selected.size === 1 ? "" : "s"}?`}
        description={
          <p>
            Every selected image and its thumbnail will be removed from storage and from any
            albums. This action cannot be undone.
          </p>
        }
        confirmLabel="Delete selected"
        busy={bulkMutation.isPending}
        onConfirm={() => bulkMutation.mutate([...selected])}
        onClose={() => setBulkConfirm(false)}
      />
    </div>
  );
}
