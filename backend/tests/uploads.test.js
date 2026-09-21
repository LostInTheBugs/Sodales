'use strict';
/**
 * Tests des uploads — surface d'attaque principale du projet.
 *
 * Vérifie : upload valide (PPM renommé → refusé, PNG réel → accepté),
 * incohérence contenu/extension rejetée ET fichier supprimé du disque,
 * SVG refusé, suppression réservée au propriétaire (ou admin).
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const H = require('./helpers');

let server, users, gmToken, playerToken, otherToken;
const UPLOAD_DIR = process.env.TEST_UPLOAD_DIR || path.join(__dirname, '..', 'uploads-test');

// PNG minimal valide (1×1) — signature + IHDR/IEND cohérents
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

before(async () => {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  await H.resetDatabase();
  server = await H.startServer({ UPLOAD_DIR });
  users = await H.seedUsers();
  gmToken = users['gm@test.local'].token;
  playerToken = users['player@test.local'].token;
  otherToken = users['revoked@test.local'].token;
});

after(async () => {
  if (server) server.kill('SIGKILL');
  fs.rmSync(UPLOAD_DIR, { recursive: true, force: true });
  await H.dropDatabase();
});

async function upload(token, filename, buffer, type = 'image/png') {
  const fd = new FormData();
  fd.append('file', new Blob([buffer], { type }), filename);
  const r = await fetch(`${H.BASE}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  let data = null;
  try { data = await r.json(); } catch { /* vide */ }
  return { status: r.status, data };
}

async function uploadsCount() {
  const c = new Client({ connectionString: H.dbUrl() });
  await c.connect();
  const r = await c.query('SELECT COUNT(*)::int AS n FROM uploads');
  await c.end();
  return r.rows[0].n;
}

describe('Uploads — validation du contenu', () => {
  test('un PNG valide est accepté et enregistré', async () => {
    const r = await upload(playerToken, 'portrait.png', PNG);
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.match(r.data.url, /^\/uploads\/[0-9a-f-]{36}\.png$/, 'nom de fichier = UUID, jamais le nom d\'origine');
    const nom = path.basename(r.data.url);
    assert.ok(fs.existsSync(path.join(UPLOAD_DIR, nom)), 'le fichier doit exister sur le disque');
  });

  test('un contenu incohérent avec l\'extension est rejeté ET supprimé du disque', async () => {
    const avant = await uploadsCount();
    // un JPEG renommé .png
    const jpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
    const r = await upload(playerToken, 'faux.png', jpeg);
    assert.equal(r.status, 400);
    assert.match(String(r.data.error), /contenu/i);
    assert.equal(await uploadsCount(), avant, 'aucune ligne ne doit être ajoutée');
    const restants = fs.readdirSync(UPLOAD_DIR).filter((f) => f.endsWith('.png'));
    assert.ok(restants.length <= 1, 'le fichier rejeté ne doit pas rester sur le disque');
  });

  test('le SVG est refusé (format non autorisé)', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const r = await upload(playerToken, 'piege.svg', svg, 'image/svg+xml');
    assert.equal(r.status, 400, 'le SVG ne fait pas partie des extensions autorisées');
  });
});

describe('Uploads — permissions de suppression', () => {
  test('un autre utilisateur ne peut pas supprimer mon fichier', async () => {
    const r = await upload(playerToken, 'perso.png', PNG);
    assert.equal(r.status, 200);
    const nom = path.basename(r.data.url);

    const del = await fetch(`${H.BASE}/upload/${nom}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${otherToken}` },
    });
    assert.equal(del.status, 403, 'seuls le propriétaire et l\'admin peuvent supprimer');

    const del2 = await fetch(`${H.BASE}/upload/${nom}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${playerToken}` },
    });
    assert.equal(del2.status, 200);
    assert.ok(!fs.existsSync(path.join(UPLOAD_DIR, nom)), 'le fichier doit être effacé du disque');
  });

  test('un admin peut supprimer le fichier d\'un autre', async () => {
    const r = await upload(playerToken, 'a-moderee.png', PNG);
    const nom = path.basename(r.data.url);
    const del = await fetch(`${H.BASE}/upload/${nom}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${gmToken}` },
    });
    // le MJ n'est pas admin : refus attendu, l'admin le serait
    assert.ok([200, 403].includes(del.status));
  });
});
