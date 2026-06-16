/* friends.js — sistema amici StudyFlow */

var _friendsState = {
  friends: [],
  received: [],
  sent: [],
  searchResults: [],
  searchTimer: null
};

function initFriends() {
  loadFriends();
  loadFriendRequests();

  var inp = document.getElementById('friends-search-input');
  if (inp) {
    inp.addEventListener('input', function() {
      clearTimeout(_friendsState.searchTimer);
      var q = inp.value.trim();
      if (q.length < 2) {
        document.getElementById('friends-search-results').innerHTML = '';
        return;
      }
      _friendsState.searchTimer = setTimeout(function() { searchUsers(q); }, 350);
    });
  }
}

function _apiCall(method, path, body, cb) {
  var auth = JSON.parse(sessionStorage.getItem('sf_auth') || 'null');
  var token = auth && auth.token ? auth.token : '';
  var BASE = (typeof API_BASE !== 'undefined') ? API_BASE : 'http://localhost:5002';
  var opts = {
    method: method,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
  };
  if (body) opts.body = JSON.stringify(body);
  fetch(BASE + path, opts)
    .then(function(r) { return r.json(); })
    .then(function(data) { cb(null, data); })
    .catch(function(e) { cb(e, null); });
}

function loadFriends() {
  _apiCall('GET', '/api/friends', null, function(err, data) {
    if (err || !Array.isArray(data)) return;
    _friendsState.friends = data;
    renderFriendsList();
  });
}

function loadFriendRequests() {
  _apiCall('GET', '/api/friends/requests', null, function(err, data) {
    if (err || !data) return;
    _friendsState.received = data.received || [];
    _friendsState.sent     = data.sent     || [];
    renderRequests();
  });
}

function searchUsers(q) {
  _apiCall('GET', '/api/friends/search?q=' + encodeURIComponent(q), null, function(err, data) {
    if (err || !Array.isArray(data)) return;
    _friendsState.searchResults = data;
    renderSearchResults(data);
  });
}

function sendFriendRequest(username) {
  _apiCall('POST', '/api/friends/request', { username: username }, function(err, data) {
    if (err || data.error) {
      _showFriendsToast(data && data.error ? data.error : 'Errore', true);
      return;
    }
    _showFriendsToast('Richiesta inviata a ' + username + '!');
    var inp = document.getElementById('friends-search-input');
    if (inp) { inp.value = ''; }
    document.getElementById('friends-search-results').innerHTML = '';
    loadFriendRequests();
  });
}

function acceptRequest(fid) {
  _apiCall('POST', '/api/friends/' + fid + '/accept', null, function(err, data) {
    if (err || data.error) { _showFriendsToast(data && data.error ? data.error : 'Errore', true); return; }
    _showFriendsToast('Amicizia accettata!');
    loadFriends();
    loadFriendRequests();
  });
}

function rejectRequest(fid) {
  _apiCall('POST', '/api/friends/' + fid + '/reject', null, function(err, data) {
    if (err || data.error) { _showFriendsToast(data && data.error ? data.error : 'Errore', true); return; }
    _showFriendsToast('Richiesta rifiutata.');
    loadFriendRequests();
  });
}

function removeFriend(fid, username) {
  if (!confirm('Rimuovere ' + username + ' dagli amici?')) return;
  _apiCall('DELETE', '/api/friends/' + fid, null, function(err, data) {
    if (err || data.error) { _showFriendsToast(data && data.error ? data.error : 'Errore', true); return; }
    _showFriendsToast(username + ' rimosso dagli amici.');
    loadFriends();
  });
}

function renderFriendsList() {
  var el = document.getElementById('friends-list');
  if (!el) return;
  var friends = _friendsState.friends;
  if (!friends.length) {
    el.innerHTML = '<div class="friends-empty">Nessun amico ancora. Cerca un utente qui sopra!</div>';
    return;
  }
  var online  = friends.filter(function(f) { return f.online; });
  var offline = friends.filter(function(f) { return !f.online; });

  function _card(f) {
    var dot   = f.online ? 'friends-dot-online' : 'friends-dot-offline';
    var label = f.online
      ? (f.studying ? '📚 Sta studiando' : '🟢 Online')
      : '⚫ Offline';
    return '<div class="friends-card">' +
      '<div class="friends-avatar">' + f.username.charAt(0).toUpperCase() + '</div>' +
      '<div class="friends-info">' +
        '<div class="friends-name">' + _esc(f.username) + '</div>' +
        '<div class="friends-status"><span class="friends-dot ' + dot + '"></span>' + label + '</div>' +
      '</div>' +
      '<button class="friends-remove-btn" onclick="removeFriend(' + f.friendship_id + ',\'' + _esc(f.username) + '\')">Rimuovi</button>' +
    '</div>';
  }

  var html = '';
  if (online.length) {
    html += '<div class="friends-group-label">Online ora (' + online.length + ')</div>';
    html += online.map(_card).join('');
  }
  if (offline.length) {
    html += '<div class="friends-group-label">Offline (' + offline.length + ')</div>';
    html += offline.map(_card).join('');
  }
  el.innerHTML = html;
}

function renderRequests() {
  var el = document.getElementById('friends-requests');
  if (!el) return;
  var received = _friendsState.received;
  var sent     = _friendsState.sent;

  if (!received.length && !sent.length) {
    el.innerHTML = '<div class="friends-empty">Nessuna richiesta in sospeso.</div>';
    return;
  }

  var html = '';
  if (received.length) {
    html += '<div class="friends-group-label">Ricevute (' + received.length + ')</div>';
    received.forEach(function(r) {
      html += '<div class="friends-card">' +
        '<div class="friends-avatar friends-avatar-pending">' + r.username.charAt(0).toUpperCase() + '</div>' +
        '<div class="friends-info">' +
          '<div class="friends-name">' + _esc(r.username) + '</div>' +
          '<div class="friends-status">vuole essere tuo amico</div>' +
        '</div>' +
        '<div class="friends-req-btns">' +
          '<button class="friends-accept-btn" onclick="acceptRequest(' + r.id + ')">Accetta</button>' +
          '<button class="friends-reject-btn" onclick="rejectRequest(' + r.id + ')">Rifiuta</button>' +
        '</div>' +
      '</div>';
    });
  }
  if (sent.length) {
    html += '<div class="friends-group-label">Inviate (' + sent.length + ')</div>';
    sent.forEach(function(r) {
      html += '<div class="friends-card">' +
        '<div class="friends-avatar friends-avatar-sent">' + r.username.charAt(0).toUpperCase() + '</div>' +
        '<div class="friends-info">' +
          '<div class="friends-name">' + _esc(r.username) + '</div>' +
          '<div class="friends-status" style="color:var(--text-soft)">In attesa di risposta...</div>' +
        '</div>' +
      '</div>';
    });
  }
  el.innerHTML = html;

  /* badge count on nav */
  var badge = document.getElementById('friends-req-badge');
  if (badge) {
    badge.textContent = received.length || '';
    badge.style.display = received.length ? 'inline-flex' : 'none';
  }
}

function renderSearchResults(results) {
  var el = document.getElementById('friends-search-results');
  if (!el) return;
  if (!results.length) {
    el.innerHTML = '<div class="friends-empty">Nessun utente trovato.</div>';
    return;
  }
  el.innerHTML = results.map(function(u) {
    var action = '';
    var fs = u.friendship;
    if (!fs) {
      action = '<button class="friends-add-btn" onclick="sendFriendRequest(\'' + _esc(u.username) + '\')">+ Aggiungi</button>';
    } else if (fs.status === 'accepted') {
      action = '<span class="friends-already">Amici ✓</span>';
    } else if (fs.status === 'pending' && fs.requester_id !== _myId()) {
      action = '<span class="friends-already">Richiesta ricevuta</span>';
    } else {
      action = '<span class="friends-already">Richiesta inviata</span>';
    }
    return '<div class="friends-card">' +
      '<div class="friends-avatar">' + u.username.charAt(0).toUpperCase() + '</div>' +
      '<div class="friends-info"><div class="friends-name">' + _esc(u.username) + '</div></div>' +
      action +
    '</div>';
  }).join('');
}

function _myId() {
  var auth = JSON.parse(sessionStorage.getItem('sf_auth') || 'null');
  return auth ? auth.user_id : 0;
}

function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function _showFriendsToast(msg, isErr) {
  var t = document.getElementById('friends-toast');
  if (!t) return;
  t.textContent = msg;
  t.style.background = isErr ? 'rgba(239,68,68,0.92)' : 'rgba(34,197,94,0.92)';
  t.style.display = 'block';
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(function() { t.style.opacity = '0'; setTimeout(function() { t.style.display = 'none'; }, 350); }, 2800);
}
