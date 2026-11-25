import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clipboard,
  Download,
  ExternalLink,
  Heart,
  ImageIcon,
  Layers,
  Lock,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { useAlbums, useImage, useLibraryRefresh } from "../hooks/useLibrary";
import { usePageTitle } from "../hooks/usePageTitle";
import { api, ApiError } from "../services/api";
import { formatBytes, formatDate, timeAgo } from "../services/format";
import { ConfirmDialog, Modal } from "../components/ui/Modal";
import { PageLoader } from "../components/ui/Feedback";
import { EmptyGalleryArt } from "../components/illustrations/StateArt";

export function ImageDetailPage() {
  const params = useParams();
  const imageId = Number(params.imageId);
  const navigate = useNavigate();
  const toast = useToast();
  const reduced = useReducedMotion();
  const queryClient = useQueryClient();
  const refreshLibrary = useLibraryRefresh();
  const image = useImage(Number.isFinite(imageId) ? imageId : undefined);
  const albums = useAlbums("recent");
  usePageTitle(image.data?.original_filename ?? "Image");

  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [albumPickerOpen, setAlbumPickerOpen] = useState(false);
  const [selectedAlbums, setSelectedAlbums] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (image.data && !renaming) setNameDraft(image.data.original_filename);
  }, [image.data, renaming]);

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["image", imageId] });
    void queryClient.invalidateQueries({ queryKey: ["images"] });
    void queryClient.invalidateQueries({ queryKey: ["albums"] });
    void queryClient.invalidateQueries({ queryKey: ["album"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const renameMutation = useMutation({
    mutationFn: (name: string) => api.images.update(imageId, { original_filename: name }),
    onSuccess: () => {
      toast.success("Image renamed");
      invalidateAll();
      setRenaming(false);
    },
    onError: (error) => {
      toast.error("Rename failed", error instanceof ApiError ? error.detail : undefined);
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: (value: boolean) => api.images.update(imageId, { is_favorite: value }),
    onSuccess: (_data, value) => {
      toast.success(value ? "Added to favourites" : "Removed from favourites");
      invalidateAll();
    },
    onError: (error) => {
      toast.error("Could not update favourite", error instanceof ApiError ? error.detail : undefined);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.images.remove(imageId),
    onSuccess: () => {
      toast.success("Image deleted", "The original and thumbnail were removed from storage.");
      refreshLibrary();
      navigate("/app/gallery", { replace: true });
    },
    onError: (error) => {
      toast.error("Delete failed", error instanceof ApiError ? error.detail : undefined);
      setDeleteOpen(false);
    },
  });

  const addToAlbumsMutation = useMutation({
    mutationFn: async (albumIds: number[]) => {
      await Promise.all(albumIds.map((albumId) => api.albums.addImages(albumId, [imageId])));
    },
    onSuccess: () => {
      toast.success(
        `Added to ${selectedAlbums.size} album${selectedAlbums.size === 1 ? "" : "s"}`,
        "The photograph itself was not duplicated.",
      );
      invalidateAll();
      setAlbumPickerOpen(false);
      setSelectedAlbums(new Set());
    },
    onError: (error) => {
      toast.error("Could not add to album", error instanceof ApiError ? error.detail : undefined);
    },
  });

  if (!Number.isFinite(imageId)) {
    return <div className="page"><div className="panel panel--error"><h2>Invalid image address</h2><Link className="btn btn--primary" to="/app/gallery">Back to gallery</Link></div></div>;
  }

  if (image.isLoading) return <PageLoader label="Opening the photograph" />;

  if (image.isError || !image.data) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state__art"><EmptyGalleryArt /></div>
          <p className="eyebrow">Image unavailable</p>
          <h1 className="empty-state__title">This photograph is not in your library.</h1>
          <p className="empty-state__description">
            It may have been deleted, or it belongs to another private account. AEROPIX does not
            disclose images you do not own.
          </p>
          <div className="empty-state__actions">
            <Link to="/app/gallery" className="btn btn--primary">
              <ArrowLeft size={15} /> Back to gallery
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const item = image.data;

  const saveName = () => {
    const next = nameDraft.trim();
    if (!next || next === item.original_filename) {
      setRenaming(false);
      setNameDraft(item.original_filename);
      return;
    }
    renameMutation.mutate(next);
  };

  const copyLink = async () => {
    if (!item.url) return;
    try {
      await navigator.clipboard.writeText(new URL(item.url, window.location.origin).toString());
      toast.success("Signed link copied", "It expires automatically; do not share it publicly.");
    } catch {
      toast.error("Clipboard is unavailable in this browser");
    }
  };

  const existingAlbumIds = new Set(item.albums.map((album) => album.id));
  const availableAlbums = (albums.data ?? []).filter((album) => !existingAlbumIds.has(album.id));

  return (
    <div className="page image-detail-page">
      <nav className="back-link">
        <Link to="/app/gallery">
          <ArrowLeft size={15} /> Back to gallery
        </Link>
      </nav>

      <div className="image-detail-grid">
        <motion.section
          className="image-detail-stage"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0.01 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="image-detail-stage__frame">
            {item.url ? (
              <img src={item.url} alt={item.original_filename} />
            ) : (
              <div className="image-detail-stage__fallback">
                <ImageIcon size={40} />
                <p>The signed preview could not be generated.</p>
              </div>
            )}
          </div>
          <div className="image-detail-stage__bar">
            <span className="secure-pill">
              <Lock size={12} /> {item.storage_backend === "s3" ? "S3 presigned URL" : "Signed local URL"}
            </span>
            <div>
              {item.url ? (
                <a className="btn btn--ghost btn--sm" href={item.url} target="_blank" rel="noreferrer">
                  <ExternalLink size={15} /> Open original
                </a>
              ) : null}
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => void copyLink()}>
                <Clipboard size={15} /> Copy link
              </button>
            </div>
          </div>
        </motion.section>

        <aside className="image-detail-panel">
          <div className="image-detail-panel__head">
            <div className="image-detail-panel__badges">
              {item.is_demo ? <span className="tag tag--demo">Demo content</span> : null}
              <span className={`tag tag--type tag--type-${item.extension}`}>{item.extension.toUpperCase()}</span>
              {item.is_favorite ? (
                <span className="tag tag--favorite">
                  <Heart size={11} fill="currentColor" /> Favourite
                </span>
              ) : null}
            </div>

            {renaming ? (
              <div className="rename-row">
                <input
                  className="input"
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveName();
                    if (event.key === "Escape") {
                      setRenaming(false);
                      setNameDraft(item.original_filename);
                    }
                  }}
                  autoFocus
                  maxLength={200}
                  aria-label="Image filename"
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={saveName}
                  disabled={renameMutation.isPending}
                  aria-label="Save filename"
                >
                  <Check size={16} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => {
                    setRenaming(false);
                    setNameDraft(item.original_filename);
                  }}
                  aria-label="Cancel rename"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <h1>
                {item.original_filename}
                <button type="button" className="inline-edit" onClick={() => setRenaming(true)} aria-label="Rename image">
                  <Pencil size={14} />
                </button>
              </h1>
            )}
            <p className="image-detail-panel__uploaded">
              Uploaded {formatDate(item.created_at)} · {timeAgo(item.created_at)}
            </p>
          </div>

          <div className="image-detail-actions">
            <button
              type="button"
              className={`btn ${item.is_favorite ? "btn--primary" : "btn--ghost"} btn--sm`}
              onClick={() => favoriteMutation.mutate(!item.is_favorite)}
              disabled={favoriteMutation.isPending}
              aria-pressed={item.is_favorite}
            >
              <Heart size={15} fill={item.is_favorite ? "currentColor" : "none"} />
              {item.is_favorite ? "Favourited" : "Favourite"}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setAlbumPickerOpen(true)}
              disabled={!availableAlbums.length && !item.albums.length}
            >
              <Layers size={15} /> Add to album
            </button>
            <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={15} /> Delete
            </button>
          </div>

          <dl className="meta-list meta-list--panel">
            <div>
              <dt>File name</dt>
              <dd>{item.original_filename}</dd>
            </div>
            <div>
              <dt>MIME type</dt>
              <dd>{item.mime_type}</dd>
            </div>
            <div>
              <dt>File size</dt>
              <dd>{formatBytes(item.size_bytes)}</dd>
            </div>
            <div>
              <dt>Dimensions</dt>
              <dd>{item.width && item.height ? `${item.width} × ${item.height} px` : "Not recorded"}</dd>
            </div>
            <div>
              <dt>Albums</dt>
              <dd>
                {item.albums.length ? (
                  <span className="chip-row">
                    {item.albums.map((album) => (
                      <Link key={album.id} to={`/app/albums/${album.id}`} className="chip chip--link">
                        {album.name} <ArrowRight size={11} />
                      </Link>
                    ))}
                  </span>
                ) : (
                  <span className="meta-list__muted">Not in an album</span>
                )}
              </dd>
            </div>
            <div>
              <dt>Storage provider</dt>
              <dd>
                <span className={`storage-dot storage-dot--${item.storage_backend}`} />
                {item.storage_provider}
              </dd>
            </div>
            <div className="meta-list__wide">
              <dt>Object key</dt>
              <dd className="mono">{item.object_key}</dd>
            </div>
          </dl>

          <div className="image-detail-note">
            <Lock size={15} />
            <p>
              This image is private. Nothing is publicly readable; each preview is a signed link
              that expires in minutes and can be revoked by deleting the image.
            </p>
          </div>

          <div className="image-detail-download">
            {item.url ? (
              <a className="btn btn--ghost btn--sm" href={item.url} target="_blank" rel="noreferrer">
                <Download size={15} /> Open / download original
              </a>
            ) : null}
            <button
              type="button"
              className="link-button"
              onClick={() => setAlbumPickerOpen(true)}
              disabled={!availableAlbums.length}
            >
              <Plus size={13} /> {availableAlbums.length ? "Add to another album" : "In all your albums"}
            </button>
          </div>
        </aside>
      </div>

      <Modal
        open={albumPickerOpen}
        onClose={() => !addToAlbumsMutation.isPending && setAlbumPickerOpen(false)}
        title="Add to albums"
        eyebrow="Same photograph, several collections"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setAlbumPickerOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!selectedAlbums.size || addToAlbumsMutation.isPending}
              onClick={() => addToAlbumsMutation.mutate([...selectedAlbums])}
            >
              {addToAlbumsMutation.isPending
                ? "Adding…"
                : `Add to ${selectedAlbums.size || ""} album${selectedAlbums.size === 1 ? "" : "s"}`}
            </button>
          </>
        }
      >
        {!availableAlbums.length ? (
          <div className="picker-empty">
            <Check size={26} />
            <h3>Already in every album</h3>
            <p>This photograph is part of all your current albums. Create a new album to add it elsewhere.</p>
            <Link to="/app/albums" className="btn btn--primary btn--sm" onClick={() => setAlbumPickerOpen(false)}>
              Manage albums
            </Link>
          </div>
        ) : (
          <ul className="album-options">
            {availableAlbums.map((album) => {
              const checked = selectedAlbums.has(album.id);
              return (
                <li key={album.id}>
                  <label className={`album-option ${checked ? "is-selected" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedAlbums((current) => {
                          const next = new Set(current);
                          if (next.has(album.id)) next.delete(album.id);
                          else next.add(album.id);
                          return next;
                        })
                      }
                    />
                    <span className="album-option__check">{checked ? <Check size={12} /> : null}</span>
                    <span className="album-option__body">
                      <strong>{album.name}</strong>
                      <small>{album.image_count} image{album.image_count === 1 ? "" : "s"}</small>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this photograph?"
        description={
          <>
            <p>
              <strong>{item.original_filename}</strong> will be removed from storage, your gallery
              and every album containing it.
            </p>
            <p className="confirm-copy__note">This cannot be undone.</p>
          </>
        }
        confirmLabel="Delete photograph"
        busy={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
