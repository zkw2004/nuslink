/**
 * chatData — sample chat + thread + connected-people data (filler only).
 * Shared by ChatsScreen, ArchivedScreen, ChatThreadScreen, NewChatSheet.
 */

export const CHATS = [
  { id: "0", name: "Milk Tea Run 🧋", initials: "MT", avatarBg: ["#e8a0b8", "#b96f8f"], muted: true, read: false, time: "2:12 AM", preview: "Omg the queue was insane today, took me like 40 mins for one drink sia", badge: "183" },
  { id: "1", name: "Campus ConfessIt 📢", initials: "C!", avatarBg: ["#8a94c8", "#5a63a8"], muted: true, read: false, time: "1:53 AM", preview: "#Campus 🏫: Freshman seeking tips to run for union execomm this year", badge: "55" },
  { id: "2", name: "Hackers Guild", initials: "HG", avatarBg: ["#f0c14b", "#d99a2b"], muted: true, read: false, time: "1:30 AM", preview: "🚀 Unlock the full power of the new build pipeline — RSVP inside", badge: "161" },
  { id: "3", name: "Wei Jie", initials: "WJ", avatarBg: ["#7fa8c9", "#3b6688"], muted: false, read: true, time: "1:22 AM", preview: "I might wanna join the intramural game", badge: null },
  { id: "4", name: "Events Board 📌", initials: "EB", avatarBg: ["#a98ac8", "#7a4fa0"], muted: true, read: false, time: "1:20 AM", preview: "App Ambassador [$15/hr | Central | Start ASAP] 🤩 one week only…", badge: "2K" },
  { id: "5", name: "Marcus", initials: "MA", avatarBg: ["#6fb0e8", "#3a7fc8"], muted: false, read: false, time: "12:31 AM", preview: "Approved by my advisor. Left the admin side but should be sorted tmr", badge: null },
  { id: "6", name: "BizAd Batch Chat", initials: "BA", avatarBg: ["#f0846b", "#d1543b"], muted: true, read: false, time: "12:25 AM", preview: "Hi! Anyone who didn't manage to get a slot — drop your name here", badge: "3" },
  { id: "7", name: "Daniel", initials: "DN", avatarBg: ["#6f8a6a", "#3b5566"], muted: false, read: true, time: "12:11 AM", preview: "done", badge: null },
];

export const THREAD_MSGS = [
  { date: "Jul 13" },
  { mine: false, text: "wait so are we meeting this week?", time: "11:03 PM" },
  { date: "Jul 14" },
  { mine: true, text: "thurs or fri, you free?", time: "11:16 AM" },
  { mine: false, text: "yea fri can", time: "2:54 PM" },
  { mine: true, text: "have you been working on the features btw", time: "7:10 PM" },
  { mine: true, text: "should start soon", time: "7:10 PM" },
  { mine: false, text: "ok i'll start tmr", time: "9:22 PM" },
  { date: "Today" },
  { mine: false, text: "merge my PR when you can 🙏", time: "12:11 AM" },
  { mine: true, text: "done", time: "12:11 AM", read: true },
];

export const CONNECTED = [
  { name: "Adam Tan", sub: "Business Analytics · Year 1", initials: "AT", avatarBg: ["#e05a9b", "#b02f7a"], existing: true },
  { name: "Joel", sub: "Computer Science · Year 1", initials: "JO", avatarBg: ["#9aa4cc", "#6a74ac"], existing: true },
  { name: "Ryan Tan", sub: "Computer Science · Year 2", initials: "RT", avatarBg: ["#7fa8c9", "#3b6688"], existing: true },
  { name: "Zhang Kaiwen", sub: "Computer Science · Year 1", initials: "ZK", avatarBg: ["#7ab88a", "#3f8560"], existing: false },
  { name: "Nadia Rahman", sub: "Information Systems · Year 3", initials: "NR", avatarBg: ["#c98ac8", "#8a4fa0"], existing: false },
];
