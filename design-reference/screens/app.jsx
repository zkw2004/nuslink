// app.jsx — NUSLink design canvas: all screens with light/dark + match pattern tweaks.

const TWEAK_DEFAULS = /*EDITMODE-BEGIN*/{
  "mode": "light",
  "matchPattern": "feed"
}/*EDITMODE-END*/;

function NUSLinkApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULS);
  const dark = t.mode === 'dark';

  // Each artboard wraps an IOSDevice in a ThemeProvider so dark/light propagates.
  const wrap = (screen) => (
    <ThemeProvider mode={t.mode}>
      <IOSDevice dark={dark}>
        {screen}
      </IOSDevice>
    </ThemeProvider>
  );

  return (
    <React.Fragment>
      <DesignCanvas>
        {/* Direction statement / brief */}
        <DCSection id="brief" title="Direction" subtitle="What we're building and why.">
          <DCArtboard id="manifesto" label="Brief" width={520} height={874}>
            <Brief/>
          </DCArtboard>
          <DCArtboard id="system" label="Visual system" width={520} height={874}>
            <VisualSystem dark={dark}/>
          </DCArtboard>
        </DCSection>

        {/* Onboarding */}
        <DCSection id="onboarding" title="Onboarding" subtitle="5-screen first-run flow · under 3 minutes per spec §2.">
          <DCArtboard id="ob-1" label="1 · Welcome / SSO"        width={402} height={874}>{wrap(<OnboardingSignUp dark={dark}/>)}</DCArtboard>
          <DCArtboard id="ob-2" label="2 · Academic info"        width={402} height={874}>{wrap(<OnboardingAcademic dark={dark}/>)}</DCArtboard>
          <DCArtboard id="ob-3" label="3 · Profile setup"        width={402} height={874}>{wrap(<OnboardingProfile dark={dark}/>)}</DCArtboard>
          <DCArtboard id="ob-4" label="4 · Interests"            width={402} height={874}>{wrap(<OnboardingInterests dark={dark}/>)}</DCArtboard>
          <DCArtboard id="ob-5" label="5 · Intent"               width={402} height={874}>{wrap(<OnboardingIntent dark={dark}/>)}</DCArtboard>
        </DCSection>

        {/* Discover · People */}
        <DCSection id="discover" title="Discover · People" subtitle="Hero feature. Toggle pattern via Tweaks → feed (LinkedIn) or stack (Hinge).">
          <DCArtboard id="dc-current" label={t.matchPattern === 'stack' ? 'People · Stack (Hinge)' : 'People · Feed (LinkedIn)'} width={402} height={874}>
            {wrap(t.matchPattern === 'stack' ? <DiscoverStack dark={dark}/> : <DiscoverFeed dark={dark}/>)}
          </DCArtboard>
          <DCArtboard id="dc-other" label={t.matchPattern === 'stack' ? 'Alt: Feed' : 'Alt: Stack'} width={402} height={874}>
            {wrap(t.matchPattern === 'stack' ? <DiscoverFeed dark={dark}/> : <DiscoverStack dark={dark}/>)}
          </DCArtboard>
        </DCSection>

        {/* Profile */}
        <DCSection id="profile" title="Profile · Own" subtitle="Completion bar is the conversion lever — every section is one nudge.">
          <DCArtboard id="me" label="My profile" width={402} height={874}>{wrap(<ProfileScreen dark={dark}/>)}</DCArtboard>
        </DCSection>

        {/* Chat */}
        <DCSection id="chat" title="Chat thread" subtitle="Group chat — pin, poll, threaded replies, mid-thread system events.">
          <DCArtboard id="chat-1" label="CS2040S · DP Squad" width={402} height={874}>{wrap(<ChatScreen dark={dark}/>)}</DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Theme">
          <TweakRadio label="Mode" value={t.mode} options={[
            { value: 'light', label: 'Light' },
            { value: 'dark',  label: 'Dark' },
          ]} onChange={(v) => setTweak('mode', v)}/>
        </TweakSection>
        <TweakSection title="Discover pattern">
          <TweakRadio label="People view" value={t.matchPattern} options={[
            { value: 'feed',  label: 'Feed' },
            { value: 'stack', label: 'Stack' },
          ]} onChange={(v) => setTweak('matchPattern', v)}/>
          <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4, marginTop: 4 }}>
            Feed = LinkedIn-style scroll of compatibility cards. Stack = Hinge-style single-card swipe with full bio & breakdown.
          </div>
        </TweakSection>
      </TweaksPanel>
    </React.Fragment>
  );
}

// ─────────────────────────────────────────────────────────────
// Brief artboard — design direction statement, lives on the canvas
// ─────────────────────────────────────────────────────────────
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
      width: '100%', height: '100%', background: t.bg, padding: 32, boxSizing: 'border-box',
      fontFamily: FONT_STACK, color: t.text, overflow: 'auto',
    }}>
      <Logo size={28} variant="full"/>
      <div style={{
        marginTop: 28, fontSize: 13, fontWeight: 700, color: t.primary,
        textTransform: 'uppercase', letterSpacing: 1.2,
      }}>Design direction</div>
      <h1 style={{
        margin: '6px 0 18px', fontSize: 32, fontWeight: 700, letterSpacing: -1, lineHeight: 1.1,
      }}>Hinge UX, LinkedIn suit.</h1>
      <p style={{ margin: '0 0 14px', fontSize: 15, lineHeight: 1.55, color: t.text2 }}>
        Photo-anchored cards on a generous warm-white canvas. Muted NUS orange (<code style={{ background: t.surface2, padding: '1px 5px', borderRadius: 4, fontSize: 13, fontFamily: FONT_MONO }}>#EF7B45</code>) reserved strictly for primary actions and active states. Soft slate-blue (<code style={{ background: t.surface2, padding: '1px 5px', borderRadius: 4, fontSize: 13, fontFamily: FONT_MONO }}>#5B7BA3</code>) for informational chrome.
      </p>
      <p style={{ margin: '0 0 18px', fontSize: 15, lineHeight: 1.55, color: t.text2 }}>
        Sober and professional at rest, with one or two confident moments — the <strong style={{ color: t.text }}>compatibility ring</strong> and the <strong style={{ color: t.text }}>"why you match" breakdown</strong> on the people stack are the signature pieces.
      </p>

      <Divider/>

      <ColumnsRow>
        <Column title="Type">
          SF Pro / Inter fallback.<br/>
          34px display · 22px h2 · 17px body · 13px label.<br/>
          Tight tracking (-0.4 to -1).
        </Column>
        <Column title="Radii">
          Cards 18–22px<br/>
          Chips 999 (pill)<br/>
          Buttons 12–14px<br/>
          Avatars round inline, rect on cards
        </Column>
      </ColumnsRow>
      <ColumnsRow>
        <Column title="Density">
          Airy: 2/5. Generous 20–24px gutters. Whitespace earns trust on a serious app.
        </Column>
        <Column title="Photography">
          Gradient + monogram placeholders here. Production: NUS SSO avatar import → user-uploaded photo.
        </Column>
      </ColumnsRow>

      <Divider/>

      <div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: 1 }}>Patterns lifted from</div>
      <div style={{ marginTop: 6, fontSize: 14, color: t.text2, lineHeight: 1.6 }}>
        <strong style={{ color: t.text }}>Hinge</strong> — single-card photo-anchored profile, structured prompts, signal-over-noise. ·{' '}
        <strong style={{ color: t.text }}>LinkedIn</strong> — feed cadence, professional card chrome, badge tiers. ·{' '}
        <strong style={{ color: t.text }}>Slack</strong> — chat threads, pinned messages, inline polls.
      </div>

      <Divider/>

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

function Divider() { const t = useTheme(); return <div style={{ height: 1, background: t.border, margin: '18px 0' }}/>; }
function ColumnsRow({ children }) { return <div style={{ display: 'flex', gap: 18, marginTop: 14 }}>{children}</div>; }
function Column({ title, children }) {
  const t = useTheme();
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: t.text2 }}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// VisualSystem artboard — token swatches & primitives
// ─────────────────────────────────────────────────────────────
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
      width: '100%', height: '100%', background: t.bg, padding: 28, boxSizing: 'border-box',
      fontFamily: FONT_STACK, color: t.text, overflow: 'auto',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: t.primary, textTransform: 'uppercase', letterSpacing: 1.2 }}>System</div>
      <h2 style={{ margin: '4px 0 18px', fontSize: 24, fontWeight: 700, letterSpacing: -0.6 }}>Visual primitives</h2>

      {/* Color */}
      <SystemRow label="Color">
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
      </SystemRow>

      {/* Compat ring scale */}
      <SystemRow label="Compatibility ring">
        <CompatRing value={94} size={56}/>
        <CompatRing value={78} size={56}/>
        <CompatRing value={62} size={56}/>
        <CompatRing value={41} size={56}/>
      </SystemRow>

      {/* Chips */}
      <SystemRow label="Chips">
        <Chip>Default</Chip>
        <Chip selected>Selected</Chip>
        <Chip variant="module">CS2040S</Chip>
        <Chip variant="outline">Outline</Chip>
        <Chip variant="solid">Solid</Chip>
      </SystemRow>

      {/* Buttons */}
      <SystemRow label="Buttons">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
      </SystemRow>

      {/* Avatar variants */}
      <SystemRow label="Avatars">
        <Avatar name="Joel Yap" size={40}/>
        <Avatar name="Rachel Tan" size={40}/>
        <Avatar name="Priya R" size={40}/>
        <Avatar name="Wei Ming" size={40}/>
        <Avatar name="Daniel L" size={40}/>
        <Avatar name="Joel Yap" size={56} radius="rect"/>
      </SystemRow>

      {/* Badges */}
      <SystemRow label="Badge tiers">
        <BadgeTier tier="Gold"/>
        <BadgeTier tier="Silver"/>
        <BadgeTier tier="Bronze"/>
      </SystemRow>

      <SystemRow label="Progress">
        <div style={{ width: '100%' }}><ProgressBar value={32}/></div>
      </SystemRow>
      <SystemRow label="">
        <div style={{ width: '100%' }}><ProgressBar value={78}/></div>
      </SystemRow>
    </div>
  );
}

function SystemRow({ label, children }) {
  const t = useTheme();
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>{children}</div>
    </div>
  );
}

// Render
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<NUSLinkApp/>);
