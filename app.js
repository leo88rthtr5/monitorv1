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
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
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
    $('securityBadge').classList.add('text-[#10b981]');
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
  $('adblockStatus').className = `value text-xs ${blocked ? 'text-red-400' : ''}`;
  addLog(`AdBlocker/Firewall probe: ${blocked ? 'POSITIVE' : 'NEGATIVE'}`, blocked ? 'WARN' : 'INFO');
}

function monitorNetwork() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) {
    $('networkDownlink').textContent = 'N/A';
    $('networkRtt').textContent = 'N/A';
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
}