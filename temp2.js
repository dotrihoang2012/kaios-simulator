
// ── App icons — flat-design SVG on rounded-square bg + real PNGs ──
const ICO = {
  phone:    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%2300c853'/><path fill='white' d='M36 34.5c-.8-.8-4.2-3.5-5-3.5-.5 0-1.2.4-2.5 1.8-.4.4-.9.5-1.4.3-1.5-.7-4.4-3.6-5.1-5.1-.2-.5-.1-1 .3-1.4C23.7 25.3 24 24.6 24 24c0-.8-2.7-4.2-3.5-5-.5-.5-1-.5-1.5 0l-2 2C15.5 22.5 16 26 18 29c2.2 3.2 5.8 6.8 9 9 3 2 6.5 2.5 8-1l2-2c.5-.5.5-1 0-1.5z'/></svg>",
  messages: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%231565c0'/><path fill='white' d='M11 17h34v21H29.5l-9 7v-7H11z'/><rect x='17' y='24' width='22' height='2.5' rx='1' fill='%231565c0'/><rect x='17' y='30' width='15' height='2.5' rx='1' fill='%231565c0'/></svg>",
  contacts: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%2300897b'/><circle cx='28' cy='22' r='8' fill='white'/><path fill='white' d='M12 46c0-8.8 7.2-16 16-16s16 7.2 16 16z'/></svg>",
  camera:   "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%231a237e'/><path fill='white' d='M19 21h5l2-3h4l2 3h5c2.2 0 4 1.8 4 4v12c0 2.2-1.8 4-4 4H19c-2.2 0-4-1.8-4-4V25c0-2.2 1.8-4 4-4z'/><circle cx='28' cy='31' r='6' fill='%231a237e'/><circle cx='28' cy='31' r='3.5' fill='white'/></svg>",
  browser:  "./kaiosrt/gaia/profile/webapps/launcher/style/images/browser_56.png",
  maps:     "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%23e64a19'/><path fill='white' d='M28 11c-6.6 0-12 5.4-12 12 0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z'/><circle cx='28' cy='23' r='4.5' fill='%23e64a19'/></svg>",
  music:    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%236a1b9a'/><path fill='white' d='M33 14v17.5c-1.3-.7-2.8-1.1-4.5-1.1-3.9 0-7 2.9-7 6.5s3.1 6.5 7 6.5 7-2.9 7-6.5V20l-8 2V14z'/></svg>",
  settings: "./kaiosrt/gaia/profile/webapps/installed/settings/style/icons/settings_56.png",
  calendar: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%23c62828'/><rect x='11' y='18' width='34' height='26' rx='3' fill='white'/><rect x='11' y='18' width='34' height='12' fill='%23c62828'/><rect x='19' y='12' width='4' height='10' rx='2' fill='white'/><rect x='33' y='12' width='4' height='10' rx='2' fill='white'/><rect x='17' y='34' width='6' height='6' rx='1' fill='%23ffcdd2'/><rect x='25' y='34' width='6' height='6' rx='1' fill='%23ffcdd2'/><rect x='33' y='34' width='6' height='6' rx='1' fill='%23c62828'/></svg>",
  clock:    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%23263238'/><circle cx='28' cy='28' r='16' fill='none' stroke='white' stroke-width='2.5'/><line x1='28' y1='28' x2='28' y2='15' stroke='white' stroke-width='3' stroke-linecap='round'/><line x1='28' y1='28' x2='37' y2='33' stroke='white' stroke-width='2.5' stroke-linecap='round'/><circle cx='28' cy='28' r='2' fill='white'/></svg>",
  store:    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%234a148c'/><polygon points='15,23 41,23 38,40 18,40' fill='white'/><path d='M22 23v-4c0-3.3 2.7-6 6-6s6 2.7 6 6v4' fill='none' stroke='white' stroke-width='3' stroke-linecap='round'/></svg>",
  radio:    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%23e53935'/><rect x='10' y='22' width='36' height='22' rx='4' fill='white'/><circle cx='22' cy='33' r='6' fill='%23e53935'/><circle cx='22' cy='33' r='3' fill='white'/><rect x='31' y='29' width='10' height='2' rx='1' fill='%23e53935'/><rect x='31' y='33' width='7' height='2' rx='1' fill='%23e53935'/><rect x='31' y='37' width='9' height='2' rx='1' fill='%23e53935'/><line x1='28' y1='22' x2='22' y2='12' stroke='white' stroke-width='2.5' stroke-linecap='round'/></svg>",
  calc:     "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%2337474f'/><rect x='11' y='11' width='34' height='12' rx='3' fill='%23546e7a'/><rect x='11' y='27' width='9' height='7' rx='2' fill='white'/><rect x='23' y='27' width='9' height='7' rx='2' fill='white'/><rect x='35' y='27' width='9' height='7' rx='2' fill='%2300c853'/><rect x='11' y='37' width='9' height='7' rx='2' fill='white'/><rect x='23' y='37' width='9' height='7' rx='2' fill='white'/><rect x='35' y='37' width='9' height='7' rx='2' fill='white'/></svg>",
  files:    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%23ff8f00'/><path fill='white' d='M12 20h13l4 4h15v18H12z'/><path fill='rgba(0,0,0,.15)' d='M12 24h32v18H12z'/></svg>",
  email:    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%230277bd'/><rect x='9' y='16' width='38' height='26' rx='3' fill='white'/><polyline points='9,16 28,30 47,16' fill='none' stroke='%230277bd' stroke-width='2.5'/></svg>",
  youtube:  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%23d32f2f'/><rect x='8' y='16' width='40' height='26' rx='5' fill='white'/><polygon points='22,22 22,36 38,29' fill='%23d32f2f'/></svg>",
  facebook: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2020/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%231565c0'/><path fill='white' d='M30 44V30h5l1-6h-6v-3c0-2 .5-3 3-3h3v-6c-1 0-3-.2-5-.2-5 0-8 3-8 8.5V24h-5v6h5v14z'/></svg>",
  weather:  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%230097a7'/><circle cx='22' cy='22' r='7' fill='%23ffca28'/><path fill='white' d='M10 36c0-5.5 4.5-10 10-10 2 0 3.8.6 5.4 1.6C27 25.6 29.4 24 32 24c5 0 9 4 9 9H10z'/></svg>",
  recorder: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%23880e4f'/><rect x='22' y='10' width='12' height='22' rx='6' fill='white'/><path fill='none' stroke='white' stroke-width='2.5' d='M15 28c0 7 5.8 13 13 13s13-6 13-13'/><line x1='28' y1='41' x2='28' y2='47' stroke='white' stroke-width='2.5'/><line x1='20' y1='47' x2='36' y2='47' stroke='white' stroke-width='2.5' stroke-linecap='round'/></svg>",
  alarm:    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%23e65100'/><circle cx='28' cy='30' r='16' fill='white'/><line x1='28' y1='30' x2='28' y2='20' stroke='%23e65100' stroke-width='3' stroke-linecap='round'/><line x1='28' y1='30' x2='35' y2='34' stroke='%23e65100' stroke-width='2.5' stroke-linecap='round'/><line x1='14' y1='18' x2='18' y2='14' stroke='white' stroke-width='2.5' stroke-linecap='round'/><line x1='42' y1='18' x2='38' y2='14' stroke='white' stroke-width='2.5' stroke-linecap='round'/></svg>",
  torch:    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%23f9a825'/><polygon points='20,10 36,10 40,26 16,26' fill='white'/><rect x='19' y='26' width='18' height='18' rx='2' fill='white'/><line x1='28' y1='8' x2='28' y2='4' stroke='white' stroke-width='2'/><line x1='38' y1='11' x2='41' y2='8' stroke='white' stroke-width='2'/><line x1='18' y1='11' x2='15' y2='8' stroke='white' stroke-width='2'/></svg>",
  notes:    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%23558b2f'/><rect x='12' y='10' width='32' height='38' rx='3' fill='white'/><line x1='19' y1='20' x2='37' y2='20' stroke='%23558b2f' stroke-width='2'/><line x1='19' y1='27' x2='37' y2='27' stroke='%23558b2f' stroke-width='2'/><line x1='19' y1='34' x2='30' y2='34' stroke='%23558b2f' stroke-width='2'/></svg>",
  whatsapp: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%231b5e20'/><path fill='white' d='M28 10C18 10 10 18 10 28c0 3.2.9 6.2 2.4 8.8L10 46l9.5-2.5c2.5 1.3 5.4 2 8.5 2 10 0 18-8 18-18S38 10 28 10zm9 24.5c-.4 1-2 1.8-2.8 1.9-.7.1-1.6.1-2.6-.2-1.5-.5-3.5-1.5-6-4-2.5-2.6-4-5-4.4-6.5-.3-.8-.1-2 .6-2.8.5-.6 1.1-.8 1.5-.8h1c.3 0 .6.1.9.8.4.9 1.3 3 1.4 3.2.2.3.3.6.1 1-.1.4-.3.6-.6 1-.3.3-.6.6-.8.8-.3.3-.5.6-.2 1.1.3.5 1.4 2.2 3 3.6 2 1.8 3.7 2.4 4.2 2.6.5.2.8.2 1.1-.1.3-.4 1.4-1.6 1.7-2.1.4-.5.8-.4 1.3-.2.6.2 3.6 1.7 4.2 2 .6.3 1 .5 1.2.8.2.3.2 1.6-.2 2.6z'/></svg>",
  twitter:  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%231da1f2'/><path fill='white' d='M44 16.6c-1.3.6-2.7 1-4.2 1.2 1.5-.9 2.7-2.3 3.2-4-1.4.8-3 1.4-4.6 1.7-1.3-1.4-3.2-2.3-5.3-2.3-4 0-7.3 3.3-7.3 7.3 0 .6.1 1.1.2 1.6-6-.3-11.4-3.2-15-7.6-.6 1.1-.9 2.3-.9 3.6 0 2.5 1.3 4.8 3.2 6.1-1.2 0-2.3-.4-3.3-.9v.1c0 3.5 2.5 6.5 5.8 7.1-.6.2-1.2.3-1.9.3-.5 0-.9 0-1.3-.1.9 2.8 3.5 4.8 6.6 4.9-2.4 1.9-5.5 3-8.8 3-.6 0-1.1 0-1.7-.1C16 40.6 19.9 42 24.1 42c15.2 0 23.5-12.6 23.5-23.5v-1.1c1.6-1.2 3-2.6 4.1-4.3l-.7-.5z'/></svg>",
  google:   "./kaiosrt/gaia/profile/webapps/launcher/style/images/google_search_112.png",
  video:    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' rx='12' fill='%234a148c'/><rect x='8' y='16' width='28' height='26' rx='3' fill='white'/><polygon points='36,22 36,36 48,29' fill='white'/></svg>"
};


// ── Apps ──
const LAUNCHER_IMG = './kaiosrt/gaia/profile/webapps/installed/launcher/style/images/';
const WEB_SHORTCUT_ICON = LAUNCHER_IMG + 'web_shortcut_56.png';
const APPS = [
  { id:'settings',  name:'Settings',  icon: ICO.settings },
  { id:'browser',   name:'Internet',  icon: ICO.browser  },
  { id:'google',    name:'Google',    icon: ICO.google,   url: 'https://www.google.com' },
  { id:'games',     name:'Games',     icon: LAUNCHER_IMG + 'folder_games_56.png',
    type:'folder', apps:[
      { name:'Solitaire',   icon: LAUNCHER_IMG + 'default_app_56.png' },
      { name:'Chess',       icon: LAUNCHER_IMG + 'default_app_56.png' },
      { name:'Snake',       icon: LAUNCHER_IMG + 'default_app_56.png' },
  ]},
  { id:'utilities', name:'Utilities', icon: LAUNCHER_IMG + 'folder_utilities_56.png',
    type:'folder', apps:[
      { name:'Calculator',  icon: ICO.calc  },
      { name:'Calendar',    icon: ICO.alarm },
      { name:'Clock',       icon: ICO.clock },
      { name:'Files',       icon: ICO.files },
  ]},
];
const SM_APPS = APPS.filter(a => a.type !== 'folder');

// ════════════════════════════════════════
//  STATE
// ════════════════════════════════════════
const PER      = 9;
const LIST_PER = 4;
let view     = 'home';   // 'home' | 'sidemenu' | 'apps' | 'app-open'
let smFocus  = 0;        // focused index in sidemenu
let focus    = 0;        // focused index in app grid
let page     = 0;        // current page in app grid
let openApp  = null;     // currently open app object
let fromApps   = false;  // came from app grid before app-open?
let sleepFocus = 0;      // 0=Lock, 1=Restart, 2=Power off
let inputLocked = false; // true after shutdown/restart — blocks all navigation
let booting    = true;  // true during boot animation — blocks all navigation
let lockFromView = 'home';
let appViewMode = 'grid'; // 'grid' | 'list' | 'single'
let listFocus       = 0;  // absolute app index for list/single view
let listWindowStart = 0;  // top of visible 4-item window in list mode
let isMoving    = false;
let _moveOrigApps = null;

// ── Browser app state ──────────────────────
// Electron: proxy.js auto-starts local server port 8899 và cập nhật BW_WEB_PROXY
// GitHub Pages: dùng Deno Deploy (IP sạch, không bị Google/site chặn như Cloudflare).
// Cloudflare worker giữ làm fallback tự động khi Deno lỗi.
var BW_WEB_PROXY = 'https://rigid-tapir-7342.dotrihoang2012.deno.net';
var BW_WEB_PROXY_FALLBACK = 'https://kaios-proxy.dotrihoang2012.workers.dev';

const BW_ICON_PATH = './kaiosrt/gaia/profile/webapps/installed/system/browser/style/img/';
const BW_TILES = [
  { icon: BW_ICON_PATH + 'ic_search_internet.png',  label: 'Search Internet', builtin: true },
  { icon: BW_ICON_PATH + 'ic_history.png',          label: 'History',         builtin: true },
  { icon: BW_ICON_PATH + 'ic_store.png',            label: 'Store',           builtin: true },
  { icon: BW_ICON_PATH + 'ic_google_assistant.png', label: 'Assistant',       builtin: true },
  { icon: './kaiosrt/gaia/profile/webapps/installed/system/browser/preload/ic_fav_facebook.png', label: 'Facebook', url: 'https://www.facebook.com' },
  { icon: BW_ICON_PATH + 'ic_default.png',          label: ''                },
  { icon: BW_ICON_PATH + 'ic_default.png',          label: ''                },
  { icon: BW_ICON_PATH + 'ic_default.png',          label: ''                },
  { icon: BW_ICON_PATH + 'ic_default.png',          label: ''                },
];
let bwFocus     = 0; // 0–8 flat index into BW_TILES
let folderFocus = 0; // focused index inside open folder

const totalPages = () => Math.ceil(APPS.length / PER);
const curApp = () => appViewMode === 'grid'
  ? (APPS[page * PER + focus] || null)
  : (APPS[listFocus] || null);

// ════════════════════════════════════════
//  CLOCK
// ════════════════════════════════════════
const DAYS = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
const MONS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
function pad(n) { return String(n).padStart(2, '0'); }
function animDigit(id, icon) {
  const el = document.getElementById(id);
  if (!el || el.dataset.icon === icon) return;
  el.dataset.icon = icon;
  el.classList.remove('digit-in');
  void el.offsetWidth;
  el.classList.add('digit-in');
}
function tick() {
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();
  const hs = pad(h), ms = pad(m);
  document.getElementById('sb-time').textContent = hs + ':' + ms;
  document.getElementById('cdate').textContent = DAYS[now.getDay()] + '\n' + MONS[now.getMonth()] + ' ' + now.getDate();
  // gaia-icons numeric_X_rounded_semibold glyphs — 24h: always show both hour digits
  document.getElementById('ch1').style.display = '';
  animDigit('ch1', 'numeric_' + hs[0] + '_rounded_semibold');
  animDigit('ch2', 'numeric_' + hs[1] + '_rounded_semibold');
  animDigit('cm1', 'numeric_' + ms[0] + '_rounded_semibold');
  animDigit('cm2', 'numeric_' + ms[1] + '_rounded_semibold');
  if (view === 'lock') tickLock();
}
tick();
setInterval(tick, 5000);

// ════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════
function lbl(t) { document.getElementById('state-lbl').textContent = t; }

function setSK(l, c, r, dark) {
  function setBtn(id, val) {
    const el = document.getElementById(id);
    if (val && val.startsWith('icon:')) {
      el.innerHTML = `<i data-icon="${val.slice(5)}" style="font-size:1.4rem;line-height:1;vertical-align:middle"></i>`;
    } else if (val && val.startsWith('img=')) {
      el.innerHTML = `<img src="${val.slice(4)}" style="height:2.2rem;width:2.2rem;object-fit:contain;vertical-align:middle">`;
    } else {
      el.textContent = val;
    }
  }
  setBtn('sk-l', l);
  setBtn('sk-c', c);
  setBtn('sk-r', r);
  const bar = document.querySelector('.skbar');
  if (!bar.classList.contains('sleep-mode')) {
    bar.style.backgroundImage = dark ? 'none' : 'linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.45))';
    bar.style.color = dark ? '#333' : '#fff';
  }
}

// ════════════════════════════════════════
//  SIDEMENU
//  matches launcher .Sidemenu / .sidemenuItem
// ════════════════════════════════════════

// vertical gap-counts per total item count (launcher nth-of-type selectors)
const SM_GAPS = {
  1:[0], 2:[-0.5,0.5], 3:[-1,0,1], 4:[-1.5,-0.5,0.5,1.5],
  5:[-2,-1,0,1,2],     6:[-2.5,-1.5,-0.5,0.5,1.5,2.5]
};
// closed: offset-y = (5.6rem × 0.71429 + 0.6rem) × gap-count = 4.6rem × gap-count
const SM_STEP = 4.6;
// open: transform per |distance| from focused item (launcher panel-sidemenu--opened)
const SM_POS = [
  { s:1,       x:1,  y:0    },   // dist 0 — focused
  { s:0.89286, x:2,  y:5.9  },   // dist ±1
  { s:0.78571, x:4,  y:10.8 },   // dist ±2
  { s:0.64286, x:7,  y:15   },   // dist ±3
  { s:0.64286, x:11, y:18.8 },   // dist ±4+
];

function buildSidemenu() {
  const menu = document.getElementById('sidemenu');
  menu.innerHTML = '';
  const n    = SM_APPS.length;
  const gaps = SM_GAPS[n] || SM_GAPS[6].slice(0, n);
  SM_APPS.forEach((app, i) => {
    const item = document.createElement('div');
    item.className = 'sidemenu-item';

    const ico = document.createElement('div');
    ico.className = 'sidemenu-icon';
    ico.style.backgroundImage = `url("${app.icon}")`;
    ico.dataset.cy = (SM_STEP * gaps[i]).toFixed(3); // closed offset-y
    ico.style.transform = `translateX(.6rem) translateY(${ico.dataset.cy}rem) scale(.71429)`;

    const nm = document.createElement('div');
    nm.className = 'sidemenu-name';
    nm.textContent = app.name;

    item.append(ico, nm);
    menu.appendChild(item);
  });
}

function renderSidemenu() {
  document.querySelectorAll('.sidemenu-item').forEach((item, i) => {
    const ico = item.querySelector('.sidemenu-icon');
    item.classList.toggle('focused', view === 'sidemenu' && i === smFocus);
    if (view !== 'sidemenu') {
      ico.style.transform = `translateX(.6rem) translateY(${ico.dataset.cy}rem) scale(.71429)`;
    } else {
      const d   = i - smFocus;
      const p   = SM_POS[Math.min(Math.abs(d), SM_POS.length - 1)];
      const dir = d < 0 ? -1 : 1;
      ico.style.transform =
        `translateX(${p.x}rem) translateY(${(p.y * dir).toFixed(3)}rem) scale(${p.s})`;
    }
  });
}

// ════════════════════════════════════════
//  VIEW TRANSITIONS
// ════════════════════════════════════════
function goHome() {
  document.querySelectorAll('.single-previews').forEach(e => e.remove());
  ['ch1','ch2','cm1','cm2'].forEach(id => document.getElementById(id)?.classList.remove('digit-in'));
  document.getElementById('view-home').classList.remove('sidemenu-open');
  document.getElementById('view-home').style.display = '';
  document.getElementById('view-apps').classList.remove('open');
  document.getElementById('view-open-app').classList.remove('visible');
  view    = 'home';
  smFocus = 0;
  renderSidemenu();
  setSK('Notices', 'icon:all-apps', 'Contacts', false);
  lbl('Home screen');
}

function showApps() {
  document.getElementById('view-home').style.display = 'none';
  const va = document.getElementById('view-apps');
  va.classList.add('open');
  va.classList.toggle('view-list',   appViewMode === 'list');
  va.classList.toggle('view-single', appViewMode === 'single');
  document.getElementById('view-open-app').classList.remove('visible');
  view = 'apps';
  if (appViewMode === 'list')   buildList();
  else if (appViewMode === 'single') buildSingle();
  else buildGrid();
}

// ── REAL Settings app: the static Gaia settings bundle (web-settings/, built
// by settings-host/build-web.mjs) — no localhost server. Electron gets a
// <webview> (file:// + disablewebsecurity so the app's XHR loads work) with
// trusted key forwarding via sendInputEvent; the browser build (github.io)
// gets a same-origin <iframe> and synthetic KeyboardEvents. The frame stays
// alive across close so the app resumes where it was, like a real device.
const ST_URL = new URL('web-settings/settings/index.html', location.href).href;
function isStOpen() { return view === 'app-open' && openApp?.id === 'settings'; }
let _stFails = 0;
// Gaia's NavigationMap navigates from `document.querySelector('.focus')` —
// without a focused menu item the key handler can't move between rows and
// the app appears frozen. Settings itself never auto-focuses its first menu
// item (panel code adds .focus on activate), so we do it ourselves once the
// iframe is ready. The Settings root menu is a `<section id="root">` with
// `<li role="menuitem">` rows; tabs (Wi-Fi, etc.) live in their own sections
// and panels bring their own focused element on activate.
function stFocusFirst(wv) {
  var tryFocus = function () {
    try {
      var doc = wv.contentDocument; if (!doc) return;
      // The simulator's own status bar is now kept visible above the iframe
      // (white bg + black icons), so hide the settings app's placeholder to
      // avoid stacking two bars. This only runs while the iframe is same-origin
      // (GitHub Pages), which is the case where the sim status bar is visible.
      var ph = doc.querySelector('.statusbar-placeholder');
      if (ph) { ph.style.display = 'none'; }
      // Also collapse the statusbar height so sections start at the top of the
      // iframe (the simulator's own status bar is already above it).
      doc.documentElement.style.setProperty('--statusbar-height', '0px');
      doc.documentElement.style.setProperty('--statusbar-softkeybar-height', '3rem');
      // Try the root menu first (its panel always exists at boot), then any
      // tab/section, then any [role=menuitem] anywhere in the app.
      var el = doc.querySelector('#root li[role="menuitem"]:not(.hidden)')
            || doc.querySelector('#root li[role="menuitem"]')
            || doc.querySelector('#root li')
            || doc.querySelector('section[role="region"] li[role="menuitem"]:not(.hidden)')
            || doc.querySelector('gaia-tabs [role="tab"]')
            || doc.querySelector('[role="menuitem"]');
      if (!el) return;
      if (!el.classList.contains('focus')) el.classList.add('focus');
      if (typeof el.focus === 'function') { try { el.focus({ preventScroll: false }); } catch (e) { try { el.focus(); } catch (x) {} } }
    } catch (e) {}
  };
  // `load` can fire before Gaia has parsed the locales and injected its panel
  // markup into the document. Try immediately, then again a few times after
  // load so we land on the row once it's been added to the DOM.
  tryFocus();
  [200, 600, 1200].forEach(function (ms) { setTimeout(tryFocus, ms); });
}
function stBuildWebview() {
  const wrap = document.createElement('div');
  wrap.id = 'st-wrap';
  let wv;
  if (isElectron) {
    wv = document.createElement('webview');
    wv.setAttribute('partition', 'persist:kaios-settings');
    wv.setAttribute('disablewebsecurity', '');
    wv.addEventListener('did-fail-load', (ev) => {
      if (ev.isMainFrame === false) return; // subresource
      if (_stFails++ < 3) { setTimeout(() => { try { wv.reload(); } catch (e) { wv.src = ST_URL; } }, 500); return; }
      stCloseSettings();
      wrap.remove();
      showDialog({ header: 'Settings', cancel: '',
        content: 'Không mở được app Settings (web-settings/). Chạy "node settings-host/build-web.mjs" để build bundle rồi mở lại.' });
    });
    wv.addEventListener('did-finish-load', () => { _stFails = 0; stFocusFirst(wv); });
  } else {
    wv = document.createElement('iframe');
    wv.style.cssText = 'width:100%;height:100%;border:none;background:#fff;';
    wv.addEventListener('load', () => { stFocusFirst(wv); });
  }
  wv.id = 'st-webview';
  wv.src = ST_URL;
  // Append the iframe to the DOM
  wrap.appendChild(wv);
  document.getElementById('screen').appendChild(wrap);
  return wrap;
}
function stOpenSettings() {
  _stFails = 0;
  const wrap = document.getElementById('st-wrap') || stBuildWebview();
  // Make sure no other view is layered on top of the settings webview.
  const dv = document.getElementById('view-dialer'); if (dv) dv.classList.remove('visible');
  const ov = document.getElementById('view-open-app'); if (ov) ov.classList.add('visible');
  wrap.classList.add('visible');
  // Keep the simulator's status bar visible but restyle it to match the
  // Settings white theme (black icons/text on white background), like a
  // real KaiOS device. The iframe starts below it; the settings app's own
  // statusbar-placeholder is hidden from stFocusFirst to avoid a double bar.
  const _sb = document.getElementById('statusbar');
  _sb.classList.add('bw-sb');
  _sb.style.background = '#fff';
  _sb.style.color = '#000';
  _sb.style.display = '';
  document.querySelector('.skbar').style.display = 'none'; // page brings its own
  // Position below the simulator status bar.
  wrap.style.top = '';
}
function stCloseSettings() {
  animateCloseApp('st-wrap', () => {
    const wrap = document.getElementById('st-wrap');
    if (wrap) wrap.style.top = '';
    document.querySelector('.skbar').style.display = '';
    const _sb = document.getElementById('statusbar');
    _sb.classList.remove('bw-sb');
    _sb.style.background = '';
    _sb.style.color = '';
    _sb.style.display = '';
    document.getElementById('view-open-app').classList.remove('visible');
    if (fromApps) {
      view = 'apps';
      if (appViewMode === 'list')        buildList();
      else if (appViewMode === 'single') buildSingle();
      else { setSK('', 'Select', 'Options', false); lbl('Apps — ' + (curApp()?.name || '')); }
    } else {
      goHome();
    }
  });
}
function stKey(code) {
  const wv = document.getElementById('st-webview');
  if (!wv) return;
  if (isElectron) {
    try {
      wv.sendInputEvent({ type: 'keyDown', keyCode: code });
      if (code.length === 1) wv.sendInputEvent({ type: 'char', keyCode: code });
      wv.sendInputEvent({ type: 'keyUp', keyCode: code });
    } catch (e) {}
    return;
  }
  // Browser build: prefer __stInjectKey (baked into settings HTML by build-web.mjs
  // — creates KeyboardEvent in iframe realm for Gaia navigation_handler.js).
  // Fall back to direct DOM manipulation when Gaia's NavigationMap hasn't
  // initialised the nav properties (--nav-up/--nav-down/data-nav-id still null)
  // or the injected bridge hasn't been deployed yet.
  const domKey = ({ Up: 'ArrowUp', Down: 'ArrowDown', Left: 'ArrowLeft', Right: 'ArrowRight',
    Return: 'Enter', F1: 'SoftLeft', F2: 'SoftRight' })[code] || code;
  try {
    if (wv.contentWindow && wv.contentWindow.__stInjectKey) {
      wv.contentWindow.__stInjectKey(domKey);
    } else {
      // __stInjectKey bridge not available (engine init errors may have
      // prevented the baked-in script from running). Inject it now via
      // contentWindow.eval() — same-origin on GitHub Pages so this works.
      var win = wv.contentWindow, doc = wv.contentDocument;
      if (!doc) return;
      try {
        win.eval('(' + function _bridge(k) {
          var t = document.querySelector('.focus') || document.activeElement || document.body;
          if (k === 'Enter') {
            // Click the <a> inside focused <li> — this triggers Gaia's
            // PanelUtils.handleLinkClick → Settings.setCurrentPanel(href).
            // Also try clicking <li> itself as a fallback.
            var a = t.querySelector('a[href], a.menu-item');
            if (!a && t.tagName === 'A') a = t;
            if (a) { try { a.click(); } catch (e) {} }
            try { t.click(); } catch (e) {}
          }
          var ev = new KeyboardEvent('keydown', { key: k, code: k, bubbles: true, cancelable: true });
          t.dispatchEvent(ev);
          t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code: k, bubbles: true, cancelable: true }));
        }.toString() + ';window.__stInjectKey=_bridge;');
      } catch (e) {}
      if (win.__stInjectKey) {
        win.__stInjectKey(domKey);
        return;
      }
      // Ultimate fallback: direct DOM manipulation. Handles all keys so
      // navigation is usable even if the engine init chain is broken.
      if (domKey === 'ArrowDown' || domKey === 'ArrowUp') {
        var section = doc.querySelector('.current');
        if (!section) section = doc;
        var all = section.querySelectorAll('li[role="menuitem"]:not(.hidden):not(.non-focus), [role="tab"]:not(.hidden)');
        var cur = doc.querySelector('.focus'); if (!cur && all.length) cur = all[0];
        if (cur && all.length) {
          var idx = -1;
          for (var i = 0; i < all.length; i++) { if (all[i] === cur) { idx = i; break; } }
          if (idx >= 0) {
            var next = domKey === 'ArrowDown' ? (idx + 1) % all.length : (idx - 1 + all.length) % all.length;
            cur.classList.remove('focus');
            all[next].classList.add('focus');
            all[next].focus();
            all[next].scrollIntoView({ block: 'nearest' });
          }
        }
      } else if (domKey === 'Escape' || domKey === 'Backspace') {
        try { win.NavigationMap && win.NavigationMap.navigateBack(); } catch (e) {}
        var backBtn = doc.querySelector('.current > header a[href], [data-icon="back"], button.gaia-icon-back');
        if (backBtn) { try { backBtn.click(); } catch (e) {} }
      } else if (domKey === 'SoftLeft') {
        var skL = doc.getElementById('software-keys-left');
        if (skL) { try { skL.click(); } catch (e) {} }
      } else if (domKey === 'SoftRight') {
        var skR = doc.getElementById('software-keys-right');
        if (skR) { try { skR.click(); } catch (e) {} }
      } else if (domKey === 'Enter') {
        var fcs = doc.querySelector('.focus');
        if (fcs) { try { fcs.click(); } catch (e) {} }
      }
    }
  } catch (e) {}
}
function stKeyFromEvent(e) {
  const map = { ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
    Enter: 'Return', Backspace: 'Backspace', Escape: 'Backspace', F1: 'F1', F2: 'F2', Delete: 'Delete', Tab: 'Tab' };
  if (map[e.key]) { stKey(map[e.key]); return; }
  if (e.key && e.key.length === 1) stKey(e.key);
}
function pressEnd() {
  if (isStOpen()) { stCloseSettings(); return; }
}

let _splashTimer = null;
function openAppView(app) {
  if (!app) app = curApp();
  if (!app) return;
  fromApps = (view === 'apps');
  openApp  = app;
  view     = 'app-open';
  
  // Clean up any previous browser/folder content
  const body = document.getElementById('oa-body');
  body.classList.remove('bw-mode', 'folder-mode');
  body.querySelectorAll('.bw-el').forEach(e => e.remove());
  const hdr = document.getElementById('oa-header');
  hdr.classList.remove('folder-hdr');
  hdr.style.display = '';

  const splash = document.getElementById('splash-screen');
  const splashIcon = document.getElementById('splash-icon');
  splashIcon.src = app.icon || '';
  
  splash.classList.remove('app-opening', 'app-closing');
  void splash.offsetWidth;
  splash.classList.add('visible', 'app-opening');
  
  // Hide main view wrappers to prevent flashing
  document.getElementById('view-open-app').classList.remove('visible');
  document.getElementById('bw-webview-wrap').classList.remove('visible');
  const stWrap = document.getElementById('st-wrap');
  if (stWrap) stWrap.classList.remove('visible');

  // Set timeout for 1.5s as requested by user
  if (_splashTimer) clearTimeout(_splashTimer);
  _splashTimer = setTimeout(() => {
    if (view !== 'app-open' || openApp !== app) {
      splash.classList.remove('visible', 'app-opening');
      return; // user exited early
    }
    splash.classList.remove('visible', 'app-opening');
    _finishOpenAppView(app);
  }, 1500);
}

function _finishOpenAppView(app) {
  document.getElementById('statusbar').classList.remove('bw-sb');
  const bar = document.querySelector('.skbar');
  bar.style.backgroundColor = ''; bar.style.backgroundImage = ''; bar.style.color = '';
  const hdr = document.getElementById('oa-header');
  
  if (app.id === 'settings') {
    hdr.style.display = 'none';
    stOpenSettings();
    document.getElementById('view-open-app').classList.add('visible');
    return;
  }
  if (app.id === 'browser') {
    bwFocus = 0;
    bwLastUrl = '';   // fresh open: Return chỉ hiện sau khi từ web mode nhấn Home
    hdr.style.display = 'none';
    buildBrowserView();
  } else if (app.url) {
    hdr.style.display = 'none';
    document.getElementById('oa-icon').style.cssText = '';
    document.getElementById('oa-name').textContent = '';
    openBwWebView(app.url);
  } else if (app.type === 'folder') {
    folderFocus = 0;
    buildFolderView(app);
  } else {
    hdr.textContent = '';
    const ic = document.getElementById('oa-icon');
    ic.style.cssText =
      `background:none;background-image:url("${app.icon}");` +
      `background-size:contain;background-repeat:no-repeat;background-position:center;`;
    document.getElementById('oa-name').textContent = app.name;
    setSK('', '', '', false);
    const _stubBar = document.querySelector('.skbar');
    _stubBar.style.backgroundColor = '#e6e6e6';
    _stubBar.style.backgroundImage = 'none';
    _stubBar.style.color = '#323232';
    const _stubSb = document.getElementById('statusbar');
    _stubSb.style.background = '#fff';
    _stubSb.style.color = '#000';
    lbl('Open: ' + app.name);
  }
  document.getElementById('view-open-app').classList.add('visible');
}

function buildBrowserView() {
  const body = document.getElementById('oa-body');
  body.querySelectorAll('.bw-el').forEach(el => el.remove());
  body.classList.add('bw-mode');

  const hdr = document.createElement('div');
  hdr.id = 'bw-header'; hdr.className = 'bw-el';
  hdr.textContent = BW_TILES[bwFocus]?.label || 'Internet';
  body.appendChild(hdr);

  const grid = document.createElement('div');
  grid.id = 'bw-grid'; grid.className = 'bw-el';
  BW_TILES.forEach((t, i) => {
    const tile = document.createElement('div');
    tile.className = 'bw-tile' + (i === bwFocus ? ' focused' : '');
    const ico = document.createElement('div');
    ico.className = 'bw-tile-ico' + (i === 3 ? ' lg' : '');
    ico.style.backgroundImage = `url("${t.icon}")`;
    const badge = document.createElement('i');
    badge.className = 'bw-tile-badge';
    badge.textContent = i + 1;
    tile.append(ico, badge);
    grid.appendChild(tile);
  });
  body.appendChild(grid);

  const rec = document.createElement('div');
  rec.id = 'bw-recommended'; rec.className = 'bw-el';
  rec.innerHTML = '<img src="./kaiosrt/gaia/profile/webapps/installed/system/browser/style/img/img_loader.png" style="height:3.2rem;display:block;margin:auto;">';
  body.appendChild(rec);
  if (window._bwLoaderTimer) clearTimeout(window._bwLoaderTimer);
  window._bwLoaderTimer = setTimeout(() => {
    const el = document.getElementById('bw-recommended');
    if (el) el.textContent = 'No content available.';
    window._bwLoaderTimer = null;
  }, 5000);

  document.getElementById('statusbar').classList.add('bw-sb');
  _setBwSK();
  lbl('Browser — ' + (BW_TILES[bwFocus]?.label || 'Internet'));
}

let _bwDialogConfirm = null;

function isBwDialogOpen() {
  return document.getElementById('bw-dialog').classList.contains('visible');
}

function openBwDialog(header, content, confirmLabel, onConfirm) {
  document.getElementById('bw-dialog-header').textContent = header;
  document.getElementById('bw-dialog-content').textContent = content;
  document.getElementById('bw-dialog').classList.add('visible');
  _bwDialogConfirm = onConfirm;
  setSK('Cancel', '', confirmLabel, false);
  const bar = document.querySelector('.skbar');
  bar.style.backgroundColor = '#e6e6e6';
  bar.style.backgroundImage = 'none';
  bar.style.color = '#323232';
}

function closeBwDialog() {
  document.getElementById('bw-dialog').classList.remove('visible');
  _bwDialogConfirm = null;
  renderBw();
}

const isElectron = navigator.userAgent.includes('Electron');

// On non-Electron (github.io), swap <webview> → <iframe>
(function() {
  if (isElectron) return;
  const wv = document.getElementById('bw-iframe');
  if (!wv || wv.tagName !== 'WEBVIEW') return;
  const iframe = document.createElement('iframe');
  iframe.id = 'bw-iframe';
  iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin');
  iframe.style.cssText = 'flex:1;border:none;width:100%;background:#fff;';
  wv.parentNode.replaceChild(iframe, wv);
})();

// Page title: update URL bar (and latest history entry) when the loaded page reports its title
function _bwSetPageTitle(title) {
  if (!title || bwMode !== 'web') return;
  document.getElementById('bw-url-title').textContent = title;
  if (bwHistory[0] && bwHistory[0].url === bwCurrentUrl && bwHistory[0].title !== title) {
    bwHistory[0].title = title;
    try { localStorage.setItem('_bwHistory', JSON.stringify(bwHistory)); } catch(e) {}
  }
}
// Track in-page navigation so bwCurrentUrl always reflects the real page (link clicks, redirects)
function _bwUrlChanged(url) {
  if (!url || bwMode !== 'web' || url === 'about:blank' || url.startsWith('data:')) return;
  try {
    const u = new URL(url);
    const real = u.searchParams.get('url');
    if (real && /^https?:/.test(real)) url = real; // unwrap proxied URL
  } catch(e) { return; }
  const _wasInitial = _bwNavInitial;
  _bwNavInitial = false;
  if (url === bwCurrentUrl) return;
  if (_wasInitial) { /* redirect of the first load — not a navigation step */ }
  else if (_bwNavExpect === 'back')    { _bwNavDepth = Math.max(0, _bwNavDepth - 1); _bwNavFwdCount++; }
  else if (_bwNavExpect === 'forward') { _bwNavDepth++; _bwNavFwdCount = Math.max(0, _bwNavFwdCount - 1); }
  else                                 { _bwNavDepth++; _bwNavFwdCount = 0; }
  _bwNavExpect = null;
  bwCurrentUrl = url;
  document.getElementById('bw-ssl-icon').textContent = url.startsWith('https') ? 'lock' : '';
  document.getElementById('bw-url-title').textContent = _bwDomain(url);
  _bwHistSave(url, _bwDomain(url));
}
// Cross-origin proxied pages post their title (+ real location) via the injected script
window.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'bw-nav-start') {
    // Page is navigating away: show loading bar, hide the lock until the new page arrives
    if (bwMode === 'web') { _bwProgressStart(); document.getElementById('bw-ssl-icon').textContent = ''; }
    return;
  }
  if (e.data.type === 'bw-title') {
    if (e.data.href) _bwUrlChanged(String(e.data.href));
    _bwSetPageTitle(String(e.data.title || '').trim());
    if (bwMode === 'web') {
      _bwProgressEnd();
      document.getElementById('bw-ssl-icon').textContent = (bwCurrentUrl || '').startsWith('https') ? 'lock' : '';
    }
  }
});
// Electron webview reports navigation and title changes natively
(function() {
  const wv = document.getElementById('bw-iframe');
  if (wv && wv.tagName === 'WEBVIEW') {
    const _bwHideScrollCSS = '::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}html{scrollbar-width:none!important}';
    wv.addEventListener('dom-ready', () => { try { wv.insertCSS(_bwHideScrollCSS); } catch(e) {} });
    wv.addEventListener('page-title-updated', e => _bwSetPageTitle(e.title));
    wv.addEventListener('did-navigate', e => _bwUrlChanged(e.url));
    wv.addEventListener('did-navigate-in-page', e => { if (e.isMainFrame) _bwUrlChanged(e.url); });
    wv.addEventListener('did-start-loading', () => {
      if (bwMode === 'web') { _bwProgressStart(); document.getElementById('bw-ssl-icon').textContent = ''; }
    });
    wv.addEventListener('did-stop-loading', () => {
      if (bwMode === 'web') { _bwProgressEnd(); document.getElementById('bw-ssl-icon').textContent = (bwCurrentUrl || '').startsWith('https') ? 'lock' : ''; }
    });
  }
})();

let bwMode = 'home'; // 'home' | 'web'
let bwCurrentUrl = '';
let bwLastUrl = '';
let bwSearchText = '', bwSearchCursor = 0;
let bwSearchFocus = 0; // 0=bar, 1=first suggestion, 2=second...

// ── System generic dialog ──
let _sdOk = null, _sdCancel = null, _sdCenterOk = false;
function isSysDialogOpen() { return document.getElementById('sys-dialog').classList.contains('visible'); }
// showDialog({ header, content, sub, cancel='Cancel', ok='OK', onOk, onCancel, dark })
// No cancel → the OK button sits in the CENTER (single-action dialog).
function showDialog(o) {
  o = o || {};
  document.getElementById('sys-dialog-hdr').textContent = o.header || '';
  const c = document.getElementById('sys-dialog-content');
  c.textContent = o.content || '';
  if (o.sub) { const p = document.createElement('div'); p.className = 'sys-dialog-sub'; p.textContent = o.sub; c.appendChild(p); }
  const cancel = o.cancel !== undefined ? o.cancel : 'Cancel';
  const ok = o.ok !== undefined ? o.ok : 'OK';
  _sdCenterOk = !cancel;
  const sk = document.getElementById('sys-dialog-sk');
  const [l, mid, r] = sk.children;
  if (_sdCenterOk) { l.textContent = ''; mid.textContent = ok; r.textContent = ''; }   // single OK, centered
  else             { l.textContent = cancel; mid.textContent = ''; r.textContent = ok; } // Cancel | OK
  _sdOk = o.onOk || null;
  _sdCancel = o.onCancel || null;
  const d = document.getElementById('sys-dialog');
  d.classList.toggle('dark', !!o.dark);
  // Ensure the panel starts off-screen, then transition up (slide from bottom)
  d.classList.remove('visible', 'closing');
  if (_sdCloseTimer) { clearTimeout(_sdCloseTimer); _sdCloseTimer = null; }
  void document.getElementById('sys-dialog-scrim').offsetWidth;
  requestAnimationFrame(() => d.classList.add('visible'));
}
let _sdCloseTimer = null;
function closeDialog(confirmed) {
  const d = document.getElementById('sys-dialog');
  if (!d.classList.contains('visible') || d.classList.contains('closing')) return;
  const ok = _sdOk, cancel = _sdCancel;
  _sdOk = null; _sdCancel = null;
  // Slide the whole scrim (dim background + panel, as one unit) down together;
  // the softkey bar is hidden instantly by the .closing CSS rule.
  const scrim = document.getElementById('sys-dialog-scrim');
  void scrim.offsetWidth;            // commit the current open position so the slide-down transitions
  d.classList.add('closing');
  const finish = () => {
    if (_sdCloseTimer) { clearTimeout(_sdCloseTimer); _sdCloseTimer = null; }
    scrim.removeEventListener('transitionend', finish);
    d.classList.remove('visible', 'closing');
  };
  scrim.addEventListener('transitionend', finish);
  _sdCloseTimer = setTimeout(finish, 380);   // fallback if transitionend doesn't fire
  if (confirmed) { if (ok) ok(); }
  else { if (cancel) cancel(); }
}

let _toastTimer = null;
function showToast(text) {
  const el = document.getElementById('sys-toast');
  el.textContent = text;
  el.classList.remove('visible');
  void el.offsetWidth;            // restart the banner-bounce animation
  el.classList.add('visible');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.classList.remove('visible'); _toastTimer = null; }, 4000); // matches banner-bounce
}

let _bwOmRow = 0, _bwOmCol = 0;
const _BW_OM = [
  [
    { label: 'Search Internet', a: () => { _bwMenuClose(); openBwSearch(); } },
    { label: 'Go Back',         a: () => { if (!_bwCanGoBack()) return; _bwMenuClose(); _bwNavBack(); } },
    { label: 'Go Forward',      a: () => { if (!_bwCanGoForward()) return; _bwMenuClose(); _bwNavFwd(); } },
    { label: 'Refresh',         a: () => { _bwMenuClose(); if (bwMode === 'web') openBwWebView(bwCurrentUrl); } },
  ],
  [
    { label: 'Minimize',        a: () => { _bwMenuClose(); if(bwCurrentUrl) bwLastUrl=bwCurrentUrl; _bwCloseWebviewCommon(); goHome(); } },
    { label: 'Share',           a: () => { _bwMenuClose(); _bwShareOpen(); } },
    { label: 'Pin To',          a: () => { _bwMenuClose(); _bwPinToStart(); } },
    { label: 'Settings',        a: () => { _bwMenuClose(); } },
  ],
  [
    { label: 'Quit',            a: () => { _bwMenuClose(); bwLastUrl=''; _bwCloseWebviewCommon(); goHome(); } },
    { label: 'Volume',          a: () => { _bwMenuClose(); _bwVolOpen(); } },
    { label: 'Hide shortcuts tips', a: () => { _bwMenuClose(); _bwTipsHide(); } },
  ]
];

function isBwMenuOpen() {
  return document.getElementById('bw-options-menu').classList.contains('visible');
}

function _bwMenuOpen() {
  _bwOmRow = 0; _bwOmCol = 0;
  const om = document.getElementById('bw-options-menu');
  om.classList.add('visible');
  _bwFreezePage(true);
  om.tabIndex = -1; om.focus();
  const menu = om.querySelector('.bw-om-menu');
  if (menu) menu.scrollTop = 0;
  _bwMenuRender();
  _bwMenuInjectOverlay(true);
}

// Freeze the underlying web page: disable mouse and take keyboard focus away
// so arrows/cursor no longer reach it while a browser overlay is open.
function _bwFreezePage(freeze) {
  const f = document.getElementById('bw-iframe');
  if (!f) return;
  if (freeze) {
    f.style.pointerEvents = 'none';
    _bwCursorHide();
    try { f.blur(); } catch(e) {}
    if (document.activeElement && document.activeElement !== document.body) { try { document.activeElement.blur(); } catch(e) {} }
    if (f.tagName === 'WEBVIEW') {
      try { f.executeJavaScript('(function(){try{if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();}catch(e){}})()').catch(()=>{}); } catch(e) {}
    }
  } else {
    // In web mode the physical mouse stays disabled — only the virtual cursor drives the page
    f.style.pointerEvents = (bwMode === 'web') ? 'none' : '';
    if (bwMode === 'web' && !_bwScrollMode) _bwCursorShow();
  }
}

function _bwMenuClose() {
  document.getElementById('bw-options-menu').classList.remove('visible');
  _bwFreezePage(false);
  _bwMenuInjectOverlay(false);
}

function _bwMenuInjectOverlay(show) {
  const f = document.getElementById('bw-iframe');
  if (!f || bwMode !== 'web') return;
  if (f.tagName === 'WEBVIEW') {
    const js = show
      ? `(function(){var e=document.getElementById('__bwmo__');if(!e){e=document.createElement('div');e.id='__bwmo__';e.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:2147483647;pointer-events:none;';document.documentElement.appendChild(e);}})();`
      : `(function(){var e=document.getElementById('__bwmo__');if(e)e.remove();})();`;
    try { f.executeJavaScript(js); } catch(e) {}
  } else {
    try { f.contentWindow?.postMessage({ type: 'bw-overlay', show }, '*'); } catch(e) {}
  }
}

function _bwMenuRender() {
  document.querySelectorAll('.bw-om-icon').forEach(el => {
    el.classList.toggle('focused', _bwOmRow < 2 && +el.dataset.row === _bwOmRow && +el.dataset.col === _bwOmCol);
  });
  document.querySelector('.bw-om-icon[data-icon="arrow-left"]').classList.toggle('disabled', !_bwCanGoBack());
  document.querySelector('.bw-om-icon[data-icon="arrow-right"]').classList.toggle('disabled', !_bwCanGoForward());
  const _omDisabledFocus = _bwOmRow === 0 && ((_bwOmCol === 1 && !_bwCanGoBack()) || (_bwOmCol === 2 && !_bwCanGoForward()));
  document.querySelector('#bw-options-menu .bw-om-sk-c').style.visibility = _omDisabledFocus ? 'hidden' : '';
  document.querySelectorAll('.bw-om-list-item').forEach(el => {
    el.classList.toggle('focused', _bwOmRow === 2 && +el.dataset.idx === _bwOmCol);
  });
  document.getElementById('bw-om-title').textContent = _bwOmRow === 2 ? 'Options' : (_BW_OM[_bwOmRow]?.[_bwOmCol]?.label || '');
  const skr = document.getElementById('bw-om-sk-r');
  skr.innerHTML = (_bwOmRow === 0 && _bwOmCol === 0)
    ? `<img src="${BW_ICON_PATH}ic_google_home.png" style="height:2rem;width:2rem">`
    : '';
  const menu = document.querySelector('#bw-options-menu .bw-om-menu');
  if (menu) {
    if (_bwOmRow < 2) {
      menu.scrollTop = 0;
    } else {
      const focused = document.querySelector('#bw-options-menu .bw-om-list-item.focused');
      if (focused) {
        const fr = focused.getBoundingClientRect(), mr = menu.getBoundingClientRect();
        if (fr.bottom > mr.bottom) menu.scrollTop += fr.bottom - mr.bottom;
        else if (fr.top < mr.top) menu.scrollTop = Math.max(0, menu.scrollTop - (mr.top - fr.top));
      }
    }
  }
}

function _bwMenuNav(dir) {
  if (_bwOmRow < 2) {
    if (dir === 'left')  _bwOmCol = (_bwOmCol + 3) % 4;
    if (dir === 'right') _bwOmCol = (_bwOmCol + 1) % 4;
    if (dir === 'up')    { if (_bwOmRow === 0) { _bwOmRow = 2; _bwOmCol = _BW_OM[2].length - 1; } else _bwOmRow--; }
    if (dir === 'down')  { if (_bwOmRow === 1) { _bwOmRow = 2; _bwOmCol = 0; } else _bwOmRow++; }
  } else {
    const _listMax = _BW_OM[2].length - 1;
    if (dir === 'up')    { if (_bwOmCol === 0) { _bwOmRow = 1; _bwOmCol = 0; } else _bwOmCol--; }
    if (dir === 'down')  { if (_bwOmCol >= _listMax) { _bwOmRow = 0; _bwOmCol = 0; } else _bwOmCol++; }
  }
  _bwMenuRender();
}

function _bwMenuSelect() {
  _BW_OM[_bwOmRow]?.[_bwOmCol]?.a();
}

function _bwMenuVoice() {
  if (_bwOmRow === 0 && _bwOmCol === 0) {
    _bwMenuClose();
    openBwWebView('https://www.google.com/webhp?hl=en');
  }
}

// ── Share panel ──
let _bwShareFocus = 0;
function isBwShareOpen() { return document.getElementById('bw-share-menu').classList.contains('visible'); }
function _bwShareOpen() {
  _bwShareFocus = 0; _bwShareRender();
  const menu = document.getElementById('bw-share-menu');
  menu.classList.add('visible');
  _bwFreezePage(true);
  menu.tabIndex = -1;
  menu.focus();
}
function _bwShareClose() {
  document.getElementById('bw-share-menu').classList.remove('visible');
  _bwFreezePage(false);
}
function _bwShareRender() {
  document.querySelectorAll('.bw-share-item').forEach((el, i) => el.classList.toggle('focused', i === _bwShareFocus));
}
function _bwShareNav(dir) {
  if (dir === 'up')   _bwShareFocus = Math.max(0, _bwShareFocus - 1);
  if (dir === 'down') _bwShareFocus = Math.min(1, _bwShareFocus + 1);
  _bwShareRender();
}
function _bwShareSelect() { _bwShareClose(); }

// ── Media Volume ──
let _mediaVolIdx = 8;
const MEDIA_VOL_MAX = 15;
let _bwVolTimer = null;
function isBwVolOpen() { return document.getElementById('bw-vol-ov').classList.contains('visible'); }
function _bwVolOpen() {
  const ov = document.getElementById('bw-vol-ov');
  ov.classList.add('visible');
  _bwFreezePage(true);
  ov.tabIndex = -1;
  ov.focus();
  _bwVolRender();
}
function _bwVolClose() {
  document.getElementById('bw-vol-ov').classList.remove('visible');
  _bwFreezePage(false);
  if (_bwVolTimer) { clearTimeout(_bwVolTimer); _bwVolTimer = null; }
}
function _bwVolRender() {
  const circle = document.getElementById('bw-vol-circle');
  const icon   = document.getElementById('bw-vol-icon');
  const num    = document.getElementById('bw-vol-num');
  const label  = document.getElementById('bw-vol-label');
  if (_mediaVolIdx === 0) {
    circle.style.width = circle.style.height = '6rem';
    icon.style.display = '';
    icon.dataset.icon  = 'mute-32px';
    num.style.display  = 'none';
    label.textContent  = 'Silent';
  } else {
    // level 1 → 7rem, level 15 → 21rem (tăng đều 1rem/nấc, luôn lớn hơn silent 6rem)
    const size = (_mediaVolIdx + 6) + 'rem';
    circle.style.width = circle.style.height = size;
    icon.style.display = 'none';
    num.style.display  = 'inline';
    num.textContent    = _mediaVolIdx + '/' + MEDIA_VOL_MAX;
    label.textContent  = '';
  }
  if (_bwVolTimer) clearTimeout(_bwVolTimer);
  _bwVolTimer = setTimeout(_bwVolClose, 3000);
}
function _bwVolAdj(delta) {
  _mediaVolIdx = Math.max(0, Math.min(MEDIA_VOL_MAX, _mediaVolIdx + delta));
  _bwVolRender();
}

// ── Tips badge ──
let _bwTipsVisible = true;
let _bwTipsBadgeTimer = null;
// Show with system-app bounceInRight entrance, auto-hide after 10s (như browser_window_buttons.js)
function _bwTipsBadgeShow() {
  if (!_bwTipsVisible) return;
  const b = document.getElementById('bw-tips-badge');
  b.classList.add('visible');
  b.classList.remove('bounceInRight');
  void b.offsetWidth;
  b.classList.add('bounceInRight');
  if (_bwTipsBadgeTimer) clearTimeout(_bwTipsBadgeTimer);
  _bwTipsBadgeTimer = setTimeout(() => {
    b.classList.remove('visible', 'bounceInRight');
    _bwTipsBadgeTimer = null;
  }, 10000);
}
function _bwTipsShow() {
  _bwTipsVisible = true;
  _bwTipsBadgeShow();
  _BW_OM[2][2] = { label: 'Hide shortcuts tips', a: () => { _bwMenuClose(); _bwTipsHide(); } };
  document.querySelectorAll('.bw-om-list-item')[2].querySelector('span').textContent = 'Hide shortcuts tips';
}
function _bwTipsHide() {
  _bwTipsVisible = false;
  document.getElementById('bw-tips-badge').classList.remove('visible');
  _BW_OM[2][2] = { label: 'Show shortcuts tips', a: () => { _bwMenuClose(); _bwTipsShow(); } };
  document.querySelectorAll('.bw-om-list-item')[2].querySelector('span').textContent = 'Show shortcuts tips';
}

// ── Pin To (web mode): step 1 "Pin to" menu → step 2 "Select a spot" picker ──
let _bwPinMode = null; // null | 'menu' | 'picker'
let _bwPinData = null, _bwPinMenuFocus = 0, _bwPinFocus = 3;
const _BW_PIN_FIRST = 3, _BW_PIN_LAST = 8; // pinnable tile range; number badge = idx + 1

function _bwPinCurrentUrl() {
  // Best-effort real URL: live webview/iframe first, then tracked state
  const wv = document.getElementById('bw-iframe');
  try {
    if (wv && wv.tagName === 'WEBVIEW') {
      const u = wv.getURL();
      if (u && /^https?:/.test(u)) return u;
    } else if (wv && wv.src) {
      const p = new URL(wv.src).searchParams.get('url');
      if (p && /^https?:/.test(p)) return p;
      if (/^https?:/.test(wv.src)) return wv.src;
    }
  } catch(e) {}
  return (bwCurrentUrl && /^https?:/.test(bwCurrentUrl)) ? bwCurrentUrl : '';
}
function _bwPinToStart() {
  const url = _bwPinCurrentUrl();
  if (!url) { showToast('Cannot pin this page'); return; }
  _bwPinData = {
    url,
    title: (document.getElementById('bw-url-title').textContent || '').trim() || _bwDomain(url)
  };
  _bwPinMode = 'menu';
  _bwPinMenuFocus = 0;
  document.getElementById('bw-pin-menu').classList.add('visible');
  _bwFreezePage(true);
  _bwMenuInjectOverlay(true);
  _bwPinMenuRender();
}
function _bwPinMenuRender() {
  document.querySelectorAll('.bw-pin-menu-item').forEach((el, i) => el.classList.toggle('focused', i === _bwPinMenuFocus));
}
function _bwPinMenuSelect() {
  if (_bwPinMenuFocus === 1) {
    let fav = '';
    try { fav = 'https://www.google.com/s2/favicons?domain=' + new URL(_bwPinData.url).hostname + '&sz=64'; } catch(e) {}
    APPS.push({
      id: 'webapp-' + Date.now(),
      name: _bwPinData.title,
      url: _bwPinData.url,
      icon: WEB_SHORTCUT_ICON,
      favicon: fav,
      webapp: true
    });
    _bwPinCloseAll();
    showToast('This website has been pinned to Apps Menu.');
    return;
  }
  document.getElementById('bw-pin-menu').classList.remove('visible');
  _bwPinMode = 'picker';
  let empty = -1;
  for (let i = _BW_PIN_FIRST; i <= _BW_PIN_LAST; i++) { if (!BW_TILES[i].builtin && !BW_TILES[i].url) { empty = i; break; } }
  _bwPinFocus = empty >= 0 ? empty : _BW_PIN_FIRST;
  document.getElementById('bw-pin-container').classList.add('visible');
  _bwPinBuildGrid();
  _bwPinRenderPicker();
}
function _bwPinBuildGrid() {
  const g = document.getElementById('bw-pin-grid');
  let html = '';
  for (let i = _BW_PIN_FIRST; i <= _BW_PIN_LAST; i++) {
    const t = BW_TILES[i];
    const occupied = t.builtin || t.url;
    html += `<div class="bw-pin-item"${t.builtin ? ' data-type="fixed"' : ''} data-idx="${i}">`
          + `<div class="bw-pin-ico${occupied ? '' : ' default'}">${occupied ? `<img src="${t.icon}">` : ''}</div>`
          + `<i>${i + 1}</i></div>`;
  }
  g.innerHTML = html;
}
function _bwPinRenderPicker() {
  document.querySelectorAll('.bw-pin-item').forEach(el => el.classList.toggle('focused', +el.dataset.idx === _bwPinFocus));
  const fixed = BW_TILES[_bwPinFocus]?.builtin;
  document.getElementById('bw-pin-sk-c').classList.toggle('hidden', !!fixed);
}
function _bwPinNav(dir) {
  if (_bwPinMode === 'menu') {
    if (dir === 'up')   _bwPinMenuFocus = Math.max(0, _bwPinMenuFocus - 1);
    if (dir === 'down') _bwPinMenuFocus = Math.min(1, _bwPinMenuFocus + 1);
    _bwPinMenuRender();
    return;
  }
  const pos = _bwPinFocus - _BW_PIN_FIRST, col = pos % 3, row = Math.floor(pos / 3);
  let p = pos;
  if (dir === 'left'  && col > 0) p--;
  if (dir === 'right' && col < 2) p++;
  if (dir === 'up'    && row > 0) p -= 3;
  if (dir === 'down'  && row < 1) p += 3;
  _bwPinFocus = _BW_PIN_FIRST + Math.max(0, Math.min(_BW_PIN_LAST - _BW_PIN_FIRST, p));
  _bwPinRenderPicker();
}
function _bwPinConfirm() {
  if (_bwPinMode === 'menu') { _bwPinMenuSelect(); return; }
  const t = BW_TILES[_bwPinFocus];
  if (!t || t.builtin) return;
  let fav = BW_ICON_PATH + 'ic_default.png';
  try { fav = 'https://www.google.com/s2/favicons?domain=' + new URL(_bwPinData.url).hostname + '&sz=64'; } catch(e) {}
  BW_TILES[_bwPinFocus] = { icon: fav, label: _bwPinData.title, url: _bwPinData.url };
  if (openApp?.id === 'browser') {
    buildBrowserView();
    document.querySelectorAll('.bw-el').forEach(el => el.style.display = 'none');
    document.querySelector('.skbar').style.display = 'none';
  }
  _bwPinCloseAll();
  showToast('This website has been pinned to Top Sites.');
}
function _bwPinExit() {
  _bwPinCloseAll();
}
function _bwPinCloseAll() {
  _bwPinMode = null;
  _bwPinData = null;
  document.getElementById('bw-pin-menu').classList.remove('visible');
  document.getElementById('bw-pin-container').classList.remove('visible');
  _bwFreezePage(false);
  _bwMenuInjectOverlay(false);
}

// ── Shortcut Keys Overlay ──
let _bwSCPage = 0;
const _BW_SC_TITLES = ['Shortcut Keys', 'Go to Top/End', 'Zoom', 'Switch Mode'];
function isBwSCOpen() { return document.getElementById('bw-sc-overlay').classList.contains('visible'); }
function openBwShortcut() {
  _bwSCPage = 0;
  _bwSCDemoReset();
  document.getElementById('bw-sc-overlay').classList.add('visible');
  document.getElementById('bw-sc-scrim').classList.add('visible');
  document.getElementById('bw-iframe').style.display = 'none';
  document.getElementById('bw-nav').style.display = 'none';
  document.getElementById('bw-tips-badge').classList.remove('visible');
  const bar = document.querySelector('.skbar');
  bar.style.display = '';
  _bwSCRender();
}
function closeBwShortcut() {
  document.getElementById('bw-sc-overlay').classList.remove('visible');
  document.getElementById('bw-sc-scrim').classList.remove('visible');
  document.getElementById('bw-iframe').style.display = '';
  document.getElementById('bw-nav').style.display = '';
  _bwTipsBadgeShow();
  const bar = document.querySelector('.skbar');
  bar.style.backgroundColor = '';
  bar.style.backgroundImage = '';
  bar.style.color = '';
  bar.style.display = 'none';
}
function _bwSCRender() {
  document.getElementById('bw-sc-header').textContent = _BW_SC_TITLES[_bwSCPage];
  document.querySelectorAll('.bw-sc-page').forEach((el, i) => el.classList.toggle('active', i === _bwSCPage));
  document.querySelectorAll('.sc-dot').forEach((el, i) => el.classList.toggle('active', i === _bwSCPage));
  const lsk = _bwSCPage > 0 ? 'Previous' : '';
  const rsk = _bwSCPage < 3 ? 'Next' : '';
  setSK(lsk, 'OK', rsk, false);
  const bar = document.querySelector('.skbar');
  bar.style.backgroundColor = '#000';
  bar.style.backgroundImage = 'none';
  bar.style.color = '#fff';
}
function _bwSCPrev() {
  if (_bwSCPage > 0) { _bwSCPage--; _bwSCRender(); }
}
function _bwSCNext() {
  if (_bwSCPage < 3) { _bwSCPage++; _bwSCRender(); }
}
let _bwSCZoom = 1.3, _bwSCSwitch = false, _bwSCX = 0, _bwSCY = 0;
function _bwSCDemoReset() {
  _bwSCZoom = 1.3; _bwSCSwitch = false; _bwSCX = 0; _bwSCY = 0;
  document.getElementById('sc-demo-img-1').style.transform = '';
  document.getElementById('sc-demo-img-2').style.transform = 'scale(1.3)';
  document.getElementById('sc-demo-img-3').style.transform = '';
  document.getElementById('sc-switch-frame').classList.remove('scroll-active');
  document.getElementById('sc-switch-btn').style.display = '';
  document.getElementById('sc-switch-cursor').style.display = 'none';
}
function _bwSCDemo(k) {
  if (_bwSCPage === 1) {
    const img = document.getElementById('sc-demo-img-1');
    if (k === '2') img.style.transform = 'translateY(0)';
    if (k === '0') img.style.transform = 'translateY(-30%)';
  } else if (_bwSCPage === 2) {
    const img = document.getElementById('sc-demo-img-2');
    if (k === '1') _bwSCZoom = Math.max(1.0, +(_bwSCZoom - 0.3).toFixed(1));
    if (k === '3') _bwSCZoom = Math.min(1.9, +(_bwSCZoom + 0.3).toFixed(1));
    if (k === '1' || k === '3') img.style.transform = `scale(${_bwSCZoom})`;
  } else if (_bwSCPage === 3) {
    if (k === '5') {
      _bwSCSwitch = !_bwSCSwitch;
      document.getElementById('sc-switch-frame').classList.toggle('scroll-active', _bwSCSwitch);
      document.getElementById('sc-switch-btn').style.display = _bwSCSwitch ? 'none' : '';
      document.getElementById('sc-switch-cursor').style.display = _bwSCSwitch ? '' : 'none';
    }
  }
}
function _bwSCPan(dir) {
  const img = document.getElementById('sc-demo-img-3');
  if (dir === 'up')    _bwSCY = Math.min(0,   _bwSCY + 24);
  if (dir === 'down')  _bwSCY = Math.max(-72, _bwSCY - 24);
  if (dir === 'left')  _bwSCX = Math.min(0,   _bwSCX + 16);
  if (dir === 'right') _bwSCX = Math.max(-32, _bwSCX - 16);
  img.style.transform = `translate(${_bwSCX}px, ${_bwSCY}px)`;
}

// ── Browser History ──
let bwHistory = JSON.parse(localStorage.getItem('_bwHistory') || '[]');
let _bwHistFocus = 0;
let _bwHistFlat = [];
let _bwHistDialogOpen = false;

function _bwHistSave(url, title) {
  if (!url || url === 'about:blank' || url.startsWith('search:')) return;
  bwHistory.unshift({ url, title: title || _bwDomain(url), ts: Date.now() });
  if (bwHistory.length > 200) bwHistory = bwHistory.slice(0, 200);
  try { localStorage.setItem('_bwHistory', JSON.stringify(bwHistory)); } catch(e) {}
}

function isBwHistOpen() {
  return view === 'browser-history';
}

function openBwHistory() {
  view = 'browser-history';
  _bwHistFocus = 0;
  _bwHistDialogOpen = false;
  document.getElementById('bw-webview-wrap').style.display = 'none';
  document.getElementById('view-bw-history').classList.add('visible');
  document.getElementById('statusbar').classList.add('bw-sb');
  document.getElementById('statusbar').style.background = '';
  document.getElementById('statusbar').style.color = '';
  document.querySelector('.skbar').style.display = '';
  _bwHistRender();
}

function closeBwHistory() {
  document.getElementById('view-bw-history').classList.remove('visible');
  document.getElementById('bw-hist-dialog').classList.remove('visible');
  document.getElementById('bw-webview-wrap').style.display = '';
  _bwHistDialogOpen = false;
  view = 'app-open';
  bwFocus = 0;
  renderBw();
}

function _bwHistRender() {
  const list = document.getElementById('bw-hist-list');
  const empty = document.getElementById('bw-hist-empty');
  _bwHistFlat = [];
  if (bwHistory.length === 0) {
    list.innerHTML = '';
    list.style.display = 'none';
    empty.classList.add('visible');
    _bwHistRestoreSK();
    return;
  }
  list.style.display = '';
  empty.classList.remove('visible');
  _bwHistRestoreSK();
  // Time buckets: TODAY / YESTERDAY / LAST 7 DAYS / THIS MONTH / theo tháng (12 tháng) / LAST YEAR / theo năm
  const _t0 = new Date(); _t0.setHours(0,0,0,0);
  const todayStart      = _t0.getTime();
  const yesterdayStart  = todayStart - 86400e3;
  const last7Start      = todayStart - 518400e3; // 6 ngày trước đầu hôm nay
  const monthStart      = new Date(_t0.getFullYear(), _t0.getMonth(), 1).getTime();
  const monthlyStart    = new Date(_t0.getFullYear(), _t0.getMonth() - 11, 1).getTime(); // 12 tháng gần nhất
  const lastYearStart   = new Date(_t0.getFullYear() - 1, 0, 1).getTime();
  const groups = new Map();
  bwHistory.forEach(h => {
    let label;
    if      (h.ts >= todayStart)     label = 'TODAY';
    else if (h.ts >= yesterdayStart) label = 'YESTERDAY';
    else if (h.ts >= last7Start)     label = 'LAST 7 DAYS';
    else if (h.ts >= monthStart)     label = 'THIS MONTH';
    else if (h.ts >= monthlyStart) {
      const d = new Date(h.ts);
      label = d.toLocaleDateString('en-US', { month:'long' }).toUpperCase() + ' ' + d.getFullYear();
    }
    else if (h.ts >= lastYearStart)  label = 'LAST YEAR ' + (_t0.getFullYear() - 1);
    else                             label = 'YEAR ' + new Date(h.ts).getFullYear();
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(h);
  });
  let html = '', idx = 0;
  groups.forEach((items, label) => {
    html += `<div class="bw-hist-section">${label}</div>`;
    items.forEach(h => {
      let fav = '';
      try { fav = `https://www.google.com/s2/favicons?domain=${new URL(h.url).hostname}&sz=32`; } catch(e) {}
      _bwHistFlat.push(h);
      html += `<div class="bw-hist-item" data-idx="${idx}">
        <div class="bw-hist-favicon">
          ${fav ? `<img src="${fav}" onload="this.parentElement.classList.add('has-icon')" onerror="this.remove()">` : ''}
        </div>
        <div class="bw-hist-info">
          <div class="bw-hist-title-text">${_bwHE(h.title||h.url)}</div>
          <div class="bw-hist-url-text">${_bwHE(h.url)}</div>
        </div></div>`;
      idx++;
    });
  });
  list.innerHTML = html;
  _bwHistUpdateFocus();
}


function _bwHE(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function _bwHistUpdateFocus() {
  document.querySelectorAll('#bw-hist-list .bw-hist-item').forEach((el,i) => {
    el.classList.toggle('focused', i === _bwHistFocus);
  });
  const f = document.querySelector('#bw-hist-list .bw-hist-item.focused');
  if (!f) return;
  // Nếu ngay trên item là header nhóm (TODAY...) thì cuộn cả header vào tầm nhìn
  const prev = f.previousElementSibling;
  if (prev && prev.classList.contains('bw-hist-section')) prev.scrollIntoView({ block:'nearest' });
  else f.scrollIntoView({ block:'nearest' });
}

function _bwHistNav(dir) {
  if (dir === 'up') _bwHistFocus = Math.max(0, _bwHistFocus-1);
  else if (dir === 'down') _bwHistFocus = Math.min(_bwHistFlat.length-1, _bwHistFocus+1);
  _bwHistUpdateFocus();
}

function _bwHistGo() {
  const item = _bwHistFlat[_bwHistFocus];
  if (!item) return;
  closeBwHistory();
  openBwWebView(item.url);
}

function _bwHistClearAll() {
  document.getElementById('bw-hist-dialog').classList.add('visible');
  _bwHistDialogOpen = true;
  setSK('Cancel', '', 'Clear', false);
  const bar = document.querySelector('.skbar');
  bar.style.backgroundColor = '#e6e6e6';
  bar.style.backgroundImage = 'none';
  bar.style.color = '#323232';
}

function _bwHistDialogCancel() {
  document.getElementById('bw-hist-dialog').classList.remove('visible');
  _bwHistDialogOpen = false;
  _bwHistRestoreSK();
}

function _bwHistDialogClear() {
  bwHistory = [];
  try { localStorage.removeItem('_bwHistory'); } catch(e) {}
  document.getElementById('bw-hist-dialog').classList.remove('visible');
  _bwHistDialogOpen = false;
  _bwHistRender();
}

function _bwHistRestoreSK() {
  if (bwHistory.length === 0) setSK('Cancel', '', '', false);
  else setSK('Cancel', 'GO', 'Clear All', false);
  const bar = document.querySelector('.skbar');
  bar.style.backgroundColor = '#e6e6e6';
  bar.style.backgroundImage = 'none';
  bar.style.color = '#323232';
}

// Parent-side history tracking for iframe mode (cross-origin pages can't be queried)
let _bwNavDepth = 0, _bwNavFwdCount = 0, _bwNavExpect = null, _bwNavInitial = true;
function _bwNavReset() { _bwNavDepth = 0; _bwNavFwdCount = 0; _bwNavExpect = null; _bwNavInitial = true; }
function _bwCanGoBack() {
  const f = document.getElementById('bw-iframe');
  if (f && f.tagName === 'WEBVIEW') { try { return f.canGoBack(); } catch(e) { return false; } }
  return _bwNavDepth > 0;
}
function _bwCanGoForward() {
  const f = document.getElementById('bw-iframe');
  if (f && f.tagName === 'WEBVIEW') { try { return f.canGoForward(); } catch(e) { return false; } }
  return _bwNavFwdCount > 0;
}
function _bwNavBack() {
  if (!_bwCanGoBack()) return;
  const f = document.getElementById('bw-iframe');
  if (f.tagName === 'WEBVIEW') { try { f.goBack(); } catch(e) {} return; }
  _bwNavExpect = 'back';
  try { f.contentWindow.history.back(); return; } catch(e) {}
  try { f.contentWindow.postMessage({ type: 'bw-history', dir: 'back' }, '*'); } catch(e) {}
}

function _bwNavFwd() {
  if (!_bwCanGoForward()) return;
  const f = document.getElementById('bw-iframe');
  if (f.tagName === 'WEBVIEW') { try { f.goForward(); } catch(e) {} return; }
  _bwNavExpect = 'forward';
  try { f.contentWindow.history.forward(); return; } catch(e) {}
  try { f.contentWindow.postMessage({ type: 'bw-history', dir: 'forward' }, '*'); } catch(e) {}
}

function _bwProgressStart() {
  document.getElementById('bw-progress').classList.add('bw-p-active');
  const f = document.getElementById('bw-progress-fill');
  f._pOn = true;
  const onEnd = () => {
    if (!f._pOn) return;
    if (f.classList.contains('bw-p-in')) { f.classList.remove('bw-p-in'); void f.offsetWidth; f.classList.add('bw-p-out'); }
    else { f.classList.remove('bw-p-out'); void f.offsetWidth; f.classList.add('bw-p-in'); }
  };
  f._pEnd = onEnd;
  f.addEventListener('animationend', onEnd);
  f.classList.remove('bw-p-in','bw-p-out');
  void f.offsetWidth;
  f.classList.add('bw-p-in');
}
function _bwProgressEnd() {
  const f = document.getElementById('bw-progress-fill');
  f._pOn = false;
  if (f._pEnd) { f.removeEventListener('animationend', f._pEnd); f._pEnd = null; }
  f.classList.remove('bw-p-in','bw-p-out');
  document.getElementById('bw-progress').classList.remove('bw-p-active');
}

function _bwUrlFromText(text) {
  text = text.trim();
  if (/^https?:\/\//i.test(text)) return text;
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/|$)/.test(text) && !text.includes(' '))
    return 'https://' + text;
  return 'https://www.google.com/search?q=' + encodeURIComponent(text);
}

function _bwIsSearch(text) {
  text = text.trim();
  if (/^https?:\/\//i.test(text)) return false;
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/|$)/.test(text) && !text.includes(' ')) return false;
  return true;
}

async function _bwSearchWeb(query) {
  bwMode = 'web';
  bwCurrentUrl = 'search:' + query;
  bwZoom = 0.7;
  _bwResetZoomStyles();
  _bwNavReset();
  _bwCursorReset();
  document.querySelectorAll('.bw-el').forEach(el => el.style.display = 'none');
  document.getElementById('bw-webview-wrap').classList.add('visible');
  document.getElementById('bw-ssl-icon').textContent = '';
  document.getElementById('bw-url-title').textContent = query;
  _bwProgressStart();
  const _sb3 = document.getElementById('statusbar');
  _sb3.classList.add('bw-sb');
  _sb3.style.background = '';
  _sb3.style.color = '';
  document.querySelector('.skbar').style.display = 'none';
  document.getElementById('bw-nav').classList.add('visible');
  document.getElementById('bw-iframe').style.pointerEvents = 'none'; // physical mouse off; virtual cursor only

  const iframe = document.getElementById('bw-iframe');
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  try {
    // Try the primary proxy (Deno), then the Cloudflare fallback; a couple of
    // attempts each since some egress IPs get bot-blocked intermittently.
    let data = null;
    const _proxies = [BW_WEB_PROXY, BW_WEB_PROXY_FALLBACK].filter(Boolean);
    for (const px of _proxies) {
      for (let att = 0; att < 2 && !data; att++) {
        try {
          const r = await fetch(px + '?search=' + encodeURIComponent(query));
          if (!r.ok) continue;
          const d = await r.json();
          if (d.results && d.results.length) data = d;
        } catch (e) {}
      }
      if (data) break;
    }
    if (!data) throw new Error();
    // Bing wraps result links in a bing.com/ck/a?...&u=a1<base64url> tracker;
    // decode to the real URL client-side so we show/open it clean regardless of
    // which proxy build is deployed.
    const _unBing = u => {
      u = String(u || '').replace(/&amp;/g, '&');
      const m = u.match(/[?&]u=a1([^&]+)/);
      if (m) { try { let b = m[1].replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; return atob(b); } catch (e) {} }
      return u;
    };
    const results = (data.results || []).slice(0, 15).map(r => ({ ...r, url: _unBing(r.url) }));
    const _host = u => { try { return new URL(u).hostname.replace(/^www\./,''); } catch { return u; } };
    iframe.srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,Roboto,sans-serif;background:#fff;padding:14px 16px 20px;font-size:14px;color:#202124;-webkit-text-size-adjust:100%}
      .qh{color:#5f6368;font-size:12px;margin-bottom:16px}
      .qh b{color:#202124}
      .r{margin-bottom:22px}
      .site{display:flex;align-items:center;gap:8px;margin-bottom:5px}
      .fav{width:24px;height:24px;border-radius:50%;flex-shrink:0;background:#f1f3f4;object-fit:contain}
      .host{color:#4d5156;font-size:12px;line-height:1.15;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
      a.t{color:#1a0dab;font-size:18px;font-weight:400;text-decoration:none;display:block;margin-bottom:3px;line-height:1.3}
      a.t:visited{color:#681da8}
      .s{color:#4d5156;font-size:13px;line-height:1.5}
      .pw{text-align:center;color:#bbb;font-size:11px;margin-top:14px}
      .none{text-align:center;color:#666;padding:2rem 1rem;font-size:13px}
    </style></head><body>
    <div class="qh">Results for <b>${esc(query)}</b></div>
    ${results.length===0 ? '<div class="none">No results found</div>' :
      results.map(r=>{
        const host = _host(r.url);
        const fav = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(host) + '&sz=64';
        return `<div class="r">
        <div class="site"><img class="fav" src="${fav}" onerror="this.style.visibility='hidden'"><span class="host">${esc(host)}</span></div>
        <a class="t" href="${BW_WEB_PROXY}?url=${encodeURIComponent(r.url)}">${esc(r.title||'')}</a>
        <div class="s">${esc(r.content||'')}</div>
      </div>`;}).join('')}
    <div class="pw">Web results</div></body></html>`;
  } catch {
    iframe.srcdoc = `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:2rem;color:#666;font-size:13px">Search failed. Please try again.</body></html>`;
  }
  _bwProgressEnd();
  _bwApplyZoom(iframe);
  if (!_bwScrollMode) _bwCursorShow();
}

function _bwDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./,''); } catch { return url; }
}

function _bwLoadWebFallback(url, iframe, onLoad) {
  if (!BW_WEB_PROXY) {
    iframe.srcdoc = `<!DOCTYPE html><html><body style="font-family:'Open Sans',sans-serif;text-align:center;padding:1.5rem;color:#555;margin-top:2rem;font-size:10px"><div style="font-size:3rem;margin-bottom:1rem">🔒</div><p style="font-size:1.5rem;color:#333;font-weight:600;margin:0 0 0.8rem">Cần Proxy Server</p><p style="font-size:1.2rem;color:#666;margin:0 0 1.5rem;line-height:1.6">Deploy <b>worker.js</b> lên Cloudflare Workers rồi điền URL vào <b>BW_WEB_PROXY</b></p><a href="${url}" target="_blank" style="display:inline-block;padding:0.6rem 1.2rem;background:#8000ff;color:#fff;border-radius:2rem;font-size:1.2rem;text-decoration:none">Mở trong trình duyệt</a></body></html>`;
    if (onLoad) onLoad();
    return;
  }
  iframe.onload = onLoad;
  iframe.src = BW_WEB_PROXY + '?url=' + encodeURIComponent(url);
}


function openBwWebView(url) {
  _bwTipsBadgeShow();
  bwMode = 'web';
  bwCurrentUrl = url;
  bwZoom = 0.7;
  _bwResetZoomStyles();
  _bwNavReset();
  _bwCursorReset();
  document.querySelectorAll('.bw-el').forEach(el => el.style.display = 'none');
  const wrap = document.getElementById('bw-webview-wrap');
  wrap.classList.add('visible');
  document.getElementById('bw-ssl-icon').textContent = '';
  document.getElementById('bw-url-title').textContent = _bwDomain(url);
  const iframe = document.getElementById('bw-iframe');
  _bwProgressStart();
  const onLoad = () => {
    _bwProgressEnd();
    document.getElementById('bw-ssl-icon').textContent = url.startsWith('https') ? 'lock' : '';
    let title = '';
    try { if (iframe.tagName === 'WEBVIEW') title = iframe.getTitle() || '';
          else title = iframe.contentDocument?.title || ''; } catch(e) {}
    // Only overwrite when we truly read a title — cross-origin pages already
    // reported theirs via the injected bw-title message; don't clobber it.
    if (title) document.getElementById('bw-url-title').textContent = title;
    _bwHistSave(url, title || _bwDomain(url));
    _bwApplyZoom(iframe);
    if (!_bwScrollMode) _bwCursorShow();
  };
  if (iframe.tagName === 'WEBVIEW') {
    iframe.removeEventListener('did-finish-load', iframe._loadHandler);
    iframe._loadHandler = onLoad;
    iframe.addEventListener('did-finish-load', onLoad, { once: true });
    iframe.src = url;
  } else {
    _bwLoadWebFallback(url, iframe, onLoad);
  }
  const _sb = document.getElementById('statusbar');
  _sb.classList.add('bw-sb');
  _sb.style.background = '';
  _sb.style.color = '';
  document.querySelector('.skbar').style.display = 'none';
  document.getElementById('bw-nav').classList.add('visible');
  document.getElementById('bw-iframe').style.pointerEvents = 'none'; // physical mouse off; virtual cursor only
}

function _bwCloseWebviewCommon() {
  document.getElementById('bw-tips-badge').classList.remove('visible');
  _bwExitScrollMode();
  _bwCursorHide();
  bwZoom = 0.7;
  _bwResetZoomStyles();
  bwMode = 'home';
  bwCurrentUrl = '';
  animateCloseApp('bw-webview-wrap', () => {
    const _f = document.getElementById('bw-iframe');
    if (_f) {
      _f.style.pointerEvents = '';
      if (_f.tagName === 'WEBVIEW') { _f.removeAttribute('srcdoc'); }
      _f.src = 'about:blank';
    }
    _bwProgressEnd();
    document.querySelectorAll('.bw-el').forEach(el => el.style.display = '');
    document.getElementById('statusbar').classList.remove('bw-sb');
    const _sk = document.querySelector('.skbar');
    _sk.style.display = '';
    _sk.style.backgroundColor = '';
    _sk.style.backgroundImage = '';
    _sk.style.color = '';
    document.getElementById('bw-nav').classList.remove('visible');
  });
}

// Return từ browser home về web mode — hỗ trợ cả trang search results lẫn URL thường
function _bwReturnToWeb() {
  if (!bwLastUrl) return;
  if (bwLastUrl.startsWith('search:')) _bwSearchWeb(bwLastUrl.slice(7));
  else openBwWebView(bwLastUrl);
}

// Home nav button: saves URL và chuyển về browser home
function _bwNavHome() {
  if (bwCurrentUrl) bwLastUrl = bwCurrentUrl;
  _bwCloseWebviewCommon();
  bwFocus = 0;
  if (openApp?.url) {
    openApp = APPS.find(a => a.id === 'browser') || openApp;
    document.getElementById('oa-header').style.display = 'none';
    buildBrowserView();
  }
  document.getElementById('statusbar').classList.add('bw-sb');
  renderBw();
}

// Back/End key: đóng và về đúng màn hình (browser home nếu là browser app, main home nếu là URL app)
function closeBwWebView() {
  if (bwCurrentUrl) bwLastUrl = bwCurrentUrl;
  _bwCloseWebviewCommon();
  if (openApp?.id === 'browser') {
    bwFocus = 0;
    document.getElementById('statusbar').classList.add('bw-sb');
    renderBw();
  } else {
    goHome();
  }
}

let bwZoom = 0.7;

function bwWebKey(k) {
  if (isBwVolOpen() || isBwShareOpen()) return;
  if (k === '#') { isBwSCOpen() ? closeBwShortcut() : openBwShortcut(); return; }
  if (isBwSCOpen()) { _bwSCDemo(k); return; }
  if (k === '5') { _bwToggleScrollMode(); return; }
  if (k === '2') { _bwScrollTo('top');    return; }
  if (k === '0') { _bwScrollTo('bottom'); return; }
  const wv = document.getElementById('bw-iframe');
  if (!wv) return;
  let zoomed = false;
  if (wv.tagName === 'WEBVIEW') {
    if (k === '1') { bwZoom = Math.max(0.5, +(bwZoom - 0.1).toFixed(1)); wv.setZoomFactor(bwZoom); zoomed = true; }
    if (k === '3') { bwZoom = Math.min(3.0, +(bwZoom + 0.1).toFixed(1)); wv.setZoomFactor(bwZoom); zoomed = true; }
  } else {
    if (k === '1') { bwZoom = Math.max(0.5, +(bwZoom - 0.1).toFixed(1)); _bwZoomFallback(wv); zoomed = true; }
    if (k === '3') { bwZoom = Math.min(3.0, +(bwZoom + 0.1).toFixed(1)); _bwZoomFallback(wv); zoomed = true; }
  }
  // Re-draw the cursor so it recomputes its counter-scaled size (stays fixed on screen)
  if (zoomed && _curActive) { setTimeout(() => _bwCursorPush(true), 0); }
}

// Apply the current bwZoom to a freshly loaded page (default 80%)
function _bwApplyZoom(wv) {
  if (!wv) return;
  if (wv.tagName === 'WEBVIEW') { try { wv.setZoomFactor(bwZoom); } catch(e) {} }
  else { _bwZoomFallback(wv); }
  if (_curActive) setTimeout(() => _bwCursorPush(true), 0);
}
// Zoom for iframe mode: scale + compensate BOTH width and height so the page fills the viewport
function _bwZoomFallback(wv) {
  if (!wv._baseH) wv._baseH = wv.offsetHeight; // layout height at zoom 1 (before overriding flex)
  const reset = bwZoom === 1;
  wv.style.transformOrigin = '0 0';
  wv.style.transform = reset ? '' : `scale(${bwZoom})`;
  wv.style.flex      = reset ? '' : 'none';
  wv.style.width     = reset ? '' : (100 / bwZoom) + '%';
  wv.style.height    = reset ? '' : (wv._baseH / bwZoom) + 'px';
}
function _bwResetZoomStyles() {
  const f = document.getElementById('bw-iframe');
  if (!f || f.tagName === 'WEBVIEW') return;
  f.style.transform = ''; f.style.width = ''; f.style.height = ''; f.style.flex = '';
  f._baseH = null;
}

// Scroll to top/bottom of the page — works on webview, same-origin iframe (srcdoc), and proxied pages
function _bwScrollTo(pos) {
  const wv = document.getElementById('bw-iframe');
  if (!wv) return;
  if (wv.tagName === 'WEBVIEW') {
    const js = pos === 'top'
      ? '(document.scrollingElement||document.documentElement).scrollTop=0'
      : '(function(){var e=document.scrollingElement||document.documentElement;e.scrollTop=e.scrollHeight;})()';
    try { wv.executeJavaScript(js).catch(()=>{}); }
    catch(e) { try { require('electron').ipcRenderer.invoke('wv-scroll', wv.getWebContentsId(), pos); } catch(e2) {} }
  } else {
    let done = false;
    try {
      const d = wv.contentDocument;
      if (d) { const el = d.scrollingElement || d.documentElement; el.scrollTop = pos === 'top' ? 0 : el.scrollHeight; done = true; }
    } catch(e) {}
    if (!done) { try { wv.contentWindow.postMessage({type:'bw-scroll', dir: pos}, '*'); } catch(e){} }
  }
}

let _bwScrollMode = false;
function _bwToggleScrollMode() {
  _bwScrollMode = !_bwScrollMode;
  document.getElementById('bw-scroll-ind').classList.toggle('visible', _bwScrollMode);
  // Scroll mode hides the virtual cursor; cursor mode hides the edge arrows
  if (_bwScrollMode) _bwCursorHide(); else _bwCursorShow();
}
function _bwExitScrollMode() {
  _bwScrollMode = false;
  document.getElementById('bw-scroll-ind').classList.remove('visible');
}

// ── Virtual cursor (KaiOS-style pointer in web mode) ──
// The cursor lives INSIDE the page (fixed-position img) so it always paints on
// top of page content — Electron <webview> otherwise composites over any parent DOM.
const CUR_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAGqADAAQAAAABAAAAGgAAAABMybYKAAACM0lEQVRIDa3Uv4saURAH8DsPjSIIaSxCuEKIBotYWMRCm1icTWzO6mxCbCyuC8Q/IATSpbESIW0CVhYHQkBsbPwDFIIgHAcBRdf9Hc/dyXeOGJZlY3Z1Fx7umzczH95jfScnDg8RvXMI+x8CxM+1/51tHVmZz+fiZrOp25b8nTKUSCRosVgo2+32jb/dLd0YwpSSySQtl0vGrizL/r3uIMbS6TStVisFsUv/hD+drBBjmUyG1us1Y699xewQY9lsliRJYuzCN8wJYiyXy5GMB+uvfMH+BTFWKBRIURTG8kdj+yDGisUiqaoqIe/lUdj/IMZKpRJjInKzB2NuIMbK5TIf4xr5Lw7C3EKMVSoVE5iAmrRnzAvEWLVaNYAtUffME+YVCgaD1Gg0DFzCP1GbcI3tg0KhEA0GA302mwm4B2U0/2UYxlbTNNE0zR+o/YbxyBVmhwKBAKVSqYeLlo+q0+nIaP4ZeU8xoq6aOiVZIT6WbrerDIdDmREe+XyeRFG8dar1FNtB4XCY+v2+jKY3OBrBuqvpdMr/oeOuIoZisRiNRiMZF+lXTM90Xf/UbDb13a7q9bopCMKNpx3Ykxkaj8cikBZeT3kdv+f4hNVIJPJwfNFolG8GDfEn9nrXcxTz89FegB18r9Vqfz+KVquFE9U+2PNcz4G8d0pG/GIymYhYo3g8Tu12+x5f3x3iAaf8g2NoeIrju+v1ehJ2ouIj+YLY84Mb7itE47cYDYzH+/Lsa78BgVUCjf/Bb48AAAAASUVORK5CYII=';
const CUR_PTR_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA4ZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDY3IDc5LjE1Nzc0NywgMjAxNS8wMy8zMC0yMzo0MDo0MiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDoxZTdiZmZmMy02NWViLTQ5YzQtODRiYi1kZTNmZmExZDU4Y2QiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RkUzOENENjU1NUI2MTFFNjhBQTY5MTE4NjE1REVCOEUiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RkUzOENENjQ1NUI2MTFFNjhBQTY5MTE4NjE1REVCOEUiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKE1hY2ludG9zaCkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozY2M3NzUwMy01YTM5LTQ1YzYtOWVhMS1iZTlmOTEzZWIwYzMiIHN0UmVmOmRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDowNmI1YTA1Mi05ZGJjLTExNzktODBmMi1mMzIzZWQxYjUwZjMiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz5Zp5DDAAABuElEQVR42syWMWvCQBTHk5ai2MXNTUq+hh9DcNOlg9AvYMfuHTK1Q6CDe+lisFBcpBU7iGAKdnNKwUINpkFIcXh9F/rkTK+5M7XSP/zNweXul3e+9xJNk+sMfY8G9CP6nJ8EACWrQNhdkMvlgMY8bFugKJJOpwNM/X4fuMg2AukSENBmJF1fLdHjc0na03akJNDhrkAHuwLJ5KAvfgOvoa/Rr5TOvLgUJ7+gn9EWOqua3jXBRmsgwzBgOBzCaDSCfD4vArOSKMtAUd1YlgXT6RR83/8GGgwGq3Gz2QTXdWE8HkcFnclkeGA5CSQ8KhX1er3oapomgew/AZHm8zmB/KTOIOwEqtUf7x64Tv9XnSFSsVjcCkh6dKk2VTg6j/3MZrPUkDAMafiRdHSsjrRWq5Ua5Hne2kP/pGMWMav+xWIBadRutym9b/n0jkd0hb6bTCZavV5PFVG32107nSQZ6Hf2VI1GY6NogiCAQqFAEZVUvhlK1CWq1SrgHyyFLJdLqFQqwmOTZTGDBWyhbdtSkOM4BHlDH236FXQqem1IfCl6H+1LQA9f9ZBlTUJy7xP6Bjc9EU1+CjAAHiLfZiALOxAAAAAASUVORK5CYII=';
let _curX = 0, _curY = 0, _curActive = false, _curInit = false;
const _CUR_STEP = 6, _CUR_EDGE = 4;
function _bwCursorReset() { _curInit = false; }
function _bwCursorDims() {
  // Visible web area (screen px) — NOT the iframe's own clientWidth, which balloons
  // when zoomed out via CSS transform (width:(100/zoom)%). _curX/_curY live in screen px.
  const wrap = document.getElementById('bw-webview-wrap');
  const tb = document.getElementById('bw-topbar');
  const W = (wrap && wrap.clientWidth) || 240;
  const H = ((wrap && wrap.clientHeight) || 294) - ((tb && tb.offsetHeight) || 24);
  return { W, H };
}
// Build the in-page cursor updater (defines window.__bwc once; picks default vs
// pointer image based on the element under the point). Reused by webview + iframe.
function _bwCursorHelperJS() {
  return `if(!window.__bwc){window.__bwc=function(x,y,show,sz){sz=sz||26;var c=document.getElementById('__bwcur__');if(show){if(!c){c=document.createElement('img');c.id='__bwcur__';c.style.cssText='position:fixed;z-index:2147483647;pointer-events:none;';(document.documentElement||document.body).appendChild(c);}c.style.left=x+'px';c.style.top=y+'px';c.style.width=sz+'px';c.style.height=sz+'px';c.style.display='block';var pt=false;try{var n=document.elementFromPoint(x,y);while(n){var cs=(getComputedStyle(n).cursor||'');if(cs==='pointer'){pt=true;break;}var tg=n.tagName;if(tg==='A'||tg==='BUTTON'||tg==='SELECT'||tg==='TEXTAREA'||(tg==='INPUT'&&n.type!=='hidden')){pt=true;break;}n=n.parentElement;}}catch(e){}var k=pt?'p':'d';if(c.getAttribute('data-k')!==k){c.src=(pt?window.__bwcPTR:window.__bwcDEF);c.setAttribute('data-k',k);}}else if(c){c.parentNode&&c.parentNode.removeChild(c);}};window.__bwcDEF='${CUR_DATA_URI}';window.__bwcPTR='${CUR_PTR_URI}';}`;
}
// Counter-scale the in-page cursor so it stays a fixed 26px on screen regardless of page zoom
function _bwCurCoords() {
  const z = bwZoom || 1;
  return { cx: _curX / z, cy: _curY / z, sz: 26 / z };
}
function _bwCursorPush(show) {
  const wv = document.getElementById('bw-iframe');
  if (!wv) return;
  const { cx, cy, sz } = _bwCurCoords();
  if (wv.tagName === 'WEBVIEW') {
    const js = _bwCursorHelperJS() + `window.__bwc(${cx},${cy},${show?'true':'false'},${sz});`;
    try { wv.executeJavaScript(js).catch(()=>{}); } catch(e) {}
  } else {
    // Same-origin (search results srcdoc) → run helper directly; else postMessage to proxied page
    let done = false;
    try {
      const w = wv.contentWindow;
      if (w && wv.contentDocument) {
        if (!w.__bwc) { const s = wv.contentDocument.createElement('script'); s.textContent = _bwCursorHelperJS(); wv.contentDocument.documentElement.appendChild(s); }
        if (w.__bwc) { w.__bwc(cx, cy, !!show, sz); done = true; }
      }
    } catch(e) {}
    if (!done) { try { wv.contentWindow.postMessage({ type:'bw-cursor', x:cx, y:cy, sz, show:!!show }, '*'); } catch(e) {} }
  }
}
function _bwCursorShow() {
  const wv = document.getElementById('bw-iframe');
  if (!wv || bwMode !== 'web') return;
  if (!_curInit) {
    const { W, H } = _bwCursorDims();
    _curX = Math.round(W / 2);
    _curY = Math.round(H / 2);
    _curInit = true;
  }
  _curActive = true;
  _bwCursorPush(true);
}
function _bwCursorHide() {
  _curActive = false;
  _bwCursorPush(false);
}
function _bwCursorRender() { _bwCursorPush(true); }
function _bwCursorMove(dir) {
  const { W, H } = _bwCursorDims();
  const CUR_SZ = 26;                 // cursor image size — keep it fully on-screen
  const MAXX = W - CUR_SZ, MAXY = H - CUR_SZ;
  // Step scales with zoom: zoomed out → slower, zoomed in → faster (cursor size unchanged)
  const step = Math.max(2, Math.round(_CUR_STEP * bwZoom));
  let scroll = null;
  if (dir === 'left')  { _curX -= step; if (_curX <= _CUR_EDGE) { _curX = _CUR_EDGE; scroll = 'left';  } }
  if (dir === 'right') { _curX += step; if (_curX >= MAXX)      { _curX = MAXX;      scroll = 'right'; } }
  if (dir === 'up')    { _curY -= step; if (_curY <= _CUR_EDGE) { _curY = _CUR_EDGE; scroll = 'up';    } }
  if (dir === 'down')  { _curY += step; if (_curY >= MAXY)      { _curY = MAXY;      scroll = 'down';  } }
  if (scroll) _bwScrollBy(scroll);
  _bwCursorPush(true);
}
function _bwCursorClick() {
  const wv = document.getElementById('bw-iframe');
  if (!wv || !_curActive) return;
  if (wv.tagName === 'WEBVIEW') {
    try {
      wv.sendInputEvent({ type:'mouseMove', x:_curX, y:_curY });
      wv.sendInputEvent({ type:'mouseDown', x:_curX, y:_curY, button:'left', clickCount:1 });
      wv.sendInputEvent({ type:'mouseUp',   x:_curX, y:_curY, button:'left', clickCount:1 });
    } catch(e) {}
  } else {
    const { cx, cy } = _bwCurCoords();
    let done = false;
    try {
      const d = wv.contentDocument;
      if (d) { const el = d.elementFromPoint(cx, cy); if (el) { el.focus && el.focus(); el.click && el.click(); } done = true; }
    } catch(e) {}
    if (!done) { try { wv.contentWindow.postMessage({ type:'bw-click', x:cx, y:cy }, '*'); } catch(e) {} }
  }
  // A click gives the page keyboard focus; return it to the simulator so arrows keep
  // driving the virtual cursor instead of scrolling the page.
  setTimeout(() => {
    try { wv.blur(); } catch(e) {}
    if (wv.tagName === 'WEBVIEW') {
      try { wv.executeJavaScript('(function(){try{if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();}catch(e){}})()').catch(()=>{}); } catch(e) {}
    } else {
      try { const d = wv.contentDocument; if (d && d.activeElement && d.activeElement.blur) d.activeElement.blur(); } catch(e) {}
    }
  }, 0);
}
function _bwScrollBy(dir) {
  const wv = document.getElementById('bw-iframe');
  if (!wv) return;
  const STEP = 10;
  const dx = dir === 'left' ? -STEP : dir === 'right' ? STEP : 0;
  const dy = dir === 'up'   ? -STEP : dir === 'down'  ? STEP : 0;
  if (wv.tagName === 'WEBVIEW') {
    const js = `(function(){var e=document.scrollingElement||document.documentElement;e.scrollLeft+=(${dx});e.scrollTop+=(${dy});})()`;
    try { wv.executeJavaScript(js).catch(()=>{}); }
    catch(e) { try { require('electron').ipcRenderer.invoke('wv-scroll-by', wv.getWebContentsId(), dx, dy); } catch(e2) {} }
  } else {
    // Try direct DOM access (same-origin), fall back to postMessage (cross-origin proxied page)
    let done = false;
    try {
      const d = wv.contentDocument;
      if (d) { const el = d.scrollingElement || d.documentElement; el.scrollLeft += dx; el.scrollTop += dy; done = true; }
    } catch(e) {}
    if (!done) { try { wv.contentWindow.postMessage({type:'bw-scroll-by', dx, dy}, '*'); } catch(e){} }
  }
}
// D-pad / arrow in web mode: scroll mode → scroll page, else move virtual cursor
function _bwWebArrow(dir) {
  if (_bwScrollMode) { _bwScrollBy(dir); return; }
  if (!_curActive) _bwCursorShow();
  _bwCursorMove(dir);
}

function bwSearchGo() {
  let text;
  if (bwSearchFocus > 0 && bwSuggestions[bwSearchFocus - 1]) {
    const s = bwSuggestions[bwSearchFocus - 1];
    text = s.nav ? s.url : s.text;
  } else if (bwSearchText) {
    text = bwSearchText.trim();
  } else {
    closeBwSearch(); return;
  }
  document.getElementById('view-bw-search').classList.remove('visible');
  view = 'app-open';
  if (_bwIsSearch(text)) {
    // Electron loads real Google natively; the proxied web build loads
    // DuckDuckGo's plain-HTML results (a real engine page that renders through
    // the proxy — Google blocks proxied requests with a bot challenge).
    openBwWebView(isElectron
      ? 'https://www.google.com/search?q=' + encodeURIComponent(text)
      : 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(text));
  } else {
    openBwWebView(_bwUrlFromText(text));
  }
}

let bwSuggestions = [];
let _bwSugTimer = null;

function _bwNavTitleFromUrl(url) {
  try {
    const label = new URL(url).hostname.replace(/^www\./, '').split('.')[0];
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch(e) { return url; }
}
function _fetchSuggestions(text) {
  clearTimeout(_bwSugTimer);
  if (!text) { bwSuggestions = []; renderBwSearch(); return; }
  _bwSugTimer = setTimeout(async () => {
    let items = [];
    try {
      const sugBase = 'https://suggestqueries.google.com/complete/search?client=chrome&hl=en&q=' + encodeURIComponent(text);
      const sugUrl = isElectron ? sugBase : BW_WEB_PROXY + '?url=' + encodeURIComponent(sugBase);
      const res = await fetch(sugUrl);
      const data = await res.json();
      const sugs    = data[1] || [];
      const meta    = data[4] || {};
      const types   = meta['google:suggesttype']   || [];
      const details = meta['google:suggestdetail'] || [];
      items = sugs.map((s, i) => {
        if (types[i] === 'NAVIGATION') {
          const url = /^https?:/.test(s) ? s : 'https://' + s;
          const title = (details[i] && (details[i].a || details[i].t)) || _bwNavTitleFromUrl(url);
          return { nav: true, url, title };
        }
        return { nav: false, text: s };
      });
    } catch(e) { items = []; }
    // Engine didn't return a domain but the typed text looks like one — synthesize it
    if (!items.some(s => s.nav) && text.trim() && !_bwIsSearch(text.trim())) {
      const url = _bwUrlFromText(text.trim());
      items.unshift({ nav: true, url, title: _bwNavTitleFromUrl(url) });
    }
    // Domain suggestions first
    items.sort((a, b) => (b.nav ? 1 : 0) - (a.nav ? 1 : 0));
    bwSuggestions = items.slice(0, 6);
    renderBwSearch();
  }, 150);
}

function renderBwSearch() {
  document.getElementById('bws-searchbar').classList.toggle('focus', bwSearchFocus === 0);
  const left = bwSearchText.slice(0, bwSearchCursor);
  const right = bwSearchText.slice(bwSearchCursor);
  document.getElementById('bws-text-left').textContent = left;
  document.getElementById('bws-text-right').textContent = right;
  const wrap = document.getElementById('bws-input-wrap');
  wrap.scrollLeft = wrap.scrollWidth;
  const container = document.getElementById('bws-results');
  container.innerHTML = '';
  bwSuggestions.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'bws-row' + (bwSearchFocus === i + 1 ? ' focused' : '');
    const fav = document.createElement('div');
    const info = document.createElement('div');
    info.className = 'bws-info';
    if (s.nav) {
      fav.className = 'bws-favicon bws-favicon-nav';
      let favUrl = '';
      try { favUrl = 'https://www.google.com/s2/favicons?domain=' + new URL(s.url).hostname + '&sz=32'; } catch(e) {}
      fav.innerHTML = favUrl
        ? `<img src="${favUrl}" onerror="this.parentElement.innerHTML='<i data-icon=&quot;search&quot;></i>'">`
        : `<i data-icon="search"></i>`;
      info.innerHTML = `<span class="bws-title bws-title-nav">${_bwHE(s.title)}</span><span class="bws-url">${_bwHE(s.url)}</span>`;
    } else {
      fav.className = 'bws-favicon';
      fav.innerHTML = `<i data-icon="search"></i>`;
      info.innerHTML = `<span class="bws-title">${_bwHE(s.text)}</span>`;
    }
    row.append(fav, info);
    container.appendChild(row);
  });
  document.getElementById('bws-hint').style.display = bwSearchText ? 'none' : '';
  document.getElementById('bws-placeholder').style.display = bwSearchText ? 'none' : '';
  const voiceRsk = `img=${BW_ICON_PATH}ic_google_home.png`;
  setSK('Cancel', bwSearchText ? 'Go' : '', voiceRsk, false);
  const bar = document.querySelector('.skbar');
  bar.style.backgroundColor = '#cccccc';
  bar.style.backgroundImage = 'none';
  bar.style.color = '#323232';
}

function openBwSearch() {
  bwSearchText = '';
  bwSearchCursor = 0;
  bwSearchFocus = 0;
  bwSuggestions = [];
  clearTimeout(_bwSugTimer);
  view = 'browser-search';
  document.getElementById('view-bw-search').classList.add('visible');
  document.getElementById('statusbar').classList.add('bw-sb');
  document.querySelector('.skbar').style.display = '';
  document.getElementById('bw-tips-badge').classList.remove('visible');
  renderBwSearch();
  lbl('Browser — Search');
  if (typeof SimKeyboard !== 'undefined') {
    SimKeyboard.activate({
      type: (ch) => bwSearchType(ch),
      backspace: () => bwSearchBackspace(),
      getText: () => bwSearchText,
      moveCursor: (dir) => bwSearchMoveCursor(dir)
    });
  }
}

function closeBwSearch() {
  if (typeof SimKeyboard !== 'undefined') SimKeyboard.deactivate();
  document.getElementById('view-bw-search').classList.remove('visible');
  view = 'app-open';
  if (bwMode === 'web') {
    document.querySelector('.skbar').style.display = 'none';
    document.getElementById('bw-nav').classList.add('visible');
    _bwTipsBadgeShow();
    if (!_bwScrollMode) _bwCursorShow();
  } else {
    bwFocus = 0;
    renderBw();
  }
  restoreSK();
}

function bwSearchType(k) {
  if (bwSearchText.length >= 80) return;
  bwSearchText = bwSearchText.slice(0, bwSearchCursor) + k + bwSearchText.slice(bwSearchCursor);
  bwSearchCursor += k.length;
  bwSearchFocus = 0;
  renderBwSearch();
  _fetchSuggestions(bwSearchText);
}

function bwSearchBackspace() {
  if (bwSearchCursor > 0) {
    bwSearchText = bwSearchText.slice(0, bwSearchCursor - 1) + bwSearchText.slice(bwSearchCursor);
    bwSearchCursor--;
    bwSearchFocus = 0;
    renderBwSearch();
    _fetchSuggestions(bwSearchText);
  }
}

function bwSearchMoveCursor(dir) {
  bwSearchCursor += dir;
  if (bwSearchCursor < 0) bwSearchCursor = 0;
  if (bwSearchCursor > bwSearchText.length) bwSearchCursor = bwSearchText.length;
  renderBwSearch();
}

function bwSearchNav(dir) {
  if (!bwSuggestions.length) return;
  const max = bwSuggestions.length;
  if (dir === 'down') bwSearchFocus = bwSearchFocus >= max ? 0 : bwSearchFocus + 1;
  if (dir === 'up')   bwSearchFocus = bwSearchFocus <= 0  ? max : bwSearchFocus - 1;
  renderBwSearch();
  const focused = document.querySelector('#bws-results .bws-row.focused');
  if (focused) focused.scrollIntoView({ block: 'nearest' });
}

function _setBwSK() {
  const tile = BW_TILES[bwFocus];
  const isEmpty = !tile || tile.icon.endsWith('ic_default.png');
  const lsk = bwLastUrl ? 'Return' : '';
  const csk = isEmpty ? '' : (tile.url ? 'GO' : 'Select');
  const rsk = isEmpty ? '' : bwFocus === 0 ? `img=${BW_ICON_PATH}ic_google_home.png` : (!tile.builtin && tile.label) ? 'Unpin' : '';
  setSK(lsk, csk, rsk, false);
  const bar = document.querySelector('.skbar');
  bar.style.backgroundColor = '#e6e6e6';
  bar.style.backgroundImage = 'none';
  bar.style.color = '#323232';
}

function renderBw() {
  document.querySelectorAll('.bw-tile').forEach((el, i) =>
    el.classList.toggle('focused', i === bwFocus));
  const hdr = document.getElementById('bw-header');
  if (hdr) hdr.textContent = BW_TILES[bwFocus]?.label || '';
  _setBwSK();
}

function navBw(dir) {
  const cols = 3;
  const row = Math.floor(bwFocus / cols);
  const col = bwFocus % cols;
  const total = BW_TILES.length;
  if (dir === 'left'  && col > 0)                               bwFocus--;
  if (dir === 'right' && col < cols - 1 && bwFocus + 1 < total) bwFocus++;
  if (dir === 'up'    && row > 0)                               bwFocus -= cols;
  if (dir === 'down'  && bwFocus + cols < total)                bwFocus += cols;
  renderBw();
}

function buildFolderView(app) {
  const hdr = document.getElementById('oa-header');
  hdr.style.display = '';
  hdr.textContent = '';
  hdr.classList.add('folder-hdr');

  const body = document.getElementById('oa-body');
  body.classList.add('folder-mode');

  const ico = document.createElement('div');
  ico.className = 'folder-view-ico bw-el';
  body.appendChild(ico);

  setSK('', 'Select', 'Options', false);
  lbl('Folder — ' + (app.name || ''));
}

function navFolder(dir) {
  if (!openApp?.apps?.length) return;
  const n = openApp.apps.length;
  if (dir === 'left'  || dir === 'up')   folderFocus = (folderFocus - 1 + n) % n;
  if (dir === 'right' || dir === 'down') folderFocus = (folderFocus + 1) % n;
}

// ════════════════════════════════════════
//  APP GRID
// ════════════════════════════════════════
// Web-app (bookmark) icon = web_shortcut frame + centered favicon overlay
function _applyAppIcon(icoEl, app) {
  icoEl.style.backgroundImage = `url("${app.icon}")`;
  if (app.webapp && app.favicon) {
    icoEl.classList.add('webapp-icon');
    const fv = document.createElement('div');
    fv.className = 'webapp-favicon';
    fv.style.backgroundImage = `url("${app.favicon}")`;
    icoEl.appendChild(fv);
  }
}

function buildGrid(keepFocus) {
  const wall  = document.getElementById('app-wall');
  document.querySelectorAll('.single-previews').forEach(e => e.remove());
  wall.className = 'app-wall' + (isMoving ? ' is-moving' : '');
  wall.innerHTML = '';
  const slice = APPS.slice(page * PER, (page + 1) * PER);
  slice.forEach((app, i) => {
    const tile = document.createElement('div');
    tile.className = 'app-tile' + (i === focus ? ' focused' : '');
    const ico = document.createElement('div');
    ico.className = 'app-icon';
    _applyAppIcon(ico, app);
    tile.appendChild(ico);
    tile.onclick = () => { focus = i; openAppView(); };
    wall.appendChild(tile);
  });
  document.getElementById('app-title').textContent = curApp()?.name || '';
  const pg = document.getElementById('pagination');
  pg.innerHTML = '';
  for (let i = 0; i < totalPages(); i++) {
    const d = document.createElement('div');
    d.className = 'page-dot' + (i === page ? ' active' : '');
    pg.appendChild(d);
  }
  if (isMoving) {
    setSK('', 'Done', 'Cancel', false);
    lbl('Move — ' + (curApp()?.name || ''));
  } else {
    setSK('', 'Select', 'Options', false);
    lbl('Apps — ' + (curApp()?.name || ''));
  }
}

// ════════════════════════════════════════
//  NAVIGATION
// ════════════════════════════════════════
function nav(dir) {
  if (booting || inputLocked) return;
  // Sleep/power menu is a top-level modal — it takes priority over everything
  if (isSleepOpen()) {
    const maxFocus = view === 'lock' ? 1 : 2;
    if (dir === 'up')   { sleepFocus = Math.max(0, sleepFocus - 1); updateSleepFocus(); }
    if (dir === 'down') { sleepFocus = Math.min(maxFocus, sleepFocus + 1); updateSleepFocus(); }
    return;
  }
  if (view === 'lock') return;   // lock screen: arrows do nothing (modal)
  if (isSysDialogOpen()) return; // dialog: arrows do nothing
  if (isRenameOpen() || isAppDialogOpen()) return;
  if (isStOpen()) { stKey({ up: 'Up', down: 'Down', left: 'Left', right: 'Right' }[dir]); return; }
  if (isBwMenuOpen()) { _bwMenuNav(dir); return; }
  if (isBwSCOpen()) {
    if (_bwSCPage === 3 && _bwSCSwitch) { _bwSCPan(dir); return; }
    if (dir === 'left') _bwSCPrev(); else if (dir === 'right') _bwSCNext();
    return;
  }
  if (_bwPinMode) { _bwPinNav(dir); return; }
  if (isBwVolOpen()) {
    if (dir === 'up')   { _bwVolAdj(+1); return; }
    if (dir === 'down') { _bwVolAdj(-1); return; }
    return;
  }
  if (isBwShareOpen()) { _bwShareNav(dir); return; }
  if (bwMode === 'web' && view === 'app-open') { _bwWebArrow(dir); return; }
  if (isBwHistOpen()) { if (!_bwHistDialogOpen) _bwHistNav(dir); return; }
  if (isOMOpen()) { navOM(dir); return; }
  switch (view) {

    case 'home':
      if (dir === 'left') {
        view    = 'sidemenu';
        smFocus = Math.floor(SM_APPS.length / 2);
        document.getElementById('view-home').classList.add('sidemenu-open');
        renderSidemenu();
        setSK('', 'Select', '', false);
        lbl('Sidemenu — ' + SM_APPS[smFocus].name);
      } else if (dir === 'up') {
        openIS();
      }
      // down → nothing (Cards app), right → nothing
      break;

    case 'sidemenu':
      if (dir === 'up')    smFocus = Math.max(0, smFocus - 1);
      if (dir === 'down')  smFocus = Math.min(SM_APPS.length - 1, smFocus + 1);
      if (dir === 'right') { goHome(); break; }
      renderSidemenu();
      lbl('Sidemenu — ' + SM_APPS[smFocus].name);
      break;

    case 'instant-settings': {
      const cols = 3, regular = IS_TILES.length - 1; // last tile = volume
      let f = isFocus;
      if (f === regular) {
        // on volume tile
        if (dir === 'up') { f = regular - cols; }
        else if (dir === 'left')  { volIdx = Math.max(0, volIdx - 1); renderIS(); return; }
        else if (dir === 'right') { volIdx = Math.min(VOL_STEPS.length - 1, volIdx + 1); renderIS(); return; }
      } else {
        if (dir === 'up')   { if (f >= cols) f -= cols; }
        if (dir === 'down') { if (f + cols < regular) f += cols; else f = regular; }
        if (dir === 'left')  { if (f % cols > 0) f--; }
        if (dir === 'right') { if (f % cols < cols - 1 && f + 1 < regular) f++; }
      }
      isFocus = f; renderIS();
      break;
    }

    case 'apps': {
      if (isMoving && appViewMode === 'list') {
        const swap = (newIdx) => {
          if (newIdx >= 0 && newIdx < APPS.length) {
            [APPS[listFocus], APPS[newIdx]] = [APPS[newIdx], APPS[listFocus]];
            listFocus = newIdx;
            buildList();
            lbl('Move — ' + (curApp()?.name || ''));
          }
        };
        if (dir === 'up')   swap(listFocus - 1);
        if (dir === 'down') swap(listFocus + 1);
        break;
      }
      if (appViewMode === 'list') {
        const prev = listFocus;
        if (dir === 'up')   listFocus = listFocus <= 0 ? APPS.length - 1 : listFocus - 1;
        if (dir === 'down') listFocus = listFocus >= APPS.length - 1 ? 0 : listFocus + 1;
        // wrap-around: jump window to show new focus
        if (prev === 0 && listFocus === APPS.length - 1)
          listWindowStart = Math.max(0, APPS.length - LIST_PER);
        else if (prev === APPS.length - 1 && listFocus === 0)
          listWindowStart = 0;
        else {
          if (listFocus > listWindowStart + LIST_PER - 1) listWindowStart++;
          if (listFocus < listWindowStart) listWindowStart--;
        }
        buildList();
        break;
      }
      if (appViewMode === 'single') {
        if (dir === 'up')   listFocus = listFocus <= 0 ? APPS.length - 1 : listFocus - 1;
        if (dir === 'down') listFocus = listFocus >= APPS.length - 1 ? 0 : listFocus + 1;
        buildSingle();
        break;
      }
      if (isMoving) {
        const cols = 3;
        const absIdx = page * PER + focus;
        const swap = (newFocus) => {
          const newAbs = page * PER + newFocus;
          if (newAbs < APPS.length) {
            [APPS[absIdx], APPS[newAbs]] = [APPS[newAbs], APPS[absIdx]];
            focus = newFocus;
            buildGrid();
            lbl('Move — ' + (curApp()?.name || ''));
          }
        };
        const pageLen = Math.min(PER, APPS.length - page * PER);
        if (dir === 'up'    && focus >= cols)                                    swap(focus - cols);
        if (dir === 'down'  && focus + cols < pageLen)                           swap(focus + cols);
        if (dir === 'left'  && focus % cols > 0)                                 swap(focus - 1);
        if (dir === 'right' && focus % cols < cols - 1 && focus + 1 < pageLen)  swap(focus + 1);
        break;
      }
      { const cols = 3;
        const pageLen = Math.min(PER, APPS.length - page * PER);
        const absIdx = page * PER + focus;
        const total = APPS.length;
        if (dir === 'left' || dir === 'right') {
          // flat circular — like list view
          const newAbs = dir === 'right'
            ? (absIdx + 1) % total
            : (absIdx - 1 + total) % total;
          page = Math.floor(newAbs / PER);
          focus = newAbs % PER;
          buildGrid();
        } else if (dir === 'up') {
          if (focus >= cols) {
            focus -= cols; buildGrid();
          } else {
            page = page > 0 ? page - 1 : totalPages() - 1;
            const prevLen = Math.min(PER, APPS.length - page * PER);
            const lastRowStart = Math.floor((prevLen - 1) / cols) * cols;
            focus = Math.min(lastRowStart + focus % cols, prevLen - 1);
            buildGrid();
          }
        } else if (dir === 'down') {
          if (focus + cols < pageLen) {
            focus += cols; buildGrid();
          } else {
            const col = focus % cols;
            const nextPage = page < totalPages() - 1 ? page + 1 : 0;
            page = nextPage;
            const newLen = Math.min(PER, APPS.length - page * PER);
            focus = Math.min(col, newLen - 1);
            buildGrid();
          }
        }
        break; }
    }

    case 'app-open': {
      if (openApp?.id === 'browser')       navBw(dir);
      else if (openApp?.type === 'folder') navFolder(dir);
      break;
    }
  }
}

function pressOK() {
  if (booting || inputLocked) return;
  if (isSleepOpen()) {
    if (view === 'lock') { sleepFocus === 0 ? doRestart() : doPowerOff(); }
    else { if (sleepFocus === 0) doLock(); else if (sleepFocus === 1) doRestart(); else doPowerOff(); }
    return;
  }
  if (view === 'lock')             { doUnlock();                 return; }
  if (isSysDialogOpen())           { if (_sdCenterOk) closeDialog(true); return; }
  if (isRenameOpen())              { return; }
  if (isAppDialogOpen())           { return; }
  if (isStOpen())                  { stKey('Return');            return; }
  if (isOMOpen())                  { selectOM();                 return; }
  if (isBwMenuOpen())              { _bwMenuSelect();            return; }
  if (isBwSCOpen())                { closeBwShortcut();          return; }
  if (_bwPinMode)                  { _bwPinConfirm();            return; }
  if (isBwHistOpen())              { if (_bwHistDialogOpen) return; if (bwHistory.length) _bwHistGo(); return; }
  if (isBwShareOpen())             { _bwShareSelect();           return; }
  if (isBwVolOpen())               { return; }
  if (view === 'home')             { showApps();                 return; }
  if (view === 'sidemenu')         { openAppView(SM_APPS[smFocus]); return; }
  if (view === 'apps' && isMoving) { exitMoveMode(false);        return; }
  if (view === 'apps')             { openAppView();              return; }
  if (view === 'app-open' && openApp?.type === 'folder')  { return; }
  if (view === 'app-open' && bwMode === 'web' && (openApp?.id === 'browser' || openApp?.url)) { _bwCursorClick(); return; }
  if (view === 'app-open' && openApp?.id !== 'browser' && !openApp?.url && openApp?.type !== 'folder') { return; }
  if (view === 'app-open' && openApp?.id === 'browser') {
    if (bwFocus === 0) { openBwSearch(); return; }
    if (bwFocus === 1) { openBwHistory(); return; }
    const tile = BW_TILES[bwFocus];
    if (tile?.url) { openBwWebView(tile.url); }
    return;
  }
  if (view === 'browser-search') { if (bwSearchText) bwSearchGo(); return; }
  if (view === 'instant-settings') {
    if (IS_TILES[isFocus].type === 'volume') {
      if (volIdx >= 2) { savedVolIdx = volIdx; volIdx = 1; }  // volume → vibrate
      else if (volIdx === 1) { volIdx = 0; }                  // vibrate → silent
      else { volIdx = savedVolIdx; }                          // silent → volume
      updateSbIcons(); renderIS();
    } else {
      toggleIS(isFocus);
    }
    return;
  }
}

// RSK
function pressRight() {
  if (booting || inputLocked) return;
  if (isSleepOpen())       { closeSleepMenu();                return; }
  if (view === 'lock')     { return; }
  if (isSysDialogOpen())   { if (!_sdCenterOk) closeDialog(true); return; }
  if (isRenameOpen())      { _renameConfirm();               return; }
  if (isAppDialogOpen())   { _appConfirmOk();                 return; }
  if (isStOpen())          { stKey('F2');                     return; }
  if (isOMOpen())          { closeOM();                       return; }
  if (isBwSCOpen())        { _bwSCNext();                    return; }
  if (_bwPinMode)          { return; }
  if (isBwShareOpen())     { return; }
  if (isBwVolOpen())       { return; }
  if (view === 'home')     { return; }
  if (isBwHistOpen())               { if (_bwHistDialogOpen) { _bwHistDialogClear(); return; } if (bwHistory.length) _bwHistClearAll(); return; }
  if (view === 'dialer')            { openDialerOM();      return; }
  if (view === 'apps' && isMoving)  { exitMoveMode(true);  return; }
  if (view === 'apps' && !isMoving) { openOptionMenu();    return; }
  if (view === 'app-open' && openApp?.type === 'folder') { return; }
  if (view === 'app-open' && openApp?.id === 'browser') {
    if (isBwDialogOpen()) { if (_bwDialogConfirm) _bwDialogConfirm(); closeBwDialog(); return; }
    if (bwMode === 'web') { _bwMenuOpen(); return; }
    const _unpinTile = BW_TILES[bwFocus];
    if (_unpinTile && !_unpinTile.builtin && _unpinTile.label) {
      openBwDialog('Confirmation', `Unpin website ${_unpinTile.label}?`, 'Unpin', () => {
        BW_TILES[bwFocus] = { icon: BW_ICON_PATH + 'ic_default.png', label: '' };
        buildBrowserView();
      });
    }
    return;
  }
  if (view === 'app-open' && openApp?.url && bwMode === 'web') { _bwMenuOpen(); return; }
  if (view === 'app-open' && !openApp?.url && openApp?.id !== 'browser' && openApp?.type !== 'folder') return;
  if (view === 'app-open') { pressBack();                   return; }
}

// Back / End key short-press
function animateCloseApp(elId, cb) {
  const el = document.getElementById(elId);
  if (!el || !el.classList.contains('visible')) { cb(); return; }
  el.classList.add('app-closing');
  setTimeout(() => {
    el.classList.remove('app-closing', 'visible');
    cb();
  }, 150);
}

function pressBack() {
  if (isSleepOpen())               { closeSleepMenu();  return; }
  if (view === 'lock')             { return; }
  if (isSysDialogOpen())           { closeDialog(false); return; }
  if (isRenameOpen())              { _renameCancel();   return; }
  if (isAppDialogOpen())           { _appConfirmClose(); return; }
  if (isStOpen())                  { stKey('Backspace'); return; }
  if (isOMOpen())                  { closeOM();         return; }
  if (isBwMenuOpen())              { _bwMenuClose();    return; }
  if (isBwSCOpen())                { closeBwShortcut(); return; }
  if (_bwPinMode)                  { _bwPinExit();      return; }
  if (isBwHistOpen())              { if (_bwHistDialogOpen) { _bwHistDialogCancel(); return; } closeBwHistory(); return; }
  if (isBwShareOpen())             { _bwShareClose();   return; }
  if (isBwVolOpen())               { return; }
  if (view === 'browser-search')   { closeBwSearch();   return; }
  if (view === 'app-open' && openApp?.id === 'browser' && isBwDialogOpen()) { closeBwDialog(); return; }
  if (view === 'app-open' && openApp?.id === 'browser' && bwMode === 'web') { closeBwWebView(); return; }
  if (view === 'app-open' && openApp?.url && bwMode === 'web') { closeBwWebView(); return; }
  if (view === 'instant-settings') { closeIS();         return; }
  if (view === 'dialer')           { dialerBack();      return; }
  if (view === 'sidemenu')         { goHome();          return; }
  if (view === 'stub')             { closeStub();       return; }
  if (view === 'app-open') {
    animateCloseApp('view-open-app', () => {
      const _sb = document.getElementById('statusbar');
      _sb.classList.remove('bw-sb');
      _sb.style.background = '';
      _sb.style.color = '';
      const bar = document.querySelector('.skbar');
      bar.style.backgroundColor = '';
      bar.style.backgroundImage = '';
      bar.style.color = '';
      if (fromApps) {
        view = 'apps';
        if (appViewMode === 'list')        buildList();
        else if (appViewMode === 'single') buildSingle();
        else { setSK('', 'Select', 'Options', false); lbl('Apps � ' + (curApp()?.name || '')); }
      } else {
        goHome();
      }
    });
    return;
  }
  if (view === 'apps' && isMoving) { exitMoveMode(true);  return; }
  if (view === 'apps') goHome();
}

// LSK
function softLeft() {
  if (booting || inputLocked) return;
  if (isSleepOpen())               { closeSleepMenu();                       return; }
  if (view === 'lock')             { return; }
  if (isSysDialogOpen())           { if (!_sdCenterOk) closeDialog(false);   return; }
  if (isRenameOpen())              { _renameCancel();                        return; }
  if (isAppDialogOpen())           { _appConfirmClose();                     return; }
  if (isStOpen())                  { stKey('F1');                            return; }
  if (isOMOpen())                  { closeOM();                              return; }
  if (isBwMenuOpen())              { _bwMenuClose();                         return; }
  if (isBwSCOpen())                { _bwSCPrev();                            return; }
  if (_bwPinMode)                  { if (_bwPinMode === 'picker') _bwPinExit(); return; }
  if (isBwShareOpen())             { _bwShareClose();                        return; }
  if (isBwVolOpen())               { return; }
  if (isBwHistOpen())              { if (_bwHistDialogOpen) { _bwHistDialogCancel(); return; } closeBwHistory(); return; }
  if (view === 'home')             { showStub('Notices', 'notifications');   return; }
  if (view === 'browser-search')   { closeBwSearch();                        return; }
  if (view === 'app-open' && openApp?.id === 'browser' && isBwDialogOpen()) { closeBwDialog(); return; }
  if (view === 'app-open' && openApp?.id === 'browser' && bwMode === 'web') { closeBwWebView(); return; }
  if (view === 'app-open' && openApp?.url && bwMode === 'web') { _bwNavHome(); return; }
  if (view === 'app-open' && openApp?.id === 'browser' && bwMode === 'home') { _bwReturnToWeb(); return; }
  if (view === 'app-open' && !openApp?.url && openApp?.id !== 'browser' && openApp?.type !== 'folder') return;
  if (view === 'app-open')         { pressBack();                            return; }
  if (view === 'dialer')           { return; }
}

// ════════════════════════════════════════
//  OPTION MENU  (SoftRight in apps view)
//  matches launcher: Move + Uninstall (if removable)
// ════════════════════════════════════════
let omFocus = 0;
let omItems = [];

function isOMOpen() {
  return document.getElementById('option-menu').classList.contains('visible');
}
function buildOMPanel(title) {
  const panel = document.getElementById('option-menu-panel');
  panel.innerHTML = '';
  const hdr = document.createElement('div');
  hdr.className = 'om-header';
  hdr.textContent = title;
  panel.appendChild(hdr);
  omItems.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'om-item' + (i === omFocus ? ' focused' : '');
    el.textContent = item.label;
    el.onclick = () => { omFocus = i; selectOM(); };
    panel.appendChild(el);
  });
  document.getElementById('option-menu').classList.add('visible');
  setSK('', 'Select', '', false);
  lbl('Options');
}
function openOptionMenu() {
  const app = curApp();
  if (!app) return;
  omFocus = 0;
  omItems = [];
  if (app.webapp) {
    omItems.push({ label: 'Rename', action: () => _webAppRename(app) });
    if (appViewMode !== 'single') omItems.push({ label: 'Move', action: () => enterMoveMode() });
    omItems.push({ label: 'Unpin', action: () => _webAppUnpin(app) });
  } else {
    if (appViewMode !== 'single') omItems.push({ label: 'Move',        action: () => enterMoveMode()         });
  }
  if (appViewMode !== 'list')   omItems.push({ label: 'List view',   action: () => switchAppView('list')   });
  if (appViewMode !== 'single') omItems.push({ label: 'Single view', action: () => switchAppView('single') });
  if (appViewMode !== 'grid')   omItems.push({ label: 'Grid view',   action: () => switchAppView('grid')   });
  buildOMPanel('Options');
}
function openDialerOM() {
  omFocus = 0;
  omItems = [
    { label: 'Add to existing contact', action: () => {} },
    { label: 'Create new contact',      action: () => {} }
  ];
  buildOMPanel('Options');
}

// ── Pinned web app: Unpin / Rename ──
let _appDialogCb = null;
function isAppDialogOpen() { return _appDialogCb !== null; }
function _appConfirmOpen(header, content, okLabel, onOk) {
  document.getElementById('bw-dialog-header').textContent = header;
  document.getElementById('bw-dialog-content').textContent = content;
  document.getElementById('bw-dialog').classList.add('visible');
  _appDialogCb = onOk;
  setSK('Cancel', '', okLabel, false);
  const bar = document.querySelector('.skbar');
  bar.style.backgroundColor = 'rgba(0,0,0,0.88)';
  bar.style.backgroundImage = 'none';
  bar.style.color = '#fff';
}
function _appConfirmClose() {
  document.getElementById('bw-dialog').classList.remove('visible');
  _appDialogCb = null;
  rebuildCurrentView();
}
function _appConfirmOk() {
  const cb = _appDialogCb;
  document.getElementById('bw-dialog').classList.remove('visible');
  _appDialogCb = null;
  if (cb) cb(); else rebuildCurrentView();
}
function _webAppUnpin(app) {
  _appConfirmOpen('Confirmation', 'Unpin the website?', 'Unpin', () => {
    const i = APPS.indexOf(app);
    if (i >= 0) APPS.splice(i, 1);
    // keep focus in range
    const total = APPS.length;
    if (appViewMode === 'grid') {
      const flat = Math.min(page * PER + focus, total - 1);
      page = Math.floor(flat / PER); focus = flat % PER;
    } else {
      listFocus = Math.min(listFocus, total - 1);
      listWindowStart = Math.max(0, Math.min(listWindowStart, total - LIST_PER));
    }
    rebuildCurrentView();
  });
}

// Rename dialog — editable title with selection, URL shown below
let _renameApp = null, _renameText = '', _renameSelAll = false, _renameCursor = 0;
function isRenameOpen() { return _renameApp !== null; }
function _webAppRename(app) {
  _renameApp = app;
  _renameText = app.name || '';
  _renameSelAll = true;
  _renameCursor = _renameText.length;
  document.getElementById('rename-url').textContent = app.url || '';
  document.getElementById('rename-dialog').classList.add('visible');
  _renameRender();
  if (typeof SimKeyboard !== 'undefined') {
    SimKeyboard.activate({
      type: (ch) => _renameType(ch),
      backspace: () => _renameBackspace(),
      getText: () => _renameText,
      moveCursor: (dir) => _renameMoveCursor(dir)
    });
  }
}
function _renameRender() {
  const el = document.getElementById('rename-input');
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  if (_renameSelAll && _renameText) {
    el.innerHTML = `<span class="rn-sel">${esc(_renameText)}</span><span class="rn-caret"></span>`;
    el.scrollLeft = 0;
  } else {
    const left = _renameText.slice(0, _renameCursor);
    const right = _renameText.slice(_renameCursor);
    el.innerHTML = `${esc(left)}<span class="rn-caret"></span>${esc(right)}`;
    el.scrollLeft = el.scrollWidth;
  }
}
function _renameType(ch) {
  if (_renameSelAll) { _renameText = ''; _renameSelAll = false; _renameCursor = 0; }
  if (_renameText.length < 60) {
    _renameText = _renameText.slice(0, _renameCursor) + ch + _renameText.slice(_renameCursor);
    _renameCursor += ch.length;
  }
  _renameRender();
}
function _renameBackspace() {
  if (_renameSelAll) { _renameText = ''; _renameSelAll = false; _renameCursor = 0; }
  else if (_renameCursor > 0) {
    _renameText = _renameText.slice(0, _renameCursor - 1) + _renameText.slice(_renameCursor);
    _renameCursor--;
  }
  _renameRender();
}
function _renameMoveCursor(dir) {
  if (_renameSelAll) _renameSelAll = false;
  _renameCursor += dir;
  if (_renameCursor < 0) _renameCursor = 0;
  if (_renameCursor > _renameText.length) _renameCursor = _renameText.length;
  _renameRender();
}
function _renameConfirm() {
  const name = _renameText.trim();
  if (name && _renameApp) _renameApp.name = name;
  _renameApp = null;
  document.getElementById('rename-dialog').classList.remove('visible');
  if (typeof SimKeyboard !== 'undefined') SimKeyboard.deactivate();
  rebuildCurrentView();
}
function _renameCancel() {
  _renameApp = null;
  document.getElementById('rename-dialog').classList.remove('visible');
  if (typeof SimKeyboard !== 'undefined') SimKeyboard.deactivate();
  rebuildCurrentView();
}
function closeOM() {
  document.getElementById('option-menu').classList.remove('visible');
  if (view === 'dialer') {
    setSK('Contacts', 'Call', 'Options', false);
    lbl('Dialer');
  } else {
    setSK('', 'Select', 'Options', false);
    lbl('Apps — ' + (curApp()?.name || ''));
  }
}
function switchAppView(mode) {
  const va = document.getElementById('view-apps');
  appViewMode = mode;
  va.classList.toggle('view-list',   mode === 'list');
  va.classList.toggle('view-single', mode === 'single');
  if (mode === 'list') {
    listFocus = page * PER + focus;
    listWindowStart = Math.max(0, Math.min(listFocus, APPS.length - LIST_PER));
    buildList();
  } else if (mode === 'single') {
    listFocus = page * PER + focus;
    buildSingle();
  } else {
    focus = listFocus % PER;
    page  = Math.floor(listFocus / PER);
    buildGrid();
  }
}
function buildList() {
  const wall = document.getElementById('app-wall');
  document.querySelectorAll('.single-previews').forEach(e => e.remove());
  wall.className = 'app-wall list-mode' + (isMoving ? ' is-moving' : '');
  wall.innerHTML = '';
  const slice = APPS.slice(listWindowStart, listWindowStart + LIST_PER);
  slice.forEach((app, i) => {
    const globalIdx = listWindowStart + i;
    const tile = document.createElement('div');
    tile.className = 'app-tile' + (globalIdx === listFocus ? ' focused' : '');
    const ico = document.createElement('div');
    ico.className = 'app-icon';
    _applyAppIcon(ico, app);
    const name = document.createElement('span');
    name.className = 'app-tile-name';
    name.textContent = app.name;
    tile.appendChild(ico);
    tile.appendChild(name);
    tile.onclick = () => { listFocus = globalIdx; openAppView(); };
    wall.appendChild(tile);
  });
  document.getElementById('app-title').textContent = '';
  document.getElementById('pagination').innerHTML = '';
  if (isMoving) {
    setSK('', 'Done', 'Cancel', false);
    lbl('Move — ' + (curApp()?.name || ''));
  } else {
    setSK('', 'Select', 'Options', false);
    lbl('Apps — ' + (curApp()?.name || ''));
  }
}
function buildSingle() {
  const wall = document.getElementById('app-wall');
  wall.className = 'app-wall single-mode';
  wall.innerHTML = '';
  document.querySelectorAll('.single-previews').forEach(e => e.remove());
  const app = APPS[listFocus] || APPS[0];
  if (!app) return;
  const prevApp = APPS[(listFocus - 1 + APPS.length) % APPS.length];
  const nextApp = APPS[(listFocus + 1) % APPS.length];
  // prev preview
  const prevEl = document.createElement('div');
  prevEl.className = 'sm-adj-icon sm-prev';
  prevEl.style.backgroundImage = `url("${prevApp.icon}")`;
  wall.appendChild(prevEl);
  // main icon: wrapper carries positioning + purple ::before, inner div is the icon
  const wrap = document.createElement('div');
  wrap.className = 'sm-main-wrap';
  wrap.onclick = () => openAppView();
  const mainIco = document.createElement('div');
  mainIco.className = 'sm-main-icon';
  mainIco.style.backgroundImage = `url("${app.icon}")`;
  if (app.webapp && app.favicon) {
    const fv = document.createElement('div');
    fv.className = 'webapp-favicon sm-favicon';
    fv.style.backgroundImage = `url("${app.favicon}")`;
    mainIco.appendChild(fv);
  }
  wrap.appendChild(mainIco);
  wall.appendChild(wrap);
  // main name
  const mainName = document.createElement('span');
  mainName.className = 'sm-main-name';
  mainName.textContent = app.name;
  wall.appendChild(mainName);
  // next preview
  const nextEl = document.createElement('div');
  nextEl.className = 'sm-adj-icon sm-next';
  nextEl.style.backgroundImage = `url("${nextApp.icon}")`;
  wall.appendChild(nextEl);
  document.getElementById('app-title').textContent = '';
  document.getElementById('pagination').innerHTML = '';
  setSK('', 'Select', 'Options', false);
  lbl('Apps — ' + (app.name || ''));
}
function rebuildCurrentView() {
  const bar = document.querySelector('.skbar');
  bar.style.backgroundColor = '';
  if (appViewMode === 'list') buildList();
  else if (appViewMode === 'single') buildSingle();
  else buildGrid();
}
function enterMoveMode() {
  isMoving = true;
  _moveOrigApps = [...APPS];
  rebuildCurrentView();
  setSK('', 'Done', 'Cancel', false);
  lbl('Move — ' + (curApp()?.name || ''));
}
function exitMoveMode(cancel) {
  isMoving = false;
  if (cancel && _moveOrigApps) { APPS.length = 0; _moveOrigApps.forEach(a => APPS.push(a)); }
  _moveOrigApps = null;
  rebuildCurrentView();
}
function renderOM() {
  document.querySelectorAll('.om-item').forEach((el, i) =>
    el.classList.toggle('focused', i === omFocus));
  const f = document.querySelector('.om-item.focused');
  if (f) f.scrollIntoView({ block: 'nearest' });
}
function selectOM() {
  const action = omItems[omFocus]?.action;
  closeOM();
  action?.();
}
function navOM(dir) {
  if (dir === 'up')   omFocus = Math.max(0, omFocus - 1);
  if (dir === 'down') omFocus = Math.min(omItems.length - 1, omFocus + 1);
  renderOM();
}

// ── Stub overlay (Notices / Contacts) ──
let _prevView = 'home';
function showStub(title, type) {
  _prevView = view;
  view = 'stub';
  const s = document.getElementById('view-stub');
  document.getElementById('stub-title').textContent = '';
  const body = document.getElementById('stub-body');
  if (type === 'notifications') {
    body.innerHTML =
      '<div id="notification-dialog-no-notices">' +
        '<i data-icon="notification-32px" aria-hidden="true"></i>' +
        '<div class="primary">No notices</div>' +
      '</div>';
  } else {
    body.innerHTML =
      '<div id="notification-dialog-no-notices">' +
        '<i data-icon="contacts" aria-hidden="true"></i>' +
        '<div class="primary">No contacts</div>' +
      '</div>';
  }
  s.classList.add('visible');
  setSK('', '', '', false);
  lbl(title);
}
function closeStub() {
  document.getElementById('view-stub').classList.remove('visible');
  view = _prevView;
  if (view === 'home') {
    setSK('Notices', 'icon:all-apps', 'Contacts', false);
    lbl('Home screen');
  } else if (view === 'apps') {
    setSK('', 'Select', 'Options', false);
    lbl('Apps');
  }
}

// ════════════════════════════════════════
//  INSTANT SETTINGS  (ArrowUp from home)
//  layout: 3-col grid, slide down from top
// ════════════════════════════════════════
const IS_TILES = [
  { icon: 'flashlight-on',    iconOff: 'flashlight-off',       name: 'Flashlight',   type: 'toggle',     active: false },
  { icon: 'brightness',                                         name: 'Brightness',   type: 'brightness'              },
  { icon: 'airplane-mode',    iconOff: 'airplane-mode-off',    name: 'Airplane Mode',type: 'toggle',     active: false },
  { icon: 'wifi-32px',        iconOff: 'wifi-off-32px',        name: 'Wi-Fi',        type: 'toggle',     active: false },
  { icon: 'network-activity', iconOff: 'network-activity-off', name: 'Cellular Data',  type: 'toggle',     active: false, disabled: true },
  { icon: 'bluetooth-32px',   iconOff: 'bluetooth-off-32px',   name: 'Bluetooth',    type: 'toggle',     active: false },
  { icon: 'sound-max',                                         name: 'Volume',       type: 'volume'                  },
];
const BRIGHTNESS_LEVELS = [25, 50, 75, 100];
let brightnessLevel = 75;
const VOL_STEPS = ['silent', 'vibrate', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
let volIdx = 9; // default ~8/15
let savedVolIdx = 9; // volume level before vibrate/silent
let isFocus = 0;
const _activatingTiles = new Set();

function moveCursor() {
  const wall   = document.getElementById('is-wall');
  const cursor = document.getElementById('is-cursor');
  const tiles  = document.querySelectorAll('.is-tile');
  const tile   = tiles[isFocus];
  if (!tile || !cursor || !wall) return;
  if (tile.classList.contains('volume')) {
    cursor.style.opacity = '0';
    return;
  }
  cursor.style.opacity = '1';
  const icon     = tile.querySelector('.is-icon') || tile;
  const wallRect = wall.getBoundingClientRect();
  const iconRect = icon.getBoundingClientRect();
  cursor.style.left   = (iconRect.left   - wallRect.left) + 'px';
  cursor.style.top    = (iconRect.top    - wallRect.top)  + 'px';
  cursor.style.width  = iconRect.width  + 'px';
  cursor.style.height = iconRect.height + 'px';
}

function buildIS() {
  const wall = document.getElementById('is-wall');
  wall.innerHTML = '';
  const cursor = document.createElement('div');
  cursor.id = 'is-cursor';
  wall.appendChild(cursor);
  IS_TILES.forEach((tile, i) => {
    const t = document.createElement('div');
    if (tile.type === 'volume') {
      t.className = 'is-tile volume';
      const ico = document.createElement('div');
      ico.className = 'is-icon'; ico.setAttribute('data-icon', tile.icon);
      const track = document.createElement('div'); track.className = 'is-vol-track';
      const fill  = document.createElement('div'); fill.className  = 'is-vol-fill';
      const thumb = document.createElement('div'); thumb.className = 'is-vol-thumb';
      track.appendChild(fill); track.appendChild(thumb);
      t.appendChild(ico); t.appendChild(track);
    } else {
      t.className = 'is-tile';
      const ico = document.createElement('div');
      ico.className = 'is-icon';
      ico.setAttribute('data-icon', tile.icon);
      if (tile.iconOff) ico.setAttribute('data-inactived-icon', tile.iconOff);
      t.appendChild(ico);
    }
    t.onclick = () => { isFocus = i; if (tile.type !== 'volume') toggleIS(i); else renderIS(); };
    wall.appendChild(t);
  });
}
function updateSbIcons() {
  const wifi = IS_TILES[3], bt = IS_TILES[5], airplane = IS_TILES[2];
  document.getElementById('sb-airplane').style.display  = airplane.active ? '' : 'none';
  const sbWifi = document.getElementById('sb-wifi');
  const sbWifiConn = document.getElementById('sb-wifi-connecting');
  if (wifi.active) {
    if (window._wifiDisconnectTimer) { clearTimeout(window._wifiDisconnectTimer); window._wifiDisconnectTimer = null; }
    const alreadyConnected = sbWifi.getAttribute('data-icon') === 'wifi-4';
    if (alreadyConnected) { sbWifi.style.display = ''; }
    else if (!window._wifiConnectTimer) {
      sbWifi.style.display = 'none';
      sbWifi.setAttribute('data-icon', '');
      sbWifi.classList.remove('connecting');
      sbWifiConn.style.display = 'none';
      window._wifiConnectTimer = setTimeout(() => {
        sbWifi.style.display = '';
        sbWifi.classList.add('connecting');
        sbWifiConn.style.display = 'inline';
        window._wifiConnectTimer = setTimeout(() => {
          sbWifi.setAttribute('data-icon', 'wifi-4');
          sbWifi.classList.remove('connecting');
          sbWifiConn.style.display = 'none';
          window._wifiConnectTimer = null;
        }, 2000);
      }, 1000);
    }
  } else {
    if (window._wifiConnectTimer) { clearTimeout(window._wifiConnectTimer); window._wifiConnectTimer = null; }
    if (!window._wifiDisconnectTimer) {
      window._wifiDisconnectTimer = setTimeout(() => {
        sbWifi.style.display = 'none';
        sbWifi.setAttribute('data-icon', '');
        sbWifi.classList.remove('connecting');
        sbWifiConn.style.display = 'none';
        window._wifiDisconnectTimer = null;
      }, 1500);
    }
  }
  const sbBt = document.getElementById('sb-bluetooth');
  if (bt.active) {
    if (window._btDisconnectTimer) { clearTimeout(window._btDisconnectTimer); window._btDisconnectTimer = null; }
    if (sbBt.style.display === '') {
      // already visible — do nothing
    } else if (!window._btConnectTimer) {
      window._btConnectTimer = setTimeout(() => {
        sbBt.style.display = '';
        window._btConnectTimer = null;
      }, 1500);
    }
  } else {
    if (window._btConnectTimer) { clearTimeout(window._btConnectTimer); window._btConnectTimer = null; }
    if (!window._btDisconnectTimer) {
      window._btDisconnectTimer = setTimeout(() => {
        sbBt.style.display = 'none';
        window._btDisconnectTimer = null;
      }, 1500);
    }
  }
  const sbSound = document.getElementById('sb-sound');
  if (volIdx === 0)      { sbSound.setAttribute('data-icon', 'mute');    sbSound.style.display = ''; }
  else if (volIdx === 1) { sbSound.setAttribute('data-icon', 'vibrate'); sbSound.style.display = ''; }
  else sbSound.style.display = 'none';
}
function renderIS() {
  document.querySelectorAll('.is-tile').forEach((t, i) => {
    const tile = IS_TILES[i];
    t.classList.toggle('focused', i === isFocus);
    t.classList.toggle('disabled', !!tile.disabled);
    if (tile.type === 'toggle') t.classList.toggle('active', !!tile.active);
    else if (tile.type === 'brightness') t.classList.add('active');
    else t.classList.remove('active');
  });
  // volume bar — clamp thumb inside track
  const volVal = VOL_STEPS[volIdx];
  // silent(0) và vibrate(1) về 0%; level 1(volIdx=2) tới 15(volIdx=16) chiếm 1/15 tới 100%
  const barPct = volIdx <= 1 ? 0 : ((volIdx - 1) / (VOL_STEPS.length - 2)) * 100;
  const fill  = document.querySelector('.is-vol-fill');
  const thumb = document.querySelector('.is-vol-thumb');
  if (fill)  fill.style.width = barPct + '%';
  if (thumb) thumb.style.left = `calc(${barPct / 100} * (100% - 1.8rem))`;
  const volIco = document.querySelector('.is-tile.volume .is-icon');
  if (volIco) volIco.setAttribute('data-icon',
    volIdx === 0 ? 'mute-32px' : volIdx === 1 ? 'vibrate-32px' : 'sound-max');
  const sbSound = document.getElementById('sb-sound');
  if (sbSound) {
    if (volIdx === 0) { sbSound.setAttribute('data-icon', 'mute');    sbSound.style.display = ''; }
    else if (volIdx === 1) { sbSound.setAttribute('data-icon', 'vibrate'); sbSound.style.display = ''; }
    else { sbSound.style.display = 'none'; }
  }

  const tile = IS_TILES[isFocus];
  if (tile.type === 'volume') {
    document.getElementById('is-title').textContent = 'Ringtones & Alerts';
    const v = VOL_STEPS[volIdx];
    document.getElementById('is-subtitle').textContent =
      v === 'silent' ? 'Silent' : v === 'vibrate' ? 'Vibrate Only' : (volIdx - 1) + '/' + (VOL_STEPS.length - 2);
    const csk = v === 'silent' ? 'Volume' : v === 'vibrate' ? 'Silent' : 'Vibrate';
    setSK('', csk, '', false);
  } else {
    document.getElementById('is-title').textContent = tile.name;
    if (tile.type === 'toggle') {
      document.getElementById('is-subtitle').textContent =
        tile.disabled ? 'Off' : tile.active ? 'On' : 'Off';
    } else if (tile.type === 'brightness') {
      document.getElementById('is-subtitle').textContent = brightnessLevel + '%';
    }
    const noSelect = tile.disabled || _activatingTiles.has(isFocus);
    setSK('', noSelect ? '' : 'Select', '', false);
  }
  moveCursor();
}
function toggleIS(i) {
  const tile = IS_TILES[i];
  if (tile.disabled) return;
  if (tile.type === 'toggle') {
    if ((i === 2 || i === 3 || i === 5) && !tile.active) {
      _activatingTiles.add(i);
      renderIS();
      setTimeout(() => {
        _activatingTiles.delete(i);
        tile.active = true;
        if (i === 2) { IS_TILES[3].active = false; IS_TILES[5].active = false; }
        updateSbIcons();
        renderIS();
      }, 1500);
    } else {
      tile.active = !tile.active;
    }
  } else if (tile.type === 'brightness') {
    const idx = BRIGHTNESS_LEVELS.indexOf(brightnessLevel);
    brightnessLevel = BRIGHTNESS_LEVELS[(idx + 1) % BRIGHTNESS_LEVELS.length];
  }
  updateSbIcons();
  renderIS();
}
function openIS() {
  view = 'instant-settings';
  isFocus = Math.floor(3 / 2);
  buildIS();
  document.getElementById('view-is').classList.add('visible');
  renderIS();
  updateSbIcons();
  lbl('Quick Settings');
}
function closeIS() {
  document.getElementById('view-is').classList.remove('visible');
  view = 'home';
  setSK('Notices', 'icon:all-apps', 'Contacts', false);
  lbl('Home screen');
}

// ════════════════════════════════════════
//  DIALER  (number key from home / apps)
// ════════════════════════════════════════
let dialerNum  = '';
let dialerFrom = 'home'; // view to return to on close

function openDialer(digit) {
  dialerFrom = view;
  view       = 'dialer';
  dialerNum  = digit || '';
  renderDialer();
  document.getElementById('view-dialer').classList.add('visible');
  setSK('Contacts', 'Call', 'Options', false);
  lbl('Dialer');
}
function closeDialer() {
  document.getElementById('view-dialer').classList.remove('visible');
  view = dialerFrom;
  dialerNum = '';
  restoreSK();
}
let _dialerProbe = null;
function renderDialer() {
  const el = document.getElementById('dialer-number');
  const numText = document.getElementById('dialer-num-text');
  numText.textContent = dialerNum;
  if (!dialerNum) { el.style.fontSize = '3rem'; return; }
  if (!_dialerProbe) {
    _dialerProbe = document.createElement('span');
    _dialerProbe.style.cssText = 'position:fixed;top:-999px;left:0;white-space:nowrap;visibility:hidden;';
    document.body.appendChild(_dialerProbe);
  }
  const cs = getComputedStyle(el);
  _dialerProbe.style.letterSpacing = cs.letterSpacing;
  _dialerProbe.style.fontFamily    = cs.fontFamily;
  _dialerProbe.textContent = dialerNum;
  const top = el.parentElement;
  const maxPx = top.clientWidth
    - parseFloat(getComputedStyle(top).paddingLeft)
    - parseFloat(getComputedStyle(top).paddingRight);
  let size = 3;
  _dialerProbe.style.fontSize = size + 'rem';
  while (_dialerProbe.offsetWidth > maxPx && size > 1.2) {
    size = Math.round((size - 0.1) * 10) / 10;
    _dialerProbe.style.fontSize = size + 'rem';
  }
  el.style.fontSize = size + 'rem';
}
function dialerKey(k) {
  if (booting || inputLocked) return;
  if (dialerNum.length >= 25) return;
  dialerNum += k;
  renderDialer();
}
function pressNum(k) {
  if (booting || inputLocked) return;
  if (isSleepOpen() || view === 'lock') return;
  // When keyboard is active, route number keys through SimKeyboard
  if (SimKeyboard.active && /^[0-9]$/.test(k)) {
    SimKeyboard.handleKeydown(k, false);
    return;
  }
  if (isSysDialogOpen()) return;
  if (isBwMenuOpen()) return;
  if (_bwPinMode) return;
  if (isAppDialogOpen() || isRenameOpen()) return;
  if (isStOpen()) { stKey(k); return; }
  if (view === 'app-open' && bwMode === 'web') { bwWebKey(k); return; }
  if ((view === 'home' || view === 'apps') && !isOMOpen()) openDialer(k);
  else if (view === 'dialer') dialerKey(k);
}

// # long-press (1s) → toggle vibrate/silent
let _hashTimer = null, _hashToastTimer = null;
function toggleVolMode() {
  if (volIdx >= 2) volIdx = 1;       // có âm → rung
  else if (volIdx === 1) volIdx = 0; // rung → im lặng
  else volIdx = 1;                   // im lặng → rung
  const toast = document.getElementById('vol-toast');
  document.getElementById('vol-toast-icon').dataset.icon = volIdx === 1 ? 'vibrate-32px' : 'mute-32px';
  document.getElementById('vol-toast-label').textContent  = volIdx === 1 ? 'Vibrate Only' : 'Silent';
  toast.classList.add('visible');
  if (_hashToastTimer) clearTimeout(_hashToastTimer);
  _hashToastTimer = setTimeout(() => toast.classList.remove('visible'), 2000);
  updateSbIcons();
}
(function() {
  const btn = document.getElementById('key-hash');
  btn.addEventListener('mousedown', () => {
    if (SimKeyboard.active) return;
    if (view === 'home' && !inputLocked) {
      _hashTimer = setTimeout(() => { _hashTimer = null; toggleVolMode(); }, 1000);
    } else {
      _hashTimer = 'blocked';
    }
  });
  btn.addEventListener('mouseup', () => {
    if (SimKeyboard.active) { SimKeyboard.handleKeydown('#', false); return; }
    if (_hashTimer) {
      if (_hashTimer !== 'blocked') clearTimeout(_hashTimer);
      _hashTimer = null;
      pressNum('#');
    }
  });
  btn.addEventListener('mouseleave', () => {
    if (_hashTimer && _hashTimer !== 'blocked') clearTimeout(_hashTimer);
    _hashTimer = null;
  });
})();

// * long-press (1s) → +
let _starTimer = null;
function showArrowPress(dir) {
  document.getElementById('csk-arrow-overlay').className = 'dir-' + dir;
}
function hideArrowPress() {
  document.getElementById('csk-arrow-overlay').className = '';
}
function showOkPress() {
  document.getElementById('csk-ok-overlay').className = 'show';
}
function hideOkPress() {
  document.getElementById('csk-ok-overlay').className = '';
}
function showNumPress(key) {
  const el = document.querySelector(`#numpad-box .anchor[data-key="${key}"]`);
  if (el) el.classList.add('pressed');
}
function hideNumPress(key) {
  const el = document.querySelector(`#numpad-box .anchor[data-key="${key}"]`);
  if (el) el.classList.remove('pressed');
}
(function() {
  const btn = document.getElementById('key-star');
  btn.addEventListener('mousedown', () => {
    if (SimKeyboard.active) return; // no long-press action when keyboard active
    _starTimer = setTimeout(() => {
      _starTimer = null;
      pressNum('+');
    }, 1000);
  });
  btn.addEventListener('mouseup', () => {
    if (SimKeyboard.active) { SimKeyboard.handleKeydown('*', false); return; }
    if (_starTimer) { clearTimeout(_starTimer); _starTimer = null; pressNum('*'); }
  });
  btn.addEventListener('mouseleave', () => {
    clearTimeout(_starTimer); _starTimer = null;
  });
})();
function dialerBack() {
  if (dialerNum.length > 0) {
    dialerNum = dialerNum.slice(0, -1);
    if (dialerNum.length === 0) closeDialer();
    else renderDialer();
  } else closeDialer();
}

// ════════════════════════════════════════
//  SLEEP MENU (hold end/power key)
//  LSK = Restart, RSK = Power off, End key = close
// ════════════════════════════════════════
let _powerTimer = null;
let _powerOnTimer = null;
function startPowerOn()  {
  if (_powerOnTimer) return;
  _powerOnTimer = setTimeout(() => { _powerOnTimer = null; window.location.reload(); }, 3000);
}
function cancelPowerOn() { clearTimeout(_powerOnTimer); _powerOnTimer = null; }

function isSleepOpen() {
  return document.getElementById('power-menu').classList.contains('visible');
}
function openSleepMenu() {
  const isLocked = view === 'lock';
  document.getElementById('sm-lock').style.display = isLocked ? 'none' : '';
  sleepFocus = 0;
  document.getElementById('power-menu').classList.add('visible');
  const _sb = document.getElementById('statusbar');
  _sb.classList.remove('bw-sb');
  _sb.classList.add('pm-open');
  const bar = document.querySelector('.skbar');
  bar.style.zIndex = '100000';
  bar.classList.add('sleep-mode');
  bar.style.display = '';   // the power menu always needs its "Select" softkey
  _sb.style.display = '';
  updateSleepFocus();
}
function updateSleepFocus() {
  const isLocked = view === 'lock';
  document.getElementById('sm-lock').classList.toggle('focused',    !isLocked && sleepFocus === 0);
  document.getElementById('sm-restart').classList.toggle('focused', isLocked ? sleepFocus === 0 : sleepFocus === 1);
  document.getElementById('sm-power').classList.toggle('focused',   isLocked ? sleepFocus === 1 : sleepFocus === 2);
  setSK('', 'Select', '', false);
}
function closeSleepMenu() {
  document.getElementById('power-menu').classList.remove('visible');
  const _sb = document.getElementById('statusbar');
  _sb.classList.remove('pm-open');
  const _isStub = view === 'app-open' && !openApp?.url && openApp?.id !== 'browser' && openApp?.type !== 'folder';
  if (_isStub) {
    _sb.style.background = '#fff';
    _sb.style.color = '#000';
  } else if (view === 'browser-search' || view === 'browser-history' || (view === 'app-open' && (openApp?.id === 'browser' || openApp?.url))) {
    _sb.classList.add('bw-sb');
  } else {
    _sb.style.background = '';
    _sb.style.color = '';
  }
  const bar = document.querySelector('.skbar');
  bar.classList.remove('sleep-mode');
  bar.style.zIndex = '';
  if (view === 'lock') {
    // Back to the lock screen: re-hide the global bars, lock screen uses its own
    bar.style.display = 'none';
    _sb.style.display = 'none';
    return;
  }
  if (bwMode === 'web' && view !== 'browser-search' && !isBwSCOpen()) bar.style.display = 'none';
  restoreSK();
  if (view === 'app-open' && openApp?.id === 'browser' && bwMode === 'home') _setBwSK();
  if (view === 'browser-search') renderBwSearch();
  if (isBwSCOpen()) { bar.style.display = ''; _bwSCRender(); }
}
function setLockSK() {
  setSK('', '', '', false);
  document.getElementById('sk-c').innerHTML = '<span style="text-transform:none"><i data-icon="lock" style="font-size:1.3rem;line-height:1;vertical-align:middle;margin-right:0.3rem"></i>Unlock</span>';
}
function restoreSK() {
  if (view === 'lock')          setLockSK();
  else if (view === 'home')     setSK('Notices', 'icon:all-apps', 'Contacts', false);
  else if (view === 'apps')     setSK('', 'Select', 'Options', false);
  else if (view === 'sidemenu') setSK('', 'Select', '', false);
  else if (view === 'app-open' && openApp?.type === 'folder')  setSK('', 'Select', 'Options', false);
  else if (view === 'app-open' && openApp?.id === 'browser')   setSK('', 'Select', '', false);
  else if (view === 'app-open' && !openApp?.url) {
    setSK('', '', '', false);
    const _sb = document.querySelector('.skbar');
    _sb.style.backgroundColor = '#e6e6e6';
    _sb.style.backgroundImage = 'none';
    _sb.style.color = '#323232';
  }
  else if (view === 'app-open')                                setSK('', '', 'Back', true);
  else if (view === 'dialer')                                  setSK('Contacts', 'Call', 'Options', false);
  else if (view === 'browser-history')                         _bwHistRestoreSK();
  else                                                         setSK('', '', '', false);
}
function _playPowerVideo(onEnded) {
  const splash = document.getElementById('poweroff-splash');
  const vid = document.createElement('video');
  vid.src = './kaiosrt/gaia/profile/webapps/system/resources/power/carrier_power_off.mp4';
  vid.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
  vid.playsInline = true;
  vid.autoplay = true;
  vid.addEventListener('ended', onEnded, { once: true });
  vid.addEventListener('error', onEnded, { once: true });
  splash.appendChild(vid);
  vid.play().catch(onEnded);
}
let _lockPrevWebviewDisplay = null, _lockSbSnap = null, _lockSkSnap = null;
// Lockscreen mirrors the live status bar into its own separate bar
function _lockSyncStatusbar() {
  const g = document.getElementById('statusbar');
  const l = document.getElementById('lock-statusbar');
  if (g && l) l.innerHTML = g.innerHTML;
}
// Lock the device from any state: dismiss overlays, hide the webview (Electron
// composites it over DOM z-index), give the lock screen its own status/softkey
// bars (global ones hidden), and switch to 'lock'.
function doLock() {
  if (view === 'lock') return;
  closeSleepMenu();
  // Hide the (Electron) webview which would otherwise paint over the lock screen.
  // Everything else (open overlays: options/share/volume/pin, cursor, freeze
  // state) is left untouched so it reappears exactly on unlock.
  const wrap = document.getElementById('bw-webview-wrap');
  _lockPrevWebviewDisplay = wrap ? wrap.style.display : null;
  if (wrap) wrap.style.display = 'none';
  // Snapshot the FULL state of the global bars, then hide them — the lock screen
  // has its own. Restored verbatim on unlock so nothing leaks (className + styles).
  const gsb = document.getElementById('statusbar'), gsk = document.querySelector('.skbar');
  _lockSbSnap = { cls: gsb.className, css: gsb.style.cssText };
  _lockSkSnap = { cls: gsk.className, css: gsk.style.cssText };
  gsb.style.display = 'none'; gsk.style.display = 'none';
  lockFromView = view;
  tickLock(true);
  _lockSyncStatusbar();
  document.getElementById('view-lock').classList.add('visible');
  view = 'lock';
  lbl('Lock screen');
}
const lockScreen = doLock; // alias — call this to lock the device
function doUnlock() {
  document.getElementById('view-lock').classList.remove('visible');
  // Restore the global bars EXACTLY as they were before locking (no leftover state)
  const gsb = document.getElementById('statusbar'), gsk = document.querySelector('.skbar');
  if (_lockSbSnap) { gsb.className = _lockSbSnap.cls; gsb.style.cssText = _lockSbSnap.css; _lockSbSnap = null; }
  if (_lockSkSnap) { gsk.className = _lockSkSnap.cls; gsk.style.cssText = _lockSkSnap.css; _lockSkSnap = null; }
  const wrap = document.getElementById('bw-webview-wrap');
  if (wrap && _lockPrevWebviewDisplay !== null) wrap.style.display = _lockPrevWebviewDisplay;
  _lockPrevWebviewDisplay = null;
  view = lockFromView;
  // Re-derive the softkeys for the restored view (mirror closeSleepMenu's tail).
  // Web mode keeps its hidden skbar + persisted overlays/cursor untouched.
  if (!(view === 'app-open' && bwMode === 'web')) {
    restoreSK();
    if (view === 'app-open' && openApp?.id === 'browser' && bwMode === 'home') _setBwSK();
    if (view === 'browser-search') renderBwSearch();
  }
  if (view === 'home') lbl('Home screen');
  else if (view === 'apps') lbl('Apps — ' + (curApp()?.name || ''));
}
function tickLock(silent = false) {
  const now = new Date();
  const hs = pad(now.getHours()), ms = pad(now.getMinutes());
  const setDig = silent
    ? (id, icon) => { const el = document.getElementById(id); if (el) el.dataset.icon = icon; }
    : animDigit;
  setDig('lc-h1', 'numeric_' + hs[0] + '_rounded_semibold');
  setDig('lc-h2', 'numeric_' + hs[1] + '_rounded_semibold');
  setDig('lc-m1', 'numeric_' + ms[0] + '_rounded_semibold');
  setDig('lc-m2', 'numeric_' + ms[1] + '_rounded_semibold');
  document.getElementById('lock-date').textContent = DAYS[now.getDay()].slice(0,3) + ', ' + MONS[now.getMonth()] + ' ' + now.getDate();
  _lockSyncStatusbar();
}
function doRestart() {
  closeSleepMenu();
  inputLocked = true;
  const splash = document.getElementById('poweroff-splash');
  splash.style.transition = 'opacity 0.5s';
  splash.classList.add('fade');
  _playPowerVideo(() => { window.location.reload(); });
}
function doPowerOff() {
  closeSleepMenu();
  inputLocked = true;
  const splash = document.getElementById('poweroff-splash');
  splash.style.transition = 'opacity 0.5s';
  splash.classList.add('fade');
  _playPowerVideo(() => {
    splash.querySelectorAll('video').forEach(v => v.remove());
  });
}

// End key = power button: short press → goHome(), long press (500ms) → sleep menu
(function() {
  const btn = document.getElementById('endcall-anchor');
  btn.addEventListener('mousedown', e => {
    e.preventDefault();
    if (booting) return;
    if (inputLocked) { startPowerOn(); return; }
    _powerTimer = setTimeout(() => { _powerTimer = null; openSleepMenu(); }, 500);
  });
  btn.addEventListener('mouseup', () => {
    if (booting) return;
    if (inputLocked) { cancelPowerOn(); return; }
    if (_powerTimer) {
      clearTimeout(_powerTimer); _powerTimer = null;
      if (isSleepOpen()) { closeSleepMenu(); return; }
      if (isSysDialogOpen()) { closeDialog(false); return; }   // End key dismisses the dialog
      if (isBwMenuOpen()) { _bwMenuClose(); return; }
      if (_bwPinMode) { _bwPinExit(); return; }
      if (isBwSCOpen()) { closeBwShortcut(); return; }
      if (isBwShareOpen()) { _bwShareClose(); return; }
      if (isBwVolOpen()) { _bwVolClose(); return; }
      if (view === 'app-open' && bwMode === 'web' && (openApp?.id === 'browser' || openApp?.url)) {
        if (_bwCanGoBack()) _bwNavBack();
        else { if (bwCurrentUrl) bwLastUrl = bwCurrentUrl; _bwCloseWebviewCommon(); goHome(); }
      } else {
        pressBack();
      }
    }
  });
  btn.addEventListener('mouseleave', () => {
    if (booting) return;
    if (inputLocked) { cancelPowerOn(); return; }
    clearTimeout(_powerTimer); _powerTimer = null;
  });
})();

// ── Keyboard System ──
const SimKeyboard = {
  active: false,
  mode: 'Abc',
  modes: ['Abc', 'abc', 'ABC', '123'],
  target: null,
  lastKey: null,
  tapCount: 0,
  idleTimer: null,
  symOpen: false,
  symIndex: 0,
  composing: '',
  maps: {
    '1': ['.', ',', '?', '!', '1', ';', ':', '/', '@', '-', '+', '_', '='],
    '2': ['a', 'b', 'c', '2'],
    '3': ['d', 'e', 'f', '3'],
    '4': ['g', 'h', 'i', '4'],
    '5': ['j', 'k', 'l', '5'],
    '6': ['m', 'n', 'o', '6'],
    '7': ['p', 'q', 'r', 's', '7'],
    '8': ['t', 'u', 'v', '8'],
    '9': ['w', 'x', 'y', 'z', '9'],
    '0': [' ', '0']
  },
  symbols: ['.', ',', '?', '!', '@', '-', '+', '_', '=', ';', ':', '/', '(', ')', '#', '*', '"', "'", '&', '%', '$', '€', '£', '¥', '~'],
  
  activate(target) {
    this.target = target;
    this.active = true;
    this.mode = 'Abc';
    this.composing = '';
    this.symOpen = false;
    this.updateUI();
  },
  
  deactivate() {
    this.commitChar();
    this.active = false;
    this.target = null;
    this.closeSymbols();
    document.getElementById('kb-mode').classList.remove('visible');
  },
  
  updateUI() {
    const el = document.getElementById('kb-mode');
    const modeMap = { 'Abc': 'Ab', 'abc': 'ab', 'ABC': 'AB', '123': '12' };
    el.textContent = modeMap[this.mode] || this.mode;
    el.classList.toggle('visible', this.active);
  },

  commitChar() {
    this.composing = '';
    this.lastKey = null;
    this.tapCount = 0;
    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
  },

  cycleMode() {
    this.commitChar();
    let idx = this.modes.indexOf(this.mode);
    this.mode = this.modes[(idx + 1) % this.modes.length];
    this.updateUI();
    if (typeof showToast === 'function') {
      showToast(this.mode);
    }
  },
  
  openSymbols() {
    this.commitChar();
    this.symOpen = true;
    this.symIndex = 0;
    const grid = document.getElementById('kb-sym-grid');
    grid.innerHTML = '';
    this.symbols.forEach((sym, i) => {
      const el = document.createElement('div');
      el.className = 'kb-sym-cell' + (i === 0 ? ' selected' : '');
      el.textContent = sym;
      grid.appendChild(el);
    });
    document.getElementById('kb-symbols').classList.add('visible');
  },

  closeSymbols() {
    this.symOpen = false;
    document.getElementById('kb-symbols').classList.remove('visible');
  },

  handleSymKey(key) {
    if (key === 'Enter') {
      this.target.type(this.symbols[this.symIndex]);
      this.closeSymbols();
    } else if (key === 'Escape' || key === 'Backspace') {
      this.closeSymbols();
    } else if (key === 'ArrowRight') {
      this.symIndex = (this.symIndex + 1) % this.symbols.length;
      this.updateSymUI();
    } else if (key === 'ArrowLeft') {
      this.symIndex = (this.symIndex - 1 + this.symbols.length) % this.symbols.length;
      this.updateSymUI();
    } else if (key === 'ArrowDown') {
      this.symIndex = Math.min(this.symIndex + 5, this.symbols.length - 1);
      this.updateSymUI();
    } else if (key === 'ArrowUp') {
      this.symIndex = Math.max(this.symIndex - 5, 0);
      this.updateSymUI();
    }
  },

  updateSymUI() {
    const cells = document.querySelectorAll('#kb-sym-grid .kb-sym-cell');
    cells.forEach((el, i) => {
      if (i === this.symIndex) el.classList.add('selected');
      else el.classList.remove('selected');
    });
  },

  handleKeydown(key, repeat) {
    if (this.symOpen) {
      this.handleSymKey(key);
      return true;
    }
    
    if (key === 'Enter') {
      if (this.composing) {
        this.commitChar();
        return true;
      }
      return false; // let caller handle
    }
    
    if (key === 'Escape' || key === 'F8') {
      this.deactivate();
      return false; 
    }
    
    if (key === 'Backspace') {
      if (repeat) {
        this.composing = '';
        this.lastKey = null;
        if (this.idleTimer) clearTimeout(this.idleTimer);
        let text = (this.target.getText && this.target.getText()) || '';
        let failsafe = 1000;
        while (text.length > 0 && failsafe-- > 0) {
          if (this.target.backspace) this.target.backspace();
          text = (this.target.getText && this.target.getText()) || '';
        }
        return true;
      }
      if (this.composing) {
        if (this.target.backspace) this.target.backspace();
        this.composing = '';
        this.lastKey = null;
        if (this.idleTimer) clearTimeout(this.idleTimer);
      } else {
        let text = (this.target.getText && this.target.getText()) || '';
        if (text.length === 0) {
          this.deactivate();
          return false;
        }
        if (this.target.backspace) this.target.backspace();
      }
      return true;
    }
    
    if (key === '#') {
      this.cycleMode();
      return true;
    }
    
    if (key === '*') {
      this.openSymbols();
      return true;
    }
    
    if (key.match(/^[0-9]$/)) {
      if (this.mode === '123') {
        this.commitChar();
        if (this.target.type) this.target.type(key);
      } else {
        if (this.lastKey === key) {
          this.tapCount++;
          if (this.idleTimer) clearTimeout(this.idleTimer);
          if (this.target.backspace) this.target.backspace(); // remove previous temp char
        } else {
          this.commitChar();
          this.lastKey = key;
          this.tapCount = 0;
        }
        let map = this.maps[key];
        let char = map[this.tapCount % map.length];
        
        if (this.mode === 'ABC') char = char.toUpperCase();
        else if (this.mode === 'Abc') {
          let text = (this.target.getText && this.target.getText()) || '';
          if (text.length === 0 || text.slice(-2).match(/[.!?]\s$/)) char = char.toUpperCase();
        }
        this.composing = char;
        if (this.target.type) this.target.type(this.composing);

        this.idleTimer = setTimeout(() => {
          this.commitChar();
        }, 1000);
      }
      return true;
    }
    
    if (key.startsWith('Arrow')) {
      this.commitChar();
      if ((key === 'ArrowLeft' || key === 'ArrowRight') && this.target.moveCursor) {
        this.target.moveCursor(key === 'ArrowLeft' ? -1 : 1);
        return true;
      }
      this.deactivate();
      return false;
    }
    
    return false;
  }
};

// Prevent ALL simulator control buttons from stealing focus when clicked
// This is critical: clicking numpad/softkeys must NOT cause focusout on text inputs
document.getElementById('controls').addEventListener('mousedown', e => { e.preventDefault(); });
document.querySelector('.skbar').addEventListener('mousedown', e => { e.preventDefault(); });

document.addEventListener('focusin', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    SimKeyboard.activate({
      type: (ch) => {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        const val = e.target.value;
        e.target.value = val.substring(0, start) + ch + val.substring(end);
        e.target.selectionStart = e.target.selectionEnd = start + ch.length;
      },
      backspace: () => {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        const val = e.target.value;
        if (start === end && start > 0) {
          e.target.value = val.substring(0, start - 1) + val.substring(end);
          e.target.selectionStart = e.target.selectionEnd = start - 1;
        } else if (start !== end) {
          e.target.value = val.substring(0, start) + val.substring(end);
          e.target.selectionStart = e.target.selectionEnd = start;
        }
      },
      getText: () => e.target.value
    });
  }
});

document.addEventListener('focusout', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    // Don't deactivate if focus moved to a control button (numpad, softkeys)
    // relatedTarget is the element receiving focus next
    const next = e.relatedTarget;
    if (next && (next.closest('#controls') || next.closest('.skbar'))) return;
    SimKeyboard.deactivate();
  }
});

// ── Keyboard ──
document.addEventListener('keydown', e => {
  if (inputLocked || booting) {
    e.preventDefault();
    if (inputLocked && (e.key === 'F8' || e.key === 'Escape' || e.key === 'Backspace')) startPowerOn();
    return;
  }
  
  if (SimKeyboard.active) {
    if (SimKeyboard.handleKeydown(e.key, e.repeat)) {
      e.preventDefault();
      return;
    }
  }

  // Sleep/power menu is a top-level modal — capture ALL keys before anything else
  if (isSleepOpen()) {
    e.preventDefault();
    if (e.key === 'ArrowUp')   { showArrowPress('up');   nav('up');   return; }
    if (e.key === 'ArrowDown') { showArrowPress('down'); nav('down'); return; }
    if (e.key === 'Enter')     { showOkPress(); pressOK();            return; }
    if (e.key === 'F1')        { softLeft();                          return; }
    if (e.key === 'F2')        { pressRight();                        return; }
    if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'F8') { closeSleepMenu(); return; }
    return;
  }
  // Lock screen is a modal — capture keys before any preserved overlay handling
  if (view === 'lock') {
    e.preventDefault();
    if (e.key === 'Enter') { showOkPress(); doUnlock(); return; }  // OK unlocks
    if (e.key === 'F8')    { openSleepMenu();            return; }  // power menu on lock
    return;   // everything else does nothing while locked
  }
  // System dialog is a modal — OK (center or RSK) + End/Back dismiss; rest ignored
  if (isSysDialogOpen()) {
    e.preventDefault();
    if (e.key === 'Enter')  { if (_sdCenterOk)  closeDialog(true);  return; }
    if (e.key === 'F2')     { if (!_sdCenterOk) closeDialog(true);  return; }
    if (e.key === 'F1')     { if (!_sdCenterOk) closeDialog(false); return; }
    if (e.key === 'Escape' || e.key === 'Backspace') { closeDialog(false); return; }  // End key dismisses
    return;
  }
  // Rename dialog captures typing
  if (isRenameOpen()) {
    e.preventDefault();
    if (e.key === 'Enter')      { return; }             // center does nothing
    if (e.key === 'Escape')     { _renameCancel();   return; }
    if (e.key === 'F1')         { _renameCancel();   return; }
    if (e.key === 'F2')         { _renameConfirm();  return; }
    if (!SimKeyboard.active && e.key === 'Backspace')  { _renameBackspace(); return; }
    if (!SimKeyboard.active && e.key.length === 1)     { _renameType(e.key); return; }
    return;
  }
  // Real Settings app open: forward every key into its webview (trusted
  // sendInputEvent so Gaia's own nav/typing work); Escape = End exits to
  // launcher, F8 still opens the power menu on top.
  if (isStOpen()) {
    e.preventDefault();
    if (e.key === 'F8')     { openSleepMenu();   return; }
    if (e.key === 'Escape') { stCloseSettings(); return; }
    stKeyFromEvent(e);
    return;
  }
  // Number keys → dialer
  if (/^[0-9#+]$/.test(e.key) && (view === 'home' || view === 'apps') && !isOMOpen() && !isAppDialogOpen()) {
    e.preventDefault(); showNumPress(e.key); openDialer(e.key); return;
  }
  if (/^[0-9#+]$/.test(e.key) && view === 'dialer') {
    e.preventDefault(); showNumPress(e.key); dialerKey(e.key); return;
  }
  // * key — long press handled in keyup
  if (e.key === '*' && (view === 'home' || view === 'apps' || view === 'dialer') && !isAppDialogOpen()) {
    e.preventDefault();
    showNumPress('*');
    if (!_starTimer) {
      _starTimer = setTimeout(() => { _starTimer = null; pressNum('+'); }, 1000);
    }
    return;
  }
  if (isBwMenuOpen()) {
    e.preventDefault();
    if (e.key === 'ArrowLeft')  { _bwMenuNav('left');  return; }
    if (e.key === 'ArrowRight') { _bwMenuNav('right'); return; }
    if (e.key === 'ArrowUp')    { _bwMenuNav('up');    return; }
    if (e.key === 'ArrowDown')  { _bwMenuNav('down');  return; }
    if (e.key === 'Enter')      { _bwMenuSelect();     return; }
    if (e.key === 'F2')         { _bwMenuVoice();      return; }
    if (e.key === 'Escape' || e.key === 'F1' || e.key === 'Backspace') { _bwMenuClose(); return; }
    return;
  }
  if (isBwSCOpen()) {
    e.preventDefault();
    const _scPan = _bwSCPage === 3 && _bwSCSwitch;
    if (e.key === 'ArrowLeft')  { showArrowPress('left');  _scPan ? _bwSCPan('left')  : _bwSCPrev(); return; }
    if (e.key === 'ArrowRight') { showArrowPress('right'); _scPan ? _bwSCPan('right') : _bwSCNext(); return; }
    if (e.key === 'ArrowUp')    { showArrowPress('up');    if (_scPan) _bwSCPan('up');   return; }
    if (e.key === 'ArrowDown')  { showArrowPress('down');  if (_scPan) _bwSCPan('down'); return; }
    if (e.key === 'F1')         { _bwSCPrev(); return; }
    if (e.key === 'F2')         { _bwSCNext(); return; }
    if (e.key === 'Enter')      { showOkPress(); closeBwShortcut(); return; }
    if (e.key === 'Escape' || e.key === 'Backspace' || e.key === '#') { closeBwShortcut(); return; }
    if (/^[0-9]$/.test(e.key))  { showNumPress(e.key); _bwSCDemo(e.key); return; }
    return;
  }
  if (view === 'browser-search') {
    if (!SimKeyboard.active && e.key === 'Backspace') { e.preventDefault(); bwSearchBackspace(); return; }
    if (e.key === 'Escape')     { e.preventDefault(); closeBwSearch();     return; }
    if (e.key === 'F1')         { e.preventDefault(); closeBwSearch();     return; }
    if (e.key === 'ArrowDown')  { e.preventDefault(); bwSearchNav('down'); return; }
    if (e.key === 'ArrowUp')    { e.preventDefault(); bwSearchNav('up');   return; }
    if (e.key === 'Enter')      { e.preventDefault(); bwSearchGo();        return; }
    if (!SimKeyboard.active && e.key.length === 1) { e.preventDefault(); bwSearchType(e.key); return; }
  }
  if (_bwPinMode && /^[0-9]$/.test(e.key)) { e.preventDefault(); showNumPress(e.key); pressNum(e.key); return; }
  // When webview is active, forward keys to it; keep F8/F1/F2/Backspace for simulator
  if (bwMode === 'web' && view === 'app-open' && !_bwPinMode && !isBwVolOpen() && !isBwShareOpen()) {
    if (_bwScrollMode) {
      if (e.key === 'ArrowUp')    { e.preventDefault(); showArrowPress('up');    _bwScrollBy('up');    return; }
      if (e.key === 'ArrowDown')  { e.preventDefault(); showArrowPress('down');  _bwScrollBy('down');  return; }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); showArrowPress('left');  _bwScrollBy('left');  return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); showArrowPress('right'); _bwScrollBy('right'); return; }
      if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); _bwExitScrollMode(); return; }
    }
    if (/^[0-9#+*]$/.test(e.key)) { e.preventDefault(); showNumPress(e.key); bwWebKey(e.key); return; }
    // Cursor mode: arrows move the virtual pointer, Enter clicks at it
    if (e.key === 'ArrowUp')    { e.preventDefault(); showArrowPress('up');    _bwWebArrow('up');    return; }
    if (e.key === 'ArrowDown')  { e.preventDefault(); showArrowPress('down');  _bwWebArrow('down');  return; }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); showArrowPress('left');  _bwWebArrow('left');  return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); showArrowPress('right'); _bwWebArrow('right'); return; }
    if (e.key === 'Enter')      { e.preventDefault(); showOkPress(); _bwCursorClick(); return; }
    const _wv = document.getElementById('bw-iframe');
    if (_wv && _wv.tagName === 'WEBVIEW' && e.key.length === 1) {
      _wv.sendInputEvent({ type: 'char', keyCode: e.key }); e.preventDefault(); return;
    }
  }
  switch (e.key) {
    case 'ArrowUp':    e.preventDefault(); showArrowPress('up');    nav('up');    break;
    case 'ArrowDown':  e.preventDefault(); showArrowPress('down');  nav('down');  break;
    case 'ArrowLeft':  e.preventDefault(); showArrowPress('left');  nav('left');  break;
    case 'ArrowRight': e.preventDefault(); showArrowPress('right'); nav('right'); break;
    case 'Enter':      e.preventDefault(); showOkPress(); pressOK(); break;
    case 'Backspace':  e.preventDefault(); pressBack();      break;
    case 'Escape':     e.preventDefault(); pressBack();      break;
    case 'F1':         e.preventDefault(); softLeft();       break;
    case 'F2':         e.preventDefault(); pressRight();     break;
    case 'F8':         e.preventDefault(); openSleepMenu();  break;
  }
});

document.addEventListener('keyup', e => {
  if (inputLocked || booting) {
    e.preventDefault();
    hideOkPress(); hideArrowPress();
    if (/^[0-9#+*]$/.test(e.key)) hideNumPress(e.key);
    if (inputLocked && (e.key === 'F8' || e.key === 'Escape' || e.key === 'Backspace')) cancelPowerOn();
    return;
  }
  if (isStOpen()) { e.preventDefault(); return; } // keys already forwarded on keydown
  if (e.key === '*' && _starTimer) {
    clearTimeout(_starTimer); _starTimer = null;
    pressNum('*');
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    hideArrowPress();
  }
  if (e.key === 'Enter') { hideOkPress(); }
  if (/^[0-9#+*]$/.test(e.key)) { hideNumPress(e.key); }
});

// ── Init ──
buildSidemenu();
goHome();
updateSbIcons();

// Boot logo: show initlogo.png, then fade out (matches system InitLogoHandler)
(function() {
  const logo = document.getElementById('os-logo');
  // add .hide after a tick — triggers the CSS transition (1s fade, 2s delay)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { logo.classList.add('hide'); });
  });
  logo.addEventListener('transitionend', () => {
    logo.remove();
    booting = false;
    // Welcome dialog once the boot logo has faded
    setTimeout(() => showDialog({
      header: 'Welcome',
      content: 'Welcome to KaiOS 3.0 Simulator on Browser!',
      sub: 'If any bugs exist, email me at: dotrihoang2012@gmail.com',
      cancel: '', ok: 'Got it'
    }), 500);
  }, { once: true });
})();

