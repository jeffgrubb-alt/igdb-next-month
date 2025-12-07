// get-token.js
import 'dotenv/config';

const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = process.env;

if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
  console.error('Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET in .env');
  process.exit(1);
}

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

async function main() {
  try {
    const token = await getAccessToken();
    console.log('Access token acquired successfully.');
    // If you want to see it, uncomment the next line:
    // console.log('Token:', token);
  } catch (err) {
    console.error('Error getting access token:', err.message);
    process.exit(1);
  }
}

main();
