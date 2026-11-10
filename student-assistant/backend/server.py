"""
FastAPI Backend for Smart Student Assistant
Provides 100% compatible API routes for Auth, Notes, Clients, Reminders, Chat, and SSE.
Uses built-in SQLite for zero-configuration, instant-startup persistence.
"""

import asyncio
import json
import os
import sqlite3
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Set

import bcrypt
from fastapi import FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from sse_starlette.sse import EventSourceResponse

# Configuration
PORT = int(os.environ.get("PORT", 5000))
JWT_SECRET = os.environ.get("JWT_SECRET", "student_assistant_dev_secret_key_12345")
ACCESS_SECRET = os.environ.get("ACCESS_TOKEN_SECRET", JWT_SECRET)
REFRESH_SECRET = os.environ.get("REFRESH_TOKEN_SECRET", JWT_SECRET)
ACCESS_EXPIRES_MINUTES = 60 * 24  # 24 hours
REFRESH_EXPIRES_DAYS = 7
DB_PATH = os.path.join(os.path.dirname(__file__), "student_assistant.db")

app = FastAPI(title="Smart Student Assistant API", version="1.0.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5000", "http://127.0.0.1:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SSE Event Queues for connected clients
sse_subscribers: Set[asyncio.Queue] = set()


def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            refresh_token TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT DEFAULT '',
            tags TEXT DEFAULT '[]',
            attachments TEXT DEFAULT '{"files":[]}',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reminders (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            due_at TEXT NOT NULL,
            type TEXT DEFAULT 'other',
            notes TEXT DEFAULT '',
            completed INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            email TEXT,
            risk_score REAL,
            meta TEXT DEFAULT '{}',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    conn.commit()
    conn.close()


init_db()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def broadcast_event(event_name: str, data: Any):
    msg = {"event": event_name, "data": json.dumps(data)}
    for q in list(sse_subscribers):
        try:
            await q.put(msg)
        except Exception:
            pass


def create_access_token(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_EXPIRES_MINUTES)
    return jwt.encode({"sub": user_id, "exp": exp}, ACCESS_SECRET, algorithm="HS256")


def create_refresh_token(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=REFRESH_EXPIRES_DAYS)
    return jwt.encode({"sub": user_id, "exp": exp}, REFRESH_SECRET, algorithm="HS256")


def verify_token(token: str) -> str:
    try:
        payload = jwt.decode(token, ACCESS_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_user_id(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    elif "accessToken" in request.cookies:
        token = request.cookies.get("accessToken")
    elif request.query_params.get("token"):
        token = request.query_params.get("token")

    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    return verify_token(token)


# Health check
@app.get("/health")
def health():
    return {"status": "ok"}


# Auth Models
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/api/auth/register")
def register(req: RegisterRequest, response: Response):
    if not req.name or not req.email or not req.password:
        raise HTTPException(status_code=400, detail="name, email and password required")

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id FROM users WHERE email = ?", (req.email.strip().lower(),))
    if c.fetchone():
        conn.close()
        raise HTTPException(status_code=409, detail="Email already in use")

    salt = bcrypt.gensalt()
    pw_hash = bcrypt.hashpw(req.password.encode("utf-8"), salt).decode("utf-8")
    user_id = str(uuid.uuid4())
    ts = now_iso()

    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)

    c.execute(
        "INSERT INTO users (id, name, email, password_hash, refresh_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user_id, req.name.strip(), req.email.strip().lower(), pw_hash, refresh_token, ts, ts),
    )
    conn.commit()
    conn.close()

    response.set_cookie(
        key="refreshToken",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        max_age=7 * 24 * 3600,
    )
    response.status_code = status.HTTP_201_CREATED
    return {
        "accessToken": access_token,
        "user": {"id": user_id, "name": req.name.strip(), "email": req.email.strip().lower()},
    }


@app.post("/api/auth/login")
def login(req: LoginRequest, response: Response):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, name, email, password_hash FROM users WHERE email = ?", (req.email.strip().lower(),))
    user = c.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not bcrypt.checkpw(req.password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id = user["id"]
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)

    c.execute("UPDATE users SET refresh_token = ?, updated_at = ? WHERE id = ?", (refresh_token, now_iso(), user_id))
    conn.commit()
    conn.close()

    response.set_cookie(
        key="refreshToken",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        max_age=7 * 24 * 3600,
    )
    return {
        "accessToken": access_token,
        "user": {"id": user_id, "name": user["name"], "email": user["email"]},
    }


@app.post("/api/auth/refresh")
def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refreshToken")
    if not token:
        raise HTTPException(status_code=401, detail="Missing refresh token")

    try:
        payload = jwt.decode(token, REFRESH_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, name, email, refresh_token FROM users WHERE id = ?", (user_id,))
    user = c.fetchone()
    if not user or user["refresh_token"] != token:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    new_access = create_access_token(user_id)
    new_refresh = create_refresh_token(user_id)
    c.execute("UPDATE users SET refresh_token = ?, updated_at = ? WHERE id = ?", (new_refresh, now_iso(), user_id))
    conn.commit()
    conn.close()

    response.set_cookie(
        key="refreshToken",
        value=new_refresh,
        httponly=True,
        samesite="lax",
        max_age=7 * 24 * 3600,
    )
    return {
        "accessToken": new_access,
        "user": {"id": user_id, "name": user["name"], "email": user["email"]},
    }


@app.post("/api/auth/logout")
def logout(response: Response):
    response.delete_cookie("refreshToken")
    return {"ok": True}


# Notes Endpoints
class NoteCreate(BaseModel):
    title: str
    content: Optional[str] = ""
    tags: Optional[List[str]] = []


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None


@app.get("/api/notes")
def list_notes(request: Request):
    user_id = get_current_user_id(request)
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "SELECT id, user_id, title, content, tags, attachments, created_at, updated_at FROM notes WHERE user_id = ? ORDER BY updated_at DESC",
        (user_id,),
    )
    rows = c.fetchall()
    notes = []
    for r in rows:
        notes.append({
            "_id": r["id"],
            "userId": r["user_id"],
            "title": r["title"],
            "content": r["content"],
            "tags": json.loads(r["tags"] or "[]"),
            "attachments": json.loads(r["attachments"] or '{"files":[]}'),
            "createdAt": r["created_at"],
            "updatedAt": r["updated_at"],
        })
    conn.close()
    return {"notes": notes}


@app.post("/api/notes", status_code=201)
async def create_note(req: NoteCreate, request: Request):
    if not req.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    user_id = get_current_user_id(request)
    note_id = str(uuid.uuid4())
    ts = now_iso()
    tags_json = json.dumps(req.tags or [])
    attachments_json = json.dumps({"files": []})

    conn = get_db()
    c = conn.cursor()
    c.execute(
        "INSERT INTO notes (id, user_id, title, content, tags, attachments, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (note_id, user_id, req.title.strip(), req.content or "", tags_json, attachments_json, ts, ts),
    )
    conn.commit()
    conn.close()

    note_obj = {
        "_id": note_id,
        "userId": user_id,
        "title": req.title.strip(),
        "content": req.content or "",
        "tags": req.tags or [],
        "attachments": {"files": []},
        "createdAt": ts,
        "updatedAt": ts,
    }
    await broadcast_event("note:created", note_obj)
    return {"note": note_obj}


@app.put("/api/notes/{note_id}")
async def update_note(note_id: str, req: NoteUpdate, request: Request):
    user_id = get_current_user_id(request)
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM notes WHERE id = ? AND user_id = ?", (note_id, user_id))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Not found")

    title = req.title if req.title is not None else row["title"]
    content = req.content if req.content is not None else row["content"]
    tags_json = json.dumps(req.tags) if req.tags is not None else row["tags"]
    ts = now_iso()

    c.execute(
        "UPDATE notes SET title = ?, content = ?, tags = ?, updated_at = ? WHERE id = ?",
        (title, content, tags_json, ts, note_id),
    )
    conn.commit()
    conn.close()

    note_obj = {
        "_id": note_id,
        "userId": user_id,
        "title": title,
        "content": content,
        "tags": json.loads(tags_json or "[]"),
        "attachments": json.loads(row["attachments"] or '{"files":[]}'),
        "createdAt": row["created_at"],
        "updatedAt": ts,
    }
    await broadcast_event("note:updated", note_obj)
    return {"note": note_obj}


@app.delete("/api/notes/{note_id}")
async def delete_note(note_id: str, request: Request):
    user_id = get_current_user_id(request)
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM notes WHERE id = ? AND user_id = ?", (note_id, user_id))
    deleted = c.rowcount > 0
    conn.commit()
    conn.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Not found")

    await broadcast_event("note:deleted", {"id": note_id})
    return {"success": True}


# Reminders Endpoints
class ReminderCreate(BaseModel):
    title: str
    dueAt: str
    type: Optional[str] = "other"
    notes: Optional[str] = ""


class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    dueAt: Optional[str] = None
    type: Optional[str] = None
    notes: Optional[str] = None
    completed: Optional[bool] = None


@app.get("/api/reminders")
def list_reminders(request: Request):
    user_id = get_current_user_id(request)
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "SELECT id, user_id, title, due_at, type, notes, completed, created_at, updated_at FROM reminders WHERE user_id = ? ORDER BY due_at ASC",
        (user_id,),
    )
    rows = c.fetchall()
    reminders = []
    for r in rows:
        reminders.append({
            "_id": r["id"],
            "userId": r["user_id"],
            "title": r["title"],
            "dueAt": r["due_at"],
            "type": r["type"],
            "notes": r["notes"],
            "completed": bool(r["completed"]),
            "createdAt": r["created_at"],
            "updatedAt": r["updated_at"],
        })
    conn.close()
    return {"reminders": reminders}


@app.post("/api/reminders", status_code=201)
async def create_reminder(req: ReminderCreate, request: Request):
    if not req.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    user_id = get_current_user_id(request)
    rem_id = str(uuid.uuid4())
    ts = now_iso()

    conn = get_db()
    c = conn.cursor()
    c.execute(
        "INSERT INTO reminders (id, user_id, title, due_at, type, notes, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)",
        (rem_id, user_id, req.title.strip(), req.dueAt, req.type or "other", req.notes or "", ts, ts),
    )
    conn.commit()
    conn.close()

    rem_obj = {
        "_id": rem_id,
        "userId": user_id,
        "title": req.title.strip(),
        "dueAt": req.dueAt,
        "type": req.type or "other",
        "notes": req.notes or "",
        "completed": False,
        "createdAt": ts,
        "updatedAt": ts,
    }
    await broadcast_event("reminder:created", rem_obj)
    return {"reminder": rem_obj}


@app.put("/api/reminders/{rem_id}")
async def update_reminder(rem_id: str, req: ReminderUpdate, request: Request):
    user_id = get_current_user_id(request)
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM reminders WHERE id = ? AND user_id = ?", (rem_id, user_id))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Not found")

    title = req.title if req.title is not None else row["title"]
    due_at = req.dueAt if req.dueAt is not None else row["due_at"]
    type_str = req.type if req.type is not None else row["type"]
    notes = req.notes if req.notes is not None else row["notes"]
    completed = int(req.completed) if req.completed is not None else row["completed"]
    ts = now_iso()

    c.execute(
        "UPDATE reminders SET title = ?, due_at = ?, type = ?, notes = ?, completed = ?, updated_at = ? WHERE id = ?",
        (title, due_at, type_str, notes, completed, ts, rem_id),
    )
    conn.commit()
    conn.close()

    rem_obj = {
        "_id": rem_id,
        "userId": user_id,
        "title": title,
        "dueAt": due_at,
        "type": type_str,
        "notes": notes,
        "completed": bool(completed),
        "createdAt": row["created_at"],
        "updatedAt": ts,
    }
    await broadcast_event("reminder:updated", rem_obj)
    return {"reminder": rem_obj}


@app.delete("/api/reminders/{rem_id}")
async def delete_reminder(rem_id: str, request: Request):
    user_id = get_current_user_id(request)
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM reminders WHERE id = ? AND user_id = ?", (rem_id, user_id))
    deleted = c.rowcount > 0
    conn.commit()
    conn.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Not found")

    await broadcast_event("reminder:deleted", {"id": rem_id})
    return {"success": True}


# Clients Endpoints
class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    riskScore: Optional[float] = None
    meta: Optional[Dict[str, Any]] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    riskScore: Optional[float] = None
    meta: Optional[Dict[str, Any]] = None


@app.get("/api/clients")
def list_clients(request: Request):
    user_id = get_current_user_id(request)
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "SELECT id, user_id, name, email, risk_score, meta, created_at, updated_at FROM clients WHERE user_id = ? ORDER BY updated_at DESC",
        (user_id,),
    )
    rows = c.fetchall()
    clients = []
    for r in rows:
        clients.append({
            "_id": r["id"],
            "userId": r["user_id"],
            "name": r["name"],
            "email": r["email"],
            "riskScore": r["risk_score"],
            "meta": json.loads(r["meta"] or "{}"),
            "createdAt": r["created_at"],
            "updatedAt": r["updated_at"],
        })
    conn.close()
    return {"clients": clients}


@app.get("/api/clients/{client_id}")
def get_client(client_id: str, request: Request):
    user_id = get_current_user_id(request)
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM clients WHERE id = ? AND user_id = ?", (client_id, user_id))
    r = c.fetchone()
    conn.close()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    client_obj = {
        "_id": r["id"],
        "userId": r["user_id"],
        "name": r["name"],
        "email": r["email"],
        "riskScore": r["risk_score"],
        "meta": json.loads(r["meta"] or "{}"),
        "createdAt": r["created_at"],
        "updatedAt": r["updated_at"],
    }
    return {"client": client_obj}


@app.post("/api/clients", status_code=201)
async def create_client(req: ClientCreate, request: Request):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    user_id = get_current_user_id(request)
    client_id = str(uuid.uuid4())
    ts = now_iso()
    meta_json = json.dumps(req.meta or {})

    conn = get_db()
    c = conn.cursor()
    c.execute(
        "INSERT INTO clients (id, user_id, name, email, risk_score, meta, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (client_id, user_id, req.name.strip(), req.email, req.riskScore, meta_json, ts, ts),
    )
    conn.commit()
    conn.close()

    client_obj = {
        "_id": client_id,
        "userId": user_id,
        "name": req.name.strip(),
        "email": req.email,
        "riskScore": req.riskScore,
        "meta": req.meta or {},
        "createdAt": ts,
        "updatedAt": ts,
    }
    await broadcast_event("client:created", client_obj)
    return {"client": client_obj}


@app.put("/api/clients/{client_id}")
async def update_client(client_id: str, req: ClientUpdate, request: Request):
    user_id = get_current_user_id(request)
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM clients WHERE id = ? AND user_id = ?", (client_id, user_id))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Not found")

    name = req.name if req.name is not None else row["name"]
    email = req.email if req.email is not None else row["email"]
    risk_score = req.riskScore if req.riskScore is not None else row["risk_score"]
    meta_json = json.dumps(req.meta) if req.meta is not None else row["meta"]
    ts = now_iso()

    c.execute(
        "UPDATE clients SET name = ?, email = ?, risk_score = ?, meta = ?, updated_at = ? WHERE id = ?",
        (name, email, risk_score, meta_json, ts, client_id),
    )
    conn.commit()
    conn.close()

    client_obj = {
        "_id": client_id,
        "userId": user_id,
        "name": name,
        "email": email,
        "riskScore": risk_score,
        "meta": json.loads(meta_json or "{}"),
        "createdAt": row["created_at"],
        "updatedAt": ts,
    }
    await broadcast_event("client:updated", client_obj)
    return {"client": client_obj}


@app.delete("/api/clients/{client_id}")
async def delete_client(client_id: str, request: Request):
    user_id = get_current_user_id(request)
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM clients WHERE id = ? AND user_id = ?", (client_id, user_id))
    deleted = c.rowcount > 0
    conn.commit()
    conn.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Not found")

    await broadcast_event("client:deleted", {"id": client_id})
    return {"success": True}


# AI Chat Endpoint
class ChatRequest(BaseModel):
    prompt: str


@app.post("/api/chat")
def chat(req: ChatRequest, request: Request):
    _user_id = get_current_user_id(request)
    prompt = (req.prompt or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt is required")

    # Intelligent Study Assistant response generator
    lower = prompt.lower()
    if "study plan" in lower or "schedule" in lower:
        reply = (
            "Here is an optimized study plan recommendation:\n\n"
            "1. **Pomodoro Technique**: 25 min focus + 5 min break.\n"
            "2. **Active Recall**: Test yourself with flashcards after each concept.\n"
            "3. **Spaced Repetition**: Review key formulas at 1, 3, and 7 day intervals.\n"
            "4. **Action item**: Add your target exam deadlines to your Reminders tab!"
        )
    elif "math" in lower or "calculus" in lower or "formula" in lower:
        reply = (
            f"Regarding '{prompt}':\n\n"
            "Remember that breaking the problem into sub-steps is key: identify given variables, state governing theorems, and solve sequentially. Would you like a step-by-step breakdown?"
        )
    elif "explain" in lower:
        reply = (
            f"Here is a clear breakdown for: '{prompt}':\n\n"
            "• **Core Idea**: Think of this concept in simple real-world terms.\n"
            "• **Key Mechanisms**: How the parts interact and influence the outcome.\n"
            "• **Exam Tip**: Highlight definitions and notable exceptions in your Notes tab!"
        )
    else:
        reply = (
            f"I'm here to assist with your studies! For '{prompt}':\n\n"
            "Keep focusing on active learning, summarizing concepts into your Notes, and tracking your deadlines in Reminders."
        )

    return {"reply": reply}


# Server-Sent Events Endpoint
@app.get("/api/stream")
async def sse_stream(request: Request):
    queue = asyncio.Queue()
    sse_subscribers.add(queue)

    async def event_generator():
        try:
            # Send initial keep-alive comment
            yield {"comment": "connected"}
            while True:
                # Disconnect if client closes connection
                if await request.is_disconnected():
                    break
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield data
                except asyncio.TimeoutError:
                    # Heartbeat
                    yield {"comment": "ping"}
        finally:
            sse_subscribers.discard(queue)

    return EventSourceResponse(event_generator())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="info")

