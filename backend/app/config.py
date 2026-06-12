from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_ENDPOINT: str = "http://89.252.189.91:8983/api/v1/submit"
    API_KEY: str = ""
    DATABASE_URL: str = "sqlite:///./production.db"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
