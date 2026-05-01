"""
Test script: State Machine - Human-in-the-Loop Pipeline

Simulates a user submitting a prompt, receiving a 'waiting' status,
and then submitting a follow-up answer to verify state resume.

Usage:
    1. Ensure docker-compose is running: docker-compose up -d
    2. Ensure the Supabase migration has been applied
    3. Run: python tests/test_state_machine.py

Environment:
    Set TEST_EMAIL, TEST_PASSWORD, API_BASE_URL in env or use defaults.
"""
import os
import sys
import time
import httpx

# Configuration
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8001")
TEST_EMAIL = os.getenv("TEST_EMAIL", "testuser_statemachine@forge.dev")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "TestPass123!")

# Polling config
POLL_INTERVAL = 5  # seconds between status checks
MAX_POLL_ATTEMPTS = 120  # max 10 minutes of polling


def log(msg: str):
    print(f"[TEST] {msg}")


def register_user(client: httpx.Client) -> bool:
    """Register a test user. Returns True if created or already exists."""
    resp = client.post(f"{API_BASE_URL}/auth/register", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if resp.status_code == 200:
        log(f"✅ Registered user: {TEST_EMAIL}")
        return True
    elif resp.status_code == 400 and "already" in resp.text.lower():
        log(f"ℹ️  User already exists: {TEST_EMAIL}")
        return True
    else:
        log(f"❌ Registration failed: {resp.status_code} — {resp.text}")
        return False


def login_user(client: httpx.Client) -> str:
    """Login and return the access token."""
    resp = client.post(f"{API_BASE_URL}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if resp.status_code != 200:
        log(f"❌ Login failed: {resp.status_code} — {resp.text}")
        sys.exit(1)
    
    token = resp.json()["access_token"]
    log(f"✅ Logged in. Token: {token[:20]}...")
    return token


def submit_pipeline(client: httpx.Client, token: str) -> str:
    """Submit a project idea and return the pipeline_id."""
    resp = client.post(
        f"{API_BASE_URL}/pipeline/submit",
        json={"project_idea": "Build a task management API with user authentication, project boards, and task assignments. Users should be able to create teams and assign roles."},
        headers={"Authorization": f"Bearer {token}"}
    )
    if resp.status_code != 200:
        log(f"❌ Submit failed: {resp.status_code} — {resp.text}")
        sys.exit(1)
    
    data = resp.json()
    pipeline_id = data["pipeline_id"]
    status = data["status"]
    log(f"✅ Pipeline submitted: {pipeline_id} (status: {status})")
    
    assert status == "queued", f"Expected 'queued', got '{status}'"
    return pipeline_id


def poll_status(client: httpx.Client, token: str, pipeline_id: str, wait_for: list) -> dict:
    """
    Poll pipeline status until it reaches one of the specified states.
    
    Args:
        wait_for: List of status values to stop polling at.
    
    Returns:
        The status response dict.
    """
    log(f"⏳ Polling for status in {wait_for}...")
    
    for attempt in range(MAX_POLL_ATTEMPTS):
        resp = client.get(
            f"{API_BASE_URL}/pipeline/status/{pipeline_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        if resp.status_code != 200:
            log(f"   Poll attempt {attempt + 1}: HTTP {resp.status_code}")
            time.sleep(POLL_INTERVAL)
            continue
        
        data = resp.json()
        current_status = data["status"]
        current_stage = data.get("current_stage", "?")
        
        if current_status in wait_for:
            log(f"✅ Reached status: {current_status} (stage: {current_stage})")
            return data
        
        if current_status == "failed":
            log(f"❌ Pipeline failed: {data.get('error_message')}")
            return data
        
        if attempt % 6 == 0:  # Log every 30 seconds
            log(f"   Status: {current_status} (stage: {current_stage})")
        
        time.sleep(POLL_INTERVAL)
    
    log(f"❌ Polling timed out after {MAX_POLL_ATTEMPTS * POLL_INTERVAL}s")
    sys.exit(1)


def resume_pipeline(client: httpx.Client, token: str, pipeline_id: str, answers: list) -> dict:
    """Resume a pipeline with user answers."""
    resp = client.post(
        f"{API_BASE_URL}/pipeline/resume",
        json={"pipeline_id": pipeline_id, "answers": answers},
        headers={"Authorization": f"Bearer {token}"}
    )
    if resp.status_code != 200:
        log(f"❌ Resume failed: {resp.status_code} — {resp.text}")
        sys.exit(1)
    
    data = resp.json()
    log(f"✅ Pipeline resumed: {data['pipeline_id']} (status: {data['status']})")
    return data


def main():
    log("=" * 60)
    log("State Machine Integration Test")
    log("=" * 60)
    log(f"API: {API_BASE_URL}")
    log("")
    
    client = httpx.Client(timeout=30.0)
    
    # Step 1: Register & Login
    log("--- Step 1: Authentication ---")
    register_user(client)
    token = login_user(client)
    
    # Step 2: Submit pipeline
    log("")
    log("--- Step 2: Submit Pipeline ---")
    pipeline_id = submit_pipeline(client, token)
    
    # Step 3: Poll for either awaiting_user_input or a running stage
    log("")
    log("--- Step 3: Wait for Explorer Agent ---")
    status_data = poll_status(client, token, pipeline_id, [
        "awaiting_user_input",
        "stage_2_running",
        "stage_3_running",
        "stage_4_running",
        "completed",
        "failed"
    ])
    
    current_status = status_data["status"]
    
    if current_status == "awaiting_user_input":
        # Step 4: The Explorer asked questions — resume with answers
        log("")
        log("--- Step 4: Resume with User Answers ---")
        questions = status_data.get("questions", [])
        log(f"   Explorer questions: {questions}")
        
        # Provide mock answers
        mock_answers = [
            "Use PostgreSQL for the database",
            "JWT authentication with role-based access",
            "Support up to 100 concurrent users"
        ]
        log(f"   Sending answers: {mock_answers}")
        
        resume_data = resume_pipeline(client, token, pipeline_id, mock_answers)
        assert resume_data["status"] == "stage_1_running", \
            f"Expected 'stage_1_running' after resume, got '{resume_data['status']}'"
        
        # Step 5: Poll for completion after resume
        log("")
        log("--- Step 5: Wait for Pipeline Completion (post-resume) ---")
        final_data = poll_status(client, token, pipeline_id, [
            "completed", "failed", "awaiting_user_input"
        ])
        
        if final_data["status"] == "awaiting_user_input":
            log("ℹ️  Explorer asked questions again (expected at round 2).")
            log("   In production, the frontend would show these to the user.")
            log("   For testing, this confirms the state machine loop works.")
        
    elif current_status == "completed":
        log("ℹ️  Pipeline completed without needing user input (intent was clear).")
    
    elif current_status == "failed":
        log(f"❌ Pipeline failed: {status_data.get('error_message')}")
        sys.exit(1)
    
    else:
        log(f"ℹ️  Pipeline progressed past Explorer without halting: {current_status}")
        log("   Waiting for completion...")
        final_data = poll_status(client, token, pipeline_id, ["completed", "failed"])
    
    # Step 6: Verify project_idea persistence
    log("")
    log("--- Step 6: Verify Prompt Persistence ---")
    status_resp = client.get(
        f"{API_BASE_URL}/pipeline/status/{pipeline_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    if status_resp.status_code == 200:
        stored_idea = status_resp.json().get("project_idea")
        if stored_idea:
            log(f"✅ project_idea persisted: {stored_idea[:60]}...")
        else:
            log("⚠️  project_idea is null in response")
    
    log("")
    log("=" * 60)
    log("Test Complete")
    log("=" * 60)
    
    client.close()


if __name__ == "__main__":
    main()
