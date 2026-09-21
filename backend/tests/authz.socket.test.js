'use strict';
/**
 * Tests d'autorisation — WebSocket (socket.io).
 * Vérifie le refus des non-membres, le cloisonnement des événements MJ,
 * la livraison normale du chat, et le refus des jetons révoqués.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const H = require('./helpers');

let server, users, campaignId, gmToken, playerToken, outsiderToken, revokedToken;
const sockets = [];

before(async () => {
  await H.resetDatabase();
  server = await H.startServer();
  users = await H.seedUsers();

  gmToken = users['gm@test.local'].token;
  playerToken = users['player@test.local'].token;
  outsiderToken = users['outsider@test.local'].token;
  revokedToken = users['revoked@test.local'].token;

  const gm = H.makeApi(gmToken);
  const camp = await gm.post('/campaigns', { name: 'Campagne socket' });
  assert.equal(camp.status, 201, JSON.stringify(camp.data));
  campaignId = camp.data.id;

  const player = H.makeApi(playerToken);
  const join = await player.post('/campaigns/join', { invite_code: camp.data.invite_code });
  assert.ok([200, 201, 409].includes(join.status), JSON.stringify(join.data));
});

after(async () => {
  for (const s of sockets) { try { s.close(); } catch { /* déjà fermé */ } }
  if (server) server.kill('SIGKILL');
  await H.dropDatabase();
});

function track(socket) {
  sockets.push(socket);
  return socket;
}

describe('Sockets — cloisonnement et rôles', () => {
  test('un non-membre est refusé à join_campaign', async () => {
    const outsider = track(H.connectSocket(outsiderToken));
    const err = await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('aucune réponse au join_campaign')), 6000);
      outsider.on('error', (e) => { clearTimeout(t); resolve(e); });
      outsider.on('connect', () => outsider.emit('join_campaign', { campaign_id: campaignId }));
      outsider.on('connect_error', (e) => { clearTimeout(t); reject(e); });
    });
    assert.equal(err.message, 'Accès refusé');
    outsider.close();
  });

  test('le chat d\'un joueur membre atteint le MJ (contrôle positif)', async () => {
    const gm = track(H.connectSocket(gmToken));
    const player = track(H.connectSocket(playerToken));
    await Promise.all([
      new Promise((r, j) => { gm.on('connect', r); gm.on('connect_error', j); }),
      new Promise((r, j) => { player.on('connect', r); player.on('connect_error', j); }),
    ]);
    gm.emit('join_campaign', { campaign_id: campaignId });
    player.emit('join_campaign', { campaign_id: campaignId });
    await H.wait(500);

    const received = H.once(gm, 'message_received', { timeoutMs: 6000 });
    player.emit('chat_message', { content: 'ping autorisation' });
    const msg = await received;
    assert.equal(msg.content, 'ping autorisation');
    assert.equal(msg.type, 'chat');
  });

  test('un joueur ne peut pas déclencher un événement MJ (night_mode_set)', async () => {
    const gm = track(H.connectSocket(gmToken));
    const player = track(H.connectSocket(playerToken));
    await Promise.all([
      new Promise((r, j) => { gm.on('connect', r); gm.on('connect_error', j); }),
      new Promise((r, j) => { player.on('connect', r); player.on('connect_error', j); }),
    ]);
    gm.emit('join_campaign', { campaign_id: campaignId });
    player.emit('join_campaign', { campaign_id: campaignId });
    await H.wait(500);

    const gmEvents = [];
    gm.onAny((name, payload) => gmEvents.push({ name, payload }));

    // 1) le joueur tente l'événement réservé MJ → rien ne doit arriver au MJ
    player.emit('night_mode_set', { enabled: true });
    await H.wait(900);
    const afterPlayer = gmEvents.length;

    // 2) le MJ déclenche le même événement → la diffusion doit arriver (preuve
    //    que le test mesure bien quelque chose)
    gm.emit('night_mode_set', { enabled: true });
    await H.wait(900);
    assert.equal(afterPlayer, 0, `le joueur ne doit rien diffuser: ${JSON.stringify(gmEvents)}`);
    assert.ok(gmEvents.length > 0, 'le MJ doit, lui, diffuser son changement de mode nuit');
  });

  test('un jeton révoqué est refusé à la connexion socket', async () => {
    // révocation via l'API REST (logout-others)
    const api = H.makeApi(revokedToken);
    const lo = await api.post('/account/logout-others', {});
    assert.equal(lo.status, 200, JSON.stringify(lo.data));

    const s = track(H.connectSocket(revokedToken));
    const err = await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('connect_error attendu, non reçu')), 6000);
      s.on('connect_error', (e) => { clearTimeout(t); resolve(e); });
      s.on('connect', () => { clearTimeout(t); reject(new Error('le jeton révoqué a été accepté !')); });
    });
    assert.match(String(err.message), /révoquée/i);
    s.close();
  });
});
