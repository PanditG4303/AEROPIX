import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Check,
  FileImage,
  ImagePlus,
  Info,
  Layers,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { Link } from "react-router-dom";
import { UploadSuccessArt } from "../components/illustrations/StateArt";
import { useToast } from "../context/ToastContext";
import { useAlbums, useLibraryRefresh, useStorageStatus } from "../hooks/useLibrary";
import { usePageTitle } from "../hooks/usePageTitle";
import { uploadImage, ApiError } from "../services/api";
import { formatBytes } from "../services/format";
import type { ImageItem } from "../types";

type TaskStatus = "queued" | "uploading" | "success" | "error";

interface UploadTask {
  id: string;
  file: File;
  status: TaskStatus;
  progress: number;
  error?: string;
  result?: ImageItem;
}

const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];
const ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif";

function extensionOf(name: string): string {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() ?? "" : "";
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function FileThumb({ file, className = "" }: { file: File; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return (
    <span className={`upload-thumb ${className}`}>
      {url ? <img src={url} alt="" /> : <FileImage size={20} />}
    </span>
  );
}

export function UploadPage() {
  usePageTitle("Upload");
  const toast = useToast();
  const refreshLibrary = useLibraryRefresh();
  const reduced = useReducedMotion();
  const storage = useStorageStatus();
  const albums = useAlbums("recent");
  const inputRef = useRef<HTMLInputElement>(null);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [albumId, setAlbumId] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const [rejections, setRejections] = useState<string[]>([]);
  const dragDepth = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const maxMb = storage.data?.max_upload_mb ?? 15;
  const backend = storage.data?.backend ?? "local";

  const updateTask = useCallback((id: string, patch: Partial<UploadTask>) => {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  }, []);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const nextRejections: string[] = [];
      const accepted: UploadTask[] = [];
      const existingKeys = new Set(tasks.map((task) => `${task.file.name}-${task.file.size}`));

      for (const file of Array.from(incoming)) {
        const extension = extensionOf(file.name);
        if (!ACCEPTED_EXTENSIONS.includes(extension)) {
          nextRejections.push(`${file.name}: unsupported file type.`);
          continue;
        }
        if (file.size > maxMb * 1024 * 1024) {
          nextRejections.push(`${file.name}: larger than ${maxMb} MB.`);
          continue;
        }
        if (file.size === 0) {
          nextRejections.push(`${file.name}: the file is empty.`);
          continue;
        }
        const key = `${file.name}-${file.size}`;
        if (existingKeys.has(key)) {
          nextRejections.push(`${file.name}: already in the queue.`);
          continue;
        }
        existingKeys.add(key);
        accepted.push({
          id: makeId(),
          file,
          status: "queued",
          progress: 0,
        });
      }

      if (accepted.length) {
        setTasks((current) => [...current, ...accepted]);
      }
      setRejections(nextRejections);
      if (nextRejections.length) {
        toast.info(
          `${nextRejections.length} file${nextRejections.length === 1 ? "" : "s"} skipped`,
          nextRejections[0],
        );
      }
    },
    [maxMb, tasks, toast],
  );

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files);
  };

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  };

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) addFiles(event.target.files);
    event.target.value = "";
  };

  const removeTask = (id: string) => {
    setTasks((current) => current.filter((task) => task.id !== id));
  };

  const retry = (id: string) => {
    updateTask(id, { status: "queued", progress: 0, error: undefined });
  };

  const clearFinished = () => {
    setTasks((current) => current.filter((task) => task.status !== "success" && task.status !== "error"));
    setRejections([]);
  };

  const runUploads = async () => {
    if (running) return;
    const pending = tasks.filter((task) => task.status === "queued");
    if (!pending.length) return;
    setRunning(true);
    let successCount = 0;
    let failureCount = 0;

    for (const task of pending) {
      if (!mounted.current) break;
      updateTask(task.id, { status: "uploading", progress: 0, error: undefined });
      try {
        const result = await uploadImage(
          task.file,
          albumId ? Number(albumId) : null,
          (percent) => {
            if (mounted.current) updateTask(task.id, { progress: percent });
          },
        );
        successCount += 1;
        updateTask(task.id, { status: "success", progress: 100, result });
      } catch (error) {
        failureCount += 1;
        if (error instanceof ApiError && error.status === 401) {
          updateTask(task.id, { status: "error", error: "Your session expired. Sign in and try again." });
          break;
        }
        updateTask(task.id, {
          status: "error",
          progress: 0,
          error:
            error instanceof ApiError
              ? error.detail
              : error instanceof Error
                ? error.message
                : "Upload failed.",
        });
      }
    }

    if (mounted.current) {
      setRunning(false);
      refreshLibrary();
      if (successCount) {
        toast.success(
          `${successCount} image${successCount === 1 ? "" : "s"} uploaded`,
          albumId
            ? "Stored privately and added to the selected album."
            : "Stored privately. Find them in your gallery.",
        );
      }
      if (failureCount && !successCount) {
        toast.error(
          "Uploads did not complete",
          `${failureCount} file${failureCount === 1 ? "" : "s"} failed. Review the reasons and retry.`,
        );
      }
    }
  };

  const queuedCount = tasks.filter((task) => task.status === "queued").length;
  const successCount = tasks.filter((task) => task.status === "success").length;
  const errorCount = tasks.filter((task) => task.status === "error").length;
  const allDone = tasks.length > 0 && tasks.every((task) => task.status === "success");
  const busy = running || tasks.some((task) => task.status === "uploading");

  const selectedAlbum = useMemo(
    () => albums.data?.find((album) => String(album.id) === albumId),
    [albums.data, albumId],
  );

  return (
    <div className="page upload-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Upload centre</p>
          <h1 className="page-title">
            All to <em>good hands.</em>
          </h1>
          <p className="page-subtitle">
            Add JPG, PNG, WEBP or GIF files. Every image is validated, thumbnailed and stored
            privately in {backend === "s3" ? "your Amazon S3 bucket" : "local development storage"}.
          </p>
        </div>
        <div className="page-head__actions">
          <Link to="/app/gallery" className="btn btn--ghost">
            Go to gallery <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <div className="upload-layout">
        <div className="upload-main">
          <motion.div
            className={`dropzone ${dragging ? "is-dragging" : ""} ${busy ? "is-busy" : ""}`}
            onDrop={onDrop}
            onDragOver={(event) => event.preventDefault()}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onClick={() => !busy && inputRef.current?.click()}
            onKeyDown={(event) => {
              if ((event.key === "Enter" || event.key === " ") && !busy) {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Choose images to upload or drop files here"
            aria-disabled={busy}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              hidden
              onChange={onPick}
              disabled={busy}
            />
            <div className="dropzone__art" aria-hidden="true">
              <span className="dropzone__orbit" />
              <UploadCloud size={38} strokeWidth={1.4} />
            </div>
            <h2>{dragging ? "Release to add these files" : "Drop your photographs here"}</h2>
            <p>
              or <span className="dropzone__browse">browse your device</span> — you can select
              several files at once.
            </p>
            <ul className="dropzone__rules">
              <li>JPG · JPEG · PNG · WEBP · GIF</li>
              <li>Up to {maxMb} MB per file</li>
              <li>Stored privately</li>
            </ul>
          </motion.div>

          {rejections.length ? (
            <div className="inline-alert inline-alert--warning" role="status">
              <AlertCircle size={16} />
              <div>
                <strong>Some files were skipped</strong>
                <ul>
                  {rejections.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
              <button type="button" onClick={() => setRejections([])} aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          ) : null}

          {tasks.length ? (
            <section className="upload-queue" aria-label="Upload queue">
              <header className="upload-queue__head">
                <div>
                  <h2>Upload queue</h2>
                  <p>
                    {tasks.length} file{tasks.length === 1 ? "" : "s"} · {successCount} complete
                    {errorCount ? ` · ${errorCount} failed` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="link-button"
                  onClick={clearFinished}
                  disabled={busy || (!successCount && !errorCount)}
                >
                  <Trash2 size={13} /> Clear finished
                </button>
              </header>

              <ul className="upload-list">
                {tasks.map((task) => (
                  <li key={task.id} className={`upload-row upload-row--${task.status}`}>
                    <FileThumb file={task.file} />
                    <div className="upload-row__main">
                      <div className="upload-row__title">
                        <strong title={task.file.name}>{task.file.name}</strong>
                        <span>{formatBytes(task.file.size)}</span>
                      </div>
                      <div className="progress-track" aria-hidden="true">
                        <span
                          style={{
                            width:
                              task.status === "success"
                                ? "100%"
                                : task.status === "error"
                                  ? "100%"
                                  : `${Math.max(3, task.progress)}%`,
                          }}
                        />
                      </div>
                      <div className="upload-row__status">
                        {task.status === "queued" ? <span>Waiting to upload</span> : null}
                        {task.status === "uploading" ? (
                          <span>
                            Uploading… {task.progress}%
                          </span>
                        ) : null}
                        {task.status === "success" ? (
                          <span className="is-success">
                            <Check size={13} /> Stored privately{selectedAlbum ? ` in ${selectedAlbum.name}` : ""}
                          </span>
                        ) : null}
                        {task.status === "error" ? (
                          <span className="is-error" role="alert">
                            <AlertCircle size={13} /> {task.error ?? "Upload failed."}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="upload-row__actions">
                      {task.status === "success" ? (
                        <span className="upload-row__done" aria-label="Complete">
                          <Check size={16} />
                        </span>
                      ) : null}
                      {task.status === "error" ? (
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => retry(task.id)}
                          disabled={busy}
                          aria-label={`Retry ${task.file.name}`}
                          title="Retry"
                        >
                          <RefreshCw size={15} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => removeTask(task.id)}
                        disabled={task.status === "uploading"}
                        aria-label={`Remove ${task.file.name} from queue`}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="upload-queue__footer">
                {allDone ? (
                  <div className="upload-complete">
                    <UploadSuccessArt className="upload-complete__art" />
                    <div>
                      <h3>All files are safely stored.</h3>
                      <p>They are available in your gallery right now, with private signed links.</p>
                      <div className="upload-complete__actions">
                        <Link to="/app/gallery" className="btn btn--primary btn--sm">
                          View in gallery
                        </Link>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => inputRef.current?.click()}
                        >
                          <ImagePlus size={15} /> Add more
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => void runUploads()}
                    disabled={!queuedCount || busy}
                  >
                    <UploadCloud size={16} />
                    {busy
                      ? "Uploading…"
                      : queuedCount
                        ? `Upload ${queuedCount} file${queuedCount === 1 ? "" : "s"}`
                        : "Queued files will upload here"}
                  </button>
                )}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="upload-aside">
          <div className="panel upload-settings">
            <header className="panel__head">
              <div>
                <p className="eyebrow">Organise as you upload</p>
                <h2>Add to an album</h2>
              </div>
            </header>
            <label className="field">
              <span className="field__label">Optional album</span>
              <div className="select-wrap">
                <Layers size={15} aria-hidden="true" />
                <select
                  value={albumId}
                  onChange={(event) => setAlbumId(event.target.value)}
                  disabled={busy}
                >
                  <option value="">No album — gallery only</option>
                  {albums.data?.map((album) => (
                    <option key={album.id} value={album.id}>
                      {album.name} ({album.image_count})
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <p className="upload-settings__hint">
              Albums are collections, not copies. Removing an image from an album never deletes
              the original.
            </p>
            {selectedAlbum ? (
              <div className="upload-settings__selected">
                <Check size={14} />
                New uploads will join <strong>{selectedAlbum.name}</strong>.
              </div>
            ) : null}
            {!albums.data?.length ? (
              <Link to="/app/albums" className="link-button">
                Create your first album <ArrowRight size={13} />
              </Link>
            ) : null}
          </div>

          <div className="panel upload-spec">
            <p className="eyebrow">Storage target</p>
            <div className="upload-spec__target">
              <span className={`storage-dot storage-dot--${backend}`} />
              <div>
                <strong>{backend === "s3" ? "Amazon S3" : "Local development storage"}</strong>
                <p>
                  {backend === "s3"
                    ? `${storage.data?.bucket ?? "bucket"} · ${storage.data?.region ?? "region"}`
                    : "Files stay on this machine"}
                </p>
              </div>
            </div>
            <dl className="upload-spec__list">
              <div>
                <dt>Maximum size</dt>
                <dd>{maxMb} MB</dd>
              </div>
              <div>
                <dt>Encryption</dt>
                <dd>{storage.data?.encryption ?? "Private"}</dd>
              </div>
              <div>
                <dt>Link lifetime</dt>
                <dd>{storage.data ? `${Math.round(storage.data.presign_ttl_seconds / 60)} min` : "15 min"}</dd>
              </div>
              <div>
                <dt>Public access</dt>
                <dd>{storage.data?.private === false ? "Check configuration" : "Disabled"}</dd>
              </div>
            </dl>
            <div className="upload-spec__note">
              <ShieldCheck size={15} />
              <p>
                Filenames are not trusted. AEROPIX generates a UUID object key for every upload
                and verifies the file signature before storage.
              </p>
            </div>
          </div>

          <div className="panel upload-tips">
            <p className="eyebrow">Good to know</p>
            <ul>
              <li>
                <Info size={14} />
                <span>Uploads are sent one at a time so progress remains accurate.</span>
              </li>
              <li>
                <Info size={14} />
                <span>Failed files stay in the queue and can be retried without re-selecting.</span>
              </li>
              <li>
                <Info size={14} />
                <span>Images larger than the limit are rejected before the request is sent.</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
