#!/usr/bin/env python3
import json
import os
import re
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Optional
from urllib.parse import unquote, urlparse


ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "data" / "quizzes"
PORT = int(os.environ.get("PORT", "8000"))


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "quiz"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_iso(value: Optional[str]) -> datetime:
    if not value:
        return datetime.min.replace(tzinfo=timezone.utc)
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return datetime.min.replace(tzinfo=timezone.utc)


def list_tests() -> list[dict]:
    tests = []
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for path in DATA_DIR.glob("*.json"):
        with path.open("r", encoding="utf-8") as handle:
            tests.append(json.load(handle))
    tests.sort(
        key=lambda item: (
            parse_iso(item.get("createdAt")),
            parse_iso(item.get("updatedAt")),
            item.get("title", "").lower(),
        )
    )
    return tests


def read_json_body(handler: "QuizHandler") -> dict:
    length = int(handler.headers.get("Content-Length", "0"))
    raw = handler.rfile.read(length)
    return json.loads(raw.decode("utf-8"))


def write_test(payload: dict) -> dict:
    title = str(payload.get("title", "")).strip()
    if not title:
        raise ValueError("Quiz title is required.")

    slug = slugify(payload.get("slug") or title)
    path = DATA_DIR / f"{slug}.json"
    existing = {}
    if path.exists():
        with path.open("r", encoding="utf-8") as handle:
            existing = json.load(handle)

    saved = {
        "id": existing.get("id") or payload.get("id") or slug,
        "slug": slug,
        "title": title,
        "description": str(payload.get("description", "")).strip(),
        "questions": payload.get("questions", []),
        "attempts": existing.get("attempts", []),
        "createdAt": existing.get("createdAt") or now_iso(),
        "updatedAt": now_iso(),
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(saved, handle, indent=2)
        handle.write("\n")
    return saved


def delete_test(slug: str) -> None:
    path = DATA_DIR / f"{slug}.json"
    if path.exists():
        path.unlink()


def append_attempt(slug: str, attempt: dict) -> dict:
    path = DATA_DIR / f"{slug}.json"
    if not path.exists():
        raise FileNotFoundError(slug)

    with path.open("r", encoding="utf-8") as handle:
        test = json.load(handle)

    attempts = test.get("attempts", [])
    attempts.append(attempt)
    test["attempts"] = attempts
    test["updatedAt"] = now_iso()

    with path.open("w", encoding="utf-8") as handle:
        json.dump(test, handle, indent=2)
        handle.write("\n")
    return test


class QuizHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/tests":
            return self.handle_list_tests()
        if parsed.path == "/api/health":
            return self.respond_json({"ok": True})
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/tests":
            return self.handle_save_test()
        if parsed.path.startswith("/api/tests/") and parsed.path.endswith("/attempts"):
            slug = unquote(parsed.path.removeprefix("/api/tests/").removesuffix("/attempts")).strip("/")
            return self.handle_append_attempt(slug)
        self.send_error(HTTPStatus.NOT_FOUND)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/tests/"):
            slug = unquote(parsed.path.removeprefix("/api/tests/")).strip("/")
            return self.handle_delete_test(slug)
        self.send_error(HTTPStatus.NOT_FOUND)

    def handle_list_tests(self):
        return self.respond_json({"tests": list_tests()})

    def handle_save_test(self):
        try:
            payload = read_json_body(self)
            saved = write_test(payload)
            return self.respond_json({"test": saved}, status=HTTPStatus.CREATED)
        except json.JSONDecodeError:
            return self.respond_json({"error": "Request body must be valid JSON."}, status=HTTPStatus.BAD_REQUEST)
        except ValueError as exc:
            return self.respond_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)

    def handle_delete_test(self, slug: str):
        delete_test(slug)
        return self.respond_json({"deleted": True})

    def handle_append_attempt(self, slug: str):
        try:
            payload = read_json_body(self)
            test = append_attempt(slug, payload)
            return self.respond_json({"test": test})
        except FileNotFoundError:
            return self.respond_json({"error": "Test not found."}, status=HTTPStatus.NOT_FOUND)
        except json.JSONDecodeError:
            return self.respond_json({"error": "Request body must be valid JSON."}, status=HTTPStatus.BAD_REQUEST)

    def respond_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        super().log_message(format, *args)


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", PORT), QuizHandler)
    print(f"MyQuiz server running at http://127.0.0.1:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
