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


def _provider_lookup(runtime=None):
    providers = getattr(runtime, "providers", {}) or {}
    alias_map = {}
    if isinstance(providers, dict):
        provider_iter = providers.items()
    else:
        provider_iter = ((getattr(provider, "id", None), provider) for provider in providers)

    for key, provider in provider_iter:
        if provider is None:
            continue
        for alias in {
            str(key or "").lower(),
            str(provider.get("id", "") if isinstance(provider, dict) else getattr(provider, "id", "") or "").lower(),
            str(provider.get("providerType", "") if isinstance(provider, dict) else getattr(provider, "providerType", "") or "").lower(),
            str(provider.get("name", "") if isinstance(provider, dict) else getattr(provider, "name", "") or "").lower(),
        }:
            if alias:
                alias_map[alias] = provider
    return alias_map


def get_provider(name: str, runtime=None):
    provider = name.lower()
    provider_config = _provider_lookup(runtime).get(provider) if runtime else None
    if not provider_config and runtime and provider in {"nim", "nvidia-nim"}:
        provider_config = _provider_lookup(runtime).get("nvidia")
    api_key = provider_config.get("apiKey") if isinstance(provider_config, dict) else getattr(provider_config, "apiKey", None) if provider_config else None
    provider_base_url = provider_config.get("baseUrl") if isinstance(provider_config, dict) else getattr(provider_config, "baseUrl", None) if provider_config else None
    base_url = provider_base_url if provider_base_url else DEFAULT_BASE_URLS.get(provider)

    if provider in {"openai", "chatgpt"}:
        return OpenAICompatibleProvider(base_url, api_key, provider_name=provider)
    if provider in {"nvidia", "nim", "nvidia-nim"}:
        return OpenAICompatibleProvider(base_url, api_key, provider_name=provider)
    if provider == "openrouter":
        return OpenAICompatibleProvider(base_url, api_key, provider_name=provider)
    if provider == "ollama":
        return OpenAICompatibleProvider(base_url, api_key, provider_name=provider)
    if provider in {"lmstudio", "lm-studio"}:
        return OpenAICompatibleProvider(base_url, api_key, provider_name=provider)
    if provider == "gemini":
        return GeminiProvider(api_key)
    raise ValueError(f"Unknown provider: {name}")
