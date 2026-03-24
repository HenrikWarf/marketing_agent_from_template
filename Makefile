.PHONY: setup lint test playground clean

setup:
	uv venv
	. .venv/bin/activate && pip install .
	mkdir -p tests agents

lint:
	uv run ruff check .

test:
	uv run pytest

eval:
	uv run adk eval agents/simple_agent/ tests/eval/evalsets/simple_search.json --config_file_path=tests/eval/eval_config.json --print_detailed_results

playground:
	uv run adk web agents/

clean:
	rm -rf .venv/ __pycache__/ .pytest_cache/ .ruff_cache/
