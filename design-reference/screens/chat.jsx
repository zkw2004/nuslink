// chat.jsx — Group chat thread (CS2040S study group).

function ChatScreen({ dark }) {
  const t = useTheme();
  return (
    <div style={{ height: '100%', background: t.bg, display: 'flex', flexDirection: 'column' }}>
      <ChatHeader/>
      <PinnedBanner/>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 12px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <DateDivider label="Today"/>

        <Message
          author="Rachel Tan"
          text="Anyone free to run through DP problems tonight? Stuck on the coin change variant from PS5."
          time="2:14 PM"
          score={94}
        />

        <Message
          author="Priya Ramesh"
          text="Yes! 7pm at CLB level 4? I have the worked solutions from last year's TA."
          time="2:18 PM"
        />

        <PollMessage
          author="Joel Yap"
          time="2:22 PM"
          question="When should we meet for the CS2040S midterm prep?"
          options={[
            { label: 'Tonight, 7-9 PM',     votes: 4, total: 6, voted: true },
            { label: 'Tomorrow, 2-4 PM',    votes: 1, total: 6 },
            { label: 'Saturday, 10 AM-12',  votes: 1, total: 6 },
            { label: "Can't make any",       votes: 0, total: 6 },
          ]}
        />

        <Message
          author="Daniel Lim"
          text="Cool. Bringing my whiteboard markers — CLB room often has dry ones."
          time="2:34 PM"
          replyTo={{ author: 'Priya Ramesh', text: '7pm at CLB level 4? I have the worked solutions…' }}
        />

        <ThreadedMessage
          author="Rachel Tan"
          text="Let's also cover greedy. Last year's paper had 2 greedy questions."
          time="2:41 PM"
          replies={3}
        />

        <SelfMessage text="Adding past-year papers to the shared resources now 📎" time="2:43 PM"/>

        <SystemMessage text="Joel shared 3 files to Resources"/>

        <Message
          author="Priya Ramesh"
          text="Saw the resources — the 2022 paper PDF has annotations from my old group. Should help."
          time="2:47 PM"
        />
      </div>

      <ChatInputBar/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
function ChatHeader() {
  const t = useTheme();
  return (
    <div style={{
      paddingTop: 50, padding: '50px 8px 10px',
      background: t.bgRaised, borderBottom: `0.5px solid ${t.border}`,
      display: 'flex', alignItems: 'center', gap: 6,
      position: 'relative', zIndex: 6,
    }}>
      <button style={{
        width: 36, height: 36, borderRadius: 999, border: 'none',
        background: 'transparent', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon.back color={t.text}/></button>
      <div style={{ width: 36, height: 36, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
        <PhotoCard name="CS Lions" height={36} radius={12}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT_STACK, fontSize: 15, fontWeight: 700, color: t.text,
          letterSpacing: -0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>CS2040S · DP Squad</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            width: 6, height: 6, borderRadius: 999, background: t.success,
          }}/>
          <span style={{ fontFamily: FONT_STACK, fontSize: 11, color: t.text2 }}>6 members · 3 online</span>
        </div>
      </div>
      <button style={{
        width: 36, height: 36, borderRadius: 999, border: 'none',
        background: 'transparent', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon.vert color={t.text2}/></button>
    </div>
  );
}

function PinnedBanner() {
  const t = useTheme();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 16px', background: t.primarySoft,
      borderBottom: `0.5px solid ${t.border}`,
    }}>
      <Icon.pin size={14} color={t.primaryDeep}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontFamily: FONT_STACK, fontSize: 12, color: t.primaryDeep, fontWeight: 600,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block',
        }}>📌 Midterm: Fri 5 Jun · COM1-0211 · bring laptop + PYP</span>
      </div>
      <span style={{ fontFamily: FONT_STACK, fontSize: 11, color: t.primaryDeep, opacity: 0.6 }}>2 pinned</span>
    </div>
  );
}

function DateDivider({ label }) {
  const t = useTheme();
  return (
    <div style={{
      alignSelf: 'center', padding: '4px 10px', borderRadius: 999,
      background: t.surface2, color: t.text3,
      fontFamily: FONT_STACK, fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
      margin: '4px 0',
    }}>{label}</div>
  );
}

function SystemMessage({ text }) {
  const t = useTheme();
  return (
    <div style={{
      alignSelf: 'center', padding: '4px 10px',
      fontFamily: FONT_STACK, fontSize: 11, color: t.text3, fontStyle: 'italic',
    }}>{text}</div>
  );
}

// ─────────────────────────────────────────────────────────────
function Message({ author, text, time, score, replyTo }) {
  const t = useTheme();
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <Avatar name={author} size={32}/>
      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3, paddingLeft: 4,
        }}>
          <span style={{ fontFamily: FONT_STACK, fontSize: 12, fontWeight: 600, color: t.text }}>{author}</span>
          {score && (
            <span style={{
              fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700, color: t.primaryDeep,
              padding: '1px 5px', borderRadius: 4, background: t.primarySoft,
            }}>{score}%</span>
          )}
          <span style={{ fontFamily: FONT_STACK, fontSize: 10, color: t.text3 }}>{time}</span>
        </div>
        <div style={{
          background: t.bubbleOther, color: t.text,
          padding: '8px 12px', borderRadius: 16, borderTopLeftRadius: 6,
          fontFamily: FONT_STACK, fontSize: 14, lineHeight: 1.4,
          border: `1px solid ${t.border}`,
        }}>
          {replyTo && (
            <div style={{
              borderLeft: `2.5px solid ${t.accent}`, paddingLeft: 8, marginBottom: 6,
              fontSize: 12,
            }}>
              <div style={{ color: t.accent, fontWeight: 600 }}>{replyTo.author}</div>
              <div style={{ color: t.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{replyTo.text}</div>
            </div>
          )}
          {text}
        </div>
      </div>
    </div>
  );
}

function SelfMessage({ text, time }) {
  const t = useTheme();
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ maxWidth: '78%' }}>
        <div style={{
          background: t.bubbleSelf, color: '#fff',
          padding: '8px 12px', borderRadius: 16, borderTopRightRadius: 6,
          fontFamily: FONT_STACK, fontSize: 14, lineHeight: 1.4,
        }}>{text}</div>
        <div style={{
          fontFamily: FONT_STACK, fontSize: 10, color: t.text3,
          textAlign: 'right', marginTop: 3, marginRight: 4,
        }}>{time} · Read</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
function PollMessage({ author, time, question, options }) {
  const t = useTheme();
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <Avatar name={author} size={32}/>
      <div style={{ maxWidth: '85%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3, paddingLeft: 4 }}>
          <span style={{ fontFamily: FONT_STACK, fontSize: 12, fontWeight: 600, color: t.text }}>{author}</span>
          <span style={{ fontFamily: FONT_STACK, fontSize: 10, color: t.text3 }}>{time}</span>
        </div>
        <div style={{
          background: t.bubbleOther, padding: 14, borderRadius: 16, borderTopLeftRadius: 6,
          border: `1px solid ${t.border}`, width: 280,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
          }}>
            <Icon.poll size={13} color={t.accent}/>
            <span style={{
              fontFamily: FONT_STACK, fontSize: 11, fontWeight: 700, color: t.accent,
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}>Poll · 6 voted</span>
          </div>
          <div style={{
            fontFamily: FONT_STACK, fontSize: 14, fontWeight: 600, color: t.text,
            marginBottom: 10, lineHeight: 1.35,
          }}>{question}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {options.map((o, i) => <PollOption key={i} {...o}/>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function PollOption({ label, votes, total, voted }) {
  const t = useTheme();
  const pct = total > 0 ? (votes / total) * 100 : 0;
  return (
    <div style={{
      position: 'relative', borderRadius: 10, overflow: 'hidden',
      background: t.surface2, height: 34,
      border: voted ? `1.5px solid ${t.primary}` : `1px solid ${t.border}`,
    }}>
      <div style={{
        position: 'absolute', inset: 0, width: `${pct}%`,
        background: voted ? t.primarySoft : t.accentSoft,
        transition: 'width .3s',
      }}/>
      <div style={{
        position: 'relative', height: '100%', padding: '0 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {voted && <Icon.check size={12} color={t.primary}/>}
          <span style={{
            fontFamily: FONT_STACK, fontSize: 13,
            color: voted ? t.primaryDeep : t.text,
            fontWeight: voted ? 600 : 500,
          }}>{label}</span>
        </div>
        <span style={{
          fontFamily: FONT_MONO, fontSize: 11,
          color: voted ? t.primaryDeep : t.text2, fontWeight: 600,
        }}>{votes}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
function ThreadedMessage({ author, text, time, replies }) {
  const t = useTheme();
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <Avatar name={author} size={32}/>
      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3, paddingLeft: 4 }}>
          <span style={{ fontFamily: FONT_STACK, fontSize: 12, fontWeight: 600, color: t.text }}>{author}</span>
          <span style={{ fontFamily: FONT_STACK, fontSize: 10, color: t.text3 }}>{time}</span>
        </div>
        <div style={{
          background: t.bubbleOther, color: t.text,
          padding: '8px 12px', borderRadius: 16, borderTopLeftRadius: 6,
          fontFamily: FONT_STACK, fontSize: 14, lineHeight: 1.4,
          border: `1px solid ${t.border}`,
        }}>{text}</div>
        <button style={{
          alignSelf: 'flex-start', marginTop: 4, marginLeft: 8,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px 4px 6px', borderRadius: 999,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: t.accent, fontFamily: FONT_STACK, fontSize: 12, fontWeight: 600,
        }}>
          <div style={{ display: 'flex', marginRight: 2 }}>
            <Avatar name="Daniel L" size={18} style={{ marginRight: -6, border: `1.5px solid ${t.bg}` }}/>
            <Avatar name="Priya R" size={18} style={{ marginRight: -6, border: `1.5px solid ${t.bg}` }}/>
            <Avatar name="Wei Ming" size={18} style={{ border: `1.5px solid ${t.bg}` }}/>
          </div>
          {replies} replies <Icon.arrow size={12} color={t.accent}/>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
function ChatInputBar() {
  const t = useTheme();
  return (
    <div style={{
      padding: '8px 12px 34px',
      background: t.bgRaised,
      borderTop: `0.5px solid ${t.border}`,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <button style={{
        width: 40, height: 40, borderRadius: 999, border: 'none',
        background: t.surface2, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon.plus size={22} color={t.text2}/></button>
      <div style={{
        flex: 1, height: 40, borderRadius: 20,
        background: t.surface2, padding: '0 14px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ flex: 1, fontFamily: FONT_STACK, fontSize: 14, color: t.text3 }}>Message DP Squad…</div>
        <Icon.poll size={18} color={t.text3}/>
      </div>
      <button style={{
        width: 40, height: 40, borderRadius: 999, border: 'none',
        background: t.primary, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 6px rgba(217,99,63,0.25)',
      }}><Icon.send size={20} color={t.onPrimary} fill={t.onPrimary}/></button>
    </div>
  );
}

Object.assign(window, { ChatScreen });
