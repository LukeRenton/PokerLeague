/**
 * Poker League Admin Panel
 * Password-protected admin interface for managing league data
 */

// ============================================
// Constants & State
// ============================================

const ADMIN_PASSWORD = '123456';
const STORAGE_KEY_AUTH = 'poker_league_admin_auth';

let adminState = {
  players: [],
  events: [],
  pointsSystem: {}
};

// ============================================
// Authentication
// ============================================

function checkAuth() {
  const isAuthenticated = sessionStorage.getItem(STORAGE_KEY_AUTH) === 'true';
  if (isAuthenticated) {
    showAdminPanel();
  }
}

document.getElementById('login-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const password = document.getElementById('password').value;
  
  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem(STORAGE_KEY_AUTH, 'true');
    showAdminPanel();
  } else {
    document.getElementById('login-error').style.display = 'block';
    document.getElementById('password').value = '';
    document.getElementById('password').focus();
  }
});

function showAdminPanel() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';
  loadAdminData();
}

function logout() {
  sessionStorage.removeItem(STORAGE_KEY_AUTH);
  location.reload();
}

// ============================================
// Data Loading
// ============================================

async function loadAdminData() {
  try {
    const [playersResponse, eventsResponse] = await Promise.all([
      fetch('data/players.json'),
      fetch('data/events.json')
    ]);

    if (!playersResponse.ok || !eventsResponse.ok) {
      throw new Error('Failed to load data files');
    }

    const playersData = await playersResponse.json();
    const eventsData = await eventsResponse.json();

    adminState.players = playersData.players;
    adminState.events = eventsData.events;
    adminState.pointsSystem = eventsData.pointsSystem;

    renderAll();
  } catch (error) {
    console.error('Error loading data:', error);
    alert('Failed to load league data. Please check that the JSON files exist.');
  }
}

function renderAll() {
  renderPlayersTable();
  renderEventsTable();
  renderPointsSystem();
  renderEventResultsContainer();
  updateDownloadStats();
}

// ============================================
// Tab Navigation
// ============================================

function showTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  event.target.classList.add('active');

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ============================================
// Players Management
// ============================================

function renderPlayersTable() {
  const tbody = document.getElementById('players-table-body');
  
  if (adminState.players.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-secondary);">
          No players yet. Add your first player above!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = adminState.players.map(player => `
    <tr>
      <td>
        <img src="${player.image}" alt="${player.name}" class="player-avatar-preview" 
             onerror="this.src='images/avatars/default-avatar.svg'">
      </td>
      <td><code>${player.id}</code></td>
      <td>
        <div>${player.name}</div>
        ${player.nickname ? `<div style="font-size: 0.75rem; color: var(--accent-gold); font-style: italic;">"${player.nickname}"</div>` : ''}
      </td>
      <td>${formatDate(player.joinedDate)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-secondary btn-small" onclick="editPlayer('${player.id}')">
            ✏️ Edit
          </button>
          <button class="btn btn-danger btn-small" onclick="deletePlayer('${player.id}')">
            🗑️ Delete
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

document.getElementById('add-player-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const playerId = document.getElementById('player-id').value.trim().toLowerCase();
  const playerName = document.getElementById('player-name').value.trim();
  const playerNickname = document.getElementById('player-nickname').value.trim();
  const playerImage = document.getElementById('player-image').value.trim();
  const playerJoined = document.getElementById('player-joined').value;

  // Check for duplicate ID
  if (adminState.players.some(p => p.id === playerId)) {
    showMessage('players', 'error', `Player ID "${playerId}" already exists!`);
    return;
  }

  const newPlayer = {
    id: playerId,
    name: playerName,
    nickname: playerNickname || '',
    image: playerImage || 'images/avatars/default-avatar.svg',
    joinedDate: playerJoined
  };

  adminState.players.push(newPlayer);
  renderPlayersTable();
  renderEventResultsContainer();
  updateDownloadStats();
  
  showMessage('players', 'success', `Player "${playerName}" added successfully!`);
  e.target.reset();
  document.getElementById('player-image').value = 'images/avatars/default-avatar.svg';
  
  // Set today's date as default
  document.getElementById('player-joined').valueAsDate = new Date();
});

function editPlayer(playerId) {
  const player = adminState.players.find(p => p.id === playerId);
  if (!player) return;

  const newName = prompt('Enter new name:', player.name);
  if (newName && newName.trim()) {
    player.name = newName.trim();
    renderPlayersTable();
    updateDownloadStats();
    showMessage('players', 'success', 'Player updated successfully!');
  }
}

function deletePlayer(playerId) {
  const player = adminState.players.find(p => p.id === playerId);
  if (!player) return;

  // Check if player is in any events
  const inEvents = adminState.events.some(event => 
    event.results.some(result => result.playerId === playerId)
  );

  let confirmMsg = `Delete player "${player.name}"?`;
  if (inEvents) {
    confirmMsg += '\n\nWARNING: This player has participated in events. Deleting them will affect past results!';
  }

  if (confirm(confirmMsg)) {
    adminState.players = adminState.players.filter(p => p.id !== playerId);
    renderPlayersTable();
    renderEventResultsContainer();
    updateDownloadStats();
    showMessage('players', 'success', 'Player deleted successfully!');
  }
}

// ============================================
// Events Management
// ============================================

function renderEventsTable() {
  const tbody = document.getElementById('events-table-body');
  
  if (adminState.events.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--text-secondary);">
          No poker nights yet. Add your first event above!
        </td>
      </tr>
    `;
    return;
  }

  // Sort by date (most recent first)
  const sortedEvents = [...adminState.events].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );

  tbody.innerHTML = sortedEvents.map(event => `
    <tr>
      <td>${formatDate(event.date)}</td>
      <td>${event.name}</td>
      <td>${event.results.length} players</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-secondary btn-small" onclick="viewEventDetails('${event.id}')">
            👁️ View
          </button>
          <button class="btn btn-danger btn-small" onclick="deleteEvent('${event.id}')">
            🗑️ Delete
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderEventResultsContainer() {
  const container = document.getElementById('event-results-container');
  if (!container) return;
  
  // Start with one position
  container.innerHTML = `
    <div class="result-entry" id="result-1">
      <div class="result-row-group">
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Position 1 (Winner)</label>
          <select class="form-select player-select" name="result-player-1" required>
            <option value="">Select player...</option>
            ${adminState.players.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            <option value="__GUEST__" style="color: var(--text-secondary);">--- Guest Player ---</option>
          </select>
        </div>
        <div class="form-group" id="guest-name-1" style="flex: 1; display: none;">
          <label class="form-label">Guest Name</label>
          <input type="text" class="form-input" name="guest-name-1" placeholder="Enter guest name">
        </div>
      </div>
    </div>
  `;
  
  // Add event listener for guest detection
  addGuestListeners();
}

function addGuestListeners() {
  document.querySelectorAll('.player-select').forEach(select => {
    select.addEventListener('change', function() {
      const resultId = this.name.split('-').pop();
      const guestNameDiv = document.getElementById(`guest-name-${resultId}`);
      if (this.value === '__GUEST__') {
        guestNameDiv.style.display = 'block';
        guestNameDiv.querySelector('input').required = true;
      } else {
        guestNameDiv.style.display = 'none';
        guestNameDiv.querySelector('input').required = false;
      }
    });
  });
}

let resultPositionCount = 1;

function addResultPosition() {
  resultPositionCount++;
  const container = document.getElementById('event-results-container');
  
  const positionDiv = document.createElement('div');
  positionDiv.className = 'result-entry';
  positionDiv.id = `result-${resultPositionCount}`;
  positionDiv.innerHTML = `
    <div class="result-row-group">
      <div class="form-group" style="flex: 1;">
        <label class="form-label">
          Position ${resultPositionCount}
          <button type="button" onclick="removeResultPosition(${resultPositionCount})" 
                  style="margin-left: 8px; background: none; border: none; color: var(--accent-red); cursor: pointer;">
            ✕
          </button>
        </label>
        <select class="form-select player-select" name="result-player-${resultPositionCount}" required>
          <option value="">Select player...</option>
          ${adminState.players.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          <option value="__GUEST__" style="color: var(--text-secondary);">--- Guest Player ---</option>
        </select>
      </div>
      <div class="form-group" id="guest-name-${resultPositionCount}" style="flex: 1; display: none;">
        <label class="form-label">Guest Name</label>
        <input type="text" class="form-input" name="guest-name-${resultPositionCount}" placeholder="Enter guest name">
      </div>
    </div>
  `;
  
  container.appendChild(positionDiv);
  addGuestListeners();
}

function removeResultPosition(position) {
  const element = document.getElementById(`result-${position}`);
  if (element) {
    element.remove();
  }
}

document.getElementById('add-event-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const eventId = document.getElementById('event-id').value.trim().toLowerCase();
  const eventDate = document.getElementById('event-date').value;
  const eventName = document.getElementById('event-name').value.trim();

  // Check for duplicate ID
  if (adminState.events.some(ev => ev.id === eventId)) {
    showMessage('events', 'error', `Event ID "${eventId}" already exists!`);
    return;
  }

  // Collect results
  const leagueResults = [];
  const nonLeaguePlayers = [];
  const container = document.getElementById('event-results-container');
  const resultEntries = container.querySelectorAll('.result-entry');
  
  let nightPosition = 1;
  let leaguePosition = 1;
  
  for (const entry of resultEntries) {
    const select = entry.querySelector('.player-select');
    const playerId = select.value;
    
    if (!playerId) continue;
    
    if (playerId === '__GUEST__') {
      // Guest player
      const guestNameInput = entry.querySelector('input[name^="guest-name"]');
      const guestName = guestNameInput.value.trim();
      
      if (!guestName) {
        showMessage('events', 'error', 'Please enter a name for all guest players!');
        return;
      }
      
      nonLeaguePlayers.push({
        name: guestName,
        nightPosition: nightPosition
      });
    } else {
      // League player
      leagueResults.push({
        playerId: playerId,
        nightPosition: nightPosition,
        leaguePosition: leaguePosition
      });
      leaguePosition++;
    }
    
    nightPosition++;
  }

  if (leagueResults.length === 0) {
    showMessage('events', 'error', 'Please add at least one league player!');
    return;
  }

  const newEvent = {
    id: eventId,
    date: eventDate,
    name: eventName,
    results: leagueResults
  };
  
  if (nonLeaguePlayers.length > 0) {
    newEvent.nonLeaguePlayers = nonLeaguePlayers;
  }

  adminState.events.push(newEvent);
  adminState.events.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  renderEventsTable();
  updateDownloadStats();
  
  showMessage('events', 'success', `Poker night "${eventName}" added successfully!`);
  e.target.reset();
  renderEventResultsContainer();
  resultPositionCount = 1;
});

function viewEventDetails(eventId) {
  const event = adminState.events.find(e => e.id === eventId);
  if (!event) return;

  const results = event.results.map(result => {
    const player = adminState.players.find(p => p.id === result.playerId);
    const points = getPointsForPosition(result.position);
    return `${result.position}. ${player?.name || 'Unknown'} (+${points} pts)`;
  }).join('\n');

  alert(`📊 ${event.name}\n📅 ${formatDate(event.date)}\n\nResults:\n${results}`);
}

function deleteEvent(eventId) {
  const event = adminState.events.find(e => e.id === eventId);
  if (!event) return;

  if (confirm(`Delete "${event.name}"?\n\nThis cannot be undone!`)) {
    adminState.events = adminState.events.filter(e => e.id !== eventId);
    renderEventsTable();
    updateDownloadStats();
    showMessage('events', 'success', 'Event deleted successfully!');
  }
}

// ============================================
// Points System Management
// ============================================

function renderPointsSystem() {
  const container = document.getElementById('points-inputs-container');
  if (!container) return;

  const positions = Object.entries(adminState.pointsSystem.positions || {})
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

  container.innerHTML = positions.map(([position, points]) => `
    <div class="position-input-item">
      <label class="form-label" style="font-size: 0.75rem;">
        ${getOrdinal(parseInt(position))} Place
      </label>
      <input 
        type="number" 
        class="form-input" 
        name="points-${position}"
        value="${points}"
        min="0"
        required
        style="padding: 8px;"
      >
    </div>
  `).join('');
}

let pointsPositionCounter = 11;

function addPointsPosition() {
  const container = document.getElementById('points-inputs-container');
  
  const positionDiv = document.createElement('div');
  positionDiv.className = 'position-input-item';
  positionDiv.innerHTML = `
    <label class="form-label" style="font-size: 0.75rem;">
      ${getOrdinal(pointsPositionCounter)} Place
    </label>
    <input 
      type="number" 
      class="form-input" 
      name="points-${pointsPositionCounter}"
      value="0"
      min="0"
      required
      style="padding: 8px;"
    >
  `;
  
  container.appendChild(positionDiv);
  pointsPositionCounter++;
}

document.getElementById('points-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const newPositions = {};
  
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('points-')) {
      const position = key.replace('points-', '');
      newPositions[position] = parseInt(value);
    }
  }

  adminState.pointsSystem.positions = newPositions;
  renderPointsSystem();
  updateDownloadStats();
  
  alert('✅ Points system updated successfully!');
});

function getPointsForPosition(position) {
  return adminState.pointsSystem.positions[position] || 0;
}

// ============================================
// Download/Export Functions
// ============================================

function downloadJSON(type) {
  let data, filename;
  
  if (type === 'players') {
    data = { players: adminState.players };
    filename = 'players.json';
  } else if (type === 'events') {
    data = {
      pointsSystem: adminState.pointsSystem,
      events: adminState.events
    };
    filename = 'events.json';
  }

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert(`✅ ${filename} downloaded successfully!\n\nReplace the file in your data/ folder and commit to GitHub.`);
}

function updateDownloadStats() {
  document.getElementById('total-players-count').textContent = adminState.players.length;
  document.getElementById('total-events-count').textContent = adminState.events.length;
  document.getElementById('last-updated').textContent = new Date().toLocaleString();
}

// ============================================
// Utility Functions
// ============================================

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function showMessage(section, type, message) {
  const containerId = `${section}-message`;
  const container = document.getElementById(containerId);
  if (!container) return;

  const className = type === 'error' ? 'error-message' : 'success-message';
  container.innerHTML = `<div class="${className}">${message}</div>`;
  
  setTimeout(() => {
    container.innerHTML = '';
  }, 5000);
}

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  const joinedDateInput = document.getElementById('player-joined');
  const eventDateInput = document.getElementById('event-date');
  
  if (joinedDateInput) joinedDateInput.value = today;
  if (eventDateInput) eventDateInput.value = today;

  // Check authentication
  checkAuth();
});
