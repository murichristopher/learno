const router = require('express').Router();

// Standalone mic / Web Speech diagnostics page. Open at http://localhost:9990/debug/mic
// Separates two independent things:
//   1. Raw microphone capture (getUserMedia + Web Audio level meter) — proves the OS/browser mic works.
//   2. SpeechRecognition (Google cloud transcription) — proves the recognition service works.
// Everything is logged on-screen with timestamps so no DevTools is needed.
const PAGE = /* html */ `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Mic / Speech — Debug</title>
<style>
  :root { --ink:#e6e6e6; --bg:#0f1115; --rule:#2a2e37; --accent:#4f8cff; --ok:#3fb950; --bad:#f85149; --warn:#d29922; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:var(--bg); color:var(--ink);
         max-width:840px; margin:0 auto; padding:2rem 1.25rem 5rem; line-height:1.5; }
  h1 { font-size:1.4rem; margin-bottom:.25rem; }
  .sub { color:#8b949e; font-size:.85rem; margin-bottom:1.5rem; }
  .card { border:1px solid var(--rule); border-radius:10px; padding:1rem 1.1rem; margin-bottom:1.25rem; background:#161922; }
  .card h2 { font-size:.95rem; margin-bottom:.75rem; display:flex; align-items:center; gap:.5rem; }
  .btn { font:inherit; font-size:.88rem; padding:.5rem 1rem; border:1px solid var(--rule); border-radius:7px;
         background:#1f2430; color:var(--ink); cursor:pointer; transition:all .15s; margin:.2rem .35rem .2rem 0; }
  .btn:hover { border-color:var(--accent); color:#fff; }
  .btn.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
  .btn.danger { border-color:var(--bad); color:var(--bad); }
  .kv { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.82rem; }
  .kv div { padding:.2rem 0; border-bottom:1px solid var(--rule); display:flex; justify-content:space-between; gap:1rem; }
  .kv b { color:#8b949e; font-weight:normal; }
  .kv .yes { color:var(--ok); } .kv .no { color:var(--bad); }
  .meter-wrap { height:18px; background:#0b0d12; border:1px solid var(--rule); border-radius:6px; overflow:hidden; margin-top:.6rem; }
  .meter { height:100%; width:0%; background:linear-gradient(90deg,var(--ok),var(--warn),var(--bad)); transition:width .05s; }
  textarea { width:100%; min-height:70px; margin-top:.6rem; background:#0b0d12; color:var(--ink); border:1px solid var(--rule);
             border-radius:7px; padding:.6rem; font:inherit; font-size:.9rem; resize:vertical; }
  pre#log { background:#0b0d12; border:1px solid var(--rule); border-radius:8px; padding:.85rem;
            font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.78rem; line-height:1.45;
            max-height:340px; overflow:auto; white-space:pre-wrap; word-break:break-word; }
  .tag { font-family:ui-monospace,monospace; font-size:.7rem; padding:.1rem .4rem; border-radius:4px; }
  .t-ev { background:#1f2937; color:#93c5fd; } .t-ok { background:#0d2818; color:var(--ok); }
  .t-err { background:#2d0f0f; color:var(--bad); } .t-info { background:#262626; color:#d4d4d4; }
</style>
</head>
<body>
<h1>🎤 Mic / Speech — Debug</h1>
<div class="sub">Página servida por <code>localhost:9990/debug/mic</code>. Tudo é logado na tela — não precisa do DevTools.</div>

<div class="card">
  <h2>1 · Ambiente</h2>
  <div class="kv" id="env"></div>
</div>

<div class="card">
  <h2>2 · Permissão do microfone</h2>
  <button class="btn" onclick="checkPerm()">Consultar estado da permissão</button>
  <div class="kv" id="perm" style="margin-top:.6rem"></div>
</div>

<div class="card">
  <h2>3 · Microfone cru (getUserMedia + medidor)</h2>
  <div class="sub" style="margin:0 0 .5rem">Se a barra <b>se mexe</b> quando você fala, o mic do SO/navegador funciona. Isola o problema do reconhecimento.</div>
  <button class="btn primary" onclick="startMeter()">Ligar mic + medidor</button>
  <button class="btn danger" onclick="stopMeter()">Parar mic</button>
  <button class="btn" onclick="listDevices()">Listar dispositivos</button>
  <div class="meter-wrap"><div class="meter" id="meter"></div></div>
  <div class="kv" id="level" style="margin-top:.4rem"></div>
</div>

<div class="card">
  <h2>4 · SpeechRecognition (transcrição)</h2>
  <button class="btn primary" id="srBtn" onclick="toggleSR()">Iniciar reconhecimento</button>
  <span id="srState" class="tag t-info">parado</span>
  <textarea id="srOut" placeholder="A transcrição aparece aqui…"></textarea>
</div>

<div class="card">
  <h2>5 · Log de eventos</h2>
  <button class="btn" onclick="document.getElementById('log').textContent=''">Limpar</button>
  <pre id="log"></pre>
</div>

<script>
  const logEl = document.getElementById('log');
  function log(msg, kind='info') {
    const t = new Date().toISOString().substr(11,12);
    const tag = { ev:'t-ev', ok:'t-ok', err:'t-err', info:'t-info' }[kind] || 't-info';
    logEl.innerHTML += \`<span class="tag \${tag}">\${kind.toUpperCase()}</span> \${t}  \${msg}\\n\`;
    logEl.scrollTop = logEl.scrollHeight;
  }

  // ── 1. Ambiente ──────────────────────────────────────────────
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  (function envDump() {
    const rows = [
      ['location.origin', location.origin],
      ['isSecureContext', window.isSecureContext],
      ['SpeechRecognition disponível', !!SR],
      ['navigator.mediaDevices', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)],
      ['navigator.permissions', !!navigator.permissions],
      ['online', navigator.onLine],
      ['userAgent', navigator.userAgent],
    ];
    document.getElementById('env').innerHTML = rows.map(([k,v]) => {
      const cls = v === true ? 'yes' : v === false ? 'no' : '';
      return \`<div><b>\${k}</b><span class="\${cls}">\${v}</span></div>\`;
    }).join('');
    log('ambiente carregado. SR=' + !!SR + ' secureContext=' + window.isSecureContext, 'info');
  })();

  // ── 2. Permissão ─────────────────────────────────────────────
  async function checkPerm() {
    if (!navigator.permissions) { log('navigator.permissions indisponível', 'err'); return; }
    try {
      const st = await navigator.permissions.query({ name: 'microphone' });
      document.getElementById('perm').innerHTML = \`<div><b>microphone</b><span class="\${st.state==='granted'?'yes':st.state==='denied'?'no':''}">\${st.state}</span></div>\`;
      log('permissão do microfone: ' + st.state, st.state === 'granted' ? 'ok' : st.state === 'denied' ? 'err' : 'info');
      if (st.state === 'denied') log('→ macOS/navegador bloqueou. System Settings → Privacy → Microphone → ligue o navegador e reabra.', 'err');
    } catch (e) { log('erro ao consultar permissão: ' + e.message, 'err'); }
  }

  // ── 3. Mic cru + medidor ─────────────────────────────────────
  let micStream = null, audioCtx = null, rafId = null;
  async function startMeter() {
    try {
      log('pedindo getUserMedia({audio:true})… (timeout 8s)', 'info');
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT_8S')), 8000));
      micStream = await Promise.race([ navigator.mediaDevices.getUserMedia({ audio: true }), timeout ]);
      log('getUserMedia OK — mic capturando', 'ok');
      const track = micStream.getAudioTracks()[0];
      log('input device: ' + (track ? track.label || '(sem label)' : 'nenhum'), 'info');
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src = audioCtx.createMediaStreamSource(micStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const meter = document.getElementById('meter');
      const lvl = document.getElementById('level');
      let peak = 0;
      (function tick() {
        analyser.getByteTimeDomainData(data);
        let max = 0;
        for (let i = 0; i < data.length; i++) max = Math.max(max, Math.abs(data[i] - 128));
        const pct = Math.min(100, (max / 128) * 100 * 2);
        meter.style.width = pct + '%';
        peak = Math.max(peak, pct);
        lvl.innerHTML = \`<div><b>nível atual</b><span>\${pct.toFixed(0)}%</span></div><div><b>pico</b><span>\${peak.toFixed(0)}%</span></div>\`;
        rafId = requestAnimationFrame(tick);
      })();
    } catch (e) {
      if (e.message === 'TIMEOUT_8S') {
        log('getUserMedia NÃO RESPONDEU em 8s — travou. O navegador não mostrou o prompt.', 'err');
        log('→ Quase sempre é permissão de macOS: System Settings → Privacy → Microphone → ligue o navegador e REABRA-o por completo. Ou outro app está segurando o mic.', 'err');
      } else {
        log('getUserMedia FALHOU: ' + e.name + ' — ' + e.message, 'err');
        if (e.name === 'NotAllowedError') log('→ permissão negada (site ou macOS). É AQUI o problema do mic.', 'err');
        if (e.name === 'NotFoundError')  log('→ nenhum dispositivo de microfone encontrado.', 'err');
      }
    }
  }

  // Lista dispositivos sem precisar de permissão. Labels VAZIOS = permissão nunca concedida.
  async function listDevices() {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const audio = devs.filter(d => d.kind === 'audioinput');
      log('audioinputs encontrados: ' + audio.length, audio.length ? 'ok' : 'err');
      if (!audio.length) log('→ nenhum microfone visível para o navegador.', 'err');
      audio.forEach((d, i) => log('  • [' + i + '] ' + (d.label || '(label vazio → permissão de mic NUNCA foi concedida a este navegador)'), d.label ? 'info' : 'err'));
    } catch (e) { log('enumerateDevices erro: ' + e.message, 'err'); }
  }
  function stopMeter() {
    if (rafId) cancelAnimationFrame(rafId);
    if (micStream) micStream.getTracks().forEach(t => t.stop());
    if (audioCtx) audioCtx.close();
    micStream = audioCtx = rafId = null;
    document.getElementById('meter').style.width = '0%';
    log('mic parado', 'info');
  }

  // ── 4. SpeechRecognition ─────────────────────────────────────
  let rec = null, srActive = false;
  function setSR(state, kind) { const el = document.getElementById('srState'); el.textContent = state; el.className = 'tag ' + kind; }
  function toggleSR() {
    if (!SR) { log('SpeechRecognition indisponível neste navegador', 'err'); return; }
    if (srActive) { rec && rec.stop(); return; }
    rec = new SR();
    rec.lang = 'pt-BR';
    rec.interimResults = true;
    rec.continuous = true;
    // Loga TODOS os eventos para sabermos exatamente onde para
    ['audiostart','soundstart','speechstart','speechend','soundend','audioend'].forEach(ev => {
      rec['on' + ev] = () => log('SR evento: ' + ev, 'ev');
    });
    rec.onstart = () => { srActive = true; setSR('ouvindo', 't-ok'); document.getElementById('srBtn').textContent = 'Parar reconhecimento'; log('SR: onstart — reconhecimento iniciado', 'ok'); };
    rec.onresult = (e) => {
      let finalTxt = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTxt += t; else interim += t;
      }
      document.getElementById('srOut').value = (document.getElementById('srOut').value.replace(/\\s*\\[interim].*$/, '')) + finalTxt + (interim ? ' [interim]' + interim : '');
      log('SR: onresult — final="' + finalTxt + '" interim="' + interim + '"', 'ok');
    };
    rec.onerror = (e) => { log('SR: onerror — ' + e.error, 'err'); if (e.error === 'not-allowed') log('→ mic bloqueado (site/macOS).', 'err'); if (e.error === 'network') log('→ sem rede para o serviço de fala do Google.', 'err'); };
    rec.onend = () => { srActive = false; setSR('parado', 't-info'); document.getElementById('srBtn').textContent = 'Iniciar reconhecimento'; log('SR: onend — encerrado', 'info'); };
    try { rec.start(); log('SR: start() chamado', 'info'); }
    catch (e) { log('SR: start() lançou — ' + e.message, 'err'); }
  }
</script>
</body>
</html>`;

router.get('/mic', (_req, res) => res.type('html').send(PAGE));

module.exports = router;
