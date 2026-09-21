/**
 * Sodales — moteur d'actions inline (remplace les attributs onclick=… pour la CSP)
 * Un seul écouteur par type d'événement, délégation via [data-act].
 * Attributs :
 *   data-act="nomFonction"  → action enregistrée dans window.CSP_ACT
 *   data-a='["arg1", 2]'    → arguments JSON ; jetons spéciaux :
 *                             "$el", "$value", "$checked", "$files", "$event", "$target"
 *   data-self               → n'exécute que si event.target === l'élément
 *   data-stop               → event.stopPropagation() avant l'action
 *   data-prevent            → event.preventDefault() avant l'action
 *   data-key="Enter"        → n'exécute (keydown) que pour cette touche
 * Chargé en premier sur chaque page.
 */
(function () {
  'use strict';
  const ACT = window.CSP_ACT = window.CSP_ACT || {};
  window.ACT = ACT;   // alias global : les modules enregistrent leurs helpers via ACT.x

  // ── Actions intégrées (sans code applicatif) ──
  ACT.goto = (url) => { window.location.href = url; };
  ACT.open = (url, target) => { window.open(url, target || '_blank'); };
  ACT.hideSelf = (el) => { el.style.display = 'none'; };
  ACT.hideSelfShowNext = (el) => {
    el.style.display = 'none';
    if (el.nextElementSibling) el.nextElementSibling.style.display = 'flex';
  };
  ACT.parentFallback = (el, txt) => { if (el.parentElement) el.parentElement.innerHTML = txt; };
  ACT.removeClassById = (id, cls) => { const n = document.getElementById(id); if (n) n.classList.remove(cls); };
  ACT.removeClassSelf = (el, cls) => { el.classList.remove(cls); };
  ACT.removeParent = (el) => { if (el.parentElement) el.parentElement.remove(); };
  ACT.removeClosest = (el, sel) => { const n = el.closest(sel); if (n) n.remove(); };
  ACT.toUpperCaseSelf = (el) => { el.value = el.value.toUpperCase(); };
  ACT.confirmRun = (msg, name) => {
    if (window.confirm(msg) && typeof ACT[name] === 'function') ACT[name]();
  };
  ACT.setValueById = (id, v) => { const n = document.getElementById(id); if (n) n.value = v; };
  ACT.requestSubmitById = (id) => { const n = document.getElementById(id); if (n) n.requestSubmit(); };
  ACT.showInviteToggle = () => {
    if (typeof window.showInviteCode === 'function') window.showInviteCode();
    if (typeof window.toggleDropdown === 'function') window.toggleDropdown();
  };
  ACT.avatarFallback = function () {
    if (this.parentElement) {
      this.parentElement.innerHTML = (window.currentUser && currentUser.username)
        ? currentUser.username[0].toUpperCase() : '?';
    }
  };
  ACT.setValueById = (id, v) => { const n = document.getElementById(id); if (n) n.value = v; };
  ACT.requestSubmitById = (id) => { const n = document.getElementById(id); if (n) n.requestSubmit(); };
  ACT.showInviteToggle = () => {
    if (typeof window.showInviteCode === 'function') window.showInviteCode();
    if (typeof window.toggleDropdown === 'function') window.toggleDropdown();
  };
  ACT.avatarFallback = function () {
    if (this.parentElement) {
      this.parentElement.innerHTML = (window.currentUser && currentUser.username)
        ? currentUser.username[0].toUpperCase() : '?';
    }
  };
  ACT.hoverBgIn = (el) => { el.dataset._bg = el.style.background; el.style.background = 'var(--surface2)'; };
  ACT.hoverBgOut = (el) => { el.style.background = el.dataset._bg || ''; };

  function resolve(token, el, ev) {
    if (typeof token === 'string') {
      if (token.indexOf('$fn:') === 0) return window[token.slice(4)];
      if (token.indexOf('$cb:') === 0) {
        const n = token.slice(4);
        return () => { if (typeof window[n] === 'function') window[n](); };
      }
    }
    switch (token) {
      case '$el': return el;
      case '$value': return el.value;
      case '$numValue': return Number(el.value);
      case '$checked': return el.checked;
      case '$files': return el.files;
      case '$event': return ev;
      case '$target': return ev.target;
      default: return token;
    }
  }

  function run(el, ev) {
    if (el.hasAttribute('data-self') && ev.target !== el) return;
    const key = el.getAttribute('data-key');
    if (key && ev.key !== key) return;
    if (el.hasAttribute('data-stop')) ev.stopPropagation();
    if (el.hasAttribute('data-prevent')) ev.preventDefault();
    const name = (ev.type === 'mouseout' && el.hasAttribute('data-act-out'))
      ? el.getAttribute('data-act-out')
      : el.getAttribute('data-act');
    if (name === null) return;
    const fn = ACT[name];
    if (typeof fn !== 'function') { console.warn('[CSP] action inconnue :', name); return; }
    let args = [];
    const raw = el.getAttribute('data-a');
    if (raw) {
      try { args = JSON.parse(raw).map((t) => resolve(t, el, ev)); }
      catch (e) { console.warn('[CSP] data-a invalide :', raw, e); }
    }
    const res = fn.apply(el, args.concat([ev]));
    if (res === false) ev.preventDefault();
  }

  const TYPES = ['click', 'input', 'change', 'submit', 'keydown', 'keyup', 'dblclick',
                 'mouseover', 'mouseout', 'contextmenu'];
  TYPES.forEach((t) => document.addEventListener(t, (ev) => {
    const el = ev.target && ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (el) run(el, ev);
  }));

  // 'error' ne bulle pas → capture
  window.addEventListener('error', (ev) => {
    const el = ev.target;
    if (el && el.closest) {
      const host = el.closest('[data-act]');
      if (host) run(host, ev);
    }
  }, true);
})();
