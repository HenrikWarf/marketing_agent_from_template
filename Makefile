.PHONY: setup lint test playground clean

setup:
	uv venv
	. .venv/bin/activate && pip install .
	mkdir -p tests agents

lint:
	uv run ruff check .

test:
	uv run pytest

playground:
	uv run adk web agents/

clean:
	rm -rf .venv/ __pycache__/ .pytest_cache/ .ruff_cache/
