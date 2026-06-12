from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_ENDPOINT: str
    API_KEY: str = ""
    DATABASE_URL: str = "sqlite:///./production.db"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
