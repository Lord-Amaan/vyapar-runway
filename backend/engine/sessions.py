"""In-memory session store — §5 / §9 of the build spec."""

from __future__ import annotations

import hashlib
import time
import uuid
from datetime import date
from typing import Any

import numpy as np
import pandas as pd

from .config import p
from .schemas import ShopConfig, CashCount, ManualEvidence


class Session:
    """One user session — lives in memory, expires after TTL."""

    def __init__(self, session_id: str, language: str = "en"):
        self.session_id = session_id
        self.language = language
        self.created_at = time.time()
        self.last_active = time.time()

        # Seed from session_id (deterministic)
        h = hashlib.sha256(session_id.encode()).hexdigest()
        self.seed = int(h[:8], 16)

        # Data
        self.upi_daily: pd.DataFrame | None = None  # columns: ds, y
        self.upi_summary: dict | None = None
        self.bank_data: dict | None = None
        self.bank_summary: dict | None = None
        self.tagged_suppliers: list[str] = []
        self.manual: ManualEvidence | None = None
        self.shop: ShopConfig | None = None
        self.cash_counts: list[CashCount] = []
        self.is_sample: bool = False
        self.sample_name: str | None = None
        self.truth: dict | None = None  # Only for samples

    def touch(self):
        self.last_active = time.time()

    def is_expired(self) -> bool:
        return (time.time() - self.last_active) > p("session_ttl_seconds")

    def rng(self) -> np.random.Generator:
        """Get a fresh RNG with the session seed (common random numbers)."""
        return np.random.default_rng(self.seed)


class SessionStore:
    """Thread-safe-ish in-memory session store."""

    def __init__(self):
        self._sessions: dict[str, Session] = {}

    def create(self, language: str = "en") -> Session:
        sid = str(uuid.uuid4())
        s = Session(sid, language)
        self._sessions[sid] = s
        self._cleanup()
        return s

    def get(self, session_id: str) -> Session | None:
        s = self._sessions.get(session_id)
        if s is None:
            return None
        if s.is_expired():
            del self._sessions[session_id]
            return None
        s.touch()
        return s

    def _cleanup(self):
        """Remove expired sessions (lazy, on create)."""
        expired = [k for k, v in self._sessions.items() if v.is_expired()]
        for k in expired:
            del self._sessions[k]


# Global singleton
store = SessionStore()
