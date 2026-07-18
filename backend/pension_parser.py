import io
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

import openpyxl

from drive_client import list_folders, list_spreadsheets, download_xlsx

PENSION_FOLDER_ID = "1HU_iC66BQrOM_bUIs8l7YdtMM9yqSHTL"

_DATE_FMTS = ["%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y"]


def _parse_date(val):
    if not val or str(val).strip().upper() in ("NOT RECEIVED", "NOT DONE", ""):
        return None
    s = str(val).strip()
    for fmt in _DATE_FMTS:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def _classify(eos, physical, eppo_submitted):
    today = datetime.today().date()
    deadline = eos - timedelta(days=60) if eos else None

    eos_past = eos and eos <= today

    # Physical receipt delay vs 2-month deadline
    physical_delay_days = None
    if deadline and physical:
        physical_delay_days = (physical - deadline).days  # positive = late

    if eos_past and eppo_submitted is None:
        status = "critical"
    elif not eos_past and physical and eppo_submitted is None:
        # Physical file received but EPPO not submitted yet — at risk
        status = "at_risk"
    elif eppo_submitted and eos and eppo_submitted <= eos:
        if physical_delay_days is not None and physical_delay_days > 0:
            status = "delayed"
        else:
            status = "on_time"
    elif eppo_submitted and eos and eppo_submitted > eos:
        status = "delayed"
    elif not eos_past:
        status = "pending"   # nothing received, EOS upcoming
    else:
        status = "critical"

    return status, physical_delay_days


def _parse_pen07(wb, period):
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))

    # Row 0: title, Row 1: headers, Row 2+: data
    cases = []
    for row in rows[2:]:
        if not row or row[0] is None:
            continue
        try:
            sr = row[0]
            if not str(sr).strip() or str(sr).strip().lower() == "sr no.":
                continue
        except Exception:
            continue

        name           = str(row[1]).strip() if row[1] else ""
        pao            = str(row[2]).strip() if row[2] else ""
        pension_class  = str(row[3]).strip().replace("\n", "") if row[3] else ""
        eos            = _parse_date(row[4])
        pfms_landing   = _parse_date(row[5])
        physical       = _parse_date(row[6])
        eppo_signed    = _parse_date(row[7])
        eppo_submitted = _parse_date(row[8])

        status, physical_delay_days = _classify(eos, physical, eppo_submitted)

        deadline = (eos - timedelta(days=60)).isoformat() if eos else None

        cases.append({
            "name":                name,
            "pao":                 pao,
            "pension_class":       pension_class,
            "end_of_service":      eos.isoformat() if eos else None,
            "deadline":            deadline,
            "pfms_landing":        pfms_landing.isoformat() if pfms_landing else None,
            "physical_received":   physical.isoformat() if physical else None,
            "eppo_signed":         eppo_signed.isoformat() if eppo_signed else None,
            "eppo_submitted":      eppo_submitted.isoformat() if eppo_submitted else None,
            "status":              status,
            "physical_delay_days": physical_delay_days,
        })

    return {"period": period, "cases": cases}


def _process_week(wf):
    files = list_spreadsheets(wf["id"])
    for xf in files:
        if "pen07" in xf["name"].lower() or "pension" in xf["name"].lower():
            try:
                content = download_xlsx(xf["id"], xf["mimeType"])
                wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
                return _parse_pen07(wb, wf["name"])
            except Exception:
                pass
    return None


def parse_pension() -> dict:
    month_folders = list_folders(PENSION_FOLDER_ID)
    week_folders = []
    for mf in sorted(month_folders, key=lambda f: f["name"]):
        for wf in sorted(list_folders(mf["id"]), key=lambda f: f["name"]):
            week_folders.append(wf)

    results = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(_process_week, wf): wf["name"] for wf in week_folders}
        for future in as_completed(futures):
            name = futures[future]
            entry = future.result()
            if entry:
                results[name] = entry

    all_weeks = [results[wf["name"]] for wf in week_folders if wf["name"] in results]
    return {"weeks": all_weeks}
