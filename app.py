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
        """)

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
            "SELECT id, username, is_admin, created_at, last_seen FROM users ORDER BY last_seen DESC"
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
# RUN
# ──────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    print(f"\n  StudyFlow backend avviato su porta {port}!\n")
    app.run(host="0.0.0.0", port=port, debug=False)
