# AEROPIX — AWS Setup Guide (beginner friendly)

This guide creates the cloud resources AEROPIX needs. It is written for someone who has never
opened the AWS console. Read the whole guide before starting, and **do not create paid resources
until you are ready to deploy and demonstrate**.

> **What this guide does not do:** it does not click anything for you, and the project scripts do
> not create AWS resources. Every step below is manual and explicit so you stay in control of
> cost. AWS console labels occasionally change; if a label differs, look for the closest match.

---

## 0. Before you start

### 0.1 What you need

* An AWS account with billing enabled (a student account is fine).
* A credit/debit card on file (AWS requires one even for free-tier usage).
* A terminal with the AWS CLI **or** patience for the console.
* This repository on your computer, with the frontend built (`frontend/dist/index.html`).
* About 45–75 minutes.

### 0.2 Choose one region

Use the **same region** for the bucket and the EC2 instance. This guide uses **Asia Pacific
(Mumbai) — `ap-south-1`**. Using one region avoids cross-region latency and data-transfer cost.

### 0.3 Protect yourself from surprise bills

1. In the AWS console, open **Billing → Budgets → Create budget**.
2. Choose **Zero-spend budget** (or a small monthly amount such as US$5).
3. Add your email and enable alerts at 50%, 80% and 100%.
4. Enable **Billing → Cost Explorer** if you want daily visibility.

### 0.4 Free-tier caveat

AWS free-tier rules change and depend on account age and instance type. Do not assume this
deployment is free. The resources here are small, but an EC2 instance and a public IPv4 address
can incur charges. Delete everything with `scripts/cleanup_aws.sh` after your viva.

---

## 1. Create the private S3 bucket

### 1.1 Console steps

1. Sign in and set the region selector to **Asia Pacific (Mumbai) ap-south-1**.
2. Open **S3 → Create bucket**.
3. **Bucket name:** something globally unique, lowercase, e.g.
   `aeropix-images-2026-<your-roll-number>`.
4. **AWS Region:** `ap-south-1`.
5. **Object Ownership:** *ACLs disabled (recommended)* — bucket owner enforced.
6. **Block Public Access:** leave **Block all public access** checked. All four boxes must be
   checked.
7. **Bucket Versioning:** **Enable** (recommended; helps recover deleted objects).
8. **Default encryption:** **Server-side encryption with Amazon S3 managed keys (SSE-S3)**.
9. Leave **Static website hosting** disabled. Do not add a bucket policy.
10. Click **Create bucket**.

### 1.2 Verify the bucket

Open the bucket and check:

| Setting | Required value |
|---|---|
| Block public access | All four settings **On** |
| Default encryption | **SSE-S3 (AES256)** |
| Static website hosting | **Disabled** |
| Object Ownership | **Bucket owner enforced** |
| Bucket policy | **None** (or a policy that grants nothing public) |
| ACLs | Disabled |

**Capture screenshot #1:** bucket **Permissions** tab showing Block Public Access (all four On).
**Capture screenshot #2:** bucket **Properties** tab showing default encryption AES256.

### 1.3 Optional: expire verification objects

`scripts/check_s3.py` writes a tiny object under `_aeropix_checks/` and deletes it. If a run is
interrupted, add a lifecycle rule:

**Management → Lifecycle rules → Create rule** → prefix `_aeropix_checks/` → expire current
versions after **1 day**.

### 1.4 Why no CORS configuration?

The browser loads presigned URLs with a normal `<img>` request. Image tags do not require CORS
unless JavaScript reads the pixels. AEROPIX does not read S3 pixels with JavaScript, so no CORS
rule is needed. If you later add canvas editing, configure CORS for your exact domain only.

---

## 2. Create the IAM role (least privilege)

The EC2 instance must not contain access keys. It assumes a role and receives temporary
credentials from the instance metadata service.

### 2.1 Option A — AWS CLI (exact names used by the scripts)

From `infrastructure/iam/`:

```bash
# 1. Replace the bucket placeholder in the policy
#    (edit the file in any text editor)
#    REPLACE-WITH-YOUR-BUCKET -> your real bucket name

# 2. Create the role with the EC2 trust policy
aws iam create-role \
  --role-name AEROPIX-EC2-S3-Role \
  --assume-role-policy-document file://ec2-trust-policy.json

# 3. Attach the inline least-privilege policy
aws iam put-role-policy \
  --role-name AEROPIX-EC2-S3-Role \
  --policy-name AEROPIX-S3-Least-Privilege \
  --policy-document file://aeropix-s3-policy.json

# 4. Create the instance profile and add the role
aws iam create-instance-profile \
  --instance-profile-name AEROPIX-EC2-Instance-Profile

aws iam add-role-to-instance-profile \
  --instance-profile-name AEROPIX-EC2-Instance-Profile \
  --role-name AEROPIX-EC2-S3-Role
```

### 2.2 Option B — Console

1. Open **IAM → Policies → Create policy → JSON**.
2. Paste the contents of `infrastructure/iam/aeropix-s3-policy.json` after replacing
   `REPLACE-WITH-YOUR-BUCKET` with your bucket name.
3. Name it `AEROPIX-S3-Least-Privilege` and create it.
4. Open **IAM → Roles → Create role**.
5. Trusted entity: **AWS service** → **EC2**.
6. Attach the policy you just created.
7. Name the role `AEROPIX-EC2-S3-Role` and create it.

> When a role is created for EC2 in the console, AWS also creates an instance profile with the
> **same name as the role** (`AEROPIX-EC2-S3-Role`). If you use the console path, remember this
> name for cleanup:
> `INSTANCE_PROFILE_NAME=AEROPIX-EC2-S3-Role bash scripts/cleanup_aws.sh --execute`.
> Option A creates the profile name used by the default cleanup command.

### 2.3 Verify the policy

The role should allow exactly:

```text
s3:ListBucket          on arn:aws:s3:::YOUR-BUCKET
s3:GetBucketLocation   on arn:aws:s3:::YOUR-BUCKET
s3:GetObject           on arn:aws:s3:::YOUR-BUCKET/*
s3:PutObject           on arn:aws:s3:::YOUR-BUCKET/*
s3:DeleteObject        on arn:aws:s3:::YOUR-BUCKET/*
```

It should **not** contain `s3:*`, `iam:*`, `ec2:*`, `kms:*`, or access to other buckets.

**Capture screenshot #3:** the role's policy summary showing these permissions.

---

## 3. Launch the EC2 instance

### 3.1 Launch

1. Open **EC2 → Instances → Launch instances**.
2. **Name:** `aeropix-server`.
3. **AMI:** Ubuntu Server **24.04 LTS (HVM), SSD Volume Type**, 64-bit x86.
4. **Instance type:** `t3.small` (2 vCPU, 2 GB). `t3.micro`/free-tier types can work but may be
   tight while installing packages. Choose what your account allows.
5. **Key pair:** create a new key pair, download the `.pem` file and keep it safe. You cannot
   download it again.
6. **Network settings → Edit:**
   * VPC: default.
   * Auto-assign public IP: **Enable**.
   * Security group: create `aeropix-sg` with:
     * SSH (22) — source **My IP** only.
     * HTTP (80) — source **Anywhere (0.0.0.0/0)**.
     * HTTPS (443) — source **Anywhere (0.0.0.0/0)**.
     * Do **not** open port 8000.
7. **Configure storage:** 20 GiB, **gp3**.
8. **Advanced details → IAM instance profile:** select `AEROPIX-EC2-Instance-Profile`
   (or `AEROPIX-EC2-S3-Role` if you used the console path).
9. Launch the instance.

### 3.2 Allocate an Elastic IP

A public IPv4 address changes if you stop/start an instance without an Elastic IP. DNS needs a
stable address.

1. **EC2 → Elastic IPs → Allocate Elastic IP address → Allocate**.
2. Select the new address → **Actions → Associate** → choose your instance.
3. Note the Elastic IP.

> Elastic IPs can incur a small charge when not attached. Release it during cleanup.

### 3.3 Connect

On Windows PowerShell or Linux/macOS:

```bash
chmod 400 aeropix-key.pem          # Linux/macOS; Windows: use icacls as described by AWS
ssh -i aeropix-key.pem ubuntu@YOUR_ELASTIC_IP
```

If SSH times out, confirm the security group allows port 22 from your current public IP.

### 3.4 Confirm the instance role works

On the instance, with **no** `AWS_ACCESS_KEY_ID` exported:

```bash
curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/
# Expected: AEROPIX-EC2-S3-Role

sudo apt-get update -qq
sudo apt-get install -y awscli
aws sts get-caller-identity
# Expected: an assumed-role ARN, not your personal IAM user
```

If the metadata call returns 404, the instance profile is not attached. Stop the instance,
attach the profile (**Actions → Security → Modify IAM role**), and start it again.

**Capture screenshot #4:** EC2 instance **Security** tab showing the IAM role.

---

## 4. Put the application on the instance

### 4.1 Get the code onto the server

Option A — clone from Git (if your repository is reachable):

```bash
sudo apt-get install -y git
git clone https://github.com/YOUR-USERNAME/aeropix.git ~/aeropix
cd ~/aeropix
```

For a private repository, use a GitHub deploy key or a personal access token; never paste an AWS
key.

Option B — copy from your computer:

```bash
# On your computer, from the project root:
scp -i aeropix-key.pem -r backend frontend infrastructure scripts docs \
  ubuntu@YOUR_ELASTIC_IP:~/aeropix/
```

### 4.2 Build the frontend

The deployment script expects `frontend/dist/index.html`.

**Recommended — build on your computer** (faster, keeps Node off the server):

```bash
cd frontend
npm ci
npm run build
```

Then copy the build into the repository on the instance:

```bash
scp -i aeropix-key.pem -r frontend/dist ubuntu@YOUR_ELASTIC_IP:~/aeropix/frontend/
```

**Alternative — build on the instance:**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
cd ~/aeropix/frontend
npm ci
npm run build
```

### 4.3 Create the production environment file

You can let `deploy_ec2.sh` create it, or create it now:

```bash
sudo mkdir -p /opt/aeropix
sudo nano /opt/aeropix/.env
```

```dotenv
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=PASTE_A_RANDOM_SECRET_HERE
LOG_LEVEL=INFO

DATABASE_URL=sqlite:////opt/aeropix/backend/data/aeropix.db

STORAGE_BACKEND=s3
AWS_REGION=ap-south-1
AWS_BUCKET_NAME=your-private-bucket
S3_PRESIGN_EXPIRE_SECONDS=900
S3_USE_SSE=true

MAX_UPLOAD_MB=15
STORAGE_QUOTA_MB=5120
ALLOWED_HOSTS=*
ALLOWED_ORIGINS=

FRONTEND_DIST=/opt/aeropix/frontend/dist
SEED_DEMO_DATA=true
```

Generate the secret with:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Do **not** add `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` on EC2. The instance profile
supplies credentials.

### 4.4 Deploy

```bash
cd ~/aeropix
sudo bash scripts/deploy_ec2.sh --domain gallery.example.com --seed --verify-s3
```

Omit `--domain` if DNS is not ready yet. `--seed` uploads eight small demo images to S3 (a few
MB). `--verify-s3` runs the bucket checks immediately.

What the script does:

* installs Python, Nginx, rsync and curl;
* creates the `aeropix` system user;
* copies the backend and `frontend/dist` to `/opt/aeropix`;
* creates a virtual environment and installs dependencies;
* installs and starts the systemd service and Nginx site;
* waits for `/api/health` to return healthy.

It does not create AWS resources, DNS records or TLS certificates.

---

## 5. DNS and HTTPS

### 5.1 Point a domain at the Elastic IP

In your DNS provider (Route 53, Cloudflare, Namecheap, etc.) create an **A record**:

```text
gallery.example.com  →  YOUR_ELASTIC_IP
```

Wait for propagation (`nslookup gallery.example.com`). This can take minutes to a few hours.

### 5.2 Obtain a certificate

On the instance:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d gallery.example.com
```

Choose **redirect HTTP to HTTPS** when prompted. Certbot edits the Nginx site and installs a
renewal timer. Test renewal:

```bash
sudo certbot renew --dry-run
```

### 5.3 Update CORS/hosts if needed

With a single origin (Nginx serves both the SPA and `/api`), CORS is not required. If you serve
the frontend from a different origin, add it to `ALLOWED_ORIGINS` in `/opt/aeropix/.env` and
restart:

```bash
sudo systemctl restart aeropix
```

Restrict `ALLOWED_HOSTS` to your domain once DNS is stable:

```dotenv
ALLOWED_HOSTS=gallery.example.com,www.gallery.example.com
```

**Capture screenshot #5:** browser padlock / certificate details for your domain.

---

## 6. Verify the deployment

### 6.1 From the instance

```bash
curl -s http://127.0.0.1:8000/api/health
sudo systemctl status aeropix --no-pager
sudo nginx -t
```

### 6.2 From your computer

```bash
bash scripts/verify_deployment.sh https://gallery.example.com

DEMO_EMAIL=demo@aeropix.app DEMO_PASSWORD='AeropixDemo123!' \
  bash scripts/verify_deployment.sh https://gallery.example.com
```

Expected highlights:

* `/api/health` → `"status": "ok"`, `"storage_backend": "s3"`
* `/api/images` without a token → **401**
* demo login succeeds
* `/api/storage/status` → `"backend": "s3"`, `"bucket": "your-bucket"`
* a signed image URL loads, and the same URL without its signature returns **403**

### 6.3 Verify S3 directly

On the instance:

```bash
set -a; source /opt/aeropix/.env; set +a
/opt/aeropix/.venv/bin/python ~/aeropix/scripts/check_s3.py
```

Expected: bucket reachable, Block Public Access complete, encryption enabled, upload/download/
presign/delete succeed, unsigned GET rejected with 403.

> The instance role deliberately lacks permission to read bucket *configuration*. The script
> reports those checks as **WARN** when run on EC2. Run it locally with an admin/read-only IAM
> user if you want the configuration checks to PASS as well.

**Capture screenshot #6:** terminal output of `check_s3.py`.
**Capture screenshot #7:** `verify_deployment.sh` output.

---

## 7. Screenshots to capture for the report

These must be genuine. Do not use mockups or edited images.

| # | Screenshot | Where |
|---|---|---|
| 1 | Block Public Access, all four On | S3 bucket → Permissions |
| 2 | Default encryption AES256 | S3 bucket → Properties |
| 3 | IAM role with five S3 actions | IAM → Roles → AEROPIX-EC2-S3-Role |
| 4 | EC2 running + IAM role attached | EC2 → Instances → Security |
| 5 | HTTPS padlock / certificate | Browser address bar |
| 6 | `check_s3.py` output | SSH terminal |
| 7 | `verify_deployment.sh` output | Local terminal |
| 8 | Deployed dashboard with URL visible | Browser |
| 9 | S3 bucket Objects tab with `users/…` keys | S3 console |
| 10 | Billing/cost explorer for the demo period | AWS Billing |

Update [screenshot-checklist.md](screenshot-checklist.md) as you capture them.

---

## 8. Cost awareness

Illustrative only — **check the current AWS pricing page for your region**. Prices and free-tier
rules change.

| Resource | Typical demo cost (1 day) |
|---|---|
| `t3.small` on-demand | roughly US$0.50/day (about US$15/month if left running) |
| 20 GB gp3 EBS | a few cents per day |
| Elastic IP (attached) | often free while attached; charged when idle |
| S3 Standard storage (a few MB) | effectively negligible |
| S3 requests | negligible at demo volume |
| Data transfer out | small for a demo; internet egress is billed after any free allowance |

**The biggest risk is leaving the instance running for weeks.** Stop or terminate it after the
demo. A stopped instance still incurs EBS storage charges; a terminated instance does not (its
volumes are deleted by default).

---

## 9. Teardown

When the viva is over:

```bash
# Dry run first:
BUCKET=your-bucket INSTANCE_ID=i-... SECURITY_GROUP_ID=sg-... \
  bash scripts/cleanup_aws.sh

# Then execute (two typed confirmations):
BUCKET=your-bucket INSTANCE_ID=i-... SECURITY_GROUP_ID=sg-... \
  EIP_ALLOCATION_ID=eipalloc-... \
  bash scripts/cleanup_aws.sh --execute
```

Then check the console for:

* EBS volumes and snapshots;
* Elastic IPs;
* CloudWatch log groups;
* Route 53 records (remove the A record or keep it if you will redeploy);
* Budgets/alarms (keep the budget, it is free).

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `502 Bad Gateway` | Gunicorn not running | `sudo systemctl status aeropix`; `sudo journalctl -u aeropix -n 80` |
| `403` on image URLs | URL expired or signature stripped | Refresh the gallery; confirm `S3_PRESIGN_EXPIRE_SECONDS` |
| `AccessDenied` on upload | Role missing `s3:PutObject` or wrong bucket ARN | Re-check the inline policy and bucket name |
| `NoCredentialsError` | Instance profile not attached | Attach it and restart the instance |
| Bucket not found | Wrong region or name | Confirm `AWS_REGION` and `AWS_BUCKET_NAME` |
| `SECRET_KEY must be...` | Production secret missing/default | Generate a 48-byte secret in `.env` |
| Nginx 404 on refresh | SPA fallback missing | Confirm the `location / { try_files ... }` block |
| Certbot fails | DNS not propagated or port 80 blocked | Check `nslookup`, security group, and Nginx |
| SQLite `database is locked` | Multiple writers | Keep one Gunicorn worker; use WAL |

Logs:

```bash
sudo journalctl -u aeropix -f
sudo tail -f /var/log/nginx/aeropix.error.log
```

---

## 11. Cleanup checklist

- [ ] EC2 instance terminated
- [ ] Elastic IP released
- [ ] Security group deleted
- [ ] IAM role, inline policy and instance profile deleted
- [ ] S3 bucket emptied and deleted
- [ ] EBS volumes/snapshots checked
- [ ] Route 53 record removed (if no longer needed)
- [ ] Billing dashboard checked the next day
- [ ] AWS screenshots saved before deletion

Never commit `.env`, `.pem` keys or AWS credentials to Git.
