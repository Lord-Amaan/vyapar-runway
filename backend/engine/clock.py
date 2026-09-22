"""Restock clock — §6.2 of the build spec."""

from __future__ import annotations

from datetime import date, timedelta


def compute_clock(
    festival_date: date,
    days_on_shelf: int = 7,
    delivery_days: int = 3,
    today: date | None = None,
) -> dict:
    """Compute order-by date, days left, and missed flag."""
    today = today or date.today()
    stock_by = festival_date - timedelta(days=days_on_shelf)
    order_by = stock_by - timedelta(days=delivery_days)
    days_left = (order_by - today).days
    missed = days_left < 0

    return {
        "order_by": order_by.isoformat(),
        "days_left": days_left,
        "missed": missed,
    }
