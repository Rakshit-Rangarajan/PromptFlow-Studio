import httpx


async def embed_text(text: str, provider: str = "openai", model: str = "text-embedding-3-small", runtime=None) -> list[float]:
    provider_key = provider.lower()
    provider_config = runtime.providers.get(provider_key) if runtime else None
    if provider.lower() in {"nvidia", "nim", "nvidia-nim"}:
        base_url = (provider_config.baseUrl if provider_config and provider_config.baseUrl else "https://integrate.api.nvidia.com/v1").rstrip("/")
        api_key = provider_config.apiKey if provider_config else None
    else:
        base_url = (provider_config.baseUrl if provider_config and provider_config.baseUrl else "https://api.openai.com/v1").rstrip("/")
        api_key = provider_config.apiKey if provider_config else None

    if not api_key:
        # Deterministic local fallback keeps vector nodes testable without credentials.
        seed = sum(ord(char) for char in text) or 1
        return [((seed * (i + 17)) % 997) / 997 for i in range(1536)]

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{base_url}/embeddings",
            headers={"authorization": f"Bearer {api_key}", "content-type": "application/json"},
            json={"model": model, "input": text},
        )
        response.raise_for_status()
        return response.json()["data"][0]["embedding"]
