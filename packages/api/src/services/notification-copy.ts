// Notification message templates with rotating copy

const MORNING_CHECKIN_MESSAGES = [
  { title: "Good morning! ☀️", body: "Take a moment to check in with yourself. How are you feeling today?" },
  { title: "Rise and shine! 🌅", body: "Start your day with a quick journal check-in." },
  { title: "New day, fresh start 🌱", body: "How regulated are you feeling? Open your journal to reflect." },
  { title: "Morning check-in 📝", body: "A few minutes of reflection can set the tone for your day." },
  { title: "Hey there! 👋", body: "Your daily check-in is waiting. How are you doing today?" },
];

const HOMEWORK_MESSAGES = [
  { title: "Homework reminder 📋", body: "You have homework to complete before your next session." },
  { title: "Don't forget! ✏️", body: "Your homework is waiting — you've got this!" },
  { title: "Quick reminder 💪", body: "Take a few minutes to work on your homework today." },
];

const SESSION_REMINDER_TEMPLATES = {
  "24h": { title: "Session tomorrow 📅", body: "You have a session scheduled for tomorrow." },
  "1h": { title: "Session in 1 hour ⏰", body: "Your session starts in about an hour. Get ready!" },
  "10min": { title: "Session starting soon 🔔", body: "Your session begins in 10 minutes." },
};

const TASK_MESSAGES = [
  { title: "Task reminder ✅", body: "You have a task due today: {taskTitle}" },
  { title: "Don't forget! 📌", body: "Your task \"{taskTitle}\" is due today." },
];

const WEEKLY_REVIEW_MESSAGES = [
  { title: "Weekly review time 📊", body: "Take a look at your progress this week. You might be surprised!" },
  { title: "Week in review 🔍", body: "How did your week go? Open your journal to reflect." },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getMorningCheckinCopy() {
  return pickRandom(MORNING_CHECKIN_MESSAGES);
}

export function getHomeworkCopy() {
  return pickRandom(HOMEWORK_MESSAGES);
}

export function getSessionReminderCopy(timing: "24h" | "1h" | "10min") {
  return SESSION_REMINDER_TEMPLATES[timing];
}

export function getTaskCopy(taskTitle: string) {
  const template = pickRandom(TASK_MESSAGES);
  return {
    title: template.title,
    body: template.body.replace("{taskTitle}", taskTitle),
  };
}

export function getWeeklyReviewCopy() {
  return pickRandom(WEEKLY_REVIEW_MESSAGES);
}

// ── Smart Escalation: Diagnostic Prompts ────────────
// Used after 3+ dismissals in 7 days — switches from
// cheerful reminders to empathetic, diagnostic prompts.

const DIAGNOSTIC_PROMPTS: Record<string, Array<{ title: string; body: string }>> = {
  MORNING_CHECKIN: [
    { title: "We noticed you've been quiet 💛", body: "No pressure — but if something feels off, your journal is a safe place to name it." },
    { title: "Just checking in", body: "It's okay if today is hard. Even noting that can help. Open when you're ready." },
  ],
  HOMEWORK: [
    { title: "Homework feeling heavy?", body: "If the assignments feel like too much, that's worth mentioning to your clinician." },
    { title: "No rush, but we're here", body: "If homework has been hard to get to, your clinician can help adjust the plan." },
  ],
  SESSION: [
    { title: "Your session is coming up", body: "If you're not sure about attending, it can still help to show up — even for 5 minutes." },
  ],
  TASK: [
    { title: "Tasks piling up?", body: "If your task list feels unmanageable, try picking just one small thing today." },
    { title: "One step at a time", body: "You don't have to do everything. What's one task that would feel good to finish?" },
  ],
  WEEKLY_REVIEW: [
    { title: "Your week, your pace", body: "Even a tough week has data in it. Take a glance when you're ready." },
  ],
};

export function getDiagnosticPromptCopy(category: string): { title: string; body: string } {
  const prompts = DIAGNOSTIC_PROMPTS[category];
  if (prompts && prompts.length > 0) {
    return pickRandom(prompts);
  }
  // Fallback
  return {
    title: "We're here for you 💛",
    body: "Take things at your own pace. Open the app whenever you're ready.",
  };
}
