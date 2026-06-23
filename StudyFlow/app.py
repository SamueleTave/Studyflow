"""
StudyFlow — Backend Flask
SQLite in locale, PostgreSQL su Render (via DATABASE_URL).
Avvia con: python3 app.py
"""

import os
import re
import sqlite3
import csv
import io
import uuid
import hashlib
import json as json_lib
from datetime import datetime, timedelta, date, timezone
from flask import Flask, jsonify, request, send_from_directory, make_response, abort
from flask_cors import CORS

app = Flask(__name__, static_folder=".")
CORS(app, resources={r"/api/*": {"origins": "*"}})
DB = "studyflow.db"

# ──────────────────────────────────────────
# DATABASE — SQLite locale / PostgreSQL Render
# ──────────────────────────────────────────

DATABASE_URL = os.environ.get('DATABASE_URL', '')
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
USE_PG = bool(DATABASE_URL)

if USE_PG:
    import psycopg2
    import psycopg2.extras
    _IntegrityError = psycopg2.IntegrityError
else:
    _IntegrityError = sqlite3.IntegrityError


def _now():
    return datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')


def _parse_dt(v):
    """Normalizza stringa o oggetto datetime in datetime senza timezone."""
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.replace(tzinfo=None)
    s = str(v)[:19]
    try:
        return datetime.strptime(s, '%Y-%m-%d %H:%M:%S')
    except Exception:
        return None


class _Conn:
    """Context manager unificato: sqlite3 in locale, psycopg2 su Render."""

    def __init__(self):
        if USE_PG:
            self._conn = psycopg2.connect(DATABASE_URL)
            self._cur  = self._conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        else:
            self._conn = sqlite3.connect(DB)
            self._conn.row_factory = sqlite3.Row
            self._conn.execute('PRAGMA foreign_keys = ON')
            self._cur = None

    def execute(self, sql, params=()):
        if self._cur is None:
            return self._conn.execute(sql, params)
        # Rimuovi sintassi SQLite-only
        sql = sql.replace('COLLATE NOCASE', '')
        # Processa ? e datetime(...) da sinistra a destra per mantenere l'ordine dei parametri
        params_list = list(params)
        new_params  = []
        param_idx   = 0
        _TOK = re.compile(r"datetime\('now','localtime'(?:,'[^']*')?\)|\?")
        def _sub(m):
            nonlocal param_idx
            t = m.group(0)
            if t == '?':
                new_params.append(params_list[param_idx] if param_idx < len(params_list) else None)
                param_idx += 1
            else:
                off = re.search(r",'([^']+)'\)$", t)
                if off:
                    try:
                        p = off.group(1).strip().split()
                        kw  = {'minute':'minutes','hour':'hours','day':'days'}.get(p[1].rstrip('s'),'minutes')
                        base = datetime.now(timezone.utc)
                        new_params.append((base + timedelta(**{kw: int(p[0])})).strftime('%Y-%m-%d %H:%M:%S'))
                    except Exception:
                        new_params.append(_now())
                else:
                    new_params.append(_now())
            return '%s'
        self._cur.execute(_TOK.sub(_sub, sql), new_params)
        return self._cur

    def executescript(self, script):
        if self._cur is None:
            self._conn.executescript(script)
            return
        script = (script
            .replace('INTEGER PRIMARY KEY AUTOINCREMENT', 'SERIAL PRIMARY KEY')
            .replace('COLLATE NOCASE', '')
            .replace("DEFAULT (datetime('now','localtime'))",
                     "DEFAULT to_char(NOW(),'YYYY-MM-DD HH24:MI:SS')")
            .replace("datetime('now','localtime')",
                     "to_char(NOW(),'YYYY-MM-DD HH24:MI:SS')"))
        self._conn.autocommit = True
        for stmt in script.split(';'):
            s = stmt.strip()
            if s:
                try:
                    self._cur.execute(s)
                except Exception:
                    pass  # IF NOT EXISTS gestisce la maggior parte dei casi
        self._conn.autocommit = False

    def commit(self):
        self._conn.commit()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, *_):
        if self._cur is not None:
            if exc_type:
                self._conn.rollback()
            else:
                self._conn.commit()
            self._cur.close()
        self._conn.close()


def get_db():
    return _Conn()

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
            CREATE TABLE IF NOT EXISTS notifications (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER NOT NULL,
                type       TEXT DEFAULT 'info',
                message    TEXT NOT NULL,
                emoji      TEXT DEFAULT '🔔',
                created_at TEXT DEFAULT (datetime('now','localtime')),
                is_read    INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS announcements (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                message    TEXT NOT NULL,
                emoji      TEXT DEFAULT '📢',
                created_at TEXT DEFAULT (datetime('now','localtime'))
            );
            CREATE TABLE IF NOT EXISTS app_config (
                key   TEXT PRIMARY KEY,
                value TEXT
            );
            CREATE TABLE IF NOT EXISTS challenges (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                creator_id  INTEGER NOT NULL,
                title       TEXT NOT NULL,
                target_min  INTEGER NOT NULL DEFAULT 60,
                ends_at     TEXT NOT NULL,
                created_at  TEXT DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS challenge_members (
                challenge_id INTEGER NOT NULL,
                user_id      INTEGER NOT NULL,
                minutes_done INTEGER DEFAULT 0,
                completed    INTEGER DEFAULT 0,
                joined_at    TEXT DEFAULT (datetime('now','localtime')),
                PRIMARY KEY (challenge_id, user_id),
                FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS invite_relations (
                invitee_id  INTEGER PRIMARY KEY,
                inviter_id  INTEGER NOT NULL,
                bonus_given INTEGER DEFAULT 0,
                created_at  TEXT DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE
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
    if USE_PG:
        try:
            conn = psycopg2.connect(DATABASE_URL)
            conn.autocommit = True
            cur = conn.cursor()
            _PG_DDL = [
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash TEXT",
                "CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value TEXT)",
                """CREATE TABLE IF NOT EXISTS announcements (
                    id SERIAL PRIMARY KEY, message TEXT NOT NULL,
                    emoji TEXT DEFAULT '📢',
                    created_at TEXT DEFAULT to_char(NOW(),'YYYY-MM-DD HH24:MI:SS'))""",
                """CREATE TABLE IF NOT EXISTS notifications (
                    id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL,
                    type TEXT DEFAULT 'info', message TEXT NOT NULL,
                    emoji TEXT DEFAULT '🔔',
                    created_at TEXT DEFAULT to_char(NOW(),'YYYY-MM-DD HH24:MI:SS'),
                    is_read INTEGER DEFAULT 0,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)""",
                """CREATE TABLE IF NOT EXISTS challenges (
                    id SERIAL PRIMARY KEY, creator_id INTEGER NOT NULL,
                    title TEXT NOT NULL, target_min INTEGER NOT NULL DEFAULT 60,
                    ends_at TEXT NOT NULL,
                    created_at TEXT DEFAULT to_char(NOW(),'YYYY-MM-DD HH24:MI:SS'),
                    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE)""",
                """CREATE TABLE IF NOT EXISTS challenge_members (
                    challenge_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
                    minutes_done INTEGER DEFAULT 0, completed INTEGER DEFAULT 0,
                    joined_at TEXT DEFAULT to_char(NOW(),'YYYY-MM-DD HH24:MI:SS'),
                    PRIMARY KEY (challenge_id, user_id),
                    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)""",
                """CREATE TABLE IF NOT EXISTS support_tickets (
                    id SERIAL PRIMARY KEY, user_id INTEGER,
                    username TEXT, message TEXT NOT NULL,
                    created_at TEXT DEFAULT to_char(NOW(),'YYYY-MM-DD HH24:MI:SS'),
                    is_read INTEGER DEFAULT 0,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL)""",
                """CREATE TABLE IF NOT EXISTS invite_relations (
                    invitee_id INTEGER PRIMARY KEY,
                    inviter_id INTEGER NOT NULL,
                    bonus_given INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT to_char(NOW(),'YYYY-MM-DD HH24:MI:SS'))""",
            ]
            for ddl in _PG_DDL:
                try:
                    cur.execute(ddl)
                except Exception:
                    pass
            cur.close()
            conn.close()
        except Exception:
            pass
    else:
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

@app.route("/<path:path>", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
def static_files(path):
    if path.startswith("api/") or path == "api":
        abort(404)
    return send_from_directory(".", path)

# ──────────────────────────────────────────
# API: STATUS
# ──────────────────────────────────────────

@app.route("/api/status")
def status():
    return jsonify({"ok": True, "version": "2.0", "db": "postgresql" if USE_PG else "sqlite"})

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
        result = {r["key"]: r["value"] for r in rows}
        # Consuma il flag dirty dopo averlo restituito (una sola rilettura forzata)
        if result.get("sf_admin_flag") == "dirty":
            c.execute(
                "DELETE FROM user_data WHERE user_id=? AND key='sf_admin_flag'",
                (user["id"],)
            )
            c.commit()
    return jsonify(result)

@app.route("/api/user/sync", methods=["POST"])
def user_sync_data():
    user = get_auth_user(required=True)
    data = request.get_json(silent=True) or {}
    # sf_friends è gestita esclusivamente dagli endpoint /api/friends/*
    _SERVER_MANAGED = {'sf_friends'}
    corrections = {}   # chiavi da rimandare al client con i valori corretti
    with get_db() as c:
        for key, value in data.items():
            if not isinstance(value, str) or key in _SERVER_MANAGED:
                continue
            # Protezione sf_coins: se l'admin ha impostato un _adminTs che il client
            # non conosce ancora, protegge balance e shop e propaga il timestamp.
            if key == 'sf_coins':
                try:
                    client_c = json_lib.loads(value)
                    srv_row = c.execute(
                        "SELECT value FROM user_data WHERE user_id=? AND key='sf_coins'",
                        (user["id"],)
                    ).fetchone()
                    if srv_row and srv_row["value"]:
                        server_c = json_lib.loads(srv_row["value"])
                        srv_ts = server_c.get('_adminTs', '')
                        cli_ts = client_c.get('_adminTs', '')
                        if srv_ts and srv_ts != cli_ts:
                            # Admin ha aggiornato i dati: protegge balance e shop,
                            # inietta il timestamp e rimanda la correzione al client.
                            client_c['balance'] = server_c['balance']
                            client_c['shop']    = server_c.get('shop', client_c.get('shop', {}))
                            client_c['_adminTs'] = srv_ts
                            value = json_lib.dumps(client_c)
                            corrections['sf_coins'] = value
                except Exception:
                    pass
            # Protezione sf_stats: stessa logica _adminTs per streak e minuti oggi.
            # Quando admin aggiorna streak/minuti, il client potrebbe sovrascrivere
            # con valori vecchi prima di ricevere la correzione.
            if key == 'sf_stats':
                try:
                    client_s = json_lib.loads(value)
                    srv_row = c.execute(
                        "SELECT value FROM user_data WHERE user_id=? AND key='sf_stats'",
                        (user["id"],)
                    ).fetchone()
                    if srv_row and srv_row["value"]:
                        server_s = json_lib.loads(srv_row["value"])
                        srv_ts = server_s.get('_adminTs', '')
                        cli_ts = client_s.get('_adminTs', '')
                        if srv_ts and srv_ts != cli_ts:
                            # Admin ha modificato stats: protegge streak e minuti oggi.
                            def _imax(a, b):
                                try: return max(int(a or 0), int(b or 0))
                                except: return int(b or 0)
                            client_s['streak'] = _imax(server_s.get('streak'), client_s.get('streak'))
                            # Proteggi minuti/sessioni solo se stesso giorno
                            if server_s.get('date') and server_s.get('date') == client_s.get('date'):
                                client_s['minutes']  = _imax(server_s.get('minutes'),  client_s.get('minutes'))
                                client_s['sessions'] = _imax(server_s.get('sessions'), client_s.get('sessions'))
                            client_s['_adminTs'] = srv_ts
                            value = json_lib.dumps(client_s)
                            corrections['sf_stats'] = value
                except Exception:
                    pass
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
    return jsonify({"ok": True, "corrections": corrections})

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

            role_row = c.execute(
                "SELECT value FROM user_data WHERE user_id=? AND key='sf_role_override'", (u["id"],)
            ).fetchone()
            role_override = (role_row["value"] if role_row and role_row["value"] else "auto")

            result.append({
                "id":           u["id"],
                "username":     u["username"],
                "is_admin":     bool(u["is_admin"]),
                "created_at":   u["created_at"],
                "last_seen":    u["last_seen"],
                "coins":        coins,
                "session_count": session_count,
                "role_override": role_override,
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
        # Imposta _adminTs così il sync client non sovrascrive il balance impostato dall'admin
        coins_data["_adminTs"] = _now()

        c.execute("""
            INSERT INTO user_data (user_id, key, value, updated_at)
            VALUES (?,?,?,datetime('now','localtime'))
            ON CONFLICT(user_id, key)
            DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
        """, (uid, "sf_coins", json_lib.dumps(coins_data)))
        c.commit()
    return jsonify({"ok": True, "coins": new_coins})

@app.route("/api/admin/users/<int:uid>/reset-pin", methods=["POST"])
def admin_reset_pin(uid):
    get_auth_user(required=True, admin=True)
    with get_db() as c:
        user = c.execute("SELECT username FROM users WHERE id=?", (uid,)).fetchone()
        if not user:
            return jsonify({"error": "Utente non trovato"}), 404
        if user["username"].lower() == "kiwi07":
            return jsonify({"error": "Non puoi resettare il PIN dell'admin"}), 403
        c.execute("UPDATE users SET pin_hash=NULL WHERE id=?", (uid,))
        c.commit()
    return jsonify({"ok": True})

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

@app.route("/api/admin/users/create", methods=["POST"])
def admin_create_user():
    """Crea un utente (usato per restore se l'account è stato cancellato)."""
    get_auth_user(required=True, admin=True)
    data     = request.get_json(force=True) or {}
    username = (data.get("username") or "").strip().lower()
    pin      = str(data.get("pin") or "").strip()
    if not username or len(username) < 2:
        return jsonify({"error": "username non valido"}), 400
    if not pin or not pin.isdigit() or not (4 <= len(pin) <= 8):
        return jsonify({"error": "PIN non valido (4-8 cifre)"}), 400
    pin_hash = _hash_pin(pin)
    with get_db() as c:
        existing = c.execute("SELECT id FROM users WHERE username=?", (username,)).fetchone()
        if existing:
            return jsonify({"ok": True, "id": existing["id"], "created": False})
        token = str(uuid.uuid4())
        c.execute(
            "INSERT INTO users (username, token, is_admin, pin_hash) VALUES (?,?,0,?)",
            (username, token, pin_hash)
        )
        c.commit()
        new_user = c.execute("SELECT id FROM users WHERE username=?", (username,)).fetchone()
    return jsonify({"ok": True, "id": new_user["id"], "created": True}), 201

@app.route("/api/admin/friendship", methods=["POST"])
def admin_create_friendship():
    """Forza una friendship accepted tra due utenti (usato per restore)."""
    get_auth_user(required=True, admin=True)
    data = request.get_json(force=True) or {}
    ua = (data.get("user_a") or "").strip().lower()
    ub = (data.get("user_b") or "").strip().lower()
    if not ua or not ub:
        return jsonify({"error": "user_a e user_b richiesti"}), 400
    with get_db() as c:
        row_a = c.execute("SELECT id FROM users WHERE username=?", (ua,)).fetchone()
        row_b = c.execute("SELECT id FROM users WHERE username=?", (ub,)).fetchone()
        if not row_a or not row_b:
            return jsonify({"error": "utente non trovato"}), 404
        aid, bid = row_a["id"], row_b["id"]
        c.execute("""
            DELETE FROM friendships WHERE
            (requester_id=? AND receiver_id=?) OR (requester_id=? AND receiver_id=?)
        """, (aid, bid, bid, aid))
        c.execute(
            "INSERT INTO friendships (requester_id, receiver_id, status) VALUES (?,?,'accepted')",
            (aid, bid)
        )
        _sf_friends_add(c, aid, ub)
        _sf_friends_add(c, bid, ua)
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
    # Quando admin imposta sf_coins o sf_stats aggiunge _adminTs: il sync del client
    # non sovrascriverà i valori finché il client non scarica la versione aggiornata.
    if key in ('sf_coins', 'sf_stats'):
        try:
            obj = json_lib.loads(value)
            obj['_adminTs'] = _now()
            value = json_lib.dumps(obj)
        except Exception:
            pass
    with get_db() as c:
        c.execute("""
            INSERT INTO user_data (user_id, key, value, updated_at)
            VALUES (?,?,?,datetime('now','localtime'))
            ON CONFLICT(user_id, key)
            DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
        """, (uid, key, value))
        # Segnala al client che l'admin ha modificato i dati → forza reload completo
        c.execute("""
            INSERT INTO user_data (user_id, key, value, updated_at)
            VALUES (?,?,?,datetime('now','localtime'))
            ON CONFLICT(user_id, key)
            DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
        """, (uid, "sf_admin_flag", "dirty"))
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
    # Escape caratteri speciali LIKE per evitare enumeration con "%" o "_"
    q_safe = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    with get_db() as c:
        rows = c.execute(
            "SELECT id, username FROM users WHERE username LIKE ? ESCAPE '\\' AND id != ? LIMIT 20",
            (f"%{q_safe}%", me["id"])
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
            pu = _parse_dt(presence_at)
            if pu: online = (now - pu).total_seconds() < 180
        if not online and last_seen:
            ls = _parse_dt(last_seen)
            if ls: online = (now - ls).total_seconds() < 300
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
    get_auth_user(required=True)
    data = request.get_json(silent=True) or {}
    duration = data.get("duration")
    if not duration:
        return jsonify({"error": "duration required"}), 400
    params = (
        data.get("date", date.today().isoformat()),
        int(duration),
        data.get("subject", ""),
    )
    with get_db() as c:
        if USE_PG:
            cur    = c.execute("INSERT INTO sessions (date, duration, subject) VALUES (?,?,?) RETURNING id", params)
            new_id = cur.fetchone()[0]
        else:
            cur    = c.execute("INSERT INTO sessions (date, duration, subject) VALUES (?,?,?)", params)
            new_id = cur.lastrowid
        c.commit()
    return jsonify({"id": new_id, "ok": True}), 201

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
    params = (name, data.get("color", "#29B6F6"), data.get("goal_min", 60))
    with get_db() as c:
        try:
            if USE_PG:
                cur    = c.execute("INSERT INTO subjects (name, color, goal_min) VALUES (?,?,?) RETURNING id", params)
                new_id = cur.fetchone()[0]
            else:
                cur    = c.execute("INSERT INTO subjects (name, color, goal_min) VALUES (?,?,?)", params)
                new_id = cur.lastrowid
            c.commit()
            return jsonify({"id": new_id, "ok": True}), 201
        except _IntegrityError:
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
    get_auth_user(required=True)
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
# API: BONUS INVITO
# ──────────────────────────────────────────

@app.route("/api/friends/invite-bonus", methods=["POST"])
def friends_invite_bonus():
    """Chiamato una sola volta quando un nuovo utente si registra via link ?ref=USERNAME.
    Registra la relazione di invito — le monete vengono date solo dopo 5 sessioni."""
    me   = get_auth_user(required=True)
    data = request.get_json(silent=True) or {}
    ref_username = (data.get("ref") or "").strip()
    if not ref_username:
        return jsonify({"error": "ref richiesto"}), 400
    with get_db() as c:
        already = c.execute(
            "SELECT invitee_id FROM invite_relations WHERE invitee_id=?", (me["id"],)
        ).fetchone()
        if already:
            return jsonify({"error": "invito già registrato"}), 400
        inviter = c.execute(
            "SELECT id FROM users WHERE username=? COLLATE NOCASE AND id!=?",
            (ref_username, me["id"])
        ).fetchone()
        if not inviter:
            return jsonify({"error": "invitante non trovato"}), 404
        c.execute("""
            INSERT INTO invite_relations (invitee_id, inviter_id, bonus_given)
            VALUES (?, ?, 0)
        """, (me["id"], inviter["id"]))
        c.commit()
    return jsonify({"ok": True, "pending": True})

@app.route("/api/friends/invite-claim", methods=["POST"])
def friends_invite_claim():
    """Chiamato dal client quando l'invitato raggiunge 5 sessioni.
    Dà 30 monete a invitato e invitante se non già dato."""
    me = get_auth_user(required=True)
    with get_db() as c:
        rel = c.execute(
            "SELECT inviter_id, bonus_given FROM invite_relations WHERE invitee_id=?", (me["id"],)
        ).fetchone()
        if not rel:
            return jsonify({"error": "nessun invito registrato"}), 404
        if rel["bonus_given"]:
            return jsonify({"error": "bonus già dato"}), 400
        inviter_id = rel["inviter_id"]
        _add_coins_userdata(c, inviter_id, 30)  # invitato riceve le sue 30 lato client
        c.execute("""
            INSERT INTO notifications (user_id, type, message, emoji)
            VALUES (?, 'invite', ?, '🎉')
        """, (inviter_id, f"{me['username']} ha completato 5 sessioni con il tuo invito! +30 🪙"))
        c.execute("UPDATE invite_relations SET bonus_given=1 WHERE invitee_id=?", (me["id"],))
        c.commit()
    return jsonify({"ok": True, "coins": 30})

@app.route("/api/friends/invite-progress", methods=["GET"])
def friends_invite_progress():
    """Restituisce il progresso degli inviti: chi ho invitato e quante sessioni ha fatto."""
    me = get_auth_user(required=True)
    with get_db() as c:
        rels = c.execute("""
            SELECT ir.invitee_id, u.username, ir.bonus_given
            FROM invite_relations ir
            JOIN users u ON u.id = ir.invitee_id
            WHERE ir.inviter_id = ?
        """, (me["id"],)).fetchall()
        result = []
        for r in rels:
            # totalSessions è in sf_coins, non in sf_stats
            coins_row = c.execute(
                "SELECT value FROM user_data WHERE user_id=? AND key='sf_coins'", (r["invitee_id"],)
            ).fetchone()
            sessions = 0
            if coins_row and coins_row["value"]:
                try:
                    coins_d = json_lib.loads(coins_row["value"])
                    sessions = int(coins_d.get("totalSessions", 0))
                except Exception:
                    pass
            result.append({
                "username": r["username"],
                "sessions": min(sessions, 5),
                "bonus_given": bool(r["bonus_given"])
            })
    return jsonify(result)

@app.route("/api/notifications", methods=["GET"])
def notifications_list():
    me = get_auth_user(required=True)
    with get_db() as c:
        # Inietta solo annunci creati DOPO la registrazione dell'utente
        missing = c.execute("""
            SELECT a.id, a.message, a.emoji FROM announcements a
            WHERE a.message NOT IN (
                SELECT message FROM notifications
                WHERE user_id = ? AND type = 'announce'
            )
            AND a.created_at >= (SELECT created_at FROM users WHERE id = ?)
        """, (me["id"], me["id"])).fetchall()
        for ann in missing:
            c.execute(
                "INSERT INTO notifications (user_id, type, message, emoji) VALUES (?, 'announce', ?, ?)",
                (me["id"], ann[1], ann[2])
            )
        if missing:
            c.commit()
        rows = c.execute(
            """SELECT id, type, message, emoji, created_at, is_read
               FROM notifications WHERE user_id=?
               ORDER BY created_at DESC LIMIT 30""",
            (me["id"],)
        ).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/notifications/<int:nid>/read", methods=["POST"])
def notification_read(nid):
    me = get_auth_user(required=True)
    with get_db() as c:
        c.execute(
            "UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?",
            (nid, me["id"])
        )
        c.commit()
    return jsonify({"ok": True})

@app.route("/api/notifications/read-all", methods=["POST"])
def notifications_read_all():
    me = get_auth_user(required=True)
    with get_db() as c:
        c.execute("UPDATE notifications SET is_read=1 WHERE user_id=?", (me["id"],))
        c.commit()
    return jsonify({"ok": True})

@app.route("/api/notifications/role-up", methods=["POST"])
def notification_role_up():
    me = get_auth_user(required=True)
    data = request.get_json(silent=True) or {}
    role_name = str(data.get("roleName", ""))[:60]
    perk      = str(data.get("perk",     ""))[:120]
    if not role_name:
        return jsonify({"ok": True})
    msg = f"Hai raggiunto il ruolo {role_name}! {perk}".strip()
    with get_db() as c:
        c.execute(
            "INSERT INTO notifications (user_id, type, message, emoji) VALUES (?, 'role_up', ?, '🏅')",
            (me["id"], msg)
        )
        c.commit()
    return jsonify({"ok": True})

# ──────────────────────────────────────────
# API: ANNUNCI ADMIN
# ──────────────────────────────────────────

@app.route("/api/admin/notifications/announce", methods=["POST"])
def admin_announce():
    me = get_auth_user(required=True)
    if not me["is_admin"]:
        return jsonify({"error": "non autorizzato"}), 403
    data = request.get_json(force=True) or {}
    message = (data.get("message") or "").strip()
    emoji   = (data.get("emoji")   or "📢").strip() or "📢"
    if not message:
        return jsonify({"error": "messaggio richiesto"}), 400
    with get_db() as c:
        # Salva annuncio globale (per utenti futuri)
        c.execute("INSERT INTO announcements (message, emoji) VALUES (?, ?)", (message, emoji))
        # Crea notifica per tutti gli utenti esistenti
        users = c.execute("SELECT id FROM users").fetchall()
        for u in users:
            c.execute(
                "INSERT INTO notifications (user_id, type, message, emoji) VALUES (?, 'announce', ?, ?)",
                (u["id"], message, emoji)
            )
        c.commit()
    return jsonify({"ok": True, "sent": len(users)})

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
    me = get_auth_user(required=True)
    five_min_ago = (datetime.now() - timedelta(minutes=5)).strftime('%Y-%m-%d %H:%M:%S')
    with get_db() as c:
        # Raccoglie ID amici da entrambe le fonti (friendships + sf_friends legacy)
        fs_rows = c.execute(
            """SELECT CASE WHEN f.requester_id=? THEN f.receiver_id ELSE f.requester_id END as fid
               FROM friendships f
               WHERE (f.requester_id=? OR f.receiver_id=?) AND f.status='accepted'""",
            (me["id"], me["id"], me["id"])
        ).fetchall()
        friend_ids = {r["fid"] for r in fs_rows}
        for uname in _sf_friends_list(c, me["id"]):
            u = c.execute("SELECT id FROM users WHERE username=?", (uname,)).fetchone()
            if u:
                friend_ids.add(u["id"])
        if not friend_ids:
            return jsonify([])
        placeholders = ','.join(['?' for _ in friend_ids])
        rows = c.execute(
            f"""SELECT u.username, p.page, p.studying, p.updated_at
                FROM presence p
                JOIN users u ON u.id = p.user_id
                WHERE p.updated_at >= ?
                  AND u.id != ?
                  AND u.id IN ({placeholders})
                ORDER BY p.studying DESC, p.updated_at DESC""",
            (five_min_ago, me["id"], *friend_ids)
        ).fetchall()
    return jsonify([dict(r) for r in rows])

# ──────────────────────────────────────────
# API: HEATMAP & LEADERBOARD
# ──────────────────────────────────────────

@app.route("/api/stats/heatmap", methods=["GET"])
def stats_heatmap():
    me = get_auth_user(required=True)
    with get_db() as c:
        row = c.execute(
            "SELECT value FROM user_data WHERE user_id=? AND key='sf_sessions'",
            (me["id"],)
        ).fetchone()
    result = {}
    if row and row["value"]:
        try:
            for s in json_lib.loads(row["value"]):
                d = (s.get("date") or s.get("endedAt") or "")[:10]
                if d:
                    result[d] = result.get(d, 0) + int(s.get("duration") or 25)
        except Exception:
            pass
    return jsonify(result)

def _user_weekly_minutes(c, uid, week_start):
    row = c.execute(
        "SELECT value FROM user_data WHERE user_id=? AND key='sf_sessions'", (uid,)
    ).fetchone()
    minutes = 0
    if row and row["value"]:
        try:
            for s in json_lib.loads(row["value"]):
                d = (s.get("date") or s.get("endedAt") or "")[:10]
                if d >= week_start:
                    minutes += int(s.get("duration") or 25)
        except Exception:
            pass
    return minutes

def _user_role(sessions):
    s = int(sessions or 0)
    if s >= 800: return {"key": "maestro",     "label": "Maestro",     "emoji": "🏆", "level": 6}
    if s >= 450: return {"key": "esperto",     "label": "Esperto",     "emoji": "💎", "level": 5}
    if s >= 150: return {"key": "studioso",    "label": "Studioso",    "emoji": "⭐", "level": 4}
    if s >= 75:  return {"key": "determinato", "label": "Determinato", "emoji": "🔥", "level": 3}
    if s >= 25:  return {"key": "applicato",   "label": "Applicato",   "emoji": "🎯", "level": 2}
    if s >= 1:   return {"key": "studente",    "label": "Studente",    "emoji": "📖", "level": 1}
    return {"key": "novizio", "label": "Novizio", "emoji": "🌱", "level": 0}

def _get_friend_ids(c, uid):
    fs_rows = c.execute(
        """SELECT CASE WHEN f.requester_id=? THEN f.receiver_id ELSE f.requester_id END as fid
           FROM friendships f
           WHERE (f.requester_id=? OR f.receiver_id=?) AND f.status='accepted'""",
        (uid, uid, uid)
    ).fetchall()
    fids = {r["fid"] for r in fs_rows}
    for uname in _sf_friends_list(c, uid):
        u2 = c.execute("SELECT id FROM users WHERE username=?", (uname,)).fetchone()
        if u2: fids.add(u2["id"])
    return fids

@app.route("/api/leaderboard", methods=["GET"])
def leaderboard():
    me = get_auth_user(required=True)
    today = date.today()
    week_start = (today - timedelta(days=today.weekday())).isoformat()
    with get_db() as c:
        friend_ids = _get_friend_ids(c, me["id"])
        all_ids = list(friend_ids | {me["id"]})
        result = []
        for uid in all_ids:
            u2 = c.execute("SELECT username FROM users WHERE id=?", (uid,)).fetchone()
            if not u2: continue
            mins = _user_weekly_minutes(c, uid, week_start)
            coins_row = c.execute("SELECT value FROM user_data WHERE user_id=? AND key='sf_coins'", (uid,)).fetchone()
            stats_row = c.execute("SELECT value FROM user_data WHERE user_id=? AND key='sf_stats'", (uid,)).fetchone()
            coins_data, stats_data = {}, {}
            try: coins_data = json_lib.loads(coins_row["value"]) if coins_row and coins_row["value"] else {}
            except: pass
            try: stats_data = json_lib.loads(stats_row["value"]) if stats_row and stats_row["value"] else {}
            except: pass
            sessions = int(coins_data.get("totalSessions") or stats_data.get("sessions") or 0)
            role = _user_role(sessions)
            # Rispetta sf_role_override: se l'admin ha forzato un ruolo più alto, usalo
            ov_row = c.execute("SELECT value FROM user_data WHERE user_id=? AND key='sf_role_override'", (uid,)).fetchone()
            ov = ov_row["value"].strip() if ov_row and ov_row["value"] else "auto"
            if ov and ov not in ("auto", ""):
                ov_role = _user_role({"maestro":800,"esperto":450,"studioso":150,"determinato":75,"applicato":25,"studente":1}.get(ov, 0))
                if ov_role["level"] > role["level"]:
                    role = ov_role
            result.append({
                "user_id":  uid,
                "username": u2["username"],
                "minutes":  mins,
                "hours":    round(mins / 60, 1),
                "is_me":    uid == me["id"],
                "sessions": sessions,
                "streak":   int(stats_data.get("streak") or 0),
                "coins":    int(coins_data.get("balance") or 0),
                "role":     role,
            })
    result.sort(key=lambda x: -x["minutes"])
    return jsonify(result)

# ──────────────────────────────────────────
# API: SFIDE CON AMICI
# ──────────────────────────────────────────

@app.route("/api/challenges", methods=["GET"])
def list_challenges():
    me = get_auth_user(required=True)
    with get_db() as c:
        friend_ids = _get_friend_ids(c, me["id"])
        visible_ids = list(friend_ids | {me["id"]})
        ph = ','.join(['?' for _ in visible_ids])
        # Mostra sfide create da amici O dove l'utente è membro
        rows = c.execute(
            f"""SELECT DISTINCT ch.*, u.username as creator_name,
                  (SELECT COUNT(*) FROM challenge_members cm WHERE cm.challenge_id=ch.id) as member_count,
                  (SELECT minutes_done FROM challenge_members cm2 WHERE cm2.challenge_id=ch.id AND cm2.user_id=?) as my_minutes,
                  (SELECT completed FROM challenge_members cm3 WHERE cm3.challenge_id=ch.id AND cm3.user_id=?) as my_completed,
                  (SELECT 1 FROM challenge_members cm4 WHERE cm4.challenge_id=ch.id AND cm4.user_id=?) as am_member
                FROM challenges ch
                JOIN users u ON u.id=ch.creator_id
                WHERE ch.creator_id IN ({ph}) OR ch.id IN (
                    SELECT challenge_id FROM challenge_members WHERE user_id=?
                )
                ORDER BY ch.created_at DESC LIMIT 30""",
            (me["id"], me["id"], me["id"], *visible_ids, me["id"])
        ).fetchall()
        # Per ogni sfida, carica i progressi di tutti i membri
        result = []
        for row in rows:
            d = dict(row)
            members = c.execute(
                """SELECT u.username, cm.minutes_done, cm.completed
                   FROM challenge_members cm JOIN users u ON u.id=cm.user_id
                   WHERE cm.challenge_id=?""",
                (d["id"],)
            ).fetchall()
            d["members"] = [dict(m) for m in members]
            result.append(d)
    return jsonify(result)

@app.route("/api/challenges", methods=["POST"])
def create_challenge():
    me = get_auth_user(required=True)
    data = request.get_json(force=True) or {}
    title      = (data.get("title") or "").strip()[:80]
    target_min = int(data.get("target_min") or 60)
    ends_at    = (data.get("ends_at") or "").strip()
    if not title or not ends_at:
        return jsonify({"error": "titolo e data richiesti"}), 400
    with get_db() as c:
        c.execute(
            "INSERT INTO challenges (creator_id, title, target_min, ends_at) VALUES (?,?,?,?)",
            (me["id"], title, target_min, ends_at)
        )
        row = c.execute(
            "SELECT id FROM challenges WHERE creator_id=? ORDER BY id DESC LIMIT 1",
            (me["id"],)
        ).fetchone()
        cid = row["id"]
        c.execute(
            "INSERT INTO challenge_members (challenge_id, user_id) VALUES (?,?)",
            (cid, me["id"])
        )
        c.commit()
    return jsonify({"ok": True, "id": cid})

@app.route("/api/challenges/<int:cid>/join", methods=["POST"])
def join_challenge(cid):
    me = get_auth_user(required=True)
    with get_db() as c:
        ch = c.execute("SELECT id FROM challenges WHERE id=?", (cid,)).fetchone()
        if not ch:
            return jsonify({"error": "sfida non trovata"}), 404
        exists = c.execute(
            "SELECT 1 FROM challenge_members WHERE challenge_id=? AND user_id=?", (cid, me["id"])
        ).fetchone()
        if not exists:
            c.execute(
                "INSERT INTO challenge_members (challenge_id, user_id) VALUES (?,?)",
                (cid, me["id"])
            )
            c.commit()
    return jsonify({"ok": True})

@app.route("/api/challenges/<int:cid>/progress", methods=["POST"])
def update_challenge_progress(cid):
    me = get_auth_user(required=True)
    data = request.get_json(force=True) or {}
    try:
        minutes = int(data.get("minutes") or 0)
        add_delta = int(data.get("add") or 0)
    except (ValueError, TypeError):
        return jsonify({"error": "invalid minutes"}), 400
    with get_db() as c:
        ch = c.execute("SELECT target_min FROM challenges WHERE id=?", (cid,)).fetchone()
        if not ch:
            return jsonify({"error": "sfida non trovata"}), 404
        if add_delta > 0:
            # Modalità incrementale: +delta atomico, evita race condition su sessioni ravvicinate
            c.execute("""
                INSERT INTO challenge_members (challenge_id, user_id, minutes_done, completed)
                VALUES (?,?,?,0)
                ON CONFLICT(challenge_id, user_id)
                DO UPDATE SET minutes_done = challenge_members.minutes_done + ?
            """, (cid, me["id"], add_delta, add_delta))
            row = c.execute("SELECT minutes_done FROM challenge_members WHERE challenge_id=? AND user_id=?", (cid, me["id"])).fetchone()
            minutes = row["minutes_done"] if row else 0
        completed = 1 if minutes >= ch["target_min"] else 0
        if add_delta > 0:
            c.execute("UPDATE challenge_members SET completed=? WHERE challenge_id=? AND user_id=?", (completed, cid, me["id"]))
        else:
            c.execute("""
                INSERT INTO challenge_members (challenge_id, user_id, minutes_done, completed)
                VALUES (?,?,?,?)
                ON CONFLICT(challenge_id, user_id)
                DO UPDATE SET minutes_done=excluded.minutes_done, completed=excluded.completed
            """, (cid, me["id"], minutes, completed))
        c.commit()
    return jsonify({"ok": True, "completed": bool(completed)})

# ──────────────────────────────────────────
# API: CONFIG APPLICAZIONE
# ──────────────────────────────────────────

@app.route("/api/config", methods=["GET"])
def get_app_config():
    with get_db() as c:
        rows = c.execute("SELECT key, value FROM app_config").fetchall()
    return jsonify({r["key"]: r["value"] for r in rows})

@app.route("/api/admin/config", methods=["POST"])
def set_app_config():
    try:
        me = get_auth_user(required=True)
        if not me["is_admin"]:
            return jsonify({"error": "non autorizzato"}), 403
        data = request.get_json(force=True) or {}
        key   = (data.get("key")   or "").strip()
        value = (data.get("value") or "").strip()
        if not key:
            return jsonify({"error": "key richiesta"}), 400
        with get_db() as c:
            c.execute(
                "INSERT INTO app_config (key, value) VALUES (?, ?)"
                " ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (key, value)
            )
            c.commit()
        return jsonify({"ok": True})
    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "detail": traceback.format_exc()}), 500

@app.route("/api/user/ai-key", methods=["GET"])
def get_ai_key():
    get_auth_user(required=True)
    with get_db() as c:
        row = c.execute("SELECT value FROM app_config WHERE key='groq_key'").fetchone()
    key = row["value"] if row and row["value"] else ""
    return jsonify({"ok": True, "key": key})

@app.route("/api/admin/users/<int:uid>/notify", methods=["POST"])
def admin_notify_user(uid):
    me = get_auth_user(required=True)
    if not me["is_admin"]:
        return jsonify({"error": "non autorizzato"}), 403
    data = request.get_json(force=True) or {}
    message = (data.get("message") or "").strip()
    emoji   = (data.get("emoji")   or "📩").strip() or "📩"
    if not message:
        return jsonify({"error": "messaggio richiesto"}), 400
    with get_db() as c:
        user = c.execute("SELECT id FROM users WHERE id=?", (uid,)).fetchone()
        if not user:
            return jsonify({"error": "utente non trovato"}), 404
        c.execute(
            "INSERT INTO notifications (user_id, type, message, emoji) VALUES (?, 'admin_msg', ?, ?)",
            (uid, message, emoji)
        )
        c.commit()
    return jsonify({"ok": True})

# ──────────────────────────────────────────
# RUN
# ──────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    print(f"\n  StudyFlow backend avviato su porta {port}!\n")
    app.run(host="0.0.0.0", port=port, debug=False)
