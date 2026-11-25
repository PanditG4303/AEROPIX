import { Check, Heart, ImageOff, X } from "lucide-react";
import { useState } from "react";
import { formatBytes, formatShortDate, timeAgo } from "../../services/format";
import type { ImageItem } from "../../types";

interface ImageCardProps {
  image: ImageItem;
  view?: "masonry" | "grid" | "list";
  selectionMode?: boolean;
  selected?: boolean;
  onOpen?: () => void;
  onToggleSelect?: () => void;
  onFavorite?: () => void;
  onRemoveFromAlbum?: () => void;
  favoriteBusy?: boolean;
}

export function ImageCard({
  image,
  view = "masonry",
  selectionMode = false,
  selected = false,
  onOpen,
  onToggleSelect,
  onFavorite,
  onRemoveFromAlbum,
  favoriteBusy = false,
}: ImageCardProps) {
  const [loaded, setLoaded] = useState(false);
  const thumbnail = image.thumbnail_url ?? image.url;
  const ratio =
    image.width && image.height ? `${image.width} / ${image.height}` : view === "grid" ? "4 / 3" : "4 / 5";

  if (view === "list") {
    return (
      <article className={`image-row ${selected ? "is-selected" : ""}`}>
        {selectionMode ? (
          <button
            type="button"
            className="select-check"
            aria-label={selected ? `Deselect ${image.original_filename}` : `Select ${image.original_filename}`}
            aria-pressed={selected}
            onClick={onToggleSelect}
          >
            {selected ? <Check size={13} /> : null}
          </button>
        ) : null}
        <button type="button" className="image-row__thumb" onClick={selectionMode ? onToggleSelect : onOpen}>
          {thumbnail ? (
            <img src={thumbnail} alt="" loading="lazy" />
          ) : (
            <ImageOff size={18} aria-hidden="true" />
          )}
        </button>
        <div className="image-row__main">
          <button type="button" className="image-row__name" onClick={selectionMode ? onToggleSelect : onOpen}>
            {image.original_filename}
          </button>
          <p className="image-row__meta">
            {image.extension.toUpperCase()} · {formatBytes(image.size_bytes)}
            {image.albums.length ? ` · ${image.albums.map((album) => album.name).join(", ")}` : ""}
          </p>
        </div>
        <span className="image-row__date">{formatShortDate(image.created_at)}</span>
        {image.is_favorite ? (
          <span className="image-row__star" aria-label="Favourite">
            <Heart size={15} fill="currentColor" />
          </span>
        ) : (
          <span />
        )}
        <div className="image-row__actions">
          {onFavorite ? (
            <button
              type="button"
              className={`icon-button icon-button--sm ${image.is_favorite ? "is-active" : ""}`}
              onClick={onFavorite}
              aria-label={image.is_favorite ? "Remove from favourites" : "Add to favourites"}
              disabled={favoriteBusy}
            >
              <Heart size={16} fill={image.is_favorite ? "currentColor" : "none"} />
            </button>
          ) : null}
          {onRemoveFromAlbum ? (
            <button
              type="button"
              className="icon-button icon-button--sm"
              onClick={onRemoveFromAlbum}
              aria-label="Remove from album"
              title="Remove from album"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article
      className={`image-card image-card--${view} ${selected ? "is-selected" : ""}`}
      style={view === "masonry" ? { aspectRatio: ratio } : undefined}
    >
      <button
        type="button"
        className="image-card__trigger"
        onClick={selectionMode ? onToggleSelect : onOpen}
        aria-label={
          selectionMode
            ? `${selected ? "Deselect" : "Select"} ${image.original_filename}`
            : `Preview ${image.original_filename}`
        }
        aria-pressed={selectionMode ? selected : undefined}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={image.original_filename}
            loading="lazy"
            decoding="async"
            className={loaded ? "is-loaded" : ""}
            onLoad={() => setLoaded(true)}
          />
        ) : (
          <span className="image-card__fallback">
            <ImageOff size={24} />
          </span>
        )}
        <span className="image-card__shade" aria-hidden="true" />
        <span className="image-card__caption">
          <span className="image-card__name">{image.original_filename}</span>
          <span className="image-card__meta">
            {formatShortDate(image.created_at)} · {formatBytes(image.size_bytes)}
          </span>
        </span>
      </button>

      <div className="image-card__top">
        {selectionMode ? (
          <span className={`select-check select-check--floating ${selected ? "is-checked" : ""}`} aria-hidden="true">
            {selected ? <Check size={13} /> : null}
          </span>
        ) : image.is_demo ? (
          <span className="tag tag--demo">Demo</span>
        ) : (
          <span />
        )}
        {!selectionMode ? (
          <div className="image-card__controls">
            {onRemoveFromAlbum ? (
              <button
                type="button"
                className="glass-button"
                onClick={onRemoveFromAlbum}
                aria-label="Remove from album"
                title="Remove from album"
              >
                <X size={15} />
              </button>
            ) : null}
            {onFavorite ? (
              <button
                type="button"
                className={`glass-button ${image.is_favorite ? "is-active" : ""}`}
                onClick={onFavorite}
                aria-label={image.is_favorite ? "Remove from favourites" : "Add to favourites"}
                aria-pressed={image.is_favorite}
                disabled={favoriteBusy}
              >
                <Heart size={15} fill={image.is_favorite ? "currentColor" : "none"} />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <span className="image-card__hint" aria-hidden="true">
        {timeAgo(image.created_at)}
      </span>
    </article>
  );
}
