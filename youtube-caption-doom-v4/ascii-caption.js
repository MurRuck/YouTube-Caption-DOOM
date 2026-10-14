/* Native YouTube CC DOM ASCII adapter. No overlay and no player internals patched.
   Runs in Chrome content-script isolated world; attaches to .ytp-caption-segment.
   License: MIT, see README. */
(() => {
  'use strict';
  if (globalThis.CaptionDoomAscii) return;

  const selector = '.ytp-caption-window-container .caption-window';
  function findCaption() {
    const windows = document.querySelectorAll(selector + ', .caption-window');
    for (const el of windows) {
      const box = el.getBoundingClientRect();
      if (box.width > 15 && box.height > 8 && getComputedStyle(el).display !== 'none' &&
          getComputedStyle(el).visibility !== 'hidden' && el.querySelector('.ytp-caption-segment')) {
        return el;
      }
    }
    return null;
  }

  class NativeAsciiCaptions {
    constructor() {
      this.active = false;
      this.state = null;
      this.message = '';
    }
    available() { return Boolean(findCaption()); }
    setEnabled(value) {
      this.active = Boolean(value);
      if (!this.active) this.restore();
    }
    restore() {
      const state = this.state;
      if (!state) return;
      const { segment, backup, ascii, siblings } = state;
      // Restore original live caption nodes only if YouTube hasn't replaced them.
      if (segment.contains(backup) && segment.contains(ascii)) {
        while (backup.firstChild) segment.insertBefore(backup.firstChild, backup);
        backup.remove();
        ascii.remove();
      }
      for (const [el, oldValue, oldPriority] of siblings) {
        if (el.isConnected) {
          if (oldValue) el.style.setProperty('display', oldValue, oldPriority);
          else el.style.removeProperty('display');
        }
      }
      this.state = null;
    }
    attach(windowEl) {
      const segments = [...windowEl.querySelectorAll('.ytp-caption-segment')];
      if (!segments.length) return false;
      const segment = segments[0];
      if (this.state && this.state.segment === segment && this.state.ascii.isConnected) {
        return true;
      }
      this.restore();
      const backup = document.createElement('span');
      backup.setAttribute('data-caption-doom-original', '');
      backup.hidden = true;
      backup.style.setProperty('display', 'none', 'important');
      // Move the *actual* caption nodes aside so turning the mode off restores
      // them, rather than replacing the text with a synthetic copy.
      while (segment.firstChild) backup.appendChild(segment.firstChild);
      const ascii = document.createElement('span');
      ascii.setAttribute('data-caption-doom-ascii', '');
      const css = {
        'white-space': 'pre', 'font-family': 'Consolas, "Courier New", monospace',
        'font-size': '8px', 'line-height': '1', 'letter-spacing': '0',
        'font-weight': 'normal', 'display': 'inline-block', 'text-align': 'left',
        'padding': '3px', 'background': 'rgba(0,0,0,.98)', 'color': '#d6facc',
        'user-select': 'none', 'pointer-events': 'none', 'text-shadow': 'none',
        'margin': '0', 'border': '0'
      };
      for (const [k,v] of Object.entries(css)) ascii.style.setProperty(k,v,'important');
      ascii.textContent = 'Loading ASCII…';
      segment.append(backup, ascii);
      const siblings = [];
      for (const s of segments.slice(1)) {
        siblings.push([s, s.style.getPropertyValue('display'), s.style.getPropertyPriority('display')]);
        s.style.setProperty('display','none','important');
      }
      this.state = {windowEl, segment, backup, ascii, siblings};
      return true;
    }
    render(frame) {
      if (!this.active) return {ok:false, reason:'disabled'};
      const cap = findCaption();
      if (!cap) {
        this.restore();
        return {ok:false,reason:'no-native-CC'};
      }
      if (!this.attach(cap)) return {ok:false,reason:'missing-segment'};
      const content = typeof frame?.text === 'string' ? frame.text : '';
      if (!content || content.length > 8000) return {ok:false,reason:'invalid-frame'};
      const {ascii,windowEl} = this.state;
      if (ascii.textContent !== content) ascii.textContent = content;
      // Limit dimensions so the underlying draggable .caption-window continues
      // to fit inside the current YouTube player without covering all controls.
      const player = document.querySelector('.html5-video-player');
      const r = (player || windowEl).getBoundingClientRect();
      const cols = Math.max(1, Number(frame.cols) || content.indexOf('\n'));
      const rows = Math.max(1, Number(frame.rows) || content.split('\n').length);
      const fontsize = Math.max(4.5, Math.min(10, 0.77 * r.width / (cols * .62), 0.56 * r.height / (rows * 1.1)));
      ascii.style.setProperty('font-size', fontsize.toFixed(2)+'px','important');
      ascii.style.setProperty('line-height', (fontsize*1.03).toFixed(2)+'px','important');
      return {ok:true, reason:'native-segment', fontsize, target:ascii};
    }
  }
  globalThis.CaptionDoomAscii = {findCaption,NativeAsciiCaptions};
})();
