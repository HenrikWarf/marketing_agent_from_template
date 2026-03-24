.PHONY: setup lint test playground clean

setup:
	uv sync
	mkdir -p tests app

lint:
	uv run ruff check .

test:
	uv run pytest

playground:
	uv run adk web app/

clean:
	rm -rf .venv/ __pycache__/ .pytest_cache/ .ruff_cache/
