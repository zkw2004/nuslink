// discover.jsx — Discover · People (feed + Hinge-style stack)

// Realistic NUS mock data
const PEOPLE = [
  {
    id: 1, name: 'Rachel Tan', major: 'Computer Science', year: 3, score: 94,
    bio: 'Building a study scheduler this sem. Strong on algorithms — happy to swap notes for tutorial help on systems.',
    modules: ['CS2040S', 'CS3230', 'CS2106', 'MA2001'],
    skills: ['Python', 'C++', 'Algorithms', 'Backend'],
    intent: 'Study groups',
    badge: 'Gold',
    overlap: 3, // shared modules
    mutuals: 4,
    workstyle: 'Structured · Async',
  },
  {
    id: 2, name: 'Daniel Lim', major: 'Business Analytics', year: 2, score: 87,
    bio: 'Looking for a CS-side teammate for Hack&Roll. I do dashboards + product. Coffee strictly post-2pm.',
    modules: ['BT2102', 'CS2030S', 'ST2334'],
    skills: ['SQL', 'Tableau', 'Product', 'Figma'],
    intent: 'Hackathons',
    badge: 'Silver',
    overlap: 1,
    mutuals: 2,
    workstyle: 'Flexible · In-person',
  },
  {
    id: 3, name: 'Priya Ramesh', major: 'Information Systems', year: 3, score: 82,
    bio: 'Need a CS3230 study group before midterms. Aiming A. Willing to teach in exchange for systems help.',
    modules: ['CS3230', 'IS3261', 'CS2106'],
    skills: ['Java', 'React', 'Spring', 'AWS'],
    intent: 'Study + Tutoring',
    badge: 'Silver',
    overlap: 2,
    mutuals: 1,
    workstyle: 'Structured · Async',
  },
  {
    id: 4, name: 'Wei Ming Chua', major: 'CS · AI specialisation', year: 4, score: 79,
    bio: 'FYP on RL. Open to NLP project teams. Will trade compute time for paper-reading partners.',
    modules: ['CS4248', 'CS5340', 'CS4243'],
    skills: ['PyTorch', 'NLP', 'Research', 'Linux'],
    intent: 'Project teams',
    badge: 'Bronze',
    overlap: 0,
    mutuals: 6,
    workstyle: 'Async · Deep work',
  },
];

// ─────────────────────────────────────────────────────────────
// FEED VARIANT — scrolling list of compact compat cards
// ─────────────────────────────────────────────────────────────
function DiscoverFeed({ dark }) {
  const t = useTheme();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: t.bgGradient }}>
      <AppTopBar title="NUSLink" unread={3}/>

      {/* Segmented Groups/People */}
      <div style={{ padding: '4px 20px 12px' }}>
        <div style={{
          display: 'flex', gap: 4, padding: 4, background: t.surface2, borderRadius: 12,
        }}>
          <SegButton>Groups</SegButton>
          <SegButton active>People</SegButton>
        </div>
      </div>

      {/* Filter row */}
      <div style={{
        padding: '0 20px 12px', display: 'flex', gap: 8, overflowX: 'auto',
      }}>
        <Chip size="md" icon={<Icon.filter size={14} color={t.text2}/>}>Filters</Chip>
        <Chip size="md" selected icon={<Icon.spark size={12} color={t.primaryDeep}/>}>High match</Chip>
        <Chip size="md">Same module</Chip>
        <Chip size="md">Year 3</Chip>
        <Chip size="md">Hackathon</Chip>
      </div>

      {/* Feed */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 96px' }}>
        <div style={{
          fontFamily: FONT_STACK, fontSize: 13, fontWeight: 600, color: t.text3,
          textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
        }}>Top matches near you</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {PEOPLE.map(p => <PersonFeedCard key={p.id} person={p}/>)}
        </div>
      </div>

      <BottomTabBar active="discover"/>
    </div>
  );
}

function SegButton({ children, active }) {
  const t = useTheme();
  return (
    <button style={{
      flex: 1, height: 36, borderRadius: 9, border: 'none',
      background: active ? t.bgRaised : 'transparent',
      color: active ? t.text : t.text3,
      fontFamily: FONT_STACK, fontSize: 14, fontWeight: 600, letterSpacing: -0.2,
      cursor: 'pointer',
      boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
    }}>{children}</button>
  );
}

function PersonFeedCard({ person }) {
  const t = useTheme();
  return (
    <div style={{
      background: t.bgRaised, borderRadius: 20,
      border: `1px solid ${t.border}`, overflow: 'hidden',
      boxShadow: t.shadow,
    }}>
      <div style={{ display: 'flex', gap: 14, padding: 14 }}>
        <div style={{ width: 84, height: 84, borderRadius: 16, overflow: 'hidden', flexShrink: 0 }}>
          <PhotoCard name={person.name} height={84} radius={16}/>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  fontFamily: FONT_STACK, fontSize: 17, fontWeight: 700, color: t.text,
                  letterSpacing: -0.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{person.name}</div>
                <BadgeTier tier={person.badge}/>
              </div>
              <div style={{
                fontFamily: FONT_STACK, fontSize: 13, color: t.text2, marginTop: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{person.major} · Y{person.year}</div>
            </div>
            <CompatRing value={person.score} size={48} stroke={4}/>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
            {person.modules.slice(0, 3).map(m => (
              <Chip key={m} size="sm" variant="module">{m}</Chip>
            ))}
            {person.modules.length > 3 && (
              <span style={{ fontFamily: FONT_STACK, fontSize: 11, color: t.text3, alignSelf: 'center' }}>+{person.modules.length - 3}</span>
            )}
          </div>
        </div>
      </div>

      <div style={{
        padding: '10px 14px',
        borderTop: `1px solid ${t.border}`,
        background: t.surface2,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT_STACK, fontSize: 12, color: t.text2 }}>
            <Icon.spark size={12} color={t.primary}/>
            {person.overlap} shared
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT_STACK, fontSize: 12, color: t.text2 }}>
            <Icon.people size={12} color={t.text3}/>
            {person.mutuals} mutual
          </span>
        </div>
        <Button variant="primary" size="sm">Connect</Button>
      </div>
    </div>
  );
}

function BadgeTier({ tier }) {
  if (!tier) return null;
  const map = { Gold: '#D4A437', Silver: '#A8A8AC', Bronze: '#B5723F' };
  const c = map[tier] || '#A8A8AC';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 7px 2px 6px', borderRadius: 999,
      background: c + '22', color: c,
      fontFamily: FONT_STACK, fontSize: 10, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
    }}>
      <Icon.star size={9} color={c}/>{tier}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STACK VARIANT — Hinge-style single-card with full bio
// ─────────────────────────────────────────────────────────────
function DiscoverStack({ dark }) {
  const t = useTheme();
  const p = PEOPLE[0];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: t.bgGradient, position: 'relative' }}>
      <AppTopBar title="Discover" unread={3}/>

      {/* Segmented */}
      <div style={{ padding: '4px 20px 8px' }}>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: t.surface2, borderRadius: 12 }}>
          <SegButton>Groups</SegButton>
          <SegButton active>People</SegButton>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 110px' }}>
        <PersonStackCard person={p}/>

        {/* Stack hint - peek of next card */}
        <div style={{
          marginTop: 10, height: 12, borderRadius: 18, background: t.bgRaised,
          border: `1px solid ${t.border}`, boxShadow: t.shadow, marginLeft: 16, marginRight: 16, opacity: 0.5,
        }}/>
        <div style={{
          marginTop: 4, height: 8, borderRadius: 18, background: t.bgRaised,
          border: `1px solid ${t.border}`, marginLeft: 28, marginRight: 28, opacity: 0.3,
        }}/>
      </div>

      {/* Floating action bar */}
      <div style={{
        position: 'absolute', bottom: 96, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 16, padding: '0 20px',
        zIndex: 8,
      }}>
        <CircBtn icon={<Icon.close size={22} color={t.text2}/>} bg={t.bgRaised} border={t.border}/>
        <CircBtn icon={<Icon.spark size={20} color="#fff"/>} bg={t.primary} size={64} elevated/>
        <CircBtn icon={<Icon.check size={22} color={t.success}/>} bg={t.bgRaised} border={t.border}/>
      </div>

      <BottomTabBar active="discover"/>
    </div>
  );
}

function CircBtn({ icon, bg, size = 54, border, elevated }) {
  return (
    <button style={{
      width: size, height: size, borderRadius: 999,
      background: bg, border: border ? `1px solid ${border}` : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: elevated
        ? '0 8px 24px rgba(15,17,21,0.35), 0 2px 6px rgba(15,17,21,0.2)'
        : '0 2px 8px rgba(20,28,46,0.08), 0 8px 24px rgba(20,28,46,0.06)',
    }}>{icon}</button>
  );
}

function PersonStackCard({ person }) {
  const t = useTheme();
  return (
    <div style={{
      background: t.bgRaised, borderRadius: 22,
      border: `1px solid ${t.border}`, overflow: 'hidden',
      boxShadow: t.shadowLg,
    }}>
      {/* Photo */}
      <div style={{ position: 'relative' }}>
        <PhotoCard name={person.name} height={260} radius={0} label={person.intent}/>
        {/* Compat ring overlay */}
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(255,255,255,0.95)', borderRadius: 999,
          padding: 4, backdropFilter: 'blur(10px)',
        }}>
          <CompatRing value={person.score} size={56} stroke={4.5}/>
        </div>
      </div>

      {/* Name block */}
      <div style={{ padding: '16px 18px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{
            margin: 0, fontFamily: FONT_STACK, fontSize: 22, fontWeight: 700,
            color: t.text, letterSpacing: -0.6,
          }}>{person.name}</h2>
          <BadgeTier tier={person.badge}/>
        </div>
        <div style={{ fontFamily: FONT_STACK, fontSize: 14, color: t.text2, marginTop: 2 }}>{person.major} · Y{person.year}</div>
      </div>

      {/* Bio */}
      <div style={{
        padding: '12px 18px',
        fontFamily: FONT_STACK, fontSize: 14, color: t.text, lineHeight: 1.5,
      }}>{person.bio}</div>

      {/* Compat breakdown — signature moment */}
      <div style={{ padding: '8px 18px 16px' }}>
        <div style={{
          fontFamily: FONT_STACK, fontSize: 11, fontWeight: 600, color: t.text3,
          textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
        }}>Why you match</div>
        <BreakdownBar label="Schedule overlap" value={88}/>
        <BreakdownBar label="Skills complement" value={72}/>
        <BreakdownBar label="Target grades" value={95}/>
        <BreakdownBar label="Working style" value={84}/>
      </div>

      {/* Modules */}
      <div style={{ padding: '0 18px 14px' }}>
        <div style={{
          fontFamily: FONT_STACK, fontSize: 11, fontWeight: 600, color: t.text3,
          textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
        }}>Modules · {person.overlap} shared</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {person.modules.map(m => (
            <Chip key={m} size="sm" variant="module">{m}</Chip>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div style={{ padding: '0 18px 18px' }}>
        <div style={{
          fontFamily: FONT_STACK, fontSize: 11, fontWeight: 600, color: t.text3,
          textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
        }}>Skills</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {person.skills.map(s => (
            <Chip key={s} size="sm" variant="outline">{s}</Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

function BreakdownBar({ label, value }) {
  const t = useTheme();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0',
    }}>
      <div style={{
        flex: '0 0 130px',
        fontFamily: FONT_STACK, fontSize: 12, color: t.text2,
      }}>{label}</div>
      <div style={{ flex: 1 }}>
        <ProgressBar value={value} height={5} color={value >= 80 ? t.primary : t.accent}/>
      </div>
      <div style={{
        flex: '0 0 32px', textAlign: 'right',
        fontFamily: FONT_MONO, fontSize: 11, color: t.text3,
      }}>{value}</div>
    </div>
  );
}

Object.assign(window, {
  DiscoverFeed, DiscoverStack, PEOPLE, BadgeTier,
});
