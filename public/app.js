// public/app.js

// Fetch releases for a given mode: "month" (next calendar month) or "30days" (next 30 days)
async function fetchReleases(mode = 'month') {
  const statusEl = document.getElementById('status');
  const tableEl = document.getElementById('gamesTable');

  statusEl.textContent = 'Loading…';

  try {
    const res = await fetch(`/api/releases/next-month?mode=${encodeURIComponent(mode)}`);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      statusEl.textContent = 'No games found.';
      tableEl.style.display = 'none';
      return;
    }

    window.__allGames = data;

    renderTable(data);
    statusEl.textContent = `Showing ${data.length} games. (${mode === '30days' ? 'Next 30 days' : 'Next calendar month'})`;
    tableEl.style.display = 'table';
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Failed to load data.';
    tableEl.style.display = 'none';
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
    const q = input.value.trim().toLowerCase();
    const all = window.__allGames || [];

    if (!q) {
      renderTable(all);
      return;
    }

    const filtered = all.filter(g =>
      (g.platforms || '').toLowerCase().includes(q)
    );

    renderTable(filtered);
  });
}

function setupModeSwitcher() {
  const radios = document.querySelectorAll('input[name="mode"]');
  const platformInput = document.getElementById('platformFilter');

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      const selected = document.querySelector('input[name="mode"]:checked').value;

      // Optional: clear filter when switching mode
      platformInput.value = '';

      fetchReleases(selected);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupFilter();
  setupModeSwitcher();
  fetchReleases('month'); // default mode
});
