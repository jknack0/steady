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
