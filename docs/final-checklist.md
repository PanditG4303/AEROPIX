# AEROPIX — Final Submission Checklist

Work through this list before printing the report or uploading the project. Tick each item
honestly.

---

## 1. Personal details and placeholders

- [ ] Replaced `[Student Full Name]` in the report, declaration and certificate.
- [ ] Replaced `[Roll Number]`.
- [ ] Replaced `[Programme]`, `[Department]`, `[College Name]`, `[University Name]`.
- [ ] Replaced `[Guide Name and Designation]`, `[HOD Name]`, `[Examiner Name]`.
- [ ] Replaced `[Academic Year]`, `[City]`, `[Date]`.
- [ ] Checked the college's exact report format (font, margins, certificate wording).
- [ ] Added the college logo if required (with permission).
- [ ] Removed this checklist and any internal notes from the printed report if required.

---

## 2. Code and repository

- [ ] `.env` is **not** committed and contains no real secrets in the submission copy.
- [ ] No `.pem`, `.ppk`, AWS access keys or `~/.aws/credentials` anywhere in the project.
- [ ] `backend/data/` (local uploads and SQLite) is excluded from the archive.
- [ ] `.venv/` and `node_modules/` are excluded from the archive.
- [ ] `frontend/dist/` is either built for the demo or excluded with build instructions.
- [ ] `backend/.env.example` documents every variable.
- [ ] `README.md` quick start works on a clean machine.
- [ ] `scripts/setup_local.ps1` / `.sh` do not overwrite an existing `.env`.
- [ ] No dead buttons, placeholder API calls or "coming soon" features.
- [ ] No unused demo routes or debug credentials beyond the documented demo account.

### Quick sanity check

```bash
cd backend
..\.venv\Scripts\python.exe -m pytest -q
# Expected: 34 passed

cd ../frontend
npm run build
# Expected: TypeScript clean, Vite build succeeds
```

- [ ] Backend tests: **34 passed**.
- [ ] Frontend build succeeds.
- [ ] App starts and login works.

---

## 3. Application verification

- [ ] Register a fresh account.
- [ ] Log out and log back in.
- [ ] Upload a JPG, a PNG and a WEBP.
- [ ] Try a `.txt` renamed to `.jpg` — rejected with a clear message.
- [ ] Try a file over 15 MB — rejected.
- [ ] Upload several files at once; progress and retry work.
- [ ] Search, filter by type, filter favourites, change sort.
- [ ] Masonry, grid and list views render without layout breaks.
- [ ] Lightbox opens; `←`/`→`/`Esc` work.
- [ ] Create an album, add images, remove one, rename it.
- [ ] Delete an album and confirm the images still exist.
- [ ] Favourite, rename, download and delete an image.
- [ ] Dashboard totals update after uploads/deletes.
- [ ] Switch light/dark/system; reload with no theme flash.
- [ ] Open at 390 px, 768 px and 1440 px widths.
- [ ] Visit an unknown URL — custom 404 appears.
- [ ] Enable OS reduced motion — animations stop.
- [ ] Check the browser console — no errors.

---

## 4. Screenshots

- [ ] 18 application screenshots exist in `docs/screenshots/`.
- [ ] They show the current build (no outdated layout).
- [ ] They are referenced with captions in the report.
- [ ] Local-mode screenshots are labelled as local, not AWS.
- [ ] If AWS was deployed: all 12 AWS screenshots in
      [screenshot-checklist.md](screenshot-checklist.md#3-aws-and-deployment-screenshots--required-from-the-student-)
      are captured and genuine.
- [ ] No AWS screenshot is invented, borrowed or edited.
- [ ] Personal/billing details are redacted.

---

## 5. Documentation

- [ ] `docs/project-report.md` exported to PDF with page numbers and a table of contents.
- [ ] Figures and tables are numbered and referenced in the text.
- [ ] `docs/architecture.md` diagrams open correctly.
- [ ] `docs/database-design.md` matches the actual models.
- [ ] `docs/aws-setup.md` instructions match the current console enough to follow.
- [ ] `docs/deployment.md` commands are correct for the target OS.
- [ ] `docs/testing-report.md` cites the real test output, not an invented one.
- [ ] `docs/user-manual.md` covers every screen.
- [ ] `docs/demo-script.md` rehearsed aloud at least once.
- [ ] References are in a consistent style required by the college.
- [ ] Spelling and grammar checked.

---

## 6. AWS deployment (only if you deployed)

- [ ] Bucket is private; Block Public Access shows 4/4 On.
- [ ] Default encryption is SSE-S3 (AES256).
- [ ] Versioning enabled (recommended).
- [ ] No public bucket policy, no public ACLs, no static website hosting.
- [ ] IAM role has only the five S3 actions on one bucket.
- [ ] EC2 instance uses the instance profile; no access keys in `.env`.
- [ ] Security group: 22 from your IP, 80/443 public, **8000 closed**.
- [ ] Elastic IP associated.
- [ ] HTTPS certificate valid; HTTP redirects to HTTPS.
- [ ] `scripts/verify_deployment.sh` passes authenticated checks.
- [ ] `scripts/check_s3.py` shows a successful round trip and a 403 for unsigned access.
- [ ] Demo password changed or demo data removed before public access.
- [ ] Billing alarm/budget configured.
- [ ] Resources stopped/terminated after the viva.
- [ ] Billing checked the next day.

If you did **not** deploy:

- [ ] The report clearly states that AWS deployment is pending.
- [ ] No "deployed" claim appears in the abstract, results or viva slides.
- [ ] The local-mode evidence is presented as local-mode evidence.

---

## 7. Security review

- [ ] `SECRET_KEY` is random and not the development default in any shared deployment.
- [ ] `.env` permissions are 600 on the server.
- [ ] Passwords are hashed (Argon2) — verified in the database or tests.
- [ ] JWT expiry is appropriate (7 days here).
- [ ] Cross-user image and album access returns 404 — tested.
- [ ] Signed media URLs expire and reject tampering — tested.
- [ ] Upload validation rejects wrong type, mismatch, corruption and oversize — tested.
- [ ] Security headers present (CSP, frame denial, nosniff, referrer policy).
- [ ] No secrets in logs, screenshots, Git history or the report.
- [ ] Dependencies installed from lockfiles; no unknown packages.

---

## 8. Packaging

- [ ] Project archive contains `backend/`, `frontend/src`, `frontend/public`,
      `frontend/package.json`, `frontend/package-lock.json`, `infrastructure/`, `scripts/`,
      `docs/`, `README.md`, `.gitignore`.
- [ ] Archive excludes `.venv`, `node_modules`, `backend/data`, `.env`, `*.pem`, caches.
- [ ] If the evaluator must run it offline, include `frontend/dist` and note that in the README.
- [ ] Report PDF is named clearly, e.g. `AEROPIX_Project_Report_[RollNumber].pdf`.
- [ ] A backup copy exists on cloud storage or a pen drive.

---

## 9. Viva preparation

- [ ] Can explain the request flow from browser to S3 in under 60 seconds.
- [ ] Can explain why the bucket is private and how presigned URLs work.
- [ ] Can explain the IAM instance profile and why keys are absent.
- [ ] Can explain the four tables and the many-to-many album relationship.
- [ ] Can explain why deleting an album keeps images.
- [ ] Can explain SQLite's trade-offs and the PostgreSQL upgrade path.
- [ ] Can run the tests live and interpret the output.
- [ ] Can show one genuine signed URL and demonstrate the 403 after tampering.
- [ ] Have a fallback plan if the network, backend or projector fails (screenshots + local build).
- [ ] Know the honest limitations: no live AWS run (if applicable), no load testing, Chrome-only
      browser automation.

---

## 10. Academic integrity

- [ ] All code and prose are my own or properly attributed.
- [ ] Third-party libraries and fonts are credited.
- [ ] Demo artwork is original/procedural, not stock or AI-generated photography.
- [ ] Screenshots are genuine.
- [ ] No AWS console image was fabricated.
- [ ] Test results are copied from a real run.
- [ ] The report discloses what was and was not verified.

**Do not submit** if any AWS screenshot is fabricated or if the report claims a deployment that
did not happen. A smaller, honest submission is defensible; invented evidence is not.

---

## 11. Final commands

```bash
# Backend tests
cd backend
..\.venv\Scripts\python.exe -m pytest -q

# Production build
cd ../frontend
npm run build

# Local production preview
npm run preview

# Optional: real S3 verification
cd ..
python scripts/check_s3.py
```

Expected:

```text
34 passed
✓ built in ...
```

Good luck with the viva.
