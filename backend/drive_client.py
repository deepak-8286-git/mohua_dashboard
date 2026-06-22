import io
import json
import os
import warnings
warnings.filterwarnings("ignore")

from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES    = ["https://www.googleapis.com/auth/drive.readonly"]
XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
GSHEET_MIME = "application/vnd.google-apps.spreadsheet"

# Local fallback path (dev only — never committed)
_CRED_FILE = os.path.join(
    os.path.dirname(__file__), "..", "credentials",
    "cosmic-octane-499906-q0-88ac81084d22.json"
)

_service = None


def get_service():
    global _service
    if _service is not None:
        return _service

    creds_json = os.environ.get("GOOGLE_CREDENTIALS_JSON")
    if creds_json:
        # Railway / production: credentials stored as env var (raw JSON string)
        info = json.loads(creds_json)
        creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    else:
        # Local development: read from file
        creds = service_account.Credentials.from_service_account_file(_CRED_FILE, scopes=SCOPES)

    _service = build("drive", "v3", credentials=creds)
    return _service


def list_children(folder_id: str, mime_filter: str = None) -> list:
    svc = get_service()
    q = f"'{folder_id}' in parents"
    if mime_filter:
        q += f" and mimeType='{mime_filter}'"
    results = svc.files().list(
        q=q, fields="files(id, name, mimeType, modifiedTime)", pageSize=200
    ).execute()
    return results.get("files", [])


def list_folders(folder_id: str) -> list:
    return list_children(folder_id, mime_filter="application/vnd.google-apps.folder")


def list_spreadsheets(folder_id: str) -> list:
    svc = get_service()
    results = svc.files().list(
        q=f"'{folder_id}' in parents and (mimeType='{XLSX_MIME}' or mimeType='{GSHEET_MIME}')",
        fields="files(id, name, mimeType)",
        pageSize=200,
    ).execute()
    return results.get("files", [])


def download_xlsx(file_id: str, mime_type: str) -> bytes:
    svc = get_service()
    if mime_type == GSHEET_MIME:
        return svc.files().export_media(fileId=file_id, mimeType=XLSX_MIME).execute()
    return svc.files().get_media(fileId=file_id).execute()
