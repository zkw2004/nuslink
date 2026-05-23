// onboarding.jsx — Five-screen first-run flow.

const STATUS_BAR_HEIGHT = 50;

// ─────────────────────────────────────────────────────────────
// OnboardingFrame — outer scaffold for all onboarding screens
// ─────────────────────────────────────────────────────────────
function OnboardingFrame({ step, total = 5, onBack, onSkip, children, footer, hideHeader, dark }) {
  const t = useTheme();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: t.bg }}>
      <div style={{ height: STATUS_BAR_HEIGHT, flexShrink: 0 }}/>
      {!hideHeader && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '8px 16px 12px',
        }}>
          <button onClick={onBack} style={{
            width: 36, height: 36, borderRadius: 999, border: 'none',
            background: 'transparent', color: t.text2, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon.back color={t.text2}/>
          </button>
          <div style={{ flex: 1, display: 'flex', gap: 4 }}>
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 4, borderRadius: 999,
                background: i < step ? t.primary : t.surface2,
                transition: 'background .3s',
              }}/>
            ))}
          </div>
          <button onClick={onSkip} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: t.text3, fontFamily: FONT_STACK, fontSize: 14, fontWeight: 600,
            padding: '8px 4px',
          }}>Skip</button>
        </div>
      )}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 24px 24px' }}>
        {children}
      </div>
      {footer && (
        <div style={{
          padding: '12px 20px 44px', background: t.bg,
          borderTop: `0.5px solid ${t.border}`,
        }}>{footer}</div>
      )}
    </div>
  );
}

function Title({ children, sub }) {
  const t = useTheme();
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{
        margin: 0, fontFamily: FONT_STACK, fontSize: 30, fontWeight: 700,
        color: t.text, letterSpacing: -0.9, lineHeight: 1.1,
      }}>{children}</h1>
      {sub && (
        <p style={{
          margin: '8px 0 0', fontFamily: FONT_STACK, fontSize: 15,
          color: t.text2, lineHeight: 1.45, letterSpacing: -0.1,
        }}>{sub}</p>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// SCREEN 1 — Sign Up / Welcome
// ═════════════════════════════════════════════════════════════
function OnboardingSignUp({ dark }) {
  const t = useTheme();
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: t.bg, padding: '0 28px',
    }}>
      <div style={{ height: STATUS_BAR_HEIGHT }}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Stacked chip illustration */}
        <div style={{ position: 'relative', height: 280, marginBottom: 12 }}>
          <div style={{ position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%) rotate(-7deg)' }}>
            <MiniCard name="Wei Ming" major="CS, Y3" score={92}/>
          </div>
          <div style={{ position: 'absolute', top: 30, left: '50%', transform: 'translateX(-50%) rotate(4deg)' }}>
            <MiniCard name="Priya R." major="DSA, Y2" score={87}/>
          </div>
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%) rotate(-2deg)' }}>
            <MiniCard name="Joel Y." major="CS, Y3" score={94} highlight/>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Logo size={36} variant="full"/>
          <h1 style={{
            margin: '8px 0 0', fontFamily: FONT_STACK, fontSize: 34, fontWeight: 700,
            color: t.text, letterSpacing: -1, textAlign: 'center', lineHeight: 1.05,
          }}>Find your<br/>study people.</h1>
          <p style={{
            margin: '6px 0 0', fontFamily: FONT_STACK, fontSize: 15, fontWeight: 400,
            color: t.text2, textAlign: 'center', maxWidth: 280, lineHeight: 1.45,
          }}>Built for NUS. Match with peers in your modules — by schedule, skill, and intent.</p>
        </div>
      </div>
      <div style={{ paddingBottom: 56, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button variant="primary" size="lg" full leading={
          <span style={{ width: 18, height: 18, borderRadius: 4, background: '#fff', color: t.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>N</span>
        }>Continue with NUS SSO</Button>
        <Button variant="secondary" size="lg" full>Use email instead</Button>
        <p style={{
          margin: '8px 0 0', textAlign: 'center', fontFamily: FONT_STACK,
          fontSize: 11, color: t.text3, lineHeight: 1.5,
        }}>By continuing you agree to the Terms<br/>and Privacy Policy.</p>
      </div>
    </div>
  );
}

function MiniCard({ name, major, score, highlight }) {
  const t = useTheme();
  return (
    <div style={{
      width: 230, padding: 12,
      background: t.bgRaised, borderRadius: 18,
      border: `1px solid ${t.border}`,
      boxShadow: highlight ? t.shadowLg : t.shadow,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <Avatar name={name} size={44} radius="rect"/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT_STACK, fontSize: 14, fontWeight: 600, color: t.text, letterSpacing: -0.2 }}>{name}</div>
        <div style={{ fontFamily: FONT_STACK, fontSize: 12, color: t.text3, marginTop: 2 }}>{major}</div>
      </div>
      <CompatRing value={score} size={42} stroke={3.5}/>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// SCREEN 2 — Academic Info
// ═════════════════════════════════════════════════════════════
function OnboardingAcademic({ dark }) {
  const t = useTheme();
  const modules = ['CS2040S', 'CS2103T', 'CS2106', 'MA1521', 'ST2334'];
  return (
    <OnboardingFrame step={1} total={4} footer={
      <Button variant="primary" size="lg" full trailing={<Icon.arrow size={18} color={t.onPrimary}/>}>Continue</Button>
    } dark={dark}>
      <Title sub="We've prefilled this from your NUS SSO. Edit anything that's off.">Your academics</Title>

      <SSOBadge/>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Faculty" value="School of Computing" trailing={<LockedIcon/>}/>
        <Field label="Major" value="Computer Science" trailing={<LockedIcon/>}/>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <YearPicker selected={3}/>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <label style={{ fontFamily: FONT_STACK, fontSize: 13, fontWeight: 600, color: t.text2 }}>This semester's modules</label>
          <span style={{ fontFamily: FONT_STACK, fontSize: 11, color: t.text3 }}>via NUSMods</span>
        </div>
        <Field placeholder="Search e.g. CS2040S" icon={<Icon.search color={t.text3}/>} value=""/>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {modules.map(m => <Chip key={m} variant="module" removable>{m}</Chip>)}
        </div>
      </div>
    </OnboardingFrame>
  );
}

function SSOBadge() {
  const t = useTheme();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', background: t.accentSoft,
      borderRadius: 12, marginBottom: 18,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, background: t.accent,
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontFamily: FONT_STACK,
      }}><Icon.check size={16} color="#fff"/></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT_STACK, fontSize: 13, fontWeight: 600, color: t.accent }}>NUS SSO verified</div>
        <div style={{ fontFamily: FONT_STACK, fontSize: 12, color: t.text2 }}>e0XXXXXX@u.nus.edu</div>
      </div>
    </div>
  );
}

function LockedIcon() {
  const t = useTheme();
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2.5" y="6.5" width="9" height="6" rx="1.5" stroke={t.text3} strokeWidth="1.3"/>
      <path d="M4.5 6.5V4.5a2.5 2.5 0 015 0v2" stroke={t.text3} strokeWidth="1.3"/>
    </svg>
  );
}

function YearPicker({ selected = 3 }) {
  const t = useTheme();
  return (
    <div>
      <label style={{ display: 'block', fontFamily: FONT_STACK, fontSize: 13, fontWeight: 600, color: t.text2, marginBottom: 6 }}>Year of study</label>
      <div style={{
        display: 'flex', gap: 4, padding: 4, background: t.surface2, borderRadius: 12,
      }}>
        {[1,2,3,4,5].map(y => (
          <button key={y} style={{
            flex: 1, height: 38, borderRadius: 9,
            background: y === selected ? t.bgRaised : 'transparent',
            color: y === selected ? t.text : t.text3,
            fontFamily: FONT_STACK, fontSize: 14, fontWeight: 600,
            border: 'none', cursor: 'pointer',
            boxShadow: y === selected ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          }}>Y{y}</button>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// SCREEN 3 — Profile Setup
// ═════════════════════════════════════════════════════════════
function OnboardingProfile({ dark }) {
  const t = useTheme();
  const bio = "CS Y3 building tools for students. Strong in algos + backend, learning systems. Looking for serious study partners & weekend hackathon folks.";
  return (
    <OnboardingFrame step={2} total={4} footer={
      <Button variant="primary" size="lg" full trailing={<Icon.arrow size={18} color={t.onPrimary}/>}>Continue</Button>
    } dark={dark}>
      <Title sub="A photo and a short bio help peers know who they're matching with.">Your profile</Title>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 120, height: 120, borderRadius: 28, overflow: 'hidden' }}>
            <PhotoCard name="Joel Y" height={120} radius={28}/>
          </div>
          <button style={{
            position: 'absolute', bottom: -4, right: -4,
            width: 38, height: 38, borderRadius: 999,
            border: `3px solid ${t.bg}`, background: t.primary, color: t.onPrimary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 3px 8px rgba(217,99,63,0.30)',
          }}><Icon.camera size={18} color={t.onPrimary}/></button>
        </div>
        <button style={{
          background: 'transparent', border: 'none', color: t.accent,
          fontFamily: FONT_STACK, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>Choose a photo</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Display name" value="Joel Yap"/>
        <Field
          label="Bio"
          value={bio}
          multiline rows={4}
          charCount={bio.length} maxChars={200}
          hint="What you're working on, what you're looking for."
        />
      </div>
    </OnboardingFrame>
  );
}

// ═════════════════════════════════════════════════════════════
// SCREEN 4 — Academic Interests
// ═════════════════════════════════════════════════════════════
function OnboardingInterests({ dark }) {
  const t = useTheme();
  const interests = [
    { id: 'aiml',     label: 'AI / ML',        selected: true },
    { id: 'systems',  label: 'Systems',        selected: false },
    { id: 'theory',   label: 'Theory & Algos', selected: true },
    { id: 'security', label: 'Security',       selected: false },
    { id: 'ds',       label: 'Data Science',   selected: true },
    { id: 'hci',      label: 'HCI / Design',   selected: false },
    { id: 'web',      label: 'Web & Mobile',   selected: true },
    { id: 'cv',       label: 'Computer Vision',selected: false },
    { id: 'nlp',      label: 'NLP',            selected: false },
    { id: 'graphics', label: 'Graphics',       selected: false },
    { id: 'robotics', label: 'Robotics',       selected: false },
    { id: 'fin',      label: 'Fintech',        selected: false },
  ];
  const selectedCount = interests.filter(i => i.selected).length;
  return (
    <OnboardingFrame step={3} total={4} footer={
      <div>
        <div style={{
          fontFamily: FONT_STACK, fontSize: 12, color: t.text3,
          textAlign: 'center', marginBottom: 8,
        }}>{selectedCount} selected · pick at least 1</div>
        <Button variant="primary" size="lg" full trailing={<Icon.arrow size={18} color={t.onPrimary}/>}>Continue</Button>
      </div>
    } dark={dark}>
      <Title sub="Pick the areas you care about. Matches surface peers who overlap.">What are you into?</Title>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {interests.map(i => (
          <Chip key={i.id} size="lg" selected={i.selected}>{i.label}</Chip>
        ))}
        <Chip size="lg" variant="outline" icon={<Icon.plus size={14} color={t.text3}/>}>Custom</Chip>
      </div>

      <div style={{
        marginTop: 12, padding: '14px 16px', background: t.bgRaised,
        borderRadius: 14, border: `1px solid ${t.border}`,
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <Icon.spark color={t.primary} size={18}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_STACK, fontSize: 13, fontWeight: 600, color: t.text }}>You can add custom tags later</div>
          <div style={{ fontFamily: FONT_STACK, fontSize: 12, color: t.text2, marginTop: 2, lineHeight: 1.4 }}>Niche interests like "competitive programming" or "embedded systems" help with hackathon matching.</div>
        </div>
      </div>
    </OnboardingFrame>
  );
}

// ═════════════════════════════════════════════════════════════
// SCREEN 5 — Intent Selection
// ═════════════════════════════════════════════════════════════
function OnboardingIntent({ dark }) {
  const t = useTheme();
  const intents = [
    { id: 'study',  label: 'Study groups',          desc: 'Find module-mates for revision, problem sets, projects.', selected: true },
    { id: 'hack',   label: 'Hackathons / comps',    desc: 'Build teams with complementary skills.', selected: true },
    { id: 'tutor',  label: 'Tutoring / TA',         desc: 'Offer help to juniors or find a tutor.', selected: false },
    { id: 'intern', label: 'Internship networking', desc: 'Connect with seniors and industry-bound peers.', selected: false },
  ];
  return (
    <OnboardingFrame step={4} total={4} footer={
      <Button variant="primary" size="lg" full trailing={<Icon.arrow size={18} color={t.onPrimary}/>}>Let's go</Button>
    } dark={dark}>
      <Title sub="Multi-select. This shapes which matches we surface first — you'll still see everything.">What brings you here?</Title>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {intents.map(i => (
          <IntentCard key={i.id} {...i}/>
        ))}
      </div>
    </OnboardingFrame>
  );
}

function IntentCard({ label, desc, selected }) {
  const t = useTheme();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px',
      background: selected ? t.primarySoft : t.bgRaised,
      borderRadius: 16,
      border: `1.5px solid ${selected ? t.primary : t.border}`,
      cursor: 'pointer',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 999,
        background: selected ? t.primary : 'transparent',
        border: `1.5px solid ${selected ? t.primary : t.borderStrong}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {selected && <Icon.check size={14} color={t.onPrimary}/>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT_STACK, fontSize: 15, fontWeight: 600, color: t.text, letterSpacing: -0.2 }}>{label}</div>
        <div style={{ fontFamily: FONT_STACK, fontSize: 13, color: t.text2, marginTop: 2, lineHeight: 1.35 }}>{desc}</div>
      </div>
    </div>
  );
}

Object.assign(window, {
  OnboardingSignUp, OnboardingAcademic, OnboardingProfile, OnboardingInterests, OnboardingIntent,
});
