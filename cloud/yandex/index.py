import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
import traceback
import uuid
from datetime import datetime, timezone

import ydb
import ydb.iam

_driver = None
_pool = None
PIN_ITERATIONS = 180_000


def _cors_headers():
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": os.environ.get("ALLOWED_ORIGIN", "*"),
        "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Bootstrap-Secret",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    }


def _response(status, body):
    return {"statusCode": status, "headers": _cors_headers(), "body": json.dumps(body, ensure_ascii=False)}


def _body(event):
    value = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        value = base64.b64decode(value).decode("utf-8")
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else {}
    except (ValueError, TypeError):
        return {}


def _path(event):
    context = event.get("requestContext") or {}
    http = context.get("http") or {}
    return (http.get("path") or event.get("url") or event.get("path") or "/").rstrip("/") or "/"


def _method(event):
    context = event.get("requestContext") or {}
    return ((context.get("http") or {}).get("method") or event.get("httpMethod") or "GET").upper()


def _headers(event):
    return {str(key).lower(): str(value) for key, value in (event.get("headers") or {}).items()}


def _db():
    global _driver, _pool
    if _pool is not None:
        return _pool
    _driver = ydb.Driver(
        endpoint=os.environ["YDB_ENDPOINT"],
        database=os.environ["YDB_DATABASE"],
        credentials=ydb.iam.MetadataUrlCredentials(),
    )
    _driver.wait(timeout=10, fail_fast=True)
    _pool = ydb.SessionPool(_driver, size=5)
    return _pool


def _typed(value):
    if isinstance(value, datetime):
        utc = value.astimezone(timezone.utc) if value.tzinfo else value.replace(tzinfo=timezone.utc)
        elapsed = utc - datetime(1970, 1, 1, tzinfo=timezone.utc)
        return ((elapsed.days * 86400 + elapsed.seconds) * 1_000_000) + elapsed.microseconds
    return str(value)


def _query(text, **values):
    parameters = {f"${key}": _typed(value) for key, value in values.items()}

    def execute(session):
        prepared = session.prepare(text)
        return session.transaction().execute(prepared, parameters, commit_tx=True)

    return _db().retry_operation_sync(execute)


def _rows(result):
    return list(result[0].rows) if result else []


def _value(row, key):
    try:
        return row[key]
    except (KeyError, TypeError):
        return getattr(row, key)


def _utcnow():
    return datetime.now(timezone.utc)


def _iso(value):
    if isinstance(value, datetime):
        return value.isoformat().replace("+00:00", "Z")
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value / 1_000_000, timezone.utc).isoformat().replace("+00:00", "Z")
    return str(value)


def _hash_pin(pin):
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode(), salt, PIN_ITERATIONS)
    return f"{PIN_ITERATIONS}${base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(digest).decode()}"


def _verify_pin(pin, stored):
    try:
        iterations, salt, expected = stored.split("$", 2)
        actual = hashlib.pbkdf2_hmac("sha256", pin.encode(), base64.urlsafe_b64decode(salt), int(iterations))
        return hmac.compare_digest(actual, base64.urlsafe_b64decode(expected))
    except (ValueError, TypeError):
        return False


def _b64(value):
    return base64.urlsafe_b64encode(value).decode().rstrip("=")


def _unb64(value):
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _issue_token(role, subject_id, extra=None):
    lifetime = 60 * 60 * (12 if role == "teacher" else 24 * 180)
    expires = int(time.time()) + lifetime
    payload = {"role": role, "sub": subject_id, "exp": expires, **(extra or {})}
    encoded = _b64(json.dumps(payload, separators=(",", ":")).encode())
    signature = _b64(hmac.new(os.environ["AUTH_SECRET"].encode(), encoded.encode(), hashlib.sha256).digest())
    return {
        "token": f"{encoded}.{signature}",
        "role": role,
        "subjectId": subject_id,
        "expiresAt": datetime.fromtimestamp(expires, timezone.utc).isoformat().replace("+00:00", "Z"),
    }


def _authenticate(event, role):
    authorization = _headers(event).get("authorization", "")
    if not authorization.startswith("Bearer "):
        return None
    try:
        encoded, signature = authorization[7:].split(".", 1)
        expected = _b64(hmac.new(os.environ["AUTH_SECRET"].encode(), encoded.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            return None
        payload = json.loads(_unb64(encoded))
        if payload.get("role") != role or int(payload.get("exp", 0)) <= int(time.time()):
            return None
        return payload
    except (ValueError, TypeError, json.JSONDecodeError):
        return None


def _find_student(student_id):
    rows = _rows(_query("""
        DECLARE $student_id AS Utf8;
        SELECT student_id, display_name, group_id, group_display_name, join_code, created_at
        FROM students WHERE student_id = $student_id;
    """, student_id=student_id))
    return rows[0] if rows else None


def _bootstrap_teacher(event, data):
    supplied = _headers(event).get("x-bootstrap-secret", "")
    expected = os.environ.get("BOOTSTRAP_SECRET", "disabled")
    if not supplied or not hmac.compare_digest(supplied, expected):
        return _response(403, {"message": "Bootstrap access denied."})
    pin = str(data.get("pin", ""))
    display_name = str(data.get("displayName", "Teacher")).strip()[:60]
    group_name = str(data.get("groupName", "Learn Letters")).strip()[:80]
    join_code = str(data.get("joinCode", "")).strip().upper()[:24]
    if not re.fullmatch(r"\d{6,12}", pin) or not display_name or not group_name or not re.fullmatch(r"[A-Z0-9-]{4,24}", join_code):
        return _response(400, {"message": "Use a 6–12 digit PIN and a 4–24 character Join Code."})
    existing = _rows(_query("SELECT teacher_key FROM teachers WHERE teacher_key = 'primary';"))
    if existing:
        return _response(409, {"message": "Teacher is already configured."})
    teacher_id, group_id, now = str(uuid.uuid4()), str(uuid.uuid4()), _utcnow()
    _query("""
        DECLARE $teacher_id AS Utf8; DECLARE $display_name AS Utf8; DECLARE $pin_hash AS Utf8;
        DECLARE $join_code AS Utf8; DECLARE $group_id AS Utf8; DECLARE $group_name AS Utf8; DECLARE $now AS Timestamp;
        UPSERT INTO teachers (teacher_key, teacher_id, display_name, pin_hash, join_code, created_at)
        VALUES ('primary', $teacher_id, $display_name, $pin_hash, $join_code, $now);
        UPSERT INTO groups (join_code, group_id, teacher_id, display_name, created_at)
        VALUES ($join_code, $group_id, $teacher_id, $group_name, $now);
    """, teacher_id=teacher_id, display_name=display_name, pin_hash=_hash_pin(pin), join_code=join_code,
        group_id=group_id, group_name=group_name, now=now)
    return _response(201, {"ok": True, "joinCode": join_code, "groupName": group_name})


def _register_student(data):
    student_id = str(data.get("studentId", "")).strip()
    display_name = str(data.get("displayName", "")).strip()[:40]
    join_code = str(data.get("joinCode", "")).strip().upper()[:24]
    try:
        uuid.UUID(student_id)
    except (ValueError, AttributeError):
        return _response(400, {"message": "Student ID is invalid."})
    if not display_name or not re.fullmatch(r"[A-Z0-9-]{4,24}", join_code):
        return _response(400, {"message": "Enter a name and the exact class Join Code."})
    groups = _rows(_query("""
        DECLARE $join_code AS Utf8;
        SELECT group_id, display_name, teacher_id FROM groups WHERE join_code = $join_code;
    """, join_code=join_code))
    if not groups:
        return _response(404, {"message": "Class not found. Check the Join Code with your teacher."})
    group = groups[0]
    group_id = _value(group, "group_id")
    existing = _find_student(student_id)
    if existing and _value(existing, "group_id") != group_id:
        return _response(409, {"message": "This student profile belongs to another class."})
    now = _utcnow()
    created_at = _value(existing, "created_at") if existing else now
    group_name = _value(group, "display_name")
    _query("""
        DECLARE $student_id AS Utf8; DECLARE $display_name AS Utf8; DECLARE $group_id AS Utf8;
        DECLARE $group_name AS Utf8; DECLARE $join_code AS Utf8; DECLARE $created_at AS Timestamp; DECLARE $now AS Timestamp;
        UPSERT INTO students (student_id, display_name, group_id, group_display_name, join_code, created_at, updated_at)
        VALUES ($student_id, $display_name, $group_id, $group_name, $join_code, $created_at, $now);
        UPSERT INTO group_members (group_id, student_id) VALUES ($group_id, $student_id);
    """, student_id=student_id, display_name=display_name, group_id=group_id, group_name=group_name,
        join_code=join_code, created_at=created_at, now=now)
    return _response(201, {
        "session": _issue_token("student", student_id, {"groupId": group_id}),
        "groupName": group_name,
    })


def _sync_student(event, data):
    identity = _authenticate(event, "student")
    student = data.get("student")
    if not identity:
        return _response(401, {"message": "Student cloud session expired."})
    if not isinstance(student, dict) or student.get("id") != identity["sub"]:
        return _response(400, {"message": "Student data does not match the signed-in profile."})
    row = _find_student(identity["sub"])
    if not row:
        return _response(404, {"message": "Student profile was not found."})
    safe_student = dict(student)
    safe_student["name"] = _value(row, "display_name")
    safe_student["group"] = _value(row, "group_display_name")
    payload = json.dumps(safe_student, ensure_ascii=False, separators=(",", ":"))
    if len(payload.encode("utf-8")) > 400_000:
        return _response(413, {"message": "Progress record is too large."})
    now = _utcnow()
    _query("""
        DECLARE $student_id AS Utf8; DECLARE $payload AS Json; DECLARE $now AS Timestamp;
        UPSERT INTO student_snapshots (student_id, payload, updated_at) VALUES ($student_id, $payload, $now);
        UPDATE students SET updated_at = $now WHERE student_id = $student_id;
    """, student_id=identity["sub"], payload=payload, now=now)
    return _response(200, {"ok": True, "syncedAt": _iso(now)})


def _login_teacher(data):
    pin = str(data.get("pin", ""))
    rows = _rows(_query("""
        SELECT teacher_id, pin_hash, join_code FROM teachers WHERE teacher_key = 'primary';
    """))
    teacher = rows[0] if rows else None
    if not teacher or not _verify_pin(pin, _value(teacher, "pin_hash")):
        return _response(401, {"message": "Teacher PIN is not correct."})
    teacher_id = _value(teacher, "teacher_id")
    return _response(200, {"session": _issue_token("teacher", teacher_id, {"joinCode": _value(teacher, "join_code")})})


def _teacher_students(event):
    identity = _authenticate(event, "teacher")
    if not identity:
        return _response(401, {"message": "Teacher login required."})
    groups = _rows(_query("""
        DECLARE $join_code AS Utf8; DECLARE $teacher_id AS Utf8;
        SELECT group_id, display_name FROM groups WHERE join_code = $join_code AND teacher_id = $teacher_id;
    """, join_code=identity.get("joinCode", ""), teacher_id=identity["sub"]))
    if not groups:
        return _response(404, {"message": "Teacher class was not found."})
    group_id = _value(groups[0], "group_id")
    group_name = _value(groups[0], "display_name")
    members = _rows(_query("""
        DECLARE $group_id AS Utf8;
        SELECT student_id FROM group_members WHERE group_id = $group_id;
    """, group_id=group_id))
    students = []
    for member in members:
        student_id = _value(member, "student_id")
        snapshots = _rows(_query("""
            DECLARE $student_id AS Utf8;
            SELECT payload FROM student_snapshots WHERE student_id = $student_id;
        """, student_id=student_id))
        if snapshots:
            students.append(json.loads(_value(snapshots[0], "payload")))
            continue
        row = _find_student(student_id)
        if row:
            students.append({
                "id": student_id,
                "name": _value(row, "display_name"),
                "group": group_name,
                "createdAt": _iso(_value(row, "created_at")),
                "progress": {},
                "badges": [],
            })
    students.sort(key=lambda item: (str(item.get("group", "")), str(item.get("name", "")).lower()))
    return _response(200, {"students": students})


def handler(event, context):
    del context
    try:
        method, path, data = _method(event), _path(event), _body(event)
        if method == "OPTIONS":
            return _response(204, {})
        if method == "GET" and path == "/health":
            return _response(200, {"ok": True, "service": "learn-letters-sync"})
        if method == "POST" and path == "/setup/teacher":
            return _bootstrap_teacher(event, data)
        if method == "POST" and path == "/student/register":
            return _register_student(data)
        if method == "POST" and path == "/student/sync":
            return _sync_student(event, data)
        if method == "POST" and path == "/teacher/login":
            return _login_teacher(data)
        if method == "GET" and path == "/teacher/students":
            return _teacher_students(event)
        return _response(404, {"message": "Route not found."})
    except KeyError as error:
        return _response(500, {"message": f"Missing function setting: {error.args[0]}"})
    except Exception as error:
        print(f"LEARN_LETTERS_ERROR {type(error).__name__}: {error}", flush=True)
        traceback.print_exc()
        return _response(500, {"message": "Cloud service error. Local progress is still safe."})
