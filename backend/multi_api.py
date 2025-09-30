from __future__ import annotations

from fastapi import FastAPI
from core.agent_multi.router import router as agent_multi_router
from api_cliente.api import router as api_cliente_router

app = FastAPI(title="Suna Multi-Agents (Standalone)")

# Expose health and the multi-agents routes only (no DB/Supabase/Redis dependencies)
@app.get("/api/health")
async def health():
    return {"status": "ok"}

# Mount multi-agents API under /api
app.include_router(agent_multi_router, prefix="/api")

# Mount api_cliente routes under /api/user-api
app.include_router(api_cliente_router, prefix="/api/user-api")
