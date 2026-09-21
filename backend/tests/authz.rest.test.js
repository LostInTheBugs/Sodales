'use strict';
/**
 * Tests d'autorisation — API REST.
 * Vérifie le cloisonnement des campagnes (non-membre), les droits MJ vs joueur,
 * la propriété des fiches, l'administration, la révocation des jetons et la
 * connexion réelle.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const H = require('./helpers');

let server, users, gm, player, outsider, admin;
let campaignId, campaignInvite, playerCharId, gmCharId;

before(async () => {
  await H.resetDatabase();
  server = await H.startServer();      // applique les migrations sur la base jetable
  users = await H.seedUsers();

  gm = H.makeApi(users['gm@test.local'].token);
  player = H.makeApi(users['player@test.local'].token);
  outsider = H.makeApi(users['outsider@test.local'].token);
  admin = H.makeApi(users['admin@test.local'].token);

  const camp = await gm.post('/campaigns', { name: 'Campagne de test' });
  assert.equal(camp.status, 201, `création de campagne: ${JSON.stringify(camp.data)}`);
  campaignId = camp.data.id;
  campaignInvite = camp.data.invite_code;

  const join = await player.post('/campaigns/join', { invite_code: campaignInvite });
  assert.ok([200, 201, 409].includes(join.status), `join: ${JSON.stringify(join.data)}`);

  const ch = await player.post(`/campaigns/${campaignId}/characters`, { name: 'Kael' });
  assert.ok([200, 201].includes(ch.status), `fiche joueur: ${JSON.stringify(ch.data)}`);
  playerCharId = ch.data.id;

  const ch2 = await gm.post(`/campaigns/${campaignId}/characters`, { name: 'PNJ du MJ' });
  assert.ok([200, 201].includes(ch2.status), `fiche MJ: ${JSON.stringify(ch2.data)}`);
  gmCharId = ch2.data.id;
});

after(async () => {
  if (server) server.kill('SIGKILL');
  await H.dropDatabase();
});

describe('REST — cloisonnement : non-membre (étranger à la campagne)', () => {
  test('ne peut pas lire la campagne', async () => {
    const r = await outsider.get(`/campaigns/${campaignId}`);
    assert.equal(r.status, 403);
  });

  test('ne voit pas la campagne dans sa liste', async () => {
    const r = await outsider.get('/campaigns');
    assert.equal(r.status, 200);
    const ids = (r.data.campaigns || r.data || []).map((c) => c.id);
    assert.ok(!ids.includes(campaignId), 'la campagne ne doit pas apparaître');
  });

  test('ne peut pas lister les fiches', async () => {
    const r = await outsider.get(`/campaigns/${campaignId}/characters`);
    assert.equal(r.status, 403);
  });

  test('ne peut pas créer de table de jeu', async () => {
    const r = await outsider.post(`/campaigns/${campaignId}/tables`, { name: 'Table pirate' });
    assert.equal(r.status, 403);
  });

  test('ne peut pas modifier la campagne', async () => {
    const r = await outsider.put(`/campaigns/${campaignId}`, { name: 'Piratée' });
    assert.equal(r.status, 403);
  });
});

describe('REST — joueur vs MJ (même campagne)', () => {
  test('le joueur lit la campagne (membre)', async () => {
    const r = await player.get(`/campaigns/${campaignId}`);
    assert.equal(r.status, 200);
    assert.equal(r.data.role, 'player');
  });

  test('le joueur ne peut pas modifier la campagne', async () => {
    const r = await player.put(`/campaigns/${campaignId}`, { name: 'Renommée par le joueur' });
    assert.equal(r.status, 403);
  });

  test('le joueur ne peut pas distribuer d\'indice (MJ uniquement)', async () => {
    const r = await player.post(`/campaigns/${campaignId}/handouts`, { title: 'Indice interdit' });
    assert.equal(r.status, 403);
  });

  test('le joueur ne peut pas créer de table de jeu (MJ uniquement)', async () => {
    const r = await player.post(`/campaigns/${campaignId}/tables`, { name: 'Table du joueur' });
    assert.equal(r.status, 403);
  });

  test('le MJ modifie la campagne', async () => {
    const r = await gm.put(`/campaigns/${campaignId}`, { name: 'Campagne de test (MJ)' });
    assert.equal(r.status, 200);
  });

  test('le MJ crée une table et distribue un indice', async () => {
    const t = await gm.post(`/campaigns/${campaignId}/tables`, { name: 'Table du MJ' });
    assert.ok([200, 201].includes(t.status), JSON.stringify(t.data));
    const h = await gm.post(`/campaigns/${campaignId}/handouts`, { title: 'Indice du MJ', content: '…' });
    assert.ok([200, 201].includes(h.status), JSON.stringify(h.data));
  });
});

describe('REST — fiches : propriétaire vs MJ', () => {
  test('le joueur ne peut pas modifier la fiche d\'un autre', async () => {
    const r = await player.put(`/campaigns/${campaignId}/characters/${gmCharId}`, { name: 'Détournée' });
    assert.equal(r.status, 403);
  });

  test('le joueur modifie sa propre fiche', async () => {
    const r = await player.put(`/campaigns/${campaignId}/characters/${playerCharId}`, { name: 'Kael le Brave' });
    assert.equal(r.status, 200);
  });

  test('le MJ peut modifier la fiche d\'un joueur', async () => {
    const r = await gm.put(`/campaigns/${campaignId}/characters/${playerCharId}`, { name: 'Kael (relu par le MJ)' });
    assert.equal(r.status, 200);
  });
});

describe('REST — administration', () => {
  test('un joueur ne peut pas lister les comptes', async () => {
    const r = await player.get('/admin/users');
    assert.equal(r.status, 403);
  });

  test('un admin peut lister les comptes', async () => {
    const r = await admin.get('/admin/users');
    assert.equal(r.status, 200);
  });

  test('un admin ne peut pas se rétrograder lui-même via toggle-admin', async () => {
    const me = users['admin@test.local'];
    const r = await admin.put(`/admin/users/${me.id}/toggle-admin`, {});
    assert.equal(r.status, 400);
  });
});

describe('REST — sessions et jetons', () => {
  test('la connexion réelle fonctionne et le jeton est accepté', async () => {
    const r = await H.makeApi().post('/auth/login', {
      email: 'gm@test.local',
      password: H.PASSWORD,
    });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const me = await H.makeApi(r.data.token).get('/account/me');
    assert.equal(me.status, 200);
  });

  test('logout-others révoque l\'ancien jeton et en émet un neuf', async () => {
    const revoked = H.makeApi(users['revoked@test.local'].token);
    const before = await revoked.get('/account/me');
    assert.equal(before.status, 200);

    const lo = await revoked.post('/account/logout-others', {});
    assert.equal(lo.status, 200, JSON.stringify(lo.data));
    assert.ok(lo.data.token, 'un nouveau jeton doit être émis');

    const old = await revoked.get('/account/me');
    assert.equal(old.status, 401, 'l\'ancien jeton doit être refusé');
    const fresh = await H.makeApi(lo.data.token).get('/account/me');
    assert.equal(fresh.status, 200, 'le nouveau jeton doit fonctionner');
  });
});
