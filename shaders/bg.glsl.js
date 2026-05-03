// Background shader — psychedelic warped grid + plasma waves
// Inspired by retro RPG/arcade battle backgrounds, but original.
window.BG_VERTEX_SHADER = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main(){
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

window.BG_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform float u_time;
uniform vec2  u_resolution;
uniform int   u_mode;        // 0 plasma, 1 cosmic, 2 grid, 3 liquid
uniform float u_intensity;   // 0..2
uniform float u_audioLow;    // 0..1 bass
uniform float u_audioMid;    // 0..1 mids
uniform float u_audioHigh;   // 0..1 highs
uniform float u_audioLevel;  // 0..1 overall
uniform float u_audioGain;   // multiplier for audio reactivity
uniform vec3  u_colorA;
uniform vec3  u_colorB;
uniform vec3  u_colorC;

#define PI 3.14159265

mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}

float fbm(vec2 p){
  float v=0.0, a=0.5;
  for(int i=0;i<5;i++){ v += a*noise(p); p*=2.02; a*=0.5; }
  return v;
}

// Mode 0: plasma waves with warped checkerboard
vec3 modePlasma(vec2 uv, float t){
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= u_resolution.x / u_resolution.y;
  // warp
  float w1 = sin(p.y*3.0 + t*0.6) * 0.25;
  float w2 = cos(p.x*2.5 - t*0.4) * 0.25;
  p.x += w1 * u_intensity;
  p.y += w2 * u_intensity;
  // big plasma
  float v = sin(p.x*4.0 + t)
          + sin(p.y*4.0 + t*1.3)
          + sin((p.x+p.y)*3.0 + t*0.7)
          + sin(length(p)*6.0 - t*1.2);
  v = v / 4.0;
  // checker layer warped
  vec2 cp = p * 4.0 + vec2(sin(t*0.3), cos(t*0.4)) * 0.5;
  cp.x += sin(cp.y*1.2 + t*0.5) * 0.6 * u_intensity;
  float ch = step(0.0, sin(cp.x*PI) * sin(cp.y*PI));
  vec3 col = mix(u_colorA, u_colorB, smoothstep(-0.5, 0.5, v));
  col = mix(col, u_colorC, ch * 0.18);
  return col;
}

// Mode 1: cosmic tunnel / starfield warp
vec3 modeCosmic(vec2 uv, float t){
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= u_resolution.x / u_resolution.y;
  float r = length(p);
  float a = atan(p.y, p.x);
  // tunnel rings
  float rings = sin(8.0/(r+0.2) - t*1.5);
  // spirals
  float spiral = sin(a*6.0 + 4.0/(r+0.1) + t);
  float v = rings*0.5 + spiral*0.4;
  // stars
  vec2 sp = p * 8.0;
  sp = rot(t*0.05) * sp;
  float stars = 0.0;
  for(int i=0;i<3;i++){
    float fi = float(i);
    vec2 ip = floor(sp + fi*7.0);
    vec2 fp = fract(sp + fi*7.0);
    float h = hash(ip);
    if(h > 0.985){
      float d = length(fp - 0.5);
      stars += smoothstep(0.05, 0.0, d) * (0.6 + 0.4*sin(t*3.0 + h*30.0));
    }
    sp *= 1.7;
  }
  vec3 col = mix(u_colorA, u_colorB, smoothstep(-1.0, 1.0, v * u_intensity));
  col += u_colorC * stars;
  // vignette
  col *= 1.0 - smoothstep(0.7, 1.6, r) * 0.6;
  return col;
}

// Mode 2: pulsing geometric grid
vec3 modeGrid(vec2 uv, float t){
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= u_resolution.x / u_resolution.y;
  // perspective-ish warp
  p.y += sin(p.x*2.0 + t) * 0.15 * u_intensity;
  vec2 gp = p * 8.0;
  gp += vec2(t*0.5, sin(t*0.3)*2.0);
  vec2 gf = abs(fract(gp) - 0.5);
  float line = 1.0 - smoothstep(0.0, 0.06, min(gf.x, gf.y));
  // pulses
  float pulse = sin(length(p)*4.0 - t*2.0) * 0.5 + 0.5;
  vec3 base = mix(u_colorA, u_colorB, pulse);
  vec3 col = mix(base, u_colorC, line * (0.5 + 0.5*pulse));
  // diagonal streaks
  float streak = sin((p.x+p.y)*10.0 + t*4.0);
  col += u_colorC * 0.05 * streak;
  return col;
}

// Mode 3: liquid blobs
vec3 modeLiquid(vec2 uv, float t){
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= u_resolution.x / u_resolution.y;
  vec2 q = p + vec2(fbm(p*1.5 + t*0.2), fbm(p*1.5 - t*0.15)) * u_intensity;
  float v = fbm(q*2.0 + t*0.1);
  float bands = sin(v*PI*4.0 + t);
  vec3 col = mix(u_colorA, u_colorB, smoothstep(0.3, 0.7, v));
  col = mix(col, u_colorC, smoothstep(0.6, 0.95, abs(bands)));
  return col;
}

// HSV helpers for hue-shift
vec3 rgb2hsv(vec3 c){
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c){
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main(){
  vec2 uv = v_uv;
  // Audio drives TIME (speed) and HUE (color shift) — never zoom/scale.
  float aLow  = u_audioLow  * u_audioGain;
  float aMid  = u_audioMid  * u_audioGain;
  float aHigh = u_audioHigh * u_audioGain;
  float aLvl  = u_audioLevel * u_audioGain;
  // Time runs at base rate; audio energy SLIGHTLY speeds the color cycle.
  // No direct distortion / zoom from audio — colors and hue only.
  float colorSpeed = 1.0 + aLow * 0.4 + aMid * 0.25;
  float t = u_time;
  vec3 col;
  if(u_mode == 0) col = modePlasma(uv, t);
  else if(u_mode == 1) col = modeCosmic(uv, t);
  else if(u_mode == 2) col = modeGrid(uv, t);
  else col = modeLiquid(uv, t);

  // Hue shift cycles slowly with time, accelerated by beat energy — no zigzag.
  vec3 hsv = rgb2hsv(col);
  hsv.x = fract(hsv.x + u_time * 0.02 * colorSpeed + aLvl * 0.08);
  col = hsv2rgb(hsv);

  // scanlines
  float scan = sin(uv.y * u_resolution.y * 1.5) * 0.04;
  col -= scan;

  // chromatic vignette
  float r = distance(uv, vec2(0.5));
  col *= 1.0 - smoothstep(0.5, 1.1, r) * 0.5;

  // film grain
  float g = (hash(uv*u_resolution + u_time) - 0.5) * 0.05;
  col += g;

  fragColor = vec4(col, 1.0);
}`;
