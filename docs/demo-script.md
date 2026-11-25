# AEROPIX — Viva / Demo Script

**Target duration:** 8–10 minutes  
**Preparation:** backend running, frontend production build running, demo account seeded,
browser at 100% zoom, notifications off.

---

## 0. Before the examiner arrives (5 minutes)

```bash
# Terminal 1 — backend
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000

# Terminal 2 — production build
cd frontend
npm run build
npm run preview
```

Open `http://localhost:4173`, log in with the demo account once to confirm it works, then log
out. Keep these terminals visible:

* `http://localhost:4173` — the app
* `http://127.0.0.1:8000/api/docs` — Swagger UI
* a terminal with the test command ready

**Fallback:** if the preview server fails, open `http://127.0.0.1:8000` (FastAPI serves
`frontend/dist` directly). If the backend fails, show the screenshots and the test output, then
restart.

---

## 1. Opening (45 seconds)

> "AEROPIX is a cloud-based image storage and gallery system. Most student projects save uploads
> to a local folder and call it cloud. AEROPIX stores image bytes in a private Amazon S3 bucket,
> keeps only metadata in SQLite, and gives the browser short-lived presigned URLs. It runs on
> EC2 behind Nginx, and it also runs locally with the same code so I can demonstrate it without
> an AWS bill."

Show the landing page (`01-landing.png` if offline). Point out the original illustration and the
statement that images are private.

---

## 2. Authentication (1 minute)

1. Click **Login**.
2. Enter `demo@aeropix.app` / `AeropixDemo123!`.
3. Land on the dashboard.

> "Passwords are hashed with Argon2. Login returns a JWT, sent as a Bearer token. Every query is
> scoped to the authenticated user, so another account cannot see these images even if it guesses
> an ID."

Optional: open DevTools → Application → Local Storage to show the token exists, then note that
it is never logged.

---

## 3. Dashboard (1 minute)

Point to:

* total images, albums, favourites, storage used;
* the 14-day upload area chart;
* the storage-by-type donut;
* recent uploads.

> "These are SQL aggregates over my rows only, not hardcoded numbers. The charts are Recharts and
> they disable animation when the operating system requests reduced motion."

---

## 4. Gallery (1.5 minutes)

1. Open **Gallery**.
2. Switch masonry → grid → list.
3. Type part of a filename in search.
4. Filter by type and by favourites.
5. Change sort order.
6. Open an image in the lightbox; press `→` and `Esc`.

> "The gallery requests thumbnails, not originals. Each URL is generated per request and expires
> after 15 minutes. If someone copies a URL and strips the signature, the storage layer returns
> 403."

Optional: copy an image URL, open it in a new tab (works), then remove the query string (403).
This is a strong live proof.

---

## 5. Upload (1.5 minutes)

1. Open **Upload**.
2. Drag `frontend/public/demo/demo-05.jpg` onto the drop zone.
3. Show progress and success.
4. Click through to the new image.
5. Return to Upload or Gallery and show it persisted.

> "The server checks the extension, the MIME type, the magic bytes with Pillow, the size and the
> quota. It generates a UUID key and a stripped JPEG thumbnail. In S3 mode both objects are
> written with AES256 server-side encryption."

Then delete the test image to leave the demo library clean. Mention that the browser script does
the same cleanup automatically.

---

## 6. Albums (1 minute)

1. Open **Albums**; show three albums and covers.
2. Open one album; show its images.
3. Add an image, then remove it.
4. Point out the delete-album confirmation text.

> "Albums are many-to-many through an explicit join table with an added_at timestamp. Deleting an
> album deletes only the membership rows; the photographs stay. There is a test for exactly that
> behaviour."

---

## 7. Image detail and settings (1 minute)

1. Open an image detail page.
2. Toggle favourite; rename it; show the metadata.
3. Open **Settings**.
4. Switch to dark theme.
5. Show the storage panel: backend, reachable, encryption, TTL, quota.

> "In local mode the backend is `local` and URLs are HMAC-signed. In S3 mode the same panel shows
> `s3`, the bucket, the region and SSE-S3. The UI does not change — that is the storage
> abstraction."

---

## 8. Architecture and cloud evidence (2 minutes)

Show the architecture diagram (`infrastructure/architecture/aeropix-architecture.png`) and the ER
diagram.

> "Nginx serves the React build and proxies `/api` to Gunicorn/Uvicorn. FastAPI writes metadata to
> SQLite and objects to S3 through Boto3. On EC2 there are no access keys: Boto3 gets temporary
> credentials from an IAM instance profile scoped to one bucket and five actions. The bucket
> blocks all public access; the browser only ever receives presigned URLs."

If AWS was deployed, show the genuine console screenshots and the live URL. If not, say clearly:

> "I could not deploy to AWS in this environment because I did not have an account or
> credentials. The deployment scripts, IAM policy and Nginx/systemd configuration are included
> and documented. The S3 path is covered by automated tests against a mock, but I am not claiming
> a live AWS deployment."

This honesty is expected and is better than a fabricated console screenshot.

---

## 9. Tests (1 minute)

Run:

```bash
cd backend
..\.venv\Scripts\python.exe -m pytest -q
```

Expected output:

```text
34 passed in 17.04s
```

> "Thirty-four tests cover auth, ownership isolation, upload validation, signed-URL tampering,
> albums, dashboard scoping, backend switching and S3 round trips. The browser script also ran 17
> checks against the production build with zero console errors and produced the 18 screenshots."

Show `docs/screenshots/capture-report.json` if asked for evidence.

---

## 10. Closing (30 seconds)

> "AEROPIX separates metadata from binaries, keeps the bucket private, uses least-privilege IAM
> and presigned URLs, and ships with deployment, verification and cleanup scripts. The local
> mode made it possible to build and test without AWS, while keeping the same S3 code path for
> the real deployment. Future work is PostgreSQL, multiple workers, CloudFront and CI/CD."

Invite questions.

---

## Likely questions and short answers

| Question | Answer |
|---|---|
| Why not store images in the database? | Binaries bloat SQLite, slow backups and cannot be served directly; object storage is the right tool. |
| Why presigned URLs instead of proxying? | Lower EC2 CPU/bandwidth, direct S3 transfer, and the bucket stays private. |
| What happens when a URL expires? | S3 returns 403; the SPA refetches the list and gets a new URL. |
| How do you stop user A seeing user B's image? | Every query includes `user_id` from the JWT; foreign IDs return 404. |
| Where are AWS keys stored? | Nowhere on EC2. The instance profile supplies temporary credentials. |
| Why SQLite? | Zero-cost, simple backup, adequate for one worker; PostgreSQL is the documented upgrade. |
| Why one Gunicorn worker? | Avoids SQLite write contention; scaling path is PostgreSQL + more workers. |
| Is the bucket public? | No: Block Public Access 4/4, no ACLs, SSE-S3, no website hosting. |
| How do you verify the bucket? | `scripts/check_s3.py` checks configuration, round trip, presign and an unsigned 403. |
| What is not finished? | Live AWS verification, migrations, rate limiting, cross-browser/a11y automation, load testing. |
| Did you use AI-generated images? | No. The eight demo artworks are procedurally generated with Pillow and labelled DEMO. |
| Did you use Bootstrap? | No. The design system and illustrations are original. |

---

## Cleanup after the demo

1. Delete the test upload if you created one.
2. Log out.
3. Stop the preview and backend terminals (`Ctrl+C`).
4. If AWS was used, stop or terminate resources and check billing the next day.
5. Keep the screenshots and test output for the report.
