#!/bin/bash
set -e

echo "--- RUNNING LINTING (RUFF) ---"
uv run ruff check .

echo "--- RUNNING TESTS (PYTEST) ---"
uv run pytest

echo "--- ALL CHECKS PASSED ---"
