#!/bin/bash
set -e

echo "--- RUNNING LINTING (RUFF) ---"
uv run ruff check .

echo "--- RUNNING TESTS (PYTEST) ---"
uv run pytest

echo "--- RUNNING BEHAVIORAL EVALS (ADK EVAL) ---"
make eval

echo "--- ALL CHECKS PASSED ---"
