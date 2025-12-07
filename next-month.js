// next-month.js
import 'dotenv/config';

const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = process.env;

if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
  console.error('Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET in .env');
  process.exit(1);
}

// 1) Same token function you already tested
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

// 2) Compute "now" and "one month from now" as Unix timestamps (seconds)
function getDateRangeUnix() {
  const now = new Date();

  // Start of next calendar month (local time)
  const startOfNextMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1, // next month (0-based)
    1,                  // day 1
    0, 0, 0, 0
  );

  // Start of the month after that
  const startOfFollowingMonth = new Date(
    startOfNextMonth.getFullYear(),
    startOfNextMonth.getMonth() + 1,
    1,
    0, 0, 0, 0
  );

  const fromUnix = Math.floor(startOfNextMonth.getTime() / 1000);
  const toUnix = Math.floor(startOfFollowingMonth.getTime() / 1000);

  return { fromUnix, toUnix };
}


async function getUpcomingGames(accessToken) {
  const { fromUnix, toUnix } = getDateRangeUnix();

  // Helpful: log the range we’re actually querying
  console.log('Querying games from', new Date(fromUnix * 1000), 'to', new Date(toUnix * 1000));

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


// 4) Format the results into a readable list
function formatGames(games) {
  const rows = [];

  for (const game of games) {
    if (!game.first_release_date) continue;

    const date = new Date(game.first_release_date * 1000);

    const humanDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const platforms = game.platforms && game.platforms.length
      ? game.platforms
          .map(p => p.abbreviation || p.name)
          .join(', ')
      : 'Unknown platform';

    rows.push({
      name: game.name,
      slug: game.slug,
      date,
      humanDate,
      platforms,
    });
  }

  rows.sort((a, b) => a.date - b.date);

  if (rows.length === 0) {
    console.log('No games found for the next month with the current filters.');
    return;
  }

  let currentDay = null;
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10); // YYYY-MM-DD

    if (key !== currentDay) {
      currentDay = key;
      console.log('\n=== ' + row.humanDate + ' ===');
    }

    console.log(`• ${row.name} (${row.platforms})`);
  }
}


// 5) Main flow: get token, call IGDB, print games
async function main() {
  try {
    const token = await getAccessToken();
    const games = await getUpcomingGames(token);
    formatGames(games);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
