// Image processing shader — pixelation + palette quantization + dithering
window.IMG_VERTEX_SHADER = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main(){
  v_uv = vec2(a_pos.x, -a_pos.y) * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

window.IMG_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_tex;
uniform vec2  u_texSize;
uniform vec2  u_resolution;
uniform float u_pixelSize;     // pixels per cell
uniform int   u_levels;        // colors per channel (2..16)
uniform int   u_dither;        // 0 none, 1 bayer 4x4, 2 bayer 8x8
uniform float u_hueShift;      // -1..1
uniform float u_saturation;    // 0..2
uniform float u_contrast;      // 0..2
uniform int   u_palette;       // 0 free, 1 gameboy, 2 cga, 3 nes-ish, 4 sunset, 5 custom
uniform vec3  u_customPal[8];  // custom palette colors (used when u_palette == 5)
uniform int   u_customCount;   // number of valid colors in u_customPal (2..8)

const float bayer4[16] = float[16](
  0.0,8.0,2.0,10.0,
  12.0,4.0,14.0,6.0,
  3.0,11.0,1.0,9.0,
  15.0,7.0,13.0,5.0
);

const float bayer8[64] = float[64](
   0.0,32.0, 8.0,40.0, 2.0,34.0,10.0,42.0,
  48.0,16.0,56.0,24.0,50.0,18.0,58.0,26.0,
  12.0,44.0, 4.0,36.0,14.0,46.0, 6.0,38.0,
  60.0,28.0,52.0,20.0,62.0,30.0,54.0,22.0,
   3.0,35.0,11.0,43.0, 1.0,33.0, 9.0,41.0,
  51.0,19.0,59.0,27.0,49.0,17.0,57.0,25.0,
  15.0,47.0, 7.0,39.0,13.0,45.0, 5.0,37.0,
  63.0,31.0,55.0,23.0,61.0,29.0,53.0,21.0
);

vec3 rgb2hsv(vec3 c){
  vec4 K = vec4(0.0,-1.0/3.0,2.0/3.0,-1.0);
  vec4 p = mix(vec4(c.bg,K.wz), vec4(c.gb,K.xy), step(c.b,c.g));
  vec4 q = mix(vec4(p.xyw,c.r), vec4(c.r,p.yzx), step(p.x,c.r));
  float d = q.x - min(q.w,q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w-q.y)/(6.0*d+e)), d/(q.x+e), q.x);
}
vec3 hsv2rgb(vec3 c){
  vec4 K = vec4(1.0,2.0/3.0,1.0/3.0,3.0);
  vec3 p = abs(fract(c.xxx + K.xyz)*6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p-K.xxx,0.0,1.0), c.y);
}

// Fixed palettes
vec3 palettes[5*8] = vec3[](
  // 0 free (unused, marker)
  vec3(0),vec3(0),vec3(0),vec3(0),vec3(0),vec3(0),vec3(0),vec3(0),
  // 1 gameboy (4 colors, repeated)
  vec3(0.06,0.22,0.06), vec3(0.19,0.38,0.19),
  vec3(0.55,0.67,0.06), vec3(0.61,0.74,0.06),
  vec3(0.06,0.22,0.06), vec3(0.19,0.38,0.19),
  vec3(0.55,0.67,0.06), vec3(0.61,0.74,0.06),
  // 2 CGA (4 mag/cyan)
  vec3(0.0,0.0,0.0), vec3(0.0,0.66,0.66),
  vec3(0.66,0.0,0.66), vec3(1.0,1.0,1.0),
  vec3(0.0,0.0,0.0), vec3(0.0,0.66,0.66),
  vec3(0.66,0.0,0.66), vec3(1.0,1.0,1.0),
  // 3 NES-ish (8)
  vec3(0.0,0.0,0.0), vec3(0.16,0.16,0.5),
  vec3(0.7,0.13,0.13), vec3(0.95,0.5,0.18),
  vec3(0.95,0.86,0.4), vec3(0.4,0.78,0.4),
  vec3(0.5,0.85,0.95), vec3(1.0,1.0,1.0),
  // 4 sunset (8)
  vec3(0.08,0.05,0.18), vec3(0.30,0.10,0.35),
  vec3(0.62,0.15,0.40), vec3(0.90,0.30,0.35),
  vec3(0.98,0.55,0.30), vec3(0.99,0.80,0.45),
  vec3(0.99,0.93,0.78), vec3(0.4,0.85,0.95)
);

vec3 nearestInPalette(vec3 c, int palIdx){
  if(palIdx == 5){
    float bestD = 1e9;
    vec3 best = c;
    for(int i=0;i<8;i++){
      if(i >= u_customCount) break;
      vec3 p = u_customPal[i];
      float d = dot(c-p, c-p);
      if(d < bestD){ bestD = d; best = p; }
    }
    return best;
  }
  int base = palIdx * 8;
  float bestD = 1e9;
  vec3 best = c;
  for(int i=0;i<8;i++){
    vec3 p = palettes[base + i];
    float d = dot(c-p, c-p);
    if(d < bestD){ bestD = d; best = p; }
  }
  return best;
}

void main(){
  // pixelate
  vec2 px = max(vec2(1.0), vec2(u_pixelSize));
  vec2 cell = floor(v_uv * u_resolution / px) * px / u_resolution;
  vec2 cellCenter = cell + (px*0.5)/u_resolution;
  // alpha-aware sample (treat low alpha as transparent; checker fallback off)
  vec4 src = texture(u_tex, cellCenter);
  if(src.a < 0.05){
    // transparent — pass through with alpha 0
    fragColor = vec4(0.0);
    return;
  }
  vec3 col = src.rgb;

  // contrast
  col = (col - 0.5) * u_contrast + 0.5;

  // hue/sat
  vec3 hsv = rgb2hsv(clamp(col,0.0,1.0));
  hsv.x = fract(hsv.x + u_hueShift);
  hsv.y = clamp(hsv.y * u_saturation, 0.0, 1.0);
  col = hsv2rgb(hsv);

  // dither offset
  float threshold = 0.5;
  if(u_dither == 1){
    ivec2 p = ivec2(mod(gl_FragCoord.xy, 4.0));
    threshold = bayer4[p.y*4 + p.x] / 16.0;
  } else if(u_dither == 2){
    ivec2 p = ivec2(mod(gl_FragCoord.xy, 8.0));
    threshold = bayer8[p.y*8 + p.x] / 64.0;
  }

  if(u_palette > 0){
    // dither toward nearest palette by perturbing then snapping
    if(u_dither > 0){
      col += (threshold - 0.5) * 0.18;
    }
    col = nearestInPalette(clamp(col,0.0,1.0), u_palette);
  } else {
    // free palette — quantize per channel with optional dither
    float L = float(max(2, u_levels));
    if(u_dither > 0){
      col += (threshold - 0.5) / L;
    }
    col = floor(col * L) / (L - 1.0);
    col = clamp(col, 0.0, 1.0);
  }

  fragColor = vec4(col, 1.0);
}`;
