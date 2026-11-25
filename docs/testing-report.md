# AEROPIX — Testing Report

**Test date:** 25 November 2026  
**Application version:** 1.0.0  
**Environment:** Windows 11, Python 3.11 virtual environment, Node.js 20, Google Chrome  
**Backend:** `http://127.0.0.1:8000` (Uvicorn)  
**Frontend under test:** production build served by Vite preview at `http://localhost:4173`

---

## 1. Summary

| Test layer | Result | Evidence |
|---|---|---|
| Backend automated suite | **34 passed, 0 failed** in **17.04 s** | `pytest -q` output below |
| Browser verification | **17 / 17 checks passed** | `docs/screenshots/capture-report.json` |
| Browser console errors | **0** | Same report |
| Broken images | **0** on tested pages | Browser script assertion |
| Genuine screenshots | **18** | `docs/screenshots/` |
| Live AWS deployment | **Not tested** | No AWS account/credentials available |
| Deployment scripts on EC2 | **Not executed** | Reviewed statically only |

> The backend suite uses `moto` to mock Amazon S3. This validates the Boto3 integration logic,
> but it is **not** proof of a live AWS deployment. No document in this repository claims
> otherwise.

---

## 2. Backend automated tests

### 2.1 Command

```bash
cd backend
..\.venv\Scripts\python.exe -m pytest -q
```

### 2.2 Verified output

```text
..................................                                       [100%]
34 passed in 17.04s
```

### 2.3 Test inventory

#### Authentication — `backend/tests/test_auth.py` (7)

| Test | What it proves |
|---|---|
| `test_registration_hashes_password` | Password is stored as an Argon2 hash, not plaintext |
| `test_registration_rejects_duplicate_email` | Case-insensitive uniqueness |
| `test_registration_validates_password_strength` | Weak passwords are rejected |
| `test_login_success_and_failure` | Correct credentials return a JWT; wrong ones do not |
| `test_protected_endpoint_requires_token` | Missing/invalid tokens return 401 |
| `test_profile_update_and_logout` | Name/theme update and explicit logout |
| `test_change_password` | Old password required; new password works |

#### Images — `backend/tests/test_images.py` (12)

| Test | What it proves |
|---|---|
| `test_upload_valid_png_and_signed_media_url` | Real PNG accepted, signed URL serves bytes |
| `test_signed_media_url_rejects_tampering` | Modified HMAC signature returns 403 |
| `test_upload_rejects_invalid_file_type` | Disallowed extension rejected |
| `test_upload_rejects_extension_mismatch` | `.png` containing JPEG bytes rejected |
| `test_upload_rejects_corrupt_image` | Pillow verification failure returns 422 |
| `test_upload_size_limit` | Oversized upload rejected |
| `test_upload_requires_authentication` | Upload without a token returns 401 |
| `test_gallery_search_sort_and_type_filter` | Search, sort and type filter work and are scoped |
| `test_favorite_and_rename` | PATCH updates favourite and filename |
| `test_image_detail_and_delete_removes_object` | Detail works; delete removes metadata and stored object |
| `test_ownership_isolation` | Another user's image is invisible (404) |
| `test_bulk_delete` | Multiple owned images deleted; foreign IDs rejected |

#### Albums — `backend/tests/test_albums.py` (5)

| Test | What it proves |
|---|---|
| `test_album_crud` | Create, list, rename and delete |
| `test_add_remove_images_and_cover` | Membership changes and automatic cover |
| `test_album_delete_keeps_images` | Deleting an album does not delete its images |
| `test_album_ownership_isolation` | Cross-user album access returns 404 |
| `test_cannot_add_another_users_image` | Membership cannot be abused across accounts |

#### Dashboard — `backend/tests/test_dashboard.py` (3)

| Test | What it proves |
|---|---|
| `test_dashboard_statistics` | Totals, activity series and type breakdown |
| `test_dashboard_is_user_scoped` | Statistics exclude other users |
| `test_storage_status_endpoint` | Authenticated storage description |

#### Storage — `backend/tests/test_storage.py` (6)

| Test | What it proves |
|---|---|
| `test_s3_storage_roundtrip` | Put/get/exists/delete against mocked S3 |
| `test_s3_key_prefix_is_applied` | `S3_KEY_PREFIX` is honoured |
| `test_s3_health_and_description` | Bucket health and metadata |
| `test_storage_backend_switching` | Factory returns local vs S3 based on settings |
| `test_local_signed_urls_expire_and_reject_tampering` | Expiry and signature enforcement |
| `test_end_to_end_upload_to_mocked_s3` | API upload through the S3 backend |

#### System — `backend/tests/test_system.py` (1)

| Test | What it proves |
|---|---|
| `test_health_endpoint` | `/api/health` reports app, database and storage state |

**Total: 34 tests.**

### 2.4 Test isolation

* Each test uses an isolated temporary SQLite database and storage directory.
* The S3 tests use `moto`'s in-process mock; no network calls and no credentials are required.
* The authenticated client fixture registers a user and injects the bearer token.
* Test objects are deleted with the temporary directories.

### 2.5 What the backend suite does not cover

* Real IAM policy evaluation or bucket-policy behaviour.
* Real S3 latency, retries, clock skew or multipart uploads (files are small).
* Rate limiting, account lockout or brute-force resistance.
* Concurrent writers (SQLite is single-writer by design).
* Email verification or password reset (not implemented).

---

## 3. Browser verification

### 3.1 Method

`frontend/scripts/capture-screenshots.mjs` launches the locally installed Google Chrome through
`playwright-core`, drives the **production build**, logs in with the demo account, performs a
real upload through the UI, checks the DOM, captures screenshots and removes the uploaded test
image through the API.

### 3.2 Verified output

```text
PASS Landing hero renders
PASS Hero illustration present
PASS 404 page renders
PASS Demo login reaches dashboard
PASS Dashboard stat cards rendered — 4 cards
PASS Recharts charts rendered — 2 chart surfaces
PASS No broken images on dashboard
PASS Gallery renders demo images — 8 cards
PASS Lightbox opens from gallery
PASS Real upload succeeds through UI
PASS Uploaded test image cleaned up — 1 removed
PASS Albums page lists albums — 3 albums
PASS Album detail renders
PASS Image detail renders
PASS Settings page renders
PASS Dark theme applies — data-theme=dark
PASS No browser console errors — 0 errors

Screenshots saved to ...\docs\screenshots
Console errors: 0
```

### 3.3 Run metadata

| Field | Value |
|---|---|
| Base URL | `http://localhost:4173` (Vite preview, production build) |
| Started | 2026-11-25T15:45:12Z |
| Finished | 2026-11-25T15:46:22Z |
| Duration | ~70 s |
| Checks passed | 17 / 17 |
| Console errors | 0 |
| Screenshots | 18 |

The machine-readable log is
[`docs/screenshots/capture-report.json`](screenshots/capture-report.json).

### 3.4 Screenshot evidence

| # | File | Screen |
|---|---|---|
| 01 | `01-landing.png` | Marketing landing page, full scroll |
| 02 | `02-login.png` | Login |
| 03 | `03-register.png` | Registration |
| 04 | `04-not-found.png` | Custom 404 |
| 05 | `05-dashboard.png` | Dashboard, light theme |
| 06 | `06-gallery-masonry.png` | Masonry gallery |
| 07 | `07-gallery-lightbox.png` | Lightbox |
| 08 | `08-gallery-grid.png` | Grid view |
| 09 | `09-gallery-list.png` | List view |
| 10 | `10-upload-empty.png` | Upload centre, empty queue |
| 11 | `11-upload-success.png` | Successful real upload |
| 12 | `12-albums.png` | Albums |
| 13 | `13-album-detail.png` | Album detail |
| 14 | `14-image-detail.png` | Image detail |
| 15 | `15-settings.png` | Settings |
| 16 | `16-mobile-dashboard.png` | 390 px mobile dashboard |
| 17 | `17-dashboard-dark.png` | Dashboard, dark theme |
| 18 | `18-gallery-dark.png` | Gallery, dark theme |

These are genuine captures of the running build. They show **local storage mode**, not AWS.

### 3.5 Upload test detail

* File: `frontend/public/demo/demo-05.jpg` (a local, original demo image).
* Uploaded through the real upload centre, not by calling the API directly.
* Success state and thumbnail were asserted.
* The image was then deleted through the authenticated API, returning the library to 8 demo
  images. The cleanup result was asserted (`1 removed`).

---

## 4. Security test matrix

| Control | Test | Result |
|---|---|---|
| Protected routes reject anonymous access | `test_protected_endpoint_requires_token` | Pass |
| Password hashing | `test_registration_hashes_password` | Pass |
| Duplicate accounts | `test_registration_rejects_duplicate_email` | Pass |
| Cross-user image access | `test_ownership_isolation` | Pass |
| Cross-user album access | `test_album_ownership_isolation` | Pass |
| Cross-user album membership | `test_cannot_add_another_users_image` | Pass |
| Signed URL tampering | `test_signed_media_url_rejects_tampering` | Pass |
| Signed URL expiry | `test_local_signed_urls_expire_and_reject_tampering` | Pass |
| Invalid/corrupt uploads | three upload validation tests | Pass |
| Oversized uploads | `test_upload_size_limit` | Pass |
| S3 object privacy | Design + `moto` tests; live check pending | **Not verified live** |
| IAM least privilege | Static policy review | **Not verified live** |
| TLS/headers | Nginx/FastAPI config review; local header checks | Partially verified |

---

## 5. Manual checks performed

| Area | Check | Result |
|---|---|---|
| Auth | Register → auto-login → logout → login | Pass |
| Auth | Refresh keeps session; expired token redirects | Pass |
| Upload | Single and multiple files, progress, retry | Pass |
| Upload | Invalid type shows a readable error | Pass |
| Gallery | Masonry/grid/list, search, filters, sort, lightbox | Pass |
| Gallery | Keyboard `Escape` closes the lightbox | Pass |
| Albums | Create, add images, remove, rename, delete keeps images | Pass |
| Detail | Favourite, rename, download, delete | Pass |
| Settings | Name/theme update, password change, storage panel | Pass |
| Themes | Light, dark, system; no flash on reload | Pass |
| Responsive | 390 px, 768 px, 1440 px layouts | Pass |
| 404 | Unknown route renders the custom page | Pass |
| Reduced motion | Animations disabled when the OS preference is set | Pass |

---

## 6. Reproducing the results

### Backend

```bash
cd backend
..\.venv\Scripts\python.exe -m pytest -q          # Windows
../.venv/bin/python -m pytest -q                  # Linux/macOS
```

### Browser checks and screenshots

Requirements: Chrome installed, backend running on port 8000, production build available.

```bash
cd frontend
npm run build
npm run preview          # terminal 1 (or let FastAPI serve dist)
node scripts/capture-screenshots.mjs
```

The script expects the demo account to exist. Seed it first:

```bash
cd backend
..\.venv\Scripts\python.exe -m app.seed
```

### S3 verification (requires real AWS)

```bash
python scripts/check_s3.py
```

---

## 7. Limitations and threats to validity

1. **No live AWS run.** `moto` reproduces S3 API behaviour, not AWS IAM, bucket policies,
   network conditions or regional latency. The real deployment must be verified separately with
   `scripts/check_s3.py` and `scripts/verify_deployment.sh`.
2. **No EC2 execution.** The Nginx and systemd files were reviewed but not started on a real
   instance.
3. **One browser.** Only Chrome was automated. Firefox and Safari were not tested.
4. **No load testing.** Performance statements are qualitative and based on small demo files.
5. **No automated accessibility audit.** Keyboard and contrast checks were manual; axe or
   Lighthouse should be added for a formal audit.
6. **Single operating system for development.** Windows 11 was used locally; the deployment
   target is Ubuntu 24.04.
7. **Demo data is abstract art.** It proves the pipeline, not photographic colour management.

These limitations are deliberate and disclosed. The project does not claim a passing AWS
deployment or production-scale performance.

---

## 8. Conclusion

The application meets its functional and security requirements at the local level: all 34
backend tests pass, the production build passes 17 browser checks with no console errors, and 18
genuine screenshots document the interface. The cloud-specific code is covered by mocked S3
tests and reviewed configuration, but live AWS verification remains the student's responsibility
after deployment. That gap is documented rather than concealed.
