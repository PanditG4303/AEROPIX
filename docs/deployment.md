# AEROPIX — Deployment and Operations Guide

This is the operational runbook: build, deploy, update, back up, monitor and roll back. For the
one-time creation of AWS resources, read [aws-setup.md](aws-setup.md) first.

> **Verified status:** the production frontend build and the local backend have been run and
> tested in this workspace. The EC2/Nginx/systemd scripts and configurations have been reviewed
> but **not executed against a live AWS account**. Treat the first real deployment as a guided
> exercise and record what you observe.

---

## 1. Deployment models

| Model | Storage | Metadata | Use |
|---|---|---|---|
| Local development | `backend/data/media` + HMAC URLs | SQLite | Daily development, screenshots, demos without AWS |
| Single-origin local production | Same as above | SQLite | Verify the built SPA through FastAPI or Vite preview |
| EC2 + S3 (target) | Private S3 bucket | SQLite on EBS | Academic cloud deployment |

The application code is identical in all three. Only environment variables and the serving layer
change.

---

## 2. Prerequisites

### 2.1 Build machine

* Node.js 20+ and npm.
* Python 3.11+ (for local tests and the S3 checker).
* Git and SSH/SCP.

### 2.2 EC2 instance

* Ubuntu 24.04 LTS, 2 GB RAM recommended.
* Instance profile with the least-privilege S3 policy.
* Security group: 22 from your IP, 80 and 443 from the internet. **Port 8000 closed.**
* Elastic IP associated.
* Repository and `frontend/dist` present (see [aws-setup.md](aws-setup.md#4-put-the-application-on-the-instance)).

### 2.3 Bucket

* Private, Block Public Access 4/4, SSE-S3, versioning recommended.
* Same region as EC2.

---

## 3. Build the frontend

```bash
cd frontend
npm ci
npm run build
```

The build runs `tsc --noEmit` before Vite, so TypeScript errors fail the build. Output:

```text
frontend/dist/index.html
frontend/dist/assets/*.js, *.css, fonts
frontend/dist/theme-init.js
frontend/dist/demo/*.jpg
```

`dist/` is generated and git-ignored. Build it on the machine where you run the deployment, or
copy it to the server.

### Local production preview

Vite preview proxies `/api` to the backend (see `vite.config.ts`):

```bash
# Terminal 1 — backend
cd backend
../.venv/bin/python -m uvicorn app.main:app --port 8000

# Terminal 2 — production build
cd frontend
npm run build
npm run preview        # http://localhost:4173
```

On Windows, use `..\.venv\Scripts\python.exe`. The preview server binds `localhost` (IPv6); use
`http://localhost:4173`, not `127.0.0.1:4173`.

FastAPI can also serve the build directly when `FRONTEND_DIST` points at `frontend/dist`
(the default). In that case open `http://127.0.0.1:8000` and no Vite server is needed.

---

## 4. First deployment

On the instance, from the repository root:

```bash
sudo bash scripts/deploy_ec2.sh \
  --domain gallery.example.com \
  --seed \
  --verify-s3
```

### 4.1 What the script does

1. Installs `python3`, `python3-venv`, `nginx`, `rsync`, `curl`.
2. Creates the system user `aeropix` and `/opt/aeropix`.
3. Creates `/opt/aeropix/.env` on first run with a random secret and `STORAGE_BACKEND=s3`.
   It refuses to proceed with `STORAGE_BACKEND=local` unless `--allow-local-storage` is passed.
4. Copies `backend/` (excluding `.env`, `data/`, `.venv`, caches) and `frontend/dist/`.
5. Creates `/opt/aeropix/.venv` and installs `backend/requirements.txt`.
6. Installs `infrastructure/systemd/aeropix.service` and starts the service.
7. Installs `infrastructure/nginx/aeropix.conf`, sets `server_name`, enables the site and
   reloads Nginx.
8. Waits up to 30 seconds for `http://127.0.0.1:8000/api/health`.
9. Optionally seeds demo data (uploads a few MB to S3).
10. Optionally runs `scripts/check_s3.py`.

### 4.2 What it does not do

* No S3 bucket, IAM role, security group or EC2 creation.
* No DNS changes.
* No TLS certificate (Certbot is a separate, deliberate step).
* No automatic demo seeding unless `--seed`.

### 4.3 File layout after deployment

```text
/opt/aeropix/
├── .env                        mode 600, owner aeropix
├── .venv/
├── backend/
│   ├── app/
│   └── data/
│       └── aeropix.db          SQLite (WAL)
└── frontend/
    └── dist/                   React build
/etc/systemd/system/aeropix.service
/etc/nginx/sites-available/aeropix
```

### 4.4 systemd unit

Key properties:

* Runs as `aeropix:www-data`.
* `EnvironmentFile=/opt/aeropix/.env`.
* Gunicorn with **one** Uvicorn worker on `127.0.0.1:8000` (SQLite write safety).
* `Restart=always`, `RestartSec=3`.
* Hardening: `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem=full`, `ProtectHome`.
* Only `/opt/aeropix/backend/data` is writable.

Commands:

```bash
sudo systemctl status aeropix
sudo systemctl restart aeropix
sudo journalctl -u aeropix -f
```

### 4.5 Nginx

* Serves `/opt/aeropix/frontend/dist`.
* `location ^~ /api/` proxies to `127.0.0.1:8000`, so `/api/media/...` is not intercepted by
  the static-file regex.
* Hashed `/assets/` cached for one year; `index.html` not cached.
* SPA fallback via `try_files $uri $uri/ /index.html`.
* `client_max_body_size 20m` leaves room for multipart overhead over the 15 MB limit.
* Adds CSP, frame denial, referrer and permissions policies.
* gzip for text assets.

Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4.6 TLS

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d gallery.example.com
sudo certbot renew --dry-run
```

Certbot modifies the Nginx site and installs a renewal timer. Keep the HTTP→HTTPS redirect.

---

## 5. Configuration reference

| Variable | Production value | Notes |
|---|---|---|
| `ENVIRONMENT` | `production` | Enables strict checks, HSTS, CSP |
| `DEBUG` | `false` | |
| `SECRET_KEY` | random ≥24 chars | Default value is rejected in production |
| `DATABASE_URL` | `sqlite:////opt/aeropix/backend/data/aeropix.db` | Four slashes = absolute path |
| `STORAGE_BACKEND` | `s3` | `local` only for a deliberate fallback |
| `AWS_REGION` | `ap-south-1` | Must match the bucket |
| `AWS_BUCKET_NAME` | your bucket | Required in S3 mode |
| `S3_KEY_PREFIX` | empty or `prod` | Optional object prefix |
| `S3_PRESIGN_EXPIRE_SECONDS` | `900` | 60–604800 |
| `S3_USE_SSE` | `true` | AES256 on upload |
| `MAX_UPLOAD_MB` | `15` | 1–100 |
| `STORAGE_QUOTA_MB` | `5120` | Per-user quota |
| `ALLOWED_ORIGINS` | `https://gallery.example.com` | Empty is fine for same-origin |
| `ALLOWED_HOSTS` | domain(s) or `*` | Restrict after DNS is stable |
| `FRONTEND_DIST` | `/opt/aeropix/frontend/dist` | SPA build |
| `LOG_LEVEL` | `INFO` | `DEBUG` for investigation only |

Never put `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` in the EC2 `.env`. Use the instance
profile.

---

## 6. Updating the application

```bash
# On your computer
cd frontend && npm run build
cd ..
# Copy code + build to the instance (or git pull there)
scp -i key.pem -r backend frontend/dist infrastructure scripts ubuntu@IP:~/aeropix/
```

On the instance:

```bash
cd ~/aeropix
sudo bash scripts/deploy_ec2.sh --skip-apt
```

The script rsyncs code and build, reinstalls Python dependencies, restarts the service and
checks health. It keeps the existing `.env` and SQLite data. Because `backend/data` is excluded
from rsync, uploads and metadata survive.

### Database schema changes

There is no migration framework. For a column change:

1. Back up the database (Section 8).
2. Add an Alembic migration, or recreate the database for a fresh demo.
3. Test locally first.

For an academic demo, recreating the demo data is acceptable:

```bash
sudo systemctl stop aeropix
sudo -u aeropix rm -f /opt/aeropix/backend/data/aeropix.db
sudo systemctl start aeropix
cd /opt/aeropix/backend && sudo -u aeropix /opt/aeropix/.venv/bin/python -m app.seed
```

### Rollback

Keep the previous release directory or Git commit:

```bash
cd ~/aeropix
git checkout <previous-commit>
sudo bash scripts/deploy_ec2.sh --skip-apt
```

If the database schema changed, restore the matching backup. The S3 objects are unaffected by
code rollbacks.

---

## 7. Verification

```bash
# On the instance
curl -fsS http://127.0.0.1:8000/api/health
sudo systemctl is-active aeropix
sudo nginx -t

# From your computer
bash scripts/verify_deployment.sh https://gallery.example.com
DEMO_EMAIL=demo@aeropix.app DEMO_PASSWORD='AeropixDemo123!' \
  bash scripts/verify_deployment.sh https://gallery.example.com
```

The authenticated run checks login, storage status, a signed image URL and rejection of an
unsigned URL.

S3-specific:

```bash
set -a; source /opt/aeropix/.env; set +a
/opt/aeropix/.venv/bin/python ~/aeropix/scripts/check_s3.py
```

---

## 8. Backup and restore

### 8.1 Metadata

```bash
# WAL-safe backup
sudo -u aeropix sqlite3 /opt/aeropix/backend/data/aeropix.db \
  ".backup '/tmp/aeropix-$(date +%F-%H%M).db'"

# Copy it off the instance
scp -i key.pem ubuntu@IP:/tmp/aeropix-*.db ./backups/
```

Restore:

```bash
sudo systemctl stop aeropix
sudo cp aeropix-2026-11-25-1200.db /opt/aeropix/backend/data/aeropix.db
sudo chown aeropix:www-data /opt/aeropix/backend/data/aeropix.db
sudo systemctl start aeropix
```

### 8.2 Objects

Enable S3 versioning. Optionally replicate or sync:

```bash
aws s3 sync s3://your-bucket s3://your-backup-bucket
```

### 8.3 Consistency

Metadata and objects are separate stores. A database backup alone cannot restore deleted
objects. For an exam demo, take a database backup and an S3 sync at the same time, and record
both timestamps.

---

## 9. Monitoring and logs

| What | Command |
|---|---|
| Service state | `systemctl status aeropix` |
| Application logs | `journalctl -u aeropix -f` |
| Nginx access | `tail -f /var/log/nginx/aeropix.access.log` |
| Nginx errors | `tail -f /var/log/nginx/aeropix.error.log` |
| Health | `curl -s http://127.0.0.1:8000/api/health` |
| Storage status | Log in → Settings, or `GET /api/storage/status` |
| Disk | `df -h`, `du -sh /opt/aeropix/backend/data` |
| Memory | `free -h` |

The application logs slow requests (>1500 ms), storage errors, startup configuration and
shutdown. It never logs passwords or JWTs.

---

## 10. Security checklist

- [ ] `.env` mode 600, owned by `aeropix`
- [ ] No AWS keys in `.env` on EC2
- [ ] Bucket Block Public Access 4/4
- [ ] Bucket default encryption AES256
- [ ] No bucket ACLs or public policy
- [ ] Security group does not expose 8000
- [ ] SSH restricted to your IP
- [ ] `SECRET_KEY` random and not the development default
- [ ] HTTPS enabled; HTTP redirects
- [ ] `ALLOWED_HOSTS` restricted to the domain
- [ ] Demo password changed or demo data removed before a public demo
- [ ] `.pem` key not committed or shared
- [ ] `pip` and `npm` dependencies installed from lockfiles

### Demo credentials in production

The seed script creates `demo@aeropix.app` with a known password. That is convenient for a
class demo but unacceptable for a public site. Before exposing the URL beyond the assessment:

```bash
# Option 1: change the demo password through Settings.
# Option 2: remove demo data and disable seeding.
sudo -u aeropix /opt/aeropix/.venv/bin/python -m app.seed --reset
# Then set SEED_DEMO_DATA=false in /opt/aeropix/.env and restart.
```

---

## 11. Performance notes

* One `t3.small` and one worker handle a classroom demo comfortably.
* S3 transfer bypasses EC2, so image bandwidth does not consume application CPU.
* Thumbnails are generated once at upload and stored separately; the gallery loads thumbnails,
  not originals.
* Hashed assets are cached for a year; `index.html` is not cached, so updates appear promptly.
* SQLite WAL allows reads during writes.
* For more than a handful of concurrent uploaders, move to PostgreSQL and multiple workers.

---

## 12. Troubleshooting quick reference

| Symptom | Check | Fix |
|---|---|---|
| 502 from Nginx | `systemctl status aeropix`, journal | Fix the app error, restart |
| App exits at startup | `journalctl -u aeropix` | Missing `SECRET_KEY`/bucket, bad `.env` |
| `AccessDenied` from S3 | role policy, bucket ARN, region | Correct the policy/bucket |
| Images 403 after 15 min | expected expiry | Refresh the gallery |
| Upload 413 | Nginx `client_max_body_size` | Keep ≥20 MB for a 15 MB app limit |
| Upload 422 | file type/corruption | Use JPG/PNG/WEBP/GIF under 15 MB |
| Login fails | seeded? password? | Re-seed or reset the password |
| SPA route 404 | Nginx `try_files` | Restore the SPA fallback |
| Certificate error | DNS, port 80, Certbot | Re-run Certbot after DNS resolves |
| Disk full | `df -h` | Clean old logs/backups; resize EBS |

---

## 13. Teardown

See [aws-setup.md §9](aws-setup.md#9-teardown) and
[`scripts/cleanup_aws.sh`](../scripts/cleanup_aws.sh). The cleanup script is a dry run by
default and requires two typed confirmations before deleting anything.
