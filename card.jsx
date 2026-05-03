// ArcanumCard — the actual card with effects.
// Effects layer on top of base art using CSS blend modes + an animated SVG sheen.

const SUITS = {
  spade:   { glyph: '♠', color: '#0a0a0a', name: 'Spade' },
  heart:   { glyph: '♥', color: '#c81d3a', name: 'Heart' },
  club:    { glyph: '♣', color: '#0a0a0a', name: 'Club' },
  diamond: { glyph: '♦', color: '#c81d3a', name: 'Diamond' },
  star:    { glyph: '✦', color: '#b88210', name: 'Star' },
  moon:    { glyph: '☾', color: '#3a4a8a', name: 'Moon' },
  eye:     { glyph: '◉', color: '#7a2a8a', name: 'Eye' },
  bolt:    { glyph: '⚡', color: '#d4a015', name: 'Bolt' },
};
window.SUITS = SUITS;

window.SEALS = [
  { id: 'none',    label: 'None' },
  { id: 'wax',     label: 'Red Wax' },
  { id: 'gold',    label: 'Gold Stamp' },
  { id: 'ink',     label: 'Ink Sigil' },
  { id: 'holo',    label: 'Holo Foil' },
  { id: 'cracked', label: 'Cracked Mint' },
];
window.SEAL_GLYPHS = {
  wax: '✦', gold: '★', ink: '◉', holo: '✸', cracked: 'M',
};
window.SEAL_POSITIONS = [
  { id: 'center', label: 'Center' },
  { id: 'tl', label: 'Top-Left' },
  { id: 'tr', label: 'Top-Right' },
  { id: 'bl', label: 'Bottom-Left' },
  { id: 'br', label: 'Bottom-Right' },
];

// A subtle warm/cold pixel-noise pattern as default art — better than empty bg.
const PATTERN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'>
<rect width='8' height='8' fill='%23f3ead4'/>
<rect x='0' y='0' width='1' height='1' fill='%23e8dcb6'/>
<rect x='3' y='2' width='1' height='1' fill='%23e8dcb6'/>
<rect x='6' y='5' width='1' height='1' fill='%23e8dcb6'/>
<rect x='2' y='6' width='1' height='1' fill='%23e8dcb6'/>
</svg>`;

function ArcanumCard({ data, processedImage, effects, tilt = true, onTilt }){
  const cardRef = React.useRef(null);
  const [t, setT] = React.useState({ rx: 0, ry: 0, mx: 50, my: 50, active: false });

  const onMove = (e) => {
    if(!tilt) return;
    const r = cardRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = (clientX - r.left) / r.width;
    const y = (clientY - r.top) / r.height;
    const rx = (0.5 - y) * 18;
    const ry = (x - 0.5) * 18;
    setT({ rx, ry, mx: x*100, my: y*100, active: true });
    onTilt && onTilt({ rx, ry, mx: x*100, my: y*100 });
  };
  const onLeave = () => {
    setT({ rx: 0, ry: 0, mx: 50, my: 50, active: false });
    onTilt && onTilt({ rx: 0, ry: 0, mx: 50, my: 50 });
  };

  const suit = SUITS[data.suit] || SUITS.spade;
  const suitColor = data.kind === 'tarot' ? '#2a2418' : suit.color;
  // per-element overrides (fall back to defaults)
  const colRank = data.colorRank || suitColor;
  const colSuit = data.colorSuit || suitColor;
  const colTitle = data.colorTitle || '#1a1812';
  const colFlavor = data.colorFlavor || 'rgba(26,24,18,0.65)';
  const colValueBg = data.colorValueBg || (data.frameColor || '#2a2418');
  const colValueFg = data.colorValueFg || '#b88210';
  const colTypeBg = data.colorTypeBg || (data.frameColor || '#2a2418');
  const colTypeFg = data.colorTypeFg || (data.bgColor || '#f3ead4');

  // Style for outer 3D wrapper
  const wrapperStyle = {
    transform: `perspective(900px) rotateX(${t.rx}deg) rotateY(${t.ry}deg)`,
    transition: t.active ? 'transform 60ms linear' : 'transform 350ms cubic-bezier(.2,.7,.3,1)',
  };

  // Effects layers config
  const eff = effects || {};

  return (
    <div className="card-wrap" style={wrapperStyle}
         onMouseMove={onMove} onMouseLeave={onLeave}
         onTouchMove={onMove} onTouchEnd={onLeave}
         ref={cardRef}>
      <div className="card" data-active={t.active ? '1':'0'}>
        {/* Base — frame + content */}
        {(data.bgType || 'paper') === 'paper' ? (
          <div className="card-bg" style={{
            background: data.bgColor || '#f3ead4',
            backgroundImage: `url("data:image/svg+xml;utf8,${PATTERN_SVG}")`,
            backgroundSize: '24px 24px',
          }}/>
        ) : (
          <CardBackground type={data.bgType} color1={data.bgColor || '#f3ead4'} color2={data.bgColor2 || '#3a1454'} angle={data.bgAngle ?? 135}/>
        )}

        {/* Beveled inner frame */}
        <div className="card-frame" style={{ borderColor: data.frameColor || '#2a2418' }}>
          <div className="card-frame-inner" />
        </div>

        {/* Top-left rank/value */}
        <div className="card-corner card-corner-tl" style={{ color: colRank }}>
          <div className="card-rank">{data.rank || ''}</div>
          {data.kind !== 'tarot' && data.suit && !data.suitImage && <div className="card-suit-sm" style={{ color: colSuit }}>{suit.glyph}</div>}
        </div>
        {/* Bottom-right rank rotated */}
        <div className="card-corner card-corner-br" style={{ color: colRank }}>
          <div className="card-rank">{data.rank || ''}</div>
          {data.kind !== 'tarot' && data.suit && !data.suitImage && <div className="card-suit-sm" style={{ color: colSuit }}>{suit.glyph}</div>}
        </div>

        {/* Center area: image OR custom sigil image OR big suit OR special title */}
        <div className="card-center">
          {processedImage ? (
            <div className="card-art">
              <img src={processedImage} alt="" />
            </div>
          ) : data.suitImage ? (
            <div className="card-bigsuit-img">
              <img src={data.suitImage} alt="" />
            </div>
          ) : data.kind === 'tarot' ? (
            <div className="card-tarot">
              <div className="card-tarot-roman" style={{ color: colTitle }}>{data.roman || 'O'}</div>
              {data.suit && (
                <div className="card-tarot-glyph" style={{ color: colSuit }}>
                  {suit.glyph}
                </div>
              )}
            </div>
          ) : data.suit ? (
            <div className="card-bigsuit" style={{ color: colSuit }}>
              {suit.glyph}
            </div>
          ) : (
            // No suit, no image — center the title/flavor in the middle of the card
            (data.title || data.flavor) && (
              <div className="card-textonly">
                {data.title && <div className="card-textonly-title" style={{ color: colTitle }}>{data.title}</div>}
                {data.flavor && <div className="card-textonly-flavor" style={{ color: colFlavor }}>{data.flavor}</div>}
              </div>
            )
          )}
        </div>

        {/* Title + flavor below image — only when there IS center content (image/suit/sigil) */}
        {(data.title || data.flavor) && (processedImage || data.suitImage || data.suit || data.kind === 'tarot') && (
          <div className="card-meta">
            {data.title && <div className="card-title" style={{ color: colTitle }}>{data.title}</div>}
            {data.flavor && <div className="card-flavor" style={{ color: colFlavor }}>{data.flavor}</div>}
          </div>
        )}

        {/* Stat bar — bottom row of icon+value pairs */}
        {Array.isArray(data.stats) && data.stats.some(s => s && (s.icon || s.value)) && (
          <div className="card-stats" style={{ color: data.colorStats || colTitle }}>
            {data.stats.filter(s => s && (s.icon || s.value)).map((s, i) => (
              <div key={i} className="card-stat">
                {s.icon && <span className="card-stat-icon">{s.icon}</span>}
                {s.value && <span className="card-stat-value">{s.value}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Big number badge */}
        {data.value && (
          <div className="card-value" style={{
            background: colValueBg, color: colValueFg,
            borderColor: data.bgColor || '#f3ead4',
          }}>
            <span>{data.value}</span>
          </div>
        )}

        {/* Type label */}
        {data.type && (
          <div className="card-type" style={{ background: colTypeBg, color: colTypeFg }}>{data.type}</div>
        )}

        {/* Seal / stamp removed */}

        {/* ─── EFFECTS LAYERS (stacked above content) ─── */}

        {/* FOIL — moving silver sheen + diagonal stripes */}
        {eff.foil && (
          <div className="fx fx-foil" style={{
            '--mx': `${t.mx}%`, '--my': `${t.my}%`,
          }} />
        )}

        {/* HOLOGRAPHIC — full-card rainbow that shifts with tilt */}
        {eff.holo && (
          <div className="fx fx-holo" style={{
            '--mx': `${t.mx}%`, '--my': `${t.my}%`,
            backgroundPosition: `${t.mx}% ${t.my}%`,
          }} />
        )}

        {/* POLYCHROME — color cycling animated overlay */}
        {eff.polychrome && (
          <div className="fx fx-polychrome" />
        )}

        {/* NEGATIVE */}
        {eff.negative && <div className="fx fx-negative" />}

        {/* GLITCH */}
        {eff.glitch && <div className="fx fx-glitch" />}

        {/* BURNING */}
        {eff.burning && (
          <div className="fx fx-burning">
            <div className="fx-burning-ember" />
          </div>
        )}

        {/* FROZEN */}
        {eff.frozen && <div className="fx fx-frozen" />}

        {/* GOLD */}
        {eff.gold && <div className="fx fx-gold" />}

        {/* Edge highlight (always on for depth) */}
        <div className="fx fx-edge" style={{
          background: `radial-gradient(120% 120% at ${t.mx}% ${t.my}%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 45%)`,
        }} />

        {/* Glossy frame edge */}
        <div className="card-gloss" />
      </div>
    </div>
  );
}
window.ArcanumCard = ArcanumCard;
