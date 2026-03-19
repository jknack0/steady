import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

async function main() {
  // ── 0. Clean up old data ──────────────────────────────────
  // Delete old users that may exist with wrong roles from previous seeds
  for (const email of ["admin@admin.com", "test@test.com", "clinician@steady.dev", "jo@jo.com"]) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Delete in dependency order
      const enrollments = await prisma.enrollment.findMany({ where: { participant: { userId: existing.id } } });
      for (const e of enrollments) {
        await prisma.partProgress.deleteMany({ where: { enrollmentId: e.id } });
        await prisma.moduleProgress.deleteMany({ where: { enrollmentId: e.id } });
        await prisma.session.deleteMany({ where: { enrollmentId: e.id } });
      }
      await prisma.enrollment.deleteMany({ where: { participant: { userId: existing.id } } });
      // Also delete enrollments in programs owned by this user
      const programs = await prisma.program.findMany({ where: { clinician: { userId: existing.id } } });
      for (const p of programs) {
        const pEnrollments = await prisma.enrollment.findMany({ where: { programId: p.id } });
        for (const e of pEnrollments) {
          await prisma.partProgress.deleteMany({ where: { enrollmentId: e.id } });
          await prisma.moduleProgress.deleteMany({ where: { enrollmentId: e.id } });
          await prisma.session.deleteMany({ where: { enrollmentId: e.id } });
        }
        await prisma.enrollment.deleteMany({ where: { programId: p.id } });
      }
      await prisma.program.deleteMany({ where: { clinician: { userId: existing.id } } });
      await prisma.task.deleteMany({ where: { participant: { userId: existing.id } } });
      await prisma.calendarEvent.deleteMany({ where: { participant: { userId: existing.id } } });
      await prisma.journalEntry.deleteMany({ where: { participant: { userId: existing.id } } });
      await prisma.participantProfile.deleteMany({ where: { userId: existing.id } });
      await prisma.clinicianProfile.deleteMany({ where: { userId: existing.id } });
      await prisma.notificationPreference.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }
  }

  // ── 1. Create admin user (program owner / clinician) ──────
  const passwordHash = await bcrypt.hash("Admin1", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@admin.com" },
    update: { passwordHash },
    create: {
      email: "admin@admin.com",
      passwordHash,
      firstName: "Admin",
      lastName: "User",
      role: "CLINICIAN",
      clinicianProfile: {
        create: {
          practiceName: "STEADY with ADHD",
          licenseType: "PhD",
        },
      },
    },
    include: { clinicianProfile: true },
  });

  // ── 2. Create participant (test@test.com) ─────────────────
  const testPasswordHash = await bcrypt.hash("Test1", 12);

  const testParticipant = await prisma.user.upsert({
    where: { email: "test@test.com" },
    update: { passwordHash: testPasswordHash },
    create: {
      email: "test@test.com",
      passwordHash: testPasswordHash,
      firstName: "Test",
      lastName: "User",
      role: "PARTICIPANT",
      participantProfile: {
        create: {
          timezone: "America/New_York",
          onboardingCompleted: true,
        },
      },
    },
    include: { participantProfile: true },
  });

  // ── 2b. Create clinician Jo (jo@jo.com) ─────────────────
  const joPasswordHash = await bcrypt.hash("Jo1", 12);

  const joClinician = await prisma.user.upsert({
    where: { email: "jo@jo.com" },
    update: { passwordHash: joPasswordHash },
    create: {
      email: "jo@jo.com",
      passwordHash: joPasswordHash,
      firstName: "Jo",
      lastName: "Rivera",
      role: "CLINICIAN",
      clinicianProfile: {
        create: {
          practiceName: "Rivera ADHD Therapy",
          licenseType: "LCSW",
        },
      },
    },
    include: { clinicianProfile: true },
  });

  // ── 3. Create the "Steady with ADHD" program ─────────────
  // Delete existing program with this title to allow re-seeding
  await prisma.program.deleteMany({
    where: {
      title: "Steady with ADHD",
      clinicianId: admin.clinicianProfile!.id,
    },
  });

  const program = await prisma.program.create({
    data: {
      clinicianId: admin.clinicianProfile!.id,
      title: "Steady with ADHD",
      description:
        "A comprehensive 8-week program designed to help adults with ADHD develop sustainable strategies for focus, emotional regulation, time management, and daily productivity.",
      cadence: "WEEKLY",
      enrollmentMethod: "INVITE",
      sessionType: "ONE_ON_ONE",
      status: "PUBLISHED",
    },
  });

  // ── 4. Seed modules & parts ───────────────────────────────

  // Helper to create a module with its parts
  async function createModule(
    sortOrder: number,
    moduleData: { title: string; subtitle?: string; summary?: string; estimatedMinutes?: number },
    parts: { type: string; title: string; isRequired?: boolean; content: any }[]
  ) {
    const mod = await prisma.module.create({
      data: {
        programId: program.id,
        sortOrder,
        title: moduleData.title,
        subtitle: moduleData.subtitle,
        summary: moduleData.summary,
        estimatedMinutes: moduleData.estimatedMinutes,
        unlockRule: sortOrder === 0 ? "SEQUENTIAL" : "SEQUENTIAL",
      },
    });

    for (let i = 0; i < parts.length; i++) {
      await prisma.part.create({
        data: {
          moduleId: mod.id,
          type: parts[i].type as any,
          title: parts[i].title,
          sortOrder: i,
          isRequired: parts[i].isRequired ?? true,
          content: parts[i].content,
        },
      });
    }

    return mod;
  }

  // ── Module 1: Welcome & Intake ────────────────────────────
  const mod1 = await createModule(
    0,
    {
      title: "Welcome & Intake",
      subtitle: "Getting Started",
      summary: "Complete your intake assessment and learn what to expect from the Steady with ADHD program.",
      estimatedMinutes: 30,
    },
    [
      {
        type: "TEXT",
        title: "Welcome to Steady with ADHD",
        content: {
          type: "TEXT",
          body: "Welcome to the Steady with ADHD program! This program is designed specifically for adults living with ADHD who want to build sustainable strategies for managing their symptoms and thriving in daily life.\n\nOver the next 8 weeks, you'll work through modules covering focus, emotional regulation, time management, productivity, and more. Each module includes educational content, practical strategies, and homework to help you apply what you learn.\n\nHere's what you can expect:\n\n• **Weekly modules** with bite-sized content you can complete at your own pace\n• **Strategy cards** with practical techniques you can use right away\n• **Journal prompts** to reflect on your progress\n• **Homework assignments** to practice new skills\n• **Regular check-ins** with your clinician\n\nTake your time with each module — there's no rush. The goal is sustainable change, not perfection.",
        },
      },
      {
        type: "INTAKE_FORM",
        title: "Initial Intake Assessment",
        content: {
          type: "INTAKE_FORM",
          title: "ADHD Background & Goals",
          instructions: "Please complete this intake form so your clinician can tailor the program to your needs. All responses are confidential.",
          sections: ["Background", "Current Challenges", "Goals"],
          fields: [
            { label: "When were you diagnosed with ADHD?", type: "TEXT", placeholder: "e.g., Age 25, 2019", required: true, section: "Background", sortOrder: 0 },
            { label: "ADHD subtype (if known)", type: "SELECT", options: ["Predominantly Inattentive", "Predominantly Hyperactive-Impulsive", "Combined", "Not sure"], required: false, section: "Background", sortOrder: 1 },
            { label: "Are you currently on ADHD medication?", type: "SELECT", options: ["Yes", "No", "Previously but not currently"], required: true, section: "Background", sortOrder: 2 },
            { label: "What are your biggest daily challenges related to ADHD?", type: "TEXTAREA", placeholder: "Describe the areas where ADHD impacts you most...", required: true, section: "Current Challenges", sortOrder: 3 },
            { label: "Rate your current ability to manage focus (1-10)", type: "NUMBER", required: true, section: "Current Challenges", sortOrder: 4 },
            { label: "Rate your current emotional regulation (1-10)", type: "NUMBER", required: true, section: "Current Challenges", sortOrder: 5 },
            { label: "What do you hope to achieve through this program?", type: "TEXTAREA", placeholder: "What would success look like for you?", required: true, section: "Goals", sortOrder: 6 },
            { label: "Is there anything else your clinician should know?", type: "TEXTAREA", required: false, section: "Goals", sortOrder: 7 },
          ],
        },
      },
      {
        type: "CHECKLIST",
        title: "Getting Started Checklist",
        content: {
          type: "CHECKLIST",
          items: [
            { text: "Read the welcome message", sortOrder: 0 },
            { text: "Complete the intake form", sortOrder: 1 },
            { text: "Set up notification preferences", sortOrder: 2 },
            { text: "Block 30 minutes per week in your calendar for this program", sortOrder: 3 },
            { text: "Identify a quiet space where you can do your weekly modules", sortOrder: 4 },
          ],
        },
      },
    ]
  );

  // ── Module 2: Understanding Your ADHD Brain ───────────────
  const mod2 = await createModule(
    1,
    {
      title: "Understanding Your ADHD Brain",
      subtitle: "Week 1",
      summary: "Learn how the ADHD brain works differently and why traditional productivity advice often falls short.",
      estimatedMinutes: 40,
    },
    [
      {
        type: "TEXT",
        title: "How the ADHD Brain Works",
        content: {
          type: "TEXT",
          body: "ADHD is fundamentally a difference in how the brain regulates attention, motivation, and executive function. Understanding this is the foundation for everything else in this program.\n\n**The Dopamine Connection**\nThe ADHD brain has differences in dopamine regulation — the neurotransmitter responsible for motivation, reward, and focus. This isn't a character flaw; it's neurobiology. When a task doesn't provide enough stimulation, the ADHD brain struggles to engage — not because you're lazy, but because the neurochemical reward system works differently.\n\n**Executive Function Challenges**\nExecutive functions are the brain's management system. They include:\n• **Working memory** — holding information in mind while using it\n• **Cognitive flexibility** — shifting between tasks or perspectives\n• **Inhibitory control** — stopping impulses and filtering distractions\n• **Planning & organization** — breaking goals into steps\n• **Time perception** — estimating and tracking time\n\nWith ADHD, these functions are inconsistent — not absent. You might excel at planning a vacation but struggle to plan your workday. This inconsistency is a hallmark of ADHD.\n\n**Interest-Based Nervous System**\nDr. William Dodson describes the ADHD motivation system as \"interest-based\" rather than \"importance-based.\" You're motivated by:\n• **Novelty** — new and stimulating things\n• **Challenge** — competitive or urgent situations\n• **Interest** — things that genuinely fascinate you\n• **Urgency** — deadlines and time pressure\n\nUnderstanding this helps explain why you can hyperfocus on a hobby for 6 hours but can't start a 15-minute work task.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Reframing ADHD Challenges",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "ADHD Reframes",
          cards: [
            { title: "Not Lazy — Understimulated", body: "When you can't start a task, your brain isn't getting enough dopamine from it. Try adding music, body doubling, or a small reward to boost stimulation.", emoji: "🧠" },
            { title: "Not Forgetful — Overloaded", body: "Your working memory is juggling too much. Externalize your thoughts: write it down, set reminders, use visual cues.", emoji: "📝" },
            { title: "Not Disorganized — Differently Organized", body: "Standard organization systems often fail for ADHD brains. Build systems around visibility — if you can't see it, it doesn't exist.", emoji: "👁️" },
            { title: "Not Inconsistent — Interest-Driven", body: "Your motivation follows interest and novelty, not importance. Work with this by rotating tasks, gamifying boring ones, or pairing them with something enjoyable.", emoji: "🎯" },
            { title: "Not Oversensitive — Deeply Feeling", body: "Emotional intensity is part of ADHD. Rejection Sensitive Dysphoria (RSD) is real. Recognize the pattern: strong emotion → pause → respond (not react).", emoji: "💛" },
          ],
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Reflect: Your ADHD Story",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "What was your reaction to learning about the interest-based nervous system? Does it resonate with your experience?",
            "Think of a time when you hyperfocused on something. What made that activity so engaging?",
            "What's one area of your life where you'd most like to see improvement through this program?",
          ],
          spaceSizeHint: "large",
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 1 Homework",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Track your energy and focus levels 3 times per day (morning, afternoon, evening) for the next week. Use a simple 1-5 scale. Note what you were doing and how engaged you felt." },
            { type: "JOURNAL_PROMPT", description: "At the end of each day, write 2-3 sentences about what went well and what was hard. Look for ADHD-related patterns." },
            { type: "BRING_TO_SESSION", description: "Bring your energy/focus tracking notes to your next session. We'll use them to identify your peak performance windows." },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 3: Focus & Attention Strategies ────────────────
  const mod3 = await createModule(
    2,
    {
      title: "Focus & Attention Strategies",
      subtitle: "Week 2",
      summary: "Practical techniques for managing attention, reducing distractions, and working with your brain's natural rhythms.",
      estimatedMinutes: 45,
    },
    [
      {
        type: "TEXT",
        title: "Working With Your Attention",
        content: {
          type: "TEXT",
          body: "Attention in ADHD isn't broken — it's dysregulated. You have plenty of attention; the challenge is directing it intentionally. This module gives you concrete strategies to work with your brain's natural patterns.\n\n**The Attention Spectrum**\nADHD attention isn't binary (focused vs. unfocused). It exists on a spectrum:\n• **Hyperfocus** — deep, consuming engagement (hard to stop)\n• **Flow state** — engaged, productive, time flies\n• **Normal attention** — adequate focus with some drift\n• **Scattered attention** — jumping between things, restless\n• **Attention shutdown** — unable to engage at all, foggy\n\nYour goal isn't to be in hyperfocus all the time — it's to spend more time in the flow-to-normal range and have tools for when you're scattered.\n\n**Your Peak Performance Windows**\nUsing last week's energy tracking data, you likely noticed patterns. Most people with ADHD have 2-3 hours of peak cognitive performance per day. The key insight: **protect those hours ruthlessly** for your most important work.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Focus Techniques",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Focus Toolkit",
          cards: [
            { title: "The Pomodoro Remix", body: "Traditional 25-min Pomodoros are too rigid for ADHD. Try flexible intervals: work until you feel restless (10-45 min), then take a 5-min break. Track your natural rhythm over a week.", emoji: "🍅" },
            { title: "Body Doubling", body: "Working alongside someone (in person or virtually) provides just enough external accountability and stimulation to keep going. Try FocusMate or ask a friend to co-work.", emoji: "👥" },
            { title: "Environment Design", body: "Remove friction from starting: keep your workspace ready, browser tabs closed, phone in another room. Make the right thing the easy thing.", emoji: "🏠" },
            { title: "The 2-Minute Bridge", body: "Can't start a big task? Commit to just 2 minutes. The hardest part is starting — once you're in motion, momentum often carries you forward.", emoji: "🌉" },
            { title: "Novelty Injection", body: "When a task gets stale: change your location, switch to a different tool, add background music, use a different color pen, or race a timer.", emoji: "✨" },
            { title: "Task Batching", body: "Group similar small tasks together (all emails, all phone calls, all admin). Switching between task types costs extra energy with ADHD.", emoji: "📦" },
          ],
        },
      },
      {
        type: "ASSESSMENT",
        title: "Focus Patterns Self-Assessment",
        content: {
          type: "ASSESSMENT",
          title: "Focus Patterns Self-Assessment",
          instructions: "Rate each statement based on your typical experience over the past week.",
          scoringEnabled: true,
          questions: [
            { question: "I can start tasks without excessive procrastination", type: "LIKERT", likertMin: 1, likertMax: 5, required: true, sortOrder: 0 },
            { question: "I can maintain focus on a task for at least 20 minutes", type: "LIKERT", likertMin: 1, likertMax: 5, required: true, sortOrder: 1 },
            { question: "I can resist checking my phone while working", type: "LIKERT", likertMin: 1, likertMax: 5, required: true, sortOrder: 2 },
            { question: "I can transition between tasks without losing significant time", type: "LIKERT", likertMin: 1, likertMax: 5, required: true, sortOrder: 3 },
            { question: "I can identify when I'm in a hyperfocus spiral and choose to disengage", type: "LIKERT", likertMin: 1, likertMax: 5, required: true, sortOrder: 4 },
            { question: "What's your biggest focus challenge right now?", type: "FREE_TEXT", required: true, sortOrder: 5 },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 2 Homework",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Try the 2-Minute Bridge technique at least 3 times this week when you're struggling to start a task. Note whether momentum carried you forward." },
            { type: "ACTION", description: "Identify your peak performance window and protect it for 3 days this week — no meetings, no email, just focused work." },
            { type: "ACTION", description: "Try body doubling (virtual or in-person) for at least one work session." },
            { type: "JOURNAL_PROMPT", description: "Which focus technique resonated most with you? Why do you think it fits your brain?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "EVERY_OTHER_DAY",
        },
      },
    ]
  );

  // ── Module 4: Emotional Regulation ────────────────────────
  const mod4 = await createModule(
    3,
    {
      title: "Emotional Regulation",
      subtitle: "Week 3",
      summary: "Understand the emotional side of ADHD — from rejection sensitivity to emotional flooding — and build your regulation toolkit.",
      estimatedMinutes: 40,
    },
    [
      {
        type: "TEXT",
        title: "The Emotional Side of ADHD",
        content: {
          type: "TEXT",
          body: "Emotional dysregulation is one of the most impactful — and least talked about — aspects of ADHD. Research shows that up to 70% of adults with ADHD experience significant emotional regulation challenges.\n\n**Why Emotions Hit Harder with ADHD**\nThe same executive function differences that affect attention also affect emotional processing:\n• **Intensity** — Emotions are felt more strongly and rapidly\n• **Impulsivity** — Less time between feeling and reacting\n• **Rumination** — Difficulty letting go of negative emotions\n• **Rejection Sensitive Dysphoria (RSD)** — Extreme emotional pain from perceived rejection or criticism\n\n**The Emotional Flooding Cycle**\n1. A trigger occurs (criticism, failure, perceived rejection)\n2. Emotion hits at full intensity within seconds\n3. Executive function goes offline — can't think clearly\n4. Reactive behavior (snapping, withdrawing, spiraling)\n5. Shame and self-criticism follow\n6. The cycle reinforces itself\n\n**Breaking the Cycle**\nThe goal isn't to stop feeling emotions — it's to create a gap between the feeling and your response. Even a 10-second pause can be transformative.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Emotional Regulation Toolkit",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Emotion Regulation",
          cards: [
            { title: "The STOP Technique", body: "Stop what you're doing. Take 3 deep breaths. Observe what you're feeling (name it). Proceed with intention. This 30-second practice creates the gap between emotion and action.", emoji: "🛑" },
            { title: "Name It to Tame It", body: "When you feel emotional flooding, literally say (or think) the name of the emotion: 'I'm feeling rejected' or 'This is frustration.' Naming activates the prefrontal cortex and reduces amygdala intensity.", emoji: "🏷️" },
            { title: "The RSD Reality Check", body: "When you feel intense rejection, ask: 'What's the evidence? What would I tell a friend? Will this matter in a week?' RSD makes perceived rejection feel like actual rejection — the feeling is real, but the interpretation may not be.", emoji: "🔍" },
            { title: "Sensory Reset", body: "When emotions overwhelm, engage your senses: hold ice, splash cold water on your face, listen to a specific song, do 10 jumping jacks. Physical sensation interrupts emotional spirals.", emoji: "❄️" },
            { title: "The Emotional Buffer", body: "Before situations that trigger you (difficult conversations, feedback sessions), prepare: remind yourself of your values, rehearse your STOP technique, and give yourself permission to take a break if needed.", emoji: "🛡️" },
          ],
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Emotional Awareness Journal",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "Think of a recent situation where your emotions felt overwhelming. Walk through the flooding cycle — can you identify each stage?",
            "Do you experience RSD? Describe a situation where perceived rejection hit harder than the situation warranted.",
            "What's your current go-to when emotions overwhelm you? Is it helpful or harmful?",
          ],
          spaceSizeHint: "large",
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 3 Homework",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Practice the STOP technique at least once per day, even during mild emotional moments. Build the habit before you need it in a crisis." },
            { type: "ACTION", description: "Create an 'emotional first aid kit' — a list of 5 things that help you calm down (specific songs, activities, people to call, sensory tools)." },
            { type: "JOURNAL_PROMPT", description: "Each evening, name 3 emotions you felt that day. Practice 'name it to tame it' in retrospect." },
            { type: "BRING_TO_SESSION", description: "Bring your emotional first aid kit list and any observations about your RSD patterns." },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 5: Time Management & Planning ──────────────────
  const mod5 = await createModule(
    4,
    {
      title: "Time Management & Planning",
      subtitle: "Week 4",
      summary: "ADHD-friendly approaches to time blindness, planning, and building structure that actually works for your brain.",
      estimatedMinutes: 45,
    },
    [
      {
        type: "TEXT",
        title: "ADHD & Time Blindness",
        content: {
          type: "TEXT",
          body: "Time blindness is one of ADHD's most disruptive symptoms. It's not that you don't care about being on time — it's that your brain processes time differently.\n\n**What Time Blindness Looks Like**\n• Consistently underestimating how long things take\n• Losing track of time during engaging activities\n• The 'just one more thing' trap before leaving\n• Difficulty sensing the passage of time without external cues\n• Living in 'now' and 'not now' — no in-between\n\n**The ADHD Time Horizon**\nNeurotypical brains can hold the future in mind while acting in the present. The ADHD brain lives primarily in the present moment. This makes long-term planning feel abstract and deadlines feel unreal until they're imminent.\n\n**Making Time Visible**\nThe key strategy for time blindness is making time *visible and external*:\n• Analog clocks (you can see time moving)\n• Visual timers (Time Timer, hourglass)\n• Calendar blocking (time has a physical space)\n• Transition alarms (not just one — a sequence)\n\n**The Planning Paradox**\nPeople with ADHD often avoid planning because rigid plans feel suffocating and inevitably fail. The solution isn't more planning — it's *flexible structure*. Think guardrails, not train tracks.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Time Management Strategies",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Time Management",
          cards: [
            { title: "Time Multiplier Rule", body: "Whatever you think a task will take, multiply by 1.5 to 2x. ADHD brains consistently underestimate time. Build this buffer into every plan.", emoji: "⏱️" },
            { title: "Reverse Planning", body: "Start from the deadline and work backwards. If you need to leave at 9:00, and getting ready takes 45 min (ADHD-adjusted), you start at 8:15. Add 15 min buffer = 8:00 alarm.", emoji: "⏪" },
            { title: "The Daily Big 3", body: "Each morning, choose only 3 important tasks. Not 10 — three. If you finish all 3, that's a great day. This prevents the overwhelm of endless to-do lists.", emoji: "3️⃣" },
            { title: "Transition Alarms", body: "Set 3 alarms: 15 minutes before (heads up), 5 minutes before (start wrapping up), and at the time (go now). One alarm isn't enough — your brain will dismiss it.", emoji: "🔔" },
            { title: "Weekly Planning Ritual", body: "Every Sunday (or Monday morning), spend 20 minutes looking at your week. Block your peak performance windows, add buffer time, and identify the week's Big 3 priorities.", emoji: "📅" },
          ],
        },
      },
      {
        type: "SMART_GOALS",
        title: "Set Your Time Management Goals",
        content: {
          type: "SMART_GOALS",
          instructions: "Set 1-2 SMART goals for improving your time management this week. Be specific and realistic — small wins build momentum.",
          maxGoals: 2,
          categories: ["Punctuality", "Planning", "Time Awareness", "Transitions"],
          goals: [
            { specific: "", measurable: "", achievable: "", relevant: "", timeBound: "", category: "Time Awareness", sortOrder: 0 },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 4 Homework",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Use the Time Multiplier Rule for every scheduled task this week. Track your estimates vs. actual time to calibrate." },
            { type: "ACTION", description: "Do a Weekly Planning Ritual at the start of this week. Block your peak hours and identify your Big 3." },
            { type: "ACTION", description: "Set up transition alarms (15min / 5min / 0min) for at least 3 events or transitions this week." },
            { type: "JOURNAL_PROMPT", description: "How does your relationship with time affect your self-esteem? What would change if you stopped judging yourself for time blindness?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "EVERY_OTHER_DAY",
        },
      },
    ]
  );

  // ── Module 6: Daily Routines & Habits ─────────────────────
  const mod6 = await createModule(
    5,
    {
      title: "Daily Routines & Habits",
      subtitle: "Week 5",
      summary: "Build sustainable morning and evening routines, and learn why habit-building with ADHD requires a different approach.",
      estimatedMinutes: 35,
    },
    [
      {
        type: "TEXT",
        title: "ADHD-Friendly Routines",
        content: {
          type: "TEXT",
          body: "Routines are the scaffolding that holds daily life together — and they're especially important for ADHD brains that struggle with executive function. But here's the catch: traditional habit advice often fails for ADHD.\n\n**Why Standard Habit Advice Fails**\n• \"Just do it every day at the same time\" — requires consistent time perception and self-initiation\n• \"It takes 21 days to form a habit\" — ADHD brains may need 60-90 days, and the habit can still break\n• \"Use willpower\" — ADHD is literally an executive function deficit; willpower is executive function\n• \"Start with one small habit\" — ADHD brains often need a cluster of habits that form a chain\n\n**The ADHD Routine Principles**\n1. **Chain, don't isolate** — Link habits in a sequence so each one triggers the next\n2. **Externalize the cue** — Use alarms, visual reminders, and physical placement instead of relying on memory\n3. **Reduce decisions** — The fewer choices in your routine, the better (lay out clothes, prep coffee, pre-plan meals)\n4. **Allow imperfection** — A 70% routine done consistently beats a 100% routine abandoned after a week\n5. **Build in dopamine** — Pair boring routine steps with something enjoyable (podcast while making lunch, music while cleaning up)",
        },
      },
      {
        type: "CHECKLIST",
        title: "Morning Routine Builder",
        content: {
          type: "CHECKLIST",
          items: [
            { text: "Wake up at consistent time (within 30-min window)", sortOrder: 0 },
            { text: "Hydrate immediately — water bottle by bedside", sortOrder: 1 },
            { text: "Take medication (if applicable) — paired with water", sortOrder: 2 },
            { text: "5-minute body movement (stretch, walk, jumping jacks)", sortOrder: 3 },
            { text: "Review today's Big 3 tasks (written the night before)", sortOrder: 4 },
            { text: "Get dressed (clothes pre-selected the night before)", sortOrder: 5 },
            { text: "Eat breakfast (even something small)", sortOrder: 6 },
            { text: "10-minute buffer before first commitment", sortOrder: 7 },
          ],
        },
      },
      {
        type: "CHECKLIST",
        title: "Evening Wind-Down Builder",
        content: {
          type: "CHECKLIST",
          items: [
            { text: "Set tomorrow's Big 3 tasks", sortOrder: 0 },
            { text: "Lay out tomorrow's clothes", sortOrder: 1 },
            { text: "Quick 10-minute tidy of main living area", sortOrder: 2 },
            { text: "Screen-free transition (book, podcast, light stretching)", sortOrder: 3 },
            { text: "Consistent bedtime (within 30-min window)", sortOrder: 4 },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 5 Homework",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Design your personal morning routine using the chain method. Start with just 3-4 steps and practice them for the full week." },
            { type: "ACTION", description: "Set up one external cue for your routine (alarm, sticky note on mirror, phone wallpaper reminder)." },
            { type: "JOURNAL_PROMPT", description: "Track which days you completed your morning routine and what got in the way on days you didn't. Look for patterns." },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 7: Productivity & Task Management ──────────────
  const mod7 = await createModule(
    6,
    {
      title: "Productivity & Task Management",
      subtitle: "Week 6",
      summary: "Build an ADHD-friendly task management system and learn strategies for tackling overwhelm, procrastination, and project completion.",
      estimatedMinutes: 40,
    },
    [
      {
        type: "TEXT",
        title: "The ADHD Productivity Paradox",
        content: {
          type: "TEXT",
          body: "Adults with ADHD are often incredibly productive — in bursts. The challenge isn't a lack of capability; it's *sustaining* output and managing the space between bursts.\n\n**Common ADHD Productivity Traps**\n• **The Perfectionism Trap** — Can't start because it won't be perfect\n• **The Overwhelm Spiral** — So much to do that you do nothing\n• **The Shiny Object Problem** — Starting many projects, finishing few\n• **The All-or-Nothing Pattern** — Hyperfocused sprint → burnout → avoidance → guilt → repeat\n\n**The ADHD Task Management System**\nForget complex apps with tags, contexts, and due dates on everything. ADHD-friendly task management is:\n1. **Visible** — If it's out of sight, it's gone. Use physical whiteboards, sticky notes, or a single-page dashboard.\n2. **Simple** — One list, one place. Not 5 apps syncing across devices.\n3. **Forgiving** — Uncompleted tasks roll forward without judgment.\n4. **Dopamine-aware** — Mix hard and easy tasks. Start with a quick win to build momentum.\n5. **Time-anchored** — Don't just list tasks; estimate time and assign to specific time blocks.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Productivity Strategies",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Productivity Toolkit",
          cards: [
            { title: "Swiss Cheese Method", body: "When a big task feels overwhelming, don't try to eat the whole thing. Poke holes in it — do any small piece you can (5 min of research, write one paragraph, make one phone call). The holes add up.", emoji: "🧀" },
            { title: "Energy Matching", body: "Match task difficulty to your energy level. High energy → creative/complex work. Medium energy → meetings and collaboration. Low energy → admin, organizing, easy tasks.", emoji: "⚡" },
            { title: "The Done List", body: "At the end of each day, write down everything you DID accomplish — not just what's on your to-do list. ADHD brains discount their accomplishments. A done list builds evidence of competence.", emoji: "✅" },
            { title: "Artificial Deadlines", body: "ADHD brains activate for urgency. Create it: tell someone you'll send them something by Tuesday. Use commitment devices. Schedule an accountability check-in.", emoji: "⏰" },
            { title: "Task Decomposition", body: "Break every task into steps small enough that each one takes under 15 minutes. 'Do taxes' becomes 'gather W-2', 'open TurboTax', 'enter income section.' Small steps feel doable.", emoji: "🔨" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 6 Homework",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Set up your ADHD-friendly task system: choose ONE tool (whiteboard, paper planner, or simple app) and migrate all floating tasks to it." },
            { type: "ACTION", description: "Practice the Daily Big 3 method every morning this week." },
            { type: "ACTION", description: "Keep a 'Done List' every evening — write down at least 5 things you accomplished, no matter how small." },
            { type: "JOURNAL_PROMPT", description: "Which productivity trap resonated most with you? What's one pattern you want to break?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "EVERY_OTHER_DAY",
        },
      },
    ]
  );

  // ── Module 8: Relationships & Communication ───────────────
  const mod8 = await createModule(
    7,
    {
      title: "Relationships & Communication",
      subtitle: "Week 7",
      summary: "Navigate how ADHD affects your relationships and learn communication strategies for both personal and professional settings.",
      estimatedMinutes: 35,
    },
    [
      {
        type: "TEXT",
        title: "ADHD in Relationships",
        content: {
          type: "TEXT",
          body: "ADHD doesn't just affect you — it affects everyone around you. Understanding how ADHD shows up in relationships is key to building stronger connections.\n\n**Common Relationship Challenges**\n• **Forgetting commitments** — Not because you don't care, but because working memory failed\n• **Emotional reactivity** — Snapping under stress, then feeling terrible about it\n• **Conversational tangents** — Interrupting, losing track of the topic, or zoning out\n• **Inconsistent follow-through** — Enthusiastic promises that fade when the novelty wears off\n• **The 'parent-child dynamic'** — Partners who take on a managing/reminding role\n\n**Communication Strategies**\n• **Admit the pattern, not just the incident** — Instead of \"Sorry I forgot,\" try \"I know I have a pattern of forgetting things. Here's what I'm doing about it.\"\n• **Use external systems, not promises** — \"I'll remember\" is unreliable. \"I've set a reminder\" is a system.\n• **Ask for direct communication** — Hints and subtext are hard for ADHD brains processing at full speed. Ask people to be direct with you.\n• **Schedule important conversations** — Don't ambush yourself or others with big talks. Pick a time when you have energy and focus.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Relationship Strategies",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Relationship Toolkit",
          cards: [
            { title: "The Repair Ritual", body: "After an ADHD-related conflict, use this sequence: Acknowledge the impact (not just intent), take responsibility for the pattern, share what you're doing differently, and ask what they need.", emoji: "🤝" },
            { title: "Active Listening Mode", body: "When someone is talking to you about something important: put your phone away, make eye contact, and repeat back what you heard. It takes effort, but it shows respect.", emoji: "👂" },
            { title: "The Weekly Check-In", body: "Schedule a 15-minute weekly check-in with your partner/close person. Ask: What's working? What needs attention? What can I help with? Prevents small issues from becoming big ones.", emoji: "📋" },
            { title: "ADHD Disclosure", body: "When appropriate, explain your ADHD to people who matter: 'I have ADHD, which means [specific thing]. It's not an excuse, but it helps explain [pattern]. Here's how you can help.'", emoji: "💬" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 7 Homework",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Practice active listening in at least 2 conversations this week. Afterward, reflect on how it felt." },
            { type: "ACTION", description: "If you have a partner or close friend, schedule a brief check-in using the Weekly Check-In format." },
            { type: "JOURNAL_PROMPT", description: "How has ADHD affected your most important relationships? What's one communication pattern you'd like to change?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "EVERY_OTHER_DAY",
        },
      },
    ]
  );

  // ── Module 9: Sustaining Progress ─────────────────────────
  const mod9 = await createModule(
    8,
    {
      title: "Sustaining Progress & Next Steps",
      subtitle: "Week 8",
      summary: "Reflect on your growth, consolidate your strategies, and build a long-term plan for living well with ADHD.",
      estimatedMinutes: 40,
    },
    [
      {
        type: "TEXT",
        title: "Looking Back, Moving Forward",
        content: {
          type: "TEXT",
          body: "Congratulations — you've made it through 8 weeks of dedicated work on understanding and managing your ADHD. That takes real commitment, especially for a brain that thrives on novelty and struggles with sustained effort.\n\n**What You've Built**\nOver these weeks, you've developed:\n• A deeper understanding of your ADHD brain and its patterns\n• A personal toolkit of focus, emotional regulation, and time management strategies\n• Morning and evening routines that support your daily functioning\n• A task management system that works with your brain\n• Communication strategies for your relationships\n• Self-compassion and reframing skills\n\n**The Maintenance Mindset**\nHere's the truth about ADHD management: it's not a destination. There will be great weeks and hard weeks. Strategies that work now may need refreshing in 6 months. The skills you've learned aren't a cure — they're tools. And tools need maintenance.\n\n**The Three Pillars of Long-Term Success**\n1. **Self-awareness** — Keep noticing your patterns. Journal, reflect, check in with yourself.\n2. **External structure** — Keep using your systems. When they break (and they will), rebuild them without judgment.\n3. **Support** — Stay connected to your clinician, support groups, or accountability partners. ADHD management is easier with others.",
        },
      },
      {
        type: "ASSESSMENT",
        title: "Program Completion Assessment",
        content: {
          type: "ASSESSMENT",
          title: "Post-Program Self-Assessment",
          instructions: "Rate each area compared to when you started the program. This helps you and your clinician measure your growth.",
          scoringEnabled: true,
          questions: [
            { question: "My ability to focus on tasks has improved", type: "LIKERT", likertMin: 1, likertMax: 5, required: true, sortOrder: 0 },
            { question: "I can regulate my emotions better than before", type: "LIKERT", likertMin: 1, likertMax: 5, required: true, sortOrder: 1 },
            { question: "My time management has improved", type: "LIKERT", likertMin: 1, likertMax: 5, required: true, sortOrder: 2 },
            { question: "I have consistent daily routines", type: "LIKERT", likertMin: 1, likertMax: 5, required: true, sortOrder: 3 },
            { question: "I feel more in control of my productivity", type: "LIKERT", likertMin: 1, likertMax: 5, required: true, sortOrder: 4 },
            { question: "My relationships have benefited from the communication strategies", type: "LIKERT", likertMin: 1, likertMax: 5, required: true, sortOrder: 5 },
            { question: "I have more self-compassion about my ADHD", type: "LIKERT", likertMin: 1, likertMax: 5, required: true, sortOrder: 6 },
            { question: "What was the most impactful thing you learned in this program?", type: "FREE_TEXT", required: true, sortOrder: 7 },
            { question: "What area do you want to continue working on?", type: "FREE_TEXT", required: true, sortOrder: 8 },
          ],
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Final Reflection",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "What are you most proud of from the past 8 weeks?",
            "Which strategies have become part of your daily life? Which ones do you want to practice more?",
            "Write a letter to your future self for a hard day — remind yourself what you've learned and what you're capable of.",
          ],
          spaceSizeHint: "large",
        },
      },
      {
        type: "RESOURCE_LINK",
        title: "ADHD Resources for Continued Learning",
        content: {
          type: "RESOURCE_LINK",
          url: "https://chadd.org",
          description: "CHADD (Children and Adults with ADHD) — The national resource for ADHD education, advocacy, and support. Includes local support groups, webinars, and the latest research.",
        },
      },
      {
        type: "HOMEWORK",
        title: "Final Homework: Your Maintenance Plan",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Create your personal 'ADHD Strategy Card' — a single index card (or phone note) with your top 5 strategies. Keep it visible." },
            { type: "ACTION", description: "Schedule a monthly self-check-in on your calendar for the next 6 months. Use it to review your strategies and adjust what's not working." },
            { type: "BRING_TO_SESSION", description: "Bring your personal strategy card and any questions about maintaining progress after the program ends." },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "NONE",
        },
      },
    ]
  );

  // ── 5. Enroll test participant in the program ──────────────
  const allModules = [mod1, mod2, mod3, mod4, mod5, mod6, mod7, mod8, mod9];

  const enrollment = await prisma.enrollment.create({
    data: {
      participantId: testParticipant.participantProfile!.id,
      programId: program.id,
      status: "ACTIVE",
      currentModuleId: mod1.id,
    },
  });

  for (let i = 0; i < allModules.length; i++) {
    await prisma.moduleProgress.create({
      data: {
        enrollmentId: enrollment.id,
        moduleId: allModules[i].id,
        status: i === 0 ? "UNLOCKED" : "LOCKED",
        unlockedAt: i === 0 ? new Date() : undefined,
      },
    });
  }

  // ── 4b. Jo's client programs — each program is one patient ─────────────────

  // Helper to create Jo's modules with parts
  async function createJoModule(
    programId: string,
    sortOrder: number,
    moduleData: { title: string; subtitle?: string; summary?: string; estimatedMinutes?: number },
    parts: { type: string; title: string; isRequired?: boolean; content: any }[]
  ) {
    const mod = await prisma.module.create({
      data: {
        programId,
        sortOrder,
        title: moduleData.title,
        subtitle: moduleData.subtitle,
        summary: moduleData.summary,
        estimatedMinutes: moduleData.estimatedMinutes,
        unlockRule: "SEQUENTIAL",
      },
    });
    for (let i = 0; i < parts.length; i++) {
      await prisma.part.create({
        data: {
          moduleId: mod.id,
          type: parts[i].type as any,
          title: parts[i].title,
          sortOrder: i,
          isRequired: parts[i].isRequired ?? true,
          content: parts[i].content,
        },
      });
    }
    return mod;
  }

  // ── Program 1: Sarah M. — College student, focus & academic skills ──────
  const sarahProgram = await prisma.program.create({
    data: {
      clinicianId: joClinician.clinicianProfile!.id,
      title: "Sarah M.",
      description: "20-year-old college junior. Diagnosed at 18. Struggling with focus during lectures, procrastination on papers, and test anxiety. On Adderall 20mg XR. Goals: finish semester with 3.0+ GPA and reduce late submissions.",
      cadence: "WEEKLY",
      enrollmentMethod: "INVITE",
      sessionType: "ONE_ON_ONE",
      status: "PUBLISHED",
    },
  });

  await createJoModule(sarahProgram.id, 0, {
    title: "Week 1: Study Environment & Focus Baseline",
    subtitle: "Mar 5 – Mar 12",
    summary: "Establish a distraction-reduced study setup and track current focus patterns.",
    estimatedMinutes: 25,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "This week we talked about how your current study habits are working (and not working). You mentioned studying in bed with your phone nearby, and that you often lose 45+ minutes to social media before realizing it.\n\nThis week we're going to set up a better study environment and start tracking your focus so we can see patterns.",
      },
    },
    {
      type: "CHECKLIST",
      title: "Study Space Setup",
      content: {
        type: "CHECKLIST",
        items: [
          { text: "Pick a consistent study location outside your bedroom (library, coffee shop, or desk area)", sortOrder: 0 },
          { text: "Download a phone-blocking app (Forest, Opal, or Screen Time limits)", sortOrder: 1 },
          { text: "Get noise-canceling headphones or earbuds for study sessions", sortOrder: 2 },
          { text: "Set up your study spot with charger, water bottle, and supplies so it's always ready", sortOrder: 3 },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Focus Tracking",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Each time you sit down to study, write down: start time, what you're working on, and rate your focus 1-5 when you finish. Do this for every study session this week.", sortOrder: 0 },
          { type: "ACTION", description: "Try studying in your new location at least 3 times this week. Compare focus ratings to studying in your usual spot.", sortOrder: 1 },
          { type: "JOURNAL_PROMPT", prompts: ["What time of day did you focus best? What was different about those sessions?"], spaceSizeHint: "medium", sortOrder: 2 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your focus tracking notes — we'll look for patterns together.", sortOrder: 3 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createJoModule(sarahProgram.id, 1, {
    title: "Week 2: Breaking Down Assignments",
    subtitle: "Mar 12 – Mar 19",
    summary: "Learn to break large assignments into small, timed chunks to reduce overwhelm.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Your focus tracking showed you concentrate best between 10am-12pm and again around 7-9pm. Afternoons are tough. We're going to use those peak windows for your hardest work.\n\nYou also mentioned that big papers paralyze you — you don't know where to start so you don't start at all. This week we'll practice breaking assignments into tiny steps.",
      },
    },
    {
      type: "STRATEGY_CARDS",
      title: "Assignment Breakdown Method",
      content: {
        type: "STRATEGY_CARDS",
        deckName: "Paper Writing Steps",
        cards: [
          { title: "Step 1: Brain Dump", body: "Set a timer for 10 minutes. Write down everything you know or think about the topic. No structure, no editing. Just get words on the page." },
          { title: "Step 2: Find 3 Sources", body: "Don't try to find all your sources at once. Find just 3 that look relevant. Skim the abstracts. Bookmark them. That's it for now." },
          { title: "Step 3: Outline in Bullets", body: "Turn your brain dump into 3-5 bullet points. Each bullet = one paragraph. Don't write sentences yet." },
          { title: "Step 4: Write One Section", body: "Pick the easiest bullet point and expand it into a paragraph. Just one. Then take a break." },
          { title: "Step 5: Ugly First Draft", body: "Fill in the rest of the sections. It will be bad. That's the point. You can't edit a blank page." },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Practice Assignment Breakdown",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Pick your next upcoming assignment. Break it into at least 5 small steps (15 min or less each). Write them in a list you can check off.", sortOrder: 0 },
          { type: "ACTION", description: "Complete at least 2 of those steps this week during your peak focus windows (10am-12pm or 7-9pm).", sortOrder: 1 },
          { type: "ACTION", description: "Use phone-blocking app during every study session. Track how many minutes you studied without interruption.", sortOrder: 2 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your broken-down assignment list so we can review how the steps felt.", sortOrder: 3 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "EVERY_OTHER_DAY",
      },
    },
  ]);

  await createJoModule(sarahProgram.id, 2, {
    title: "Week 3: Test Prep & Anxiety Management",
    subtitle: "Mar 19 – Mar 26",
    summary: "Build a study schedule for midterms and practice grounding techniques for test anxiety.",
    estimatedMinutes: 25,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Great progress on breaking down your English paper — you got through the brain dump and outline steps without procrastinating. The phone blocker helped a lot.\n\nMidterms are in 2 weeks and you're already feeling the anxiety. This week we're going to build a realistic study plan and give you tools for the anxiety itself.",
      },
    },
    {
      type: "CHECKLIST",
      title: "Midterm Study Plan",
      content: {
        type: "CHECKLIST",
        items: [
          { text: "List all midterms with dates and what % of your grade each one is", sortOrder: 0 },
          { text: "For each exam, write down the 3 most important topics to review", sortOrder: 1 },
          { text: "Block 2-hour study sessions on your calendar for each exam (during peak hours)", sortOrder: 2 },
          { text: "Gather all materials (notes, slides, practice problems) in one place per class", sortOrder: 3 },
          { text: "Find a study buddy or study group for at least one subject", sortOrder: 4 },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Test Anxiety Practice",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Practice the 4-7-8 breathing technique (inhale 4 sec, hold 7 sec, exhale 8 sec) twice a day — once in the morning and once before studying. This trains your body to calm down on command.", sortOrder: 0 },
          { type: "ACTION", description: "Do at least one practice test or set of practice problems under timed conditions. Notice what happens in your body when you feel stuck — that's the anxiety signal to use your breathing.", sortOrder: 1 },
          { type: "JOURNAL_PROMPT", prompts: ["When you feel test anxiety, what thoughts come up? Write them down exactly as they appear. Then write a more realistic version next to each one."], spaceSizeHint: "large", sortOrder: 2 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your study schedule and your anxiety thought log.", sortOrder: 3 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createJoModule(sarahProgram.id, 3, {
    title: "Week 4: Building a Weekly Routine",
    subtitle: "Mar 26 – Apr 2",
    summary: "Create a sustainable weekly schedule that balances academics, self-care, and social time.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Midterms went better than expected — you used the breathing technique before your psych exam and said it really helped. Your study schedule kept you from cramming, which is a huge win.\n\nNow let's build a weekly routine you can sustain for the rest of the semester. The key is not filling every hour — it's protecting your focus windows and building in recovery time.",
      },
    },
    {
      type: "HOMEWORK",
      title: "Weekly Routine Design",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Create a weekly template schedule. Block: your peak focus windows for studying, class times, meals, exercise or movement, one social activity, and at least 2 hours of unstructured free time.", sortOrder: 0 },
          { type: "ACTION", description: "Follow your weekly template for 5 out of 7 days this week. Mark which days you stuck to it and which you didn't.", sortOrder: 1 },
          { type: "ACTION", description: "Set a daily end-of-study alarm. When it goes off, you're done for the day — no guilt. Rest is part of the plan.", sortOrder: 2 },
          { type: "JOURNAL_PROMPT", prompts: ["How did it feel having a routine? What parts worked and what felt forced?"], spaceSizeHint: "medium", sortOrder: 3 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your weekly template — we'll adjust it based on how the week went.", sortOrder: 4 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "EVERY_OTHER_DAY",
      },
    },
  ]);

  // ── Program 2: David K. — Working professional, productivity & emotions ──────
  const davidProgram = await prisma.program.create({
    data: {
      clinicianId: joClinician.clinicianProfile!.id,
      title: "David K.",
      description: "34-year-old software engineer. Diagnosed 2 years ago. Struggles with emotional reactivity in meetings, task-switching between projects, and chronic lateness. On Vyvanse 40mg. Goals: reduce workplace conflicts and build reliable daily systems.",
      cadence: "WEEKLY",
      enrollmentMethod: "INVITE",
      sessionType: "ONE_ON_ONE",
      status: "PUBLISHED",
    },
  });

  await createJoModule(davidProgram.id, 0, {
    title: "Week 1: Mapping Triggers & Patterns",
    subtitle: "Mar 3 – Mar 10",
    summary: "Identify emotional triggers at work and start building awareness before reactions.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Today we talked about the incident in last week's sprint review where you snapped at your PM. You recognized afterward that you weren't actually angry about the feedback — you were already frustrated from context-switching all morning and the criticism hit different because of it.\n\nThis week is about noticing the buildup before the eruption. Most emotional blowups at work aren't about the trigger — they're about what happened in the hours before.",
      },
    },
    {
      type: "HOMEWORK",
      title: "Trigger Tracking",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "3x per day (morning, after lunch, end of day), rate your stress level 1-10 and write one sentence about what's driving it. Set phone alarms as reminders.", sortOrder: 0 },
          { type: "ACTION", description: "When you notice your stress is above a 6, take a 5-minute walk before your next meeting or interaction. Don't skip this — it interrupts the buildup.", sortOrder: 1 },
          { type: "JOURNAL_PROMPT", prompts: ["Describe a moment this week when you felt reactive. What happened in the 2 hours before? Were you already escalated?"], spaceSizeHint: "large", sortOrder: 2 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your stress tracking log — we'll map your daily stress curve.", sortOrder: 3 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createJoModule(davidProgram.id, 1, {
    title: "Week 2: The Pause Protocol",
    subtitle: "Mar 10 – Mar 17",
    summary: "Practice creating a gap between emotional trigger and response in work situations.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Your stress tracking showed a clear pattern: mornings start around 3-4 but spike to 7-8 after back-to-back meetings or Slack interruptions. By afternoon you have almost no buffer left.\n\nThis week we're going to practice the Pause Protocol — a simple routine to create space between feeling triggered and responding. The goal isn't to suppress emotions. It's to buy yourself 30 seconds of clarity.",
      },
    },
    {
      type: "STRATEGY_CARDS",
      title: "The Pause Protocol",
      content: {
        type: "STRATEGY_CARDS",
        deckName: "Pause Protocol",
        cards: [
          { title: "Step 1: Notice", body: "Physical signals come first: jaw clenching, chest tightness, heat in your face, talking faster. These are your early warning system. Learn to catch them." },
          { title: "Step 2: Buy Time", body: "Use a bridge phrase: 'Let me think about that for a sec.' / 'I want to give that a proper response — can I get back to you in 10 minutes?' This is not avoidance — it's strategy." },
          { title: "Step 3: Move", body: "Stand up, get water, walk to the bathroom. Physical movement interrupts the emotional spiral. Even shifting your posture in your chair helps." },
          { title: "Step 4: Reframe", body: "Ask yourself: 'What's the most generous interpretation of what they just said?' ADHD brains jump to threat. Reframing slows that down." },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Practice the Pause",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Use the Pause Protocol at least once per day, even in low-stakes situations (someone cuts you off in a conversation, a frustrating email). Build the muscle on small things.", sortOrder: 0 },
          { type: "ACTION", description: "Before your most stressful recurring meeting, spend 2 minutes doing box breathing (4 in, 4 hold, 4 out, 4 hold). Pre-regulate before you need to.", sortOrder: 1 },
          { type: "ACTION", description: "Continue stress tracking 3x/day. Note any times you used the Pause Protocol and what happened.", sortOrder: 2 },
          { type: "BRING_TO_SESSION", reminderText: "Bring examples of when you used (or wanted to use) the Pause Protocol.", sortOrder: 3 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createJoModule(davidProgram.id, 2, {
    title: "Week 3: Deep Work Blocks & Context-Switching",
    subtitle: "Mar 17 – Mar 24",
    summary: "Protect focus time and reduce the cognitive cost of switching between projects.",
    estimatedMinutes: 25,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "You used the Pause Protocol 4 times this week — twice in meetings and twice over Slack. The bridge phrase ('Let me think about that') worked really well for you.\n\nNow let's tackle the other big issue: you're on 3 projects and context-switching is destroying your productivity and draining your emotional battery. Research shows it takes 23 minutes to refocus after an interruption — with ADHD it can be even longer.",
      },
    },
    {
      type: "CHECKLIST",
      title: "Deep Work Setup",
      content: {
        type: "CHECKLIST",
        items: [
          { text: "Block 2 hours of 'deep work' on your calendar each morning (make it a recurring event)", sortOrder: 0 },
          { text: "Set Slack to Do Not Disturb during deep work blocks", sortOrder: 1 },
          { text: "Close email tab during deep work — check it only at 11am and 3pm", sortOrder: 2 },
          { text: "Put a sticky note on your monitor: 'Is this urgent or can it wait until my next check-in?'", sortOrder: 3 },
          { text: "Tell your team: 'I'm doing focus blocks 9-11am. Ping me after 11 unless it's on fire.'", sortOrder: 4 },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Deep Work Practice",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Do 4 deep work blocks this week (one per workday, skip one day as buffer). Track what you accomplished in each block vs. a normal scattered morning.", sortOrder: 0 },
          { type: "ACTION", description: "When you must switch projects, use a 'context dump': spend 2 minutes writing where you left off and what to do next before switching. This saves massive re-ramp time.", sortOrder: 1 },
          { type: "JOURNAL_PROMPT", prompts: ["How did the deep work blocks feel compared to your usual mornings? What tried to pull you out of focus and how did you handle it?"], spaceSizeHint: "medium", sortOrder: 2 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "EVERY_OTHER_DAY",
      },
    },
  ]);

  await createJoModule(davidProgram.id, 3, {
    title: "Week 4: Morning Routine & Chronic Lateness",
    subtitle: "Mar 24 – Mar 31",
    summary: "Build a reliable morning routine and address the time-blindness behind chronic lateness.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Deep work blocks were a game-changer — you said you got more done in those 2-hour blocks than in full scattered days. Your PM even noticed.\n\nLet's now tackle the lateness. You've been 5-15 minutes late to standup 3 out of 5 days. It's not about not caring — it's time blindness plus 'one more thing' syndrome. Every morning you think you have more time than you do.",
      },
    },
    {
      type: "HOMEWORK",
      title: "Morning System",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Set 3 morning alarms: (1) wake up, (2) 'stop getting ready and leave in 10 min', (3) 'leave NOW'. Put alarm (2) in a different room so you have to walk to it.", sortOrder: 0 },
          { type: "ACTION", description: "Prep the night before: lay out clothes, pack bag, put keys/wallet/badge by the door. Reduce every morning decision you can.", sortOrder: 1 },
          { type: "ACTION", description: "Track your arrival time to standup every day this week. Write down what time you intended to arrive vs. actual.", sortOrder: 2 },
          { type: "ACTION", description: "Add a 15-minute buffer to every time estimate this week. If you think something takes 20 minutes, block 35. See how that changes your lateness.", sortOrder: 3 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your arrival tracking log and let me know how the buffer strategy worked.", sortOrder: 4 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  // ── Program 3: Marcus T. — Recently diagnosed, building daily structure ──────
  const marcusProgram = await prisma.program.create({
    data: {
      clinicianId: joClinician.clinicianProfile!.id,
      title: "Marcus T.",
      description: "41-year-old freelance graphic designer. Diagnosed 3 months ago after his daughter's diagnosis prompted him to get tested. No medication yet (exploring options). Struggles with inconsistent work output, missed client deadlines, and household overwhelm. Goals: build daily structure and decide on medication.",
      cadence: "WEEKLY",
      enrollmentMethod: "INVITE",
      sessionType: "ONE_ON_ONE",
      status: "PUBLISHED",
    },
  });

  await createJoModule(marcusProgram.id, 0, {
    title: "Week 1: Understanding Your Diagnosis",
    subtitle: "Mar 7 – Mar 14",
    summary: "Process the new diagnosis and start noticing ADHD patterns in daily life.",
    estimatedMinutes: 30,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Today was your first session after getting your diagnosis. You said it was a mix of relief ('so that's why everything has been so hard') and grief ('I could have known 20 years ago'). Both of those feelings are completely valid and very common in late-diagnosed adults.\n\nThis week isn't about fixing anything. It's about noticing. Now that you have a name for the pattern, you'll start seeing it everywhere — and that's a good thing. Awareness is the first tool.",
      },
    },
    {
      type: "RESOURCE_LINK",
      title: "Recommended Reading",
      content: {
        type: "RESOURCE_LINK",
        url: "https://chadd.org/for-adults/overview/",
        description: "CHADD's overview for adults newly diagnosed with ADHD. Good starting point for understanding what ADHD is and isn't.",
      },
    },
    {
      type: "HOMEWORK",
      title: "ADHD Awareness Week",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "JOURNAL_PROMPT", prompts: [
            "What's one thing from your past that makes more sense now that you have the ADHD diagnosis?",
            "What emotion comes up most when you think about the diagnosis? Sit with it for a few minutes and write what surfaces.",
          ], spaceSizeHint: "large", sortOrder: 0 },
          { type: "ACTION", description: "This week, notice 3 moments where ADHD shows up in your day. Don't try to fix them — just notice and write them down. Example: 'Sat down to work on the logo project at 9am, looked up and it was 11am and I'd been reorganizing my font library.'", sortOrder: 1 },
          { type: "ACTION", description: "Read the CHADD article linked above. Take note of anything that surprises you or feels especially relevant.", sortOrder: 2 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your 3 ADHD moments and your journal entries. Also bring any questions about medication — we'll talk through your options.", sortOrder: 3 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "EVERY_OTHER_DAY",
      },
    },
  ]);

  await createJoModule(marcusProgram.id, 1, {
    title: "Week 2: Taming the Home Environment",
    subtitle: "Mar 14 – Mar 21",
    summary: "Create simple systems to reduce household overwhelm and visual clutter.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "You noticed ADHD showing up a lot more than 3 times — you said 'it's like I can't unsee it now.' That's normal and it does settle down.\n\nYou mentioned the house is a huge source of stress. Dishes pile up, laundry never gets folded, mail stacks up for weeks. Your wife is frustrated and you feel ashamed. Let's start with small, concrete systems — not a total house overhaul.",
      },
    },
    {
      type: "CHECKLIST",
      title: "Home Systems Starter Kit",
      content: {
        type: "CHECKLIST",
        items: [
          { text: "Put a bin by the front door for keys, wallet, and mail (everything has a home)", sortOrder: 0 },
          { text: "Set a daily 10-minute timer for kitchen cleanup — dishes, counters, that's it", sortOrder: 1 },
          { text: "Pick one laundry day and put it on your calendar as a recurring event", sortOrder: 2 },
          { text: "Get a small trash can for junk mail right by the door — sort immediately, don't stack", sortOrder: 3 },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "10-Minute Tidy Habit",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Do the 10-minute kitchen timer every day after dinner. Put on a podcast or music to make it tolerable. When the timer goes off, you stop — even if it's not perfect.", sortOrder: 0 },
          { type: "ACTION", description: "Set up the 'landing pad' bin by your front door. Use it every time you come home this week.", sortOrder: 1 },
          { type: "ACTION", description: "Pick the ONE household task that causes the most friction with your wife. Do it on a specific day at a specific time this week (e.g., 'trash out Wednesday night after kids' bedtime').", sortOrder: 2 },
          { type: "BRING_TO_SESSION", reminderText: "Let me know how the 10-minute tidy went — did the timer help? Did you stick with it?", sortOrder: 3 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createJoModule(marcusProgram.id, 2, {
    title: "Week 3: Freelance Workflow & Client Deadlines",
    subtitle: "Mar 21 – Mar 28",
    summary: "Build a simple project tracking system and address deadline avoidance.",
    estimatedMinutes: 25,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "The 10-minute tidy is working well — you said it's actually become almost automatic. Your wife noticed and it reduced tension at home.\n\nNow let's talk about work. You have 4 active client projects and no system for tracking them. You said you missed a deadline last week because you 'forgot the project existed' once a newer one came in. That's classic ADHD — out of sight, out of mind. We need to make all your projects visible at all times.",
      },
    },
    {
      type: "HOMEWORK",
      title: "Visible Project System",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Get a physical whiteboard or large sticky notes. Write each active project with: client name, next deliverable, and deadline. Put it where you see it from your desk — this is your 'project dashboard.'", sortOrder: 0 },
          { type: "ACTION", description: "Every Monday morning, spend 15 minutes reviewing your project dashboard. For each project, write the ONE most important next step for this week.", sortOrder: 1 },
          { type: "ACTION", description: "Set calendar reminders 3 days before each deadline. When the reminder hits, that project becomes priority #1 until it's delivered.", sortOrder: 2 },
          { type: "ACTION", description: "Send a brief status update to each active client this week (even just 'On track, will have the draft by Thursday'). Proactive communication prevents panic.", sortOrder: 3 },
          { type: "BRING_TO_SESSION", reminderText: "Take a photo of your project dashboard and bring it. We'll review whether the system is working.", sortOrder: 4 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "EVERY_OTHER_DAY",
      },
    },
  ]);

  await createJoModule(marcusProgram.id, 3, {
    title: "Week 4: Daily Rhythm & Medication Discussion",
    subtitle: "Mar 28 – Apr 4",
    summary: "Establish a simple daily work routine and make an informed decision about medication.",
    estimatedMinutes: 25,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Your project dashboard is up and you haven't missed a deadline this week. You said having everything visible made a huge difference — 'I can't ignore it when it's staring at me.'\n\nWe also talked about medication. You have a lot of questions and some hesitation, which is totally normal. I've included some structured thinking below to help you prepare for the conversation with your prescriber. This is your decision — I just want you to go in informed.",
      },
    },
    {
      type: "HOMEWORK",
      title: "Daily Rhythm & Medication Prep",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Create a simple daily work schedule with 3 blocks: morning creative work (your best hours), midday admin/emails/client calls, afternoon lighter tasks. Follow it for 4 out of 5 workdays.", sortOrder: 0 },
          { type: "ACTION", description: "Continue the Monday project review ritual and daily 10-minute tidy. These are now your anchor habits — protect them.", sortOrder: 1 },
          { type: "JOURNAL_PROMPT", prompts: [
            "What are your biggest concerns about medication? What are you hoping it might help with?",
            "What questions do you want to ask your prescriber? Write at least 3.",
          ], spaceSizeHint: "large", sortOrder: 2 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your medication questions and your daily schedule — we'll fine-tune both.", sortOrder: 3 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "EVERY_OTHER_DAY",
      },
    },
  ]);

  const joPrograms = [sarahProgram, davidProgram, marcusProgram];

  // ── 6. Generate dev tokens ────────────────────────────────
  const adminToken = jwt.sign(
    {
      userId: admin.id,
      role: admin.role,
      clinicianProfileId: admin.clinicianProfile!.id,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  const participantToken = jwt.sign(
    {
      userId: testParticipant.id,
      role: testParticipant.role,
      participantProfileId: testParticipant.participantProfile!.id,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  console.log("\n=== Seed Complete ===\n");

  console.log("--- Admin (Clinician / Program Owner) ---");
  console.log(`Email: admin@admin.com`);
  console.log(`Password: Admin1`);
  console.log(`User ID: ${admin.id}`);
  console.log(`Token: ${adminToken}`);

  console.log("\n--- Participant ---");
  console.log(`Email: test@test.com`);
  console.log(`Password: Test1`);
  console.log(`User ID: ${testParticipant.id}`);
  console.log(`Token: ${participantToken}`);

  console.log("\n--- Program ---");
  console.log(`Program: ${program.title} (${program.id})`);
  console.log(`Modules: ${allModules.length}`);
  console.log(`Enrollment: ${enrollment.id} (ACTIVE)`);

  console.log("\n--- Jo (Clinician) ---");
  console.log(`Email: jo@jo.com`);
  console.log(`Password: Jo1`);
  console.log(`User ID: ${joClinician.id}`);
  console.log("Jo's client programs:");
  for (const p of joPrograms) {
    console.log(`- ${p.title} (${p.id})`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
