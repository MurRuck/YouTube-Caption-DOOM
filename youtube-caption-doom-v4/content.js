/* YouTube content script: native caption-window position -> DOOM key state. */
(() => {
  'use strict';
  if (window.__captionDoomV4Installed) return;
  window.__captionDoomV4Installed = true;
  const host = document.createElement('div');
  host.id = 'caption-doom-v4-host';
  host.style.cssText = 'position:fixed;top:76px;right:18px;width:680px;max-width:calc(100vw - 32px);z-index:2147483646;font:13px Arial,sans-serif;color:#e5e7eb;';
  const root = host.attachShadow({mode:'open'});
  root.innerHTML = `
    <style>
      *{box-sizing:border-box}
      .panel{border:1px solid #667085;border-radius:9px;background:#111722;box-shadow:0 12px 40px #0009;overflow:hidden}
      .bar{background:#1e293b;padding:7px 9px;display:flex;flex-wrap:wrap;gap:5px;align-items:center}
      .title{font:bold 13px Arial;color:#ffc9bd;margin-right:auto}
      button{background:#344255;border:1px solid #64748b;border-radius:4px;color:#f8fafc;padding:5px 8px;font:12px Arial;cursor:pointer}
      button:hover{background:#50647c}
      button.on{background:#a32525;border-color:#d76464}
      .game{height:420px;width:100%;border:0;background:#000;display:block}
      .status{white-space:pre-wrap;padding:6px 9px;line-height:1.5;min-height:38px;font:11px monospace;color:#d3e2f2}
      .help{padding:0 9px 9px;font:11px/1.4 Arial;color:#aab7c7}
      .panel{position:relative}
      .game.compact{position:absolute;z-index:-1;height:420px;left:0;top:0;opacity:.01;pointer-events:none;border:0}
      .hidden{display:none}
    </style>
    <div class="panel">
      <div class="bar">
        <span class="title">CAPTION → DOOM · NATIVE CC ASCII · v0.4</span>
        <button id="track">Start tracking</button>
        <button id="ascii">ASCII CC: OFF</button>
        <button id="test">Test ASCII</button>
        <button id="res">48×20</button>
        <button id="keyboard">Keyboard mode</button>
        <button id="fire">FIRE</button>
        <button id="use">USE</button>
        <button id="enter">ENTER</button>
        <button id="escape">ESC</button>
        <button id="visibility">Hide preview</button>
        <button id="close">×</button>
      </div>
      <iframe class="game" id="game" title="DOOM WebAssembly" src="${chrome.runtime.getURL('game.html')}"></iframe>
      <div class="status" id="status">Waiting for WASM runtime…</div>
      <div class="help">Start DOOM, enable YouTube CC, then enable ASCII CC. The real .ytp-caption-segment displays live WASM frames. Start tracking to move/turn by dragging the CC window. Video left click = FIRE; right click = USE (avoid captions/controls). Test ASCII validates native DOM injection without the engine. Hide shrinks the engine preview but keeps the renderer alive. Z/X work while dragging; no sprint.</div>
    </div>`;
  (document.body || document.documentElement).appendChild(host);
  const get = id => root.getElementById(id);
  const frame = get('game');
  const asciiBtn = get('ascii');
  const testBtn = get('test');
  const resBtn = get('res');
  const asciiAdapter = new CaptionDoomAscii.NativeAsciiCaptions();
  const asciiResolutions = [[32,14],[48,20],[56,24]];
  let resIndex = 1;
  let asciiEnabled = false;
  let testMode = false;
  let lastAsciiAt = 0;
  let lastNativeFrame = null;
  let lastAsciiMsg = '';
  let lastStatUpdate = 0;
  let lastUntrackedStatus = 0;
  let testTimer = null;
  const status = get('status');
  const trackBtn = get('track');
  const keyboardBtn = get('keyboard');
  let tracking = false;
  // Track mouse buttons separately; Chrome pointerId is normally shared between
  // left and right mouse buttons and cannot be used as the lookup key.
  const heldMouse = new Map();
  let keyboardMode = false;
  let signature = null;
  let lastSent = 0;
  let lastStatus = '';
  let lastLost = 0;
  const send = (type, data={}) => {
    if (!frame.contentWindow) return;
    frame.contentWindow.postMessage({channel:'caption-doom',type,...data}, chrome.runtime.getURL('').replace(/\/$/,''));
  };
  // Only send to our own extension origin. A constant chrome-extension://id
  // destination protects against iframe navigation and unrelated webpages.
  frame.addEventListener('load', () => {
    signature = null;
    send('release-all');
    send('ascii-control',{enabled:asciiEnabled,cols:asciiResolutions[resIndex][0],rows:asciiResolutions[resIndex][1]});
  });
  const findCaption = CaptionDoomAscii.findCaption;
  // Only mouse gestures on the empty video surface control DOOM. Mouse events
  // that begin on a caption must reach YouTube unchanged, so caption dragging
  // is preserved. Buttons, timeline, settings, links and other UI are excluded.
  function isActionSurface(event) {
    if (!tracking || !host.isConnected) return false;
    const t = event.target;
    const player = document.querySelector('.html5-video-player');
    if (!(t instanceof Element) || !player || !player.contains(t) || host.contains(t)) return false;
    const caption = findCaption();
    if (caption?.contains(t)) return false;
    if (t.closest('.ytp-caption-window-container, .caption-window, .ytp-chrome-top, .ytp-chrome-bottom, .ytp-progress-bar-container, .ytp-popup, .ytp-settings-menu, .ytp-ce-element, .ytp-cards-button, .ytp-paid-content-overlay, button, a, input, textarea, select, [role="button"], [contenteditable="true"]')) return false;
    return true;
  }
  function blockPlayerEvent(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
  function releaseMouse() {
    for (const code of heldMouse.values()) send('up', {code});
    heldMouse.clear();
  }
  document.addEventListener('pointerdown', e => {
    if ((e.pointerType && e.pointerType !== 'mouse') || (e.button !== 0 && e.button !== 2) || !isActionSurface(e)) return;
    const code = e.button === 0 ? 'ControlLeft' : 'Space';
    if (!heldMouse.has(e.button)) {
      heldMouse.set(e.button, code);
      send('down', {code});
    }
    blockPlayerEvent(e);
  }, true);
  document.addEventListener('pointerup', e => {
    if (!heldMouse.has(e.button)) return;
    const code = heldMouse.get(e.button);
    heldMouse.delete(e.button);
    send('up', {code});
    if (isActionSurface(e)) blockPlayerEvent(e);
  }, true);
  document.addEventListener('pointercancel', () => releaseMouse(), true);
  // YouTube may toggle play/pause on click or display a context menu even if
  // pointerdown was handled. Suppress the compatibility mouse events too.
  for (const name of ['mousedown', 'mouseup', 'click', 'dblclick', 'auxclick', 'contextmenu']) {
    document.addEventListener(name, e => {
      if (isActionSurface(e)) blockPlayerEvent(e);
    }, true);
  }
  function setKeys(keys) {
    const sig = keys.slice().sort().join(',');
    const now = performance.now();
    if (sig !== signature || now - lastSent > 450) {
      send('tracking', {keys});
      signature = sig;
      lastSent = now;
    }
  }
  function reset() { signature = null; setKeys([]); }
  function update() {
    if (tracking && host.isConnected) {
      const caption = findCaption();
      const player = document.querySelector('.html5-video-player');
      if (!caption || !player) {
        reset();
        if (performance.now() - lastLost > 450) {
          status.textContent = 'CC not detected. Enable YouTube captions; ASCII requires an actual .ytp-caption-segment.';
          lastLost = performance.now();
        }
      } else {
        const cr=caption.getBoundingClientRect(), pr=player.getBoundingClientRect();
        if (pr.width <= 0 || pr.height <= 0) { reset(); }
        else {
          const x=Math.max(0,Math.min(1,(cr.left+cr.width/2-pr.left)/pr.width));
          const y=Math.max(0,Math.min(1,(cr.top+cr.height/2-pr.top)/pr.height));
          const dz=.16, keys=[];
          if (y<.5-dz) keys.push('ArrowUp');
          if (y>.5+dz) keys.push('ArrowDown');
          if (x<.5-dz) keys.push('ArrowLeft');
          if (x>.5+dz) keys.push('ArrowRight');
          setKeys(keys);
          if (performance.now() - lastStatUpdate > 220) {
            const display = asciiEnabled ? (testMode ? 'TEST ASCII' : 'NATIVE ASCII ' + (lastAsciiAt ? (Math.round((Date.now()-lastAsciiAt)/100)/10+'s ago') : 'waiting for frames')) : 'CC native';
            status.textContent=`${display} | x=${x.toFixed(2)} y=${y.toFixed(2)} → ${keys.join('+')||'STOP'}\n${lastAsciiMsg}`;
            lastStatUpdate=performance.now();
          }
        }
      }
    }
    if (host.isConnected) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
  trackBtn.addEventListener('click', () => {
    releaseMouse();
    send('release-all');
    tracking = !tracking;
    keyboardMode = false;
    keyboardBtn.classList.remove('on');
    trackBtn.classList.toggle('on', tracking);
    trackBtn.textContent = tracking ? 'Stop tracking' : 'Start tracking';
    reset();
    if (!tracking) status.textContent = 'Tracking stopped.';
  });
  keyboardBtn.addEventListener('click', () => {
    releaseMouse();
    send('release-all');
    keyboardMode = !keyboardMode;
    tracking = false;
    trackBtn.classList.remove('on');
    trackBtn.textContent = 'Start tracking';
    keyboardBtn.classList.toggle('on', keyboardMode);
    send('release-all');
    reset();
    status.textContent = keyboardMode ? 'Keyboard mode enabled (click outside game iframe first). Arrows / Z / X / Enter / Esc.' : 'Keyboard mode off.';
  });
  for (const [id,code] of Object.entries({fire:'ControlLeft',use:'Space',enter:'Enter',escape:'Escape'})) {
    get(id).addEventListener('click',()=>send('pulse',{code}));
  }
  get('visibility').addEventListener('click',()=>{
    // display:none can stop animation-frame rendering on some browser builds.
    frame.classList.toggle('compact');
    get('visibility').textContent=frame.classList.contains('compact')?'Show preview':'Hide preview';
  });
  get('close').addEventListener('click',()=>{
    stopTest(); asciiAdapter.setEnabled(false); asciiEnabled=false;
    send('ascii-control',{enabled:false}); releaseMouse(); send('release-all');host.remove();
  });
  const translate = code => ({KeyZ:'ControlLeft',KeyX:'Space'})[code] || code;
  function onKeyboard(e,isDown) {
    if ((!keyboardMode && !tracking) || !host.isConnected || ['INPUT','TEXTAREA'].includes(e.target?.tagName) || e.target?.isContentEditable) return;
    // In caption mode, leave YouTube's own keyboard shortcuts alone except
    // optional Z / X: they work even while the left button drags the caption.
    if (tracking && !['KeyZ', 'KeyX'].includes(e.code)) return;
    const code=translate(e.code);
    if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ControlLeft','Space','Enter','Escape','Digit1','Digit2','Digit3'].includes(code)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    send(isDown?'down':'up',{code});
  }
  document.addEventListener('keydown', e=>onKeyboard(e,true), true);
  document.addEventListener('keyup', e=>onKeyboard(e,false), true);
  window.addEventListener('blur',()=>{releaseMouse();send('release-all');});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseMouse();send('release-all');}});
  function stopTest() {
    testMode = false;
    testBtn.classList.remove('on');
    testBtn.textContent = 'Test ASCII';
    if (testTimer !== null) {clearInterval(testTimer);testTimer=null;}
  }
  function generateTestFrame() {
    const [cols,rows] = asciiResolutions[resIndex];
    const t = performance.now()/480;
    const lines=[];
    for (let y=0;y<rows;y++) {
      let line='';
      for (let x=0;x<cols;x++) {
        const v=Math.sin((x-cols/2)*.24+t)*Math.cos((y-rows/2)*.4-t*.5);
        line+=' .:-=+*#%@'[Math.max(0,Math.min(9,Math.round((v+1)*4.5)))];
      }
      lines.push(line);
    }
    asciiAdapter.render({text:lines.join('\n'),cols,rows});
  }
  function setAscii(enabled) {
    asciiEnabled=enabled;
    asciiAdapter.setEnabled(enabled);
    asciiBtn.classList.toggle('on',enabled);
    asciiBtn.textContent=enabled?'ASCII CC: ON':'ASCII CC: OFF';
    if (!enabled) {stopTest();lastNativeFrame=null;lastAsciiMsg='Original CC restored.';}
    else lastAsciiMsg='Waiting for native CC text segment / WASM frames.';
    send('ascii-control',{enabled,cols:asciiResolutions[resIndex][0],rows:asciiResolutions[resIndex][1]});
    if (!tracking) status.textContent=lastAsciiMsg;
  }
  asciiBtn.addEventListener('click',()=>setAscii(!asciiEnabled));
  testBtn.addEventListener('click',()=>{
    if (testMode) {stopTest();return;}
    if (!asciiEnabled) setAscii(true);
    testMode=true;
    testBtn.classList.add('on');
    testBtn.textContent='Stop test';
    generateTestFrame();
    status.textContent='TEST ASCII: synthetic pattern is displayed in the actual YouTube CC DOM. Stop test to resume live DOOM frames.';
    testTimer=setInterval(generateTestFrame,125);
  });
  resBtn.addEventListener('click',()=>{
    resIndex=(resIndex+1)%asciiResolutions.length;
    const [cols,rows]=asciiResolutions[resIndex];
    resBtn.textContent=cols+'×'+rows;
    send('ascii-control',{enabled:asciiEnabled,cols,rows});
    if(testMode) generateTestFrame();
  });
  window.addEventListener('message', e => {
    if (e.source !== frame.contentWindow || e.origin !== chrome.runtime.getURL('').replace(/\/$/,'')) return;
    if (e.data?.channel === 'caption-doom-ascii') {
      if(!asciiEnabled || testMode) return;
      const data=e.data;
      const [cols,rows]=asciiResolutions[resIndex];
      if(data.type==='frame' && data.cols===cols && data.rows===rows && typeof data.text==='string') {
        lastNativeFrame=data;
        const result=asciiAdapter.render(data);
        lastAsciiAt=Date.now();
        lastAsciiMsg=result.ok?(data.blank?'Warning: game canvas reads as black; keep game preview visible to diagnose.':'Live framebuffer → actual .ytp-caption-segment OK.'):'ASCII paused: '+result.reason+' — CC must be enabled.';
      } else if(data.type==='error') lastAsciiMsg='Framebuffer capture error: '+String(data.message).slice(0,180);
      if(!tracking && Date.now()-lastUntrackedStatus>600) {status.textContent=lastAsciiMsg;lastUntrackedStatus=Date.now();}
      return;
    }
    if (e.data?.channel !== 'caption-doom-status') return;
    lastStatus = e.data.message;
    if (!tracking) status.textContent = (e.data.type==='error'?'ERROR: ':'')+lastStatus;
  });
  // YouTube may remove the segment when the next subtitle cue arrives.
  // Force reattachment even when the captured frame hasn't changed.
  setInterval(()=>{
    if(asciiEnabled && !testMode && lastNativeFrame && host.isConnected) {
      const result=asciiAdapter.render(lastNativeFrame);
      if(!result.ok) lastAsciiMsg='ASCII paused: '+result.reason;
    }
  },350);
})();
