// CardBackground — solid color or animated shader background for the card face.
// Each background is its own small WebGL2 canvas so the main bg shader doesn't lag.

window.CARD_BG_TYPES = [
  { id: 'paper',   label: 'Paper (default)' },
  { id: 'solid',   label: 'Solid color' },
  { id: 'gradient',label: 'Gradient' },
  { id: 'rare',    label: 'Rare (blue plasma)' },
  { id: 'epic',    label: 'Epic (purple wave)' },
  { id: 'legend',  label: 'Legendary (gold sparkle)' },
  { id: 'mythic',  label: 'Mythic (rainbow)' },
  { id: 'cursed',  label: 'Cursed (black/red)' },
  { id: 'astral',  label: 'Astral (cosmic)' },
  { id: 'burnt',   label: 'Burnt (decaying paper)' },
];

const CARD_BG_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform float u_time;
uniform int   u_kind;
uniform vec3  u_c1;
uniform vec3  u_c2;

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}

void main(){
  vec2 uv = v_uv;
  vec3 col;
  if(u_kind == 0){
    // gradient
    col = mix(u_c1, u_c2, uv.y);
  } else if(u_kind == 1){
    // rare blue plasma
    float v = sin(uv.x*8.0 + u_time) + sin(uv.y*8.0 - u_time*0.7) + sin((uv.x+uv.y)*6.0 + u_time*0.5);
    v = v/3.0;
    col = mix(vec3(0.05,0.1,0.3), vec3(0.3,0.6,1.0), v*0.5+0.5);
    col += vec3(0.1,0.3,0.7) * 0.3;
  } else if(u_kind == 2){
    // epic purple wave
    float w = sin(uv.x*10.0 + u_time*0.8) * 0.5 + 0.5;
    float w2 = sin(uv.y*8.0 - u_time*0.5) * 0.5 + 0.5;
    col = mix(vec3(0.15,0.05,0.25), vec3(0.6,0.2,0.8), w*w2);
    col += vec3(0.4,0.1,0.6) * sin(uv.y*20.0 + u_time)*0.1;
  } else if(u_kind == 3){
    // legendary gold sparkle
    col = mix(vec3(0.4,0.25,0.05), vec3(1.0,0.85,0.3), uv.y*0.5+0.5);
    float n = noise(uv*30.0 + u_time*0.3);
    col += vec3(1.0,0.9,0.5) * pow(n, 8.0) * 1.5;
    float band = sin(uv.x*6.0 + u_time*0.4 + uv.y*3.0)*0.5+0.5;
    col = mix(col, vec3(1.0,0.95,0.6), band*0.2);
  } else if(u_kind == 4){
    // mythic rainbow shimmer
    float a = uv.x + uv.y*0.5 + u_time*0.2;
    col = vec3(
      sin(a*6.28 + 0.0)*0.5+0.5,
      sin(a*6.28 + 2.09)*0.5+0.5,
      sin(a*6.28 + 4.19)*0.5+0.5
    );
    col = mix(vec3(0.7), col, 0.55);
  } else if(u_kind == 5){
    // cursed black/red
    float v = noise(uv*4.0 + u_time*0.1);
    col = mix(vec3(0.05,0.0,0.0), vec3(0.5,0.05,0.05), v);
    float pulse = sin(u_time*1.5)*0.1 + 0.9;
    col *= pulse;
    if(noise(uv*8.0 + u_time*0.2) > 0.75) col += vec3(0.6,0.05,0.05) * 0.4;
  } else if(u_kind == 6){
    // astral cosmic
    vec2 p = (uv - 0.5) * 2.0;
    float r = length(p);
    float a = atan(p.y, p.x);
    col = mix(vec3(0.05,0.02,0.15), vec3(0.2,0.1,0.4), 1.0-r);
    // stars
    vec2 sp = uv*20.0;
    float s = step(0.97, hash(floor(sp)));
    col += vec3(1.0,0.95,0.85) * s * (sin(u_time*2.0 + hash(floor(sp))*30.0)*0.5+0.5);
    col += vec3(0.4,0.2,0.6) * sin(a*4.0 + r*8.0 - u_time)*0.1;
  } else if(u_kind == 7){
    // burnt / decaying paper
    // base: warm aged-paper tone (c1 = paper, c2 = scorch)
    vec3 paper = u_c1;
    vec3 scorch = u_c2;
    float n = noise(uv*8.0);
    float n2 = noise(uv*32.0 + u_time*0.05);
    // distance to nearest edge — for char gradient
    float edgeDist = min(min(uv.x, 1.0-uv.x), min(uv.y, 1.0-uv.y));
    // jagged irregular burn line via fbm-ish noise
    float burn = noise(uv*4.0 + u_time*0.03) * 0.5
               + noise(uv*12.0 - u_time*0.02) * 0.3
               + noise(uv*32.0) * 0.2;
    float charLine = smoothstep(0.10, 0.18, edgeDist + (burn-0.5)*0.18);
    // base paper with stains
    col = paper * (0.85 + 0.15 * n);
    // brown stains
    float stain = smoothstep(0.5, 0.9, noise(uv*6.0 + 7.0));
    col = mix(col, paper*0.55, stain*0.5);
    // dark soot speckles
    float speck = step(0.85, noise(uv*60.0));
    col -= vec3(speck*0.1);
    // char (dark scorch)
    col = mix(scorch * 0.25, col, charLine);
    // ember glow at the burning edge
    float emberZone = smoothstep(0.06, 0.16, edgeDist + (burn-0.5)*0.18) - smoothstep(0.13, 0.20, edgeDist + (burn-0.5)*0.18);
    float flicker = 0.7 + 0.3*sin(u_time*8.0 + uv.x*30.0);
    col += vec3(1.2, 0.5, 0.1) * emberZone * flicker * 1.2;
    // beyond-burn = transparent-like void (very dark)
    float beyond = 1.0 - smoothstep(0.04, 0.08, edgeDist + (burn-0.5)*0.18);
    col = mix(col, vec3(0.02,0.01,0.01), beyond);
  } else {
    // solid
    col = u_c1;
  }
  fragColor = vec4(col, 1.0);
}`;

function CardBackground({ type, color1, color2, angle = 135 }){
  const ref = React.useRef(null);
  const propsRef = React.useRef({ type, color1, color2 });
  propsRef.current = { type, color1, color2 };

  React.useEffect(() => {
    if(type === 'paper' || type === 'solid') return; // CSS-only modes
    const cv = ref.current;
    if(!cv) return;
    const gl = makeGL(cv, { preserveDrawingBuffer: true });
    const prog = makeProgram(gl, BG_VERTEX_SHADER, CARD_BG_FRAG);
    const vao = makeQuad(gl);
    cv.width = 320; cv.height = 440;
    gl.viewport(0, 0, 320, 440);
    let raf, start = performance.now();
    const u = {
      time: gl.getUniformLocation(prog, 'u_time'),
      kind: gl.getUniformLocation(prog, 'u_kind'),
      c1: gl.getUniformLocation(prog, 'u_c1'),
      c2: gl.getUniformLocation(prog, 'u_c2'),
    };
    const KIND_MAP = { gradient:0, rare:1, epic:2, legend:3, mythic:4, cursed:5, astral:6, burnt:7, solid:8 };
    const render = () => {
      const t = (performance.now() - start)/1000;
      const p = propsRef.current;
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.uniform1f(u.time, t);
      gl.uniform1i(u.kind, KIND_MAP[p.type] ?? 0);
      gl.uniform3f(u.c1, ...hexToRgb01(p.color1 || '#3a1454'));
      gl.uniform3f(u.c2, ...hexToRgb01(p.color2 || '#c8324f'));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(raf);
  }, [type]);

  // CSS-only modes (paper/solid/gradient) don't need a canvas.
  if(type === 'paper'){
    return null; // parent renders the paper texture
  }
  if(type === 'solid'){
    return <div style={{position:'absolute',inset:0,background:color1||'#f3ead4',zIndex:0}}/>;
  }
  if(type === 'gradient'){
    return <div style={{position:'absolute',inset:0,zIndex:0,
      background:`linear-gradient(${angle}deg, ${color1||'#f3ead4'} 0%, ${color2||'#3a1454'} 100%)`}}/>;
  }
  return <canvas ref={ref} style={{position:'absolute',inset:0,width:'100%',height:'100%',zIndex:0,display:'block'}}/>;
}
window.CardBackground = CardBackground;
