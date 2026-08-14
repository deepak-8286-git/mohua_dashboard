import asyncio
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from iaw_parser import parse_iaw
from bill_parser import parse_bill
from pension_parser import parse_pension
from gem_parser import parse_gem

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = FastAPI(title="MoHUA Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

cache: dict = {"iaw": None, "bill": None, "pension": None, "gem": None, "last_updated": None, "error": None}
REFRESH_INTERVAL = 300  # seconds


def refresh_cache():
    log.info("Refreshing Drive data…")
    try:
        with ThreadPoolExecutor(max_workers=4) as pool:
            f_iaw     = pool.submit(parse_iaw)
            f_bill    = pool.submit(parse_bill)
            f_pension = pool.submit(parse_pension)
            f_gem     = pool.submit(parse_gem)
            cache["iaw"]     = f_iaw.result()
            cache["bill"]    = f_bill.result()
            cache["pension"] = f_pension.result()
            cache["gem"]     = f_gem.result()
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
    # Run initial sync in background thread so API server starts immediately
    asyncio.create_task(asyncio.to_thread(refresh_cache))
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


@app.get("/api/pension")
def get_pension():
    return cache["pension"] or {}


@app.get("/api/gem")
def get_gem():
    return cache["gem"] or {}


@app.get("/api/health")
def health():
    return {"status": "ok", "last_updated": cache["last_updated"]}


@app.post("/api/refresh")
async def trigger_refresh():
    """Trigger an immediate Drive data refresh and return updated status."""
    log.info("Manual refresh triggered via API")
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, refresh_cache)
    return {"status": "ok", "last_updated": cache["last_updated"], "error": cache["error"]}


# ── Serve React frontend ───────────────────────────────────────────────────
# In production (Railway), the React build lives at ../frontend/dist
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    # Mount entire dist/ so Indian_emblem.png and all assets are served directly.
    # html=True makes / serve index.html automatically.
    # API routes defined above take priority over this mount.
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="spa")
