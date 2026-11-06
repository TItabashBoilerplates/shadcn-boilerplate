"""Verify production ty/Ruff checks reject representative typing mistakes."""

import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend-py"


class TypeCheckingContract(unittest.TestCase):
    def run_tool(self, arguments, source):
        with tempfile.TemporaryDirectory(prefix="nerite-ty-contract-") as folder:
            fixture = Path(folder) / "contract.py"
            fixture.write_text(source)
            return subprocess.run(
                ["uv", "run", "--all-packages", *arguments, str(fixture)],
                cwd=BACKEND,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )

    def test_rejects_type_errors(self):
        cases = {
            "assignment": (
                'value: int = "bad"\n',
                "invalid-assignment",
            ),
            "return": (
                'def value() -> int:\n    return "bad"\n',
                "invalid-return-type",
            ),
            "optional": (
                "def value(data: str | None) -> str:\n    return data.upper()\n",
                "unresolved-attribute",
            ),
            "generic": (
                'values: list[int] = ["bad"]\n',
                "invalid-assignment",
            ),
            "import": (
                "import nerite_missing_module\n",
                "import-not-found",
            ),
            "override": (
                (
                    "class Base:\n    def value(self) -> int: return 1\n"
                    'class Child(Base):\n    def value(self) -> str: return "bad"\n'
                ),
                "invalid-method-override",
            ),
            "pydantic": (
                (
                    "from pydantic import BaseModel\nclass Item(BaseModel):\n"
                    "    value: int\nitem = Item()\n"
                ),
                "missing-argument",
            ),
            "any-return": (
                (
                    "from typing import Any\ndef value(data: Any) -> int:\n"
                    "    return data\n"
                ),
                "unsound-return-statement",
            ),
        }
        for name, (source, diagnostic) in cases.items():
            with self.subTest(name=name):
                result = self.run_tool(
                    ["ty", "check", "--output-format", "concise"], source
                )
                output = result.stdout + result.stderr
                self.assertEqual(result.returncode, 1, output)
                self.assertIn(f"[{diagnostic}]", output)

    def test_accepts_workspace_imports_and_valid_pydantic(self):
        result = self.run_tool(
            ["ty", "check", "--output-format", "concise"],
            "from core.logging import get_logger\n"
            "from pydantic import BaseModel\n"
            "class Item(BaseModel):\n    value: int\n"
            "item = Item(value=1)\nlogger = get_logger(__name__)\n"
            'logger.info("valid", value=item.value)\n',
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_ruff_requires_parameter_and_return_annotations(self):
        result = self.run_tool(
            ["ruff", "check", "--config", str(BACKEND / "pyproject.toml")],
            "def value(data):\n    return data\n",
        )
        output = result.stdout + result.stderr
        self.assertEqual(result.returncode, 1, output)
        self.assertIn("ANN001", output)
        self.assertIn("ANN201", output)


if __name__ == "__main__":
    unittest.main()
