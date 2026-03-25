# ADK Development & Deployment Lifecycle

This guide walks you through the complete process of building, testing, and deploying agents using this template.

---

## Phase 1: Local Development & Verification
This phase is where you iterate on agent logic, prompts, and tools. **Goal: Ensure high behavioral quality before cloud deployment.**

### 1. Environment Setup
```bash
# Install dependencies and create venv
make setup

# Configure environment
cp .env.example .env
# Update .env with your GOOGLE_API_KEY (AI Studio) or GOOGLE_CLOUD_PROJECT (Vertex AI)

# Enable GCP APIs and authenticate (if using Vertex AI)
make gcp-setup
```

### 2. Rapid Iteration (The Playground)
Test all four agent architectures (`simple`, `subagents`, `sequential`, `loop`) in the official ADK interface.
```bash
make playground
```
*Use this to debug tool-calling logic and multi-turn conversations.*

### 3. Frontend Integration (Custom UI)
Test how the agent performs in a real-world chat interface using SSE streaming.
```bash
make ui
# Access at http://localhost:3000
```

### 4. Automated Quality Gate (Pre-Flight)
Before pushing any code, ensure all checks pass. These are the same checks run in CI.
```bash
make lint   # Code style (Ruff)
make test   # Structural integrity (Pytest)
make eval   # Behavioral quality & Grounding (ADK Evals)
```

---

## Phase 2: Remote Development (Dev Environment)
Once local tests pass, deploy to a cloud environment to test on managed infrastructure.

### 1. Manual Deployment
```bash
# Deploy the agents/agent.py entrypoint to Vertex AI Agent Engine
make deploy-dev
```

### 2. Remote Verification
Use the provided notebook to query your deployed engine via the Python SDK.
- **Path**: `notebooks/adk_app_testing.ipynb`

---

## Phase 3: CI/CD Pipeline (Staging & Prod)
Automated via **GitHub Actions**. This flow ensures that only verified code reaches production.

### 1. The `setup-cicd` Foundation (One-time Setup)
The link between GitHub and Google Cloud is established via:
- **Workload Identity Federation (WIF)**: Secure, keyless authentication between GitHub Actions and GCP.
- **Service Accounts**: 
    - `cicd_runner_sa`: Executes the pipeline and manages infrastructure.
    - `app_sa`: The identity used by the agent at runtime (scoped to each environment).
- **Terraform State**: Managed in a GCS bucket (`{cicd_project}-terraform-state`) to ensure consistent infra tracking.

### 2. Infrastructure as Code (Terraform)
Terraform files in `deployment/terraform/` manage the "shell" of your agent:
- **`service.tf`**: Manages the `google_vertex_ai_reasoning_engine` (Agent Engine) instance settings (scaling, limits).
- **`iam.tf`**: Defines least-privilege roles for the agent and runner.
- **`storage.tf`**: Provisions GCS buckets for agent artifacts and logs.

### 3. CI/CD Logic
- **Pull Request (CI)**:
    - **Trigger**: Push a branch and open a PR to `main`.
    - **Action**: Runs `make lint` and `make test`.
    - **Goal**: Prevent breaking the codebase.
- **Merge to Main (Staging CD)**:
    - **Trigger**: Merge PR into the `main` branch.
    - **Action**: 
        - **Auth**: Connects via WIF tokens.
        - **Infra**: Applies Terraform changes for Staging.
        - **Deploy**: Packages source code as a tarball and pushes to Agent Engine.
        - **Test**: Runs **Load Tests** (Locust) to verify performance.
- **Production Promotion (Prod CD)**:
    - **Trigger**: Successful Staging deployment.
    - **Action**: Pauses for **Manual Approval** in the GitHub Actions tab.
    - **Goal**: Final human sign-off before the agent is live.

---

## Phase 4: Connecting the UI to Remote
To use your custom Chat UI with a deployed agent:

1. **Endpoint Configuration**: Update the `baseUrl` in `frontend/static/index.html` to point to your Cloud Run or Agent Engine URL.
2. **Authentication**: If using Vertex AI or IAP, ensure the request includes the required `Authorization: Bearer` token.
3. **Deployment Mechanism**: Agent Engine uses **source-based deployment** (no Docker). The `deploy.py` script exports requirements and bundles the `agents/` directory for the Vertex AI Reasoning Engine service.

---

## Summary Checklist
- [ ] **Local**: `make eval` score > 0.8.
- [ ] **Dev**: `make deploy-dev` successful.
- [ ] **CI**: GitHub PR checks are green.
- [ ] **Staging**: Merged to main, load tests passed.
- [ ] **Prod**: Manual approval clicked, agent live.
