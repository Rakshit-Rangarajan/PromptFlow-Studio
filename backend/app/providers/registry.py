from app.providers.gemini import GeminiProvider
from app.providers.openai_compatible import OpenAICompatibleProvider


DEFAULT_BASE_URLS = {
    "openai": "https://api.openai.com/v1",
    "chatgpt": "https://api.openai.com/v1",
    "nvidia": "https://integrate.api.nvidia.com/v1",
    "nim": "https://integrate.api.nvidia.com/v1",
    "nvidia-nim": "https://integrate.api.nvidia.com/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "ollama": "http://localhost:11434/v1",
    "lmstudio": "http://localhost:1234/v1",
    "lm-studio": "http://localhost:1234/v1",
}


def get_provider(name: str, runtime=None):
    provider = name.lower()
    provider_config = (runtime.providers.get(provider) if runtime else None) or (runtime.providers.get("nvidia") if runtime and provider in {"nim", "nvidia-nim"} else None)
    api_key = provider_config.apiKey if provider_config else None
    base_url = provider_config.baseUrl if provider_config and provider_config.baseUrl else DEFAULT_BASE_URLS.get(provider)

    if provider in {"openai", "chatgpt"}:
        return OpenAICompatibleProvider(base_url, api_key)
    if provider in {"nvidia", "nim", "nvidia-nim"}:
        return OpenAICompatibleProvider(base_url, api_key)
    if provider == "openrouter":
        return OpenAICompatibleProvider(base_url, api_key)
    if provider == "ollama":
        return OpenAICompatibleProvider(base_url, api_key)
    if provider in {"lmstudio", "lm-studio"}:
        return OpenAICompatibleProvider(base_url, api_key)
    if provider == "gemini":
        return GeminiProvider(api_key)
    raise ValueError(f"Unknown provider: {name}")
