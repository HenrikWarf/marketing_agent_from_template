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

### 1. Pull Request (CI)
- **Trigger**: Push a branch and open a PR to `main`.
- **Action**: Runs `make lint` and `make test`.
- **Goal**: Prevent breaking the codebase.

### 2. Merge to Main (Staging CD)
- **Trigger**: Merge PR into the `main` branch.
- **Action**: 
    - Provisions/Updates infrastructure via **Terraform**.
    - Deploys to **Staging** Agent Engine.
    - Runs **Load Tests** (Locust) to verify performance.

### 3. Production Promotion (Prod CD)
- **Trigger**: Successful Staging deployment.
- **Action**: Pauses for **Manual Approval** in the GitHub Actions tab.
- **Goal**: Final human sign-off before the agent is live for users.

---

## Phase 4: Connecting the UI to Remote
To use your custom Chat UI with a deployed agent:

1. **Endpoint Configuration**: Update the `baseUrl` in `frontend/static/index.html` to point to your Cloud Run or Agent Engine URL.
2. **Authentication**: If using Vertex AI or IAP, ensure the request includes the required `Authorization: Bearer` token.

---

## Summary Checklist
- [ ] **Local**: `make eval` score > 0.8.
- [ ] **Dev**: `make deploy-dev` successful.
- [ ] **CI**: GitHub PR checks are green.
- [ ] **Staging**: Merged to main, load tests passed.
- [ ] **Prod**: Manual approval clicked, agent live.
