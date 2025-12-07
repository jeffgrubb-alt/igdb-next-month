// server.js
import 'dotenv/config';
import express from 'express';

const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = process.env;

if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
  console.error('Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET in .env');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Shared logic: token + date range + IGDB call ----------

async function getAccessToken() {
  const url = new URL('https://id.twitch.tv/oauth2/token');
  url.searchParams.set('client_id', TWITCH_CLIENT_ID);
  url.searchParams.set('client_secret', TWITCH_CLIENT_SECRET);
  url.searchParams.set('grant_type', 'client_credentials');

  const res = await fetch(url, { method: 'POST' });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

// "Next calendar month" date range
function getDateRangeUnixForNextMonth() {
  const now = new Date();

  const startOfNextMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1,
    0, 0, 0, 0
  );

  const startOfFollowingMonth = new Date(
    startOfNextMonth.getFullYear(),
    startOfNextMonth.getMonth() + 1,
    1,
    0, 0, 0, 0
  );

  const fromUnix = Math.floor(startOfNextMonth.getTime() / 1000);
  const toUnix = Math.floor(startOfFollowingMonth.getTime() / 1000);

  return { fromUnix, toUnix, startOfNextMonth, startOfFollowingMonth };
}

async function fetchUpcomingGamesRaw(accessToken) {
  const { fromUnix, toUnix, startOfNextMonth, startOfFollowingMonth } =
    getDateRangeUnixForNextMonth();

  console.log('Querying games from', startOfNextMonth, 'to', startOfFollowingMonth);

  const body = `
    fields
      name,
      slug,
      first_release_date,
      platforms.name,
      platforms.abbreviation,
      cover.image_id;
    where
      first_release_date != null &
      first_release_date >= ${fromUnix} &
      first_release_date < ${toUnix};
    sort first_release_date asc;
    limit 500;
  `;

  const res = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'text/plain',
    },
    body: body.trim(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IGDB request failed: ${res.status} ${text}`);
  }

  const games = await res.json();
  return games;
}

// Transform IGDB response into a flat, UI-friendly array
function transformGamesForUi(games) {
  const rows = [];

  for (const game of games) {
    if (!game.first_release_date) continue;

    const date = new Date(game.first_release_date * 1000);

    const humanDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const isoDate = date.toISOString().slice(0, 10); // YYYY-MM-DD

    const platforms = game.platforms && game.platforms.length
      ? game.platforms
          .map(p => p.abbreviation || p.name)
          .join(', ')
      : 'Unknown';

    // Build a cover URL if IGDB provided an image_id
    // Fallback to null if there's no cover.
    let coverUrl = null;
    if (game.cover && game.cover.image_id) {
      // t_cover_big is a nice medium-large size; can tweak later.
      coverUrl = `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`;
    }

    rows.push({
      date: isoDate,
      humanDate,
      name: game.name,
      slug: game.slug,
      platforms,
      coverUrl,
    });
  }

  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return rows;
}


// ---------- API route ----------

// GET /api/releases/next-month -> JSON array of games
app.get('/api/releases/next-month', async (req, res) => {
  try {
    const token = await getAccessToken();
    const rawGames = await fetchUpcomingGamesRaw(token);
    const rows = transformGamesForUi(rawGames);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch IGDB data' });
  }
});

// ---------- Static files (frontend) ----------

// Serve anything in ./public as static assets
app.use(express.static('public'));

// ---------- Start server ----------

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
