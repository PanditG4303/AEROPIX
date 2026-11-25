import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  FolderPlus,
  Images,
  Layers,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AlbumCover } from "../components/illustrations/AlbumCover";
import { EmptyGalleryArt } from "../components/illustrations/StateArt";
import { EmptyState, PageLoader } from "../components/ui/Feedback";
import { FormError } from "../components/ui/FormBits";
import { ConfirmDialog, Modal } from "../components/ui/Modal";
import { useToast } from "../context/ToastContext";
import { useAlbums, useLibraryRefresh } from "../hooks/useLibrary";
import { usePageTitle } from "../hooks/usePageTitle";
import { api, ApiError } from "../services/api";
import { formatDate } from "../services/format";
import type { Album } from "../types";

type SortValue = "recent" | "name" | "images";

const sortLabels: Record<SortValue, string> = {
  recent: "Recently updated",
  name: "Name A → Z",
  images: "Most images",
};

interface AlbumFormState {
  name: string;
  description: string;
}

export function AlbumsPage() {
  usePageTitle("Albums");
  const toast = useToast();
  const reduced = useReducedMotion();
  const refreshLibrary = useLibraryRefresh();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<SortValue>("recent");
  const albums = useAlbums(sort);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<AlbumFormState>({ name: "", description: "" });
  const [formError, setFormError] = useState("");
  const [editing, setEditing] = useState<Album | null>(null);
  const [deleting, setDeleting] = useState<Album | null>(null);

  const totalImages = useMemo(
    () => (albums.data ?? []).reduce((sum, album) => sum + album.image_count, 0),
    [albums.data],
  );

  const createMutation = useMutation({
    mutationFn: (payload: AlbumFormState) =>
      api.albums.create({ name: payload.name, description: payload.description || undefined }),
    onSuccess: (album) => {
      toast.success("Album created", `${album.name} is ready for photographs.`);
      refreshLibrary();
      setCreateOpen(false);
      setForm({ name: "", description: "" });
    },
    onError: (error) => {
      setFormError(error instanceof ApiError ? error.detail : "The album could not be created.");
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AlbumFormState }) =>
      api.albums.update(id, {
        name: payload.name,
        description: payload.description || undefined,
      }),
    onSuccess: (album) => {
      toast.success("Album updated", album.name);
      void queryClient.invalidateQueries({ queryKey: ["albums"] });
      void queryClient.invalidateQueries({ queryKey: ["album"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setEditing(null);
      setForm({ name: "", description: "" });
    },
    onError: (error) => {
      setFormError(error instanceof ApiError ? error.detail : "The album could not be updated.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.albums.remove(id),
    onSuccess: () => {
      toast.success("Album deleted", "Your photographs remain safe in the gallery.");
      refreshLibrary();
      setDeleting(null);
    },
    onError: (error) => {
      toast.error("Album could not be deleted", error instanceof ApiError ? error.detail : undefined);
      setDeleting(null);
    },
  });

  const openCreate = () => {
    setForm({ name: "", description: "" });
    setFormError("");
    setCreateOpen(true);
  };

  const openEdit = (album: Album) => {
    setForm({ name: album.name, description: album.description ?? "" });
    setFormError("");
    setEditing(album);
  };

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (!form.name.trim()) {
      setFormError("Please give your album a name.");
      return;
    }
    createMutation.mutate({ name: form.name.trim(), description: form.description.trim() });
  };

  const submitEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setFormError("");
    if (!form.name.trim()) {
      setFormError("Please give your album a name.");
      return;
    }
    editMutation.mutate({
      id: editing.id,
      payload: { name: form.name.trim(), description: form.description.trim() },
    });
  };

  return (
    <div className="page albums-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Collections</p>
          <h1 className="page-title">
            Your <em>albums.</em>
          </h1>
          <p className="page-subtitle">
            {albums.isLoading
              ? "Reading your collections…"
              : `${albums.data?.length ?? 0} album${albums.data?.length === 1 ? "" : "s"} holding ${totalImages} placement${totalImages === 1 ? "" : "s"}. The same photograph can live in several albums without being copied.`}
          </p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            <FolderPlus size={16} /> New album
          </button>
        </div>
      </header>

      <div className="albums-toolbar">
        <div className="sort-pills" role="group" aria-label="Sort albums">
          {(Object.keys(sortLabels) as SortValue[]).map((value) => (
            <button
              key={value}
              type="button"
              className={sort === value ? "is-active" : ""}
              onClick={() => setSort(value)}
              aria-pressed={sort === value}
            >
              {sortLabels[value]}
            </button>
          ))}
        </div>
        <Link to="/app/gallery" className="link-button">
          Browse all photographs <ArrowRight size={14} />
        </Link>
      </div>

      {albums.isLoading ? (
        <PageLoader label="Opening your albums" />
      ) : albums.isError ? (
        <div className="panel panel--error">
          <h2>Albums could not be loaded</h2>
          <p>{albums.error instanceof Error ? albums.error.message : "Unknown error."}</p>
          <button type="button" className="btn btn--primary" onClick={() => void albums.refetch()}>
            Retry
          </button>
        </div>
      ) : !albums.data?.length ? (
        <EmptyState
          illustration={<EmptyGalleryArt />}
          eyebrow="No albums yet"
          title="Collect moments into small, deliberate groups."
          description="An album is a lens on your gallery, not a second copy. Create one for a trip, a season, a person or a feeling."
          actions={
            <button type="button" className="btn btn--primary" onClick={openCreate}>
              <Plus size={16} /> Create your first album
            </button>
          }
        />
      ) : (
        <div className="album-grid">
          {albums.data.map((album, index) => (
            <motion.article
              key={album.id}
              className="album-card"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0.01 : 0.42, delay: reduced ? 0 : index * 0.05 }}
            >
              <Link to={`/app/albums/${album.id}`} className="album-card__cover" aria-label={`Open album ${album.name}`}>
                {album.cover_url ? (
                  <img src={album.cover_url} alt="" loading="lazy" />
                ) : (
                  <AlbumCover name={album.name} />
                )}
                <span className="album-card__shade" aria-hidden="true" />
                <span className="album-card__count">
                  <Images size={13} /> {album.image_count}
                </span>
                <span className="album-card__open">
                  Open album <ArrowUpRight size={14} />
                </span>
              </Link>
              <div className="album-card__body">
                <div className="album-card__title">
                  <div>
                    <h2>
                      <Link to={`/app/albums/${album.id}`}>{album.name}</Link>
                    </h2>
                    <p>{album.description || "No description yet."}</p>
                  </div>
                  <div className="album-card__tools">
                    <button
                      type="button"
                      className="icon-button icon-button--sm"
                      onClick={() => openEdit(album)}
                      aria-label={`Edit ${album.name}`}
                      title="Edit album"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button--sm icon-button--danger"
                      onClick={() => setDeleting(album)}
                      aria-label={`Delete ${album.name}`}
                      title="Delete album"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="album-card__meta">
                  Updated {formatDate(album.updated_at, { year: undefined })}
                </p>
              </div>
            </motion.article>
          ))}

          <button type="button" className="album-add-card" onClick={openCreate}>
            <span className="album-add-card__icon">
              <FolderPlus size={20} />
            </span>
            <strong>Make another album</strong>
            <span>Group a new set of photographs</span>
          </button>
        </div>
      )}

      <div className="album-note">
        <Sparkles size={16} />
        <p>
          <strong>A note on covers.</strong> An album cover is taken from its most recent
          photograph. Albums without images show an original AEROPIX generative cover, not a broken
          placeholder.
        </p>
      </div>

      <Modal
        open={createOpen}
        onClose={() => !createMutation.isPending && setCreateOpen(false)}
        title="Create an album"
        eyebrow="New collection"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setCreateOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-album-form"
              className="btn btn--primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create album"}
            </button>
          </>
        }
      >
        <form id="create-album-form" className="form" onSubmit={submitCreate}>
          <FormError>{formError}</FormError>
          <div className="field">
            <label className="field__label" htmlFor="album-name">
              Album name
            </label>
            <input
              id="album-name"
              className="input"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Summer in the hills"
              maxLength={80}
              autoFocus
              required
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="album-description">
              Description <span className="field__optional">optional</span>
            </label>
            <textarea
              id="album-description"
              className="input input--textarea"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="A few words about this collection…"
              rows={3}
              maxLength={400}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => !editMutation.isPending && setEditing(null)}
        title="Edit album"
        eyebrow="Collection details"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setEditing(null)}
              disabled={editMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-album-form"
              className="btn btn--primary"
              disabled={editMutation.isPending}
            >
              {editMutation.isPending ? "Saving…" : "Save changes"}
            </button>
          </>
        }
      >
        <form id="edit-album-form" className="form" onSubmit={submitEdit}>
          <FormError>{formError}</FormError>
          <div className="field">
            <label className="field__label" htmlFor="edit-album-name">
              Album name
            </label>
            <input
              id="edit-album-name"
              className="input"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              maxLength={80}
              required
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="edit-album-description">
              Description <span className="field__optional">optional</span>
            </label>
            <textarea
              id="edit-album-description"
              className="input input--textarea"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={3}
              maxLength={400}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete “${deleting?.name ?? "album"}”?`}
        description={
          <>
            <p>
              The album will be removed permanently. The {deleting?.image_count ?? 0} photograph
              {deleting?.image_count === 1 ? "" : "s"} inside it will <strong>stay in your gallery</strong>.
            </p>
            <p className="confirm-copy__note">Only the collection is deleted, never the images.</p>
          </>
        }
        confirmLabel="Delete album"
        busy={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
