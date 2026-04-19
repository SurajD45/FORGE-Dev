import os
import time
from crewai import LLM


# Load all available API keys from environment
# Add GROQ_API_KEY_2, GROQ_API_KEY_3 to .env as needed
def _get_api_keys() -> list:
    keys = []
    for i in ["", "_2", "_3", "_4", "_5"]:
        key = os.getenv(f"GROQ_API_KEY{i}")
        if key:
            keys.append(key)
    return keys


def get_llm(model: str = "groq/llama-3.3-70b-versatile") -> LLM:
    """
    Returns an LLM instance using the first available API key.
    Rotates to the next key on rate limit errors.
    """
    keys = _get_api_keys()
    if not keys:
        raise ValueError("No GROQ_API_KEY found in environment.")
    return LLM(model=model, api_key=keys[0])


def call_with_key_rotation(model: str, description: str, expected: str) -> str:
    """
    Makes an LLM call with automatic key rotation on rate limit errors.
    Tries each available key before giving up.
    """
    from crewai import Agent, Task, Crew

    keys = _get_api_keys()
    if not keys:
        raise ValueError("No GROQ_API_KEY found in environment.")

    last_error = None

    for i, key in enumerate(keys):
        try:
            llm = LLM(model=model, api_key=key)
            agent = Agent(
                role="Senior Python Backend Developer",
                goal="Generate clean, production-quality FastAPI Python code.",
                backstory=(
                    "You are a senior Python developer specialising in FastAPI. "
                    "You write clean, minimal, production-quality code. "
                    "You output raw Python code only. "
                    "No markdown. No code fences. No explanation."
                ),
                llm=llm,
                verbose=False
            )
            task = Task(
                description=description,
                expected_output=expected,
                agent=agent
            )
            result = Crew(agents=[agent], tasks=[task], verbose=False).kickoff()
            return str(result).strip()

        except Exception as e:
            error_str = str(e)
            if "rate_limit_exceeded" in error_str or "RateLimitError" in error_str:
                print(f"    Key {i+1} rate limited. Trying next key...")
                last_error = e
                time.sleep(2)
                continue
            else:
                raise e

    raise last_error