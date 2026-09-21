'use strict';
/**
 * Tests des règles de fiche — frontend/js/game/sheet-rules.js
 *
 * La logique du module (encombrement D&D 5e, vision en mètres, classes de
 * difficulté PF2e) est chargée dans un contexte vm avec un mini-DOM factice :
 * aucun navigateur, aucune base — s'exécute partout, y compris en CI.
 *
 * Ces zones sont celles où des régressions sont apparues pendant le
 * découpage de game.html : ces tests les figent.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = path.join(__dirname, '..', '..', 'frontend', 'js', 'game', 'sheet-rules.js');

function makeEl(init = {}) {
  return Object.assign({
    value: '', textContent: '', className: '', innerHTML: '',
    classList: { toggle() {}, add() {}, remove() {} },
  }, init);
}

/** Charge sheet-rules.js (et éventuellement d'autres modules en portée globale). */
function loadSheetRules({ els = {}, globals = {} } = {}) {
  const document = {
    getElementById: (id) => els[id] || null,
    body: { classList: { toggle() {}, add() {}, remove() {} } },
    createElement: () => makeEl(),
  };
  const ctx = { document, console, ...globals };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SRC, 'utf8'), ctx, { filename: 'sheet-rules.js' });
  return ctx;
}

describe('Encombrement (getEncumbranceInfo)', () => {
  const C = loadSheetRules();
  const char = (str, bodyKg, items = []) =>
    ({ stats: { str }, body_weight: bodyKg, inventory: { items } });

  test('STR 10 : seuils 22,5 / 45 / 67,5 kg', () => {
    const r = C.getEncumbranceInfo(char(10, 0));
    assert.equal(r.max, 67.5);
    assert.equal(r.encThresh, 22.5);
    assert.equal(r.heavyThresh, 45);
    assert.equal(r.status, 'normal');
  });

  test('STR 10, 20 kg portés → normal', () => {
    assert.equal(C.getEncumbranceInfo(char(10, 20)).status, 'normal');
  });

  test('STR 10, 30 kg portés → encombré', () => {
    assert.equal(C.getEncumbranceInfo(char(10, 30)).status, 'enc');
  });

  test('STR 10, 50 kg portés → très encombré', () => {
    assert.equal(C.getEncumbranceInfo(char(10, 50)).status, 'heavy');
  });

  test('STR 10, 70 kg portés → dépassé', () => {
    assert.equal(C.getEncumbranceInfo(char(10, 70)).status, 'over');
  });

  test('seuil exact (45 kg) → encore « encombré », pas « très encombré »', () => {
    // la bascule se fait strictement AU-DESSUS du seuil
    assert.equal(C.getEncumbranceInfo(char(10, 45)).status, 'enc');
    assert.equal(C.getEncumbranceInfo(char(10, 22.5)).status, 'normal');
  });

  test('somme quantité × poids + poids du corps, arrondis à 0,1 kg', () => {
    const r = C.getEncumbranceInfo(char(15, '12.5', [
      { qty: 3, weight: '0.1' },   // 0,3 kg — piège du flottant
      { qty: 2, weight: 5 },       // 10 kg
    ]));
    assert.equal(r.itemsKg, 10.3);
    assert.equal(r.carried, 22.8);
    assert.equal(r.bodyKg, 12.5);
  });

  test('poids manquant ou illisible → 0 kg, pas NaN', () => {
    const r = C.getEncumbranceInfo(char(10, 0, [
      { qty: 2 },                  // pas de poids
      { qty: 1, weight: 'lourd' }, // non numérique
    ]));
    assert.equal(r.itemsKg, 0);
    assert.equal(r.carried, 0);
    assert.ok(Number.isFinite(r.carried));
  });

  test('STR 20 → capacité 135 kg', () => {
    assert.equal(C.getEncumbranceInfo(char(20, 0)).max, 135);
  });

  test('fiche vide (aucune statistique) → STR considérée à 10', () => {
    const r = C.getEncumbranceInfo({});
    assert.equal(r.max, 67.5);
    assert.equal(r.status, 'normal');
  });
});

describe('Poids d\'objet (lookupItemWeight)', () => {
  const ITEMS_WEIGHT = {
    'épée longue': '1.5',
    'corde (15 m)': 5,
    'torche': '0.5',
  };
  const C = loadSheetRules({ globals: { ITEMS_WEIGHT } });

  test('correspondance exacte, insensible à la casse et aux espaces', () => {
    assert.equal(C.lookupItemWeight('  Épée Longue '), '1.5');
    assert.equal(C.lookupItemWeight('TORCHE'), '0.5');
  });

  test('correspondance floue : le nom saisi contient la clé', () => {
    assert.equal(C.lookupItemWeight('Épée longue +1'), '1.5');
  });

  test('correspondance floue : la clé contient le nom saisi', () => {
    assert.equal(C.lookupItemWeight('corde'), 5);
  });

  test('objet inconnu → null (pas de valeur inventée)', () => {
    assert.equal(C.lookupItemWeight('chose inexistante'), null);
  });

  test('table des poids absente → null sans planter', () => {
    const C2 = loadSheetRules();
    assert.equal(C2.lookupItemWeight('torche'), null);
  });
});

describe('Système de campagne (isPF2e)', () => {
  test('sans campagne chargée → false', () => {
    assert.equal(loadSheetRules().isPF2e(), false);
  });

  test('campagne « Pathfinder 2e » → true', () => {
    assert.equal(loadSheetRules({ globals: { campaign: { system: 'Pathfinder 2e' } } }).isPF2e(), true);
  });

  test('autre système → false', () => {
    assert.equal(loadSheetRules({ globals: { campaign: { system: 'Cats! La Mascarade' } } }).isPF2e(), false);
  });
});

describe('Vision en mètres (updateVisionMeter)', () => {
  const hint = () => makeEl();

  test('0 case = vision illimitée', () => {
    const h = hint();
    const C = loadSheetRules({ els: { 'mcs-vision-radius': makeEl({ value: '0' }), 'visionMeterHint': h } });
    C.updateVisionMeter();
    assert.equal(h.textContent, '0 case = illimitée');
  });

  test('1 case = 1,5 m (singulier)', () => {
    const h = hint();
    const C = loadSheetRules({ els: { 'mcs-vision-radius': makeEl({ value: '1' }), 'visionMeterHint': h } });
    C.updateVisionMeter();
    assert.equal(h.textContent, '1 case = 1.5 m');
  });

  test('3 cases = 4,5 m (pluriel)', () => {
    const h = hint();
    const C = loadSheetRules({ els: { 'mcs-vision-radius': makeEl({ value: '3' }), 'visionMeterHint': h } });
    C.updateVisionMeter();
    assert.equal(h.textContent, '3 cases = 4.5 m');
  });

  test('valeur absente ou illisible → traitée comme 0', () => {
    const h = hint();
    const C = loadSheetRules({ els: { 'mcs-vision-radius': makeEl({ value: 'abc' }), 'visionMeterHint': h } });
    C.updateVisionMeter();
    assert.equal(h.textContent, '0 case = illimitée');
  });
});

describe('PF2e — classe de difficulté et rangs de maîtrise', () => {
  test('CD de classe = 10 + niveau + mod. de la meilleure stat mentale + rang', () => {
    const display = makeEl();
    const C = loadSheetRules({
      els: {
        'pf2e-class-dc-display': display,
        'mcs-level': makeEl({ value: '5' }),
        'mcs-pf2e-class-prof': makeEl({ value: '4' }),
        'mcs-stat-int': makeEl({ value: '16' }),  // mod +3
        'mcs-stat-wis': makeEl({ value: '12' }),  // mod +1
        'mcs-stat-cha': makeEl({ value: '10' }),  // mod +0
      },
      globals: { editingChar: { stats: {} } },
    });
    C.updatePF2eClassDC();
    assert.equal(display.textContent, 22); // 10 + 5 + 3 + 4
  });

  test('stats absentes du formulaire → repli sur la fiche, puis sur 10', () => {
    const display = makeEl();
    const C = loadSheetRules({
      els: { 'pf2e-class-dc-display': display, 'mcs-level': makeEl({ value: '1' }), 'mcs-pf2e-class-prof': makeEl({ value: '2' }) },
      globals: { editingChar: { stats: { int: 20, wis: 10, cha: 10 } } }, // mod +5
    });
    C.updatePF2eClassDC();
    assert.equal(display.textContent, 18); // 10 + 1 + 5 + 2
  });

  test('sélecteur de rang : 5 rangs, rang courant actif, action câblée', () => {
    const container = makeEl();
    const C = loadSheetRules({ els: { 'pf2e-prof-will': container } });
    C.buildProfRankPicker('pf2e-prof-will', 'will', 4);
    const html = container.innerHTML;
    assert.equal((html.match(/<button/g) || []).length, 5);
    assert.match(html, /active active-4/);
    assert.match(html, /data-act="setProfRank" data-a='\["\$el", "will", 4\]'/);
    assert.match(html, /title="Légendaire"/);
  });

  test('sélecteur sans conteneur → aucune erreur', () => {
    const C = loadSheetRules();
    assert.doesNotThrow(() => C.buildProfRankPicker('inexistant', 'will', 0));
  });
});
