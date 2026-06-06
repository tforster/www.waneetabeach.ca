#!/usr/bin/env bash
# Create a user through the production API sign-up endpoint.
#
# Usage:
#   ./devops/create-new-user --name "Jane Doe" --email "jane@example.com" --password "super-secret"
#
# Optional:
#   API_BASE_URL=https://waneetabeach.ca ./devops/create-new-user --name ... --email ... --password ...

set -euo pipefail

api_base_url="${API_BASE_URL:-https://waneetabeach.ca}"
name=""
email=""
password=""

print_usage() {
  cat <<'EOF'
Usage:
  ./devops/create-new-user --name <name> --email <email> --password <password>

Required:
  --name        Full name of the user
  --email       Email address for login
  --password    Initial password

Optional:
  -h, --help    Show this help

Environment:
  API_BASE_URL  Override API base URL (default: https://waneetabeach.ca)
EOF
}

require_value() {
  local flag="$1"
  local value="${2-}"

  if [[ -z "$value" || "$value" == --* ]]; then
    echo "Error: $flag requires a value." >&2
    print_usage >&2
    exit 1
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
  --name)
    require_value "$1" "${2-}"
    name="$2"
    shift 2
    ;;
  --email)
    require_value "$1" "${2-}"
    email="$2"
    shift 2
    ;;
  --password)
    require_value "$1" "${2-}"
    password="$2"
    shift 2
    ;;
  -h | --help)
    print_usage
    exit 0
    ;;
  *)
    echo "Error: Unknown argument '$1'." >&2
    print_usage >&2
    exit 1
    ;;
  esac
done

if [[ -z "$name" || -z "$email" || -z "$password" ]]; then
  echo "Error: --name, --email, and --password are required." >&2
  print_usage >&2
  exit 1
fi

signup_url="${api_base_url%/}/api/auth/sign-up/email"

json_payload=$(printf '{"name":"%s","email":"%s","password":"%s"}' "$name" "$email" "$password")

echo "Creating user at: $signup_url"

curl -sS -X POST "$signup_url" \
  -H "Content-Type: application/json" \
  -d "$json_payload"

echo
