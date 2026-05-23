// logo.jsx — App logo exploration for NUSLink.
// 4 directions. Each is a single SVG so it scales cleanly to any size — favicon,
// tab bar, splash, app store. All use simple geometric primitives only.

// ─────────────────────────────────────────────────────────────
// 1 · ARC — two nodes joined by a bridge. Reads as "n" + connection.
//   Most literal: "link between people".
// ─────────────────────────────────────────────────────────────
function MarkArc({ size = 64, color = '#fff', bg }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 64 64" style={{ display: 'block' }}>
      {bg && <rect width="64" height="64" rx="14" fill={bg}/>}
      {/* Arc */}
      <path d="M16 44 V32 a16 16 0 0 1 32 0 V44" stroke={color} strokeWidth="6"
        strokeLinecap="round" fill="none"/>
      {/* Nodes */}
      <circle cx="16" cy="44" r="5" fill={color}/>
      <circle cx="48" cy="44" r="5" fill={color}/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// 2 · LINKED — two interlocking rounded rects. Chain-link metaphor.
// ─────────────────────────────────────────────────────────────
function MarkLinked({ size = 64, color = '#fff', bg }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block' }}>
      {bg && <rect width="64" height="64" rx="14" fill={bg}/>}
      {/* Back ring */}
      <rect x="10" y="18" width="28" height="28" rx="8" fill="none" stroke={color} strokeWidth="6"/>
      {/* Front ring — overlap creates the link */}
      <rect x="26" y="18" width="28" height="28" rx="8" fill="none" stroke={color} strokeWidth="6"/>
      {/* Mask the back ring's right edge to fake the interweave */}
      <rect x="26" y="18" width="4" height="28" rx="0" fill={bg || '#0F1115'}/>
      <rect x="26" y="18" width="28" height="28" rx="8" fill="none" stroke={color} strokeWidth="6"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// 3 · KNOT — two overlapping circles, monogram-friendly Venn.
//   Academic + collaboration metaphor.
// ─────────────────────────────────────────────────────────────
function MarkKnot({ size = 64, color = '#fff', bg }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block' }}>
      {bg && <rect width="64" height="64" rx="14" fill={bg}/>}
      <circle cx="24" cy="32" r="14" fill="none" stroke={color} strokeWidth="6"/>
      <circle cx="40" cy="32" r="14" fill="none" stroke={color} strokeWidth="6"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// 4 · NODE-N — geometric "n" with a connection node at the bottom-right.
//   Most letterform-literal of the set.
// ─────────────────────────────────────────────────────────────
function MarkNodeN({ size = 64, color = '#fff', bg }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block' }}>
      {bg && <rect width="64" height="64" rx="14" fill={bg}/>}
      {/* n shape: left vertical, arc top, right vertical */}
      <path d="M18 46 V28 a14 14 0 0 1 28 0 V46" stroke={color} strokeWidth="7"
        strokeLinecap="round" fill="none"/>
      {/* Node accent */}
      <circle cx="46" cy="46" r="6" fill={color}/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// 5 · MONOGRAM — sturdy bold "nL" stacked, more brand-mark style.
// ─────────────────────────────────────────────────────────────
function MarkMonogram({ size = 64, color = '#fff', bg }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block' }}>
      {bg && <rect width="64" height="64" rx="14" fill={bg}/>}
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="central"
        fontFamily={FONT_STACK} fontSize="38" fontWeight="800" fill={color}
        style={{ letterSpacing: -2 }}>nL</text>
      <circle cx="48" cy="20" r="4" fill={color}/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// LOGO CARD — composed display: large app icon + variations
// ─────────────────────────────────────────────────────────────
const LOGO_VARIANTS = [
  { id: 'arc',     name: 'Arc',       sub: 'Two nodes, one bridge',                  Mark: MarkArc,      recommended: true },
  { id: 'linked',  name: 'Linked',    sub: 'Interlocking rings (chain-link)',        Mark: MarkLinked },
  { id: 'noden',   name: 'Node-n',    sub: 'Letterform "n" with a connection node',  Mark: MarkNodeN },
  { id: 'knot',    name: 'Venn',      sub: 'Two circles, shared overlap',            Mark: MarkKnot },
  { id: 'mono',    name: 'Monogram',  sub: 'nL stacked wordmark',                    Mark: MarkMonogram },
];

function LogoExploration() {
  return (
    <ThemeProvider mode="light">
      <LogoExplorationInner/>
    </ThemeProvider>
  );
}

function LogoExplorationInner() {
  const t = useTheme();
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bgGradient, padding: 28, boxSizing: 'border-box',
      fontFamily: FONT_STACK, color: t.text, overflow: 'auto',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: t.primary, textTransform: 'uppercase', letterSpacing: 1.2 }}>Logo · 5 directions</div>
      <h2 style={{ margin: '4px 0 6px', fontSize: 26, fontWeight: 700, letterSpacing: -0.7 }}>Pick a mark.</h2>
      <p style={{ margin: '0 0 22px', fontSize: 14, color: t.text2, lineHeight: 1.5 }}>
        All are single-color, geometric, and scale to favicon. Arc is the recommended primary — most literal to "link between people" and reads instantly as an "n".
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {LOGO_VARIANTS.map(v => <LogoCard key={v.id} variant={v}/>)}
      </div>
    </div>
  );
}

function LogoCard({ variant }) {
  const t = useTheme();
  const { Mark, name, sub, recommended } = variant;
  return (
    <div style={{
      background: t.bgRaised, borderRadius: 18,
      border: `1px solid ${recommended ? t.primary : t.border}`,
      padding: 20,
      boxShadow: recommended ? t.shadowLg : t.shadow,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: t.text3,
              textTransform: 'uppercase', letterSpacing: 0.8,
            }}>{name}</div>
            {recommended && (
              <div style={{
                fontSize: 9, fontWeight: 700, color: t.primary,
                background: t.primarySoft, padding: '2px 6px', borderRadius: 4,
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>Recommended</div>
            )}
          </div>
          <div style={{ fontSize: 14, color: t.text, marginTop: 2 }}>{sub}</div>
        </div>
      </div>

      {/* Row of variations: app icon, light mark, dark mark, tiny */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {/* iOS app icon */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <Mark size={88} color="#fff" bg="#0F1115"/>
          <div style={{ fontSize: 10, color: t.text3 }}>App icon</div>
        </div>
        {/* Mark on light */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 88, height: 88, background: t.bg, borderRadius: 14, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mark size={56} color="#1A1614"/>
          </div>
          <div style={{ fontSize: 10, color: t.text3 }}>Mark</div>
        </div>
        {/* Mark on dark */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 88, height: 88, background: '#15120F', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mark size={56} color="#F4EFE5"/>
          </div>
          <div style={{ fontSize: 10, color: t.text3 }}>On dark</div>
        </div>
        {/* Favicon sizes */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, paddingLeft: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <Mark size={32} color="#0F1115"/>
            <Mark size={20} color="#0F1115"/>
            <Mark size={14} color="#0F1115"/>
          </div>
          <div style={{ fontSize: 10, color: t.text3 }}>32 · 20 · 14 px</div>
        </div>
      </div>

      {/* Wordmark */}
      <div style={{
        marginTop: 14, padding: '12px 14px', background: t.bg,
        borderRadius: 12, border: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Mark size={32} color="#0F1115"/>
        <span style={{
          fontFamily: FONT_STACK, fontSize: 22, fontWeight: 700, letterSpacing: -0.9,
          color: t.text,
        }}>NUSLink</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LogoShowcase — a "hero" artboard with Arc as primary, big.
// ─────────────────────────────────────────────────────────────
function LogoHero() {
  return (
    <ThemeProvider mode="light">
      <LogoHeroInner/>
    </ThemeProvider>
  );
}

function LogoHeroInner() {
  const t = useTheme();
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bgGradient, padding: 32, boxSizing: 'border-box',
      fontFamily: FONT_STACK, color: t.text, overflow: 'auto',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: t.primary, textTransform: 'uppercase', letterSpacing: 1.2 }}>Primary mark</div>
      <h1 style={{ margin: '4px 0 8px', fontSize: 28, fontWeight: 700, letterSpacing: -0.8 }}>Arc.</h1>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: t.text2, lineHeight: 1.5, maxWidth: 380 }}>
        Two nodes connected by an arc. Reads as a lowercase "n" at any size and as a literal connection between two people. Geometric, single-color, no gradients — durable across contexts.
      </p>

      {/* Big app icon */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
        <div style={{ filter: 'drop-shadow(0 20px 40px rgba(15,17,21,0.25))' }}>
          <MarkArc size={220} color="#fff" bg="#0F1115"/>
        </div>
      </div>

      {/* Clear space / proportions */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1, background: t.bgRaised, border: `1px solid ${t.border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>On black</div>
          <MarkArc size={96} color="#fff" bg="#0F1115"/>
        </div>
        <div style={{ flex: 1, background: t.bgRaised, border: `1px solid ${t.border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>On dark</div>
          <MarkArc size={96} color="#F4EFE5" bg="#15120F"/>
        </div>
        <div style={{ flex: 1, background: t.bgRaised, border: `1px solid ${t.border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>On light</div>
          <div style={{ width: 96, height: 96, background: t.bg, borderRadius: 14, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MarkArc size={64} color="#1A1614"/>
          </div>
        </div>
      </div>

      {/* Wordmark lockups */}
      <div style={{
        background: t.bgRaised, borderRadius: 14, padding: 20,
        border: `1px solid ${t.border}`, marginBottom: 14,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>Horizontal lockup</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <MarkArc size={44} color="#0F1115"/>
          <span style={{ fontFamily: FONT_STACK, fontSize: 32, fontWeight: 700, letterSpacing: -1.2, color: t.text }}>NUSLink</span>
        </div>
      </div>

      <div style={{
        background: t.bgRaised, borderRadius: 14, padding: 20,
        border: `1px solid ${t.border}`,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>Stacked lockup</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <MarkArc size={44} color="#0F1115"/>
          <span style={{ fontFamily: FONT_STACK, fontSize: 24, fontWeight: 700, letterSpacing: -0.9, color: t.text }}>NUSLink</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  MarkArc, MarkLinked, MarkKnot, MarkNodeN, MarkMonogram,
  LogoExploration, LogoHero,
});
