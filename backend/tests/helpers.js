'use strict';
/**
 * Harnais des tests d'autorisation Sodales.
 *
 * - crée une base jetable (sodales_test_<pid>) à partir de PG_SUPER_URL
 *   (ex. postgres://rpg:motdepasse@127.0.0.1:5432/postgres) ;
 * - démarre le vrai backend (node server.js) sur un port dédié ;
 * - injecte des utilisateurs de test en SQL et signe des jetons JWT avec le
 *   même secret que le serveur — cela évite les limiteurs de débit
 *   (register : 3/h, login : 5/15 min) qui fausseraient la suite.
 */
const { spawn } = require('child_process');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test-secret-not-for-production';
const SUFFIX = `${process.pid}`;
const TEST_DB = `sodales_test_${SUFFIX}`;
const PORT = String(8100 + (process.pid % 500));
const ORIGIN = `http://127.0.0.1:${PORT}`;
const BASE = `${ORIGIN}/rpg/api`;
const PASSWORD = 'Braise-2026!';

function superUrl() {
  const u = process.env.PG_SUPER_URL;
  if (!u) {
    throw new Error(
      'PG_SUPER_URL requis — ex. postgres://rpg:motdepasse@127.0.0.1:5432/postgres ' +
      '(ou utilisez backend/tests/run-local.sh)'
    );
  }
  return u.replace(/\/[^/]*$/, '/postgres');
}
function dbUrl(name = TEST_DB) {
  return superUrl().replace(/\/postgres$/, `/${name}`);
}

async function resetDatabase() {
  const c = new Client({ connectionString: superUrl() });
  await c.connect();
  await c.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
  await c.query(`CREATE DATABASE ${TEST_DB}`);
  await c.end();
}

async function dropDatabase() {
  try {
    const c = new Client({ connectionString: superUrl() });
    await c.connect();
    await c.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
    await c.end();
  } catch { /* best effort */ }
}

async function startServer() {
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      DATABASE_URL: dbUrl(),
      JWT_SECRET,
      PORT,
      NODE_ENV: 'test',
      ALLOWED_ORIGIN: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => process.env.TEST_VERBOSE && process.stdout.write(`[srv] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[srv-err] ${d}`));

  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) break;
    } catch { /* pas encore prêt */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  // Le serveur applique schema.sql au démarrage : attendre que les tables
  // existent réellement avant de rendre la main (le health répond avant).
  const c = new Client({ connectionString: dbUrl() });
  await c.connect();
  const deadline2 = Date.now() + 20000;
  for (;;) {
    try {
      const r = await c.query("SELECT to_regclass('public.users') AS t");
      if (r.rows[0] && r.rows[0].t) break;
    } catch { /* schéma pas encore prêt */ }
    if (Date.now() > deadline2) {
      await c.end();
      child.kill('SIGKILL');
      throw new Error('Le schéma n\'a pas été appliqué (table users absente)');
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  await c.end();
  return child;
}

/** Insère les utilisateurs de test et renvoie leurs jetons (signés localement). */
async function seedUsers() {
  const hash = bcrypt.hashSync(PASSWORD, 10);
  const c = new Client({ connectionString: dbUrl() });
  await c.connect();
  const r = await c.query(
    `INSERT INTO users (username, email, password_hash, invite_code, tier) VALUES
       ('MJ Test',   'gm@test.local',       $1, 'GMCODE1', 'creator'),
       ('Joueur',    'player@test.local',   $1, 'PLCODE1', 'player'),
       ('Etranger',  'outsider@test.local', $1, 'OUCODE1', 'player'),
       ('Admin',     'admin@test.local',    $1, 'ADCODE1', 'admin'),
       ('Revoque',   'revoked@test.local',  $1, 'RVCODE1', 'player')
     RETURNING id, username, email, is_admin, tier`,
    [hash]
  );
  await c.query(`UPDATE users SET is_admin = TRUE WHERE email = 'admin@test.local'`);
  await c.end();

  const byEmail = {};
  for (const u of r.rows) {
    byEmail[u.email] = {
      ...u,
      token: signToken({ ...u, is_admin: u.email === 'admin@test.local' }),
    };
  }
  return byEmail;
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      is_admin: !!user.is_admin,
      tier: user.tier || 'player',
      tv: user.token_version || 0,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// ── client HTTP minimal ───────────────────────────────────────
function makeApi(token) {
  const call = async (method, p, body) => {
    const r = await fetch(BASE + p, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data = null;
    try { data = await r.json(); } catch { /* corps vide */ }
    return { status: r.status, data };
  };
  return {
    get: (p) => call('GET', p),
    post: (p, b) => call('POST', p, b),
    put: (p, b) => call('PUT', p, b),
    del: (p, b) => call('DELETE', p, b),
  };
}

/** Connexion socket.io-client pour les tests temps réel. */
function connectSocket(token, { timeoutMs = 5000 } = {}) {
  const { io } = require('socket.io-client');
  const socket = io(ORIGIN, {
    path: '/rpg/socket.io',
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
    timeout: timeoutMs,
  });
  return socket;
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Attend qu'un événement précis arrive (ou rejette après délai). */
function once(socket, event, { timeoutMs = 5000, timeoutMsg } = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMsg || `Événement « ${event} » non reçu sous ${timeoutMs} ms`));
    }, timeoutMs);
    socket.once(event, (payload) => { clearTimeout(timer); resolve(payload); });
  });
}

module.exports = {
  BASE, ORIGIN, TEST_DB, PASSWORD, JWT_SECRET,
  resetDatabase, dropDatabase, startServer, seedUsers, signToken,
  makeApi, connectSocket, wait, once, dbUrl,
};
