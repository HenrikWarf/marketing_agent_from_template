# ADK Development & Deployment Flow

This guide describes the enterprise-grade workflow for building, testing, and deploying AI agents using this template. The process is divided into a **Fast Inner Loop** (local), a **Cloud Sandbox** (dev), and a **Protected Pipeline** (CI/CD).

---

## 1. The Git Workflow (Feature Branching)

To maintain stability and ensure every change is verified, direct pushes to the `main` branch are **denied**. You must follow the Feature Branch workflow:

1.  **Sync**: Start by ensuring your local `main` is up to date.
    ```bash
    git checkout main && git pull origin main
    ```
2.  **Branch**: Create a descriptive feature branch for your task.
    ```bash
    git checkout -b feature/your-agent-task
    ```
3.  **Iterate**: Follow the "Local Inner Loop" below.
4.  **Push & PR**: Push your branch and open a Pull Request (PR) to `main` on GitHub.
    ```bash
    git push origin feature/your-agent-task
    ```
5.  **Merge**: Once CI checks pass and code is reviewed, merge the PR into `main` to trigger the deployment pipeline.

---

## 2. Phase 1: Local Inner Loop (VS Code)

This phase is where you iterate on agent logic, prompts, and tools. Goal: Ensure high behavioral quality before code ever touches the cloud.

### A. Setup
```bash
make setup        # Install dependencies
make gcp-setup   # Enable APIs and authenticate
```

### B. Parallel Iteration Tools
You should have multiple terminals open to test different aspects of the agent:
*   **Terminal 1 (Playground)**: Run `make playground` to use the official ADK web interface. Ideal for debugging tool-calling and conversation state.
*   **Terminal 2 (Chat UI)**: Run `make ui` to test the end-user experience. This validates **SSE (Server-Sent Events)** streaming and typing indicators at `http://localhost:3000`.
*   **Terminal 3 (Quality)**: Run `make lint` (Ruff) and `make test` (Pytest) frequently to ensure structural integrity.
*   **Terminal 4 (Scoring)**: Run `make eval` to execute automated behavioral scoring. This ensures your agent meets accuracy and grounding thresholds.

---

## 3. Phase 2: Remote Sandbox (Dev Environment)

Once your local tests pass, verify your changes on real cloud infrastructure before merging.

### A. Cloud Deployment
```bash
make deploy-dev
```
*Note: This deploys the current state of your local code to a dedicated **Dev Instance** of Vertex AI Agent Engine. It does not affect other users or the production pipeline.*

### B. Verification
Use the provided notebook to query your deployed engine via the Python SDK to ensure all cloud-only tools (like BigQuery or Search) are functioning correctly.
- **Path**: `notebooks/adk_app_testing.ipynb`

---

## 4. Phase 3: CI/CD Pipeline (Automated)

The pipeline is managed via **GitHub Actions** and **Terraform**, ensuring the environment is strictly controlled.

### Step 1: PR Checks (Continuous Integration)
*   **Trigger**: Pushing code to any branch or opening a PR.
*   **Action**: Automatically runs `make lint` and `make test`.
*   **Safety**: You cannot merge into `main` until these checks are **Green**.

### Step 2: Staging Deployment (Continuous Deployment)
*   **Trigger**: Merging code into the `main` branch.
*   **Action**: 
    1. **Terraform**: Synchronizes GCP infrastructure.
    2. **Deploy**: Deploys the agent to the **Staging** instance.
    3. **Load Test**: Runs a headless **Locust** load test to ensure the agent remains responsive under concurrent traffic. Results are saved to GCS.

### Step 3: Production Gate (Manual Approval)
*   **Trigger**: Success of the Staging step.
*   **Status**: The workflow **pauses**.
*   **Action**: A lead engineer reviews the Staging results and the Load Test metrics in GCS.
*   **Approval**: Clicking "Review and Approve" in the GitHub Actions tab promotes the code to the **Production** Agent Engine.

---

## Summary Checklist
- [ ] **Sync**: Branch created from latest `main`.
- [ ] **Local**: `make eval` score meets targets.
- [ ] **Sandbox**: `make deploy-dev` verified in cloud.
- [ ] **CI**: GitHub PR checks are green.
- [ ] **Staging**: Load tests passed and reviewed.
- [ ] **Prod**: Manual approval clicked, agent is live.
