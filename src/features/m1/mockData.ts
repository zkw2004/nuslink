export type ProfileBadgeTier = "New" | "Reliable" | "Trusted" | "Standout";

export type MockProfile = {
  name: string;
  major: string;
  year: number;
  bio: string;
  completion: number;
  badgeTier: ProfileBadgeTier;
  modules: string[];
  interests: string[];
  skills: string[];
  intents: string[];
  connections: number;
};

export type MockMatchPerson = {
  id: string;
  name: string;
  major: string;
  year: number;
  score: number;
  badgeTier: ProfileBadgeTier;
  bio: string;
  modules: string[];
  skills: string[];
  sharedModules: number;
  scheduleFit: string;
};

export const mockProfile: MockProfile = {
  name: "Kaiwen Zhang",
  major: "Computer Science",
  year: 2,
  bio: "Building tools that make student life smoother. Looking for serious module-mates who want structured revision, reliable communication, and teams that actually ship.",
  completion: 76,
  badgeTier: "Reliable",
  modules: ["CS2030S", "CS2040S", "MA2001", "IS1108"],
  interests: ["Systems", "AI / ML", "Web & Mobile", "Data Science"],
  skills: ["TypeScript", "React Native", "Python", "PostgreSQL"],
  intents: ["Study groups", "Project teams"],
  connections: 18,
};

export const mockDiscoverPeople: MockMatchPerson[] = [
  {
    id: "rachel-tan",
    name: "Rachel Tan",
    major: "Computer Science",
    year: 3,
    score: 94,
    badgeTier: "Standout",
    bio: "Looking for a CS2040S midterm squad. Strong in algorithms, very willing to share notes, and prefers consistent async check-ins.",
    modules: ["CS2040S", "CS2106", "MA2001"],
    skills: ["C++", "Algorithms", "Backend"],
    sharedModules: 2,
    scheduleFit: "3 free blocks overlap",
  },
  {
    id: "daniel-lim",
    name: "Daniel Lim",
    major: "Business Analytics",
    year: 2,
    score: 88,
    badgeTier: "Trusted",
    bio: "Taking CS2030S this term and looking for dependable peers to work through weekly labs with before deadlines start to stack.",
    modules: ["CS2030S", "BT2102", "ST2334"],
    skills: ["SQL", "Product", "Figma"],
    sharedModules: 1,
    scheduleFit: "Afternoons align well",
  },
  {
    id: "priya-ramesh",
    name: "Priya Ramesh",
    major: "Information Systems",
    year: 3,
    score: 83,
    badgeTier: "Reliable",
    bio: "Aiming for strong fundamentals this semester. Best fit for people who want a calm but accountable rhythm for revision and assignments.",
    modules: ["CS2040S", "IS2103", "CS2105"],
    skills: ["Java", "React", "AWS"],
    sharedModules: 1,
    scheduleFit: "2 evening slots match",
  },
];
