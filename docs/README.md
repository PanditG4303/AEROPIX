# AEROPIX documentation

Start here depending on what you need.

## For the student submitting the project

1. [Final checklist](final-checklist.md) — work through this before printing.
2. [Project report](project-report.md) — replace the bracketed placeholders, then export to PDF.
3. [Screenshot checklist](screenshot-checklist.md) — 18 screenshots are already captured;
   AWS console and live-deployment evidence must still be added by you.
4. [Demo script](demo-script.md) — rehearse the 8–10 minute viva.

## For understanding the system

| Document | Contents |
|---|---|
| [Architecture](architecture.md) | Component diagram, request lifecycle, storage abstraction, security model, Mermaid view |
| [Database design](database-design.md) | ER diagram, tables, constraints, indexes, deletion semantics, example queries |
| [Project report](project-report.md) | Problem statement, literature, design, implementation, testing, conclusion |
| [Testing report](testing-report.md) | Exact automated test results and honest limitations |

## For running and deploying

| Document | Contents |
|---|---|
| [User manual](user-manual.md) | Every page and workflow, including uploads, albums and settings |
| [AWS setup](aws-setup.md) | Create the bucket, IAM role, security group, EC2 instance, DNS and TLS |
| [Deployment](deployment.md) | Build, deploy, update, back up, monitor and troubleshoot |
| [scripts/README.md](../scripts/README.md) | Reference for every script |

## Evidence in this repository

| Evidence | Location |
|---|---|
| 18 genuine browser screenshots | [`screenshots/`](screenshots/) |
| Automated browser check log (17/17, 0 console errors) | [`screenshots/capture-report.json`](screenshots/capture-report.json) |
| Architecture diagram (SVG + PNG) | [`../infrastructure/architecture/`](../infrastructure/architecture/) |
| ER diagram (SVG + PNG) | [`../infrastructure/architecture/er-diagram.png`](../infrastructure/architecture/er-diagram.png) |
| Upload and presigned-delivery sequence diagrams (SVG + PNG) | [`upload-sequence.png`](../infrastructure/architecture/upload-sequence.png) · [`presigned-delivery.png`](../infrastructure/architecture/presigned-delivery.png) |
| 34 passing backend tests | [`../backend/tests/`](../backend/tests/) |

## Honesty statement

This repository does **not** contain screenshots of a live AWS account, because the project was
developed without AWS credentials. The S3 code path is covered by automated tests against
`moto` (an AWS mock) and the deployment scripts are complete, but they have not been executed
against real AWS. Any document that says "deployed" in the past tense refers to the **local
production build**, not to EC2 or S3. Do not submit invented AWS evidence.
