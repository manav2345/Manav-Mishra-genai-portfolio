import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

key = os.getenv("NVIDIA_API_KEY")
print("key set:", bool(key), "| length:", len(key or ""), "| starts with:", repr((key or "")[:6]))

from langchain_openai import ChatOpenAI

try:
    response = ChatOpenAI(
        model="nvidia/nemotron-3-super-120b-a12b",
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=key,
        max_tokens=64,
        timeout=30,
    ).invoke("Reply with the word OK")
    print("chat OK:", repr(response.content))
except Exception as error:
    print("chat FAILED:", type(error).__name__, error)

from openai import OpenAI

try:
    client = OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=key)
    response = client.embeddings.create(
        model="nvidia/nv-embedqa-e5-v5",
        input=["test"],
        encoding_format="float",
        extra_body={"input_type": "query", "truncate": "END"},
    )
    print("embeddings OK, dims:", len(response.data[0].embedding))
except Exception as error:
    print("embeddings FAILED:", type(error).__name__, error)
