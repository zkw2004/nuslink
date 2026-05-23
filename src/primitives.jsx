// primitives.jsx — Building blocks shared across all NUSLink screens.
// Avatar, CompatRing, Chip, Button, Field, ProgressBar, TabBar, Icon set.

// ─────────────────────────────────────────────────────────────
// Avatar — deterministic gradient + monogram (placeholder until users upload)
// ─────────────────────────────────────────────────────────────
const AVATAR_PALETTES = [
  ['#F2C994', '#E58E58'],  // amber
  ['#C8D8E6', '#7A98B8'],  // sky
  ['#D9C8E3', '#9A7AB8'],  // lilac
  ['#C8E2D2', '#6FAE89'],  // sage
  ['#F2C5BB', '#D17A6A'],  // coral
  ['#E6D8B5', '#A98B53'],  // sand
  ['#B8CFD4', '#5E8A93'],  // teal
  ['#E3B5C7', '#B5688A'],  // rose
];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function monogram(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function Avatar({ name = 'A B', size = 40, radius = 'round', style = {} }) {
  const t = useTheme();
  const pal = AVATAR_PALETTES[hashStr(name) % AVATAR_PALETTES.length];
  const r = radius === 'round' ? '50%' : radius === 'rect' ? Math.round(size * 0.22) : radius;
  return (
    <div style={{
      width: size, height: size, borderRadius: r, flexShrink: 0,
      background: `linear-gradient(135deg, ${pal[0]} 0%, ${pal[1]} 100%)`,
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 600, fontSize: Math.round(size * 0.36), letterSpacing: -0.2,
      fontFamily: FONT_STACK,
      boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.18)`,
      ...style,
    }}>
      {monogram(name)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PhotoCard — Hinge-style "profile photo" placeholder.
// Large gradient block with subtle pattern + monogram, framed at top of cards.
// ─────────────────────────────────────────────────────────────
function PhotoCard({ name = 'A B', height = 220, radius = 16, label, children }) {
  const pal = AVATAR_PALETTES[hashStr(name) % AVATAR_PALETTES.length];
  const id = 'pat-' + hashStr(name);
  return (
    <div style={{
      position: 'relative', width: '100%', height, borderRadius: radius,
      overflow: 'hidden',
      background: `linear-gradient(155deg, ${pal[0]} 0%, ${pal[1]} 100%)`,
    }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.28 }} preserveAspectRatio="none">
        <defs>
          <pattern id={id} x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="7" cy="7" r="0.8" fill="#fff"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`}/>
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.30) 100%)',
      }}/>
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-58%)',
        color: 'rgba(255,255,255,0.92)', fontSize: Math.round(height * 0.32), fontWeight: 700,
        letterSpacing: -1.2, fontFamily: FONT_STACK, textShadow: '0 2px 12px rgba(0,0,0,0.18)',
      }}>{monogram(name)}</div>
      {label && (
        <div style={{
          position: 'absolute', top: 12, left: 12,
          padding: '5px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
          color: '#fff', background: 'rgba(0,0,0,0.32)',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          letterSpacing: 0.2, textTransform: 'uppercase',
        }}>{label}</div>
      )}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CompatRing — donut chart for compatibility %.
// ─────────────────────────────────────────────────────────────
function CompatRing({ value = 78, size = 56, stroke = 5, showLabel = true, color }) {
  const t = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  const ringColor = color || (value >= 80 ? t.primary : value >= 60 ? t.accent : t.text3);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={t.ringTrack} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={ringColor} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"/>
      </svg>
      {showLabel && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: t.text, fontFamily: FONT_STACK, fontWeight: 700,
          fontSize: Math.round(size * 0.28), letterSpacing: -0.3,
        }}>
          {value}<span style={{ fontSize: Math.round(size * 0.18), opacity: 0.55, marginLeft: 1 }}>%</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Chip — tag/pill for modules, interests, skills, filters
// ─────────────────────────────────────────────────────────────
function Chip({ children, selected, onClick, variant = 'default', size = 'md', icon, removable, onRemove }) {
  const t = useTheme();
  const sizes = {
    sm: { h: 24, px: 8,  fs: 12 },
    md: { h: 30, px: 12, fs: 13 },
    lg: { h: 38, px: 16, fs: 15 },
  }[size];
  const variants = {
    default: {
      bg: selected ? t.primarySoft : t.surface2,
      color: selected ? t.primaryDeep : t.text2,
      bd: selected ? t.primary : 'transparent',
    },
    module: {
      bg: t.accentSoft,
      color: t.accent,
      bd: 'transparent',
    },
    outline: {
      bg: 'transparent',
      color: t.text2,
      bd: t.border,
    },
    solid: {
      bg: t.primary,
      color: t.onPrimary,
      bd: 'transparent',
    },
  }[variant];
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: sizes.h, padding: `0 ${sizes.px}px`, borderRadius: 999,
      background: variants.bg, color: variants.color,
      border: `1px solid ${variants.bd}`,
      fontFamily: FONT_STACK, fontSize: sizes.fs, fontWeight: 500,
      letterSpacing: -0.1, cursor: onClick ? 'pointer' : 'default', flexShrink: 0,
      whiteSpace: 'nowrap',
    }}>
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {children}
      {removable && (
        <span onClick={(e) => { e.stopPropagation(); onRemove && onRemove(); }} style={{
          marginLeft: 2, marginRight: -3, width: 16, height: 16, borderRadius: 999,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0.55, fontSize: 14, lineHeight: 1,
        }}>×</span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Button — primary / secondary / ghost
// ─────────────────────────────────────────────────────────────
function Button({ children, variant = 'primary', size = 'md', leading, trailing, full, onClick, style = {} }) {
  const t = useTheme();
  const sizes = {
    sm: { h: 34, px: 14, fs: 14, r: 10 },
    md: { h: 46, px: 18, fs: 15, r: 12 },
    lg: { h: 54, px: 22, fs: 16, r: 14 },
  }[size];
  const variants = {
    primary:   { bg: t.primary, color: t.onPrimary, bd: 'transparent' },
    secondary: { bg: t.bgRaised, color: t.text, bd: t.borderStrong },
    ghost:     { bg: 'transparent', color: t.text2, bd: 'transparent' },
    danger:    { bg: t.danger, color: '#fff', bd: 'transparent' },
    success:   { bg: t.success, color: '#fff', bd: 'transparent' },
  }[variant];
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      height: sizes.h, padding: `0 ${sizes.px}px`, borderRadius: sizes.r,
      background: variants.bg, color: variants.color,
      border: `1px solid ${variants.bd}`, cursor: 'pointer',
      fontFamily: FONT_STACK, fontSize: sizes.fs, fontWeight: 600, letterSpacing: -0.1,
      width: full ? '100%' : undefined,
      boxShadow: variant === 'primary' ? '0 1px 2px rgba(217,99,63,0.20), 0 4px 12px rgba(217,99,63,0.15)' : undefined,
      ...style,
    }}>
      {leading}{children}{trailing}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Field — labelled text input
// ─────────────────────────────────────────────────────────────
function Field({ label, value, placeholder, hint, icon, trailing, multiline, rows = 3, charCount, maxChars }) {
  const t = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <label style={{ fontFamily: FONT_STACK, fontSize: 13, fontWeight: 600, color: t.text2, letterSpacing: -0.1 }}>{label}</label>
          {charCount !== undefined && (
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: t.text3 }}>{charCount}/{maxChars}</span>
          )}
        </div>
      )}
      <div style={{
        display: 'flex', alignItems: multiline ? 'flex-start' : 'center', gap: 10,
        background: t.bgRaised, border: `1px solid ${t.border}`, borderRadius: 14,
        padding: multiline ? '12px 14px' : '0 14px',
        minHeight: multiline ? rows * 22 + 24 : 48,
      }}>
        {icon && <span style={{ color: t.text3, display: 'flex' }}>{icon}</span>}
        <div style={{
          flex: 1, color: value ? t.text : t.text3, fontSize: 15, fontFamily: FONT_STACK,
          lineHeight: '22px', minHeight: 22, whiteSpace: 'pre-wrap',
        }}>
          {value || placeholder}
        </div>
        {trailing}
      </div>
      {hint && <span style={{ fontSize: 12, color: t.text3, fontFamily: FONT_STACK }}>{hint}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ProgressBar
// ─────────────────────────────────────────────────────────────
function ProgressBar({ value = 0, max = 100, height = 6, color, track }) {
  const t = useTheme();
  const w = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{
      width: '100%', height, background: track || t.ringTrack,
      borderRadius: 999, overflow: 'hidden',
    }}>
      <div style={{ width: `${w}%`, height: '100%', background: color || t.primary, borderRadius: 999, transition: 'width .3s' }}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Icon set — minimalist line icons.
// ─────────────────────────────────────────────────────────────
const Icon = {
  search: (p) => <svg width={p?.size||20} height={p?.size||20} viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke={p?.color||'currentColor'} strokeWidth="1.7"/><path d="M14 14l3 3" stroke={p?.color||'currentColor'} strokeWidth="1.7" strokeLinecap="round"/></svg>,
  bell: (p) => <svg width={p?.size||20} height={p?.size||20} viewBox="0 0 20 20" fill="none"><path d="M5 13c0-3 0-7 5-7s5 4 5 7H5z" stroke={p?.color||'currentColor'} strokeWidth="1.6" strokeLinejoin="round"/><path d="M3.5 13.5h13" stroke={p?.color||'currentColor'} strokeWidth="1.6" strokeLinecap="round"/><path d="M8.5 16.5a1.5 1.5 0 003 0" stroke={p?.color||'currentColor'} strokeWidth="1.6" strokeLinecap="round"/></svg>,
  back: (p) => <svg width={p?.size||22} height={p?.size||22} viewBox="0 0 22 22" fill="none"><path d="M13.5 5l-6 6 6 6" stroke={p?.color||'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  close: (p) => <svg width={p?.size||20} height={p?.size||20} viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke={p?.color||'currentColor'} strokeWidth="1.8" strokeLinecap="round"/></svg>,
  plus: (p) => <svg width={p?.size||22} height={p?.size||22} viewBox="0 0 22 22" fill="none"><path d="M11 4v14M4 11h14" stroke={p?.color||'currentColor'} strokeWidth="2" strokeLinecap="round"/></svg>,
  check: (p) => <svg width={p?.size||18} height={p?.size||18} viewBox="0 0 18 18" fill="none"><path d="M3.5 9.5l3.5 3.5L14.5 5.5" stroke={p?.color||'currentColor'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  spark: (p) => <svg width={p?.size||16} height={p?.size||16} viewBox="0 0 16 16" fill="none"><path d="M8 1l1.6 4.4L14 7l-4.4 1.6L8 13l-1.6-4.4L2 7l4.4-1.6L8 1z" fill={p?.color||'currentColor'}/></svg>,
  filter: (p) => <svg width={p?.size||18} height={p?.size||18} viewBox="0 0 18 18" fill="none"><path d="M2.5 4.5h13M5 9h8M7 13.5h4" stroke={p?.color||'currentColor'} strokeWidth="1.7" strokeLinecap="round"/></svg>,
  pin: (p) => <svg width={p?.size||16} height={p?.size||16} viewBox="0 0 16 16" fill="none"><path d="M10 2l4 4-2 1-1 4-3-3-3 3v-3l-3-3 4-1 1-2 3 0z" stroke={p?.color||'currentColor'} strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  camera: (p) => <svg width={p?.size||20} height={p?.size||20} viewBox="0 0 20 20" fill="none"><rect x="2" y="5.5" width="16" height="11" rx="2.5" stroke={p?.color||'currentColor'} strokeWidth="1.6"/><circle cx="10" cy="11" r="3" stroke={p?.color||'currentColor'} strokeWidth="1.6"/><path d="M7.5 5.5l1-2h3l1 2" stroke={p?.color||'currentColor'} strokeWidth="1.6"/></svg>,
  link: (p) => <svg width={p?.size||16} height={p?.size||16} viewBox="0 0 16 16" fill="none"><path d="M7 9.5a2.5 2.5 0 003.5 0L13 7a2.5 2.5 0 00-3.5-3.5L8.5 4.5M9 6.5a2.5 2.5 0 00-3.5 0L3 9a2.5 2.5 0 003.5 3.5l1-1" stroke={p?.color||'currentColor'} strokeWidth="1.6" strokeLinecap="round"/></svg>,
  paperclip: (p) => <svg width={p?.size||20} height={p?.size||20} viewBox="0 0 20 20" fill="none"><path d="M14 5L7 12a2.5 2.5 0 003.5 3.5L17 9a4 4 0 00-5.5-5.5L5 10a5.5 5.5 0 008 7.5l5-5" stroke={p?.color||'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  send: (p) => <svg width={p?.size||20} height={p?.size||20} viewBox="0 0 20 20" fill="none"><path d="M3 10l14-7-4 17-3-7-7-3z" stroke={p?.color||'currentColor'} strokeWidth="1.6" strokeLinejoin="round" fill={p?.fill||'none'}/></svg>,
  reply: (p) => <svg width={p?.size||14} height={p?.size||14} viewBox="0 0 14 14" fill="none"><path d="M5 3L1.5 6.5 5 10M1.5 6.5h7a4 4 0 014 4" stroke={p?.color||'currentColor'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  poll: (p) => <svg width={p?.size||16} height={p?.size||16} viewBox="0 0 16 16" fill="none"><rect x="2" y="8" width="3" height="6" rx="1" stroke={p?.color||'currentColor'} strokeWidth="1.4"/><rect x="6.5" y="4" width="3" height="10" rx="1" stroke={p?.color||'currentColor'} strokeWidth="1.4"/><rect x="11" y="10" width="3" height="4" rx="1" stroke={p?.color||'currentColor'} strokeWidth="1.4"/></svg>,
  arrow: (p) => <svg width={p?.size||18} height={p?.size||18} viewBox="0 0 18 18" fill="none"><path d="M3.5 9h11M10 4.5L14.5 9 10 13.5" stroke={p?.color||'currentColor'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  gear: (p) => <svg width={p?.size||22} height={p?.size||22} viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="3" stroke={p?.color||'currentColor'} strokeWidth="1.6"/><path d="M11 2v2M11 18v2M20 11h-2M4 11H2M17.4 4.6l-1.4 1.4M6 16l-1.4 1.4M17.4 17.4L16 16M6 6L4.6 4.6" stroke={p?.color||'currentColor'} strokeWidth="1.6" strokeLinecap="round"/></svg>,
  star: (p) => <svg width={p?.size||14} height={p?.size||14} viewBox="0 0 14 14" fill={p?.color||'currentColor'}><path d="M7 1l1.85 3.75L13 5.4l-3 2.9.7 4.1L7 10.5l-3.7 1.9L4 8.3 1 5.4l4.15-.65L7 1z"/></svg>,
  shield: (p) => <svg width={p?.size||14} height={p?.size||14} viewBox="0 0 14 14" fill="none"><path d="M7 1l5 2v4c0 3-2.2 5.5-5 6-2.8-.5-5-3-5-6V3l5-2z" stroke={p?.color||'currentColor'} strokeWidth="1.3" strokeLinejoin="round" fill={p?.fill||'none'}/></svg>,
  calendar: (p) => <svg width={p?.size||16} height={p?.size||16} viewBox="0 0 16 16" fill="none"><rect x="2" y="3.5" width="12" height="11" rx="2" stroke={p?.color||'currentColor'} strokeWidth="1.4"/><path d="M2 6.5h12M5.5 2v3M10.5 2v3" stroke={p?.color||'currentColor'} strokeWidth="1.4" strokeLinecap="round"/></svg>,
  user: (p) => <svg width={p?.size||22} height={p?.size||22} viewBox="0 0 22 22" fill="none"><circle cx="11" cy="8" r="3.5" stroke={p?.color||'currentColor'} strokeWidth="1.6"/><path d="M4 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5" stroke={p?.color||'currentColor'} strokeWidth="1.6" strokeLinecap="round"/></svg>,
  compass: (p) => <svg width={p?.size||22} height={p?.size||22} viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke={p?.color||'currentColor'} strokeWidth="1.6"/><path d="M14.5 7.5l-1.7 4.8-4.8 1.7 1.7-4.8 4.8-1.7z" stroke={p?.color||'currentColor'} strokeWidth="1.6" strokeLinejoin="round" fill={p?.fill||'none'}/></svg>,
  people: (p) => <svg width={p?.size||22} height={p?.size||22} viewBox="0 0 22 22" fill="none"><circle cx="8" cy="8" r="3" stroke={p?.color||'currentColor'} strokeWidth="1.6"/><circle cx="15" cy="9" r="2.5" stroke={p?.color||'currentColor'} strokeWidth="1.6"/><path d="M2 18c1-3 3-4.5 6-4.5s5 1.5 6 4.5" stroke={p?.color||'currentColor'} strokeWidth="1.6" strokeLinecap="round"/><path d="M15 13.5c2 0 3.5 1 4.5 3" stroke={p?.color||'currentColor'} strokeWidth="1.6" strokeLinecap="round"/></svg>,
  chat: (p) => <svg width={p?.size||22} height={p?.size||22} viewBox="0 0 22 22" fill="none"><path d="M3 11a8 8 0 1114 5l1 3-3.5-1A8 8 0 013 11z" stroke={p?.color||'currentColor'} strokeWidth="1.6" strokeLinejoin="round" fill={p?.fill||'none'}/></svg>,
  vert: (p) => <svg width={p?.size||20} height={p?.size||20} viewBox="0 0 20 20" fill={p?.color||'currentColor'}><circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/></svg>,
};

// ─────────────────────────────────────────────────────────────
// BottomTabBar — 5 tabs with elevated Create (+) center
// ─────────────────────────────────────────────────────────────
function BottomTabBar({ active = 'discover', onSelect }) {
  const t = useTheme();
  const tabs = [
    { id: 'discover',    label: 'Discover',    icon: Icon.compass },
    { id: 'communities', label: 'Communities', icon: Icon.people },
    { id: 'create',      label: '',            icon: Icon.plus, elevated: true },
    { id: 'chats',       label: 'Chats',       icon: Icon.chat },
    { id: 'profile',     label: 'Profile',     icon: Icon.user },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingBottom: 30, paddingTop: 8,
      background: t.bgRaised,
      borderTop: `0.5px solid ${t.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      fontFamily: FONT_STACK, zIndex: 10,
    }}>
      {tabs.map(tab => {
        const isActive = active === tab.id;
        if (tab.elevated) {
          return (
            <button key={tab.id} onClick={() => onSelect && onSelect(tab.id)} style={{
              width: 52, height: 52, borderRadius: 18, marginTop: -22,
              background: t.primary, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 18px rgba(217,99,63,0.32), 0 1px 3px rgba(217,99,63,0.2)',
              color: t.onPrimary,
            }}>
              <tab.icon size={26} color={t.onPrimary}/>
            </button>
          );
        }
        return (
          <button key={tab.id} onClick={() => onSelect && onSelect(tab.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '4px 8px', minWidth: 56,
            color: isActive ? t.primary : t.text3,
          }}>
            <tab.icon size={24} color={isActive ? t.primary : t.text3}/>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: -0.1 }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AppTopBar — logo + bell. Replaces iOS large title.
// ─────────────────────────────────────────────────────────────
function AppTopBar({ title, unread, leading, trailing }) {
  const t = useTheme();
  return (
    <div style={{
      paddingTop: 56, paddingBottom: 8, padding: '56px 20px 8px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: t.bg, position: 'relative', zIndex: 5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {leading || <Logo size={26}/>}
        {title && (
          <span style={{
            fontFamily: FONT_STACK, fontSize: 22, fontWeight: 700,
            color: t.text, letterSpacing: -0.6,
          }}>{title}</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {trailing || (
          <button style={{
            width: 40, height: 40, borderRadius: 999, border: 'none',
            background: t.surface2, color: t.text, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <Icon.bell color={t.text}/>
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: 6, right: 6,
                minWidth: 16, height: 16, borderRadius: 999, background: t.primary,
                color: t.onPrimary, fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px', border: `2px solid ${t.surface2}`,
              }}>{unread}</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Logo — wordmark
// ─────────────────────────────────────────────────────────────
function Logo({ size = 28, variant = 'mark' }) {
  const t = useTheme();
  if (variant === 'mark') {
    return (
      <div style={{
        width: size, height: size, borderRadius: size * 0.28,
        background: t.primary, color: t.onPrimary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONT_STACK, fontWeight: 800, fontSize: size * 0.5,
        letterSpacing: -0.5,
      }}>n</div>
    );
  }
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <Logo size={size} variant="mark"/>
      <span style={{
        fontFamily: FONT_STACK, fontSize: size * 0.78, fontWeight: 700,
        color: t.text, letterSpacing: -0.8,
      }}>NUSLink</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// StatusBar (iOS-style) — minimal so each screen can use without device frame
// ─────────────────────────────────────────────────────────────
function StatusBar({ dark }) {
  const c = dark ? '#fff' : '#000';
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '18px 32px 0', height: 50,
    }}>
      <span style={{ fontFamily: FONT_STACK, fontWeight: 600, fontSize: 15, color: c }}>9:41</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="6" width="3" height="4" rx="0.5" fill={c}/><rect x="4.5" y="4" width="3" height="6" rx="0.5" fill={c}/><rect x="9" y="2" width="3" height="8" rx="0.5" fill={c}/><rect x="13.5" y="0" width="3" height="10" rx="0.5" fill={c}/></svg>
        <svg width="15" height="11" viewBox="0 0 15 11"><path d="M7.5 3a8 8 0 015 2l1-1A10 10 0 007.5 1 10 10 0 001 4l1 1a8 8 0 015.5-2zM7.5 6a4 4 0 013 1.3l1-1A5.5 5.5 0 007.5 4.5a5.5 5.5 0 00-4 1.8l1 1a4 4 0 013-1.3zM7.5 9a1 1 0 100 2 1 1 0 000-2z" fill={c}/></svg>
        <svg width="24" height="11" viewBox="0 0 24 11"><rect x="0.5" y="0.5" width="20" height="10" rx="2.5" stroke={c} strokeOpacity="0.4" fill="none"/><rect x="2" y="2" width="17" height="7" rx="1.5" fill={c}/><rect x="21.5" y="3.5" width="1.5" height="4" rx="0.5" fill={c} fillOpacity="0.5"/></svg>
      </div>
    </div>
  );
}

Object.assign(window, {
  Avatar, PhotoCard, CompatRing, Chip, Button, Field, ProgressBar, Icon,
  BottomTabBar, AppTopBar, Logo, StatusBar,
  hashStr, monogram, AVATAR_PALETTES,
});
