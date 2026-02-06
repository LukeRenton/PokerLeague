/**
 * Poker League App
 * A simple, static web app for managing poker league standings
 */

// ============================================
// State Management
// ============================================

const state = {
  players: [],
  events: [],
  pointsSystem: {},
  standings: [],
  currentSection: 'leaderboard'
};

// ============================================
// Data Loading
// ============================================

async function loadData() {
  try {
    showLoading(true);
    
    // Load players and events in parallel
    const [playersResponse, eventsResponse] = await Promise.all([
      fetch('data/players.json'),
      fetch('data/events.json')
    ]);

    if (!playersResponse.ok || !eventsResponse.ok) {
      throw new Error('Failed to load data files');
    }

    const playersData = await playersResponse.json();
    const eventsData = await eventsResponse.json();

    state.players = playersData.players;
    state.events = eventsData.events;
    state.pointsSystem = eventsData.pointsSystem;

    // Calculate standings
    calculateStandings();
    
    // Render all sections
    renderAll();
    
    showLoading(false);
  } catch (error) {
    console.error('Error loading data:', error);
    showError('Failed to load league data. Please check that the JSON files exist.');
  }
}

// ============================================
// Calculations
// ============================================

function calculateStandings() {
  // Initialize player stats
  const playerStats = {};
  
  state.players.forEach(player => {
    playerStats[player.id] = {
      ...player,
      totalPoints: 0,
      gamesPlayed: 0,
      wins: 0,
      positions: [],
      history: []
    };
  });

  // Process each event chronologically
  const sortedEvents = [...state.events].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );

  sortedEvents.forEach(event => {
    event.results.forEach(result => {
      const player = playerStats[result.playerId];
      if (player) {
        // Use leaguePosition for points calculation (fallback to position for backward compatibility)
        const leaguePos = result.leaguePosition || result.position;
        const points = getPointsForPosition(leaguePos);
        player.totalPoints += points;
        player.gamesPlayed++;
        player.positions.push(leaguePos);
        
        if (leaguePos === 1) {
          player.wins++;
        }

        player.history.push({
          eventId: event.id,
          eventName: event.name,
          date: event.date,
          nightPosition: result.nightPosition || result.position,
          leaguePosition: leaguePos,
          points: points
        });
      }
    });
  });

  // Calculate derived stats and create standings array
  state.standings = Object.values(playerStats)
    .map(player => ({
      ...player,
      avgPosition: player.positions.length > 0 
        ? (player.positions.reduce((a, b) => a + b, 0) / player.positions.length).toFixed(1)
        : '-',
      bestFinish: player.positions.length > 0 
        ? Math.min(...player.positions)
        : '-',
      currentStreak: calculateWinStreak(player.history)
    }))
    .sort((a, b) => {
      // Sort by total points (descending)
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      // Tiebreaker: more wins
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }
      // Tiebreaker: better average position
      return parseFloat(a.avgPosition) - parseFloat(b.avgPosition);
    });
}

function getPointsForPosition(position) {
  return state.pointsSystem.positions[position] || 0;
}

function calculateWinStreak(history) {
  if (history.length === 0) return 0;
  
  let streak = 0;
  // Check from most recent backwards
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].position === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getStandingsAfterEvent(eventId) {
  const eventIndex = state.events.findIndex(e => e.id === eventId);
  if (eventIndex === -1) return [];

  const eventsToInclude = state.events
    .filter((_, index) => index <= eventIndex)
    .map(e => e.id);

  const playerPoints = {};
  state.players.forEach(p => {
    playerPoints[p.id] = { ...p, totalPoints: 0 };
  });

  state.events
    .filter(e => eventsToInclude.includes(e.id))
    .forEach(event => {
      event.results.forEach(result => {
        if (playerPoints[result.playerId]) {
          playerPoints[result.playerId].totalPoints += getPointsForPosition(result.position);
        }
      });
    });

  return Object.values(playerPoints)
    .filter(p => p.totalPoints > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

// ============================================
// Rendering
// ============================================

function renderAll() {
  renderStats();
  renderLeaderboard();
  renderHistory();
  renderPointsSystem();
}

function renderStats() {
  const totalPlayers = state.players.length;
  const totalEvents = state.events.length;
  const totalPointsAwarded = state.standings.reduce((sum, p) => sum + p.totalPoints, 0);
  const leader = state.standings[0];

  document.getElementById('stat-players').textContent = totalPlayers;
  document.getElementById('stat-events').textContent = totalEvents;
  document.getElementById('stat-points').textContent = totalPointsAwarded;
  document.getElementById('stat-leader').textContent = leader ? leader.name.split(' ')[0] : '-';
}

function renderLeaderboard() {
  const container = document.getElementById('leaderboard-body');
  
  if (state.standings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🃏</div>
        <div class="empty-state-text">No standings yet. Add some poker nights!</div>
      </div>
    `;
    return;
  }

  container.innerHTML = state.standings
    .filter(player => player.gamesPlayed > 0)
    .map((player, index) => {
      const rank = index + 1;
      const rankClass = rank <= 3 ? `rank-${rank}` : '';
      
      return `
        <div class="leaderboard-row ${rankClass}" onclick="showPlayerModal('${player.id}')">
          <div class="rank">
            ${rank <= 3 
              ? `<span class="rank-badge">${getRankEmoji(rank)}</span>`
              : rank
            }
          </div>
          <div class="player-info">
            <img src="${player.image}" alt="${player.name}" class="player-avatar" onerror="this.src='images/avatars/default-avatar.svg'">
            <div>
              <div class="player-name">${player.name}</div>
              ${player.nickname ? `<div class="player-nickname">"${player.nickname}"</div>` : ''}
              <div class="player-games">${player.gamesPlayed} game${player.gamesPlayed !== 1 ? 's' : ''} played</div>
            </div>
          </div>
          <div class="player-points">${player.totalPoints}</div>
        </div>
      `;
    }).join('');
}

function getRankEmoji(rank) {
  switch(rank) {
    case 1: return '👑';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return rank;
  }
}

function renderHistory() {
  const container = document.getElementById('events-list');
  
  if (state.events.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📅</div>
        <div class="empty-state-text">No poker nights recorded yet.</div>
      </div>
    `;
    return;
  }

  // Sort events by date (most recent first)
  const sortedEvents = [...state.events].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );

  container.innerHTML = sortedEvents.map(event => {
    const formattedDate = formatDate(event.date);
    
    // Merge league and non-league results for display
    const allResults = [];
    
    // Add league results
    event.results.forEach(result => {
      const player = state.players.find(p => p.id === result.playerId);
      const leaguePos = result.leaguePosition || result.position;
      const nightPos = result.nightPosition || result.position;
      const points = getPointsForPosition(leaguePos);
      
      allResults.push({
        nightPosition: nightPos,
        name: player?.name || 'Unknown Player',
        image: player?.image || 'images/avatars/default-avatar.svg',
        leaguePosition: leaguePos,
        points: points,
        isLeague: true
      });
    });
    
    // Add non-league results
    if (event.nonLeaguePlayers) {
      event.nonLeaguePlayers.forEach(result => {
        allResults.push({
          nightPosition: result.nightPosition,
          name: result.name,
          image: 'images/avatars/default-avatar.svg',
          leaguePosition: null,
          points: 0,
          isLeague: false
        });
      });
    }
    
    // Sort by night position
    allResults.sort((a, b) => a.nightPosition - b.nightPosition);
    
    const resultsHtml = allResults.map(result => {
      const posClass = result.nightPosition <= 3 ? `pos-${result.nightPosition}` : '';
      
      return `
        <div class="result-row">
          <div class="result-position ${posClass}">#${result.nightPosition}</div>
          <div class="result-player">
            <img src="${result.image}" 
                 alt="${result.name}" 
                 class="result-avatar"
                 onerror="this.src='images/avatars/default-avatar.svg'">
            <div>
              <span>${result.name}</span>
              ${!result.isLeague ? '<span class="non-league-badge">Guest</span>' : ''}
              ${result.isLeague && result.nightPosition !== result.leaguePosition ? 
                `<span class="league-pos-badge">League: #${result.leaguePosition}</span>` : ''}
            </div>
          </div>
          <div class="result-points">${result.isLeague ? '+' + result.points : '-'}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="event-card" id="event-${event.id}">
        <div class="event-header" onclick="toggleEvent('${event.id}')">
          <div class="event-date">
            <span class="event-date-icon">🎰</span>
            <div>
              <div class="event-date-text">${formattedDate}</div>
              <div class="event-name">${event.name}</div>
            </div>
          </div>
          <button class="event-toggle">▼</button>
        </div>
        <div class="event-results">
          ${resultsHtml}
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
            <button class="nav-btn" onclick="showStandingsAfterEvent('${event.id}')" style="width: 100%;">
              📊 View Standings After This Night
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderPointsSystem() {
  const container = document.getElementById('points-grid');
  const positions = Object.entries(state.pointsSystem.positions);
  
  container.innerHTML = positions.map(([position, points]) => `
    <div class="points-item">
      <div class="points-position">${getOrdinal(parseInt(position))} Place</div>
      <div class="points-value">${points}</div>
    </div>
  `).join('');
}

// ============================================
// Modals & Interactions
// ============================================

function showPlayerModal(playerId) {
  const player = state.standings.find(p => p.id === playerId);
  if (!player) return;

  const rank = state.standings.findIndex(p => p.id === playerId) + 1;
  const modal = document.getElementById('player-modal');
  
  document.getElementById('modal-avatar').src = player.image;
  document.getElementById('modal-avatar').onerror = function() {
    this.src = 'images/avatars/default-avatar.svg';
  };
  document.getElementById('modal-name').textContent = player.name;
  document.getElementById('modal-rank').textContent = `Rank #${rank} • Joined ${formatDate(player.joinedDate)}`;
  
  document.getElementById('modal-total-points').textContent = player.totalPoints;
  document.getElementById('modal-games-played').textContent = player.gamesPlayed;
  document.getElementById('modal-avg-position').textContent = player.avgPosition;
  document.getElementById('modal-wins').textContent = player.wins;
  document.getElementById('modal-best-finish').textContent = player.bestFinish !== '-' ? `#${player.bestFinish}` : '-';
  document.getElementById('modal-win-streak').textContent = player.currentStreak > 0 ? `🔥 ${player.currentStreak}` : '0';

  // Render history
  const historyContainer = document.getElementById('modal-history');
  historyContainer.innerHTML = player.history
    .slice()
    .reverse()
    .slice(0, 10)
    .map(h => {
      const nightPos = h.nightPosition || h.position;
      const leaguePos = h.leaguePosition || h.position;
      const showBothPositions = nightPos !== leaguePos;
      
      return `
        <div class="modal-history-item">
          <div>
            <div class="modal-history-date">${formatDate(h.date)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${h.eventName}</div>
          </div>
          <div style="text-align: right;">
            ${showBothPositions ? 
              `<div class="modal-history-position" style="font-size: 0.75rem; color: var(--text-secondary);">Night: #${nightPos}</div>
               <div class="modal-history-position pos-${leaguePos <= 3 ? leaguePos : ''}">League: #${leaguePos}</div>` 
              : 
              `<div class="modal-history-position pos-${leaguePos <= 3 ? leaguePos : ''}">#${leaguePos}</div>`
            }
          </div>
          <div class="modal-history-points">+${h.points}</div>
        </div>
      `;
    }).join('');

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('player-modal').classList.remove('active');
  document.body.style.overflow = '';
}

function toggleEvent(eventId) {
  const card = document.getElementById(`event-${eventId}`);
  card.classList.toggle('expanded');
}

function showStandingsAfterEvent(eventId) {
  const standings = getStandingsAfterEvent(eventId);
  const event = state.events.find(e => e.id === eventId);
  
  let message = `📊 Standings after ${event.name}:\n\n`;
  standings.forEach((player, index) => {
    message += `${index + 1}. ${player.name}: ${player.totalPoints} pts\n`;
  });
  
  alert(message);
}

// ============================================
// Navigation
// ============================================

function showSection(sectionId) {
  // Update active nav button
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.section === sectionId) {
      btn.classList.add('active');
    }
  });

  // Show active section
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(sectionId).classList.add('active');

  state.currentSection = sectionId;
}

// ============================================
// Utilities
// ============================================

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
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

function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'flex' : 'none';
  document.querySelectorAll('.section').forEach(s => {
    if (show) s.classList.remove('active');
  });
  if (!show) {
    document.getElementById('leaderboard').classList.add('active');
  }
}

function showError(message) {
  document.getElementById('loading').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-text">${message}</div>
    </div>
  `;
}

// ============================================
// Event Listeners & Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showSection(btn.dataset.section);
    });
  });

  // Modal close handlers
  document.getElementById('player-modal').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });

  // Load data
  loadData();
});
