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

client = OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=key)
try:
    ids = sorted(m.id for m in client.models.list().data if "embed" in m.id.lower())
    print("Embedding models on this key:", *ids, sep="\n  ")
except Exception as error:
    print("Embedding model listing FAILED:", type(error).__name__, error)


candidates = [
    "nvidia/llama-3.2-nv-embedqa-1b-v2",
    "nvidia/nemotron-3-embed-1b",
]
working_model = None
for model in candidates:
    try:
        response = client.embeddings.create(
            model=model,
            input=["test"],
            encoding_format="float",
            extra_body={"input_type": "query", "truncate": "END"},
        )
        print(f"{model} OK, dims: {len(response.data[0].embedding)}")
        working_model = working_model or model
    except Exception as error:
        message = str(error)
        if "input_type" not in message.lower() and "extra_body" not in message.lower():
            print(f"{model} FAILED: {type(error).__name__} {error}")
            continue
        try:
            response = client.embeddings.create(
                model=model,
                input=["test"],
                encoding_format="float",
            )
            print(f"{model} OK without input_type, dims: {len(response.data[0].embedding)}")
            working_model = working_model or model
        except Exception as retry_error:
            print(f"{model} FAILED without input_type: {type(retry_error).__name__} {retry_error}")

print("Recommended EMBED_MODEL:", working_model or "none")
