// brief.jsx — Brief + Visual System artboards.
// Pulled out so the print pipeline can render them without loading app.jsx.

function Brief() {
  return (
    <ThemeProvider mode="light">
      <BriefInner/>
    </ThemeProvider>
  );
}

function BriefInner() {
  const t = useTheme();
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bgGradient, padding: 32, boxSizing: 'border-box',
      fontFamily: FONT_STACK, color: t.text, overflow: 'auto',
    }}>
      <Logo size={28} variant="full"/>
      <div style={{
        marginTop: 28, fontSize: 13, fontWeight: 700, color: t.primary,
        textTransform: 'uppercase', letterSpacing: 1.2,
      }}>Design direction</div>
      <h1 style={{
        margin: '6px 0 18px', fontSize: 32, fontWeight: 700, letterSpacing: -1, lineHeight: 1.1,
      }}>Calm B&W. Soft blue glow.</h1>
      <p style={{ margin: '0 0 14px', fontSize: 15, lineHeight: 1.55, color: t.text2 }}>
        White cards floating on a light blue-tinted gradient. Pure black (<code style={{ background: t.surface2, padding: '1px 5px', borderRadius: 4, fontSize: 13, fontFamily: FONT_MONO }}>#0F1115</code>) for primary actions and active states. Soft slate blue (<code style={{ background: t.surface2, padding: '1px 5px', borderRadius: 4, fontSize: 13, fontFamily: FONT_MONO }}>#5B7BA3</code>) reserved for informational hints and data accents — never for buttons.
      </p>
      <p style={{ margin: '0 0 18px', fontSize: 15, lineHeight: 1.55, color: t.text2 }}>
        Visual cues lifted from <strong style={{ color: t.text }}>Commuin</strong> (oversized white cards on blue-tinted bg, filled-black CTAs) and <strong style={{ color: t.text }}>Vektora</strong> (generous corner rounding, pill-shaped tab switchers, big stat numbers). The <strong style={{ color: t.text }}>compatibility ring</strong> and <strong style={{ color: t.text }}>"why you match" breakdown</strong> remain the signature moments.
      </p>

      <BriefDivider/>

      <BriefRow>
        <BriefCol title="Type">
          SF Pro / Inter fallback.<br/>
          34px display · 22px h2 · 17px body · 13px label.<br/>
          Tight tracking (-0.4 to -1).
        </BriefCol>
        <BriefCol title="Radii">
          Cards 22–28px (oversized)<br/>
          Chips 999 (pill)<br/>
          Buttons 14–16px or pill<br/>
          Avatars round inline, rect on cards
        </BriefCol>
      </BriefRow>
      <BriefRow>
        <BriefCol title="Density">
          Airy: 2/5. Generous 20–24px gutters. Whitespace earns trust on a serious app.
        </BriefCol>
        <BriefCol title="Photography">
          Gradient + monogram placeholders here. Production: NUS SSO avatar import → user-uploaded photo.
        </BriefCol>
      </BriefRow>

      <BriefDivider/>

      <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: 1 }}>Patterns lifted from</div>
      <div style={{ marginTop: 6, fontSize: 14, color: t.text2, lineHeight: 1.6 }}>
        <strong style={{ color: t.text }}>Commuin</strong> — white profile cards on blue-tinted bg, black filled CTAs, pill segmented controls. ·{' '}
        <strong style={{ color: t.text }}>Vektora</strong> — oversized rounding, status pills (Completed/Pending), overlapping avatar groups. ·{' '}
        <strong style={{ color: t.text }}>Hinge</strong> — single-card hero profile with structured prompts. ·{' '}
        <strong style={{ color: t.text }}>Slack</strong> — chat threads, pinned messages, inline polls.
      </div>

      <BriefDivider/>

      <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>What's NOT here yet</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: t.text2, lineHeight: 1.7 }}>
        <li>Group detail screen (members, join flow, shared scheduling)</li>
        <li>Communities tab — official badges, browse</li>
        <li>Unified inbox + Direct message threads</li>
        <li>Group-creation form with AI-assisted mode (spec §7.1)</li>
        <li>Notifications panel — smart-nudge variants</li>
      </ul>
    </div>
  );
}

function BriefDivider() { const t = useTheme(); return <div style={{ height: 1, background: t.border, margin: '18px 0' }}/>; }
function BriefRow({ children }) { return <div style={{ display: 'flex', gap: 18, marginTop: 14 }}>{children}</div>; }
function BriefCol({ title, children }) {
  const t = useTheme();
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: t.text2 }}>{children}</div>
    </div>
  );
}

function VisualSystem({ dark }) {
  return (
    <ThemeProvider mode={dark ? 'dark' : 'light'}>
      <VSInner/>
    </ThemeProvider>
  );
}

function VSInner() {
  const t = useTheme();
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bgGradient, padding: 28, boxSizing: 'border-box',
      fontFamily: FONT_STACK, color: t.text, overflow: 'auto',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: t.primary, textTransform: 'uppercase', letterSpacing: 1.2 }}>System</div>
      <h2 style={{ margin: '4px 0 18px', fontSize: 24, fontWeight: 700, letterSpacing: -0.6 }}>Visual primitives</h2>

      <VSRow label="Color">
        {[
          ['Primary', t.primary],
          ['Deep',    t.primaryDeep],
          ['Soft',    t.primarySoft],
          ['Accent',  t.accent],
          ['Text',    t.text],
          ['Text2',   t.text2],
          ['Surface', t.surface2],
          ['Border',  t.border],
        ].map(([name, hex]) => (
          <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 70 }}>
            <div style={{ width: 70, height: 50, borderRadius: 10, background: hex, border: `1px solid ${t.border}` }}/>
            <div style={{ fontSize: 11, fontWeight: 600 }}>{name}</div>
            <div style={{ fontSize: 10, fontFamily: FONT_MONO, color: t.text3 }}>{hex}</div>
          </div>
        ))}
      </VSRow>

      <VSRow label="Compatibility ring">
        <CompatRing value={94} size={56}/>
        <CompatRing value={78} size={56}/>
        <CompatRing value={62} size={56}/>
        <CompatRing value={41} size={56}/>
      </VSRow>

      <VSRow label="Chips">
        <Chip>Default</Chip>
        <Chip selected>Selected</Chip>
        <Chip variant="module">CS2040S</Chip>
        <Chip variant="outline">Outline</Chip>
        <Chip variant="solid">Solid</Chip>
      </VSRow>

      <VSRow label="Buttons">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
      </VSRow>

      <VSRow label="Avatars">
        <Avatar name="Joel Yap" size={40}/>
        <Avatar name="Rachel Tan" size={40}/>
        <Avatar name="Priya R" size={40}/>
        <Avatar name="Wei Ming" size={40}/>
        <Avatar name="Daniel L" size={40}/>
        <Avatar name="Joel Yap" size={56} radius="rect"/>
      </VSRow>

      <VSRow label="Badge tiers">
        <BadgeTier tier="Gold"/>
        <BadgeTier tier="Silver"/>
        <BadgeTier tier="Bronze"/>
      </VSRow>

      <VSRow label="Progress">
        <div style={{ width: '100%' }}><ProgressBar value={32}/></div>
      </VSRow>
      <VSRow label="">
        <div style={{ width: '100%' }}><ProgressBar value={78}/></div>
      </VSRow>
    </div>
  );
}

function VSRow({ label, children }) {
  const t = useTheme();
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>{children}</div>
    </div>
  );
}

Object.assign(window, { Brief, VisualSystem });
