let players = [];

// Check if already logged in
async function checkSession() {
  const res = await fetch('/api/admin/check');
  const data = await res.json();
  if (data.isAdmin) showAdminPanel();
}

async function doLogin() {
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (data.success) {
    showAdminPanel();
  } else {
    showToast(data.error || 'Login failed', 'error');
  }
}

async function logout() {
  await fetch('/api/admin/logout', { method: 'POST' });
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('loginPanel').style.display = 'block';
  document.getElementById('logoutBtn').style.display = 'none';
}

function showAdminPanel() {
  document.getElementById('loginPanel').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'block';
  document.getElementById('logoutBtn').style.display = 'inline-flex';
  loadPlayers();
}

async function loadPlayers() {
  const res = await fetch('/api/players');
  players = await res.json();
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('adminTableBody');
  if (!players.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--muted);">No players yet. Add one!</td></tr>';
    return;
  }

  tbody.innerHTML = players.map(p => `
    <tr>
      <td style="color:var(--muted)">${p.id}</td>
      <td><strong>${p.name}</strong></td>
      <td><span class="badge badge-role">${p.role}</span></td>
      <td>₹${Number(p.base_price).toLocaleString('en-IN')}</td>
      <td style="color:var(--gold); font-family:'Teko',sans-serif; font-size:1.2rem;">₹${Number(p.current_bid).toLocaleString('en-IN')}</td>
      <td style="color:var(--teal)">${p.current_bidder || '-'} ${p.team ? '/ ' + p.team : ''}</td>
      <td><span class="badge" style="background:${p.status === 'sold' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}; color:${p.status === 'sold' ? 'var(--red)' : 'var(--green)'}; border:1px solid ${p.status === 'sold' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}">${p.status.toUpperCase()}</span></td>
      <td>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" onclick="openEditModal(${p.id})">Edit</button>
          <button class="btn btn-success btn-sm" onclick="resetBids(${p.id})" title="Reset bids">Reset</button>
          ${p.status !== 'sold' ? `<button class="btn btn-sm" style="background:var(--teal);color:var(--navy)" onclick="sellPlayer(${p.id})">Sell</button>` : ''}
          <button class="btn btn-danger btn-sm" onclick="deletePlayer(${p.id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ADD MODAL
function openAddModal() {
  document.getElementById('playerModalTitle').textContent = 'ADD PLAYER';
  document.getElementById('editPlayerId').value = '';
  document.getElementById('editStatusGroup').style.display = 'none';
  ['pName','pNationality','pAge','pBasePrice','pImageUrl','pStats'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('pRole').value = 'Batsman';
  document.getElementById('playerModal').classList.add('active');
}

function openEditModal(id) {
  const p = players.find(x => x.id === id);
  if (!p) return;
  document.getElementById('playerModalTitle').textContent = 'EDIT PLAYER';
  document.getElementById('editPlayerId').value = id;
  document.getElementById('pName').value = p.name;
  document.getElementById('pRole').value = p.role;
  document.getElementById('pNationality').value = p.nationality;
  document.getElementById('pAge').value = p.age || '';
  document.getElementById('pBasePrice').value = p.base_price;
  document.getElementById('pImageUrl').value = p.image_url || '';
  document.getElementById('pStats').value = p.stats ? JSON.stringify(p.stats, null, 2) : '';
  document.getElementById('pStatus').value = p.status;
  document.getElementById('editStatusGroup').style.display = 'block';
  document.getElementById('playerModal').classList.add('active');
}

function closePlayerModal() {
  document.getElementById('playerModal').classList.remove('active');
}

async function savePlayer() {
  const editId = document.getElementById('editPlayerId').value;
  const statsRaw = document.getElementById('pStats').value.trim();
  let stats = null;

  if (statsRaw) {
    try { stats = JSON.parse(statsRaw); }
    catch { showToast('Invalid JSON in stats field.', 'error'); return; }
  }

  const body = {
    name: document.getElementById('pName').value.trim(),
    role: document.getElementById('pRole').value,
    nationality: document.getElementById('pNationality').value.trim(),
    age: parseInt(document.getElementById('pAge').value) || null,
    base_price: parseInt(document.getElementById('pBasePrice').value),
    image_url: document.getElementById('pImageUrl').value.trim() || null,
    stats,
    status: document.getElementById('pStatus').value
  };

  if (!body.name || !body.nationality || !body.base_price) {
    showToast('Name, nationality and base price are required.', 'error');
    return;
  }

  const url = editId ? `/api/admin/players/${editId}` : '/api/admin/players';
  const method = editId ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (data.error) { showToast(data.error, 'error'); return; }

  showToast(editId ? 'Player updated!' : 'Player added!');
  closePlayerModal();
  loadPlayers();
}

async function deletePlayer(id) {
  if (!confirm('Delete this player and all their bids?')) return;
  const res = await fetch(`/api/admin/players/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (data.success) { showToast('Player deleted.'); loadPlayers(); }
  else showToast(data.error, 'error');
}

async function resetBids(id) {
  if (!confirm('Reset all bids for this player?')) return;
  const res = await fetch(`/api/admin/players/${id}/reset`, { method: 'POST' });
  const data = await res.json();
  if (data.success) { showToast('Bids reset.'); loadPlayers(); }
  else showToast(data.error, 'error');
}

async function sellPlayer(id) {
  if (!confirm('Mark this player as SOLD?')) return;
  const res = await fetch(`/api/admin/players/${id}/sell`, { method: 'POST' });
  const data = await res.json();
  if (data.success) { showToast('Player marked as sold!'); loadPlayers(); }
  else showToast(data.error, 'error');
}

// Close modal on overlay click
document.getElementById('playerModal').addEventListener('click', function(e) {
  if (e.target === this) closePlayerModal();
});

// Enter key to login
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.getElementById('loginPanel').style.display !== 'none') {
    doLogin();
  }
});

function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

checkSession();
