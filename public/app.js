// public/app.js

// Global state
let currentMode = 'month'; // "month" or "30days"

// Fetch releases for a given mode: "month" (next calendar month) or "30days" (next 30 days)
async function fetchReleases(mode = 'month') {
  const statusEl = document.getElementById('status');
  const tableEl = document.getElementById('gamesTable');

  currentMode = mode;
  statusEl.textContent = 'Loading…';

  try {
    const res = await fetch(`/api/releases/next-month?mode=${encodeURIComponent(mode)}`);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      statusEl.textContent = 'No games found.';
      tableEl.style.display = 'none';
      window.__allGames = [];
      return;
    }

    window.__allGames = data;

    applyFilters(); // renders and updates status
    tableEl.style.display = 'table';
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Failed to load data.';
    tableEl.style.display = 'none';
    window.__allGames = [];
  }
}

// Apply platform checkboxes + text filter
function applyFilters() {
  const all = window.__allGames || [];
  const statusEl = document.getElementById('status');
  const platformInput = document.getElementById('platformFilter');
  const textQuery = (platformInput.value || '').trim().toLowerCase();

  // Collect checked platform tokens
  const checks = document.querySelectorAll('.platform-check');
  const activeTokens = [];
  checks.forEach(cb => {
    if (cb.checked && cb.dataset.token) {
      activeTokens.push(cb.dataset.token.toLowerCase());
    }
  });

  let filtered = all;

  // Filter by platform checkboxes first (if any are selected)
  if (activeTokens.length > 0) {
    filtered = filtered.filter(game => {
      const p = (game.platforms || '').toLowerCase();
      return activeTokens.some(token => p.includes(token));
    });
  }

  // Then apply free-text platform filter (optional)
  if (textQuery) {
    filtered = filtered.filter(game => {
      const p = (game.platforms || '').toLowerCase();
      return p.includes(textQuery);
    });
  }

  renderTable(filtered);

  const rangeLabel = currentMode === '30days' ? 'Next 30 days' : 'Next calendar month';

  if (filtered.length === all.length && !textQuery && activeTokens.length === 0) {
    statusEl.textContent = `Showing ${filtered.length} games. (${rangeLabel})`;
  } else {
    statusEl.textContent =
      `Showing ${filtered.length} of ${all.length} games. (${rangeLabel}, filters active)`;
  }
}

function renderTable(games) {
  const tbody = document.getElementById('gamesBody');
  tbody.innerHTML = '';

  let currentDate = null;

  for (const game of games) {
    // Date header row when the date changes
    if (game.date !== currentDate) {
      currentDate = game.date;

      const dr = document.createElement('tr');
      dr.className = 'date-row';

      const td = document.createElement('td');
      // 4 columns: Date, Cover, Game, Platforms
      td.colSpan = 4;
      td.textContent = game.humanDate;

      dr.appendChild(td);
      tbody.appendChild(dr);
    }

    const tr = document.createElement('tr');

    // 1) Date cell (blank, date is in header row)
    const dateCell = document.createElement('td');
    dateCell.textContent = '';
    tr.appendChild(dateCell);

    // 2) Cover cell
    const coverCell = document.createElement('td');
    if (game.coverUrl) {
      const img = document.createElement('img');
      img.src = game.coverUrl;
      img.alt = `${game.name} cover`;
      img.style.maxWidth = '60px';
      img.style.borderRadius = '4px';
      img.loading = 'lazy';
      coverCell.appendChild(img);
    } else {
      coverCell.textContent = '—';
    }
    tr.appendChild(coverCell);

    // 3) Game name cell
    const nameCell = document.createElement('td');
    nameCell.textContent = game.name;
    nameCell.className = 'game-name';
    tr.appendChild(nameCell);

    // 4) Platforms cell
    const platformCell = document.createElement('td');
    platformCell.textContent = game.platforms;
    platformCell.className = 'platforms';
    tr.appendChild(platformCell);

    tbody.appendChild(tr);
  }
}

function setupFilter() {
  const input = document.getElementById('platformFilter');
  input.addEventListener('input', () => {
    applyFilters();
  });
}

function setupPlatformFilters() {
  const checks = document.querySelectorAll('.platform-check');
  checks.forEach(cb => {
    cb.addEventListener('change', () => {
      applyFilters();
    });
  });
}

function setupModeSwitcher() {
  const radios = document.querySelectorAll('input[name="mode"]');
  const platformInput = document.getElementById('platformFilter');

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      const selected = document.querySelector('input[name="mode"]:checked').value;

      // Optional: clear filters when switching mode
      platformInput.value = '';
      const checks = document.querySelectorAll('.platform-check');
      checks.forEach(cb => (cb.checked = false));

      fetchReleases(selected);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupFilter();
  setupPlatformFilters();
  setupModeSwitcher();
  fetchReleases('month'); // default mode
});
