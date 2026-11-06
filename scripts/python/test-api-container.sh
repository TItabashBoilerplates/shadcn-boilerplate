#!/usr/bin/env bash
# Check the dependency-only layer and the actual Vercel runtime contract.
set -euo pipefail

root="${DEVENV_ROOT:?Run through devenv test-api-container}"
scratch="$(mktemp -d)"
image="nerite-api-check-$$"
container="${image}-runtime"
images=()
started=false
cleanup() {
  local status=$?
  if "$started"; then docker rm --force "$container" >/dev/null; fi
  if ((${#images[@]})); then docker image rm "${images[@]}" >/dev/null; fi
  rm -r "$scratch"
  return "$status"
}
trap cleanup EXIT

# Use the real Dockerfile through its dependency sync, without copying app sources.
python - "$root/backend-py/Dockerfile.vercel" "$scratch/deps.Dockerfile" <<'PY'
import sys
from pathlib import Path

source = Path(sys.argv[1]).read_text()
prefix, separator, _ = source.partition("COPY . /app")
if not separator:
    raise SystemExit("Dockerfile no longer has the expected source-copy boundary")
Path(sys.argv[2]).write_text(prefix)
PY
docker build --progress=plain -f "$scratch/deps.Dockerfile" -t "$image-deps" "$root/backend-py"
images+=("$image-deps")
docker run --rm "$image-deps" /app/.venv/bin/python -c '
import importlib.util
for name in ("fastapi", "supabase", "sqlmodel", "uvicorn"):
    assert importlib.util.find_spec(name), f"Dependency layer is missing {name}"
for name in ("api", "core", "mcp"):
    assert importlib.util.find_spec(name) is None, f"Dependency layer contains {name}"
print("Dependency layer contains API dependencies, without workspace packages or MCP")
'

docker build --progress=plain -f "$root/backend-py/Dockerfile.vercel" -t "$image" "$root/backend-py"
images+=("$image")
docker run --detach --name "$container" \
  --env PATH=/usr/local/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin \
  --sysctl net.ipv4.ip_unprivileged_port_start=1024 "$image" >/dev/null
started=true
docker exec "$container" /usr/local/bin/python -c '
import json
import os
import time
from urllib.error import URLError
from urllib.request import urlopen

assert os.getuid() != 0
assert os.environ["PORT"] == "8080"
for attempt in range(30):
    try:
        with urlopen("http://127.0.0.1:8080/healthcheck", timeout=1) as response:
            assert response.status == 200
            assert json.load(response) == {"message": "OK"}
        print("Non-root runtime responds on PORT=8080 with a system-only PATH")
        break
    except URLError:
        if attempt == 29:
            raise
        time.sleep(1)
'
