"""
StudyFlow — Backend Flask + SQLite
Avvia con: python3 app.py
Poi apri: http://localhost:5002
"""

import os
import sqlite3
import csv
import io
import uuid
import hashlib
import json as json_lib
from datetime import datetime, timedelta, date
from flask import Flask, jsonify, request, send_from_directory, make_response, abort
from flask_cors import CORS

app = Flask(__name__, static_folder=".")
CORS(app, resources={r"/api/*": {"origins": "*"}})
DB = "studyflow.db"

# ──────────────────────────────────────────
# DATABASE
# ──────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    with get_db() as c:
        c.executescript("""
            CREATE TABLE IF NOT EXISTS sessions (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                date       TEXT NOT NULL,
                duration   INTEGER NOT NULL DEFAULT 25,
                subject    TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now','localtime'))
            );
            CREATE TABLE IF NOT EXISTS subjects (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                name     TEXT NOT NULL UNIQUE,
                color    TEXT DEFAULT '#29B6F6',
                goal_min INTEGER DEFAULT 60
            );
            CREATE TABLE IF NOT EXISTS users (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                username   TEXT NOT NULL UNIQUE COLLATE NOCASE,
                token      TEXT NOT NULL UNIQUE,
                is_admin   INTEGER DEFAULT 0,
                pin_hash   TEXT,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                last_seen  TEXT DEFAULT (datetime('now','localtime'))
            );
            CREATE TABLE IF NOT EXISTS user_data (
                user_id    INTEGER NOT NULL,
                key        TEXT NOT NULL,
                value      TEXT,
                updated_at TEXT DEFAULT (datetime('now','localtime')),
                PRIMARY KEY (user_id, key),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS presence (
                user_id    INTEGER PRIMARY KEY,
                updated_at TEXT DEFAULT (datetime('now','localtime')),
                page       TEXT DEFAULT 'timer',
                studying   INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS friendships (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                requester_id INTEGER NOT NULL,
                receiver_id  INTEGER NOT NULL,
                status       TEXT NOT NULL DEFAULT 'pending',
                created_at   TEXT DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (receiver_id)  REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE (requester_id, receiver_id)
            );
            CREATE TABLE IF NOT EXISTS support_tickets (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER,
                username   TEXT,
                message    TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                is_read    INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            );
        """)

def _sf_friends_list(c, user_id):
    row = c.execute("SELECT value FROM user_data WHERE user_id=? AND key='sf_friends'", (user_id,)).fetchone()
    if row and row["value"]:
        try: return json_lib.loads(row["value"])
        except: pass
    return []

def _sf_friends_add(c, user_id, friend_username):
    friends = _sf_friends_list(c, user_id)
    if friend_username not in friends:
        friends.append(friend_username)
    c.execute("""
        INSERT INTO user_data (user_id, key, value, updated_at) VALUES (?,?,?,datetime('now','localtime'))
        ON CONFLICT(user_id, key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
    """, (user_id, "sf_friends", json_lib.dumps(friends)))

def _sf_friends_remove(c, user_id, friend_username):
    friends = [f for f in _sf_friends_list(c, user_id) if f != friend_username]
    c.execute("""
        INSERT INTO user_data (user_id, key, value, updated_at) VALUES (?,?,?,datetime('now','localtime'))
        ON CONFLICT(user_id, key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
    """, (user_id, "sf_friends", json_lib.dumps(friends)))

def _add_coins_userdata(c, user_id, amount):
    row = c.execute("SELECT value FROM user_data WHERE user_id=? AND key='sf_coins'", (user_id,)).fetchone()
    cd = {}
    if row and row["value"]:
        try: cd = json_lib.loads(row["value"])
        except: pass
    cd["balance"]     = (cd.get("balance")     or 0) + amount
    cd["totalEarned"] = (cd.get("totalEarned") or 0) + amount
    c.execute("""
        INSERT INTO user_data (user_id, key, value, updated_at) VALUES (?,?,?,datetime('now','localtime'))
        ON CONFLICT(user_id, key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
    """, (user_id, "sf_coins", json_lib.dumps(cd)))

def _migrate_db():
    with get_db() as c:
        try:
            c.execute("ALTER TABLE users ADD COLUMN pin_hash TEXT")
            c.commit()
        except sqlite3.OperationalError:
            pass

init_db()
_migrate_db()

def _hash_pin(pin):
    return hashlib.sha256(pin.encode()).hexdigest()

def rows_list(rows):
    return [dict(r) for r in rows]

# ──────────────────────────────────────────
# AUTH HELPERS
# ──────────────────────────────────────────

def get_auth_user(required=False, admin=False):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        if required:
            abort(401)
        return None
    token = auth_header[7:].strip()
    with get_db() as c:
        user = c.execute("SELECT * FROM users WHERE token=?", (token,)).fetchone()
    if not user:
        if required:
            abort(401)
        return None
    if admin and not user["is_admin"]:
        abort(403)
    return user

@app.errorhandler(401)
def unauthorized(e):
    return jsonify({"error": "non autenticato"}), 401

@app.errorhandler(403)
def forbidden(e):
    return jsonify({"error": "accesso negato"}), 403

# ──────────────────────────────────────────
# STATIC FILES
# ──────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(".", "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(".", path)

# ──────────────────────────────────────────
# API: STATUS
# ──────────────────────────────────────────

@app.route("/api/status")
def status():
    return jsonify({"ok": True, "version": "2.0"})

# ──────────────────────────────────────────
# API: AUTH
# ──────────────────────────────────────────

@app.route("/api/auth/check", methods=["POST"])
def auth_check():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip().lower()
    if not username or len(username) < 2:
        return jsonify({"error": "Nome utente non valido"}), 400
    with get_db() as c:
        user = c.execute(
            "SELECT id, pin_hash FROM users WHERE username=?", (username,)
        ).fetchone()
    return jsonify({
        "exists":  bool(user),
        "has_pin": bool(user and user["pin_hash"]),
    })

@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data     = request.get_json(silent=True) or {}
    username = data.get("username", "").strip().lower()
    pin      = str(data.get("pin", "")).strip()

    if not username or len(username) < 2:
        return jsonify({"error": "Nome utente troppo corto (minimo 2 caratteri)"}), 400
    if len(username) > 30:
        return jsonify({"error": "Nome utente troppo lungo (massimo 30 caratteri)"}), 400
    if not pin or not pin.isdigit() or not (4 <= len(pin) <= 8):
        return jsonify({"error": "PIN non valido — usa 4–8 cifre"}), 400

    pin_hash = _hash_pin(pin)
    is_admin = 1 if username == "kiwi07" else 0

    with get_db() as c:
        user = c.execute(
            "SELECT * FROM users WHERE username=?", (username,)
        ).fetchone()

        if not user:
            token = str(uuid.uuid4())
            c.execute(
                "INSERT INTO users (username, token, is_admin, pin_hash) VALUES (?,?,?,?)",
                (username, token, is_admin, pin_hash)
            )
            c.commit()
            return jsonify({
                "ok": True, "token": token, "username": username,
                "is_admin": bool(is_admin), "new_user": True,
            }), 201

        if user["pin_hash"] and user["pin_hash"] != pin_hash:
            return jsonify({"error": "PIN errato — riprova"}), 401

        if not user["pin_hash"]:
            c.execute("UPDATE users SET pin_hash=? WHERE id=?", (pin_hash, user["id"]))

        c.execute(
            "UPDATE users SET is_admin=?, last_seen=datetime('now','localtime') WHERE id=?",
            (is_admin, user["id"])
        )
        c.commit()
        return jsonify({
            "ok": True, "token": user["token"], "username": user["username"],
            "is_admin": bool(is_admin), "new_user": False,
        })

@app.route("/api/auth/me")
def auth_me():
    user = get_auth_user(required=True)
    return jsonify({
        "id":       user["id"],
        "username": user["username"],
        "is_admin": bool(user["is_admin"]),
        "created_at": user["created_at"],
        "last_seen":  user["last_seen"],
    })

# ──────────────────────────────────────────
# API: USER DATA SYNC
# ──────────────────────────────────────────

@app.route("/api/user/data", methods=["GET"])
def user_get_data():
    user = get_auth_user(required=True)
    with get_db() as c:
        rows = c.execute(
            "SELECT key, value FROM user_data WHERE user_id=?", (user["id"],)
        ).fetchall()
    return jsonify({r["key"]: r["value"] for r in rows})

@app.route("/api/user/sync", methods=["POST"])
def user_sync_data():
    user = get_auth_user(required=True)
    data = request.get_json(silent=True) or {}
    with get_db() as c:
        for key, value in data.items():
            if isinstance(value, str):
                c.execute("""
                    INSERT INTO user_data (user_id, key, value, updated_at)
                    VALUES (?,?,?,datetime('now','localtime'))
                    ON CONFLICT(user_id, key)
                    DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
                """, (user["id"], key, value))
        c.execute(
            "UPDATE users SET last_seen=datetime('now','localtime') WHERE id=?",
            (user["id"],)
        )
        c.commit()
    return jsonify({"ok": True})

# ──────────────────────────────────────────
# API: ADMIN
# ──────────────────────────────────────────

@app.route("/api/admin/users", methods=["GET"])
def admin_list_users():
    get_auth_user(required=True, admin=True)
    with get_db() as c:
        users = c.execute(
            "SELECT id, username, is_admin, created_at, last_seen FROM users ORDER BY is_admin DESC, last_seen DESC"
        ).fetchall()
        result = []
        for u in users:
            coins = 0
            coins_row = c.execute(
                "SELECT value FROM user_data WHERE user_id=? AND key='sf_coins'", (u["id"],)
            ).fetchone()
            if coins_row and coins_row["value"]:
                try:
                    coins = json_lib.loads(coins_row["value"]).get("balance", 0)
                except Exception:
                    pass

            session_count = 0
            sess_row = c.execute(
                "SELECT value FROM user_data WHERE user_id=? AND key='sf_sessions'", (u["id"],)
            ).fetchone()
            if sess_row and sess_row["value"]:
                try:
                    session_count = len(json_lib.loads(sess_row["value"]))
                except Exception:
                    pass

            result.append({
                "id":         u["id"],
                "username":   u["username"],
                "is_admin":   bool(u["is_admin"]),
                "created_at": u["created_at"],
                "last_seen":  u["last_seen"],
                "coins":      coins,
                "session_count": session_count,
            })
    return jsonify(result)

@app.route("/api/admin/users/<int:uid>/coins", methods=["PUT"])
def admin_set_coins(uid):
    get_auth_user(required=True, admin=True)
    data = request.get_json(silent=True) or {}
    new_coins = int(data.get("coins", 0))
    if new_coins < 0:
        return jsonify({"error": "Le monete non possono essere negative"}), 400

    with get_db() as c:
        coins_row = c.execute(
            "SELECT value FROM user_data WHERE user_id=? AND key='sf_coins'", (uid,)
        ).fetchone()
        if coins_row and coins_row["value"]:
            try:
                coins_data = json_lib.loads(coins_row["value"])
                coins_data["balance"] = new_coins
            except Exception:
                coins_data = {"balance": new_coins, "shop": {}, "achievements": [], "activeEffects": {}}
        else:
            coins_data = {"balance": new_coins, "shop": {}, "achievements": [], "activeEffects": {}}

        c.execute("""
            INSERT INTO user_data (user_id, key, value, updated_at)
            VALUES (?,?,?,datetime('now','localtime'))
            ON CONFLICT(user_id, key)
            DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
        """, (uid, "sf_coins", json_lib.dumps(coins_data)))
        c.commit()
    return jsonify({"ok": True, "coins": new_coins})

@app.route("/api/admin/users/<int:uid>", methods=["DELETE"])
def admin_delete_user(uid):
    get_auth_user(required=True, admin=True)
    with get_db() as c:
        user = c.execute("SELECT username FROM users WHERE id=?", (uid,)).fetchone()
        if not user:
            return jsonify({"error": "Utente non trovato"}), 404
        if user["username"].lower() == "kiwi07":
            return jsonify({"error": "Non puoi eliminare l'admin"}), 403
        c.execute("DELETE FROM user_data WHERE user_id=?", (uid,))
        c.execute("DELETE FROM users WHERE id=?", (uid,))
        c.commit()
    return jsonify({"ok": True})

@app.route("/api/admin/users/<int:uid>/data", methods=["GET"])
def admin_get_user_data(uid):
    get_auth_user(required=True, admin=True)
    with get_db() as c:
        rows = c.execute(
            "SELECT key, value FROM user_data WHERE user_id=?", (uid,)
        ).fetchall()
    return jsonify({r["key"]: r["value"] for r in rows})

@app.route("/api/admin/users/<int:uid>/data", methods=["PUT"])
def admin_set_user_data(uid):
    get_auth_user(required=True, admin=True)
    data = request.get_json(silent=True) or {}
    key   = data.get("key")
    value = data.get("value")
    if not key:
        return jsonify({"error": "key richiesta"}), 400
    if not isinstance(value, str):
        value = json_lib.dumps(value)
    with get_db() as c:
        c.execute("""
            INSERT INTO user_data (user_id, key, value, updated_at)
            VALUES (?,?,?,datetime('now','localtime'))
            ON CONFLICT(user_id, key)
            DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
        """, (uid, key, value))
        c.commit()
    return jsonify({"ok": True})

@app.route("/api/admin/users/<int:uid>/reset", methods=["POST"])
def admin_reset_user(uid):
    get_auth_user(required=True, admin=True)
    with get_db() as c:
        user = c.execute("SELECT username FROM users WHERE id=?", (uid,)).fetchone()
        if not user:
            return jsonify({"error": "Utente non trovato"}), 404
        c.execute("DELETE FROM user_data WHERE user_id=?", (uid,))
        c.commit()
    return jsonify({"ok": True})

# ──────────────────────────────────────────
# API: AMICI
# ──────────────────────────────────────────

@app.route("/api/friends/search", methods=["GET"])
def friends_search():
    me = get_auth_user(required=True)
    q  = (request.args.get("q") or "").strip()
    if len(q) < 2:
        return jsonify([])
    with get_db() as c:
        rows = c.execute(
            "SELECT id, username FROM users WHERE username LIKE ? AND id != ? LIMIT 20",
            (f"%{q}%", me["id"])
        ).fetchall()
        # attach friendship status for each result
        result = []
        for r in rows:
            fs = c.execute(
                """SELECT status, requester_id FROM friendships
                   WHERE (requester_id=? AND receiver_id=?) OR (requester_id=? AND receiver_id=?)""",
                (me["id"], r["id"], r["id"], me["id"])
            ).fetchone()
            result.append({
                "id": r["id"],
                "username": r["username"],
                "friendship": dict(fs) if fs else None
            })
    return jsonify(result)

@app.route("/api/friends", methods=["GET"])
def friends_list():
    me = get_auth_user(required=True)
    with get_db() as c:
        rows = c.execute(
            """SELECT u.id, u.username, u.last_seen,
                      p.studying, p.page, p.updated_at as presence_at,
                      f.id as friendship_id
               FROM friendships f
               JOIN users u ON (
                   CASE WHEN f.requester_id = ? THEN f.receiver_id ELSE f.requester_id END = u.id
               )
               LEFT JOIN presence p ON p.user_id = u.id
               WHERE (f.requester_id=? OR f.receiver_id=?) AND f.status='accepted'""",
            (me["id"], me["id"], me["id"])
        ).fetchall()

        seen = {r["username"] for r in rows}
        extra = []
        for uname in _sf_friends_list(c, me["id"]):
            if uname not in seen:
                u = c.execute(
                    """SELECT u.id, u.username, u.last_seen,
                              p.studying, p.page, p.updated_at as presence_at
                       FROM users u LEFT JOIN presence p ON p.user_id=u.id
                       WHERE u.username=? COLLATE NOCASE""", (uname,)
                ).fetchone()
                if u:
                    extra.append({**dict(u), "friendship_id": None})
                    seen.add(uname)

    now = datetime.now()
    result = []
    for r in [*rows, *extra]:
        online = False
        presence_at = r["presence_at"] if isinstance(r, dict) else r["presence_at"]
        last_seen   = r["last_seen"]   if isinstance(r, dict) else r["last_seen"]
        if presence_at:
            try:
                pu = datetime.strptime(presence_at, "%Y-%m-%d %H:%M:%S")
                online = (now - pu).total_seconds() < 180
            except Exception: pass
        if not online and last_seen:
            try:
                ls = datetime.strptime(last_seen, "%Y-%m-%d %H:%M:%S")
                online = (now - ls).total_seconds() < 300
            except Exception: pass
        fid = r["friendship_id"] if isinstance(r, dict) else r["friendship_id"]
        result.append({
            "id":            r["id"],
            "username":      r["username"],
            "online":        online,
            "studying":      bool(r["studying"]),
            "page":          r["page"],
            "friendship_id": fid
        })
    result.sort(key=lambda x: (not x["online"], x["username"].lower()))
    return jsonify(result)

@app.route("/api/friends/requests", methods=["GET"])
def friends_requests():
    me = get_auth_user(required=True)
    with get_db() as c:
        received = c.execute(
            """SELECT f.id, u.username, f.created_at
               FROM friendships f
               JOIN users u ON u.id = f.requester_id
               WHERE f.receiver_id=? AND f.status='pending'
               ORDER BY f.created_at DESC""",
            (me["id"],)
        ).fetchall()
        sent = c.execute(
            """SELECT f.id, u.username, f.created_at
               FROM friendships f
               JOIN users u ON u.id = f.receiver_id
               WHERE f.requester_id=? AND f.status='pending'
               ORDER BY f.created_at DESC""",
            (me["id"],)
        ).fetchall()
    return jsonify({
        "received": rows_list(received),
        "sent":     rows_list(sent)
    })

@app.route("/api/friends/request", methods=["POST"])
def friends_send_request():
    me   = get_auth_user(required=True)
    data = request.get_json(silent=True) or {}
    target_username = (data.get("username") or "").strip()
    if not target_username:
        return jsonify({"error": "username richiesto"}), 400
    with get_db() as c:
        target = c.execute(
            "SELECT id FROM users WHERE username=? COLLATE NOCASE", (target_username,)
        ).fetchone()
        if not target:
            return jsonify({"error": "Utente non trovato"}), 404
        if target["id"] == me["id"]:
            return jsonify({"error": "Non puoi aggiungere te stesso"}), 400
        existing = c.execute(
            """SELECT id, status FROM friendships
               WHERE (requester_id=? AND receiver_id=?) OR (requester_id=? AND receiver_id=?)""",
            (me["id"], target["id"], target["id"], me["id"])
        ).fetchone()
        if existing:
            if existing["status"] == "accepted":
                return jsonify({"error": "Siete già amici"}), 400
            if existing["status"] == "pending":
                return jsonify({"error": "Richiesta già inviata"}), 400
        c.execute(
            "INSERT INTO friendships (requester_id, receiver_id) VALUES (?,?)",
            (me["id"], target["id"])
        )
        c.commit()
    return jsonify({"ok": True})

@app.route("/api/friends/<int:fid>/accept", methods=["POST"])
def friends_accept(fid):
    me = get_auth_user(required=True)
    with get_db() as c:
        f = c.execute(
            "SELECT * FROM friendships WHERE id=? AND receiver_id=? AND status='pending'",
            (fid, me["id"])
        ).fetchone()
        if not f:
            return jsonify({"error": "Richiesta non trovata"}), 404
        requester = c.execute("SELECT username FROM users WHERE id=?", (f["requester_id"],)).fetchone()
        c.execute("UPDATE friendships SET status='accepted' WHERE id=?", (fid,))
        # Persiste in user_data: sopravvive ai restart del DB
        _sf_friends_add(c, me["id"], requester["username"] if requester else "")
        _sf_friends_add(c, f["requester_id"], me["username"])
        # 25 monete a entrambi
        _add_coins_userdata(c, me["id"], 25)
        _add_coins_userdata(c, f["requester_id"], 25)
        c.commit()
    return jsonify({"ok": True, "coins": 25})

@app.route("/api/friends/<int:fid>/reject", methods=["POST"])
def friends_reject(fid):
    me = get_auth_user(required=True)
    with get_db() as c:
        f = c.execute(
            "SELECT * FROM friendships WHERE id=? AND receiver_id=? AND status='pending'",
            (fid, me["id"])
        ).fetchone()
        if not f:
            return jsonify({"error": "Richiesta non trovata"}), 404
        c.execute("DELETE FROM friendships WHERE id=?", (fid,))
        c.commit()
    return jsonify({"ok": True})

@app.route("/api/friends/<int:fid>", methods=["DELETE"])
def friends_remove(fid):
    me = get_auth_user(required=True)
    with get_db() as c:
        f = c.execute(
            "SELECT * FROM friendships WHERE id=? AND (requester_id=? OR receiver_id=?)",
            (fid, me["id"], me["id"])
        ).fetchone()
        if f:
            other_id = f["receiver_id"] if f["requester_id"] == me["id"] else f["requester_id"]
            other = c.execute("SELECT username FROM users WHERE id=?", (other_id,)).fetchone()
            c.execute("DELETE FROM friendships WHERE id=?", (fid,))
            if other:
                _sf_friends_remove(c, me["id"], other["username"])
                _sf_friends_remove(c, other_id, me["username"])
        else:
            return jsonify({"error": "Amicizia non trovata"}), 404
        c.commit()
    return jsonify({"ok": True})

@app.route("/api/friends/remove/<friend_username>", methods=["DELETE"])
def friends_remove_by_username(friend_username):
    """Rimozione per username — fallback quando il DB è stato resettato."""
    me = get_auth_user(required=True)
    with get_db() as c:
        other = c.execute(
            "SELECT id FROM users WHERE username=? COLLATE NOCASE", (friend_username,)
        ).fetchone()
        if other:
            c.execute("""DELETE FROM friendships WHERE
                (requester_id=? AND receiver_id=?) OR (requester_id=? AND receiver_id=?)""",
                (me["id"], other["id"], other["id"], me["id"]))
            _sf_friends_remove(c, other["id"], me["username"])
        _sf_friends_remove(c, me["id"], friend_username)
        c.commit()
    return jsonify({"ok": True})

# ──────────────────────────────────────────
# API: HELP / SEGNALAZIONI
# ──────────────────────────────────────────

@app.route("/api/help", methods=["POST"])
def help_submit():
    me   = get_auth_user(required=True)
    data = request.get_json(silent=True) or {}
    msg  = (data.get("message") or "").strip()
    if not msg or len(msg) < 5:
        return jsonify({"error": "Messaggio troppo corto"}), 400
    if len(msg) > 2000:
        return jsonify({"error": "Messaggio troppo lungo"}), 400
    with get_db() as c:
        c.execute(
            "INSERT INTO support_tickets (user_id, username, message) VALUES (?,?,?)",
            (me["id"], me["username"], msg)
        )
        c.commit()
    return jsonify({"ok": True})

@app.route("/api/admin/tickets", methods=["GET"])
def admin_tickets():
    get_auth_user(required=True, admin=True)
    with get_db() as c:
        rows = c.execute(
            "SELECT * FROM support_tickets ORDER BY is_read ASC, created_at DESC"
        ).fetchall()
    return jsonify(rows_list(rows))

@app.route("/api/admin/tickets/<int:tid>/read", methods=["POST"])
def admin_ticket_read(tid):
    get_auth_user(required=True, admin=True)
    with get_db() as c:
        c.execute("UPDATE support_tickets SET is_read=1 WHERE id=?", (tid,))
        c.commit()
    return jsonify({"ok": True})

@app.route("/api/admin/tickets/<int:tid>", methods=["DELETE"])
def admin_ticket_delete(tid):
    get_auth_user(required=True, admin=True)
    with get_db() as c:
        c.execute("DELETE FROM support_tickets WHERE id=?", (tid,))
        c.commit()
    return jsonify({"ok": True})

# ──────────────────────────────────────────
# API: SESSIONI POMODORO
# ──────────────────────────────────────────

@app.route("/api/sessions", methods=["GET"])
def get_sessions():
    days = request.args.get("days", 30, type=int)
    since = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    with get_db() as c:
        rows = c.execute(
            "SELECT * FROM sessions WHERE date >= ? ORDER BY created_at DESC",
            (since,)
        ).fetchall()
    return jsonify(rows_list(rows))

@app.route("/api/sessions", methods=["POST"])
def add_session():
    data = request.get_json(silent=True) or {}
    duration = data.get("duration")
    if not duration:
        return jsonify({"error": "duration required"}), 400
    with get_db() as c:
        cur = c.execute(
            "INSERT INTO sessions (date, duration, subject) VALUES (?,?,?)",
            (
                data.get("date", date.today().isoformat()),
                int(duration),
                data.get("subject", ""),
            )
        )
        c.commit()
    return jsonify({"id": cur.lastrowid, "ok": True}), 201

# ──────────────────────────────────────────
# API: STATISTICHE
# ──────────────────────────────────────────

@app.route("/api/stats/overview")
def stats_overview():
    with get_db() as c:
        total_sessions = c.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
        total_minutes  = c.execute("SELECT COALESCE(SUM(duration),0) FROM sessions").fetchone()[0]

        today = date.today().isoformat()
        today_sessions = c.execute(
            "SELECT COUNT(*) FROM sessions WHERE date=?", (today,)
        ).fetchone()[0]
        today_minutes = c.execute(
            "SELECT COALESCE(SUM(duration),0) FROM sessions WHERE date=?", (today,)
        ).fetchone()[0]

        streak = 0
        check = date.today()
        for _ in range(365):
            count = c.execute(
                "SELECT COUNT(*) FROM sessions WHERE date=?",
                (check.isoformat(),)
            ).fetchone()[0]
            if count == 0:
                break
            streak += 1
            check -= timedelta(days=1)

    return jsonify({
        "total_sessions": total_sessions,
        "total_minutes":  total_minutes,
        "total_hours":    round(total_minutes / 60, 1),
        "today_sessions": today_sessions,
        "today_minutes":  today_minutes,
        "streak":         streak,
        "avg_per_day":    round(total_minutes / max(total_sessions, 1), 0),
    })

@app.route("/api/stats/history")
def stats_history():
    days = request.args.get("days", 14, type=int)
    result = []
    with get_db() as c:
        for i in range(days - 1, -1, -1):
            d = (date.today() - timedelta(days=i)).isoformat()
            row = c.execute(
                "SELECT COALESCE(SUM(duration),0) as minutes, COUNT(*) as sessions FROM sessions WHERE date=?",
                (d,)
            ).fetchone()
            result.append({
                "date":     d,
                "minutes":  row["minutes"],
                "sessions": row["sessions"],
                "label":    (date.today() - timedelta(days=i)).strftime("%d/%m"),
            })
    return jsonify(result)

@app.route("/api/stats/subjects")
def stats_subjects():
    with get_db() as c:
        rows = c.execute("""
            SELECT subject, SUM(duration) as minutes, COUNT(*) as sessions
            FROM sessions
            WHERE subject != ''
            GROUP BY subject
            ORDER BY minutes DESC
            LIMIT 10
        """).fetchall()
    return jsonify(rows_list(rows))

# ──────────────────────────────────────────
# API: MATERIE
# ──────────────────────────────────────────

@app.route("/api/subjects", methods=["GET"])
def get_subjects():
    with get_db() as c:
        rows = c.execute("SELECT * FROM subjects ORDER BY name").fetchall()
    return jsonify(rows_list(rows))

@app.route("/api/subjects", methods=["POST"])
def add_subject():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    with get_db() as c:
        try:
            cur = c.execute(
                "INSERT INTO subjects (name, color, goal_min) VALUES (?,?,?)",
                (name, data.get("color", "#29B6F6"), data.get("goal_min", 60))
            )
            c.commit()
            return jsonify({"id": cur.lastrowid, "ok": True}), 201
        except sqlite3.IntegrityError:
            return jsonify({"error": "materia gia' esistente"}), 409

@app.route("/api/subjects/<int:sid>", methods=["DELETE"])
def delete_subject(sid):
    with get_db() as c:
        c.execute("DELETE FROM subjects WHERE id=?", (sid,))
        c.commit()
    return jsonify({"ok": True})

# ──────────────────────────────────────────
# API: EXPORT CSV
# ──────────────────────────────────────────

@app.route("/api/export/csv")
def export_csv():
    with get_db() as c:
        rows = c.execute(
            "SELECT date, duration, subject, created_at FROM sessions ORDER BY created_at DESC"
        ).fetchall()

    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["Data", "Durata (min)", "Materia", "Registrato il"])
    for r in rows:
        w.writerow([r["date"], r["duration"], r["subject"], r["created_at"]])

    resp = make_response(out.getvalue())
    resp.headers["Content-Type"]        = "text/csv; charset=utf-8"
    resp.headers["Content-Disposition"] = "attachment; filename=studyflow_sessioni.csv"
    return resp

# ──────────────────────────────────────────
# API: PRESENZA SOCIALE
# ──────────────────────────────────────────

@app.route("/api/presence/ping", methods=["POST"])
def presence_ping():
    user = get_auth_user(required=True)
    data = request.get_json(silent=True) or {}
    page     = str(data.get("page", "timer"))[:20]
    studying = 1 if data.get("studying") else 0
    with get_db() as c:
        c.execute("""
            INSERT INTO presence (user_id, updated_at, page, studying)
            VALUES (?, datetime('now','localtime'), ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              updated_at=excluded.updated_at,
              page=excluded.page,
              studying=excluded.studying
        """, (user["id"], page, studying))
        c.commit()
    return jsonify({"ok": True})

@app.route("/api/presence/online", methods=["GET"])
def presence_online():
    get_auth_user(required=True)
    with get_db() as c:
        rows = c.execute("""
            SELECT u.username, p.page, p.studying, p.updated_at
            FROM presence p
            JOIN users u ON u.id = p.user_id
            WHERE p.updated_at >= datetime('now','localtime','-5 minutes')
              AND u.username != 'kiwi07'
            ORDER BY p.studying DESC, p.updated_at DESC
        """).fetchall()
    return jsonify([dict(r) for r in rows])

# ──────────────────────────────────────────
# RUN
# ──────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    print(f"\n  StudyFlow backend avviato su porta {port}!\n")
    app.run(host="0.0.0.0", port=port, debug=False)
