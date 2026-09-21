'use strict';
/**
 * Garde-fou de la migration CSP (classe de bug « bouton silencieusement cassé »).
 *
 *  - chaque `data-act="X"` du HTML et des gabarits JS doit correspondre à une
 *    action enregistrée (ACT / registre CSP) → une faute de frappe est une erreur de CI ;
 *  - les actions qui reçoivent l'élément en premier argument doivent porter
 *    `data-a='["$el"]'` → c'est exactement ce qui manquait à six boutons
 *    (suppression d'objet/sort, portraits, file audio, champ d'invitation) ;
 *  - aucun gestionnaire `onclick="…"` inline ni script externe ne doit réapparaître
 *    (script-src 'self', tout est servi par l'instance).
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const FE = path.join(__dirname, '..', '..', 'frontend');
const ELEMENT_FIRST = new Set([
  'hideSelf', 'hideSelfShowNext', 'parentFallback', 'removeClassSelf',
  'removeParent', 'removeClosest', 'hoverBgIn', 'hoverBgOut',
]);

function fichiers(dir, ext, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) fichiers(p, ext, out);
    else if (e.name.endsWith(ext)) out.push(p);
  }
  return out;
}

// action → vrai si sa définition utilise son 1er paramètre comme un élément DOM
function actionAttendElement(nom) {
  if (ELEMENT_FIRST.has(nom)) return true;
  const defs = [
    path.join(FE, 'js', 'csp-actions.js'),
    ...fichiers(path.join(FE, 'js'), '.js'),
  ];
  const re1 = new RegExp(`function ${nom}\\s*\\(([^)]*)\\)`);
  const re2 = new RegExp(`\\b${nom}\\s*=\\s*(?:function\\s*)?\\(([^)]*)\\)\\s*=>`);
  for (const f of defs) {
    const s = fs.readFileSync(f, 'utf8');
    for (const m of [s.match(re1), s.match(re2)]) {
      if (!m) continue;
      const p0 = (m[1] || '').split(',')[0].trim();
      if (!p0 || p0 === 'this') continue;
      const corps = s.slice(m.index, m.index + 500);
      if (new RegExp(`\\b${p0}\\.(style|classList|parentElement|nextElementSibling|closest|dataset|value|checked|src|textContent|innerText|remove|focus|disabled)\\b`).test(corps)) {
        return true;
      }
    }
  }
  return false;
}

describe('CSP — cohérence data-act / registre', () => {
  const balises = [];
  for (const f of [...fichiers(FE, '.html'), ...fichiers(path.join(FE, 'js'), '.js')]) {
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(/<[^>]*data-act="([^"]+)"[^>]*>/g)) {
      const fichier = path.relative(FE, f);
      let noms = [m[1]];
      if (m[1].includes('${')) {
        // nom d'action construit à l'exécution : valider chaque littéral cité
        noms = [...m[1].matchAll(/'([A-Za-z0-9_]+)'/g)].map((x) => x[1]);
        if (!noms.length) continue; // expression non analysable statiquement
      }
      for (const nom of noms) balises.push({ fichier, balise: m[0], nom });
    }
  }

  test('toutes les actions référencées existent', () => {
    const registre = fs.readFileSync(path.join(FE, 'js', 'csp-registry.js'), 'utf8');
    const connues = new Set([...registre.matchAll(/'([A-Za-z0-9_]+)'/g)].map((m) => m[1]));
    // toute action définie via ACT.x = … dans n'importe quel script de l'app
    for (const f of fichiers(path.join(FE, 'js'), '.js')) {
      const s = fs.readFileSync(f, 'utf8');
      for (const m of s.matchAll(/ACT\.([A-Za-z0-9_]+)\s*=/g)) connues.add(m[1]);
    }
    const inconnues = balises.filter((b) => !connues.has(b.nom));
    assert.deepEqual(
      inconnues.map((b) => `${b.fichier} → ${b.nom}`),
      [],
      'actions référencées mais introuvables (faute de frappe ou oubli d\'enregistrement)'
    );
  });

  test('les actions qui attendent l\'élément reçoivent $el', () => {
    const fautives = balises.filter((b) => actionAttendElement(b.nom) && !/data-a=/.test(b.balise));
    assert.deepEqual(
      fautives.map((b) => `${b.fichier} → ${b.nom}`),
      [],
      'il manque data-a=\'["$el"]\' (le handler recevrait l\'événement au lieu de l\'élément)'
    );
  });

  test('aucun gestionnaire inline ni script externe', () => {
    const soucis = [];
    for (const f of [...fichiers(FE, '.html'), ...fichiers(path.join(FE, 'js'), '.js')]) {
      const s = fs.readFileSync(f, 'utf8');
      for (const m of s.matchAll(/<[a-zA-Z][a-zA-Z0-9]*[^>]*\son(click|change|input|submit|keydown|keyup|dblclick|mouseover|mouseout|contextmenu|error|load)\s*=/gs)) {
        soucis.push(`${path.relative(FE, f)} → ${m[0].trim()}`);
      }
      for (const m of s.matchAll(/<script[^>]+src="https?:\/\//g)) {
        soucis.push(`${path.relative(FE, f)} → script externe`);
      }
    }
    assert.deepEqual(soucis, [], 'les gestionnaires inline et les CDN doivent rester absents (CSP script-src \'self\')');
  });
});
