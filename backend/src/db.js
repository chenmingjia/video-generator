const path = require('path');
const fs = require('fs');
let _clientPromise;

async function getClient() {
  if (_clientPromise) return _clientPromise;
  _clientPromise = (async () => {
    const { createClient } = await import('@libsql/client');
    const url = process.env.LIBSQL_URL || `file:${path.resolve(__dirname, '..', 'data', 'app.sqlite')}`;
    const authToken = process.env.LIBSQL_AUTH_TOKEN;
    const dir = path.resolve(__dirname, '..', 'data');
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch {}
    const client = createClient({ url, authToken });
    await ensureSchema(client);
    return client;
  })();
  return _clientPromise;
}

async function ensureSchema(client) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      prompt TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS scenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location TEXT NOT NULL,
      emotion TEXT,
      image_url TEXT,
      prompt TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS storyboards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shot_index INTEGER NOT NULL,
      camera TEXT,
      duration_sec INTEGER,
      visual TEXT,
      prompt TEXT,
      on_screen_text TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS episodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      duration_sec INTEGER,
      people_cnt INTEGER,
      shots_cnt INTEGER,
      scenes_cnt INTEGER,
      thumb TEXT,
      video_url TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS workflows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      state_json TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS generated_videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      session_id TEXT,
      prompt TEXT,
      cover_image_url TEXT,
      video_url TEXT,
      status TEXT DEFAULT 'polling',
      error TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
  `);
}

module.exports = { getClient };
