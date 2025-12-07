// public/app.js

async function fetchReleases() {
  const statusEl = document.getElementById('status');
  const tableEl = document.getElementById('gamesTable');

  statusEl.textContent = 'Loading…';

  try {
    const res = await fetch('/api/releases/next-month');
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      statusEl.textContent = 'No games found.';
      return;
    }

    window.__allGames = data;

    renderTable(data);
    statusEl.textContent = `Showing ${data.length} games.`;
    tableEl.style.display = 'table';

  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Failed to load data.';
  }
}

function renderTable(games) {
  const tbody = document.getElementById('gamesBody');
  tbody.innerHTML = '';

  let currentDate = null;

  for (const game of games) {
    if (game.date !== currentDate) {
      currentDate = game.date;

      const dr = document.createElement('tr');
      dr.className = 'date-row';

      const td = document.createElement('td');
      td.colSpan = 3;
      td.textContent = game.humanDate;

      dr.appendChild(td);
      tbody.appendChild(dr);
    }

    const tr = document.createElement('tr');

    const dateCell = document.createElement('td');
    dateCell.textContent = '';
    tr.appendChild(dateCell);

    const nameCell = document.createElement('td');
    nameCell.textContent = game.name;
    tr.appendChild(nameCell);

    const platformCell = document.createElement('td');
    platformCell.textContent = game.platforms;
    tr.appendChild(platformCell);

    tbody.appendChild(tr);
  }
}

function setupFilter() {
  const input = document.getElementById('platformFilter');
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    const all = window.__allGames || [];

    if (!q) return renderTable(all);

    const filtered = all.filter(g =>
      g.platforms.toLowerCase().includes(q)
    );

    renderTable(filtered);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupFilter();
  fetchReleases();
});
