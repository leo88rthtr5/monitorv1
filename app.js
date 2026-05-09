/* THE KNIGHT CODE | Terminal Monitor v3.0
   Vanilla ES6+ | Modular | Zero Dependencies
*/

const $ = (id) => document.getElementById(id);
const fmtTime = (ms) => {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};
const nowStamp = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
};

const state = {
  logs: [],
  sessionStart: Date.now(),
  bootMs: Math.round(performance.now()),
  rttHistory: [],
  connectionInfo: null,
  battery: null,
  geo: null,
  games: [
    { id: 'pubg', name: 'PUBG', url: 'https://pubg.com/' },
    { id: 'arena', name: 'Arena Breakout', url: 'https://www.arenabreakoutinfinite.com/' },
    { id: 'val', name: 'Valorant', url: 'https://playvalorant.com/' },
    { id: 'fort', name: 'Fortnite', url: 'https://www.fortnite.com/' },
    { id: 'lol', name: 'LoL', url: 'https://www.leagueoflegends.com/' },
    { id: 'roblox', name: 'Roblox', url: 'https://www.roblox.com/' },
    { id: 'ff', name: 'Free Fire', url: 'https://ff.garena.com/' },
    { id: 'mc', name: 'Minecraft', url: 'https://www.minecraft.net/' }
  ]
};

/* ==========================
   LOGGING SYSTEM
   ========================== */
const addLog = (msg, type = 'INFO') => {
  const line = `[${nowStamp()}] [${type}] ${msg}`;
  state.logs.push(line);
  const container = $('logContainer');
  if (!container) return;
  const div = document.createElement('div');
  div.textContent = line;
  div.className = type === 'WARN' ? 'text-yellow-400' : type === 'ERR' ? 'text-red-400' : 'text-[#10b981]';
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
};

/* ==========================
   NETWORK & SECURITY
   ========================== */
async function initNetworkIdentity() {
  try {
    const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    state.geo = data;
    $('networkIp').textContent = data.ip || 'N/A';
    $('networkIsp').textContent = `${data.org || 'N/A'} / ${data.asn || 'N/A'}`;
    $('networkGeo').textContent = `${data.latitude}, ${data.longitude} | ${data.city}, ${data.country_name}`;
    addLog(`IP identity resolved: ${data.ip}`, 'INFO');
  } catch (e) {
    $('networkIp').textContent = 'BLOCKED';
    $('networkIsp').textContent = 'BLOCKED';
    $('networkGeo').textContent = 'BLOCKED';
    addLog(`IP identity fetch failed: ${e.message}`, 'ERR');
  }
}

function evaluateSecurity() {
  const ua = navigator.userAgent;
  const isPC = !/Mobi|Android|iPhone|iPad|Tablet/i.test(ua);
  if (isPC) {
    $('securityBadge').textContent = 'ALTA_SEGURIDAD_ENCRYPTED_LAN';
    addLog('Host profile: DESKTOP_DETECTED -> ALTA_SEGURIDAD_ENCRYPTED_LAN applied', 'INFO');
  } else {
    $('securityBadge').textContent = 'MEDIUM_SECURITY_MOBILE_AIR';
    addLog('Host profile: MOBILE_DETECTED', 'WARN');
  }
}

async function detectAdblock() {
  const probeUrls = [
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
    'https://googleads.g.doubleclick.net/pagead/id'
  ];
  let blocked = false;
  for (const url of probeUrls) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      await fetch(url, { mode: 'no-cors', signal: ctrl.signal });
      clearTimeout(t);
    } catch {
      blocked = true;
    }
  }
  $('adblockStatus').textContent = blocked ? 'DETECTADO / BLOQUEADO' : 'NO DETECTADO';
  $('adblockStatus').style.color = blocked ? '#f87171' : '';
  addLog(`AdBlocker/Firewall probe: ${blocked ? 'POSITIVE' : 'NEGATIVE'}`, blocked ? 'WARN' : 'INFO');
}

function monitorNetwork() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) {
    $('networkDownlink').textContent = 'API_NO_DISPONIBLE';
    $('networkRtt').textContent = 'API_NO_DISPONIBLE';
    $('networkJitter').textContent = 'API_NO_DISPONIBLE';
    $('networkSignal').textContent = 'API_NO_DISPONIBLE';
    return;
  }

  const downlink = conn.downlink || 0;
  const rtt = conn.rtt || 0;

  state.rttHistory.push(rtt);
  if (state.rttHistory.length > 10) state.rttHistory.shift();

  let jitter = 0;
  if (state.rttHistory.length > 1) {
    let sumDiff = 0;
    for (let i = 1; i < state.rttHistory.length; i++) {
      sumDiff += Math.abs(state.rttHistory[i] - state.rttHistory[i - 1]);
    }
    jitter = Math.round(sumDiff / (state.rttHistory.length - 1));
  }

  let signalScore = 100;
  signalScore -= (rtt * 0.12);
  signalScore -= (jitter * 0.8);
  signalScore += (downlink * 3);
  signalScore = Math.max(0, Math.min(100, Math.round(signalScore)));

  $('networkDownlink').textContent = `${downlink} Mbps`;
  $('networkRtt').textContent = `${rtt} ms`;
  $('networkJitter').textContent = `${jitter} ms`;
  $('networkSignal').textContent = `${signalScore}/100`;
}

/* ==========================
   HARDWARE & RESOURCES
   ========================== */
function initHardware() {
  $('cpuThreads').textContent = navigator.hardwareConcurrency || 'N/A';

  const mem = navigator.deviceMemory;
  $('ramEstimate').textContent = mem ? `~${mem} GB` : 'N/A';

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        $('gpuModel').textContent = renderer || vendor || 'WebGL Active';
      } else {
        $('gpuModel').textContent = 'WebGL Active (Info Hidden)';
      }
    } else {
      $('gpuModel').textContent = 'WebGL Disabled';
    }
  } catch (e) {
    $('gpuModel').textContent = 'ERROR_WEBGL';
  }

  estimateDisk();
  initBattery();
}

function estimateDisk() {
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then(estimate => {
      const free = estimate.quota && estimate.usage ? estimate.quota - estimate.usage : null;
      if (free !== null) {
        const gb = (free / 1024 / 1024 / 1024).toFixed(2);
        $('diskSpace').textContent = `~${gb} GB`;
      } else {
        $('diskSpace').textContent = 'NO_DATA';
      }
    }).catch(() => {
      $('diskSpace').textContent = 'BLOCKED';
    });
  } else {
    $('diskSpace').textContent = 'API_NO_DISPONIBLE';
  }
}

function initBattery() {
  if ('getBattery' in navigator) {
    navigator.getBattery().then(battery => {
      state.battery = battery;
      updateBattery();
      battery.addEventListener('levelchange', updateBattery);
      battery.addEventListener('chargingchange', updateBattery);
    }).catch(() => {
      $('batteryStatus').textContent = 'API_BLOQUEADA';
    });
  } else {
    $('batteryStatus').textContent = 'API_NO_DISPONIBLE';
  }
}

function updateBattery() {
  if (!state.battery) return;
  const level = Math.round(state.battery.level * 100);
  const charging = state.battery.charging ? 'CARGANDO' : 'BATERIA';
  $('batteryStatus').textContent = `${charging} ${level}%`;
}

function monitorHeap() {
  if (performance && performance.memory) {
    const used = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
    $('jsHeap').textContent = `${used} MB`;
  } else {
    $('jsHeap').textContent = 'API_NO_DISPONIBLE';
  }
}

/* ==========================
   GAMING LATENCY
   ========================== */
function buildGamingGrid() {
  const grid = $('gamingGrid');
  if (!grid) return;
  grid.innerHTML = '';
  state.games.forEach(g => {
    const cell = document.createElement('div');
    cell.id = `game-${g.id}`;
    cell.className = 'border border-[#10b981]/20 p-2 flex flex-col gap-1';
    cell.innerHTML = `
      <div class="label">${g.name}</div>
      <div class="value text-sm latency-value">-- ms</div>
      <div class="text-[9px] text-[#10b981]/40 status-text">WAIT</div>
    `;
    grid.appendChild(cell);
  });
}

async function probeGameLatency(game) {
  const cell = $(`game-${game.id}`);
  if (!cell) return;
  const start = performance.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    await fetch(game.url, { mode: 'no-cors', cache: 'no-store', signal: ctrl.signal });
    clearTimeout(t);
    const ms = Math.round(performance.now() - start);
    cell.querySelector('.latency-value').textContent = `${ms} ms`;
    cell.querySelector('.status-text').textContent = 'REACHABLE';
    cell.style.borderColor = 'rgba(16,185,129,0.4)';
  } catch {
    const ms = Math.round(performance.now() - start);
    cell.querySelector('.latency-value').textContent = `>${ms} ms`;
    cell.querySelector('.status-text').textContent = 'TIMEOUT/BLOCKED';
    cell.style.borderColor = 'rgba(248,113,113,0.4)';
  }
}

function scanAllGames() {
  addLog('Gaming latency sweep initiated (8 targets)', 'INFO');
  state.games.forEach(g => probeGameLatency(g));
}

/* ==========================
   UTILITIES
   ========================== */
function updateUptime() {
  const elapsed = Date.now() - state.sessionStart;
  $('uptimeDisplay').textContent = fmtTime(elapsed);
}

function updateBoot() {
  $('bootTime').textContent = `${state.bootMs} ms`;
}

function exportReport() {
  const lines = [];
  lines.push('========================================');
  lines.push('  THE KNIGHT CODE | Terminal Monitor v3.0');
  lines.push('  Full Technical Report Export');
  lines.push(`  Generated: ${new Date().toISOString()}`);
  lines.push('========================================');
  lines.push('');
  lines.push('--- SESSION ---');
  lines.push(`Uptime: ${$('uptimeDisplay').textContent}`);
  lines.push(`Boot Overhead: ${$('bootTime').textContent}`);
  lines.push('');
  lines.push('--- NETWORK IDENTITY ---');
  lines.push(`IP: ${$('networkIp').textContent}`);
  lines.push(`ISP: ${$('networkIsp').textContent}`);
  lines.push(`Geo: ${$('networkGeo').textContent}`);
  lines.push('');
  lines.push('--- NETWORK MONITOR ---');
  lines.push(`Downlink: ${$('networkDownlink').textContent}`);
  lines.push(`RTT: ${$('networkRtt').textContent}`);
  lines.push(`Jitter: ${$('networkJitter').textContent}`);
  lines.push(`Signal Score: ${$('networkSignal').textContent}`);
  lines.push('');
  lines.push('--- SECURITY ---');
  lines.push(`Security State: ${$('securityBadge').textContent}`);
  lines.push(`AdBlock/Firewall: ${$('adblockStatus').textContent}`);
  lines.push('');
  lines.push('--- HARDWARE ---');
  lines.push(`CPU Threads: ${$('cpuThreads').textContent}`);
  lines.push(`RAM Estimate: ${$('ramEstimate').textContent}`);
  lines.push(`GPU: ${$('gpuModel').textContent}`);
  lines.push(`JS Heap: ${$('jsHeap').textContent}`);
  lines.push(`Disk Free: ${$('diskSpace').textContent}`);
  lines.push(`Battery: ${$('batteryStatus').textContent}`);
  lines.push('');
  lines.push('--- GAMING LATENCY ---');
  state.games.forEach(g => {
    const cell = $(`game-${g.id}`);
    if (cell) {
      const lat = cell.querySelector('.latency-value').textContent;
      const st = cell.querySelector('.status-text').textContent;
      lines.push(`${g.name}: ${lat} [${st}]`);
    }
  });
  lines.push('');
  lines.push('--- SYSTEM LOGS ---');
  lines.push(...state.logs);
  lines.push('');
  lines.push('// END OF REPORT');

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TKC_Monitor_Report_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  addLog('Technical report exported to .txt', 'INFO');
}

/* ==========================
   INIT & SCHEDULERS
   ========================== */
async function init() {
  addLog('Terminal Monitor v3.0 initializing...', 'INFO');
  updateBoot();

  evaluateSecurity();
  await initNetworkIdentity();
  await detectAdblock();
  monitorNetwork();
  initHardware();
  buildGamingGrid();
  scanAllGames();

  setInterval(updateUptime, 1000);
  setInterval(monitorNetwork, 3000);
  setInterval(monitorHeap, 5000);

  $('exportBtn').addEventListener('click', exportReport);
  $('rescanGames').addEventListener('click', scanAllGames);

  addLog('All systems nominal. Monitoring active.', 'INFO');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
