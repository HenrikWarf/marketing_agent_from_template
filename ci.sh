#!/bin/bash
set -e

echo "--- RUNNING DATA CONTRACT VALIDATION ---"
make validate-contract

echo "--- RUNNING LINTING (AGENT + APP) ---"
make lint

echo "--- RUNNING TESTS (AGENT + APP) ---"
make test

echo "--- ALL CHECKS PASSED ---"
