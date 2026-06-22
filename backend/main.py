import asyncio
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from iaw_parser import parse_iaw
from bill_parser import parse_bill

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = FastAPI(title="MoHUA Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

cache: dict = {"iaw": None, "bill": None, "last_updated": None, "error": None}
REFRESH_INTERVAL = 300  # seconds


def refresh_cache():
    log.info("Refreshing Drive data…")
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            f_iaw  = pool.submit(parse_iaw)
            f_bill = pool.submit(parse_bill)
            cache["iaw"]  = f_iaw.result()
            cache["bill"] = f_bill.result()
        cache["last_updated"] = datetime.now(timezone.utc).isoformat()
        cache["error"] = None
        log.info("Drive data refreshed at %s", cache["last_updated"])
    except Exception as exc:
        cache["error"] = str(exc)
        log.error("Drive refresh failed: %s", exc)


async def periodic_refresh():
    while True:
        await asyncio.sleep(REFRESH_INTERVAL)
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, refresh_cache)


@app.on_event("startup")
async def startup():
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, refresh_cache)
    asyncio.create_task(periodic_refresh())


# ── API routes (must be defined before the SPA catch-all) ─────────────────

@app.get("/api/iaw")
def get_iaw():
    return cache["iaw"] or {}


@app.get("/api/bill")
def get_bill():
    return cache["bill"] or {}


@app.get("/api/last-updated")
def get_last_updated():
    return {"timestamp": cache["last_updated"], "error": cache["error"]}


@app.get("/api/health")
def health():
    return {"status": "ok", "last_updated": cache["last_updated"]}


# ── Serve React frontend ───────────────────────────────────────────────────
# In production (Railway), the React build lives at ../frontend/dist
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    # Serve /assets/* and other static files
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        """Catch-all: return index.html so React Router handles routing."""
        return FileResponse(FRONTEND_DIST / "index.html")
