// Side panel — all card editing controls.

const RANKS_PLAYING = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', '★'];
const TAROT_PRESETS = [
{ roman: '0', title: 'The Wanderer', flavor: 'A step into nothing.' },
{ roman: 'I', title: 'The Maker', flavor: 'Hands that shape the void.' },
{ roman: 'II', title: 'The Oracle', flavor: 'Every silence is an answer.' },
{ roman: 'III', title: 'The Garden', flavor: 'Bloom where you are buried.' },
{ roman: 'IV', title: 'The Throne', flavor: 'Stone weighs the same as crown.' },
{ roman: 'V', title: 'The Tongue', flavor: 'Speak it and it is.' },
{ roman: 'VI', title: 'The Twin', flavor: 'Two shadows, one lamp.' },
{ roman: 'VII', title: 'The Engine', flavor: 'Forward is the only direction.' },
{ roman: 'XIII', title: 'The Threshold', flavor: 'No door is final.' },
{ roman: 'XVIII', title: 'The Beacon', flavor: 'Even moons remember the sun.' }];


const PALETTES = [
{ value: 0, label: 'Free (per-channel quantize)' },
{ value: 1, label: 'Game Boy' },
{ value: 2, label: 'CGA' },
{ value: 3, label: 'NES-ish' },
{ value: 4, label: 'Sunset' },
{ value: 5, label: 'Custom palette ↓' }];


const PALETTE_PRESETS = {
  'Sunset': ['#1a0a2a', '#5a1a4a', '#a82c52', '#e85a4a', '#f5a040', '#ffd870', '#fff5d0', '#7be0e5'],
  'Mono': ['#0a0a0a', '#3a3a3a', '#7a7a7a', '#dadada'],
  'Acid': ['#0a0a30', '#1a4a8a', '#1aaaff', '#7affff', '#aaff5a', '#ffff5a', '#ff5a90', '#ff2030'],
  'Forest': ['#0e1a10', '#234b25', '#3a8a3a', '#7ac070', '#d8e5a0', '#a08050', '#5a3a25'],
  'Crimson': ['#0a0408', '#3a0a18', '#7a1428', '#d22850', '#f55078', '#ffaab0', '#fff0e8']
};
const DITHER = [
{ value: 0, label: 'None' },
{ value: 1, label: '4×4' },
{ value: 2, label: '8×8' }];


function Slider({ label, value, min, max, step, unit, onChange }) {
  return (
    <div className="row">
      <div className="range-row">
        <label>{label}</label>
        <span className="v">{value}{unit || ''}</span>
      </div>
      <input type="range" min={min} max={max} step={step || 1}
      value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>);

}
window.Slider = Slider;

function ToggleChip({ label, on, onClick, color }) {
  return (
    <div className="chip" data-on={on ? '1' : '0'} onClick={onClick}
    style={color && on ? { color } : null}>
      {on && <span className="fx-mini" />}
      {label}
    </div>);

}
window.ToggleChip = ToggleChip;

function CardPanel({ card, setCard, effects, setEffects, processedImage, srcImage,
  setSrcImage, imgOpts, setImgOpts, bgOpts, setBgOpts, onExport,
  audio, setAudio }) {
  const [tab, setTab] = React.useState('content'); // content | effects | image | bg | audio

  const fileRef = React.useRef(null);
  const [drag, setDrag] = React.useState(false);
  const onFile = (file) => {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = (e) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setSrcImage(img);
      img.src = e.target.result;
    };
    fr.readAsDataURL(file);
  };

  const updateCard = (patch) => setCard({ ...card, ...patch });

  return (
    <div className="panel">
      <div className="panel-hd">
        <div>
          <div className="ttl">CARD FORGE</div>
          <div className="sub">v0.3 · sigil engine</div>
        </div>
        <button className="btn" onClick={onExport}>EXPORT</button>
      </div>

      <div style={{ padding: '0 20px' }}>
        <div className="tabs">
          {[['content', 'Content'], ['effects', 'Effects'], ['image', 'Image'], ['bg', 'Stage'], ['audio', 'Audio']].map(([k, l]) =>
          <div key={k} className="tab" data-on={tab === k ? '1' : '0'}
          onClick={() => setTab(k)}>{l}</div>
          )}
        </div>
      </div>

      <div className="panel-body">
        {tab === 'content' && <>
          <div className="section">
            <div className="section-ttl">Mode</div>
            <div className="cols2">
              <button className={'btn ' + (card.kind === 'playing' ? '' : 'secondary')}
              onClick={() => updateCard({ kind: 'playing', rank: 'A' })}>PLAYING</button>
              <button className={'btn ' + (card.kind === 'tarot' ? '' : 'secondary')}
              onClick={() => {
                const t = TAROT_PRESETS[0];
                updateCard({ kind: 'tarot', rank: '', roman: t.roman, title: t.title, flavor: t.flavor });
              }}>SPECIAL</button>
            </div>
          </div>

          {card.kind === 'playing' ?
          <div className="section">
              <div className="section-ttl">Rank</div>
              <div className="ranks">
                {RANKS_PLAYING.map((r) =>
              <div key={r} className="rank-btn" data-on={card.rank === r ? '1' : '0'}
              onClick={() => updateCard({ rank: r })}>{r}</div>
              )}
              </div>
              <div className="row">
                <label>Custom rank text</label>
                <input type="text" value={card.rank || ''} maxLength={6}
                       placeholder="Joker, ∞, etc."
                       onChange={(e) => updateCard({ rank: e.target.value })}/>
              </div>
            </div> :

          <div className="section">
              <div className="section-ttl">Arcana Preset</div>
              <select className="row" value={card.title || ''}
            onChange={(e) => {
              const p = TAROT_PRESETS.find((t) => t.title === e.target.value);
              if (p) updateCard({ roman: p.roman, title: p.title, flavor: p.flavor });
            }}
            style={{
              padding: '7px 9px', background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.12)', color: '#f3ead4',
              fontFamily: 'JetBrains Mono', fontSize: 12, borderRadius: 3
            }}>
                {TAROT_PRESETS.map((p) => <option key={p.title} value={p.title}>{p.roman} · {p.title}</option>)}
              </select>
              <div className="row">
                <label>Roman numeral</label>
                <input type="text" value={card.roman || ''}
              onChange={(e) => updateCard({ roman: e.target.value })} />
              </div>
            </div>
          }

          <div className="section">
            <div className="section-ttl">Suit / Sigil</div>
            <div className="suit-grid" style={{gridTemplateColumns:'repeat(5,1fr)'}}>
              <div className="suit-btn" data-on={!card.suit && !card.suitImage ? '1' : '0'}
                   onClick={() => updateCard({ suit: '', suitImage: null })}
                   style={{fontSize:11,color:'rgba(243,234,212,0.5)'}}>—</div>
              {Object.entries(SUITS).map(([key, s]) =>
              <div key={key} className="suit-btn" data-on={card.suit === key && !card.suitImage ? '1' : '0'}
              onClick={() => updateCard({ suit: key, suitImage: null })}
              style={{ color: s.color }}>{s.glyph}</div>
              )}
            </div>
            <div className="row" style={{marginTop:6}}>
              <label>Or upload custom sigil image</label>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="file" accept="image/*"
                       onChange={(e) => {
                         const f = e.target.files[0];
                         if(!f) return;
                         const fr = new FileReader();
                         fr.onload = (ev) => updateCard({ suitImage: ev.target.result, suit: '' });
                         fr.readAsDataURL(f);
                       }}
                       style={{fontSize:10,color:'rgba(243,234,212,0.7)',flex:1}}/>
                {card.suitImage && (
                  <button className="btn secondary" style={{padding:'6px 8px'}}
                          onClick={() => updateCard({ suitImage: null })}>×</button>
                )}
              </div>
              {card.suitImage && (
                <div className="img-thumb" style={{marginTop:6}}><img src={card.suitImage} alt=""/></div>
              )}
            </div>
          </div>

          <div className="section">
            <div className="section-ttl">Card Background</div>
            <div className="row">
              <select value={card.bgType || 'paper'}
              onChange={(e) => updateCard({ bgType: e.target.value })}
              style={{ padding: '7px 9px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', color: '#f3ead4', fontFamily: 'JetBrains Mono', fontSize: 12, borderRadius: 3 }}>
                {CARD_BG_TYPES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="row-h">
              <div className="row"><label>Color 1</label>
                <input type="color" value={card.bgColor || '#f3ead4'}
                onChange={(e) => updateCard({ bgColor: e.target.value })} />
              </div>
              {(card.bgType === 'gradient' || card.bgType === 'rare' || card.bgType === 'epic' || card.bgType === 'legend' || card.bgType === 'mythic' || card.bgType === 'cursed' || card.bgType === 'astral' || card.bgType === 'burnt') &&
              <div className="row"><label>Color 2</label>
                  <input type="color" value={card.bgColor2 || '#3a1454'}
                onChange={(e) => updateCard({ bgColor2: e.target.value })} />
                </div>
              }
              <div className="row"><label>Frame</label>
                <input type="color" value={card.frameColor || '#2a2418'}
                onChange={(e) => updateCard({ frameColor: e.target.value })} />
              </div>
            </div>
            {card.bgType === 'gradient' &&
            <Slider label="Gradient angle" value={card.bgAngle ?? 135} min={0} max={360} unit="°"
            onChange={(v) => updateCard({ bgAngle: v })} />
            }
          </div>

          <div className="section">
            <div className="section-ttl">Type Colors</div>
            <div className="row-h">
              <div className="row"><label>Rank</label>
                <input type="color" value={card.colorRank || '#1a1812'}
                onChange={(e) => updateCard({ colorRank: e.target.value })} />
              </div>
              <div className="row"><label>Suit</label>
                <input type="color" value={card.colorSuit || '#1a1812'}
                onChange={(e) => updateCard({ colorSuit: e.target.value })} />
              </div>
              <div className="row"><label>Title</label>
                <input type="color" value={card.colorTitle || '#1a1812'}
                onChange={(e) => updateCard({ colorTitle: e.target.value })} />
              </div>
            </div>
            <div className="row-h">
              <div className="row"><label>Flavor</label>
                <input type="color" value={card.colorFlavor || '#3a3528'}
                onChange={(e) => updateCard({ colorFlavor: e.target.value })} />
              </div>
              <div className="row"><label>Value bg</label>
                <input type="color" value={card.colorValueBg || '#2a2418'}
                onChange={(e) => updateCard({ colorValueBg: e.target.value })} />
              </div>
              <div className="row"><label>Value fg</label>
                <input type="color" value={card.colorValueFg || '#b88210'}
                onChange={(e) => updateCard({ colorValueFg: e.target.value })} />
              </div>
            </div>
            <button className="btn secondary full"
            onClick={() => updateCard({
              colorRank: undefined, colorSuit: undefined, colorTitle: undefined,
              colorFlavor: undefined, colorValueBg: undefined, colorValueFg: undefined,
              colorTypeBg: undefined, colorTypeFg: undefined, colorStats: undefined
            })}>RESET TYPE COLORS</button>
          </div>

          <div className="section">
            <div className="section-ttl">Text</div>
            <div className="row">
              <label>Title</label>
              <input type="text" value={card.title || ''}
              placeholder={card.kind === 'tarot' ? 'The Wanderer' : 'optional'}
              onChange={(e) => updateCard({ title: e.target.value })} />
            </div>
            <div className="row">
              <label>Flavor / description</label>
              <textarea value={card.flavor || ''}
              placeholder="A step into nothing."
              onChange={(e) => updateCard({ flavor: e.target.value })} />
            </div>
            <div className="row-h">
              <div className="row">
                <label>Value</label>
                <input type="text" value={card.value || ''}
                placeholder="$5"
                onChange={(e) => updateCard({ value: e.target.value })} />
              </div>
              <div className="row">
                <label>Type label</label>
                <input type="text" value={card.type || ''}
                placeholder="ARTIFACT"
                onChange={(e) => updateCard({ type: e.target.value.toUpperCase() })} />
              </div>
            </div>
          </div>

          <div className="section">
            <div className="section-ttl">Stat Bar</div>
            <div style={{ fontSize: 10, color: 'rgba(243,234,212,0.55)', fontFamily: 'JetBrains Mono' }}>
              Up to 4 icon+value pairs above the title.
            </div>
            {(card.stats || [{}, {}, {}, {}]).slice(0, 4).map((s, i) =>
            <div key={i} className="row-h" style={{ alignItems: 'flex-end' }}>
                <div className="row" style={{ maxWidth: 60 }}>
                  <label>Icon {i + 1}</label>
                  <input type="text" value={(s || {}).icon || ''} maxLength={2}
                placeholder="⚔"
                onChange={(e) => {
                  const stats = [...(card.stats || [{}, {}, {}, {}])];
                  stats[i] = { ...(stats[i] || {}), icon: e.target.value };
                  updateCard({ stats });
                }} />
                </div>
                <div className="row">
                  <label>Value</label>
                  <input type="text" value={(s || {}).value || ''} maxLength={6}
                placeholder="12"
                onChange={(e) => {
                  const stats = [...(card.stats || [{}, {}, {}, {}])];
                  stats[i] = { ...(stats[i] || {}), value: e.target.value };
                  updateCard({ stats });
                }} />
                </div>
              </div>
            )}
            <div className="cols2">
              <button className="btn secondary"
              onClick={() => updateCard({ stats: [
                { icon: '⚔', value: '12' }, { icon: '❤', value: '8' },
                { icon: '⚡', value: '5' }, { icon: '✦', value: '3' }]
              })}>PRESET: RPG</button>
              <button className="btn secondary"
              onClick={() => updateCard({ stats: [] })}>CLEAR</button>
            </div>
          </div>

        </>}

        {tab === 'effects' && <>
          <div className="section">
            <div className="section-ttl">Enchantments</div>
            <div className="chips">
              <ToggleChip label="Foil" on={effects.foil} color="#9ec5e6"
              onClick={() => setEffects({ ...effects, foil: !effects.foil })} />
              <ToggleChip label="Holographic" on={effects.holo} color="#ff8ad0"
              onClick={() => setEffects({ ...effects, holo: !effects.holo })} />
              <ToggleChip label="Polychrome" on={effects.polychrome} color="#a4ff8a"
              onClick={() => setEffects({ ...effects, polychrome: !effects.polychrome })} />
              <ToggleChip label="Negative" on={effects.negative} color="#ffffff"
              onClick={() => setEffects({ ...effects, negative: !effects.negative })} />
              <ToggleChip label="Glitch" on={effects.glitch} color="#ff5dff"
              onClick={() => setEffects({ ...effects, glitch: !effects.glitch })} />
              <ToggleChip label="Burning" on={effects.burning} color="#ff8c2a"
              onClick={() => setEffects({ ...effects, burning: !effects.burning })} />
              <ToggleChip label="Frozen" on={effects.frozen} color="#a8e0ff"
              onClick={() => setEffects({ ...effects, frozen: !effects.frozen })} />
              <ToggleChip label="Gold" on={effects.gold} color="#ffd55c"
              onClick={() => setEffects({ ...effects, gold: !effects.gold })} />
            </div>
          </div>
          <div className="section">
            <button className="btn secondary full"
            onClick={() => setEffects({})}>CLEAR ALL</button>
            <button className="btn full"
            onClick={() => setEffects({ foil: Math.random() > .6, holo: Math.random() > .6,
              polychrome: Math.random() > .7, glitch: Math.random() > .85,
              gold: Math.random() > .85, burning: Math.random() > .9, frozen: Math.random() > .9 })}>
              RANDOMIZE
            </button>
          </div>
        </>}

        {tab === 'image' && <>
          <div className="section">
            <div className="section-ttl">Source</div>
            <div className="drop" data-drag={drag ? '1' : '0'}
            onClick={() => fileRef.current.click()}
            onDragOver={(e) => {e.preventDefault();setDrag(true);}}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {e.preventDefault();setDrag(false);onFile(e.dataTransfer.files[0]);}}>
              {srcImage ?
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                    <div className="img-thumb"><img src={srcImage.src} /></div>
                    <span>Drop new image or click to replace</span>
                  </div> :
              <>↧ DROP IMAGE HERE<br /><span style={{ opacity: .6 }}>or click to browse</span></>}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => onFile(e.target.files[0])} />
            </div>
            {srcImage &&
            <button className="btn secondary full"
            onClick={() => setSrcImage(null)}>REMOVE IMAGE</button>
            }
          </div>

          {srcImage && <>
            <div className="section">
              <div className="section-ttl">Pixelation</div>
              <Slider label="Pixel size" value={imgOpts.pixelSize} min={1} max={32}
              onChange={(v) => setImgOpts({ ...imgOpts, pixelSize: v })} />
              <Slider label="Levels (free)" value={imgOpts.levels} min={2} max={16}
              onChange={(v) => setImgOpts({ ...imgOpts, levels: v })} />
            </div>
            <div className="section">
              <div className="section-ttl">Palette</div>
              <div className="row">
                <select value={imgOpts.palette}
                onChange={(e) => setImgOpts({ ...imgOpts, palette: Number(e.target.value) })}
                style={{
                  padding: '7px 9px', background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.12)', color: '#f3ead4',
                  fontFamily: 'JetBrains Mono', fontSize: 12, borderRadius: 3
                }}>
                  {PALETTES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              {imgOpts.palette === 5 &&
              <div className="section" style={{ paddingTop: 6 }}>
                  <div style={{ fontSize: 10, color: 'rgba(243,234,212,0.55)', fontFamily: 'JetBrains Mono' }}>
                    Custom palette · {imgOpts.customPalette.length} colors (2–8)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 4 }}>
                    {imgOpts.customPalette.map((c, i) =>
                  <div key={i} style={{ position: 'relative' }}>
                        <input type="color" value={c}
                    onChange={(e) => {
                      const cp = [...imgOpts.customPalette];
                      cp[i] = e.target.value;
                      setImgOpts({ ...imgOpts, customPalette: cp });
                    }}
                    style={{ width: '100%', height: 32, padding: 0, border: '1px solid rgba(255,255,255,0.18)', borderRadius: 3, background: 'transparent', cursor: 'pointer' }} />
                        {imgOpts.customPalette.length > 2 &&
                    <span onClick={() => {
                      const cp = imgOpts.customPalette.filter((_, j) => j !== i);
                      setImgOpts({ ...imgOpts, customPalette: cp });
                    }} style={{ position: 'absolute', top: -5, right: -5, width: 14, height: 14, borderRadius: '50%', background: '#1a1812', color: '#fff', fontSize: 9, lineHeight: '14px', textAlign: 'center', cursor: 'pointer', border: '1px solid #fff' }}>×</span>
                    }
                      </div>
                  )}
                  </div>
                  <div className="cols2">
                    <button className="btn secondary"
                  disabled={imgOpts.customPalette.length >= 8}
                  onClick={() => setImgOpts({ ...imgOpts, customPalette: [...imgOpts.customPalette, '#888888'] })}>
                      + ADD COLOR
                    </button>
                    <select onChange={(e) => {
                    const p = PALETTE_PRESETS[e.target.value];
                    if (p) setImgOpts({ ...imgOpts, customPalette: [...p] });
                    e.target.value = '';
                  }}
                  style={{ padding: '7px 9px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', color: '#f3ead4', fontFamily: 'JetBrains Mono', fontSize: 11, borderRadius: 3 }}>
                      <option value="">PRESET ↓</option>
                      {Object.keys(PALETTE_PRESETS).map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                </div>
              }

              <div className="row">
                <label>Dither</label>
                <select value={imgOpts.dither}
                onChange={(e) => setImgOpts({ ...imgOpts, dither: Number(e.target.value) })}
                style={{
                  padding: '7px 9px', background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.12)', color: '#f3ead4',
                  fontFamily: 'JetBrains Mono', fontSize: 12, borderRadius: 3
                }}>
                  {DITHER.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div className="section">
              <div className="section-ttl">Color</div>
              <Slider label="Hue shift" value={Math.round(imgOpts.hueShift * 100) / 100} min={-1} max={1} step={0.01}
              onChange={(v) => setImgOpts({ ...imgOpts, hueShift: v })} />
              <Slider label="Saturation" value={Math.round(imgOpts.saturation * 100) / 100} min={0} max={2} step={0.05}
              onChange={(v) => setImgOpts({ ...imgOpts, saturation: v })} />
              <Slider label="Contrast" value={Math.round(imgOpts.contrast * 100) / 100} min={0.2} max={2} step={0.05}
              onChange={(v) => setImgOpts({ ...imgOpts, contrast: v })} />
            </div>
          </>}
        </>}

        {tab === 'bg' && <>
          <div className="section">
            <div className="section-ttl">Stage Mode</div>
            <div className="cols2">
              {[['Plasma', 0], ['Cosmic', 1], ['Grid', 2], ['Liquid', 3]].map(([l, v]) =>
              <button key={v} className={'btn ' + (bgOpts.mode === v ? '' : 'secondary')}
              onClick={() => setBgOpts({ ...bgOpts, mode: v })}>{l}</button>
              )}
            </div>
          </div>
          <div className="section">
            <div className="section-ttl">Distortion</div>
            <Slider label="Intensity" value={Math.round(bgOpts.intensity * 100) / 100} min={0} max={2} step={0.05}
            onChange={(v) => setBgOpts({ ...bgOpts, intensity: v })} />
          </div>
          <div className="section">
            <div className="section-ttl">Palette</div>
            <div className="row-h">
              <div className="row"><label>A</label>
                <input type="color" value={bgOpts.colorA}
                onChange={(e) => setBgOpts({ ...bgOpts, colorA: e.target.value })} />
              </div>
              <div className="row"><label>B</label>
                <input type="color" value={bgOpts.colorB}
                onChange={(e) => setBgOpts({ ...bgOpts, colorB: e.target.value })} />
              </div>
              <div className="row"><label>C</label>
                <input type="color" value={bgOpts.colorC}
                onChange={(e) => setBgOpts({ ...bgOpts, colorC: e.target.value })} />
              </div>
            </div>
            <div className="cols2">
              <button className="btn secondary" onClick={() =>
              setBgOpts({ ...bgOpts, colorA: '#3a1454', colorB: '#c8324f', colorC: '#f0d878' })}>
                CRT DUSK</button>
              <button className="btn secondary" onClick={() =>
              setBgOpts({ ...bgOpts, colorA: '#0a1a3a', colorB: '#3a8aaa', colorC: '#fff8d0' })}>
                NEBULA</button>
              <button className="btn secondary" onClick={() =>
              setBgOpts({ ...bgOpts, colorA: '#1a0a2a', colorB: '#7a1a4a', colorC: '#ffaa30' })}>
                EMBER</button>
              <button className="btn secondary" onClick={() =>
              setBgOpts({ ...bgOpts, colorA: '#0a3a2a', colorB: '#1a8a5a', colorC: '#d8ff8a' })}>
                MOSS</button>
            </div>
          </div>
        </>}

        {tab === 'audio' && <>
          <div className="section">
            <div className="section-ttl">Audio source</div>
            <div className="row">
              <label>YouTube URL</label>
              <input type="text" value={audio.youtubeUrl || ''}
              placeholder="https://youtube.com/watch?v=…"
              onChange={(e) => setAudio({ ...audio, youtubeUrl: e.target.value })} />
            </div>
            <button className="btn full"
            onClick={() => setAudio({ ...audio, action: 'youtube', actionT: Date.now() })}>
              ▶ PLAY YOUTUBE
            </button>
            <div style={{ fontSize: 9, color: 'rgba(243,234,212,0.45)', fontFamily: 'JetBrains Mono', lineHeight: 1.4 }}>
              ※ YouTube extraction routes through public Piped/Invidious instances and may fail in sandboxed previews.
              Fallbacks below always work:
            </div>
            <div className="row">
              <label>Direct audio URL (mp3/ogg)</label>
              <input type="text" value={audio.directUrl || ''}
              placeholder="https://…/track.mp3"
              onChange={(e) => setAudio({ ...audio, directUrl: e.target.value })} />
            </div>
            <button className="btn secondary full"
            onClick={() => setAudio({ ...audio, action: 'direct', actionT: Date.now() })}>
              ▶ PLAY URL
            </button>
            <div className="cols2">
              <button className="btn secondary"
              onClick={() => setAudio({ ...audio, action: 'mic', actionT: Date.now() })}>
                🎤 MICROPHONE
              </button>
              <button className="btn secondary"
              onClick={() => setAudio({ ...audio, action: 'sim', actionT: Date.now() })}>
                ◌ SIMULATE
              </button>
            </div>
            <button className="btn secondary full"
            onClick={() => setAudio({ ...audio, action: 'stop', actionT: Date.now() })}>
              ■ STOP
            </button>
          </div>

          <div className="section">
            <div className="section-ttl">Status</div>
            <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: audio.error ? '#ff8a8a' : 'rgba(243,234,212,0.7)', lineHeight: 1.4 }}>
              Mode: <b style={{ color: '#ffd55c' }}>{audio.mode || 'sim'}</b>
              {audio.error && <div style={{ marginTop: 6 }}>{audio.error}</div>}
            </div>
            <Slider label="Reactivity" value={Math.round(bgOpts.audioGain * 100) / 100} min={0} max={0.5} step={0.01}
            onChange={(v) => setBgOpts({ ...bgOpts, audioGain: v })} />
          </div>
        </>}
      </div>
    </div>);

}
window.CardPanel = CardPanel;