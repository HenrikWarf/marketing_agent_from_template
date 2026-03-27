# Force uv to use public PyPI and ignore corporate wrappers/configs
UV := UV_NO_CONFIG=1 UV_DEFAULT_INDEX=https://pypi.org/simple uv

.PHONY: setup gcp-setup lint test playground clean setup-hooks

setup-hooks:
	chmod +x .githooks/pre-merge-commit
	git config core.hooksPath .githooks

setup:
	$(UV) venv
	$(UV) pip install .
	mkdir -p tests agents

gcp-setup:
	chmod +x ./setup_gcp.sh
	./setup_gcp.sh

lint:
	$(UV) run ruff check .

test:
	$(UV) run pytest

AGENT ?= agents/marketing_agent/
EVALSET ?= tests/eval/evalsets/marketing_campaign.evalset.json

eval:
	$(UV) run adk eval $(AGENT) $(EVALSET) --config_file_path=tests/eval/eval_config.json --print_detailed_results

playground:
	$(UV) run adk web agents/

ui:
	@echo "Starting ADK API Server and Custom UI..."
	# Run api_server in the background so it's available for the UI
	$(UV) run adk api_server agents/ --auto_create_session & \
	.venv/bin/python frontend/app.py

deploy-dev:
	@echo "Deploying to DEV environment..."
	# Set environment variables for DEV
	$(MAKE) deploy ENV=dev

deploy-prod:
	@echo "Deploying to PROD environment..."
	# Set environment variables for PROD
	# Usually triggered via CI/CD, but can be done manually if approved
	$(MAKE) deploy ENV=prod

clean:
	rm -rf .venv/ __pycache__/ .pytest_cache/ .ruff_cache/

# --- Commands from Agent Starter Pack ---

backend: deploy

deploy:
	# Load GOOGLE_CLOUD_PROJECT from .env if not already set
	$(eval GOOGLE_CLOUD_PROJECT=$(shell grep GOOGLE_CLOUD_PROJECT .env | cut -d '=' -f2))
	# Load AGENT_DISPLAY_NAME from .env and append environment suffix if set
	$(eval BASE_NAME=$(shell grep AGENT_DISPLAY_NAME .env | cut -d '=' -f2))
	$(eval FINAL_NAME=$(if $(ENV),$(BASE_NAME)-$(ENV),$(BASE_NAME)))
	# Export dependencies to requirements file using uv export.
	($(UV) export --no-hashes --no-header --no-dev --no-emit-project --no-annotate > agents/app_utils/.requirements.txt 2>/dev/null || \
	$(UV) export --no-hashes --no-header --no-dev --no-emit-project > agents/app_utils/.requirements.txt) && \
	$(UV) run -m agents.app_utils.deploy \
		--project=$(GOOGLE_CLOUD_PROJECT) \
		--display-name="$(FINAL_NAME)" \
		--source-packages=./agents \
		--entrypoint-module=agents.agent_engine_app \
		--entrypoint-object=agent_engine \
		--requirements-file=agents/app_utils/.requirements.txt \
		$(if $(AGENT_IDENTITY),--agent-identity) \
		$(if $(filter command line,$(origin SECRETS)),--set-secrets="$(SECRETS)")

eval-all:
	@echo "==============================================================================="
	@echo "| Running All Evalsets                                                        |"
	@echo "==============================================================================="
	@for evalset in tests/eval/evalsets/*.evalset.json; do \
		echo ""; \
		echo "▶ Running: $$evalset"; \
		$(MAKE) eval EVALSET=$$evalset || exit 1; \
	done
	@echo ""
	@echo "✅ All evalsets completed"

install:
	@command -v uv >/dev/null 2>&1 || { echo "uv is not installed. Installing uv..."; curl -LsSf https://astral.sh/uv/0.8.13/install.sh | sh; source $HOME/.local/bin/env; }
	$(UV) sync

register-gemini-enterprise:
	@uvx agent-starter-pack@0.39.6 register-gemini-enterprise

setup-dev-env:
	PROJECT_ID=$$(gcloud config get-value project) && \
	(cd deployment/terraform/dev && terraform init && terraform apply --var-file vars/env.tfvars --var dev_project_id=$$PROJECT_ID --auto-approve)

setup-cicd-env:
	(cd deployment/terraform && terraform init && terraform apply --var-file vars/env.tfvars)

