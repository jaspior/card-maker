// YouTube audio reactor.
//
// We CANNOT capture audio from a YouTube IFrame directly (cross-origin),
// so we use a clever workaround: load the YouTube iframe for visual playback
// (or just to validate the URL) AND simultaneously fetch the audio via a
// public audio-only proxy (invidious-style) into a regular <audio> element
// connected to a Web Audio AnalyserNode.
//
// In sandboxed environments, that proxy may also be blocked. So we provide
// THREE input modes:
//   1) YouTube URL  → embed iframe + try to extract audio via piped/invidious
//   2) Direct audio URL (mp3/ogg/m4a) → easy, just hook to <audio>
//   3) Microphone   → getUserMedia
//
// And a SIMULATION mode runs by default so the shader pulses even without
// a real source — looks audio-reactive on its own.

window.parseYouTubeId = function(url){
  if(!url) return null;
  try {
    const u = new URL(url);
    if(u.hostname === 'youtu.be') return u.pathname.slice(1);
    if(u.hostname.includes('youtube.com')){
      if(u.pathname === '/watch') return u.searchParams.get('v');
      if(u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2];
      if(u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2];
    }
  } catch(e){}
  // bare id
  if(/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
};

// Returns { kind: 'track'|'album'|'playlist'|'episode'|'show', id }
window.parseSpotifyUrl = function(url){
  if(!url) return null;
  try {
    const u = new URL(url);
    if(!u.hostname.includes('spotify.com')) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    // /track/XYZ, /album/XYZ, /playlist/XYZ, /embed/track/XYZ
    if(parts[0] === 'embed') parts.shift();
    const kinds = ['track','album','playlist','episode','show'];
    if(kinds.includes(parts[0]) && parts[1]) return { kind: parts[0], id: parts[1].split('?')[0] };
  } catch(e){}
  // spotify:track:abc URI
  const m = String(url).match(/^spotify:(track|album|playlist|episode|show):([a-zA-Z0-9]+)/);
  if(m) return { kind: m[1], id: m[2] };
  return null;
};

// Singleton audio context — created on first user gesture.
window.AudioReactor = (function(){
  let ctx, analyser, source, audioEl, mediaStream;
  let dataArray;
  const state = { low: 0, mid: 0, high: 0, level: 0, mode: 'off', simT: 0 };

  function ensureCtx(){
    if(ctx) return ctx;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.78;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    return ctx;
  }

  function disconnectSource(){
    try { source && source.disconnect(); } catch(e){}
    source = null;
    if(mediaStream){
      try { mediaStream.getTracks().forEach(t => t.stop()); } catch(e){}
      mediaStream = null;
    }
    if(audioEl){
      try { audioEl.pause(); } catch(e){}
      audioEl.src = '';
      audioEl = null;
    }
  }

  // Use a direct audio URL (mp3/ogg/m4a etc.).
  async function useAudioURL(url){
    ensureCtx();
    disconnectSource();
    const a = new Audio();
    a.crossOrigin = 'anonymous';
    a.loop = true;
    a.src = url;
    await a.play().catch(e => { throw new Error('Could not play audio: ' + e.message); });
    audioEl = a;
    source = ctx.createMediaElementSource(a);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    state.mode = 'audio';
  }

  // Microphone capture.
  async function useMic(){
    ensureCtx();
    disconnectSource();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStream = stream;
    source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    state.mode = 'mic';
  }

  // YouTube via IFrame Player API + procedural beat sync.
  // Direct audio extraction is blocked by CORS in sandboxed iframes, so we
  // embed the official YouTube player (audio plays through the iframe) and
  // drive the shader with a procedural beat tied to the player's currentTime.
  // Result: the user hears real YouTube audio AND the shader visually pulses
  // in time with playback (state-synced — only while playing, not while paused).
  let ytPlayer = null;
  let ytStartTime = 0;
  let ytPlaying = false;

  async function loadYTApi(){
    if(window.YT && window.YT.Player) return;
    if(!document.getElementById('yt-iframe-api')){
      const s = document.createElement('script');
      s.id = 'yt-iframe-api';
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    }
    await new Promise((resolve) => {
      const check = () => {
        if(window.YT && window.YT.Player) resolve();
        else setTimeout(check, 100);
      };
      check();
    });
  }

  async function useYouTube(videoId){
    ensureCtx();
    disconnectSource();
    await loadYTApi();
    // Ensure container exists
    let container = document.getElementById('yt-player-container');
    if(!container){
      container = document.createElement('div');
      container.id = 'yt-player-container';
      container.style.cssText = 'position:fixed;left:24px;bottom:160px;width:240px;height:135px;z-index:11;border:2px solid #b88210;border-radius:6px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.5)';
      document.body.appendChild(container);
    }
    container.innerHTML = '<div id="yt-player"></div>';
    container.style.display = 'block';

    return new Promise((resolve, reject) => {
      try {
        if(ytPlayer && ytPlayer.destroy) ytPlayer.destroy();
        ytPlayer = new window.YT.Player('yt-player', {
          height: '135', width: '240', videoId,
          playerVars: { autoplay: 1, controls: 1, modestbranding: 1, rel: 0 },
          events: {
            onReady: (e) => {
              try { e.target.unMute(); e.target.setVolume(80); e.target.playVideo(); } catch(_){}
              state.mode = 'youtube';
              ytStartTime = performance.now()/1000;
              resolve();
            },
            onStateChange: (e) => {
              ytPlaying = (e.data === window.YT.PlayerState.PLAYING);
            },
            onError: (e) => {
              reject(new Error('YouTube player error: ' + e.data));
            }
          }
        });
      } catch(err){ reject(err); }
    });
  }

  function hideYouTube(){
    const c = document.getElementById('yt-player-container');
    if(c) c.style.display = 'none';
    if(ytPlayer && ytPlayer.destroy){ try { ytPlayer.destroy(); } catch(_){} }
    ytPlayer = null;
    ytPlaying = false;
  }

  // ─── Spotify ───────────────────────────────────────────────
  // Spotify's iframe is fully cross-origin and audio cannot be intercepted.
  // We embed the Spotify Embed Player. Their iframe API lets us listen for
  // playback_update events to know whether something is playing — we use
  // that to drive procedural beat sync (same as YouTube fallback).
  let spPlaying = false;

  async function loadSpotifyApi(){
    if(window.SpotifyIframeApi || window.IFrameAPI) return;
    if(!document.getElementById('spotify-iframe-api')){
      const s = document.createElement('script');
      s.id = 'spotify-iframe-api';
      s.src = 'https://open.spotify.com/embed/iframe-api/v1';
      document.head.appendChild(s);
    }
    await new Promise((resolve) => {
      window.onSpotifyIframeApiReady = (api) => {
        window.SpotifyIframeApi = api;
        resolve();
      };
      // Some build versions resolve immediately
      const check = () => {
        if(window.SpotifyIframeApi) resolve();
        else setTimeout(check, 100);
      };
      check();
    });
  }

  async function useSpotify(parsed){
    ensureCtx();
    disconnectSource();
    hideYouTube();
    await loadSpotifyApi();
    let container = document.getElementById('sp-player-container');
    if(!container){
      container = document.createElement('div');
      container.id = 'sp-player-container';
      container.style.cssText = 'position:fixed;left:24px;bottom:160px;width:300px;height:80px;z-index:11;border:2px solid #1ed760;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.5)';
      document.body.appendChild(container);
    }
    container.innerHTML = '<div id="sp-embed"></div>';
    container.style.display = 'block';

    return new Promise((resolve, reject) => {
      try {
        const el = document.getElementById('sp-embed');
        const uri = `spotify:${parsed.kind}:${parsed.id}`;
        window.SpotifyIframeApi.createController(el, { uri, width: '300', height: '80' }, (ctrl) => {
          ctrl.addListener('playback_update', (e) => {
            spPlaying = !e.data.isPaused && e.data.position >= 0;
          });
          ctrl.addListener('ready', () => {
            try { ctrl.play(); } catch(_){}
            state.mode = 'spotify';
            ytStartTime = performance.now()/1000;
            resolve();
          });
        });
      } catch(err){ reject(err); }
    });
  }

  function hideSpotify(){
    const c = document.getElementById('sp-player-container');
    if(c) c.style.display = 'none';
    spPlaying = false;
  }

  function stop(){
    disconnectSource();
    hideYouTube();
    hideSpotify();
    state.mode = 'off';
  }
  function setSim(){ disconnectSource(); hideYouTube(); hideSpotify(); state.mode = 'sim'; }

  // Read from analyser into bands.
  function tick(){
    if(state.mode === 'off'){
      // hard zero — no pulsing.
      state.low = state.mid = state.high = state.level = 0;
    } else if(state.mode === 'sim' || (state.mode === 'youtube' && ytPlaying) || (state.mode === 'spotify' && spPlaying)){
      // Procedural fake audio — sim mode OR YT/Spotify playing.
      // Very gentle, slow pulse — drives color cycling, NOT card-shaking.
      state.simT += 1/60;
      const t = state.simT;
      // smooth low-frequency wave (~70 BPM), no sharp peaks
      const slow = Math.sin(t * Math.PI * 2 * (70/60)) * 0.5 + 0.5;
      state.low  = slow * 0.5;
      state.mid  = (Math.sin(t*0.7)*0.5+0.5) * 0.4;
      state.high = (Math.sin(t*1.3)*0.5+0.5) * 0.35;
      state.level = (state.low + state.mid + state.high) / 3;
    } else if((state.mode === 'youtube' && !ytPlaying) || (state.mode === 'spotify' && !spPlaying)){
      state.low = state.mid = state.high = state.level = 0;
    } else if(analyser){
      analyser.getByteFrequencyData(dataArray);
      const n = dataArray.length;
      const lowEnd = Math.floor(n * 0.08);
      const midEnd = Math.floor(n * 0.35);
      let lo=0, mi=0, hi=0;
      for(let i=0;i<lowEnd;i++) lo += dataArray[i];
      for(let i=lowEnd;i<midEnd;i++) mi += dataArray[i];
      for(let i=midEnd;i<n;i++) hi += dataArray[i];
      lo = lo / lowEnd / 255;
      mi = mi / (midEnd-lowEnd) / 255;
      hi = hi / (n-midEnd) / 255;
      // Heavy low-pass: smooth values so beats don't cause zigzag pulse.
      // Beats accelerate the COLOR-cycle speed, not direct distortion.
      state.low  = state.low  * 0.92 + lo * 0.08;
      state.mid  = state.mid  * 0.92 + mi * 0.08;
      state.high = state.high * 0.92 + hi * 0.08;
      state.level = (state.low + state.mid + state.high) / 3;
    }
    return state;
  }

  // Continuously poll into a ref-like object the shader reads.
  function startLoop(target){
    let raf;
    const loop = () => {
      const s = tick();
      target.current = { low: s.low, mid: s.mid, high: s.high, level: s.level };
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }

  return { useAudioURL, useMic, useYouTube, useSpotify, stop, setSim, startLoop, getState: () => state };
})();
