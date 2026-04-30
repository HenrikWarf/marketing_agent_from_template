# Force uv to use public PyPI and ignore corporate wrappers/configs
UV_BIN := $(shell which uv 2>/dev/null || echo "/Users/henrikw/.local/bin/uv")
REAL_UV := /Users/henrikw/.local/bin/uv
UV := UV_NO_CONFIG=1 UV_DEFAULT_INDEX=https://pypi.org/simple $(REAL_UV)

.PHONY: setup gcp-setup lint test playground clean setup-hooks ui lint-agents lint-app test-agents test-app validate-contract

setup-hooks:
	chmod +x .githooks/pre-merge-commit
	git config core.hooksPath .githooks

setup:
	$(UV) venv
	$(UV) pip install .
	mkdir -p tests agents scripts
	cd campaign-flow && npm install

gcp-setup:
	chmod +x ./setup_gcp.sh
	./setup_gcp.sh

# --- Global Commands ---

lint: lint-agents lint-app
test: validate-contract test-agents test-app

# --- Agent Track ---

lint-agents:
	@echo "--- Linting Agents (Ruff) ---"
	$(UV) run ruff check agents/

test-agents:
	@echo "--- Testing Agents (Pytest) ---"
	$(UV) run pytest tests/unit tests/integration
	@echo "--- Running Behavioral Evals ---"
	$(MAKE) eval

# --- Application Track ---

lint-app:
	@echo "--- Linting Frontend (ESLint) ---"
	cd campaign-flow && npm run lint

test-app:
	@echo "--- Testing Frontend ---"
	cd campaign-flow && npm test

validate-contract:
	@echo "--- Validating Data Contract ---"
	$(UV) run python scripts/validate_contract.py

# --- Development Tools ---

AGENT ?= agents/marketing_agent/
EVALSET ?= tests/eval/evalsets/core_workflow.evalset.json

eval:
	$(UV) run adk eval $(AGENT) $(EVALSET) --config_file_path=tests/eval/eval_config.json --print_detailed_results

playground:
	PYTHONPATH=. $(UV) run adk web agents/

ui:
	@echo "Starting ADK API Server and Custom UI..."
	PYTHONPATH=. $(UV) run adk api_server agents/ --auto_create_session & \
	PYTHONPATH=. $(UV) run python frontend/app.py


deploy-dev:
	$(MAKE) deploy ENV=dev SA=marketing-agent-app-dev@$(shell grep GOOGLE_CLOUD_PROJECT .env | cut -d '=' -f2).iam.gserviceaccount.com

deploy-prod:
	$(MAKE) deploy ENV=prod SA=marketing-agent-app-prod@$(shell grep GOOGLE_CLOUD_PROJECT .env | cut -d '=' -f2).iam.gserviceaccount.com

clean:
	rm -rf .venv/ __pycache__/ .pytest_cache/ .ruff_cache/ campaign-flow/dist/

# --- Deployment ---

deploy:
	$(eval GOOGLE_CLOUD_PROJECT=$(shell grep GOOGLE_CLOUD_PROJECT .env | cut -d '=' -f2))
	$(eval BASE_NAME=$(shell grep AGENT_DISPLAY_NAME .env | cut -d '=' -f2))
	$(eval FINAL_NAME=$(if $(ENV),$(BASE_NAME)-$(ENV),$(BASE_NAME)))
	$(eval SERVICE_ACCOUNT=$(if $(SA),$(SA),$(shell grep APP_SERVICE_ACCOUNT .env | cut -d '=' -f2)))
	($(UV) export --no-hashes --no-header --no-dev --no-emit-project --no-annotate > agents/app_utils/.requirements.txt 2>/dev/null || \
	$(UV) export --no-hashes --no-header --no-dev --no-emit-project > agents/app_utils/.requirements.txt) && \
	$(UV) run -m agents.app_utils.deploy \
		--project=$(GOOGLE_CLOUD_PROJECT) \
		--display-name="$(FINAL_NAME)" \
		--source-packages=./agents \
		--entrypoint-module=agents.agent_engine_app \
		--entrypoint-object=agent_engine \
		--requirements-file=agents.app_utils.requirements.txt \
		--service-account=$(SERVICE_ACCOUNT) \
		$(if $(AGENT_IDENTITY),--agent-identity)
