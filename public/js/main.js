const socket = io();
let players = [];
let currentPlayerId = null;

// Fetch and render players
async function loadPlayers() {
  const res = await fetch('/api/players');
  players = await res.json();
  renderPlayers(players);
}

function renderPlayers(list) {
  const grid = document.getElementById('playersGrid');
  if (!list.length) {
    grid.innerHTML = '<div class="empty"><div class="icon">🏏</div><p>No players found.</p></div>';
    return;
  }

  grid.innerHTML = list.map(p => {
    const imgHtml = p.image_url
      ? `<img class="card-image" src="${p.image_url}" alt="${p.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">`
      : '';
    const placeholder = `<div class="card-img-placeholder" ${p.image_url ? 'style="display:none"' : ''}>🏏</div>`;

    return `
    <div class="player-card ${p.status === 'sold' ? 'sold' : ''}" id="card-${p.id}" onclick="openPlayer(${p.id})">
      ${imgHtml}${placeholder}
      <div class="card-body">
        <div class="card-name">${p.name}</div>
        <div class="card-meta">
          <span class="badge badge-role">${p.role}</span>
          <span class="badge badge-nationality">${p.nationality}</span>
        </div>
        <div class="card-bid">
          <div>
            <div class="bid-label">Current Bid</div>
            <div class="bid-amount" id="bid-${p.id}">₹${Number(p.current_bid).toLocaleString('en-IN')}</div>
            <div class="bid-team" id="team-${p.id}">${p.team ? '🏆 ' + p.team : ''}</div>
          </div>
          ${p.status !== 'sold' ? `<button class="btn btn-gold btn-sm" onclick="event.stopPropagation(); openBidModal(${p.id})">Bid →</button>` : '<span class="badge" style="background:var(--red);color:white;">SOLD</span>'}
        </div>
      </div>
    </div>`;
  }).join('');
}

function openPlayer(id) {
  window.location.href = `/player/${id}`;
}

// BID MODAL
function openBidModal(playerId) {
  const p = players.find(x => x.id === playerId);
  if (!p) return;
  currentPlayerId = playerId;
  document.getElementById('bidPlayerName').textContent = p.name;
  document.getElementById('bidCurrentAmount').textContent = '₹' + Number(p.current_bid).toLocaleString('en-IN');
  document.getElementById('bidCurrentTeam').textContent = p.team ? ' — ' + p.team : '';
  document.getElementById('bidAmount').value = '';
  document.getElementById('bidModal').classList.add('active');
}

function closeBidModal() {
  document.getElementById('bidModal').classList.remove('active');
  currentPlayerId = null;
}

function submitBid() {
  const bidderName = document.getElementById('bidderName').value.trim();
  const teamName = document.getElementById('bidTeamName').value.trim();
  const amount = parseInt(document.getElementById('bidAmount').value);

  if (!bidderName || !teamName || !amount) {
    showToast('Please fill all fields.', 'error');
    return;
  }

  socket.emit('place_bid', {
    player_id: currentPlayerId,
    bidder_name: bidderName,
    team_name: teamName,
    amount
  });
}

// Real-time bid update
socket.on('bid_updated', (data) => {
  // Update local players array
  const p = players.find(x => x.id === data.player_id);
  if (p) {
    p.current_bid = data.current_bid;
    p.current_bidder = data.current_bidder;
    p.team = data.team;
  }

  // Update card UI
  const bidEl = document.getElementById('bid-' + data.player_id);
  const teamEl = document.getElementById('team-' + data.player_id);
  if (bidEl) {
    bidEl.textContent = '₹' + Number(data.current_bid).toLocaleString('en-IN');
    bidEl.style.animation = 'none';
    setTimeout(() => bidEl.style.animation = '', 10);
  }
  if (teamEl) teamEl.textContent = '🏆 ' + data.team;

  // Update modal if open for same player
  if (currentPlayerId === data.player_id) {
    document.getElementById('bidCurrentAmount').textContent = '₹' + Number(data.current_bid).toLocaleString('en-IN');
    document.getElementById('bidCurrentTeam').textContent = ' — ' + data.team;
  }

  showToast(`🏏 New bid on ${data.player_name}: ₹${Number(data.current_bid).toLocaleString('en-IN')} by ${data.team}`, 'info');
  closeBidModal();
});

socket.on('bid_error', (data) => {
  showToast(data.message, 'error');
});

// FILTERS
document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('roleFilter').addEventListener('change', applyFilters);
document.getElementById('nationalityFilter').addEventListener('change', applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);

function applyFilters() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const role = document.getElementById('roleFilter').value;
  const nat = document.getElementById('nationalityFilter').value;
  const status = document.getElementById('statusFilter').value;

  const filtered = players.filter(p => {
    return (!search || p.name.toLowerCase().includes(search)) &&
           (!role || p.role === role) &&
           (!nat || p.nationality === nat) &&
           (!status || p.status === status);
  });
  renderPlayers(filtered);
}

// Close modal on overlay click
document.getElementById('bidModal').addEventListener('click', function(e) {
  if (e.target === this) closeBidModal();
});

// TOAST
function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

loadPlayers();
