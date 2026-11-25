#!/usr/bin/env bash
# =============================================================================
# AEROPIX — remove the AWS resources used by the project.
#
# THIS IS DESTRUCTIVE. It can terminate an EC2 instance and permanently delete
# an S3 bucket including every object in it. It is a DRY RUN unless --execute
# is passed, and --execute still asks for two typed confirmations.
#
#   # 1. Inspect the plan (no changes):
#   BUCKET=my-aeropix-bucket INSTANCE_ID=i-0123456789abcdef0 \
#     bash scripts/cleanup_aws.sh
#
#   # 2. Actually delete:
#   BUCKET=my-aeropix-bucket INSTANCE_ID=i-0123456789abcdef0 \
#     SECURITY_GROUP_ID=sg-0123456789abcdef0 \
#     bash scripts/cleanup_aws.sh --execute
#
# Optional environment variables:
#   AWS_REGION              default: ap-south-1
#   BUCKET                  required
#   INSTANCE_ID             optional; skipped when empty
#   SECURITY_GROUP_ID       optional; skipped when empty
#   EIP_ALLOCATION_ID       optional; releases an Elastic IP
#   ROLE_NAME               default: AEROPIX-EC2-S3-Role
#   INSTANCE_PROFILE_NAME   default: AEROPIX-EC2-Instance-Profile
#   POLICY_NAME             default: AEROPIX-S3-Least-Privilege
#   EXPECTED_ACCOUNT        optional safety check against the caller account
# =============================================================================
set -euo pipefail

EXECUTE=0
for arg in "$@"; do
  case "$arg" in
    --execute) EXECUTE=1 ;;
    -h|--help) sed -n '2,28p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

REGION="${AWS_REGION:-ap-south-1}"
BUCKET="${BUCKET:-}"
INSTANCE_ID="${INSTANCE_ID:-}"
SECURITY_GROUP_ID="${SECURITY_GROUP_ID:-}"
EIP_ALLOCATION_ID="${EIP_ALLOCATION_ID:-}"
ROLE_NAME="${ROLE_NAME:-AEROPIX-EC2-S3-Role}"
INSTANCE_PROFILE_NAME="${INSTANCE_PROFILE_NAME:-AEROPIX-EC2-Instance-Profile}"
POLICY_NAME="${POLICY_NAME:-AEROPIX-S3-Least-Privilege}"

if ! command -v aws >/dev/null 2>&1; then
  echo "The AWS CLI is required: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html" >&2
  exit 1
fi

echo
echo "AEROPIX AWS cleanup"
echo "Region: $REGION"
echo

IDENTITY="$(aws sts get-caller-identity --output json)"
ACCOUNT="$(printf '%s' "$IDENTITY" | python3 -c 'import json,sys; print(json.load(sys.stdin)["Account"])')"
ARN="$(printf '%s' "$IDENTITY" | python3 -c 'import json,sys; print(json.load(sys.stdin)["Arn"])')"
echo "Authenticated as: $ARN"
echo "Account:          $ACCOUNT"

if [[ -n "${EXPECTED_ACCOUNT:-}" && "$ACCOUNT" != "$EXPECTED_ACCOUNT" ]]; then
  echo "Account mismatch: expected $EXPECTED_ACCOUNT, got $ACCOUNT. Aborting." >&2
  exit 1
fi

echo
echo "The following will be removed:"
[[ -n "$BUCKET" ]] && echo "  * S3 bucket (WITH ALL OBJECTS): s3://$BUCKET" || echo "  ! BUCKET is not set — S3 will be skipped"
[[ -n "$INSTANCE_ID" ]] && echo "  * EC2 instance (terminated): $INSTANCE_ID" || echo "  - EC2 instance: skipped"
[[ -n "$EIP_ALLOCATION_ID" ]] && echo "  * Elastic IP released: $EIP_ALLOCATION_ID" || echo "  - Elastic IP: skipped"
[[ -n "$SECURITY_GROUP_ID" ]] && echo "  * Security group: $SECURITY_GROUP_ID" || echo "  - Security group: skipped"
echo "  * IAM instance profile: $INSTANCE_PROFILE_NAME"
echo "  * IAM role + inline policy: $ROLE_NAME / $POLICY_NAME"
echo

if [[ -z "$BUCKET" && -z "$INSTANCE_ID" && -z "$SECURITY_GROUP_ID" ]]; then
  echo "Nothing to do: set BUCKET and/or INSTANCE_ID and/or SECURITY_GROUP_ID." >&2
  exit 1
fi

if [[ "$EXECUTE" != "1" ]]; then
  echo "DRY RUN — no changes were made."
  echo "Review the list above, then re-run with --execute to delete these resources."
  echo
  exit 0
fi

echo "This cannot be undone. Bucket objects will be permanently deleted."
read -r -p "Type DELETE to continue: " FIRST_CONFIRM
[[ "$FIRST_CONFIRM" == "DELETE" ]] || { echo "Aborted."; exit 1; }

if [[ -n "$BUCKET" ]]; then
  read -r -p "Re-type the bucket name to confirm its deletion ($BUCKET): " SECOND_CONFIRM
  [[ "$SECOND_CONFIRM" == "$BUCKET" ]] || { echo "Bucket name did not match. Aborted."; exit 1; }
fi

# --- EC2 ---------------------------------------------------------------------
if [[ -n "$INSTANCE_ID" ]]; then
  echo "Terminating EC2 instance $INSTANCE_ID ..."
  aws ec2 terminate-instances --region "$REGION" --instance-ids "$INSTANCE_ID" >/dev/null
  echo "Waiting for termination (this can take a minute) ..."
  aws ec2 wait instance-terminated --region "$REGION" --instance-ids "$INSTANCE_ID"
  echo "Instance terminated."
fi

if [[ -n "$EIP_ALLOCATION_ID" ]]; then
  echo "Releasing Elastic IP $EIP_ALLOCATION_ID ..."
  aws ec2 release-address --region "$REGION" --allocation-id "$EIP_ALLOCATION_ID"
fi

if [[ -n "$SECURITY_GROUP_ID" ]]; then
  echo "Deleting security group $SECURITY_GROUP_ID ..."
  aws ec2 delete-security-group --region "$REGION" --group-id "$SECURITY_GROUP_ID"
fi

# --- IAM ---------------------------------------------------------------------
if aws iam get-instance-profile --instance-profile-name "$INSTANCE_PROFILE_NAME" >/dev/null 2>&1; then
  echo "Removing role from instance profile ..."
  aws iam remove-role-from-instance-profile \
    --instance-profile-name "$INSTANCE_PROFILE_NAME" \
    --role-name "$ROLE_NAME" >/dev/null 2>&1 || true
  echo "Deleting instance profile ..."
  aws iam delete-instance-profile --instance-profile-name "$INSTANCE_PROFILE_NAME"
fi

if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  echo "Deleting inline policy and role ..."
  aws iam delete-role-policy --role-name "$ROLE_NAME" --policy-name "$POLICY_NAME" >/dev/null 2>&1 || true
  aws iam delete-role --role-name "$ROLE_NAME"
fi

# --- S3 ----------------------------------------------------------------------
if [[ -n "$BUCKET" ]]; then
  if aws s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1; then
    echo "Deleting s3://$BUCKET and every object inside it ..."
    aws s3 rb "s3://$BUCKET" --force
    echo "Bucket deleted."
  else
    echo "Bucket $BUCKET not found (already deleted?)."
  fi
fi

echo
echo "Cleanup finished."
echo "Check the AWS console for leftovers: EBS volumes, snapshots, Elastic IPs,"
echo "CloudWatch log groups and Route 53 records are NOT removed by this script."
echo
