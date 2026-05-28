from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_uri: str | None = None
    mongodb_db: str = "promptflow_studio"
    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173"

    @property
    def origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
