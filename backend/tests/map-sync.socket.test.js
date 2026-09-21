'use strict';
/**
 * Tests de synchronisation temps réel — carte & jetons (socket.io).
 *
 * Couvre les zones où des régressions sont apparues pendant le découpage de
 * game.html et les passes d'audit :
 *   - déplacement de jeton : diffusion aux autres membres + persistance ;
 *   - propriété : un joueur ne bouge que le jeton de son personnage
 *     (et pas un PNJ ni celui d'un autre joueur) ;
 *   - changement de carte : contenu filtré pour les non-MJ (jetons visibles
 *     uniquement — point 4 de l'audit) ;
 *   - brouillard : réservé au MJ, diffusé et persisté ;
 *   - cloisonnement : aucune fuite entre campagnes.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const H = require('./helpers');

let server, db, users;
let campaignA, campaignB, invA, invB;
let mapA1, mapA2, mapB1;
let tokOwner, tokOther, tokNpc, tokB;
let gmToken, playerToken, player2Token;
const sockets = [];

before(async () => {
  await H.resetDatabase();
  server = await H.startServer();
  users = await H.seedUsers();
  gmToken = users['gm@test.local'].token;
  playerToken = users['player@test.local'].token;
  player2Token = users['revoked@test.local'].token; // 2e joueur (aucune révocation dans ce fichier)

  const gm = H.makeApi(gmToken);
  const a = await gm.post('/campaigns', { name: 'Synchro A' });
  assert.equal(a.status, 201, JSON.stringify(a.data));
  campaignA = a.data.id; invA = a.data.invite_code;
  const b = await gm.post('/campaigns', { name: 'Synchro B' });
  assert.equal(b.status, 201, JSON.stringify(b.data));
  campaignB = b.data.id; invB = b.data.invite_code;

  const join = async (token, code) => {
    const r = await H.makeApi(token).post('/campaigns/join', { invite_code: code });
    assert.ok([200, 201, 409].includes(r.status), JSON.stringify(r.data));
  };
  await join(playerToken, invA);
  await join(player2Token, invA);
  await join(playerToken, invB); // pour le test de cloisonnement (room B)

  // Cartes, personnages et jetons posés en SQL : état déterministe.
  db = new Client({ connectionString: H.dbUrl() });
  await db.connect();
  mapA1 = (await db.query(`INSERT INTO maps (campaign_id, name, is_active) VALUES ($1,'Vallée',TRUE) RETURNING id`, [campaignA])).rows[0].id;
  mapA2 = (await db.query(`INSERT INTO maps (campaign_id, name) VALUES ($1,'Donjon') RETURNING id`, [campaignA])).rows[0].id;
  mapB1 = (await db.query(`INSERT INTO maps (campaign_id, name, is_active) VALUES ($1,'Lointaine',TRUE) RETURNING id`, [campaignB])).rows[0].id;

  const chP1 = (await db.query(`INSERT INTO characters (campaign_id, user_id, name) VALUES ($1,$2,'Héros 1') RETURNING id`, [campaignA, users['player@test.local'].id])).rows[0].id;
  const chP2 = (await db.query(`INSERT INTO characters (campaign_id, user_id, name) VALUES ($1,$2,'Héros 2') RETURNING id`, [campaignA, users['revoked@test.local'].id])).rows[0].id;

  tokOwner = (await db.query(`INSERT INTO tokens (map_id, character_id, label, x, y) VALUES ($1,$2,'Héros 1',100,100) RETURNING id`, [mapA1, chP1])).rows[0].id;
  tokOther = (await db.query(`INSERT INTO tokens (map_id, character_id, label, x, y) VALUES ($1,$2,'Héros 2',200,200) RETURNING id`, [mapA1, chP2])).rows[0].id;
  tokNpc = (await db.query(`INSERT INTO tokens (map_id, character_id, label, x, y, visible) VALUES ($1,NULL,'Embuscade',300,300,FALSE) RETURNING id`, [mapA1])).rows[0].id;
  tokB = (await db.query(`INSERT INTO tokens (map_id, label, x, y) VALUES ($1,'Éclaireur',50,50) RETURNING id`, [mapB1])).rows[0].id;
});

after(async () => {
  for (const s of sockets) { try { s.close(); } catch { /* déjà fermé */ } }
  if (db) await db.end();
  if (server) server.kill('SIGKILL');
  await H.dropDatabase();
});

function track(socket) { sockets.push(socket); return socket; }

/** Connecte un socket et le fait rejoindre une campagne. */
async function join(token, campaignId) {
  const s = track(H.connectSocket(token));
  await new Promise((r, j) => { s.on('connect', r); s.on('connect_error', j); });
  s.emit('join_campaign', { campaign_id: campaignId });
  await H.wait(400);
  return s;
}

/** Collecte tout ce qu'un socket reçoit, pour prouver une absence. */
function collect(socket) {
  const seen = [];
  socket.onAny((name, payload) => seen.push({ name, payload }));
  return seen;
}

const posOf = async (id) => (await db.query('SELECT x, y FROM tokens WHERE id = $1', [id])).rows[0];

describe('Jetons — déplacement, propriété, persistance', () => {
  test('le MJ déplace un jeton : diffusion aux autres membres + persistance', async () => {
    const gm = await join(gmToken, campaignA);
    const player = await join(playerToken, campaignA);
    const received = H.once(player, 'token_moved', { timeoutMs: 6000 });
    gm.emit('token_move', { campaign_id: campaignA, map_id: mapA1, token_id: tokOwner, x: 250, y: 350, facing: 90 });
    const ev = await received;
    assert.equal(ev.token_id, tokOwner);
    assert.equal(ev.x, 250);
    assert.equal(ev.y, 350);
    assert.equal(ev.facing, 90);
    const pos = await posOf(tokOwner);
    assert.equal(pos.x, 250);
    assert.equal(pos.y, 350);
  });

  test('un joueur déplace le jeton de SON personnage : accepté', async () => {
    const gm = await join(gmToken, campaignA);
    const player = await join(playerToken, campaignA);
    const received = H.once(gm, 'token_moved', { timeoutMs: 6000 });
    player.emit('token_move', { campaign_id: campaignA, map_id: mapA1, token_id: tokOwner, x: 420, y: 260 });
    const ev = await received;
    assert.equal(ev.token_id, tokOwner);
    assert.equal(ev.x, 420);
    const pos = await posOf(tokOwner);
    assert.equal(pos.x, 420);
  });

  test('un joueur NE PEUT PAS déplacer le jeton d\'un autre joueur : refus silencieux', async () => {
    const gm = await join(gmToken, campaignA);
    const player = await join(playerToken, campaignA);
    const seen = collect(gm);
    player.emit('token_move', { campaign_id: campaignA, map_id: mapA1, token_id: tokOther, x: 999, y: 999 });
    await H.wait(900);
    assert.equal(seen.length, 0, `rien ne doit être diffusé : ${JSON.stringify(seen)}`);
    const pos = await posOf(tokOther);
    assert.equal(pos.x, 200);
    assert.equal(pos.y, 200);
  });

  test('un joueur NE PEUT PAS déplacer un jeton PNJ (sans personnage) : refus silencieux', async () => {
    const gm = await join(gmToken, campaignA);
    const player = await join(playerToken, campaignA);
    const seen = collect(gm);
    player.emit('token_move', { campaign_id: campaignA, map_id: mapA1, token_id: tokNpc, x: 888, y: 888 });
    await H.wait(900);
    assert.equal(seen.length, 0);
    const pos = await posOf(tokNpc);
    assert.equal(pos.x, 300);
  });

  test('un jeton invisible déplacé par le MJ n\'est pas diffusé aux joueurs', async () => {
    const gm = await join(gmToken, campaignA);
    const gmListener = await join(gmToken, campaignA); // 2e socket MJ : témoin de la diffusion
    const player = await join(playerToken, campaignA);
    const seenPlayer = collect(player);
    // l'émetteur est exclu de sa propre diffusion ; un autre socket MJ, lui, doit recevoir
    const gmGot = H.once(gmListener, 'token_moved', { timeoutMs: 6000 });
    gm.emit('token_move', { campaign_id: campaignA, map_id: mapA1, token_id: tokNpc, x: 310, y: 320 });
    const forGm = await gmGot;
    assert.equal(forGm.token_id, tokNpc, 'un autre socket MJ doit recevoir le déplacement');
    await H.wait(800);
    assert.equal(seenPlayer.length, 0, `le joueur ne doit rien apprendre du jeton caché : ${JSON.stringify(seenPlayer)}`);
    const pos = await posOf(tokNpc);
    assert.equal(pos.x, 310, 'le déplacement doit tout de même être persisté');

    // contrôle positif : un jeton visible, lui, est bien diffusé aux joueurs
    const playerGot = H.once(player, 'token_moved', { timeoutMs: 6000 });
    gm.emit('token_move', { campaign_id: campaignA, map_id: mapA1, token_id: tokOther, x: 210, y: 220 });
    assert.equal((await playerGot).token_id, tokOther);
  });

  test('PV et conditions d\'un jeton invisible : réservés aux MJ', async () => {
    const gm = await join(gmToken, campaignA);
    const player = await join(playerToken, campaignA);
    const seenPlayer = collect(player);

    const gmHp = H.once(gm, 'token_hp_updated', { timeoutMs: 6000 });
    gm.emit('token_hp', { campaign_id: campaignA, token_id: tokNpc, hp_current: 7 });
    assert.equal((await gmHp).hp_current, 7);

    const gmCond = H.once(gm, 'token_conditions_updated', { timeoutMs: 6000 });
    gm.emit('token_conditions', { campaign_id: campaignA, token_id: tokNpc, conditions: ['empoisonné'] });
    assert.deepEqual((await gmCond).conditions, ['empoisonné']);

    await H.wait(800);
    assert.equal(seenPlayer.length, 0, `aucune information ne doit filtrer sur le jeton caché : ${JSON.stringify(seenPlayer)}`);

    // contrôle positif : sur un jeton visible, les joueurs sont bien prévenus
    const playerHp = H.once(player, 'token_hp_updated', { timeoutMs: 6000 });
    gm.emit('token_hp', { campaign_id: campaignA, token_id: tokOwner, hp_current: 4 });
    assert.equal((await playerHp).hp_current, 4);
    const playerCond = H.once(player, 'token_conditions_updated', { timeoutMs: 6000 });
    gm.emit('token_conditions', { campaign_id: campaignA, token_id: tokOwner, conditions: ['à terre'] });
    assert.deepEqual((await playerCond).conditions, ['à terre']);
  });

  test('la suppression d\'un jeton invisible n\'est pas diffusée aux joueurs', async () => {
    const gm = await join(gmToken, campaignA);
    const player = await join(playerToken, campaignA);
    const created = H.once(gm, 'token_created', { timeoutMs: 6000 });
    gm.emit('token_create', { campaign_id: campaignA, map_id: mapA2, label: 'Piège', x: 5, y: 5, visible: false });
    const hidden = await created;

    const seenPlayer = collect(player);
    const gmDel = H.once(gm, 'token_deleted', { timeoutMs: 6000 });
    gm.emit('token_delete', { campaign_id: campaignA, token_id: hidden.id });
    await gmDel;
    await H.wait(700);
    assert.equal(seenPlayer.length, 0, `la suppression doit rester invisible : ${JSON.stringify(seenPlayer)}`);
  });
});

describe('Carte — changement et filtrage des jetons invisibles', () => {
  test('map_change : le joueur reçoit la carte SANS le jeton invisible, le MJ le reçoit', async () => {
    const gm = await join(gmToken, campaignA);
    const player = await join(playerToken, campaignA);
    const gmGot = H.once(gm, 'map_changed', { timeoutMs: 6000 });
    const playerGot = H.once(player, 'map_changed', { timeoutMs: 6000 });
    gm.emit('map_change', { campaign_id: campaignA, map_id: mapA1 });

    const forGm = await gmGot;
    const forPlayer = await playerGot;
    assert.equal(forGm.map.id, mapA1);
    assert.equal(forGm.map.name, 'Vallée');

    const idsFor = (payload) => payload.tokens.map((t) => t.id);
    assert.ok(idsFor(forGm).includes(tokNpc), 'le MJ doit voir le jeton invisible');
    assert.equal(idsFor(forGm).length, 3);
    assert.ok(!idsFor(forPlayer).includes(tokNpc), 'le jeton invisible ne doit PAS être envoyé au joueur');
    assert.deepEqual(idsFor(forPlayer).sort(), [tokOwner, tokOther].sort());
  });

  test('un jeton invisible créé par le MJ n\'est diffusé qu\'aux MJ', async () => {
    const gm = await join(gmToken, campaignA);
    const player = await join(playerToken, campaignA);
    const seenPlayer = collect(player);
    const gmGot = H.once(gm, 'token_created', { timeoutMs: 6000 });
    gm.emit('token_create', {
      campaign_id: campaignA, map_id: mapA2, label: 'Embuscade 2', x: 10, y: 20, visible: false,
    });
    const created = await gmGot;
    assert.equal(created.visible, false);
    await H.wait(700);
    assert.equal(seenPlayer.length, 0, `le joueur ne doit rien recevoir : ${JSON.stringify(seenPlayer)}`);

    // contrôle positif : un jeton visible, lui, est bien diffusé aux joueurs
    const playerGot = H.once(player, 'token_created', { timeoutMs: 6000 });
    gm.emit('token_create', { campaign_id: campaignA, map_id: mapA2, label: 'Éclaireur', x: 30, y: 40 });
    const visible = await playerGot;
    assert.equal(visible.label, 'Éclaireur');
    assert.equal(visible.visible, true);
  });
});

describe('Brouillard de guerre', () => {
  test('fog_reveal par le MJ : diffusé au joueur et persisté', async () => {
    const gm = await join(gmToken, campaignA);
    const player = await join(playerToken, campaignA);
    const received = H.once(player, 'fog_update', { timeoutMs: 6000 });
    gm.emit('fog_reveal', { campaign_id: campaignA, map_id: mapA1, circles: [{ x: 120, y: 140, r: 150 }] });
    const ev = await received;
    assert.equal(ev.map_id, mapA1);
    assert.equal(ev.circles.length, 1);
    assert.equal(ev.circles[0].r, 150);
    assert.equal(ev.allRevealed, false);

    // La persistance est lancée après la diffusion : on attend qu'elle arrive.
    let state = null;
    for (let i = 0; i < 20; i++) {
      const saved = (await db.query('SELECT fog_of_war FROM maps WHERE id = $1', [mapA1])).rows[0].fog_of_war;
      state = typeof saved === 'string' ? JSON.parse(saved) : saved;
      if (Array.isArray(state?.circles) && state.circles.length === 1) break;
      await H.wait(150);
    }
    assert.ok(Array.isArray(state?.circles), 'fog_of_war doit être persisté en base');
    assert.equal(state.circles.length, 1, 'le brouillard doit être persisté');
  });

  test('fog_reveal par un joueur : refusé (MJ uniquement)', async () => {
    const gm = await join(gmToken, campaignA);
    const player = await join(playerToken, campaignA);
    const seenGm = collect(gm);
    const seenPlayer = collect(player);
    player.emit('fog_reveal', { campaign_id: campaignA, map_id: mapA1, circles: [{ x: 1, y: 1, r: 9999 }] });
    await H.wait(900);
    assert.equal(seenGm.length, 0, 'le joueur ne doit rien diffuser');
    assert.equal(seenPlayer.length, 0);

    // contrôle positif : le MJ, lui, diffuse
    const received = H.once(player, 'fog_update', { timeoutMs: 6000 });
    gm.emit('fog_reveal', { campaign_id: campaignA, map_id: mapA1, circles: [{ x: 10, y: 10, r: 60 }] });
    const ev = await received;
    assert.equal(ev.circles.length, 2, 'les deux cercles du MJ sont cumulés');
  });
});

describe('Cloisonnement entre campagnes', () => {
  test('une activité dans la campagne A ne parvient pas à un membre présent dans la campagne B', async () => {
    // le joueur rejoint la room B (socket dédié)
    const playerInB = await join(playerToken, campaignB);
    const seen = collect(playerInB);

    // contrôle positif : le MJ (socket dédié à B) déplace un jeton de B → reçu
    const gmB = await join(gmToken, campaignB);
    const positive = H.once(playerInB, 'token_moved', { timeoutMs: 6000 });
    gmB.emit('token_move', { campaign_id: campaignB, map_id: mapB1, token_id: tokB, x: 70, y: 80 });
    const ev = await positive;
    assert.equal(ev.token_id, tokB);

    // cloisonnement : le MJ déplace un jeton de A → le socket de B ne voit rien
    const gm = await join(gmToken, campaignA);
    const before = seen.length;
    gm.emit('token_move', { campaign_id: campaignA, map_id: mapA1, token_id: tokOwner, x: 11, y: 12 });
    await H.wait(900);
    assert.equal(seen.length, before, `aucune fuite attendue : ${JSON.stringify(seen.slice(before))}`);
  });
});
