/* ═══════════════════════════════════════════════════════════
   PLANO DINÁMICO – SEGUNDO NIVEL  |  app.js  v3
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ──────────────────────────────────────────────────────────
   STATION DATA
   ────────────────────────────────────────────────────────── */
const stationData = {};
for (let i = 1; i <= 70; i++) {
  stationData[i] = {
    no: i, equipo:'', marca:'', modelo:'',
    noSerie:'', hostname:'', serieMonitor:'',
    nombre:'', estado:'', proyecto:'', cargo:''
  };
}

/* ──────────────────────────────────────────────────────────
   ROOM DEFINITIONS
   Posiciones exactas según el plano original.
   Chip: 52 × 44 px  |  gap: 6 px  |  paso H=58, V=50
   Cada estación → [x, y] dentro del área de contenido (bajo la etiqueta).
   ────────────────────────────────────────────────────────── */
const ROOMS = [
  {
    id:'sala-final', name:'SALA DEL FINAL',
    x:1080, y:20, w:308, h:240,
    /*  [1][2][3][4][5]
                    [6]
                    [7]
                    [8]  */
    stations:{
      1:[8,8],  2:[66,8],  3:[124,8], 4:[182,8], 5:[240,8],
      6:[240,58], 7:[240,108], 8:[240,158]
    }
  },
  {
    id:'sala-final-pres', name:'SALA DEL FINAL CERCA PRESIDENCIA',
    x:1080, y:292, w:210, h:250,
    /*  [15][13]  [9]
        [16][14]  [10]
        ───gap───
        [17][18]  [11]
        [19][20]  [12]  */
    stations:{
      15:[8,8],  13:[66,8],  9:[150,8],
      16:[8,58], 14:[66,58], 10:[150,58],
      17:[8,122], 18:[66,122], 11:[150,122],
      19:[8,172], 20:[66,172], 12:[150,172]
    }
  },
  {
    id:'anexo-presidencia', name:'ANEXO DE PRESIDENCIA',
    x:1080, y:578, w:250, h:140,
    /*  [28][27][26][25]
        [21][22][23][24]  */
    stations:{
      28:[8,8],  27:[66,8],  26:[124,8], 25:[182,8],
      21:[8,58], 22:[66,58], 23:[124,58], 24:[182,58]
    }
  },
  {
    id:'pasillo-contingencia', name:'PASILLO CERCA PEGADO CONTINGENCIA',
    x:600, y:252, w:366, h:90,
    /*  [29][30][31][32][33][34]  */
    stations:{
      29:[8,8], 30:[66,8], 31:[124,8], 32:[182,8], 33:[240,8], 34:[298,8]
    }
  },
  {
    id:'ex-bodega-giti', name:'EX BODEGA GITI',
    x:308, y:372, w:308, h:208,
    /*  [45]  [46][49]
        [44]  [47][48]
        ──────────────
        [43][42][41][40][39]  */
    stations:{
      45:[8,8],  44:[8,58],
      46:[84,8], 49:[142,8], 47:[84,58], 48:[142,58],
      43:[8,126], 42:[66,126], 41:[124,126], 40:[182,126], 39:[240,126]
    }
  },
  {
    id:'pasillo', name:'PASILLO',
    x:620, y:556, w:250, h:90,
    /*  [38][37][36][35]  */
    stations:{
      38:[8,8], 37:[66,8], 36:[124,8], 35:[182,8]
    }
  },
  {
    id:'pasillo-a', name:'PASILLO A',
    x:308, y:98, w:132, h:192,
    /*  [51][50]
        [52]
        [53]        */
    stations:{
      51:[8,8], 50:[66,8],
      52:[8,58],
      53:[8,108]
    }
  },
  {
    id:'sala-final-a', name:'SALA FINAL A',
    x:25, y:98, w:250, h:368,
    /*  [60]  [68][67]
              [69][70]
        [61]  [65][66]  [54]
              [64][63]  [55]
        [62]  [58][59]
              [56][57]          */
    stations:{
      60:[8,8],
      68:[66,8],  67:[124,8],
      69:[66,58], 70:[124,58],
      61:[8,122],
      65:[66,122], 66:[124,122],
      64:[66,172], 63:[124,172],
      54:[190,122], 55:[190,172],
      62:[8,236],
      58:[66,236], 59:[124,236],
      56:[66,286], 57:[124,286]
    }
  }
];

/* ──────────────────────────────────────────────────────────
   STATE
   ────────────────────────────────────────────────────────── */
let sortMode      = false;
let layoutLocked  = true;   // starts locked by default
let zoomLevel     = 1.0;
const FP_W = 1420, FP_H = 800;
let activeNo     = null;
let dragSrcNo    = null;
let dragTargetNo = null;
let editingNo    = null;
let currentView  = 'floor';

// Room drag state
let roomDragging   = null;
let roomDragStartX = 0, roomDragStartY = 0;
let roomOrigLeft   = 0, roomOrigTop    = 0;

// Room resize state
let resizingEl    = null;
let resizeDir     = '';
let resizeRoomId  = '';
let resizeStartX  = 0, resizeStartY  = 0;
let resizeOrigW   = 0, resizeOrigH   = 0;
let resizeOrigL   = 0, resizeOrigT   = 0;

// Chip free-drag state
let chipDragEl         = null;
let chipDragNo         = 0;
let chipDragMoved      = false;
let chipDragStartMouseX = 0, chipDragStartMouseY = 0;
let chipDragOffX       = 0,  chipDragOffY        = 0;

const STORAGE_KEY    = 'planoDinamico_roomPositions_v3';
const CHIP_POS_KEY   = 'planoDinamico_chipPositions_v3';
const STATION_DATA_KEY = 'planoDinamico_stationData_v3';

/* ──────────────────────────────────────────────────────────
   DOM REFS
   ────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const loginScreen   = $('loginScreen');
const mainApp       = $('mainApp');
const floorPlan     = $('floorPlan');
const sortBanner    = $('sortBanner');
const viewFloorPlan = $('viewFloorPlan');
const viewList      = $('viewList');
const tableBody     = $('tableBody');
const searchInput   = $('searchInput');
const listCount     = $('listCount');
const stTooltip     = $('stTooltip');
const modalDragDrop = $('modalDragDrop');
const modalEdit     = $('modalEdit');
const fpZoomWrapper = $('fpZoomWrapper');

/* ──────────────────────────────────────────────────────────
   LOGIN / LOGOUT
   ────────────────────────────────────────────────────────── */
$('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  if ($('username').value.trim().toUpperCase() === 'ADMIN' &&
      $('password').value === 'ADMIN') {
    loginScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');
    const hadData = loadStationDataFromStorage();
    buildFloorPlan();
    updateStats();
    applyLockState();   // apply locked state on load
    if (hadData) {
      Swal.fire({
        icon:'info', title:'Datos restaurados',
        text:'Se cargaron automáticamente los datos del último Excel importado.',
        background:'#1f2937', color:'#f1f5f9', confirmButtonColor:'#2563eb',
        timer:2800, timerProgressBar:true, showConfirmButton:false
      });
    }
  } else {
    const err = $('loginError');
    err.classList.remove('hidden');
    err.style.animation = 'none';
    requestAnimationFrame(() => { err.style.animation = ''; });
  }
});

$('btnLogout').addEventListener('click', () => {
  Swal.fire({
    title:'Cerrar sesión', text:'¿Desea cerrar sesión?',
    icon:'question', background:'#1f2937', color:'#f1f5f9',
    confirmButtonColor:'#dc2626', cancelButtonColor:'#374151',
    showCancelButton:true, confirmButtonText:'Sí, salir', cancelButtonText:'Cancelar'
  }).then(r => {
    if (r.isConfirmed) {
      hideTooltip();
      mainApp.classList.add('hidden');
      loginScreen.classList.remove('hidden');
      $('username').value = $('password').value = '';
      $('loginError').classList.add('hidden');
    }
  });
});

/* ──────────────────────────────────────────────────────────
   ZOOM
   ────────────────────────────────────────────────────────── */
function applyZoom() {
  floorPlan.style.transform = zoomLevel === 1 ? 'none' : `scale(${zoomLevel})`;
  fpZoomWrapper.style.width  = Math.round(FP_W * zoomLevel) + 'px';
  fpZoomWrapper.style.height = Math.round(FP_H * zoomLevel) + 'px';
  $('zoomVal').textContent = Math.round(zoomLevel * 100) + '%';
}

function fitZoom() {
  const scroll = document.querySelector('.fp-scroll');
  const cw = scroll.clientWidth  - 20;
  const ch = scroll.clientHeight - 20;
  const z  = Math.min(cw / FP_W, ch / FP_H, 2.5);
  zoomLevel = Math.max(0.25, parseFloat(z.toFixed(2)));
  applyZoom();
}

$('btnZoomIn').addEventListener('click',  () => { zoomLevel = Math.min(3.0, parseFloat((zoomLevel + 0.1).toFixed(2))); applyZoom(); });
$('btnZoomOut').addEventListener('click', () => { zoomLevel = Math.max(0.25, parseFloat((zoomLevel - 0.1).toFixed(2))); applyZoom(); });
$('btnZoomFit').addEventListener('click', fitZoom);

document.addEventListener('wheel', e => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  zoomLevel = Math.min(3.0, Math.max(0.25, parseFloat((zoomLevel + delta).toFixed(2))));
  applyZoom();
}, { passive: false });

/* ──────────────────────────────────────────────────────────
   LOCK LAYOUT
   ────────────────────────────────────────────────────────── */
function applyLockState() {
  const btn  = $('btnLockLayout');
  const icon = $('lockIcon');
  btn.classList.toggle('locked', layoutLocked);
  $('lockLabel').textContent = layoutLocked ? 'Desbloq.' : 'Bloquear';
  if (layoutLocked) {
    icon.innerHTML = `<rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0110 0"/>`;
  } else {
    icon.innerHTML = `<rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>`;
  }
  hideTooltip();
}

$('btnLockLayout').addEventListener('click', () => {
  Swal.fire({
    title: layoutLocked ? 'Desbloquear plano' : 'Bloquear plano',
    html: `<p style="color:#94a3b8;font-size:13px;margin-bottom:4px">
             Ingresa la contraseña para ${layoutLocked ? 'desbloquear' : 'bloquear'} la edición del plano.
           </p>`,
    input: 'password',
    inputPlaceholder: 'Contraseña',
    inputAttributes: { autocomplete: 'off' },
    background: '#1f2937', color: '#f1f5f9',
    confirmButtonColor: layoutLocked ? '#16a34a' : '#dc2626',
    cancelButtonColor: '#374151',
    confirmButtonText: layoutLocked ? 'Desbloquear' : 'Bloquear',
    showCancelButton: true,
    cancelButtonText: 'Cancelar',
    customClass: { input: 'swal-pwd-input' },
    preConfirm: pwd => {
      if (pwd !== 'ADMIN123') {
        Swal.showValidationMessage('Contraseña incorrecta');
        return false;
      }
      return true;
    }
  }).then(r => {
    if (r.isConfirmed) {
      layoutLocked = !layoutLocked;
      applyLockState();
      Swal.fire({
        icon: layoutLocked ? 'success' : 'info',
        title: layoutLocked ? 'Plano bloqueado' : 'Plano desbloqueado',
        text: layoutLocked
          ? 'No se puede mover ni redimensionar hasta desbloquear.'
          : 'Puedes mover salas y puestos libremente.',
        background:'#1f2937', color:'#f1f5f9', confirmButtonColor:'#2563eb',
        timer: 2000, timerProgressBar: true, showConfirmButton: false
      });
    }
  });
});

/* ──────────────────────────────────────────────────────────
   FLOOR PLAN BUILDER
   ────────────────────────────────────────────────────────── */
function buildFloorPlan() {
  floorPlan.innerHTML = '';
  const savedRooms = loadPositions();
  const savedChips = loadChipPositions();
  ROOMS.forEach(room => buildRoom(room, savedRooms[room.id]));
  // Restore chips that were manually moved outside their rooms
  Object.entries(savedChips).forEach(([no, pos]) => {
    const chip = $(`chip-${no}`);
    if (!chip) return;
    chip.style.left = pos.x + 'px';
    chip.style.top  = pos.y + 'px';
    chip.classList.add('chip-free');
    floorPlan.appendChild(chip);
  });
}

function buildRoom(room, savedPos) {
  const x = savedPos ? savedPos.x : room.x;
  const y = savedPos ? savedPos.y : room.y;
  const w = (savedPos && savedPos.w) ? savedPos.w : room.w;
  const h = (savedPos && savedPos.h) ? savedPos.h : room.h;

  const roomEl = document.createElement('div');
  roomEl.className = 'room';
  roomEl.id = `room-${room.id}`;
  roomEl.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;

  // Label (drag handle)
  const label = document.createElement('div');
  label.className = 'room-label';
  label.title = 'Arrastra para mover esta sala';
  label.innerHTML = `<span class="drag-hint">⠿</span>${room.name}`;
  roomEl.appendChild(label);

  // Content area (relative for abs-positioned chips)
  const content = document.createElement('div');
  content.className = 'room-content';
  Object.entries(room.stations).forEach(([no, pos]) => {
    const chip = createChip(Number(no));
    chip.style.left = pos[0] + 'px';
    chip.style.top  = pos[1] + 'px';
    content.appendChild(chip);
  });
  roomEl.appendChild(content);

  // Room drag via label
  label.addEventListener('mousedown', onRoomDragStart(roomEl, room.id));

  // Resize handles (8 directions)
  ['nw','n','ne','e','se','s','sw','w'].forEach(dir => {
    const h = document.createElement('div');
    h.className = `resize-handle rh-${dir}`;
    h.dataset.dir = dir;
    h.addEventListener('mousedown', onResizeStart(roomEl, dir, room.id));
    roomEl.appendChild(h);
  });

  floorPlan.appendChild(roomEl);
}

/* ──────────────────────────────────────────────────────────
   STATION CHIP
   ────────────────────────────────────────────────────────── */
function createChip(no) {
  const d    = stationData[no];
  const chip = document.createElement('div');
  chip.className = `station-chip ${statusClass(d.estado)}`;
  chip.id        = `chip-${no}`;
  chip.dataset.no = no;
  const short = (d.nombre || '–').split(' ')[0];
  chip.innerHTML = `<div class="chip-num">${no}</div><div class="chip-name">${short}</div>`;

  if (sortMode) {
    enableDrag(chip, no);
  } else {
    chip.addEventListener('mousedown', ev => {
      ev.stopPropagation();
      ev.preventDefault();
      if (layoutLocked) {
        showTooltip(no, chip);
        return;
      }
      chipDragEl          = chip;
      chipDragNo          = no;
      chipDragStartMouseX = ev.clientX;
      chipDragStartMouseY = ev.clientY;
      chipDragMoved       = false;
      const chipRect = chip.getBoundingClientRect();
      chipDragOffX = (ev.clientX - chipRect.left) / zoomLevel;
      chipDragOffY = (ev.clientY - chipRect.top)  / zoomLevel;
    });
  }
  return chip;
}

function refreshChip(no) {
  const old = $(`chip-${no}`);
  if (!old) return;
  const pos    = { left: old.style.left, top: old.style.top };
  const wasFree = old.parentElement === floorPlan;
  const fresh  = createChip(no);
  fresh.style.left = pos.left;
  fresh.style.top  = pos.top;
  if (wasFree) fresh.classList.add('chip-free');
  old.replaceWith(fresh);
}

function rebuildAllChips() {
  for (let i = 1; i <= 70; i++) refreshChip(i);
}

function statusClass(estado) {
  const s = (estado || '').toUpperCase();
  if (s === 'ACTIVO')   return 'st-active';
  if (s === 'INACTIVO') return 'st-inactive';
  return 'st-unassigned';
}

/* ──────────────────────────────────────────────────────────
   ROOM DRAG  (arrastra la etiqueta para mover la sala)
   ────────────────────────────────────────────────────────── */
function onRoomDragStart(roomEl, roomId) {
  return function(e) {
    if (sortMode || layoutLocked) return;
    e.preventDefault();
    e.stopPropagation();
    roomDragging   = roomEl;
    roomDragStartX = e.clientX;
    roomDragStartY = e.clientY;
    roomOrigLeft   = parseInt(roomEl.style.left) || 0;
    roomOrigTop    = parseInt(roomEl.style.top)  || 0;
    roomEl.classList.add('room-moving');
  };
}

/* ──────────────────────────────────────────────────────────
   ROOM RESIZE  (arrastra esquinas / bordes para redimensionar)
   ────────────────────────────────────────────────────────── */
function onResizeStart(roomEl, dir, roomId) {
  return function(e) {
    if (sortMode || layoutLocked) return;
    e.preventDefault();
    e.stopPropagation();
    resizingEl   = roomEl;
    resizeDir    = dir;
    resizeRoomId = roomId;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeOrigW  = parseInt(roomEl.style.width)  || roomEl.offsetWidth;
    resizeOrigH  = parseInt(roomEl.style.height) || roomEl.offsetHeight;
    resizeOrigL  = parseInt(roomEl.style.left)   || 0;
    resizeOrigT  = parseInt(roomEl.style.top)    || 0;
    roomEl.classList.add('room-resizing');
    document.body.style.userSelect = 'none';
  };
}

document.addEventListener('mousemove', e => {
  // ── Room drag ──────────────────────────────
  if (roomDragging) {
    const dx = (e.clientX - roomDragStartX) / zoomLevel;
    const dy = (e.clientY - roomDragStartY) / zoomLevel;
    roomDragging.style.left = Math.max(0, roomOrigLeft + dx) + 'px';
    roomDragging.style.top  = Math.max(0, roomOrigTop  + dy) + 'px';
  }

  // ── Room resize ────────────────────────────
  if (resizingEl) {
    const dx  = (e.clientX - resizeStartX) / zoomLevel;
    const dy  = (e.clientY - resizeStartY) / zoomLevel;
    const MIN_W = 80, MIN_H = 60;
    let newW = resizeOrigW, newH = resizeOrigH;
    let newL = resizeOrigL, newT = resizeOrigT;

    if (resizeDir.includes('e')) newW = Math.max(MIN_W, resizeOrigW + dx);
    if (resizeDir.includes('s')) newH = Math.max(MIN_H, resizeOrigH + dy);
    if (resizeDir.includes('w')) {
      const w = Math.max(MIN_W, resizeOrigW - dx);
      newL = resizeOrigL + (resizeOrigW - w);
      newW = w;
    }
    if (resizeDir.includes('n')) {
      const h = Math.max(MIN_H, resizeOrigH - dy);
      newT = resizeOrigT + (resizeOrigH - h);
      newH = h;
    }

    resizingEl.style.width  = newW + 'px';
    resizingEl.style.height = newH + 'px';
    resizingEl.style.left   = newL + 'px';
    resizingEl.style.top    = newT + 'px';
  }

  // ── Chip free-drag ─────────────────────────
  if (chipDragEl && !sortMode) {
    const dx = e.clientX - chipDragStartMouseX;
    const dy = e.clientY - chipDragStartMouseY;

    if (!chipDragMoved) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      // Lift chip to floor-plan coordinate space (corrected for zoom)
      chipDragMoved = true;
      const fpRect0   = floorPlan.getBoundingClientRect();
      const chipRect0 = chipDragEl.getBoundingClientRect();
      const fpX = (chipRect0.left - fpRect0.left) / zoomLevel;
      const fpY = (chipRect0.top  - fpRect0.top)  / zoomLevel;
      chipDragEl.style.left = fpX + 'px';
      chipDragEl.style.top  = fpY + 'px';
      floorPlan.appendChild(chipDragEl);
      chipDragEl.classList.add('chip-free', 'chip-free-drag');
    }

    const fpRect = floorPlan.getBoundingClientRect();
    const newX = (e.clientX - fpRect.left) / zoomLevel - chipDragOffX;
    const newY = (e.clientY - fpRect.top)  / zoomLevel - chipDragOffY;
    chipDragEl.style.left = Math.max(0, newX) + 'px';
    chipDragEl.style.top  = Math.max(0, newY) + 'px';
  }
});

document.addEventListener('mouseup', () => {
  // ── Room drag end ──────────────────────────
  if (roomDragging) {
    roomDragging.classList.remove('room-moving');
    const id = roomDragging.id.replace('room-', '');
    const saved = loadPositions();
    const prev = saved[id] || {};
    saved[id] = {
      x: parseInt(roomDragging.style.left),
      y: parseInt(roomDragging.style.top),
      w: prev.w, h: prev.h   // preserve saved size
    };
    savePositions(saved);
    roomDragging = null;
  }

  // ── Room resize end ────────────────────────
  if (resizingEl) {
    resizingEl.classList.remove('room-resizing');
    document.body.style.userSelect = '';
    const saved = loadPositions();
    const prev = saved[resizeRoomId] || {};
    saved[resizeRoomId] = {
      x: parseInt(resizingEl.style.left),
      y: parseInt(resizingEl.style.top),
      w: parseInt(resizingEl.style.width),
      h: parseInt(resizingEl.style.height)
    };
    savePositions(saved);
    resizingEl = null;
  }

  // ── Chip free-drag end ─────────────────────
  if (chipDragEl) {
    if (chipDragMoved) {
      chipDragEl.classList.remove('chip-free-drag');
      const saved = loadChipPositions();
      saved[chipDragNo] = {
        x: parseInt(chipDragEl.style.left),
        y: parseInt(chipDragEl.style.top)
      };
      saveChipPositions(saved);
    } else {
      // No movement → it was a click → show tooltip
      showTooltip(chipDragNo, chipDragEl);
    }
    chipDragEl    = null;
    chipDragMoved = false;
  }
});

/* ──────────────────────────────────────────────────────────
   POSITION PERSISTENCE  (localStorage)
   ────────────────────────────────────────────────────────── */
function loadPositions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch(e) { return {}; }
}
function savePositions(obj) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}
function loadChipPositions() {
  try { return JSON.parse(localStorage.getItem(CHIP_POS_KEY)) || {}; }
  catch(e) { return {}; }
}
function saveChipPositions(obj) {
  localStorage.setItem(CHIP_POS_KEY, JSON.stringify(obj));
}
function saveStationData() {
  const snap = {};
  for (let i = 1; i <= 70; i++) snap[i] = { ...stationData[i] };
  localStorage.setItem(STATION_DATA_KEY, JSON.stringify(snap));
}
function loadStationDataFromStorage() {
  try {
    const saved = JSON.parse(localStorage.getItem(STATION_DATA_KEY));
    if (!saved) return false;
    for (let i = 1; i <= 70; i++) {
      if (saved[i]) Object.assign(stationData[i], saved[i]);
    }
    return true;
  } catch(e) { return false; }
}

$('btnResetLayout').addEventListener('click', () => {
  Swal.fire({
    title:'Restablecer disposición',
    text:'¿Restablecer todas las salas a su posición original?',
    icon:'question', background:'#1f2937', color:'#f1f5f9',
    confirmButtonColor:'#2563eb', cancelButtonColor:'#374151',
    showCancelButton:true, confirmButtonText:'Sí, restablecer', cancelButtonText:'Cancelar'
  }).then(r => {
    if (r.isConfirmed) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CHIP_POS_KEY);
      buildFloorPlan();
      Swal.fire({ icon:'success', title:'Disposición restablecida', background:'#1f2937', color:'#f1f5f9',
        confirmButtonColor:'#2563eb', timer:1600, timerProgressBar:true, showConfirmButton:false });
    }
  });
});

/* ──────────────────────────────────────────────────────────
   TOOLTIP FLOTANTE
   ────────────────────────────────────────────────────────── */
const TT_FIELDS = [
  {key:'equipo',        lbl:'Equipo'},
  {key:'marca',         lbl:'Marca'},
  {key:'modelo',        lbl:'Modelo'},
  {key:'noSerie',       lbl:'No. Serie'},
  {key:'hostname',      lbl:'HOSTNAME'},
  {key:'serieMonitor',  lbl:'SERIE Monitor'},
  {key:'nombre',        lbl:'Nombre'},
  {key:'proyecto',      lbl:'Proyecto'},
  {key:'cargo',         lbl:'Cargo'},
];

function showTooltip(no, chipEl) {
  const d = stationData[no];
  activeNo = no;

  document.querySelectorAll('.station-chip.selected')
    .forEach(c => c.classList.remove('selected'));
  chipEl.classList.add('selected');

  $('ttBadge').textContent = no;
  const sc = statusClass(d.estado);
  const hs = $('ttHStatus');
  hs.textContent = sc==='st-active' ? 'ACTIVO' : sc==='st-inactive' ? 'INACTIVO' : 'Sin asignar';
  hs.className   = `tt-hstatus ${sc}`;

  const body = $('ttBody');
  body.innerHTML = '';
  TT_FIELDS.forEach(f => {
    const val = d[f.key] || '';
    const row = document.createElement('div');
    row.className = 'tt-row';
    row.innerHTML = `
      <span class="tt-lbl">${f.lbl}</span>
      <span class="tt-val ${val?'':'empty'}">${val || 'Sin datos'}</span>`;
    body.appendChild(row);
  });

  // Position tooltip
  stTooltip.classList.remove('hidden','arrow-up','arrow-down');
  stTooltip.style.visibility = 'hidden';

  const cr  = chipEl.getBoundingClientRect();
  const ttW = 310;
  const ttH = stTooltip.offsetHeight || 360;
  const vw  = window.innerWidth, vh = window.innerHeight;
  const ao  = Math.min(30, cr.left + cr.width/2 - 10);

  let left = cr.left + cr.width/2 - ao;
  let top, arrowCls;

  if (cr.bottom + ttH + 14 < vh) {
    top = cr.bottom + 10;
    arrowCls = 'arrow-up';
    $('ttArrow').style.cssText = `left:${ao}px;top:-7px`;
  } else {
    top = cr.top - ttH - 10;
    arrowCls = 'arrow-down';
    $('ttArrow').style.cssText = `left:${ao}px;bottom:-7px;top:auto`;
  }

  if (left + ttW > vw - 8) left = vw - ttW - 8;
  if (left < 8) left = 8;
  if (top  < 8) top  = 8;

  stTooltip.style.left = left + 'px';
  stTooltip.style.top  = top  + 'px';
  stTooltip.style.visibility = '';
  stTooltip.classList.add(arrowCls);
  stTooltip.style.animation = 'none';
  requestAnimationFrame(() => { stTooltip.style.animation = ''; });
}

function hideTooltip() {
  stTooltip.classList.add('hidden');
  document.querySelectorAll('.station-chip.selected')
    .forEach(c => c.classList.remove('selected'));
  activeNo = null;
}

document.addEventListener('click', e => {
  if (!stTooltip.classList.contains('hidden') &&
      !stTooltip.contains(e.target) &&
      !e.target.closest('.station-chip')) hideTooltip();
});

$('ttClose').addEventListener('click', hideTooltip);
$('ttEditBtn').addEventListener('click', () => {
  if (activeNo) { hideTooltip(); openEditModal(activeNo); }
});

/* ──────────────────────────────────────────────────────────
   SORT MODE  (intercambio de datos entre estaciones)
   ────────────────────────────────────────────────────────── */
$('btnSortMode').addEventListener('click', () => sortMode ? deactivateSortMode() : activateSortMode());
$('btnExitSort').addEventListener('click', deactivateSortMode);

function activateSortMode() {
  sortMode = true;
  hideTooltip();
  sortBanner.classList.remove('hidden');
  $('btnSortMode').classList.add('sort-active');
  // Update label cursor
  document.querySelectorAll('.room-label').forEach(l => l.style.cursor = 'default');
  rebuildAllChips();
}
function deactivateSortMode() {
  sortMode = false;
  sortBanner.classList.add('hidden');
  $('btnSortMode').classList.remove('sort-active');
  document.querySelectorAll('.room-label').forEach(l => l.style.cursor = '');
  rebuildAllChips();
}

/* ──────────────────────────────────────────────────────────
   DRAG & DROP  (sort mode — intercambio de datos)
   ────────────────────────────────────────────────────────── */
function enableDrag(chip, no) {
  chip.setAttribute('draggable','true');
  chip.addEventListener('dragstart', e => {
    dragSrcNo = no;
    chip.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(no));
  });
  chip.addEventListener('dragend', () => {
    chip.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  });
  chip.addEventListener('dragenter', e => { e.preventDefault(); if (no!==dragSrcNo) chip.classList.add('drag-over'); });
  chip.addEventListener('dragover',  e => { e.preventDefault(); e.dataTransfer.dropEffect='move'; });
  chip.addEventListener('dragleave', e => { if (!chip.contains(e.relatedTarget)) chip.classList.remove('drag-over'); });
  chip.addEventListener('drop', e => {
    e.preventDefault();
    chip.classList.remove('drag-over');
    const src = Number(e.dataTransfer.getData('text/plain'));
    if (src && src !== no) { dragSrcNo=src; dragTargetNo=no; showDDModal(src,no); }
  });
}

/* ──────────────────────────────────────────────────────────
   DRAG-DROP MODAL
   ────────────────────────────────────────────────────────── */
function showDDModal(sNo, tNo) {
  const s=stationData[sNo], t=stationData[tNo];
  $('swapFromNum').textContent  = sNo;
  $('swapFromInfo').textContent = s.nombre || s.equipo || 'Sin datos';
  $('swapToNum').textContent    = tNo;
  $('swapToInfo').textContent   = t.nombre || t.equipo || 'Sin datos';
  modalDragDrop.classList.remove('hidden');
}
const hideDDModal = () => modalDragDrop.classList.add('hidden');

$('ddClose').addEventListener('click', hideDDModal);
modalDragDrop.addEventListener('click', e => { if (e.target===modalDragDrop) hideDDModal(); });

$('btnDoSwap').addEventListener('click', () => {
  swapData(dragSrcNo, dragTargetNo);
  hideDDModal();
  Swal.fire({icon:'success',title:'Datos intercambiados',
    text:`Estaciones ${dragSrcNo} y ${dragTargetNo} intercambiadas.`,
    background:'#1f2937',color:'#f1f5f9',confirmButtonColor:'#2563eb',
    timer:2000,timerProgressBar:true,showConfirmButton:false});
});
$('btnDoEdit').addEventListener('click', () => { hideDDModal(); openEditModal(dragTargetNo); });

function swapData(a, b) {
  const K = ['equipo','marca','modelo','noSerie','hostname','serieMonitor','nombre','estado','proyecto','cargo'];
  const tmp = {};
  K.forEach(k => { tmp[k]=stationData[a][k]; });
  K.forEach(k => { stationData[a][k]=stationData[b][k]; });
  K.forEach(k => { stationData[b][k]=tmp[k]; });
  refreshChip(a); refreshChip(b);
  updateStats(); saveStationData();
  if (currentView==='list') renderTable(searchInput.value);
}

/* ──────────────────────────────────────────────────────────
   EDIT MODAL
   ────────────────────────────────────────────────────────── */
function openEditModal(no) {
  editingNo = no;
  const d = stationData[no];
  $('editNum').textContent   = no;
  $('ef_equipo').value       = d.equipo       || '';
  $('ef_marca').value        = d.marca        || '';
  $('ef_modelo').value       = d.modelo       || '';
  $('ef_serie').value        = d.noSerie      || '';
  $('ef_hostname').value     = d.hostname     || '';
  $('ef_serieMonitor').value = d.serieMonitor || '';
  $('ef_nombre').value       = d.nombre       || '';
  $('ef_estado').value       = d.estado       || '';
  $('ef_proyecto').value     = d.proyecto     || '';
  $('ef_cargo').value        = d.cargo        || '';
  modalEdit.classList.remove('hidden');
}
const hideEditModal = () => { modalEdit.classList.add('hidden'); editingNo=null; };

$('editClose').addEventListener('click', hideEditModal);
$('editCancel').addEventListener('click', hideEditModal);
modalEdit.addEventListener('click', e => { if (e.target===modalEdit) hideEditModal(); });

$('editSave').addEventListener('click', () => {
  if (!editingNo) return;
  const d = stationData[editingNo];
  d.equipo       = $('ef_equipo').value.trim();
  d.marca        = $('ef_marca').value.trim();
  d.modelo       = $('ef_modelo').value.trim();
  d.noSerie      = $('ef_serie').value.trim();
  d.hostname     = $('ef_hostname').value.trim();
  d.serieMonitor = $('ef_serieMonitor').value.trim();
  d.nombre       = $('ef_nombre').value.trim();
  d.estado       = $('ef_estado').value;
  d.proyecto     = $('ef_proyecto').value.trim();
  d.cargo        = $('ef_cargo').value.trim();
  refreshChip(editingNo);
  updateStats(); saveStationData();
  if (currentView==='list') renderTable(searchInput.value);
  if (activeNo===editingNo) { const c=$(`chip-${editingNo}`); if(c) showTooltip(editingNo,c); }
  hideEditModal();
  Swal.fire({icon:'success',title:'Cambios guardados',text:`Estación ${editingNo} actualizada.`,
    background:'#1f2937',color:'#f1f5f9',confirmButtonColor:'#2563eb',
    timer:1800,timerProgressBar:true,showConfirmButton:false});
});

/* ──────────────────────────────────────────────────────────
   VIEW TOGGLE
   ────────────────────────────────────────────────────────── */
$('btnToggleView').addEventListener('click', () => {
  if (currentView==='floor') {
    currentView='list'; viewFloorPlan.classList.add('hidden');
    viewList.classList.remove('hidden'); hideTooltip();
    renderTable(''); $('toggleViewLabel').textContent='Vista Plano';
  } else {
    currentView='floor'; viewList.classList.add('hidden');
    viewFloorPlan.classList.remove('hidden');
    $('toggleViewLabel').textContent='Vista Lista';
  }
});

/* ──────────────────────────────────────────────────────────
   LIST / TABLE
   ────────────────────────────────────────────────────────── */
function renderTable(query) {
  const q = (query||'').toLowerCase().trim();
  tableBody.innerHTML = ''; let count=0;
  for (let no=1; no<=70; no++) {
    const d=stationData[no];
    const all=[no,d.equipo,d.marca,d.modelo,d.noSerie,d.hostname,d.serieMonitor,d.nombre,d.estado,d.proyecto,d.cargo].join(' ').toLowerCase();
    if (q && !all.includes(q)) continue;
    count++;
    const sc=statusClass(d.estado);
    const sl=sc==='st-active'?'ACTIVO':sc==='st-inactive'?'INACTIVO':'–';
    const sb=sc==='st-active'?'sb-active':sc==='st-inactive'?'sb-inactive':'sb-none';
    const tr=document.createElement('tr'); tr.dataset.no=no;
    tr.innerHTML=`
      <td><div class="tbl-num">${no}</div></td>
      <td>${d.equipo||'<span style="color:#475569">—</span>'}</td>
      <td>${d.marca||'<span style="color:#475569">—</span>'}</td>
      <td>${d.modelo||'<span style="color:#475569">—</span>'}</td>
      <td>${d.noSerie||'<span style="color:#475569">—</span>'}</td>
      <td>${d.hostname||'<span style="color:#475569">—</span>'}</td>
      <td>${d.serieMonitor||'<span style="color:#475569">—</span>'}</td>
      <td>${d.nombre||'<span style="color:#475569">—</span>'}</td>
      <td><span class="status-badge ${sb}"><span class="sdot"></span>${sl}</span></td>
      <td>${d.proyecto||'<span style="color:#475569">—</span>'}</td>
      <td>${d.cargo||'<span style="color:#475569">—</span>'}</td>
      <td><button class="tbl-action-btn" data-edit="${no}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>Editar</button></td>`;
    tableBody.appendChild(tr);
  }
  if (!count) tableBody.innerHTML=`<tr><td colspan="12"><div class="no-results">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg><p>Sin resultados para "<strong>${q}</strong>"</p></div></td></tr>`;
  listCount.textContent=`${count} registro${count!==1?'s':''}`;
}

$('stationTable').addEventListener('click', e => {
  const btn=e.target.closest('[data-edit]');
  if (btn) { openEditModal(Number(btn.dataset.edit)); return; }
  const row=e.target.closest('tr[data-no]');
  if (row) {
    const no=Number(row.dataset.no);
    currentView='floor'; viewList.classList.add('hidden');
    viewFloorPlan.classList.remove('hidden'); $('toggleViewLabel').textContent='Vista Lista';
    setTimeout(() => {
      const chip=$(`chip-${no}`);
      if (chip) { chip.scrollIntoView({behavior:'smooth',block:'center',inline:'center'}); setTimeout(()=>showTooltip(no,chip),300); }
    },100);
  }
});

searchInput.addEventListener('input', e => {
  const q=e.target.value;
  $('clearSearch').classList.toggle('hidden',!q);
  renderTable(q);
});
$('clearSearch').addEventListener('click', () => {
  searchInput.value=''; $('clearSearch').classList.add('hidden'); renderTable('');
});

/* ──────────────────────────────────────────────────────────
   STATS
   ────────────────────────────────────────────────────────── */
function updateStats() {
  let a=0,i=0,u=0;
  for (let n=1;n<=70;n++) {
    const s=(stationData[n].estado||'').toUpperCase();
    if(s==='ACTIVO') a++; else if(s==='INACTIVO') i++; else u++;
  }
  $('statTotal').textContent=70; $('statActive').textContent=a;
  $('statInactive').textContent=i; $('statUnassigned').textContent=u;
}

/* ──────────────────────────────────────────────────────────
   EXCEL IMPORT
   ────────────────────────────────────────────────────────── */
$('excelInput').addEventListener('change', e => {
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=evt=>{
    try {
      const wb=XLSX.read(evt.target.result,{type:'binary'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
      if(!rows.length){showErr('El archivo Excel está vacío.');return;}
      const rk=Object.keys(rows[0]);
      const fk=t=>rk.find(k=>k.toLowerCase().replace(/[\s·°#_.\-]/g,'').includes(t))||'';
      const K={
        no:fk('no'), equipo:fk('equipo'), marca:fk('marca'), modelo:fk('modelo'),
        noSerie:fk('noserie')||fk('serie'), hostname:fk('hostname'),
        serieMonitor:fk('seriemonitor')||fk('monitor'),
        nombre:fk('nombre'), estado:fk('estado'), proyecto:fk('proyecto'), cargo:fk('cargo')
      };
      let loaded=0;
      rows.forEach(row=>{
        const nv=parseInt(row[K.no]); if(!nv||nv<1||nv>70) return;
        const d=stationData[nv];
        d.equipo=String(row[K.equipo]||'').trim(); d.marca=String(row[K.marca]||'').trim();
        d.modelo=String(row[K.modelo]||'').trim(); d.noSerie=String(row[K.noSerie]||'').trim();
        d.hostname=String(row[K.hostname]||'').trim(); d.serieMonitor=String(row[K.serieMonitor]||'').trim();
        d.nombre=String(row[K.nombre]||'').trim(); d.estado=String(row[K.estado]||'').trim().toUpperCase();
        d.proyecto=String(row[K.proyecto]||'').trim(); d.cargo=String(row[K.cargo]||'').trim();
        loaded++;
      });
      rebuildAllChips(); updateStats(); saveStationData();
      if(currentView==='list') renderTable(searchInput.value);
      Swal.fire({icon:'success',title:'Excel cargado',html:`<strong>${loaded}</strong> estaciones importadas.`,
        background:'#1f2937',color:'#f1f5f9',confirmButtonColor:'#2563eb',
        timer:2500,timerProgressBar:true,showConfirmButton:false});
    } catch(err){showErr('Error al leer: '+err.message);}
    e.target.value='';
  };
  reader.readAsBinaryString(file);
});

/* ──────────────────────────────────────────────────────────
   EXCEL EXPORT
   ────────────────────────────────────────────────────────── */
$('btnExport').addEventListener('click', () => {
  const rows=[];
  for(let i=1;i<=70;i++){const d=stationData[i];
    rows.push({'NO°':d.no,'Equipo':d.equipo,'Marca':d.marca,'Modelo':d.modelo,
      'No.Serie':d.noSerie,'HOSTNAME':d.hostname,'SERIE_Monitor':d.serieMonitor,
      'nombre':d.nombre,'Estado':d.estado,'Proyecto':d.proyecto,'Cargo':d.cargo});}
  const ws=XLSX.utils.json_to_sheet(rows);
  ws['!cols']=[{wch:6},{wch:22},{wch:14},{wch:22},{wch:22},{wch:22},{wch:22},{wch:24},{wch:12},{wch:18},{wch:24}];
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Segundo Nivel');
  const d=new Date(),ts=`${d.getFullYear()}${p2(d.getMonth()+1)}${p2(d.getDate())}_${p2(d.getHours())}${p2(d.getMinutes())}`;
  XLSX.writeFile(wb,`PlanoSegundoNivel_${ts}.xlsx`);
  Swal.fire({icon:'success',title:'Excel exportado',text:'Archivo descargado.',
    background:'#1f2937',color:'#f1f5f9',confirmButtonColor:'#2563eb',
    timer:1800,timerProgressBar:true,showConfirmButton:false});
});

function p2(n){return String(n).padStart(2,'0');}
function showErr(msg){Swal.fire({icon:'error',title:'Error',text:msg,background:'#1f2937',color:'#f1f5f9',confirmButtonColor:'#2563eb'});}

/* ──────────────────────────────────────────────────────────
   KEYBOARD
   ────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key==='Escape') {
    if(!modalEdit.classList.contains('hidden')){hideEditModal();return;}
    if(!modalDragDrop.classList.contains('hidden')){hideDDModal();return;}
    if(!stTooltip.classList.contains('hidden')){hideTooltip();return;}
  }
});
