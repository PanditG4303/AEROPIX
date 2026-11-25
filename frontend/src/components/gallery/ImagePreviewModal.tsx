import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Clipboard,
  Download,
  Expand,
  ExternalLink,
  Heart,
  ImageIcon,
  Lock,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { formatBytes, formatDate, timeAgo } from "../../services/format";
import type { ImageItem } from "../../types";

interface ImagePreviewModalProps {
  image: ImageItem | null;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onFavorite?: (image: ImageItem) => void;
  onDelete?: (image: ImageItem) => void;
  onRemoveFromAlbum?: (image: ImageItem) => void;
  favoriteBusy?: boolean;
  albumMode?: boolean;
}

export function ImagePreviewModal({
  image,
  onClose,
  onPrevious,
  onNext,
  onFavorite,
  onDelete,
  onRemoveFromAlbum,
  favoriteBusy = false,
  albumMode = false,
}: ImagePreviewModalProps) {
  const reduced = useReducedMotion();
  const toast = useToast();
  const stageRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!image) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (document.fullscreenElement) {
          void document.exitFullscreen();
        } else {
          onClose();
        }
      }
      if (event.key === "ArrowLeft" && onPrevious) onPrevious();
      if (event.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", handleKey);
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [image?.id, onPrevious, onNext, onClose, image]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await stageRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      toast.info("Full screen is unavailable", "Your browser blocked the full-screen request.");
    }
  };

  const copyLink = async () => {
    if (!image?.url) return;
    try {
      await navigator.clipboard.writeText(new URL(image.url, window.location.origin).toString());
      toast.success("Secure link copied", "This presigned link expires in a few minutes.");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  return createPortal(
    <AnimatePresence>
      {image ? (
        <motion.div
          className="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.01 : 0.22 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Image preview: ${image.original_filename}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <div className="lightbox__topbar">
            <span className="lightbox__badge">
              <Lock size={12} /> Presigned view
            </span>
            <span className="lightbox__filename">{image.original_filename}</span>
            <button ref={closeRef} type="button" className="lightbox__close" onClick={onClose} aria-label="Close preview">
              <X size={20} />
            </button>
          </div>

          <motion.div
            className="lightbox__body"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.01 : 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="lightbox__stage" ref={stageRef}>
              <div className="lightbox__image-wrap">
                {image.url ? (
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={image.id}
                      src={image.url}
                      alt={image.original_filename}
                      initial={{ opacity: 0, scale: reduced ? 1 : 0.99 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: reduced ? 0.01 : 0.2 }}
                    />
                  </AnimatePresence>
                ) : (
                  <ImageIcon size={42} />
                )}
              </div>
              <div className="lightbox__stage-actions">
                <button type="button" className="glass-button" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit full screen" : "View full screen"}>
                  <Expand size={17} />
                </button>
              </div>
              {onPrevious ? (
                <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={onPrevious} aria-label="Previous image">
                  <ArrowLeft size={20} />
                </button>
              ) : null}
              {onNext ? (
                <button type="button" className="lightbox__nav lightbox__nav--next" onClick={onNext} aria-label="Next image">
                  <ArrowRight size={20} />
                </button>
              ) : null}
            </div>

            <aside className="lightbox__panel">
              <div className="lightbox__panel-head">
                <div>
                  <p className="eyebrow">Image details</p>
                  <h2>{image.original_filename}</h2>
                </div>
                {image.is_demo ? <span className="tag tag--demo">Demo</span> : null}
              </div>

              <dl className="meta-list">
                <div>
                  <dt>File type</dt>
                  <dd>{image.mime_type}</dd>
                </div>
                <div>
                  <dt>File size</dt>
                  <dd>{formatBytes(image.size_bytes)}</dd>
                </div>
                <div>
                  <dt>Dimensions</dt>
                  <dd>{image.width && image.height ? `${image.width} × ${image.height}px` : "Not available"}</dd>
                </div>
                <div>
                  <dt>Uploaded</dt>
                  <dd>
                    {formatDate(image.created_at)} <span className="meta-list__muted">· {timeAgo(image.created_at)}</span>
                  </dd>
                </div>
                <div>
                  <dt>Albums</dt>
                  <dd>
                    {image.albums.length ? (
                      <span className="chip-row">
                        {image.albums.map((album) => (
                          <span className="chip" key={album.id}>
                            {album.name}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="meta-list__muted">Not in an album</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Storage</dt>
                  <dd>
                    <span className={`storage-dot storage-dot--${image.storage_backend}`} />
                    {image.storage_provider}
                  </dd>
                </div>
                <div className="meta-list__wide">
                  <dt>Object key</dt>
                  <dd className="mono">{image.object_key}</dd>
                </div>
              </dl>

              <div className="lightbox__secure-note">
                <Lock size={14} />
                <p>
                  {image.storage_backend === "s3"
                    ? "Private S3 object. The link above is a time-limited presigned URL."
                    : "Local development file. The link above is signed and time-limited."}
                </p>
              </div>

              <div className="lightbox__actions">
                {image.url ? (
                  <a className="btn btn--primary btn--sm" href={image.url} target="_blank" rel="noreferrer">
                    <Download size={15} /> Open original
                  </a>
                ) : null}
                <Link className="btn btn--ghost btn--sm" to={`/app/images/${image.id}`} onClick={onClose}>
                  <ExternalLink size={15} /> Details page
                </Link>
                <button type="button" className="btn btn--ghost btn--sm" onClick={copyLink}>
                  <Clipboard size={15} /> Copy link
                </button>
                {onFavorite ? (
                  <button
                    type="button"
                    className={`btn btn--ghost btn--sm ${image.is_favorite ? "is-active" : ""}`}
                    onClick={() => onFavorite(image)}
                    disabled={favoriteBusy}
                    aria-pressed={image.is_favorite}
                  >
                    <Heart size={15} fill={image.is_favorite ? "currentColor" : "none"} />
                    {image.is_favorite ? "Favourited" : "Favourite"}
                  </button>
                ) : null}
              </div>

              {image.albums.length ? (
                <div className="lightbox__albums">
                  {image.albums.map((album) => (
                    <Link key={album.id} className="link-button" to={`/app/albums/${album.id}`} onClick={onClose}>
                      Open {album.name} <ArrowRight size={13} />
                    </Link>
                  ))}
                </div>
              ) : null}

              <div className="lightbox__danger">
                {albumMode && onRemoveFromAlbum ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => onRemoveFromAlbum(image)}
                  >
                    <X size={15} /> Remove from album
                  </button>
                ) : null}
                {onDelete ? (
                  <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => onDelete(image)}>
                    <Trash2 size={15} /> Delete image
                  </button>
                ) : null}
              </div>
            </aside>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
