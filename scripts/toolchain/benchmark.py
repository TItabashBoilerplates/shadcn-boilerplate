"""Run reproducible toolchain comparisons inside devenv (macOS or Linux)."""

import argparse
import json
import platform
import re
import statistics
import subprocess
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CASES = {
    "frontend-quality-uncached": (
        "frontend",
        [
            "env",
            "TURBO_FORCE=true",
            "bash",
            "-ec",
            "bun run lint:ci && bun run format-check",
        ],
    ),
    "python-tests-serial": (
        "backend-py",
        ["uv", "run", "--all-packages", "pytest", "-n0"],
    ),
    "python-tests-2": ("backend-py", ["uv", "run", "--all-packages", "pytest", "-n2"]),
    "python-tests-4": ("backend-py", ["uv", "run", "--all-packages", "pytest", "-n4"]),
    "python-tests-auto": (
        "backend-py",
        ["uv", "run", "--all-packages", "pytest", "-n", "auto"],
    ),
    "frontend-lint": ("frontend", ["bun", "run", "lint:ci"]),
    "frontend-lint-uncached": (
        "frontend",
        ["env", "TURBO_FORCE=true", "bun", "run", "lint:ci"],
    ),
    "fsd": (
        ".",
        [
            "bash",
            "-ec",
            'for app in web mobile desktop; do (cd "frontend/apps/$app" && bun run lint:fsd); done',
        ],
    ),
    "typescript": ("frontend", ["bun", "run", "type-check", "--force"]),
    "python-types": ("backend-py", ["uv", "run", "--all-packages", "ty", "check"]),
    "frontend-tests": ("frontend", ["bun", "run", "test"]),
    "typescript-cold": (
        ".",
        ["node", "scripts/toolchain/typecheck-benchmark.mjs", "tsrs"],
    ),
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--runs", type=int, default=5)
    parser.add_argument("--case", choices=CASES, action="append")
    parser.add_argument(
        "--compiler", help="Compiler executable for the no-incremental comparison"
    )
    parser.add_argument("--fast", action="store_true")
    args = parser.parse_args()
    if args.runs < 1:
        parser.error("--runs must be positive")
    if args.compiler:
        CASES["typescript-cold"][1][-1] = args.compiler
    if args.fast:
        CASES["typescript-cold"][1].append("--fast")
    result = {
        "platform": platform.platform(),
        "machine": platform.machine(),
        "runs": args.runs,
        "cases": {},
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    failed = False
    for name in args.case or CASES:
        cwd, command = CASES[name]
        samples = []
        for index in range(args.runs + 1):
            with tempfile.NamedTemporaryFile() as metrics:
                flags = ["-l"] if platform.system() == "Darwin" else ["-v"]
                start = time.perf_counter()
                completed = subprocess.run(
                    ["/usr/bin/time", *flags, "-o", metrics.name, *command],
                    cwd=ROOT / cwd,
                    capture_output=True,
                    text=True,
                    check=False,
                )
                elapsed = time.perf_counter() - start
                failed = failed or completed.returncode != 0
                report = Path(metrics.name).read_text()
            match = (
                re.search(r"(\d+)\s+maximum resident set size", report)
                if platform.system() == "Darwin"
                else re.search(r"Maximum resident set size \(kbytes\):\s*(\d+)", report)
            )
            rss = (
                int(match[1]) * (1 if platform.system() == "Darwin" else 1024)
                if match
                else None
            )
            (args.output.parent / f"{args.output.stem}-{name}-{index}.log").write_text(
                completed.stdout + completed.stderr
            )
            if index:
                samples.append(
                    {
                        "seconds": elapsed,
                        "peak_rss_bytes": rss,
                        "exit_code": completed.returncode,
                    }
                )
            print(
                f"{name} {'warmup' if not index else index}: {elapsed:.3f}s exit={completed.returncode}",
                flush=True,
            )
        result["cases"][name] = {
            "command": command,
            "cwd": cwd,
            "samples": samples,
            "median_seconds": statistics.median(s["seconds"] for s in samples),
        }
        args.output.write_text(json.dumps(result, indent=2) + "\n")
    if failed:
        raise SystemExit(
            "A benchmark command failed; inspect the recorded exit codes and logs"
        )


if __name__ == "__main__":
    main()
