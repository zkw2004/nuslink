// profile.jsx — Own profile screen with completion bar.

function ProfileScreen({ dark }) {
  const t = useTheme();
  const me = {
    name: 'Joel Yap',
    major: 'Computer Science',
    year: 3,
    bio: "CS Y3 building tools for students. Strong in algos + backend, learning systems. Looking for serious study partners & weekend hackathon folks.",
    completion: 78,
    badge: 'Silver',
    modules: ['CS2040S', 'CS2103T', 'CS2106', 'MA1521', 'ST2334'],
    interests: ['AI / ML', 'Theory & Algos', 'Data Science', 'Web & Mobile'],
    skills: ['Python', 'C++', 'React', 'PostgreSQL', 'Docker'],
    intent: ['Study groups', 'Hackathons'],
    connections: 47,
    rating: { reliability: 4.8, communication: 4.6, contribution: 4.7, total: 18 },
  };
  return (
    <div style={{ height: '100%', background: t.bgGradient, display: 'flex', flexDirection: 'column' }}>
      {/* Custom header: settings, no large title */}
      <div style={{
        paddingTop: 56, padding: '56px 16px 8px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'transparent', position: 'relative', zIndex: 5,
      }}>
        <span style={{
          fontFamily: FONT_STACK, fontSize: 22, fontWeight: 700,
          color: t.text, letterSpacing: -0.6, paddingLeft: 4,
        }}>Profile</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <IconBtn icon={<Icon.spark color={t.primary}/>}/>
          <IconBtn icon={<Icon.gear color={t.text}/>}/>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 100px' }}>
        {/* Identity block */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '8px 0 16px' }}>
          <div style={{ width: 84, height: 84, borderRadius: 20, overflow: 'hidden' }}>
            <PhotoCard name={me.name} height={84} radius={20}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{
                margin: 0, fontFamily: FONT_STACK, fontSize: 22, fontWeight: 700,
                color: t.text, letterSpacing: -0.6,
              }}>{me.name}</h2>
              <BadgeTier tier={me.badge}/>
            </div>
            <div style={{ fontFamily: FONT_STACK, fontSize: 14, color: t.text2, marginTop: 3 }}>{me.major} · Y{me.year}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <span style={{ fontFamily: FONT_STACK, fontSize: 12, color: t.text2 }}>
                <strong style={{ color: t.text, fontWeight: 700 }}>{me.connections}</strong> connections
              </span>
              <span style={{ color: t.text3 }}>·</span>
              <span style={{ fontFamily: FONT_STACK, fontSize: 12, color: t.text2 }}>
                <strong style={{ color: t.text, fontWeight: 700 }}>{me.rating.total}</strong> ratings
              </span>
            </div>
          </div>
        </div>

        {/* Profile completion — signature card */}
        <div style={{
          background: t.bgRaised, borderRadius: 18,
          border: `1px solid ${t.border}`, padding: '14px 16px',
          marginBottom: 16, boxShadow: t.shadow,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontFamily: FONT_STACK, fontSize: 14, fontWeight: 600, color: t.text }}>Profile completion</div>
            <div style={{
              fontFamily: FONT_STACK, fontSize: 18, fontWeight: 700, color: t.primary, letterSpacing: -0.4,
            }}>{me.completion}%</div>
          </div>
          <ProgressBar value={me.completion} height={6}/>
          <div style={{
            marginTop: 12, padding: '10px 12px',
            background: t.primarySoft, borderRadius: 12,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon.spark size={16} color={t.primaryDeep}/>
            <div style={{ flex: 1, fontFamily: FONT_STACK, fontSize: 12, color: t.primaryDeep, lineHeight: 1.4 }}>
              Add your timetable to improve schedule-overlap matches by ~30%.
            </div>
            <button style={{
              background: t.primary, color: t.onPrimary, border: 'none',
              padding: '6px 10px', borderRadius: 8, fontFamily: FONT_STACK,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
            }}>Add</button>
          </div>
        </div>

        {/* Bio card */}
        <SectionCard>
          <SectionHeader title="Bio" action="Edit"/>
          <p style={{
            margin: '4px 0 0', fontFamily: FONT_STACK, fontSize: 14,
            color: t.text, lineHeight: 1.5,
          }}>{me.bio}</p>
        </SectionCard>

        {/* Intent */}
        <SectionCard>
          <SectionHeader title="Here for" action="Edit"/>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {me.intent.map(i => (
              <Chip key={i} size="md" selected>{i}</Chip>
            ))}
          </div>
        </SectionCard>

        {/* Modules */}
        <SectionCard>
          <SectionHeader title={`This semester · ${me.modules.length}`} action="Manage"/>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {me.modules.map(m => (
              <Chip key={m} size="md" variant="module">{m}</Chip>
            ))}
          </div>
        </SectionCard>

        {/* Interests */}
        <SectionCard>
          <SectionHeader title="Interests" action="Edit"/>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {me.interests.map(i => (
              <Chip key={i} size="md" variant="outline">{i}</Chip>
            ))}
          </div>
        </SectionCard>

        {/* Skills */}
        <SectionCard>
          <SectionHeader title="Skills" action="Edit"/>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {me.skills.map(s => (
              <Chip key={s} size="md" variant="outline">{s}</Chip>
            ))}
          </div>
          <button style={{
            marginTop: 10, display: 'flex', alignItems: 'center', gap: 4,
            background: 'transparent', border: 'none', color: t.accent, cursor: 'pointer',
            fontFamily: FONT_STACK, fontSize: 13, fontWeight: 600,
          }}>
            <Icon.paperclip size={14} color={t.accent}/> Import from resume
          </button>
        </SectionCard>

        {/* Rating */}
        <SectionCard>
          <SectionHeader title="Reputation" action={`${me.rating.total} ratings`}/>
          <RatingRow label="Reliability"   value={me.rating.reliability}/>
          <RatingRow label="Communication" value={me.rating.communication}/>
          <RatingRow label="Contribution"  value={me.rating.contribution}/>
        </SectionCard>

        {/* Optional fields nudge */}
        <div style={{
          background: t.accentSoft, borderRadius: 16, padding: '12px 14px',
          marginTop: 16, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Icon.calendar size={20} color={t.accent}/>
          <div style={{ flex: 1, fontFamily: FONT_STACK, fontSize: 13, color: t.accent, lineHeight: 1.4 }}>
            Take the 2-min workstyle quiz to unlock complementary matching.
          </div>
          <Icon.arrow size={16} color={t.accent}/>
        </div>
      </div>

      <BottomTabBar active="profile"/>
    </div>
  );
}

function IconBtn({ icon, onClick }) {
  const t = useTheme();
  return (
    <button onClick={onClick} style={{
      width: 40, height: 40, borderRadius: 999, border: 'none',
      background: t.surface2, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{icon}</button>
  );
}

function SectionCard({ children }) {
  const t = useTheme();
  return (
    <div style={{
      background: t.bgRaised, borderRadius: 18,
      border: `1px solid ${t.border}`, padding: '14px 16px',
      marginBottom: 12,
    }}>{children}</div>
  );
}

function SectionHeader({ title, action }) {
  const t = useTheme();
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 10,
    }}>
      <div style={{
        fontFamily: FONT_STACK, fontSize: 11, fontWeight: 700, color: t.text3,
        textTransform: 'uppercase', letterSpacing: 0.6,
      }}>{title}</div>
      {action && (
        <button style={{
          background: 'transparent', border: 'none', color: t.accent, cursor: 'pointer',
          fontFamily: FONT_STACK, fontSize: 13, fontWeight: 600, padding: 0,
        }}>{action}</button>
      )}
    </div>
  );
}

function RatingRow({ label, value }) {
  const t = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
      <div style={{ flex: 1, fontFamily: FONT_STACK, fontSize: 13, color: t.text2 }}>{label}</div>
      <div style={{ display: 'flex', gap: 2 }}>
        {[1,2,3,4,5].map(i => (
          <Icon.star key={i} size={13} color={i <= Math.round(value) ? '#D4A437' : t.border}/>
        ))}
      </div>
      <div style={{
        flex: '0 0 28px', textAlign: 'right',
        fontFamily: FONT_MONO, fontSize: 12, color: t.text, fontWeight: 600,
      }}>{value.toFixed(1)}</div>
    </div>
  );
}

Object.assign(window, { ProfileScreen });
