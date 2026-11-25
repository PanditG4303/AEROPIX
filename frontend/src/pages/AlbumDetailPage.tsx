import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Images,
  Layers,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlbumCover } from "../components/illustrations/AlbumCover";
import { EmptyGalleryArt } from "../components/illustrations/StateArt";
import { ImageCard } from "../components/gallery/ImageCard";
import { ImagePreviewModal } from "../components/gallery/ImagePreviewModal";
import { EmptyState, PageLoader } from "../components/ui/Feedback";
import { FormError } from "../components/ui/FormBits";
import { ConfirmDialog, Modal } from "../components/ui/Modal";
import { useToast } from "../context/ToastContext";
import { useAlbum, useImages, useLibraryRefresh } from "../hooks/useLibrary";
import { usePageTitle } from "../hooks/usePageTitle";
import { api, ApiError } from "../services/api";
import { formatDate } from "../services/format";
import type { ImageItem } from "../types";

export function AlbumDetailPage() {
  const params = useParams();
  const albumId = Number(params.albumId);
  const navigate = useNavigate();
  const toast = useToast();
  const reduced = useReducedMotion();
  const queryClient = useQueryClient();
  const refreshLibrary = useLibraryRefresh();
  const album = useAlbum(Number.isFinite(albumId) ? albumId : undefined);
  usePageTitle(album.data?.name ?? "Album");

  const [previewId, setPreviewId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [formError, setFormError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ImageItem | null>(null);

  const library = useImages({ limit: 200 }, addOpen);
  const images = album.data?.images ?? [];
  const previewIndex = images.findIndex((image) => image.id === previewId);
  const preview = previewIndex >= 0 ? images[previewIndex] : null;

  const available = useMemo(() => {
    const inAlbum = new Set(images.map((image) => image.id));
    return (library.data?.items ?? []).filter((image) => !inAlbum.has(image.id));
  }, [images, library.data]);

  const addMutation = useMutation({
    mutationFn: (ids: number[]) => api.albums.addImages(albumId, ids),
    onSuccess: (detail) => {
      toast.success("Images added to album", `${detail.image_count} image${detail.image_count === 1 ? "" : "s"} now in ${detail.name}.`);
      void queryClient.invalidateQueries({ queryKey: ["album", albumId] });
      void queryClient.invalidateQueries({ queryKey: ["albums"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setAddOpen(false);
      setSelected(new Set());
    },
    onError: (error) => {
      toast.error("Images could not be added", error instanceof ApiError ? error.detail : undefined);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (imageId: number) => api.albums.removeImage(albumId, imageId),
    onSuccess: () => {
      toast.success("Removed from album", "The photograph remains in your gallery.");
      void queryClient.invalidateQueries({ queryKey: ["album", albumId] });
      void queryClient.invalidateQueries({ queryKey: ["albums"] });
      void queryClient.invalidateQueries({ queryKey: ["images"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setRemoveTarget(null);
      setPreviewId(null);
    },
    onError: (error) => {
      toast.error("Could not remove image", error instanceof ApiError ? error.detail : undefined);
    },
  });

  const editMutation = useMutation({
    mutationFn: (payload: { name: string; description: string }) =>
      api.albums.update(albumId, {
        name: payload.name,
        description: payload.description || undefined,
      }),
    onSuccess: (updated) => {
      toast.success("Album updated", updated.name);
      void queryClient.invalidateQueries({ queryKey: ["album", albumId] });
      void queryClient.invalidateQueries({ queryKey: ["albums"] });
      setEditOpen(false);
    },
    onError: (error) => {
      setFormError(error instanceof ApiError ? error.detail : "The album could not be updated.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.albums.remove(albumId),
    onSuccess: () => {
      toast.success("Album deleted", "The photographs remain safe in your gallery.");
      refreshLibrary();
      navigate("/app/albums", { replace: true });
    },
    onError: (error) => {
      toast.error("Album could not be deleted", error instanceof ApiError ? error.detail : undefined);
      setDeleteOpen(false);
    },
  });

  if (!Number.isFinite(albumId)) {
    return (
      <div className="page">
        <EmptyState
          eyebrow="Unknown album"
          title="That album address is not valid."
          description="Return to your collections and choose an album."
          actions={<Link to="/app/albums" className="btn btn--primary">Back to albums</Link>}
        />
      </div>
    );
  }

  if (album.isLoading) return <PageLoader label="Opening the album" />;

  if (album.isError || !album.data) {
    return (
      <div className="page">
        <div className="panel panel--error">
          <h2>This album could not be found</h2>
          <p>
            It may have been deleted, or it belongs to another account. AEROPIX never reveals
            whether another user's private album exists.
          </p>
          <Link to="/app/albums" className="btn btn--primary">
            <ArrowLeft size={15} /> Back to albums
          </Link>
        </div>
      </div>
    );
  }

  const data = album.data;
  const openEdit = () => {
    setForm({ name: data.name, description: data.description ?? "" });
    setFormError("");
    setEditOpen(true);
  };

  const submitEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setFormError("Album name cannot be blank.");
      return;
    }
    editMutation.mutate({ name: form.name.trim(), description: form.description.trim() });
  };

  const toggleSelected = (id: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="page album-detail">
      <nav className="back-link">
        <Link to="/app/albums">
          <ArrowLeft size={15} /> All albums
        </Link>
      </nav>

      <section className="album-hero">
        <div className="album-hero__art">
          {images.length ? (
            <div className="album-hero__mosaic">
              {images.slice(0, 4).map((image, index) => (
                <span key={image.id} className={`album-hero__tile album-hero__tile--${index + 1}`}>
                  {image.thumbnail_url ? <img src={image.thumbnail_url} alt="" /> : null}
                </span>
              ))}
            </div>
          ) : (
            <AlbumCover name={data.name} className="album-hero__cover" />
          )}
          <span className="album-hero__shade" aria-hidden="true" />
        </div>
        <div className="album-hero__copy">
          <p className="eyebrow">Album</p>
          <h1>{data.name}</h1>
          <p className="album-hero__description">
            {data.description || "No description yet — this collection is still taking shape."}
          </p>
          <div className="album-hero__meta">
            <span>
              <Images size={14} /> {data.image_count} photograph{data.image_count === 1 ? "" : "s"}
            </span>
            <span>
              <CalendarDays size={14} /> Created {formatDate(data.created_at)}
            </span>
            <span>
              <Layers size={14} /> Updated {formatDate(data.updated_at, { year: undefined })}
            </span>
          </div>
          <div className="album-hero__actions">
            <button type="button" className="btn btn--primary" onClick={() => setAddOpen(true)}>
              <Plus size={16} /> Add photographs
            </button>
            <button type="button" className="btn btn--ghost" onClick={openEdit}>
              <Pencil size={15} /> Edit album
            </button>
            <button
              type="button"
              className="btn btn--danger-ghost"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </div>
      </section>

      {!images.length ? (
        <EmptyState
          illustration={<EmptyGalleryArt />}
          eyebrow="An empty album"
          title="This collection needs its first photograph."
          description="Choose from images already in your library. Albums never duplicate files, so adding an image here leaves it exactly where it is in your gallery."
          actions={
            <button type="button" className="btn btn--primary" onClick={() => setAddOpen(true)}>
              <Plus size={16} /> Add photographs
            </button>
          }
        />
      ) : (
        <>
          <div className="album-images-head">
            <p>
              <strong>{images.length}</strong> photograph{images.length === 1 ? "" : "s"} in this album
            </p>
            <Link to="/app/gallery" className="link-button">
              Manage the whole gallery <ArrowRight size={14} />
            </Link>
          </div>
          <div className="album-image-grid">
            {images.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                view="grid"
                onOpen={() => setPreviewId(image.id)}
                onRemoveFromAlbum={() => setRemoveTarget(image)}
              />
            ))}
            <button type="button" className="album-image-add" onClick={() => setAddOpen(true)}>
              <Plus size={20} />
              <strong>Add more</strong>
              <span>From your library</span>
            </button>
          </div>
        </>
      )}

      <ImagePreviewModal
        image={preview}
        onClose={() => setPreviewId(null)}
        onPrevious={previewIndex > 0 ? () => setPreviewId(images[previewIndex - 1].id) : undefined}
        onNext={
          previewIndex >= 0 && previewIndex < images.length - 1
            ? () => setPreviewId(images[previewIndex + 1].id)
            : undefined
        }
        albumMode
        onRemoveFromAlbum={(image) => setRemoveTarget(image)}
      />

      <Modal
        open={addOpen}
        onClose={() => !addMutation.isPending && setAddOpen(false)}
        title="Add photographs"
        eyebrow={`To ${data.name}`}
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setAddOpen(false)}
              disabled={addMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!selected.size || addMutation.isPending}
              onClick={() => addMutation.mutate([...selected])}
            >
              {addMutation.isPending
                ? "Adding…"
                : `Add ${selected.size || ""} image${selected.size === 1 ? "" : "s"}`}
            </button>
          </>
        }
      >
        {library.isLoading ? (
          <PageLoader label="Loading your library" />
        ) : !available.length ? (
          <div className="picker-empty">
            <Check size={26} />
            <h3>Everything is already in this album</h3>
            <p>
              Upload new photographs first, or remove some from this album and add them again.
            </p>
            <Link to="/app/upload" className="btn btn--primary btn--sm" onClick={() => setAddOpen(false)}>
              Go to upload centre
            </Link>
          </div>
        ) : (
          <>
            <div className="picker-head">
              <p>
                {available.length} photograph{available.length === 1 ? "" : "s"} available
              </p>
              <div className="picker-head__actions">
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setSelected(new Set(available.map((image) => image.id)))}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setSelected(new Set())}
                  disabled={!selected.size}
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="picker-grid">
              {available.map((image) => {
                const isSelected = selected.has(image.id);
                return (
                  <button
                    key={image.id}
                    type="button"
                    className={`picker-item ${isSelected ? "is-selected" : ""}`}
                    onClick={() => toggleSelected(image.id)}
                    aria-pressed={isSelected}
                    aria-label={`${isSelected ? "Deselect" : "Select"} ${image.original_filename}`}
                  >
                    {image.thumbnail_url ? (
                      <img src={image.thumbnail_url} alt="" loading="lazy" />
                    ) : (
                      <span className="picker-item__fallback">
                        <Images size={18} />
                      </span>
                    )}
                    <span className="picker-item__check">{isSelected ? <Check size={13} /> : null}</span>
                    <span className="picker-item__name">{image.original_filename}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => !editMutation.isPending && setEditOpen(false)}
        title="Edit album"
        eyebrow="Collection details"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setEditOpen(false)}
              disabled={editMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="album-detail-edit-form"
              className="btn btn--primary"
              disabled={editMutation.isPending}
            >
              {editMutation.isPending ? "Saving…" : "Save changes"}
            </button>
          </>
        }
      >
        <form id="album-detail-edit-form" className="form" onSubmit={submitEdit}>
          <FormError>{formError}</FormError>
          <div className="field">
            <label className="field__label" htmlFor="album-detail-name">
              Album name
            </label>
            <input
              id="album-detail-name"
              className="input"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              maxLength={80}
              required
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="album-detail-description">
              Description <span className="field__optional">optional</span>
            </label>
            <textarea
              id="album-detail-description"
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
        open={Boolean(removeTarget)}
        title="Remove from this album?"
        description={
          <p>
            <strong>{removeTarget?.original_filename}</strong> will leave “{data.name}” but will
            remain in your gallery. Nothing is deleted from storage.
          </p>
        }
        confirmLabel="Remove from album"
        tone="primary"
        busy={removeMutation.isPending}
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget.id)}
        onClose={() => setRemoveTarget(null)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={`Delete “${data.name}”?`}
        description={
          <>
            <p>
              The album will be deleted permanently. Its {data.image_count} photograph
              {data.image_count === 1 ? "" : "s"} will remain safely in your gallery.
            </p>
            <p className="confirm-copy__note">This cannot be undone.</p>
          </>
        }
        confirmLabel="Delete album"
        busy={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setDeleteOpen(false)}
      />

      <div className="album-detail__foot">
        <Link to="/app/upload" className="link-button">
          Upload something new <ArrowRight size={13} />
        </Link>
        <button type="button" className="link-button" onClick={() => setPreviewId(images[0]?.id ?? null)} disabled={!images.length}>
          <X size={13} /> Close preview when done
        </button>
      </div>
    </div>
  );
}
