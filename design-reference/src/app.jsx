// app.jsx — NUSLink design canvas: all screens with light/dark + match pattern tweaks.
// Brief / VisualSystem live in src/brief.jsx.

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

        {/* Logo exploration */}
        <DCSection id="logo" title="Logo" subtitle="5 directions for the app mark. Arc is recommended.">
          <DCArtboard id="logo-hero" label="Primary · Arc" width={460} height={874}>
            <LogoHero/>
          </DCArtboard>
          <DCArtboard id="logo-explore" label="All directions" width={520} height={874}>
            <LogoExploration/>
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

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<NUSLinkApp/>);
