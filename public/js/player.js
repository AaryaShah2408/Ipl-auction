const socket = io();
const playerId = parseInt(window.location.pathname.split('/').pop());
let player = null;

async function loadPlayer() {
  const res = await fetch(`/api/players/${playerId}`);
  if (!res.ok) {
    document.getElementById('playerContent').innerHTML = '<div class="empty"><div class="icon">❌</div><p>Player not found.</p></div>';
    return;
  }
  player = await res.json();
  renderPlayer();
  loadBidHistory();
}

function renderPlayer() {
  const stats = player.stats || {};
  const statKeys = Object.keys(stats);

  document.title = `${player.name} - IPL Auction`;

  document.getElementById('playerContent').innerHTML = `
    <a href="/" style="color:var(--muted); text-decoration:none; font-size:0.9rem; display:inline-block; margin-bottom:1.5rem;">← Back to Players</a>

    <div style="display:grid; grid-template-columns:1fr 2fr; gap:2rem; align-items:start;">
      <div>
        ${player.image_url
          ? `<img src="${player.image_url}" alt="${player.name}" style="width:100%; border-radius:16px; border:1px solid var(--border);" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">`
          : ''}
        <div style="width:100%; height:300px; background:linear-gradient(135deg,#1a2744,#0d1b2e); border-radius:16px; display:${player.image_url ? 'none' : 'flex'}; align-items:center; justify-content:center; font-size:6rem; border:1px solid var(--border);">🏏</div>
      </div>

      <div>
        <div style="display:flex; gap:0.75rem; flex-wrap:wrap; margin-bottom:0.75rem;">
          <span class="badge badge-role">${player.role}</span>
          <span class="badge badge-nationality">${player.nationality}</span>
          ${player.status === 'sold' ? '<span class="badge" style="background:var(--red);color:white;">SOLD</span>' : '<span class="badge" style="background:rgba(16,185,129,0.15);color:var(--green);border:1px solid rgba(16,185,129,0.3);">AVAILABLE</span>'}
        </div>

        <h1 style="font-family:'Teko',sans-serif; font-size:3rem; font-weight:700; letter-spacing:2px; margin-bottom:0.25rem;">${player.name}</h1>
        <p style="color:var(--muted); font-size:1rem; margin-bottom:1.5rem;">Age: ${player.age || 'N/A'}</p>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem;">
          <div style="background:var(--navy); border:1px solid var(--border); border-radius:10px; padding:1.25rem;">
            <div style="font-size:0.8rem; color:var(--muted); text-transform:uppercase; letter-spacing:1px;">Base Price</div>
            <div style="font-family:'Teko',sans-serif; font-size:2rem; color:var(--muted);">₹${Number(player.base_price).toLocaleString('en-IN')}</div>
          </div>
          <div style="background:var(--navy); border:1px solid rgba(245,158,11,0.3); border-radius:10px; padding:1.25rem;">
            <div style="font-size:0.8rem; color:var(--muted); text-transform:uppercase; letter-spacing:1px;"><span class="live-dot"></span>Current Bid</div>
            <div id="currentBidDisplay" style="font-family:'Teko',sans-serif; font-size:2rem; color:var(--gold);">₹${Number(player.current_bid).toLocaleString('en-IN')}</div>
            <div id="currentTeamDisplay" style="font-size:0.9rem; color:var(--teal);">${player.team ? '🏆 ' + player.team : 'No bids yet'}</div>
          </div>
        </div>

        ${statKeys.length ? `
        <h3 style="font-family:'Teko',sans-serif; font-size:1.3rem; color:var(--gold); margin-bottom:1rem; letter-spacing:1px;">CAREER STATS</h3>
        <div class="stats-grid">
          ${statKeys.map(k => `
            <div class="stat-box">
              <div class="stat-value">${stats[k]}</div>
              <div class="stat-label">${k.replace(/_/g, ' ')}</div>
            </div>
          `).join('')}
        </div>` : ''}

        ${player.status !== 'sold' ? `
        <button class="btn btn-gold" onclick="openBidModal()" style="margin-top:1rem; font-size:1.1rem; padding:0.8rem 2rem;">
          🏏 Place Bid
        </button>` : '<div style="margin-top:1rem; color:var(--muted);">This player has already been sold.</div>'}
      </div>
    </div>

    <div style="margin-top:3rem;">
      <h3 class="section-title">BID HISTORY</h3>
      <div class="table-wrap" id="bidHistory">
        <div class="loading"><div class="spinner"></div></div>
      </div>
    </div>
  `;
}

async function loadBidHistory() {
  const res = await fetch(`/api/players/${playerId}/bids`);
  const bids = await res.json();
  const el = document.getElementById('bidHistory');
  if (!bids.length) {
    el.innerHTML = '<div class="empty"><div class="icon">📋</div><p>No bids placed yet.</p></div>';
    return;
  }

  el.innerHTML = `
    <table>
      <thead><tr><th>#</th><th>Bidder</th><th>Team</th><th>Amount</th><th>Time</th></tr></thead>
      <tbody>
        ${bids.map((b, i) => `
          <tr>
            <td style="color:var(--muted)">${i + 1}</td>
            <td>${b.bidder_name}</td>
            <td style="color:var(--teal)">${b.team_name}</td>
            <td style="color:var(--gold); font-family:'Teko',sans-serif; font-size:1.2rem;">₹${Number(b.amount).toLocaleString('en-IN')}</td>
            <td style="color:var(--muted); font-size:0.85rem;">${new Date(b.created_at).toLocaleString('en-IN')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

// BID MODAL
function openBidModal() {
  document.getElementById('bidPlayerName').textContent = player.name;
  document.getElementById('bidCurrentAmount').textContent = '₹' + Number(player.current_bid).toLocaleString('en-IN');
  document.getElementById('bidCurrentTeam').textContent = player.team ? ' — ' + player.team : '';
  document.getElementById('bidAmount').value = '';
  document.getElementById('bidModal').classList.add('active');
}

function closeBidModal() {
  document.getElementById('bidModal').classList.remove('active');
}

function submitBid() {
  const bidderName = document.getElementById('bidderName').value.trim();
  const teamName = document.getElementById('bidTeamName').value.trim();
  const amount = parseInt(document.getElementById('bidAmount').value);

  if (!bidderName || !teamName || !amount) {
    showToast('Please fill all fields.', 'error');
    return;
  }

  socket.emit('place_bid', { player_id: playerId, bidder_name: bidderName, team_name: teamName, amount });
}

socket.on('bid_updated', (data) => {
  if (data.player_id !== playerId) return;
  player.current_bid = data.current_bid;
  player.team = data.team;

  document.getElementById('currentBidDisplay').textContent = '₹' + Number(data.current_bid).toLocaleString('en-IN');
  document.getElementById('currentTeamDisplay').textContent = '🏆 ' + data.team;
  closeBidModal();
  loadBidHistory();
  showToast(`New bid placed: ₹${Number(data.current_bid).toLocaleString('en-IN')} by ${data.team}`, 'info');
});

socket.on('bid_error', (data) => showToast(data.message, 'error'));

document.getElementById('bidModal').addEventListener('click', function(e) {
  if (e.target === this) closeBidModal();
});

function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

loadPlayer();
