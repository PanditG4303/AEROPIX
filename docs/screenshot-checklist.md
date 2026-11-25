# AEROPIX — Screenshot and Evidence Checklist

This file separates **evidence that exists** from **evidence the student must still capture**.
No AWS screenshot in this repository is fabricated.

---

## 1. Rules for acceptable evidence

1. Screenshots must be genuine captures of the running application or the real AWS console.
2. Do not crop out the browser address bar on deployment screenshots; the URL proves the
   environment.
3. Do not edit console values. If a setting is wrong, fix it and capture again.
4. Do not use AI-generated images as deployment evidence.
5. Include the date (system clock or console timestamp) where possible.
6. Blur or hide account IDs, email addresses and billing details if the report will be public.
7. Keep the original PNG files; do not recompress them repeatedly.

The 18 UI screenshots in this folder were captured automatically from the **local production
build** at `http://localhost:4173` on 25 November 2026. The log is
[`capture-report.json`](screenshots/capture-report.json). They are valid evidence of the
frontend, **not** of AWS.

---

## 2. Application screenshots — captured ✅

| # | File | Screen | What it demonstrates | Status |
|---|---|---|---|---|
| 01 | `01-landing.png` | Landing page | Original design, typography, illustration, product explanation | ✅ Captured |
| 02 | `02-login.png` | Login | Auth form, demo credentials, validation | ✅ Captured |
| 03 | `03-register.png` | Register | Account creation, password rules | ✅ Captured |
| 04 | `04-not-found.png` | 404 | Custom error page and routing | ✅ Captured |
| 05 | `05-dashboard.png` | Dashboard (light) | Stat cards, Recharts area + donut, recent uploads | ✅ Captured |
| 06 | `06-gallery-masonry.png` | Gallery — masonry | 8 demo images, responsive layout, DEMO labels | ✅ Captured |
| 07 | `07-gallery-lightbox.png` | Lightbox | Full-size preview, keyboard-accessible overlay | ✅ Captured |
| 08 | `08-gallery-grid.png` | Gallery — grid | Alternate view | ✅ Captured |
| 09 | `09-gallery-list.png` | Gallery — list | Metadata-dense view | ✅ Captured |
| 10 | `10-upload-empty.png` | Upload centre | Drop zone, limits, empty queue | ✅ Captured |
| 11 | `11-upload-success.png` | Upload success | A real file uploaded through the UI | ✅ Captured |
| 12 | `12-albums.png` | Albums | 3 albums with covers | ✅ Captured |
| 13 | `13-album-detail.png` | Album detail | Membership grid and actions | ✅ Captured |
| 14 | `14-image-detail.png` | Image detail | Preview, metadata, actions | ✅ Captured |
| 15 | `15-settings.png` | Settings | Profile, theme, password, storage panel | ✅ Captured |
| 16 | `16-mobile-dashboard.png` | Mobile dashboard | 390 px responsive layout | ✅ Captured |
| 17 | `17-dashboard-dark.png` | Dashboard (dark) | Dark theme, charts fully rendered | ✅ Captured |
| 18 | `18-gallery-dark.png` | Gallery (dark) | Dark theme gallery | ✅ Captured |

### Screenshot-to-report mapping

| Report figure | File |
|---|---|
| Figure 5.1 | `01-landing.png` |
| Figure 5.2 | `05-dashboard.png` |
| Figure 5.3 | `06-gallery-masonry.png` |
| Figure 5.4 | `11-upload-success.png` |
| Figure 5.5 | `12-albums.png` |
| Figure 5.6 | `14-image-detail.png` |
| Figure 5.7 | `15-settings.png` |
| Figure 5.8 | `17-dashboard-dark.png` |
| Figure 5.9 | `16-mobile-dashboard.png` |

---

## 3. AWS and deployment screenshots — required from the student ⏳

Capture these **after** following [aws-setup.md](aws-setup.md) and
[deployment.md](deployment.md). Suggested filenames are shown; place them in
`docs/screenshots/aws/`.

| # | Suggested file | What to capture | Where | Why it matters |
|---|---|---|---|---|
| A1 | `aws-01-s3-block-public.png` | Block Public Access, all four settings **On** | S3 → bucket → Permissions | Proves the bucket is private |
| A2 | `aws-02-s3-encryption.png` | Default encryption **SSE-S3 / AES256** | S3 → bucket → Properties | Proves encryption at rest |
| A3 | `aws-03-s3-objects.png` | Object list with `users/…/images/…` keys | S3 → bucket → Objects | Proves real uploads to S3 |
| A4 | `aws-04-iam-role.png` | Role trust + five S3 permissions | IAM → Roles → AEROPIX-EC2-S3-Role | Proves least privilege |
| A5 | `aws-05-ec2-instance.png` | Instance **Running**, type, IAM role | EC2 → Instances | Proves compute + instance profile |
| A6 | `aws-06-security-group.png` | Inbound 22/80/443, no 8000 | EC2 → Security groups | Proves network exposure is controlled |
| A7 | `aws-07-https.png` | Browser padlock + certificate for the domain | Browser | Proves TLS |
| A8 | `aws-08-deployed-dashboard.png` | Dashboard with the **https URL visible** | Browser | Proves the app runs on EC2 |
| A9 | `aws-09-verify-deployment.png` | `verify_deployment.sh` output | Terminal | Proves HTTP/auth/media checks |
| A10 | `aws-10-check-s3.png` | `check_s3.py` output | SSH terminal | Proves real S3 round trip/privacy |
| A11 | `aws-11-billing.png` | Cost Explorer for the demo period | AWS Billing | Proves cost awareness (redact card details) |
| A12 | `aws-12-systemd.png` | `systemctl status aeropix` active | SSH terminal | Proves service supervision |

Optional but useful:

* Nginx `nginx -t` output;
* Certbot renewal dry-run;
* CloudWatch metrics for the instance;
* a terminal showing `aws sts get-caller-identity` returning the assumed role.

---

## 4. Screenshot quality checklist

- [ ] Resolution at least 1280 px wide for desktop, 390 px for mobile.
- [ ] Browser zoom at 100%.
- [ ] No personal notifications, unrelated tabs or bookmarks visible.
- [ ] No secrets, access keys, full account IDs or card numbers visible.
- [ ] Address bar visible on deployment screenshots.
- [ ] Text is legible when printed (avoid tiny 4K full-screen captures scaled down).
- [ ] File names match the table above.
- [ ] Images inserted into the report at a readable size with captions.
- [ ] Local-mode screenshots are labelled "local storage mode" in the report.
- [ ] AWS screenshots are labelled with the region and date.

---

## 5. Evidence integrity statement

Add a short statement to the report:

> The application screenshots in Figures 5.1–5.9 were captured from the production frontend
> build running in local storage mode on 25 November 2026. The AWS console and deployment
> screenshots in Appendix D were captured by me on [date] in the [region] region after deploying
> the application to Amazon EC2 with Amazon S3 storage.

If you have not deployed to AWS, **do not add Appendix D and do not claim a deployment**. A
well-documented local project with honest limitations is stronger than fabricated cloud
evidence.
