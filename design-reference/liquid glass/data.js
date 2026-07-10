/**
 * Sample data for the People feed. Replace with your API response.
 * `metaSignals` are the top 2–3 match reasons for THIS pair (see design report
 * §7) — the backend returns top_signals; map them to { icon, text } here.
 */

export const FILTERS = ["All modules", "CS2030S", "CS2040S", "CS2100", "MA1521"];

export const PEOPLE = [
  {
    id: "priya",
    name: "Priya Sharma",
    avatar: null, // { uri: "https://…" }
    degree: "Computer Science",
    year: "Year 2",
    isActive: true,
    activityLabel: "Active today",
    matchPct: 82,
    intentText: "Looking for a hackathon teammate",
    bio: "Enjoys sprint-style building — happy to pull all-nighters before deadlines. Big fan of clean UI and fast iteration.",
    modules: ["CS2040S", "CS2100"],
    skills: ["React Native", "Python"],
    metaSignals: [
      { icon: "🎯", text: "Same goal: hackathon" },
      { icon: "⚙️", text: "Both use React Native" },
      { icon: "🏠", text: "Same hall" },
    ],
  },
  {
    id: "john",
    name: "John Tan",
    avatar: null,
    degree: "Computer Science",
    year: "Year 1",
    isActive: false,
    activityLabel: "Active 2h ago",
    matchPct: 67,
    intentText: "Looking for a study group",
    bio: "First-year settling into CS. Prefers steady weekly sessions over last-minute cramming.",
    modules: ["CS2040S"],
    skills: ["Java", "Git"],
    metaSignals: [
      { icon: "📚", text: "Shared elective" },
      { icon: "💬", text: "Both prefer async" },
      { icon: "🏠", text: "Same hall" },
    ],
  },
  {
    id: "meixin",
    name: "Mei Xin Tan",
    avatar: null,
    degree: "Business Analytics",
    year: "Year 3",
    isActive: true,
    activityLabel: "Active today",
    matchPct: 61,
    intentText: "Looking for a project partner",
    bio: "Balancing data and design. Prefers async work and clear deadlines over long meetings.",
    modules: ["ST2334"],
    skills: ["Tableau", "SQL"],
    metaSignals: [
      { icon: "📚", text: "Shared elective" },
      { icon: "💬", text: "Both prefer async" },
      { icon: "🎾", text: "Both play tennis" },
    ],
  },
];
