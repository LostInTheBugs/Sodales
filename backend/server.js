const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./db');
const fs = require('fs');
const path = require('path');

// ── CORS : jamais de joker implicite ─────────────────────────
// Sans ALLOWED_ORIGIN, aucun en-tête CORS n'est émis : l'application (même
// origine, servie par nginx) fonctionne, et toute lecture cross-origin est
// refusée par le navigateur. '*'' explicite reste possible si voulu.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
if (!ALLOWED_ORIGIN) {
  console.warn('[SEC] ALLOWED_ORIGIN non défini — CORS limité à la même origine (définissez-le pour un accès cross-origin explicite).');
}
const CORS_ORIGIN = ALLOWED_ORIGIN || false;

const app = express();
// Nombre de proxys de confiance devant l'application (express-rate-limit).
// 1 = un seul proxy (nginx intégré ou proxy externe qui réécrit X-Forwarded-For).
// Multi-hop (ex. CDN + nginx) : TRUST_PROXY=2, ou le nombre de sauts réels.
// Vérifié : un X-Forwarded-For forgé par le client est ignoré (nginx ajoute
// l'adresse réelle en dernier, et Express ne lit que le dernier saut de confiance).
app.set('trust proxy', (() => {
  const v = process.env.TRUST_PROXY;
  if (v === undefined || v === '') return 1;
  const n = Number(v);
  return Number.isNaN(n) ? v : n; // nombre, ou expression acceptée par Express ('loopback', …)
})());
const server = http.createServer(app);

// ── Socket.io ────────────────────────────────────────────────
const io = new Server(server, {
  path: '/rpg/socket.io',
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});
require('./socket')(io);

// Exposer io pour les routes qui en ont besoin (ex. admin)
app.set('io', io);

// ── Middleware ───────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));

// ── Health check ─────────────────────────────────────────────
app.get('/rpg/api/health', (req, res) => res.json({ status: 'ok' }));

// ── Routes ───────────────────────────────────────────────────
app.use('/rpg/api/auth',       require('./routes/auth'));
app.use('/rpg/api/campaigns',  require('./routes/campaigns'));
app.use('/rpg/api/campaigns/:id/characters', require('./routes/characters'));
app.use('/rpg/api/campaigns/:id/maps',       require('./routes/maps'));
app.use('/rpg/api/upload',                   require('./routes/upload'));
app.use('/rpg/api/admin',                    require('./routes/admin'));
app.use('/rpg/api/account',                  require('./routes/account'));
app.use('/rpg/api/macros',                   require('./routes/macros'));
app.use('/rpg/api/campaigns/:id/handouts',   require('./routes/handouts'));
app.use('/rpg/api/campaigns/:id/tables',     require('./routes/tables'));
app.use('/rpg/api/stats',                    require('./routes/stats'));

// ── Init DB ──────────────────────────────────────────────────
async function initDB() {
  // Migrations numérotées (backend/migrations/NNN_*.sql) : idempotentes,
  // sérialisées par verrou consultatif, compatibles bases existantes.
  const { runMigrations } = require('./migrations/run');
  try {
    const { applied } = await runMigrations(db);
    console.log(applied.length
      ? `[DB] ${applied.length} migration(s) appliquée(s)`
      : '[DB] Migrations à jour');
  } catch (err) {
    console.error('[DB] Erreur initialisation schéma:', err.message);
  }
}

// ── Démarrage ────────────────────────────────────────────────
const PORT = process.env.PORT || 8007;
server.listen(PORT, async () => {
  console.log(`[RPG] Serveur démarré sur le port ${PORT}`);
  await initDB();
});
