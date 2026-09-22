"""Config loader — reads config/*.json once, exposes typed dicts."""

from __future__ import annotations

import json
from pathlib import Path

_CONFIG_DIR = Path(__file__).resolve().parent.parent / "config"


def _load(name: str) -> dict | list:
    with open(_CONFIG_DIR / name, encoding="utf-8") as f:
        return json.load(f)


# Loaded once at import time
FESTIVALS: list[dict] = _load("festivals.json")  # type: ignore[assignment]
CATEGORIES: dict[str, dict] = _load("categories.json")  # type: ignore[assignment]
ENGINE_PARAMS: dict = _load("engine_params.json")  # type: ignore[assignment]


def get_festival(festival_id: str) -> dict | None:
    for f in FESTIVALS:
        if f["id"] == festival_id:
            return f
    return None


def get_category(category_id: str) -> dict:
    return CATEGORIES.get(category_id, CATEGORIES["other"])


def p(key: str):
    """Shortcut to read an engine parameter."""
    return ENGINE_PARAMS[key]
