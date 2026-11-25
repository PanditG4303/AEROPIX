# AEROPIX — User Manual

AEROPIX is a private image library. Every account sees only its own images and albums. This
manual walks through every screen.

---

## 1. Opening the application

| Environment | URL |
|---|---|
| Local development | `http://localhost:5173` |
| Local production preview | `http://localhost:4173` |
| FastAPI single-origin | `http://127.0.0.1:8000` |
| EC2 deployment | `https://your-domain.example` |

**Demo account**

```text
Email:    demo@aeropix.app
Password: AeropixDemo123!
```

The demo library contains eight original abstract artworks. Each is marked **DEMO** so it is
never mistaken for a real photograph.

> If the demo account does not exist, seed it from the backend directory:
> `python -m app.seed` (Windows: `..\.venv\Scripts\python.exe -m app.seed`).

---

## 2. Creating an account

1. Click **Create account** on the landing page or **Register** on the login page.
2. Enter your **name** (2–80 characters).
3. Enter a valid **email** that has not been used before.
4. Choose a password:
   * at least 8 characters;
   * at least one letter;
   * at least one number.
5. Repeat the password in **Confirm password**.
6. Submit. You are signed in automatically and taken to the dashboard.

Passwords are hashed with Argon2 before storage. Nobody — including the administrator — can read
your password.

### If registration fails

| Message | Meaning |
|---|---|
| "An account with this email already exists" | Log in instead, or use another email |
| "Password must…" | Follow the three rules shown under the field |
| "Passwords do not match" | Re-type the confirmation |
| "Enter a valid email address" | Check for typos and spaces |

---

## 3. Logging in and out

1. Open **Login**.
2. Enter your email and password.
3. Optionally use the demo credentials shown on the page.
4. Submit.

Your session token is stored in the browser. It lasts seven days; after that you are asked to
log in again. **Log out** in the sidebar clears the token immediately.

If you see "Your session has expired", log in again. This is normal after the token expires or
after the backend secret changes.

---

## 4. Navigating the app

After login, the sidebar contains:

| Item | Purpose |
|---|---|
| **Dashboard** | Library totals, charts and recent activity |
| **Gallery** | All your images with search, filters and views |
| **Upload** | Add new photographs |
| **Albums** | Organise images into collections |
| **Settings** | Profile, password, theme and storage information |

On a phone, the sidebar collapses into a menu button. The theme toggle is available in the top
bar.

---

## 5. Dashboard

The dashboard is a snapshot of your library:

* **Total images** — number of photographs you own.
* **Albums** — number of collections.
* **Favourites** — images you starred.
* **Storage used** — bytes used against your quota, with a percentage bar.
* **Upload activity** — area chart of the last 14 days.
* **Storage by type** — donut chart of JPG/PNG/WEBP/GIF usage.
* **Recent uploads** — the newest images with quick links.
* **Recent albums** — your latest collections.

All numbers are computed from your account only. A new account starts at zero.

If the charts appear empty, upload an image or check that the backend is running. Charts respect
your reduced-motion setting: when reduced motion is enabled they render without animation.

---

## 6. Gallery

### 6.1 Views

Use the view switcher to choose:

* **Masonry** — variable-height columns, best for mixed orientations.
* **Grid** — even tiles, best for scanning.
* **List** — compact rows with metadata, best for filenames and sizes.

The choice is remembered while you browse.

### 6.2 Search and filters

* **Search** matches part of the original filename (case-insensitive).
* **Type** filters JPG, PNG, WEBP or GIF.
* **Favourites** shows only starred images.
* **Sort** offers newest, oldest, name A–Z, name Z–A, largest and smallest.

Filters combine. Clear them with the reset control.

### 6.3 Lightbox

Click an image to open the lightbox:

* `←` / `→` move between images;
* `Esc` closes;
* the close button and backdrop also close;
* focus returns to the image you opened.

### 6.4 Selecting and deleting

Where selection is available, tick images to select them, then use the bulk action bar. You are
asked to confirm before deletion. Deleting an image removes its original and thumbnail from
storage as well as its metadata; this cannot be undone.

### 6.5 Empty gallery

A new account shows an illustrated empty state with a link to the upload centre. This is
expected, not an error.

---

## 7. Uploading images

### 7.1 Accepted files

| Property | Value |
|---|---|
| Formats | JPG, JPEG, PNG, WEBP, GIF |
| Maximum size | 15 MB per file (configurable by the administrator) |
| Number of files | Multiple; add them in one drop or one selection |
| Animated images | Accepted; the thumbnail uses the first frame |

The server verifies the real file type, not just the extension. Renaming a `.txt` file to `.jpg`
will be rejected.

### 7.2 Steps

1. Open **Upload**.
2. Drag files onto the drop zone, or click **Browse files**.
3. Review the queue. Each file shows its name, size and state.
4. Uploads start automatically. A progress bar shows the transfer.
5. A successful file moves to **Uploaded** and appears in the gallery.

### 7.3 Queue states

| State | Meaning | Action |
|---|---|---|
| Queued | Waiting to start | Wait |
| Uploading | Transfer in progress | Wait or cancel |
| Uploaded | Stored successfully | Open in gallery |
| Failed | Rejected or network error | Read the message, then **Retry** |
| Cancelled | You stopped it | Add it again if needed |

### 7.4 Common rejections

| Message | Fix |
|---|---|
| "Unsupported file type" | Use JPG, PNG, WEBP or GIF |
| "File is larger than 15 MB" | Resize or compress the image |
| "The file does not appear to be a valid image" | The file is corrupt or mislabelled |
| "Storage quota exceeded" | Delete some images or ask the administrator to raise the quota |
| "Not authenticated" | Log in again |

### 7.5 After uploading

The image is written to the active storage backend:

* **Local mode** — `backend/data/media/users/{id}/...`, served through signed URLs.
* **S3 mode** — `s3://your-bucket/users/{id}/images/...`, served through presigned URLs.

In both cases the gallery receives a fresh URL automatically. If a URL expires while a page is
open, refresh the gallery to obtain new URLs.

---

## 8. Albums

Albums are collections, not folders. An image can belong to several albums without being copied.

### 8.1 Create

1. Open **Albums**.
2. Click **New album**.
3. Enter a name (up to 80 characters) and an optional description.
4. Save. The album appears with a cover taken from its first image.

Album names must be unique **within your account**. Another user may use the same name.

### 8.2 Add images

1. Open an album.
2. Choose **Add images**.
3. Select images from your library.
4. Confirm. Membership is recorded with a timestamp.

### 8.3 Remove an image

Open the album, find the image and choose **Remove from album**. The image remains in your
library and in any other albums.

### 8.4 Rename or delete

* **Rename** updates the name and description.
* **Delete album** removes the album and its membership links. **The images are kept.** This is
  intentional and is covered by an automated test.

---

## 9. Image detail

Click an image, then **Open details** (or use the detail route) to see:

* a large preview;
* original filename, type, dimensions, size and upload date;
* the albums it belongs to;
* favourite, rename, download and delete actions.

### Favourite

The star toggles `is_favorite`. Favourites appear in the gallery filter and in dashboard totals.

### Rename

Renaming changes the display name only. The object key and stored file remain unchanged, so
links keep working.

### Download

Download requests a fresh signed URL and saves the original file. In S3 mode the download is
served directly by S3.

### Delete

Deletion removes the original object, the thumbnail and the metadata row. Album memberships are
removed automatically. You must confirm first. There is no recycle bin in this version.

---

## 10. Settings

### 10.1 Profile

* Change your display name.
* Choose **Light**, **Dark** or **System** theme.
* Save. The theme is applied immediately and stored on your profile and in the browser.

### 10.2 Password

1. Enter your current password.
2. Enter a new password that meets the rules.
3. Confirm and save.

Other sessions are not revoked automatically in this version; log out on shared devices.

### 10.3 Storage panel

The panel shows the active backend and its health:

| Field | Meaning |
|---|---|
| Backend | `local` or `s3` |
| Provider | Local disk or Amazon S3 |
| Configured | Whether required settings are present |
| Reachable | Health check result (S3 `HeadBucket`) |
| Bucket / region | S3 target (S3 mode) |
| Encryption | SSE-S3 / AES256 in S3 mode |
| Presign TTL | Lifetime of image URLs in seconds |
| Max upload | Per-file limit |
| Quota | Total bytes allowed for your account |
| Private | Confirms objects are not public |

If **Reachable** is false in S3 mode, the bucket name, region or IAM role is wrong. The rest of
the app may still work with cached metadata, but uploads will fail. Ask the administrator to run
`scripts/check_s3.py`.

---

## 11. Themes, motion and accessibility

* **Theme** follows your choice or the operating system. The correct theme is applied before the
  page paints, so there is no white flash on reload.
* **Reduced motion** is respected: if your OS asks for reduced motion, page transitions, hover
  lift and chart animations are disabled.
* **Keyboard** — all controls are reachable by Tab; dialogs close with `Esc`; focus is visible.
* **Screen readers** — form fields have labels, toasts announce status, decorative illustrations
  are hidden.
* **Zoom** — the layout remains usable at 200% browser zoom.
* **Mobile** — tested down to 390 px wide; the sidebar becomes a drawer and the gallery switches
  to fewer columns.

---

## 12. Troubleshooting

| Problem | Likely cause | What to do |
|---|---|---|
| Page is blank | Backend not running or wrong API URL | Start the backend; check the browser console |
| "Failed to fetch" | Backend stopped or CORS blocked | Start Uvicorn; confirm the origin is allowed |
| Login says invalid credentials | Wrong password or account not seeded | Try the demo account; reset the password via the database if you own it |
| Images show a broken icon | Signed URL expired or object missing | Refresh; if it persists, check storage status |
| Upload fails at 100% | S3 permission or bucket error | Check the storage panel; run `check_s3.py` |
| 413 error | File exceeds the server/proxy limit | Use a smaller file; check Nginx `client_max_body_size` |
| 502 error | Gunicorn down | `sudo systemctl restart aeropix` |
| Theme flashes | `theme-init.js` missing from the build | Rebuild the frontend |
| Album delete removed images? | It should not | Check you deleted images, not the album; review the confirmation text |

---

## 13. Privacy and data

* Your images are visible only to your account. Other users receive "not found" for your IDs.
* The S3 bucket is private; there are no public object URLs.
* Image URLs expire after 15 minutes by default.
* Deleting an image deletes its stored objects. Deleting an album does not delete images.
* The administrator of a self-hosted deployment can access the server and the bucket. This is
  not a zero-knowledge encrypted store.
* Do not upload sensitive documents; this is an academic demonstration, not a certified backup
  service.

---

## 14. For the administrator

```bash
# Seed demo data (local or S3, depending on .env)
cd backend
python -m app.seed

# Reset demo data and objects
python -m app.seed --reset

# Allow seeding into S3 explicitly
python -m app.seed --allow-s3

# Run the backend tests
python -m pytest -q

# Verify a real S3 bucket
python ../scripts/check_s3.py

# Verify a deployment over HTTP
bash ../scripts/verify_deployment.sh https://your-domain.example
```

See [deployment.md](deployment.md) for service management, backups and updates.
