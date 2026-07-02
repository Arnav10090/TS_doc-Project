import asyncio
import time
from uuid import uuid4

import pytest

from app.ai_suggestions import schemas, service as ai_service


@pytest.mark.asyncio
async def test_ai_suggestions_10_concurrent_users_meet_latency_targets(monkeypatch):
    """Performance guard for 10 concurrent AI suggestion requests with provider mocked."""
    ai_service.clear_ai_suggestion_latency_metrics()

    async def fake_impl(project_id, section_key, draft_content, db):
        await asyncio.sleep(0.01)
        return schemas.SuggestionResponse(
            section_key=section_key,
            section_title="Tech Stack",
            suggestion_mode="predefined",
            structured_import_available=True,
            content=[{"sr_no": 1, "component": "Backend", "technology": "FastAPI"}],
            subsection_suggestions=None,
            raw_text=None,
            historical_context_available=False,
            context_sources=[],
            context_txt_used=False,
        )

    monkeypatch.setattr(ai_service, "_generate_suggestion_impl", fake_impl)

    started_at = time.perf_counter()
    responses = await asyncio.gather(*[
        ai_service.generate_suggestion(uuid4(), "tech_stack", {"rows": []}, None)
        for _ in range(10)
    ])
    elapsed_ms = (time.perf_counter() - started_at) * 1000
    metrics = ai_service.get_ai_suggestion_latency_metrics()

    assert len(responses) == 10
    assert metrics["count"] == 10
    assert metrics["average_ms"] < 5000
    assert metrics["p95_ms"] < 8000
    assert elapsed_ms < 5000
