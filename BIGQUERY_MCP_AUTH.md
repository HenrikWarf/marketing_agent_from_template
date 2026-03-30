# BigQuery MCP Authentication & Identity Guide

This document describes the current authentication setup for the BigQuery MCP (Model Context Protocol) integration and outlines how to transition to an end-user identity model (User Delegation).

## 1. Current Architecture: System Identity (Service Account)

The current implementation uses a **System Identity** model. The agent authenticates as its own service account to perform actions on behalf of any user interacting with the chat interface.

### How it Works
1.  **Identity Discovery**: The `agents/shared/tools.py` file uses `google.auth.default()` to find credentials.
    - **Locally**: Uses `gcloud auth application-default login`.
    - **On Google Cloud**: Uses the **Vertex AI / Cloud Run Service Account** (`{PROJECT_NUMBER}-compute@developer.gserviceaccount.com`).
2.  **Dynamic Token Refresh**: We use a `header_provider` within the `McpToolset`. This ensures that for **every new MCP session**, a fresh OAuth 2.0 access token is generated.
3.  **Direct HTTP Connection**: The agent connects directly to `https://bigquery.googleapis.com/mcp` using `StreamableHTTPConnectionParams`.
4.  **Permissions**: The service account requires the following roles on the target project (`marketing-agent-01-491314`):
    - `roles/bigquery.dataViewer`: To read the tables.
    - `roles/bigquery.jobUser`: To run queries.

### Advantages
- **Simplicity**: No complex OAuth flows for end-users.
- **Reliability**: Tokens are managed automatically by the environment.
- **Performance**: No overhead for user-level permission checks during the conversation.

---

## 2. Roadmap: End-User Identity (User Delegation)

In this model, the agent only sees data the *specific logged-in user* has permission to access. This is essential for multi-tenant environments or sensitive internal data.

### Step 1: Frontend Authentication
The Chat UI (`frontend/static/index.html`) must implement a Google Sign-In button (using Firebase Auth or the Google Identity Services library) to obtain an **Access Token** (not just an ID Token).

### Step 2: Passing the Token to the Backend
When the frontend sends a message to the FastAPI server (`frontend/app.py`), it must include the user's token in the request headers (e.g., `Authorization: Bearer <USER_TOKEN>`).

### Step 3: Injecting Token into Session State
The FastAPI backend must extract this token and pass it into the `engine.stream_chat` call. In ADK, we can store this in the `session_state`.

```python
# Conceptual change in frontend/app.py
response = engine.stream_chat(
    query=user_query,
    session_id=session_id,
    # Pass the user token into state so tools can access it
    state_delta={"user_oauth_token": user_access_token}
)
```

### Step 4: Updating the Header Provider
We update `agents/shared/tools.py` to prioritize the user token from the `ReadonlyContext`.

```python
# Conceptual change in agents/shared/tools.py
def get_auth_headers(ctx: ReadonlyContext) -> dict[str, str]:
    # 1. Attempt to use the User Identity from session state
    user_token = ctx.session_state.get("user_oauth_token")
    if user_token:
        return {
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json",
            "X-Goog-User-Project": PROJECT_ID
        }
    
    # 2. Fallback to System Identity if no user token is provided
    creds, _ = google.auth.default()
    # ... refresh and return system token ...
```

### Step 5: BigQuery Permissions
Every individual end-user must be granted **BigQuery Data Viewer** access to the datasets they need to query.

---

## Comparison Summary

| Feature | System Identity (Current) | End-User Identity (Proposed) |
| :--- | :--- | :--- |
| **Authentication** | Service Account | OAuth 2.0 User Token |
| **Permissions** | Managed at Project level | Managed at User level |
| **Privacy** | Agent can see "everything" | Agent can only see "user's data" |
| **Complexity** | Low | High (requires Frontend OAuth) |
| **Billing** | Charged to Service Account | Charged to User Project (if configured) |

## Security Considerations
- **SQL Injection**: Even with User Delegation, the `ReflectAndRetryToolPlugin` is critical to ensure the LLM doesn't generate malicious or inefficient SQL queries.
- **Token Leakage**: User tokens should **never** be logged or stored in persistent databases; they should only live in the ephemeral `session_state` during the active request.
