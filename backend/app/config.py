"""Application configuration via environment variables.

All settings can be overridden through environment variables, making the
backend trivially deployable in different environments (local dev, Docker,
production). The defaults are tuned for a zero-config local run with SQLite.
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Core ---
    app_name: str = "LearnFlow"
    app_version: str = "1.0.0"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    # --- Database ---
    # SQLite by default for zero-config local runs; switch to postgresql://
    # for production (the ORM layer is database-agnostic).
    database_url: str = "sqlite:///./learnflow.db"

    # --- Security ---
    secret_key: str = "learnflow-dev-secret-change-in-production-please-32bytes"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    algorithm: str = "HS256"
    bcrypt_rounds: int = 12

    # --- AI Agent ---
    # When no LLM key is configured, the agent layer falls back to a
    # deterministic rule-based engine so the platform stays fully functional.
    llm_api_key: Optional[str] = None
    llm_base_url: Optional[str] = None
    llm_model: str = "gpt-4o-mini"
    agent_backend: str = "auto"  # auto | rule | llm | hermes | openclaw | hiclaw

    # --- Reward economy ---
    token_initial_balance: int = 100
    token_per_focus_minute: float = 2.0
    token_per_practice_correct: float = 5.0
    token_per_note: float = 3.0


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
