from __future__ import annotations

from fastapi import FastAPI
from core.agent_multi.router import router as agent_multi_router

app = FastAPI(title="Tars Multi-Agents (Standalone)")

# Expose health and the multi-agents routes only (no DB/Supabase/Redis dependencies)
@app.get("/api/health")
async def health():
    return {"status": "ok"}

# Mount multi-agents API under /api
app.include_router(agent_multi_router, prefix="/api")
