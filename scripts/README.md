# AEROPIX scripts

All scripts are safe by default: nothing here creates paid AWS resources.
The only destructive script (`cleanup_aws.sh`) is a dry run unless `--execute`
is passed, and then requires two typed confirmations.

| Script | Where it runs | Purpose |
|---|---|---|
| `setup_local.ps1` | Windows dev machine | Create `.venv`, install deps, write `.env`, seed demo data |
| `setup_local.sh` | Linux/macOS dev machine | Same as above for bash |
| `deploy_ec2.sh` | Ubuntu EC2 instance | Install Nginx + Gunicorn, copy build, configure systemd |
| `verify_deployment.sh` | Any machine | Read-only HTTP checks against a deployment |
| `check_s3.py` | Dev machine or EC2 | Verify bucket privacy, encryption and a real S3 round trip |
| `cleanup_aws.sh` | Any machine with AWS CLI | Remove EC2/IAM/S3 resources after the demo |

## Local setup

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup_local.ps1
```

```bash
./scripts/setup_local.sh
```

Both scripts refuse to overwrite an existing `.env` at the project root; delete
it first if you want a fresh secret. They never write AWS credentials.

## Deploy to EC2

On the instance, from the repository root:

```bash
sudo bash scripts/deploy_ec2.sh --domain gallery.example.com --seed --verify-s3
```

The bucket must already exist and the instance profile must already be attached.
`deploy_ec2.sh` does **not** create AWS resources, DNS records or TLS
certificates. See `docs/aws-setup.md` and `docs/deployment.md`.

## Verify a deployment

```bash
bash scripts/verify_deployment.sh https://gallery.example.com

DEMO_EMAIL=demo@aeropix.app DEMO_PASSWORD='AeropixDemo123!' \
  bash scripts/verify_deployment.sh https://gallery.example.com
```

The second form also checks login, storage status, a signed image URL and that
the same URL is rejected without its signature.

## Verify S3

```bash
# Local machine with AWS CLI credentials:
python scripts/check_s3.py

# On EC2, using the instance profile:
set -a; source /opt/aeropix/.env; set +a
/opt/aeropix/.venv/bin/python scripts/check_s3.py
```

The script uploads one small text object under `_aeropix_checks/`, reads it via
a presigned URL, confirms an unsigned request is rejected, then deletes it.

## Clean up AWS

```bash
# Dry run — prints the plan only:
BUCKET=my-aeropix-bucket INSTANCE_ID=i-... \
  bash scripts/cleanup_aws.sh

# Real deletion:
BUCKET=my-aeropix-bucket INSTANCE_ID=i-... SECURITY_GROUP_ID=sg-... \
  bash scripts/cleanup_aws.sh --execute
```

> **Warning:** `--execute` permanently deletes every object in the bucket and
> terminates the instance. EBS volumes, snapshots, Elastic IPs, CloudWatch log
> groups and Route 53 records are not all handled automatically — check the
> console afterwards.

## Notes on credentials

* No script contains an AWS access key.
* `.env` (project root) is git-ignored and excluded from the deployment rsync.
* On EC2, Boto3 uses the instance profile; there is no `~/.aws/credentials`.
* `check_s3.py` prints the caller ARN and account ID, never secret values.
