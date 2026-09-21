/**
 * Sodales — extras de la carte (partie extraite de game.html)
 * Zones de sorts, objets manipulables, optimisation du rendu.
 * Chargé avant le script principal de game.html (portée globale partagée).
 */
const ZONE_COLORS = [
  { stroke:'#ef4444', fill:'rgba(239,68,68,0.18)' },   // 0 rouge
  { stroke:'#3b82f6', fill:'rgba(59,130,246,0.18)' },  // 1 bleu
  { stroke:'#22c55e', fill:'rgba(34,197,94,0.18)' },   // 2 vert
  { stroke:'#a855f7', fill:'rgba(168,85,247,0.18)' },  // 3 violet
  { stroke:'#f59e0b', fill:'rgba(245,158,11,0.18)' },  // 4 ambre
  { stroke:'#e2e8f0', fill:'rgba(226,232,240,0.12)' }, // 5 blanc
];
let spellZones     = [];    // zones finalisées
let zoneDrawing    = null;  // zone en cours de tracé
let zoneType       = 'circle';
let zoneColorIdx   = 0;
let zoneMouseDown  = false;
let draggingZone   = null;   // zone en cours de déplacement
let draggingZoneOX = 0;      // offset souris → origine zone au moment du grab
let draggingZoneOY = 0;
let pendingTokenPos = null;
let rotatingToken = false;   // mode rotation de vision actif (joueur)

// ── Objets ────────────────────────────────────────────────────
let mapObjects = [];          // [{id, type, x, y}] — coordonnées monde
let selectedObjectType = null;
let selectedObjectId   = null;
let draggingObject     = false;

// Catalogue des types d'objets disponibles
const MAP_OBJECT_TYPES = [
  // Lumières (émettent de la lumière)
  { id:'torch',    emoji:'🔦', label:'Torche',   light:{ radius:180, color:'#ffb84d' } },
  { id:'candle',   emoji:'🕯️', label:'Bougie',   light:{ radius:80,  color:'#ffe0a0' } },
  { id:'lantern',  emoji:'🏮', label:'Lanterne', light:{ radius:220, color:'#ffcc66' } },
  { id:'campfire',   emoji:'🔥', label:'Feu',          light:{ radius:300, color:'#ff8c42' } },
  { id:'crystal',    emoji:'💎', label:'Cristal',      light:{ radius:200, color:'#88ccff' } },
  { id:'uvtt_light', emoji:'💡', label:'Lumière UVTT', light:{ radius:200, color:'#ffffff' } },
  // Mobilier & décor (pas de lumière)
  { id:'chest',    emoji:'📦', label:'Coffre'  },
  { id:'barrel',   emoji:'🛢️', label:'Tonneau' },
  { id:'door',     emoji:'🚪', label:'Porte'   },
  { id:'table',    emoji:'🪵', label:'Table'   },
  { id:'altar',    emoji:'🗿', label:'Autel'   },
  { id:'statue',   emoji:'🏛️', label:'Statue'  },
  { id:'trap',     emoji:'⚙️', label:'Piège'   },
  { id:'skull',    emoji:'💀', label:'Crâne'   },
  { id:'rock',     emoji:'🪨', label:'Rocher'  },
  { id:'tree',     emoji:'🌲', label:'Arbre'   },
  { id:'web',      emoji:'🕸️', label:'Toile'   },
  { id:'bones',    emoji:'🦴', label:'Ossements' },
  { id:'potion',   emoji:'🧪', label:'Fiole'   },
  { id:'sword',    emoji:'⚔️', label:'Arme'    },
  { id:'shield',   emoji:'🛡️', label:'Bouclier' },
];

// ── Optimisation rendu ────────────────────────────────────────
// rAF debounce : plusieurs appels drawMap() dans le même tick → un seul rendu
let _drawPending = false;
function drawMap() {
  if (_drawPending) return;
  _drawPending = true;
  requestAnimationFrame(_renderFrame);
}

// Cache raycasting vision : invalide quand murs ou position/facing token changent
const _visionCache = new Map(); // token.id → { wallsVer, x, y, facing, poly }
let _wallsVer = 0;
function _getVisionPoly(t, worldR, facingRad, coneAngle) {
  const key = t.id;
  const c = _visionCache.get(key);
  const f = t.facing ?? 0;
  if (c && c.wallsVer === _wallsVer && c.x === t.x && c.y === t.y && c.f === f) return c.poly;
  const poly = computeVisibilityPolygon(t.x, t.y, worldR, mapWalls, facingRad, coneAngle);
  _visionCache.set(key, { wallsVer: _wallsVer, x: t.x, y: t.y, f, poly });
  return poly;
}
function _invalidateVisionToken(id) { _visionCache.delete(id); }
function _invalidateVisionAll()     { _visionCache.clear(); _wallsVer++; }
