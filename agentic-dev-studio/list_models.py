import requests
import os
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("GROQ_API_KEY")
r = requests.get(
    "https://api.groq.com/openai/v1/models",
    headers={"Authorization": f"Bearer {key}"}
)
for m in sorted(r.json()["data"], key=lambda x: x["id"]):
    print(m["id"])