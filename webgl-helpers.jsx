// Shared WebGL helpers + ShaderBackground component + ImageProcessor utility.

window.makeGL = function(canvas, opts){
  const gl = canvas.getContext('webgl2', Object.assign({ premultipliedAlpha: false, antialias: false }, opts || {}));
  if(!gl){
    // Show a user-friendly fallback instead of crashing
    const root = document.getElementById('root');
    if(root && !document.getElementById('webgl-fallback')){
      const msg = document.createElement('div');
      msg.id = 'webgl-fallback';
      msg.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;background:#0a0810;color:#f3ead4;font-family:monospace;text-align:center;padding:24px;z-index:9999';
      msg.innerHTML = '<div style="font-size:48px">✦</div><h2 style="margin:0;font-family:serif">WebGL2 Required</h2><p style="opacity:0.6;max-width:400px">Arcanum Card Forge needs WebGL2 to render shaders and effects. Please try a modern browser (Chrome, Firefox, Edge) or enable hardware acceleration in your browser settings.</p>';
      document.body.appendChild(msg);
    }
    throw new Error('WebGL2 not available — please use a modern browser with hardware acceleration enabled.');
  }
  return gl;
};

window.compileShader = function(gl, src, type){
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
    const log = gl.getShaderInfoLog(s);
    console.error('Shader compile error:', log, src);
    throw new Error(log);
  }
  return s;
};

window.makeProgram = function(gl, vsSrc, fsSrc){
  const vs = compileShader(gl, vsSrc, gl.VERTEX_SHADER);
  const fs = compileShader(gl, fsSrc, gl.FRAGMENT_SHADER);
  const p = gl.createProgram();
  gl.attachShader(p, vs); gl.attachShader(p, fs);
  gl.bindAttribLocation(p, 0, 'a_pos');
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p, gl.LINK_STATUS)){
    throw new Error(gl.getProgramInfoLog(p));
  }
  return p;
};

window.makeQuad = function(gl){
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return vao;
};

window.hexToRgb01 = function(hex){
  const h = hex.replace('#','');
  const n = parseInt(h.length === 3 ? h.split('').map(c=>c+c).join('') : h, 16);
  return [((n>>16)&255)/255, ((n>>8)&255)/255, (n&255)/255];
};

// ─────────────────────────────────────────────────────────────────────────
// ShaderBackground — a fullscreen WebGL2 canvas running the bg shader.
// ─────────────────────────────────────────────────────────────────────────
function ShaderBackground({ mode, intensity, colorA, colorB, colorC, audioRef, audioGain }){
  const canvasRef = React.useRef(null);
  const stateRef = React.useRef({ gl: null, prog: null, vao: null, uniforms: {} });
  const propsRef = React.useRef({ mode, intensity, colorA, colorB, colorC, audioRef, audioGain });
  propsRef.current = { mode, intensity, colorA, colorB, colorC, audioRef, audioGain };

  React.useEffect(() => {
    const cv = canvasRef.current;
    const gl = makeGL(cv);
    const prog = makeProgram(gl, BG_VERTEX_SHADER, BG_FRAGMENT_SHADER);
    const vao = makeQuad(gl);
    const u = {
      time: gl.getUniformLocation(prog, 'u_time'),
      res:  gl.getUniformLocation(prog, 'u_resolution'),
      mode: gl.getUniformLocation(prog, 'u_mode'),
      intensity: gl.getUniformLocation(prog, 'u_intensity'),
      colorA: gl.getUniformLocation(prog, 'u_colorA'),
      colorB: gl.getUniformLocation(prog, 'u_colorB'),
      colorC: gl.getUniformLocation(prog, 'u_colorC'),
      aLow: gl.getUniformLocation(prog, 'u_audioLow'),
      aMid: gl.getUniformLocation(prog, 'u_audioMid'),
      aHigh: gl.getUniformLocation(prog, 'u_audioHigh'),
      aLevel: gl.getUniformLocation(prog, 'u_audioLevel'),
      aGain: gl.getUniformLocation(prog, 'u_audioGain'),
    };
    stateRef.current = { gl, prog, vao, uniforms: u };

    let raf = 0;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor(cv.clientWidth * dpr);
      const h = Math.floor(cv.clientHeight * dpr);
      if(cv.width !== w || cv.height !== h){
        cv.width = w; cv.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    resize();

    const render = () => {
      const t = (performance.now() - start) / 1000;
      const p = propsRef.current;
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.uniform1f(u.time, t);
      gl.uniform2f(u.res, cv.width, cv.height);
      gl.uniform1i(u.mode, p.mode|0);
      gl.uniform1f(u.intensity, p.intensity);
      gl.uniform3f(u.colorA, ...hexToRgb01(p.colorA));
      gl.uniform3f(u.colorB, ...hexToRgb01(p.colorB));
      gl.uniform3f(u.colorC, ...hexToRgb01(p.colorC));
      const a = p.audioRef && p.audioRef.current ? p.audioRef.current : { low:0, mid:0, high:0, level:0 };
      gl.uniform1f(u.aLow, a.low);
      gl.uniform1f(u.aMid, a.mid);
      gl.uniform1f(u.aHigh, a.high);
      gl.uniform1f(u.aLevel, a.level);
      gl.uniform1f(u.aGain, p.audioGain == null ? 1.0 : p.audioGain);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    };
    render();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position:'fixed', inset:0, width:'100%', height:'100%',
      zIndex:0, display:'block'
    }} />
  );
}
window.ShaderBackground = ShaderBackground;

// ─────────────────────────────────────────────────────────────────────────
// processImage — singleton WebGL2 context for image processing.
// Creating a new context per call eventually exhausts the browser's GPU
// context limit (~16) and freezes the page. Reuse one resizable canvas.
// ─────────────────────────────────────────────────────────────────────────
let __imgGL = null;
function getImgGL(){
  if(__imgGL) return __imgGL;
  const cv = document.createElement('canvas');
  cv.width = 320; cv.height = 440;
  const gl = makeGL(cv);
  const prog = makeProgram(gl, IMG_VERTEX_SHADER, IMG_FRAGMENT_SHADER);
  const vao = makeQuad(gl);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  __imgGL = { cv, gl, prog, vao, tex };
  return __imgGL;
}
window.processImage = function(srcImage, opts){
  const { pixelSize=8, levels=4, dither=1, hueShift=0, saturation=1, contrast=1, palette=0,
          customPalette=['#000000','#ffffff'], targetW=320, targetH=440 } = opts;
  const ctx = getImgGL();
  const { cv, gl, prog, vao, tex } = ctx;
  if(cv.width !== targetW || cv.height !== targetH){
    cv.width = targetW; cv.height = targetH;
  }
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcImage);

  gl.viewport(0, 0, targetW, targetH);
  gl.useProgram(prog);
  gl.bindVertexArray(vao);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform1i(gl.getUniformLocation(prog,'u_tex'), 0);
  gl.uniform2f(gl.getUniformLocation(prog,'u_texSize'), srcImage.width, srcImage.height);
  gl.uniform2f(gl.getUniformLocation(prog,'u_resolution'), targetW, targetH);
  gl.uniform1f(gl.getUniformLocation(prog,'u_pixelSize'), pixelSize);
  gl.uniform1i(gl.getUniformLocation(prog,'u_levels'), levels);
  gl.uniform1i(gl.getUniformLocation(prog,'u_dither'), dither);
  gl.uniform1f(gl.getUniformLocation(prog,'u_hueShift'), hueShift);
  gl.uniform1f(gl.getUniformLocation(prog,'u_saturation'), saturation);
  gl.uniform1f(gl.getUniformLocation(prog,'u_contrast'), contrast);
  gl.uniform1i(gl.getUniformLocation(prog,'u_palette'), palette);
  const cp = (customPalette || []).slice(0, 8);
  while(cp.length < 8) cp.push('#000000');
  const flat = new Float32Array(8*3);
  for(let i=0;i<8;i++){
    const [r,g,b] = hexToRgb01(cp[i]);
    flat[i*3] = r; flat[i*3+1] = g; flat[i*3+2] = b;
  }
  gl.uniform3fv(gl.getUniformLocation(prog,'u_customPal'), flat);
  gl.uniform1i(gl.getUniformLocation(prog,'u_customCount'), Math.max(2, Math.min(8, (customPalette||[]).length)));
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return cv.toDataURL('image/png');
};
