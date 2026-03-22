import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { seedTemplate1_CBTDepression, seedTemplate2_DBTSkillsTraining, seedTemplate3_ERPForOCD } from "./templates/templates-1-3";
import { seedTemplate4_CPT_PTSD, seedTemplate5_CBTI_Insomnia, seedTemplate6_RelapsePrevention } from "./templates/templates-4-6";
import { seedTemplate7_BehavioralActivation, seedTemplate8_MBSR } from "./templates/templates-7-8";
import { seedTemplate9_AngerManagement, seedTemplate10_ParentingSkills } from "./templates/templates-9-10";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

async function main() {
  // ── 0. Clean up old data ──────────────────────────────────
  // Delete old users that may exist with wrong roles from previous seeds
  for (const email of ["admin@admin.com", "test@test.com", "clinician@steady.dev", "jo@jo.com", "jim@jim.com", "maya@maya.com", "priya@priya.com"]) {
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
      {
        type: "HOMEWORK",
        title: "Steady Work: Build Your STEADY SYSTEM",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Choose one system that includes a Calendar, To-do list, and Journal. Paper options: Anecdote, Erin Condren, Laurel Denise, Papier, or any planner with calendar + to-do + journal space. A whiteboard can be part of your calendar system. Tech options: Fantastical, Notes app, iCalendar (Mac); Calendly, Google Calendar, Proton Calendar (Android). Make sure it syncs across your devices." },
            { type: "ACTION", description: "Review the Material: Read the Memory Handouts and watch the Videos." },
            { type: "JOURNAL_PROMPT", description: "How confident are you (1-10) that the STEADY system will help you make meaningful changes? Why that number?" },
            { type: "JOURNAL_PROMPT", description: "What are your thoughts about journaling? Have you tried it before? What was that experience like?" },
            { type: "JOURNAL_PROMPT", description: "Did we address your specific needs in your intended outcomes? Was there anything we missed?" },
            { type: "JOURNAL_PROMPT", description: "Once you set up your STEADY SYSTEM, where will you keep it so you actually use it?" },
            { type: "BRING_TO_SESSION", description: "Bring your STEADY SYSTEM so we can begin using it together." },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
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
        title: "Steady Work: Get Up to Speed",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Identify What You're Behind On — Make a list of tasks you need to catch up on. Examples: Emails, Texts, Cleaning, Work tasks, Bills, Chores." },
            { type: "ACTION", description: "Break Each Item Into Smaller Steps — Divide big tasks into manageable parts. Examples: Work emails vs. personal emails; list chores and start with the easiest; list bills and start by paying one or setting up auto-pay." },
            { type: "ACTION", description: "Estimate How Long Each Step Will Take — Write down an approximate time for each step. Being realistic helps you plan without overwhelm." },
            { type: "ACTION", description: "Schedule Each Step in Your STEADY SYSTEM — Break tasks into hours or blocks. Be realistic about what you can complete in one sitting. Consider using the Pomodoro Method (25 minutes work / 5 minutes break). Calculate your total estimated time to catch up." },
            { type: "ACTION", description: "Start Catching Up — Begin with your first step. Focus on progress, not perfection." },
            { type: "JOURNAL_PROMPT", description: "Bring the Future to the Present: Visualize yourself fully caught up. Use all your senses — see it, hear it, feel it. Imagine how you'll feel when the last task is done. Describe your experience of finishing these tasks." },
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
        title: "Steady Work: Build Your Steady System",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Watch the Videos — Take notes as needed. Focus on understanding the concept of STEADY TASKS." },
            { type: "ACTION", description: "Practice Identifying STEADY TASKS — Look at your tasks and decide which ones belong in your STEADY SYSTEM." },
            { type: "ACTION", description: "Practice Adding STEADY TASKS to Your To-Do List — Write each task in your list. Reflect: How often did you forget to add a task, and why? How often did you remember, and why?" },
            { type: "ACTION", description: "Practice Transferring To-Do List Items to Your Calendar — Give each STEADY TASK a specific time slot in your calendar." },
            { type: "ACTION", description: "Track Time for Repetitive Tasks — Record how long these usually take so you can schedule realistically: Shower, Making dinner, Getting ready to leave the house, Laundry, Regular phone calls, Homework, Bedtime routine, Grocery shopping, Drive to work." },
            { type: "JOURNAL_PROMPT", description: "How sustainable do you think it will be to consistently use your STEADY SYSTEM? What might be the barriers?" },
            { type: "BRING_TO_SESSION", description: "Bring your STEADY SYSTEM to the next meeting — be ready to review and refine it." },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
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
        title: "Steady Work: Self-Activation",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Eliminating Micro-Stressors — Go through each sensory category and adjust small things in your environment. Touch: Pillows/sheets, Clothes, Work chair, Couch, Lotion/soap, Toothbrush, Water bottle. Smell: Cleaning products, Soaps, Lotion, Hair products, Laundry detergent, Deodorant, Bad smells. Taste: Toothpaste, Drinking water, Snacks, Condiments, Floss. See: Decorations, House setup, Your car, Colors, Clutter. Hear: Sound machine, Music, Alarm tones, Ring tones, Text notifications, TV volume. Mark Y for changes made, N for no change." },
            { type: "ACTION", description: "Healthy vs. Unhealthy Dopamine Behaviors — List your healthy dopamine behaviors and your unhealthy dopamine behaviors." },
            { type: "ACTION", description: "Reflection: Which healthy behaviors do you want to increase? Which unhealthy behaviors do you want to reduce? Name new healthy behaviors you will try." },
            { type: "JOURNAL_PROMPT", description: "For all changes you made (Y answers), describe the changes you made to reduce micro-stress. If you increased healthy behaviors or reduced unhealthy behaviors, write about those here." },
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
        title: "Steady Work: Emotion Regulation",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Identify What Dysregulates You — List situations, people, or triggers that make you feel off-balance. Rate each from 1-10 (10 = most dysregulating)." },
            { type: "ACTION", description: "Notice Your Common Impulses — What actions or urges often show up when you're stressed or dysregulated?" },
            { type: "ACTION", description: "How Do You Cope with RSD? — Where does Rejection Sensitive Dysphoria show up for you?" },
            { type: "ACTION", description: "Early Messages About Your ADHD — List messages you remember receiving about your ADHD symptoms. Who sent these messages? (Mom, Dad, Brother, Sister, Aunt, Uncle, Cousin, Teacher, Friend, Partner, Tutor, Coach, Other). How do you cope with these early messages now?" },
            { type: "ACTION", description: "Childhood Challenges — How did your ADHD symptoms make life harder when you were young?" },
            { type: "ACTION", description: "Inner Critic — What does your inner critic say? How does it make you feel?" },
            { type: "ACTION", description: "Strengths & Weaknesses — List your strengths and weaknesses." },
            { type: "JOURNAL_PROMPT", description: "Throughout the week, notice a moment when your inner critic spoke up. Write what it said and how it made you feel." },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
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
        title: "Steady Work: Self Awareness",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "HINDSIGHT (Success) — Think about something in your past that worked out well. What was it? How exactly did you do that? How could you repeat the success? What helped it work? Were there any barriers? How did you get through them?" },
            { type: "ACTION", description: "HINDSIGHT (Learning from a tough moment) — Think of a difficult moment. What went wrong? What could you try differently next time? What got in the way?" },
            { type: "ACTION", description: "HINDSIGHT + SELF-AWARENESS — Notice your patterns. Identify one pattern you see in your behavior. Do you react the same way in certain situations? Are you usually grumpy in the morning? More impulsive with certain people? More irritable in certain places? What kinds of things do you usually look forward to?" },
            { type: "ACTION", description: "Foresight and Time Horizon — Look in your STEADY SYSTEM and identify an upcoming event. Imagine the event using your senses. How might this feel for me? Should I schedule this if I might be tired after work? Will I enjoy going? Should I bring anything I might need later? Who will be there? Will it be loud or overstimulating? Do I actually enjoy doing this activity? Is this important for me to attend?" },
            { type: "ACTION", description: "ADHD + RELATIONSHIPS — How does ADHD show up in your relationships? What changes might you make? How will you make these changes? Consider: Co-workers, Friends, Romantic partner(s), Family, Roommate, Strangers." },
            { type: "JOURNAL_PROMPT", description: "Describe yourself in 3 sentences." },
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

  // ── 4c. Jim the physical therapist ─────────────────────────────
  const jimPasswordHash = await bcrypt.hash("Jim1", 12);

  const jimClinician = await prisma.user.upsert({
    where: { email: "jim@jim.com" },
    update: { passwordHash: jimPasswordHash },
    create: {
      email: "jim@jim.com",
      passwordHash: jimPasswordHash,
      firstName: "Jim",
      lastName: "Kowalski",
      role: "CLINICIAN",
      clinicianProfile: {
        create: {
          practiceName: "Kowalski Physical Therapy",
          licenseType: "DPT",
        },
      },
    },
    include: { clinicianProfile: true },
  });

  // Helper for Jim's modules
  async function createJimModule(
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

  // ── Jim's Program 1: Rachel S. — Post-ACL reconstruction ──────
  const rachelProgram = await prisma.program.create({
    data: {
      clinicianId: jimClinician.clinicianProfile!.id,
      title: "Rachel S.",
      description: "28-year-old recreational soccer player. 6 weeks post-op ACL reconstruction (left knee, patellar tendon autograft). Goals: return to soccer in 9 months, full ROM by week 12, quad strength symmetry by month 6.",
      cadence: "WEEKLY",
      enrollmentMethod: "INVITE",
      sessionType: "ONE_ON_ONE",
      status: "PUBLISHED",
    },
  });

  await createJimModule(rachelProgram.id, 0, {
    title: "Week 1: Swelling Control & Quad Activation",
    subtitle: "Post-Op Week 6–7",
    summary: "Focus on reducing residual swelling and waking up the quad with isometric exercises.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Good session today — your incision is healing well and swelling is mild. Your quad is still having trouble firing, which is completely normal at this stage. We measured your ROM at 5° extension / 95° flexion. Our goal for this phase is to get full extension (0°) and reach 120° flexion.\n\nYour homework this week is all about ice, elevation, and getting that quad to wake up. Do these exercises daily — consistency matters more than intensity right now.",
      },
    },
    {
      type: "CHECKLIST",
      title: "Daily Swelling Management",
      content: {
        type: "CHECKLIST",
        items: [
          { text: "Ice your knee for 20 minutes, 3x per day (use a timer)", sortOrder: 0 },
          { text: "Elevate your leg above your heart for 20 min after each icing session", sortOrder: 1 },
          { text: "Wear compression sleeve during the day", sortOrder: 2 },
          { text: "Measure knee circumference at kneecap each morning — track in journal", sortOrder: 3 },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Exercise Program — Week 1",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Quad sets: Sit with leg straight, push the back of your knee into the floor/bed and hold 10 seconds. 3 sets of 15 reps, 3x per day. Focus on seeing your quad muscle tighten.", sortOrder: 0 },
          { type: "ACTION", description: "Straight leg raises: Tighten quad first (like a quad set), then lift leg 12 inches off the surface and hold 5 seconds. 3 sets of 10 reps, 2x per day. If your knee bends when you lift, go back to quad sets — you're not ready yet.", sortOrder: 1 },
          { type: "ACTION", description: "Heel slides: Lie on your back, slowly slide your heel toward your butt as far as comfortable, hold 5 seconds, slide back. 3 sets of 15 reps, 2x per day. Use a towel under your heel to reduce friction.", sortOrder: 2 },
          { type: "ACTION", description: "Ankle pumps: Pump your foot up and down 30 times every hour while sitting or lying down. This helps circulation and reduces swelling.", sortOrder: 3 },
          { type: "JOURNAL_PROMPT", prompts: [
            "Rate your knee pain today (0-10). How does it compare to yesterday?",
            "Were you able to complete all exercises today? If not, what got in the way?",
          ], spaceSizeHint: "medium", sortOrder: 4 },
          { type: "BRING_TO_SESSION", reminderText: "Wear shorts so we can assess your knee. Bring your pain/swelling log.", sortOrder: 5 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createJimModule(rachelProgram.id, 1, {
    title: "Week 2: ROM Progression & Gait Training",
    subtitle: "Post-Op Week 7–8",
    summary: "Push toward full extension, progress flexion, and start normalizing your walking pattern.",
    estimatedMinutes: 25,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Great progress — swelling is down and your quad is firing better. ROM improved to 2° extension / 105° flexion. We started some gait training today and your walking pattern is compensating (you're leaning away from the surgical leg). This week we'll work on normalizing that.\n\nWe're adding standing exercises and bike work. Remember: push into mild discomfort on ROM but never sharp pain.",
      },
    },
    {
      type: "STRATEGY_CARDS",
      title: "Pain vs. Discomfort Guide",
      content: {
        type: "STRATEGY_CARDS",
        deckName: "Know Your Limits",
        cards: [
          { title: "Green Light: Mild Discomfort", body: "A stretching or pulling sensation. Achiness after exercise that fades within an hour. This is normal and expected — keep going.", emoji: "🟢" },
          { title: "Yellow Light: Moderate Pain", body: "Pain during exercise rated 4-6/10. Swelling that increases after activity. Reduce intensity by 50% and add more ice. If it persists 2 days, text me.", emoji: "🟡" },
          { title: "Red Light: Sharp Pain", body: "Sudden sharp or stabbing pain. A pop or give-way sensation. Pain above 7/10. Stop immediately and contact the clinic.", emoji: "🔴" },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Exercise Program — Week 2",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Prone hangs for extension: Lie face-down with your knee at the edge of the bed, let gravity straighten your knee. Hold 5 minutes, 3x per day. You can place a light ankle weight (2-3 lbs) for extra stretch.", sortOrder: 0 },
          { type: "ACTION", description: "Wall slides for flexion: Lie on your back with feet on the wall, slowly slide your surgical foot down the wall bending your knee. Hold 10 seconds at your max. 3 sets of 10, 2x per day.", sortOrder: 1 },
          { type: "ACTION", description: "Stationary bike: Seat height set high at first. Pedal gently for 10-15 minutes, 1x per day. Start with half-circles if full rotation is too much. Gradually lower the seat as flexion improves.", sortOrder: 2 },
          { type: "ACTION", description: "Standing weight shifts: Stand with equal weight on both feet. Slowly shift weight onto your surgical leg until you're bearing 75% of your weight. Hold 10 seconds. 3 sets of 10, 2x per day.", sortOrder: 3 },
          { type: "ACTION", description: "Gait practice: Walk in front of a mirror for 5 minutes, 2x per day. Focus on equal step length and not leaning away from your surgical side. Use your crutch on the opposite side if needed.", sortOrder: 4 },
          { type: "JOURNAL_PROMPT", prompts: [
            "How does your knee feel after the bike? Any sharp pain or just achiness?",
            "Record your ROM: how far can you bend and straighten your knee this week?",
          ], spaceSizeHint: "medium", sortOrder: 5 },
          { type: "BRING_TO_SESSION", reminderText: "Wear sneakers — we'll work on gait drills and may start light squats.", sortOrder: 6 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createJimModule(rachelProgram.id, 2, {
    title: "Week 3: Strengthening Phase Begins",
    subtitle: "Post-Op Week 8–9",
    summary: "Transition from ROM focus to building quad and hamstring strength with closed-chain exercises.",
    estimatedMinutes: 25,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "ROM is looking great — 0° extension (full!) and 115° flexion. Quad is activating well. Gait pattern is much improved, only slight hesitation on stairs.\n\nWe're moving into strengthening now. These exercises will be harder and your knee will be sore after. That's expected. Keep icing after workouts. The goal this week is to build a base of strength that will carry you through the next few months.",
      },
    },
    {
      type: "HOMEWORK",
      title: "Exercise Program — Week 3",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Mini squats: Stand with feet hip-width apart, squat down to about 45° (don't go past where your thighs are parallel). Hold 3 seconds at the bottom. 3 sets of 12, 2x per day. Keep your weight in your heels.", sortOrder: 0 },
          { type: "ACTION", description: "Step-ups: Use a 6-inch step. Step up leading with your surgical leg, fully straighten at the top, then step back down slowly. 3 sets of 10 each leg, 1x per day. Control the lowering — that's where the strength is built.", sortOrder: 1 },
          { type: "ACTION", description: "Hamstring curls: Stand holding a counter, curl your surgical leg heel to your butt. 3 sets of 15, 2x per day. Add a resistance band when this feels easy.", sortOrder: 2 },
          { type: "ACTION", description: "Single-leg balance: Stand on your surgical leg for 30 seconds. 5 reps, 2x per day. Start near a wall for safety. When this is easy, try it with eyes closed.", sortOrder: 3 },
          { type: "ACTION", description: "Continue stationary bike — increase to 20 minutes, add light resistance.", sortOrder: 4 },
          { type: "JOURNAL_PROMPT", prompts: [
            "How sore are you the day after exercises? Does it resolve within 24 hours?",
            "How confident do you feel on stairs? Any moments of instability?",
          ], spaceSizeHint: "medium", sortOrder: 5 },
          { type: "BRING_TO_SESSION", reminderText: "Bring sneakers. We'll test your single-leg squat form and may progress to lateral exercises.", sortOrder: 6 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createJimModule(rachelProgram.id, 3, {
    title: "Week 4: Agility & Sport-Specific Prep",
    subtitle: "Post-Op Week 9–10",
    summary: "Introduce lateral movements and early agility drills to prepare for return-to-sport progression.",
    estimatedMinutes: 25,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Strength is coming along nicely. Your single-leg squat form is solid and you handled lateral band walks well in the clinic today. No increased swelling after last week's exercises, which is a great sign.\n\nThis week we're introducing agility work. These drills are the first step toward getting back on the soccer field. Start slow — the goal is control and confidence, not speed.",
      },
    },
    {
      type: "HOMEWORK",
      title: "Exercise Program — Week 4",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Lateral band walks: Place a resistance band around your ankles. Take 15 steps to the right, then 15 to the left. Stay in a slight squat position. 3 sets, 1x per day. Keep your toes pointed forward.", sortOrder: 0 },
          { type: "ACTION", description: "Forward/backward walking lunges: 10 steps forward, 10 steps back. 2 sets, 1x per day. Keep your knee tracking over your second toe — don't let it cave inward.", sortOrder: 1 },
          { type: "ACTION", description: "Ladder drills (if you have one, or use tape on the floor): Forward two-feet-in, lateral shuffles. Go slowly for control, not speed. 5 minutes, 1x per day.", sortOrder: 2 },
          { type: "ACTION", description: "Single-leg Romanian deadlift: Hold a light weight, hinge at the hip while extending your non-surgical leg behind you. 3 sets of 8 each side, 1x per day. This builds hamstring and glute stability.", sortOrder: 3 },
          { type: "ACTION", description: "Continue all Week 3 exercises — squats, step-ups, hamstring curls, and bike.", sortOrder: 4 },
          { type: "JOURNAL_PROMPT", prompts: [
            "How does your knee feel during lateral movements? Any apprehension or trust issues with the knee?",
            "On a scale of 1-10, how confident are you that your knee can handle soccer-type movements eventually?",
          ], spaceSizeHint: "medium", sortOrder: 5 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your soccer cleats — we'll check fit and talk about your return-to-sport timeline.", sortOrder: 6 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "EVERY_OTHER_DAY",
      },
    },
  ]);

  // ── Jim's Program 2: Tom D. — Chronic low back pain ──────
  const tomProgram = await prisma.program.create({
    data: {
      clinicianId: jimClinician.clinicianProfile!.id,
      title: "Tom D.",
      description: "52-year-old office worker. Chronic low back pain for 3 years, worse after prolonged sitting. MRI shows mild disc degeneration L4-L5. No radiculopathy. Sedentary lifestyle. Goals: reduce pain from 7/10 to 3/10, sit through workday without pain breaks, start walking 30 min/day.",
      cadence: "WEEKLY",
      enrollmentMethod: "INVITE",
      sessionType: "ONE_ON_ONE",
      status: "PUBLISHED",
    },
  });

  await createJimModule(tomProgram.id, 0, {
    title: "Week 1: Pain Education & Baseline Movement",
    subtitle: "Mar 5 – Mar 12",
    summary: "Understand your pain better and start with gentle mobility exercises to break the fear-avoidance cycle.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Thanks for being open about your pain history today, Tom. I know 3 years of back pain is exhausting. Here's the key takeaway from our session: your MRI shows normal age-related changes, not damage. The disc degeneration at L4-L5 is found in most people over 40, including people with zero pain.\n\nYour pain is real — but it's driven more by muscle deconditioning, prolonged postures, and your nervous system being on high alert than by structural damage. That's actually great news because it means we can change it.\n\nThis week is about gentle movement and starting to retrain your brain that movement is safe.",
      },
    },
    {
      type: "STRATEGY_CARDS",
      title: "Pain Science Basics",
      content: {
        type: "STRATEGY_CARDS",
        deckName: "Understanding Your Back",
        cards: [
          { title: "Pain ≠ Damage", body: "Chronic pain is your nervous system being overprotective. The alarm is too sensitive. Movement helps recalibrate the alarm — it doesn't cause more damage.", emoji: "🧠" },
          { title: "Motion is Lotion", body: "Your discs don't have a blood supply — they get nutrients from movement. Sitting still for hours starves them. Frequent position changes are medicine for your back.", emoji: "💧" },
          { title: "The 30-30 Rule", body: "Every 30 minutes, change position for at least 30 seconds. Stand, stretch, walk to the kitchen. Set a timer if you need to. Your back will thank you.", emoji: "⏰" },
          { title: "Hurt ≠ Harm", body: "Some discomfort during exercise is OK and expected. It doesn't mean you're injuring yourself. If pain spikes above 5/10 or lasts more than 24 hours after exercise, we'll modify.", emoji: "💪" },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Exercise Program — Week 1",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Cat-cow stretches: On hands and knees, alternate between arching and rounding your back. Slow and controlled. 2 sets of 10, morning and evening. Focus on the movement feeling good, not on how far you can go.", sortOrder: 0 },
          { type: "ACTION", description: "Pelvic tilts: Lie on your back with knees bent. Gently flatten your lower back against the floor, hold 5 seconds, release. 2 sets of 15, 2x per day. This activates your deep core without stressing your back.", sortOrder: 1 },
          { type: "ACTION", description: "Walking: Start with 10-minute walks, 1x per day. Walk at a comfortable pace — this is not a workout, it's medicine. Increase by 2 minutes each day if pain stays below 4/10.", sortOrder: 2 },
          { type: "ACTION", description: "30-30 Rule at work: Set a phone timer for every 30 minutes. Stand up, do 3 standing back extensions (hands on hips, lean back gently), then sit back down. Track how many times you hit the timer this week.", sortOrder: 3 },
          { type: "JOURNAL_PROMPT", prompts: [
            "Rate your back pain each morning (0-10) and each evening (0-10). Note what made it better or worse.",
            "How did it feel to move more this week? Any surprises?",
          ], spaceSizeHint: "medium", sortOrder: 4 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your pain log and wear comfortable clothes for movement assessment.", sortOrder: 5 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createJimModule(tomProgram.id, 1, {
    title: "Week 2: Core Stability & Desk Ergonomics",
    subtitle: "Mar 12 – Mar 19",
    summary: "Build foundational core strength and optimize your workstation to reduce pain triggers.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Your pain log showed a clear pattern — worst in the afternoon after 3+ hours at the desk, better on days you walked. That's textbook for deconditioning-driven back pain. Your morning pain went from 7/10 to 5/10 just from the gentle exercises. Great start.\n\nToday we worked on core activation. Your transverse abdominis (deep core) is very weak — it's not supporting your spine during sitting. We're going to fix that. We also looked at photos of your desk setup and there are some quick wins there.",
      },
    },
    {
      type: "CHECKLIST",
      title: "Desk Setup Fixes",
      content: {
        type: "CHECKLIST",
        items: [
          { text: "Raise your monitor so the top of the screen is at eye level (use a stack of books or a monitor stand)", sortOrder: 0 },
          { text: "Scoot your chair in so you're not reaching for the keyboard — elbows at 90°", sortOrder: 1 },
          { text: "Add a small lumbar roll or rolled-up towel behind your lower back", sortOrder: 2 },
          { text: "Place feet flat on the floor (use a footrest if your chair is too high)", sortOrder: 3 },
          { text: "Take a photo of your new setup and bring it to our next session", sortOrder: 4 },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Exercise Program — Week 2",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Dead bugs: Lie on your back, arms toward ceiling, knees bent at 90°. Slowly extend one arm overhead and the opposite leg straight — keep your lower back pressed into the floor. 3 sets of 8 each side, 1x per day. If your back arches, you've gone too far.", sortOrder: 0 },
          { type: "ACTION", description: "Bird dogs: On hands and knees, extend one arm forward and the opposite leg back. Hold 5 seconds. 3 sets of 8 each side, 1x per day. Move slowly — wobbling means your core is working.", sortOrder: 1 },
          { type: "ACTION", description: "Glute bridges: Lie on your back, knees bent, push hips to the ceiling. Squeeze your glutes at the top for 5 seconds. 3 sets of 12, 1x per day. Your glutes are key back stabilizers — they've been asleep from all the sitting.", sortOrder: 2 },
          { type: "ACTION", description: "Walking: Increase to 15-20 minutes, still 1x per day. Try to walk at lunch to break up the sitting day.", sortOrder: 3 },
          { type: "ACTION", description: "Continue 30-30 rule and cat-cow from Week 1.", sortOrder: 4 },
          { type: "JOURNAL_PROMPT", prompts: [
            "How is your afternoon pain after the desk changes? Better, same, or worse?",
            "Rate your confidence in your back (1-10). Do you trust it more than last week?",
          ], spaceSizeHint: "medium", sortOrder: 5 },
          { type: "BRING_TO_SESSION", reminderText: "Bring a photo of your new desk setup and your pain log.", sortOrder: 6 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createJimModule(tomProgram.id, 2, {
    title: "Week 3: Loading & Functional Strength",
    subtitle: "Mar 19 – Mar 26",
    summary: "Progress to weighted exercises and practice real-world movements that trigger your pain.",
    estimatedMinutes: 25,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Afternoon pain is down to 3-4/10 and you walked 5 out of 7 days. The desk changes helped a lot. Your dead bug form is solid — core is waking up.\n\nToday we started adding load. I know this feels scary — picking things up off the floor has been a big fear for you. But your back is strong enough. We practiced hip hinge mechanics and your form was good. The goal this week is to build confidence with bending and lifting using proper patterns.",
      },
    },
    {
      type: "HOMEWORK",
      title: "Exercise Program — Week 3",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Goblet squats: Hold a light weight (10-15 lbs — a gallon jug of water works) at your chest. Squat down keeping your chest up and weight in your heels. 3 sets of 10, every other day. Go as low as comfortable.", sortOrder: 0 },
          { type: "ACTION", description: "Hip hinge practice: Stand with your back to a wall, feet 6 inches from the wall. Push your hips back until your butt touches the wall, then stand up. 3 sets of 10, daily. This is the safe bending pattern — use it for everything (picking up laundry, loading dishwasher, etc).", sortOrder: 1 },
          { type: "ACTION", description: "Suitcase carries: Hold a weight (15-20 lbs) in one hand, walk 30 steps, switch hands, walk 30 steps. 3 rounds, every other day. Stand tall — don't lean. This trains your core to stabilize under real-world conditions.", sortOrder: 2 },
          { type: "ACTION", description: "Continue dead bugs, bird dogs, glute bridges, and walking (push walking to 25-30 min).", sortOrder: 3 },
          { type: "JOURNAL_PROMPT", prompts: [
            "Did you use the hip hinge pattern for any real-life tasks this week? How did it feel?",
            "What movements are you still afraid of? What would you like to be able to do pain-free?",
          ], spaceSizeHint: "medium", sortOrder: 4 },
          { type: "BRING_TO_SESSION", reminderText: "Wear sneakers. We'll progress to deadlift variations and test your lifting confidence.", sortOrder: 5 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "EVERY_OTHER_DAY",
      },
    },
  ]);

  await createJimModule(tomProgram.id, 3, {
    title: "Week 4: Independence & Long-Term Plan",
    subtitle: "Mar 26 – Apr 2",
    summary: "Build a sustainable exercise routine you can maintain on your own after PT.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Tom, you're doing amazing. Morning pain is consistently 2-3/10, afternoon pain is 3/10 even after a full workday. You deadlifted 50 lbs in the clinic today with perfect form and zero pain. That's a huge win for someone who was afraid to bend over a month ago.\n\nThis week is about building your long-term maintenance routine. We want to make sure you have a plan you can stick to 3x per week after we reduce session frequency.",
      },
    },
    {
      type: "STRATEGY_CARDS",
      title: "Your Maintenance Routine",
      content: {
        type: "STRATEGY_CARDS",
        deckName: "3x/Week Back Health Routine",
        cards: [
          { title: "Warm-Up (5 min)", body: "Cat-cow x10, pelvic tilts x10, walk in place 2 minutes. Do this before every session.", emoji: "🔥" },
          { title: "Core Circuit (10 min)", body: "Dead bugs 2x10, bird dogs 2x10, glute bridges 2x15, side planks 2x20 seconds each side. No rest between exercises, 1 minute between rounds.", emoji: "🏋️" },
          { title: "Strength (15 min)", body: "Goblet squats 3x12, hip hinge/deadlift 3x10, suitcase carries 3 rounds, step-ups 2x10 each side. Rest 60 seconds between sets.", emoji: "💪" },
          { title: "Cooldown (5 min)", body: "Child's pose 30 seconds, knee-to-chest stretch 30 seconds each side, standing back extension x5, 2-minute walk.", emoji: "🧘" },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Exercise Program — Week 4",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Complete the full maintenance routine (all 4 cards above) on your own 3 times this week. Time yourself — it should take about 35 minutes.", sortOrder: 0 },
          { type: "ACTION", description: "Walking: 30 minutes daily. You've earned this — it's now a non-negotiable part of your day. Morning or lunch walk is best for your schedule.", sortOrder: 1 },
          { type: "ACTION", description: "Continue the 30-30 rule at work. This is a permanent habit.", sortOrder: 2 },
          { type: "JOURNAL_PROMPT", prompts: [
            "How confident do you feel managing your back pain on your own (1-10)?",
            "What's been the biggest mindset shift for you over these 4 weeks?",
            "What's your plan for the days you don't feel like exercising?",
          ], spaceSizeHint: "large", sortOrder: 3 },
          { type: "BRING_TO_SESSION", reminderText: "Bring any questions about your long-term plan. We'll discuss reducing to biweekly check-ins.", sortOrder: 4 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "EVERY_OTHER_DAY",
      },
    },
  ]);

  // ── Jim's Program 3: Linda W. — Frozen shoulder ──────
  const lindaProgram = await prisma.program.create({
    data: {
      clinicianId: jimClinician.clinicianProfile!.id,
      title: "Linda W.",
      description: "61-year-old retired teacher. Adhesive capsulitis (frozen shoulder) right side, currently in the thawing phase. Limited to 90° flexion, 60° abduction, hand only reaches lower back for IR. Goals: reach overhead to get dishes from cabinet, sleep without shoulder pain, return to gardening.",
      cadence: "WEEKLY",
      enrollmentMethod: "INVITE",
      sessionType: "ONE_ON_ONE",
      status: "PUBLISHED",
    },
  });

  await createJimModule(lindaProgram.id, 0, {
    title: "Week 1: Gentle Mobility & Pain Management",
    subtitle: "Mar 5 – Mar 12",
    summary: "Start reclaiming range of motion with gentle pendulums and stretches. Manage nighttime pain.",
    estimatedMinutes: 15,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Linda, thank you for your patience — frozen shoulder is a frustrating condition but you're in the thawing phase now, which means your range of motion will start improving. Today we measured 90° flexion, 60° abduction, and internal rotation to your lower back.\n\nThe biggest complaint right now is the nighttime pain waking you up. We talked about sleeping positions (pillow under the arm, sleeping on your good side) and I want you to try the ice routine below before bed.\n\nThis week's exercises are all about gentle, pain-free range of motion. Do NOT push into sharp pain — gentle stretching sensation only.",
      },
    },
    {
      type: "HOMEWORK",
      title: "Exercise Program — Week 1",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Pendulum exercises: Lean forward supporting yourself on a table with your good arm. Let your affected arm hang and make small circles — 10 clockwise, 10 counterclockwise. Then swing front-to-back 10 times and side-to-side 10 times. Do this 3x per day. Let gravity do the work, don't muscle it.", sortOrder: 0 },
          { type: "ACTION", description: "Finger wall walks — forward: Stand facing a wall, walk your fingers up the wall as high as you can. Mark the height with a piece of tape. Hold 10 seconds at the top. 3 sets of 5, 2x per day. Try to beat your tape mark by the end of the week.", sortOrder: 1 },
          { type: "ACTION", description: "Cross-body stretch: Use your good arm to gently pull your affected arm across your chest. Hold 30 seconds. 3 reps, 3x per day. You should feel a stretch in the back of your shoulder, not pain.", sortOrder: 2 },
          { type: "ACTION", description: "Towel internal rotation stretch: Hold a towel behind your back (good hand on top, affected hand on bottom). Gently pull upward with the good hand to stretch the affected shoulder. Hold 15 seconds. 3 reps, 2x per day.", sortOrder: 3 },
          { type: "ACTION", description: "Before bed: Ice your shoulder for 15 minutes, then do the pendulum exercise one last time. Sleep with a pillow supporting your affected arm.", sortOrder: 4 },
          { type: "JOURNAL_PROMPT", prompts: [
            "Rate your shoulder pain today: morning (0-10), evening (0-10), nighttime wake-ups (how many times)?",
            "How high did your finger wall walk get? Record the height each day.",
          ], spaceSizeHint: "medium", sortOrder: 5 },
          { type: "BRING_TO_SESSION", reminderText: "Wear a tank top or loose sleeve so I can assess your shoulder movement.", sortOrder: 6 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createJimModule(lindaProgram.id, 1, {
    title: "Week 2: Active Range of Motion & Light Resistance",
    subtitle: "Mar 12 – Mar 19",
    summary: "Progress from passive stretching to active movement and introduce light resistance exercises.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Good news — your flexion improved to 105° and abduction to 75°. That's solid progress in one week. Night pain is better with the sleeping position changes (down to 1 wake-up from 3-4).\n\nWe're going to start active range of motion and light resistance this week. Your muscles have weakened from months of limited use, so we need to rebuild strength alongside mobility. Use the lightest resistance band (yellow) for all band exercises.",
      },
    },
    {
      type: "HOMEWORK",
      title: "Exercise Program — Week 2",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Active flexion: Lie on your back, clasp both hands together, slowly raise arms overhead as far as you can. 3 sets of 10, 2x per day. Your good arm assists the affected one — let it help.", sortOrder: 0 },
          { type: "ACTION", description: "External rotation with band: Elbow at your side, bent 90°. Rotate your forearm outward against the band. 3 sets of 12, 1x per day. Keep your elbow glued to your side.", sortOrder: 1 },
          { type: "ACTION", description: "Scapular squeezes: Squeeze your shoulder blades together and hold 5 seconds. 3 sets of 15, 2x per day. This activates the muscles around your shoulder blade that support overhead movement.", sortOrder: 2 },
          { type: "ACTION", description: "Dowel-assisted overhead stretch: Hold a broomstick with both hands, use your good arm to push the affected arm overhead. Hold 10 seconds at the top. 3 sets of 8, 2x per day.", sortOrder: 3 },
          { type: "ACTION", description: "Continue all Week 1 stretches (pendulums, wall walks, cross-body, towel IR).", sortOrder: 4 },
          { type: "JOURNAL_PROMPT", prompts: [
            "How many nighttime wake-ups this week? Is the pillow trick still helping?",
            "Can you reach anything now that you couldn't last week? (cabinet, seatbelt, back zipper, etc.)",
          ], spaceSizeHint: "medium", sortOrder: 5 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your resistance band. We'll check your form and may progress to a heavier band.", sortOrder: 6 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createJimModule(lindaProgram.id, 2, {
    title: "Week 3: Functional Tasks & Strength Building",
    subtitle: "Mar 19 – Mar 26",
    summary: "Practice real-life movements — reaching overhead, behind your back, and carrying objects.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Flexion is up to 130° and abduction to 95°! You mentioned you could reach the second shelf of your kitchen cabinet this week for the first time in months. That's exactly the kind of progress we want.\n\nThis week we're going to focus on functional movements — the things you actually need to do in daily life. We'll also push your strength work up a notch.",
      },
    },
    {
      type: "HOMEWORK",
      title: "Exercise Program — Week 3",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Overhead reach practice: Stand in your kitchen and practice reaching to different shelves. Start with the easiest shelf and work up. Do 5 reaches to each shelf you can access, 2x per day. Use your good arm to spot if needed.", sortOrder: 0 },
          { type: "ACTION", description: "Behind-the-back reach: Practice reaching behind you as if fastening a bra or tucking in a shirt. Use the towel stretch to assist. Try to move 1 inch higher each day. 3 sets of 5, 2x per day.", sortOrder: 1 },
          { type: "ACTION", description: "Light carries: Carry a light watering can (3-5 lbs) with your affected arm for 1 minute. Rest. Repeat 3 times, 1x per day. This prepares you for gardening.", sortOrder: 2 },
          { type: "ACTION", description: "Band pull-aparts: Hold band in front of you at shoulder height, pull apart until arms are wide. 3 sets of 15, 1x per day. Progress to green (medium) band if yellow is too easy.", sortOrder: 3 },
          { type: "ACTION", description: "Continue active flexion, external rotation with band, and scapular squeezes from Week 2.", sortOrder: 4 },
          { type: "JOURNAL_PROMPT", prompts: [
            "What daily tasks can you do now that you couldn't do 3 weeks ago? Make a list!",
            "Is nighttime pain still an issue or has it resolved?",
          ], spaceSizeHint: "medium", sortOrder: 5 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your gardening gloves — we'll simulate some gardening movements and see what you can handle.", sortOrder: 6 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createJimModule(lindaProgram.id, 3, {
    title: "Week 4: Return to Activities & Maintenance",
    subtitle: "Mar 26 – Apr 2",
    summary: "Ease back into gardening and overhead activities with a sustainable home program.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Linda, your range of motion is dramatically better — 155° flexion, 130° abduction, and you can reach your mid-back with internal rotation. Night pain is gone. You're sleeping through the night for the first time in 6 months.\n\nYou're ready to start easing back into gardening and normal overhead activities. The key is to build up gradually — start with 15-minute gardening sessions and increase from there. Your shoulder will be stiff in the morning for a while — that's normal. Do your pendulums and stretches first thing.",
      },
    },
    {
      type: "CHECKLIST",
      title: "Return to Gardening — Gradual Plan",
      content: {
        type: "CHECKLIST",
        items: [
          { text: "Day 1-3: Light gardening only — watering, deadheading, nothing overhead. Limit to 15 minutes.", sortOrder: 0 },
          { text: "Day 4-5: Add light pruning (below shoulder height). Extend to 20-25 minutes.", sortOrder: 1 },
          { text: "Day 6-7: Try overhead pruning for short bursts (2-3 minutes at a time, then rest). Total session 30 minutes.", sortOrder: 2 },
          { text: "Ice shoulder for 15 minutes after each gardening session", sortOrder: 3 },
          { text: "If pain increases above 4/10 during gardening, stop and switch to a different task", sortOrder: 4 },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Exercise Program — Week 4",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Full home exercise routine: pendulums, wall walks, active flexion, external rotation with band (green), scapular squeezes, band pull-aparts, overhead reaches. Complete this entire routine 3x per week. It should take about 20 minutes.", sortOrder: 0 },
          { type: "ACTION", description: "Follow the gardening return plan (checklist above). Don't skip the ice after.", sortOrder: 1 },
          { type: "ACTION", description: "Practice putting dishes away on the highest shelf you can reach. Do 5 reps each time you unload the dishwasher.", sortOrder: 2 },
          { type: "JOURNAL_PROMPT", prompts: [
            "How did your first gardening session feel? Any pain, or just stiffness?",
            "What activities are you still avoiding because of your shoulder? We'll target those next.",
            "How does your shoulder feel overall compared to when we started? Rate your satisfaction with your progress (1-10).",
          ], spaceSizeHint: "large", sortOrder: 3 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your home exercise list — we'll update it for your maintenance phase and discuss spacing sessions to biweekly.", sortOrder: 4 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "EVERY_OTHER_DAY",
      },
    },
  ]);

  const jimPrograms = [rachelProgram, tomProgram, lindaProgram];

  // ── 4d. Maya Chen — Registered Dietitian Nutritionist ─────────────────
  const mayaPasswordHash = await bcrypt.hash("Maya1", 12);

  const mayaClinician = await prisma.user.upsert({
    where: { email: "maya@maya.com" },
    update: { passwordHash: mayaPasswordHash },
    create: {
      email: "maya@maya.com",
      passwordHash: mayaPasswordHash,
      firstName: "Maya",
      lastName: "Chen",
      role: "CLINICIAN",
      clinicianProfile: {
        create: {
          practiceName: "Nourish Nutrition Counseling",
          licenseType: "RDN, CDCES",
        },
      },
    },
    include: { clinicianProfile: true },
  });

  async function createMayaModule(
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

  // ── Maya's Program 1: Angela R. — Type 2 diabetes, newly diagnosed ──────
  const angelaProgram = await prisma.program.create({
    data: {
      clinicianId: mayaClinician.clinicianProfile!.id,
      title: "Angela R.",
      description: "45-year-old paralegal. Newly diagnosed T2 diabetes, A1C 8.2%. On metformin 500mg 2x/day. No prior nutrition counseling. Eats fast food 4-5x/week, skips breakfast, large portions at dinner. Goals: reduce A1C to under 7%, learn to meal prep, understand carb counting.",
      cadence: "BIWEEKLY",
      enrollmentMethod: "INVITE",
      sessionType: "ONE_ON_ONE",
      status: "PUBLISHED",
    },
  });

  await createMayaModule(angelaProgram.id, 0, {
    title: "Week 1: Understanding Carbs & Blood Sugar",
    subtitle: "Mar 5 – Mar 19",
    summary: "Learn the basics of how food affects your blood sugar and start logging meals.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Angela, great first session! I know a new diabetes diagnosis feels overwhelming, but I want you to know — this is very manageable with the right habits, and you don't have to be perfect.\n\nKey takeaways:\n- Not all carbs are equal. We want to focus on complex carbs (whole grains, beans, vegetables) over simple carbs (white bread, sugary drinks, candy)\n- The goal is not zero carbs — it's the right amount at the right times\n- Pairing carbs with protein or fat slows the blood sugar spike\n- Eating consistently (not skipping meals) keeps your blood sugar more stable than one big meal\n\nThis week is just about awareness — no major diet changes yet. I want you to see your own patterns before we start adjusting.",
      },
    },
    {
      type: "STRATEGY_CARDS",
      title: "Blood Sugar Basics",
      content: {
        type: "STRATEGY_CARDS",
        deckName: "Carb Smarts",
        cards: [
          { title: "The Plate Method", body: "Fill half your plate with non-starchy vegetables (broccoli, salad, green beans). One quarter with lean protein (chicken, fish, beans). One quarter with a complex carb (brown rice, sweet potato, whole grain bread).", emoji: "🍽️" },
          { title: "Pair Your Carbs", body: "Never eat carbs alone. Always pair with protein or healthy fat. Apple → apple with peanut butter. Crackers → crackers with cheese. Toast → toast with eggs. The combo slows digestion and prevents blood sugar spikes.", emoji: "🤝" },
          { title: "Drink Water First", body: "Sugary drinks are the #1 blood sugar spiker. Replace soda and juice with water, sparkling water, or unsweetened tea. If you need flavor, add lemon, cucumber, or berries to your water.", emoji: "💧" },
          { title: "Don't Skip Breakfast", body: "Skipping breakfast leads to blood sugar crashes and overeating later. Even something small — Greek yogurt, a handful of nuts, a hard-boiled egg — sets you up for a more stable day.", emoji: "🌅" },
          { title: "Read the Label", body: "Check 'Total Carbohydrates' not just sugar. A good target is 30-45g of carbs per meal and 15-20g per snack. But we'll personalize this for you over the next few weeks.", emoji: "🏷️" },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Nutrition Homework — Week 1",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Food log: Write down everything you eat and drink for 5 out of 7 days this week. Include the time, what you ate, and a rough portion size. Don't change what you eat yet — I want to see your baseline. Use your phone's notes app, a paper notebook, or take photos of every meal.", sortOrder: 0 },
          { type: "ACTION", description: "Check your blood sugar before breakfast and 2 hours after dinner every day. Write it in your food log next to the meal. We're looking for patterns — which meals spike you the most?", sortOrder: 1 },
          { type: "ACTION", description: "Replace one sugary drink per day with water or unsweetened tea. Just one — that's it for this week.", sortOrder: 2 },
          { type: "ACTION", description: "Eat breakfast at least 5 days this week. It doesn't need to be fancy — a string cheese and a handful of almonds counts. The goal is to break the skipping habit.", sortOrder: 3 },
          { type: "JOURNAL_PROMPT", prompts: [
            "What did you notice about your blood sugar readings? Any meals that surprised you (higher or lower than expected)?",
            "What's the hardest part about eating differently right now? What feels doable?",
          ], spaceSizeHint: "medium", sortOrder: 4 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your food log and blood sugar readings. We'll analyze them together and build your meal plan.", sortOrder: 5 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createMayaModule(angelaProgram.id, 1, {
    title: "Week 2: Meal Planning & Prep Basics",
    subtitle: "Mar 19 – Apr 2",
    summary: "Build a simple meal prep routine and learn to plan balanced meals for the work week.",
    estimatedMinutes: 25,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Your food log was really eye-opening! Here's what we found:\n- Skipping breakfast → blood sugar crash by 11am → vending machine run → post-lunch spike to 210\n- Your dinner portions are large but not terrible — the issue is that dinner is your only real meal\n- Fast food lunches are driving most of your spikes. A Wendy's Baconator combo with soda clocked in at 120g of carbs\n\nThe good news: your fasting morning numbers were actually decent (110-125). That tells me your metformin is working and your body responds well when you eat consistently.\n\nThis week we're building a simple meal prep routine so you have food ready and don't need to hit the drive-through.",
      },
    },
    {
      type: "CHECKLIST",
      title: "Sunday Meal Prep Checklist",
      content: {
        type: "CHECKLIST",
        items: [
          { text: "Pick 2 proteins for the week (e.g., chicken thighs + ground turkey)", sortOrder: 0 },
          { text: "Pick 2 vegetables to roast in bulk (e.g., broccoli + bell peppers)", sortOrder: 1 },
          { text: "Cook 1 batch of whole grains (brown rice, quinoa, or whole wheat pasta)", sortOrder: 2 },
          { text: "Prep 5 grab-and-go breakfasts (hard-boiled eggs, overnight oats, or Greek yogurt cups)", sortOrder: 3 },
          { text: "Portion into 5 lunch containers using the plate method", sortOrder: 4 },
          { text: "Buy healthy snacks: nuts, cheese sticks, apple slices, hummus + veggies", sortOrder: 5 },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Nutrition Homework — Week 2",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Do a Sunday meal prep using the checklist above. Set aside 1.5 hours. Put on music or a podcast — make it enjoyable, not a chore. Take a photo of your prepped meals!", sortOrder: 0 },
          { type: "ACTION", description: "Eat your prepped lunch at least 4 out of 5 workdays instead of fast food. It's OK if you still eat out once — progress, not perfection.", sortOrder: 1 },
          { type: "ACTION", description: "Practice the plate method at dinner: serve yourself using a regular plate (not a serving bowl), half veggies, quarter protein, quarter carb. Try this at least 4 dinners this week.", sortOrder: 2 },
          { type: "ACTION", description: "Continue blood sugar monitoring: before breakfast and 2 hours after lunch (we're tracking if prepped meals make a difference vs fast food days).", sortOrder: 3 },
          { type: "JOURNAL_PROMPT", prompts: [
            "How did meal prepping go? What was easy, what was annoying?",
            "Compare your blood sugar on meal-prep lunch days vs fast food days. What do you notice?",
            "What are 2-3 meals you actually enjoyed this week that you'd make again?",
          ], spaceSizeHint: "medium", sortOrder: 4 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your updated food log, blood sugar readings, and the photo of your meal prep!", sortOrder: 5 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "EVERY_OTHER_DAY",
      },
    },
  ]);

  await createMayaModule(angelaProgram.id, 2, {
    title: "Week 3: Eating Out & Social Situations",
    subtitle: "Apr 2 – Apr 16",
    summary: "Learn strategies for restaurants, work lunches, and social gatherings without derailing progress.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Fantastic work with the meal prep — your post-lunch blood sugar dropped from 200+ to 140-160 on prepped meal days. That's a huge difference from one change.\n\nYou mentioned you're worried about a work dinner coming up and your sister's birthday party. Totally valid concern. You can't meal prep your way through every social situation, so this week we're talking about how to navigate restaurants and events without stressing or feeling deprived.",
      },
    },
    {
      type: "STRATEGY_CARDS",
      title: "Eating Out Playbook",
      content: {
        type: "STRATEGY_CARDS",
        deckName: "Restaurant Strategies",
        cards: [
          { title: "Check the Menu First", body: "Look at the restaurant menu online before you go. Pick your meal in advance when you're not hungry or pressured. Most restaurants have nutrition info on their website.", emoji: "📱" },
          { title: "The Swap Game", body: "Fries → side salad or steamed veggies. Soda → sparkling water with lime. White rice → brown rice or extra vegetables. Breaded → grilled. Small swaps add up without feeling like a sacrifice.", emoji: "🔄" },
          { title: "Protein First", body: "At a buffet or party, fill your plate with protein and vegetables first. Then add a small portion of the carb-heavy items you actually want. Eating protein first slows the sugar absorption of everything that follows.", emoji: "🥩" },
          { title: "The One-Plate Rule", body: "At parties and buffets, use one normal-sized plate. No going back for seconds. Put everything you want on one plate, eat it slowly, and be done. This removes the willpower battle.", emoji: "1️⃣" },
          { title: "It's One Meal", body: "One restaurant meal or party won't wreck your progress. What matters is the other 20 meals that week. Enjoy the event, make reasonable choices, and get back to your routine the next meal. No guilt.", emoji: "🎉" },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Nutrition Homework — Week 3",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Before your work dinner, look up the menu and pick a meal using the swap strategy. Text me your plan if you want a second opinion!", sortOrder: 0 },
          { type: "ACTION", description: "At your sister's birthday party, use the protein-first and one-plate rule. Eat a small protein-rich snack before you go so you're not starving when you arrive.", sortOrder: 1 },
          { type: "ACTION", description: "Continue meal prepping on Sunday. Try 1 new recipe this week — here are 3 options: sheet pan chicken fajitas, turkey and veggie stir-fry, or lentil soup. All are diabetes-friendly and batch-cook well.", sortOrder: 2 },
          { type: "ACTION", description: "Check blood sugar before and 2 hours after the restaurant meal and the party meal. We'll compare these to your home-cooked meal numbers.", sortOrder: 3 },
          { type: "JOURNAL_PROMPT", prompts: [
            "How did the work dinner and party go? What strategies did you use? How did you feel about your choices?",
            "Are there any foods you're afraid to eat now because of diabetes? Let's talk about this — restriction often backfires.",
          ], spaceSizeHint: "medium", sortOrder: 4 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your food log and blood sugar readings from the social events.", sortOrder: 5 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "EVERY_OTHER_DAY",
      },
    },
  ]);

  await createMayaModule(angelaProgram.id, 3, {
    title: "Week 4: Fine-Tuning & Long-Term Habits",
    subtitle: "Apr 16 – Apr 30",
    summary: "Personalize your carb targets, troubleshoot sticking points, and build a sustainable routine.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Angela, let's take stock. In 6 weeks you've gone from skipping breakfast and eating fast food daily to consistent meal prepping, eating 3 balanced meals, and navigating social events confidently. Your post-meal blood sugars are averaging 145 (down from 200+). We'll recheck your A1C in 2 months but I expect a significant drop.\n\nThis week is about making this sustainable long-term. We'll fine-tune your carb targets based on your blood sugar data and talk about what happens when motivation dips.",
      },
    },
    {
      type: "HOMEWORK",
      title: "Nutrition Homework — Week 4",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Write out your 'easy week' meal plan — the 5 breakfasts, 5 lunches, and 5 dinners you can make on autopilot with minimal effort. This is your fallback for busy weeks when you don't have time to think about food.", sortOrder: 0 },
          { type: "ACTION", description: "Stock your 'emergency drawer' at work: almonds, protein bars (look for <15g carbs), jerky, individual nut butter packets. For the days you forget your prepped lunch.", sortOrder: 1 },
          { type: "ACTION", description: "Practice reading nutrition labels at the grocery store. Pick 5 items you buy regularly and check the total carbs. Are any of them higher than you expected? Find a lower-carb swap for at least 1 item.", sortOrder: 2 },
          { type: "ACTION", description: "Continue meal prep, breakfast habit, and blood sugar monitoring. These are permanent habits now — not homework.", sortOrder: 3 },
          { type: "JOURNAL_PROMPT", prompts: [
            "What are you most proud of from the past month? What felt impossible at first that now feels normal?",
            "What's your biggest remaining challenge with food? What do you want to work on next?",
            "Rate your confidence in managing your diabetes through nutrition (1-10). What would make it a 10?",
          ], spaceSizeHint: "large", sortOrder: 4 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your 'easy week' meal plan — we'll review it together and make sure it's balanced. Also bring any grocery items you want me to check.", sortOrder: 5 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "EVERY_OTHER_DAY",
      },
    },
  ]);

  // ── Maya's Program 2: Kevin P. — IBS management through diet ──────
  const kevinProgram = await prisma.program.create({
    data: {
      clinicianId: mayaClinician.clinicianProfile!.id,
      title: "Kevin P.",
      description: "33-year-old software developer. IBS-D (diarrhea-predominant) diagnosed 2 years ago. Frequent bloating, urgency, and abdominal pain. Tried eliminating dairy but no improvement. Anxious about eating before meetings. Goals: identify trigger foods, reduce flare-ups to <2/week, eat without anxiety.",
      cadence: "WEEKLY",
      enrollmentMethod: "INVITE",
      sessionType: "ONE_ON_ONE",
      status: "PUBLISHED",
    },
  });

  await createMayaModule(kevinProgram.id, 0, {
    title: "Week 1: Symptom Baseline & Food-Mood Connection",
    subtitle: "Mar 5 – Mar 12",
    summary: "Track symptoms alongside meals, stress, and sleep to find your personal trigger patterns.",
    estimatedMinutes: 15,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Kevin, thanks for being so detailed about your symptoms. Here's what stood out:\n- Flare-ups happen most on weekday mornings (before stand-up meetings) and after lunch\n- You eliminated dairy for 2 weeks with no change — that's actually useful info, it likely isn't lactose\n- Your diet is heavy on common IBS triggers: coffee on an empty stomach, large sandwiches with wheat bread, energy drinks, and late-night snacking\n\nBefore we start eliminating foods, I need a clearer picture. The food-symptom connection in IBS is tricky because stress, sleep, and meal timing all play a role too. This week is about collecting data.",
      },
    },
    {
      type: "HOMEWORK",
      title: "Symptom Tracking — Week 1",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Keep a detailed food-symptom diary for 7 days. For each meal/snack log: time, what you ate, portion size. For each symptom log: time, type (bloating/pain/urgency/diarrhea), severity 1-5, and what you were doing when it started.", sortOrder: 0 },
          { type: "ACTION", description: "Also track: stress level each morning (1-5), hours of sleep, caffeine intake (cups/cans with times), and any alcohol.", sortOrder: 1 },
          { type: "ACTION", description: "Move your morning coffee to AFTER breakfast (even if breakfast is small). Don't drink coffee on an empty stomach this week. Notice if morning symptoms change.", sortOrder: 2 },
          { type: "ACTION", description: "Eat smaller, more frequent meals — aim for 3 moderate meals + 2 small snacks instead of 2 large meals. This reduces the load on your gut at any one time.", sortOrder: 3 },
          { type: "JOURNAL_PROMPT", prompts: [
            "What patterns do you notice between stress and symptoms? Do flare-ups happen more on high-stress days?",
            "How does eating before meetings feel emotionally? What's the worst-case scenario you're imagining?",
          ], spaceSizeHint: "medium", sortOrder: 4 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your completed 7-day food-symptom diary. We'll analyze it together and identify your likely triggers.", sortOrder: 5 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createMayaModule(kevinProgram.id, 1, {
    title: "Week 2: Low-FODMAP Elimination Phase",
    subtitle: "Mar 12 – Mar 19",
    summary: "Begin a structured low-FODMAP elimination to calm your gut and establish a symptom-free baseline.",
    estimatedMinutes: 25,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Your diary showed clear patterns:\n- Morning coffee on empty stomach → urgency within 30 min (every single day)\n- Wheat-heavy lunches (sandwich + chips) → bloating + pain by 2pm\n- Onion and garlic are in almost every meal — these are high-FODMAP and a very common IBS trigger\n- Stress amplifies everything, but even on calm days the wheat/onion pattern held\n\nWe're going to start a low-FODMAP elimination. This is NOT a forever diet — it's a 2-3 week reset to calm your gut, then we reintroduce foods one at a time to find your specific triggers. Most people only need to avoid 2-3 specific FODMAPs long-term.",
      },
    },
    {
      type: "STRATEGY_CARDS",
      title: "Low-FODMAP Swaps",
      content: {
        type: "STRATEGY_CARDS",
        deckName: "Easy FODMAP Swaps",
        cards: [
          { title: "Wheat → Rice or Oats", body: "Swap sandwich bread for rice cakes, rice wraps, or sourdough (lower FODMAP than regular wheat). Pasta → rice noodles or gluten-free pasta. Oatmeal is fine for most people.", emoji: "🍚" },
          { title: "Onion & Garlic → Green Onion Tops & Garlic Oil", body: "The fructans in onion and garlic are in the white/bulb parts. Green onion tops (green part only) are low-FODMAP. Garlic-infused oil gives flavor without the FODMAPs because fructans don't dissolve in oil.", emoji: "🧄" },
          { title: "Apples & Pears → Berries & Oranges", body: "High-fructose fruits (apples, pears, watermelon, mango) can trigger symptoms. Safe fruits: strawberries, blueberries, oranges, grapes, kiwi, pineapple.", emoji: "🫐" },
          { title: "Milk → Lactose-Free", body: "Even though eliminating dairy didn't help before, use lactose-free milk during elimination just to rule it out cleanly. Hard cheeses (cheddar, parmesan) are naturally very low in lactose.", emoji: "🥛" },
          { title: "Safe Vegetables", body: "Stick to: carrots, zucchini, bell peppers, spinach, green beans, potatoes, tomatoes, cucumber, lettuce, eggplant. Avoid: cauliflower, mushrooms, asparagus, artichokes during elimination.", emoji: "🥕" },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Low-FODMAP Week — Week 2",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Follow the low-FODMAP swap guide for all meals this week. I've emailed you a 7-day meal plan with recipes. Stick to it as closely as you can — the cleaner the elimination, the more useful the reintroduction data will be.", sortOrder: 0 },
          { type: "ACTION", description: "Continue eating breakfast before coffee. Switch to 1 cup of regular coffee (not 3). If you need more caffeine, add a green tea in the afternoon — it's gentler on your gut.", sortOrder: 1 },
          { type: "ACTION", description: "Continue the food-symptom diary. We're looking for a reduction in baseline symptoms. Rate your overall gut comfort each day (1-10).", sortOrder: 2 },
          { type: "ACTION", description: "Meal prep Sunday: Make a batch of rice, grill chicken, roast low-FODMAP veggies (zucchini, bell peppers, carrots). This makes weekday lunches easy.", sortOrder: 3 },
          { type: "JOURNAL_PROMPT", prompts: [
            "How is your gut feeling compared to last week? Any improvement in bloating, urgency, or pain?",
            "What's been the hardest food to give up? What low-FODMAP alternatives have you found that you actually like?",
          ], spaceSizeHint: "medium", sortOrder: 4 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your symptom diary. If symptoms have improved significantly, we'll start planning the reintroduction phase next week.", sortOrder: 5 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createMayaModule(kevinProgram.id, 2, {
    title: "Week 3: FODMAP Reintroduction — Phase 1",
    subtitle: "Mar 19 – Mar 26",
    summary: "Systematically reintroduce FODMAP groups one at a time to identify your specific triggers.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Your symptoms improved dramatically — gut comfort went from 3/10 to 7/10, urgency episodes dropped from daily to twice this week, and bloating is down significantly. This confirms FODMAPs are a major driver.\n\nNow comes the important part: reintroduction. We're going to test one FODMAP group at a time over 3 days. You stay low-FODMAP for everything else. If you react, that group is a trigger. If you don't, it's safe to add back permanently.\n\nWe're starting with fructans (wheat/onion/garlic) since that was the strongest signal in your diary.",
      },
    },
    {
      type: "HOMEWORK",
      title: "Reintroduction Challenge — Week 3",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Fructan challenge — WHEAT: Day 1: eat 1 slice of regular wheat bread at lunch. Day 2: eat 2 slices. Day 3: eat a normal wheat-containing meal (pasta or sandwich). Stay low-FODMAP for everything else. Track symptoms after each test.", sortOrder: 0 },
          { type: "ACTION", description: "Rest day (Day 4): Return to full low-FODMAP for 1 day to reset your gut.", sortOrder: 1 },
          { type: "ACTION", description: "Fructan challenge — ONION: Day 5: eat 1 tablespoon of cooked onion with dinner. Day 6: eat 2 tablespoons. Day 7: eat a normal portion of onion in a meal (like a stir-fry). Track symptoms.", sortOrder: 2 },
          { type: "ACTION", description: "Keep your food-symptom diary going with extra detail on reaction timing — how many hours after eating the test food did symptoms start? How long did they last?", sortOrder: 3 },
          { type: "JOURNAL_PROMPT", prompts: [
            "Wheat challenge results: any symptoms? If so, what, when, and how severe (1-5)?",
            "Onion challenge results: any symptoms? Was the reaction different from wheat?",
            "How does it feel having more control over your symptoms? Is the anxiety around eating improving?",
          ], spaceSizeHint: "medium", sortOrder: 4 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your reintroduction results. We'll decide which groups to test next (lactose, fructose, polyols).", sortOrder: 5 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createMayaModule(kevinProgram.id, 3, {
    title: "Week 4: Personalized Diet & Eating Confidence",
    subtitle: "Mar 26 – Apr 2",
    summary: "Build your personalized safe/trigger food list and develop strategies for eating with confidence.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Great news from reintroduction:\n- Wheat: MILD trigger — small amounts are fine (1 slice bread), but large portions cause bloating. You can eat wheat in moderation.\n- Onion: STRONG trigger — even 1 tablespoon caused pain and urgency within 2 hours. Avoid onion, keep using green onion tops as your substitute.\n- Garlic (tested briefly): Similar to onion. Stick with garlic-infused oil.\n\nWe still need to test lactose and fructose, but we have enough to build your personalized plan. The big win here: you now know WHY you were reacting, and it's a specific, manageable list — not 'everything.'",
      },
    },
    {
      type: "STRATEGY_CARDS",
      title: "Your Personal IBS Playbook",
      content: {
        type: "STRATEGY_CARDS",
        deckName: "Kevin's Rules",
        cards: [
          { title: "Avoid: Onion & Garlic", body: "Your #1 trigger. Use green onion tops, garlic-infused oil, chives, and ginger for flavor instead. Most restaurants use onion and garlic heavily — ask for dishes without, or order grilled protein + safe sides.", emoji: "🚫" },
          { title: "Moderate: Wheat", body: "Small portions are fine. 1 slice of bread, a small wrap, or a thin-crust pizza is OK. A giant sub or a huge bowl of pasta will probably cause bloating. Rice and oats are always safe alternatives.", emoji: "⚖️" },
          { title: "Safe: Everything Else", body: "Dairy, most fruits, most vegetables are fine for you. Don't restrict things you don't need to restrict. The goal is the smallest possible restriction list.", emoji: "✅" },
          { title: "Pre-Meeting Protocol", body: "On meeting days: eat a safe, tested breakfast (oatmeal + berries, eggs + sourdough). Skip the coffee until after the meeting if you're nervous. Have a safe snack ready. You've gone 2 weeks with minimal symptoms — trust your gut (literally).", emoji: "💼" },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Sustainability Plan — Week 4",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Create your personal 'safe meals' list: 5 breakfasts, 5 lunches, 5 dinners that are all trigger-free and that you enjoy. Post this on your fridge or save it in your phone notes.", sortOrder: 0 },
          { type: "ACTION", description: "Practice eating out: go to a restaurant and order a meal using your trigger knowledge. Ask questions about ingredients if needed. Most places are happy to accommodate.", sortOrder: 1 },
          { type: "ACTION", description: "Eat before or during 2 work meetings this week without pre-gaming with anxiety. Use your pre-meeting protocol. Track how you feel.", sortOrder: 2 },
          { type: "JOURNAL_PROMPT", prompts: [
            "How has your relationship with food changed over the past month?",
            "Rate your confidence eating in social/work situations (1-10). What would help you feel more confident?",
            "What's one food you were afraid of that you now know is safe for you?",
          ], spaceSizeHint: "large", sortOrder: 3 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your safe meals list. We'll discuss spacing out sessions and when to schedule your next FODMAP reintroduction tests.", sortOrder: 4 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "EVERY_OTHER_DAY",
      },
    },
  ]);

  // ── Maya's Program 3: Diane M. — Post-bariatric nutrition ──────
  const dianeProgram = await prisma.program.create({
    data: {
      clinicianId: mayaClinician.clinicianProfile!.id,
      title: "Diane M.",
      description: "48-year-old HR manager. 3 months post-gastric sleeve surgery. Lost 40 lbs so far (SW: 280, CW: 240). Struggling with protein intake (only hitting 40g/day, goal is 80g), dumping syndrome after sugary foods, and emotional eating triggers. Goals: hit protein goals consistently, learn to eat mindfully, develop healthy coping strategies.",
      cadence: "WEEKLY",
      enrollmentMethod: "INVITE",
      sessionType: "ONE_ON_ONE",
      status: "PUBLISHED",
    },
  });

  await createMayaModule(dianeProgram.id, 0, {
    title: "Week 1: Protein Priority & Eating Mechanics",
    subtitle: "Mar 5 – Mar 12",
    summary: "Build habits around protein-first eating and relearn portion sizes for your new stomach.",
    estimatedMinutes: 15,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Diane, 40 lbs in 3 months is strong progress. The main concern right now is protein — at 40g/day you're at risk for muscle loss, hair thinning, and fatigue. Your surgeon's goal is 80g minimum.\n\nThe challenge: your stomach holds about 4-6 oz per meal now. So every bite counts — protein has to come first, before you fill up on carbs or vegetables.\n\nWe also talked about the dumping episode you had after eating a coworker's birthday cake. That nausea, sweating, and dizziness is dumping syndrome — your body's reaction to concentrated sugar hitting your small intestine too fast. It's unpleasant but it's actually your body's built-in guardrail. We'll talk about how to handle sweets without triggering it.",
      },
    },
    {
      type: "STRATEGY_CARDS",
      title: "Post-Sleeve Eating Rules",
      content: {
        type: "STRATEGY_CARDS",
        deckName: "Your New Eating Basics",
        cards: [
          { title: "Protein First, Always", body: "At every meal, eat your protein before anything else. If you can only eat 4 oz of food, make sure 3 oz of that is protein. Vegetables second, carbs last (only if there's room).", emoji: "🥩" },
          { title: "30 Chews Per Bite", body: "Your new stomach can't handle large pieces of food. Chew every bite 30 times until it's paste. This prevents blockages, reduces nausea, and helps you recognize fullness before it's too late.", emoji: "👄" },
          { title: "No Drinking With Meals", body: "Stop drinking 30 minutes before eating and wait 30 minutes after. Liquid washes food through your pouch too fast, reducing protein absorption and making you hungry sooner.", emoji: "🚰" },
          { title: "Sip All Day", body: "You need 64 oz of fluid daily but can't chug anymore. Keep a water bottle with you and sip constantly between meals. Set hourly reminders if needed.", emoji: "💧" },
          { title: "Dumping Decoder", body: "Sugar, fried foods, and high-fat foods can cause dumping (nausea, sweating, cramps, diarrhea). It usually hits 15-30 min after eating. If it happens: lie down, sip water slowly, and note what triggered it. It's not dangerous, just miserable.", emoji: "⚠️" },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Nutrition Homework — Week 1",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Track protein intake for 7 days using the MyFitnessPal app (or write it down). Goal: 80g protein per day. Focus on dense protein sources: Greek yogurt (15g per cup), eggs (6g each), chicken breast (25g per 3oz), protein shake (30g per scoop).", sortOrder: 0 },
          { type: "ACTION", description: "Have a protein shake as a morning snack every day this week. Blend: 1 scoop protein powder + 8oz lactose-free milk + 1 tbsp peanut butter. That's 40g of protein right there — halfway to your goal.", sortOrder: 1 },
          { type: "ACTION", description: "Practice the 30-chew rule at every meal. Set your fork down between bites. Time yourself — a meal should take at least 20 minutes.", sortOrder: 2 },
          { type: "ACTION", description: "Track fluid intake. Use a marked water bottle and aim for 64 oz between meals. Note: soup broth, sugar-free popsicles, and herbal tea all count.", sortOrder: 3 },
          { type: "JOURNAL_PROMPT", prompts: [
            "How many grams of protein did you hit today? What meals or snacks had the most protein?",
            "Did you have any dumping episodes this week? What triggered them?",
          ], spaceSizeHint: "medium", sortOrder: 4 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your protein tracking log and fluid intake notes.", sortOrder: 5 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createMayaModule(dianeProgram.id, 1, {
    title: "Week 2: Emotional Eating & Mindful Habits",
    subtitle: "Mar 12 – Mar 19",
    summary: "Recognize emotional eating triggers and build alternative coping strategies.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Session Recap",
      content: {
        type: "TEXT",
        body: "Protein improved to 60-65g/day — big jump! The morning shake is doing heavy lifting. We need to close the gap to 80g by adding more protein at lunch and dinner.\n\nThe bigger conversation today was about emotional eating. You shared that evenings are hardest — after a stressful workday, you used to decompress with snacking on the couch. Now your stomach can't handle the volume, but the urge is still there. You mentioned eating slider foods (crackers, chips, ice cream) that go down easy and bypass the fullness signal.\n\nThis is extremely common after bariatric surgery. The surgery changed your stomach, not the emotional wiring. Let's work on both.",
      },
    },
    {
      type: "STRATEGY_CARDS",
      title: "Emotional Eating Toolkit",
      content: {
        type: "STRATEGY_CARDS",
        deckName: "Coping Without Food",
        cards: [
          { title: "H.A.L.T. Check", body: "Before you eat outside of meals, ask: am I Hungry, Angry, Lonely, or Tired? If it's not physical hunger (growling stomach, low energy), the food won't fix the real need. Name the feeling instead.", emoji: "✋" },
          { title: "The 10-Minute Rule", body: "When a craving hits, set a timer for 10 minutes. Do something else: walk around the block, text a friend, make tea, stretch. If after 10 minutes you still want it, have a small, planned portion. Most cravings pass.", emoji: "⏱️" },
          { title: "Swap the Slider Foods", body: "Slider foods (crackers, chips, ice cream) bypass your pouch and let you overeat. Replace with: cheese + deli meat roll-ups, Greek yogurt, edamame, or a protein shake. These fill the pouch and satisfy the urge.", emoji: "🔄" },
          { title: "Evening Routine Rewrite", body: "Build a new after-work ritual that doesn't involve the kitchen. Ideas: 15-minute walk, hot bath, call a friend, journal, puzzle, stretching with a show on. The goal is replacing the food ritual, not just removing it.", emoji: "🌙" },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Nutrition & Mindset Homework — Week 2",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Do the H.A.L.T. check before every snack this week. Write down what you were feeling each time. If it's not true hunger, try the 10-minute rule instead.", sortOrder: 0 },
          { type: "ACTION", description: "Replace slider foods in your pantry with protein-rich snacks: cheese sticks, deli turkey, hard-boiled eggs, protein bars (<5g sugar). If the sliders aren't in the house, you can't graze on them.", sortOrder: 1 },
          { type: "ACTION", description: "Build a new evening routine. Try at least 3 different activities this week instead of couch-snacking: walk, bath, journaling, calling a friend, etc. See what sticks.", sortOrder: 2 },
          { type: "ACTION", description: "Continue protein tracking — push for 75-80g this week. Add a high-protein lunch: cottage cheese + fruit, tuna salad lettuce wraps, or a chicken and cheese roll-up.", sortOrder: 3 },
          { type: "JOURNAL_PROMPT", prompts: [
            "How many times did you do the H.A.L.T. check this week? What feelings came up most often?",
            "What evening activities did you try? Which ones actually helped the craving pass?",
            "How are you feeling emotionally about your body and the surgery? Be honest — there's no wrong answer.",
          ], spaceSizeHint: "large", sortOrder: 4 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your H.A.L.T. log and protein numbers. We'll celebrate your wins.", sortOrder: 5 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  const mayaPrograms = [angelaProgram, kevinProgram, dianeProgram];

  // ── 4e. Dr. Priya Patel — Cardiologist ─────────────────────────────
  const priyaPasswordHash = await bcrypt.hash("Priya1", 12);

  const priyaClinician = await prisma.user.upsert({
    where: { email: "priya@priya.com" },
    update: { passwordHash: priyaPasswordHash },
    create: {
      email: "priya@priya.com",
      passwordHash: priyaPasswordHash,
      firstName: "Priya",
      lastName: "Patel",
      role: "CLINICIAN",
      clinicianProfile: {
        create: {
          practiceName: "HeartWell Cardiology",
          licenseType: "MD, FACC",
        },
      },
    },
    include: { clinicianProfile: true },
  });

  async function createPriyaModule(
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

  // ── Priya's Program 1: Robert H. — Post-MI cardiac rehab ──────
  const robertProgram = await prisma.program.create({
    data: {
      clinicianId: priyaClinician.clinicianProfile!.id,
      title: "Robert H.",
      description: "58-year-old construction foreman. 8 weeks post-MI with stent placement (LAD). EF 45%. On atorvastatin 80mg, metoprolol 50mg, aspirin, clopidogrel. Completed Phase II cardiac rehab. Smoker (20 years, quit at MI). BMI 31. Goals: return to work, exercise independently, manage cholesterol without increasing meds, stay quit on smoking.",
      cadence: "WEEKLY",
      enrollmentMethod: "INVITE",
      sessionType: "ONE_ON_ONE",
      status: "PUBLISHED",
    },
  });

  await createPriyaModule(robertProgram.id, 0, {
    title: "Week 1: Understanding Your Heart & Medications",
    subtitle: "Mar 5 – Mar 12",
    summary: "Review what happened, why your medications matter, and set realistic activity goals.",
    estimatedMinutes: 25,
  }, [
    {
      type: "TEXT",
      title: "Visit Recap",
      content: {
        type: "TEXT",
        body: "Robert, your cardiac rehab team says you did great in Phase II — you're tolerating exercise well and your BP is controlled on current meds. Your EF improved from 40% to 45%, which is encouraging.\n\nHere's where we are:\n- Your stent is holding well. The LAD blockage was fixed, but we need to prevent new blockages from forming in other arteries\n- Your LDL cholesterol is still 110 — we want it under 70 for someone with your history\n- You've been smoke-free for 8 weeks. This is the most important thing you've done for your heart. The next 3 months are the highest risk for relapse\n\nThis week I want you to understand your medications, know your numbers, and start building your home exercise habit.",
      },
    },
    {
      type: "STRATEGY_CARDS",
      title: "Know Your Medications",
      content: {
        type: "STRATEGY_CARDS",
        deckName: "Med Guide",
        cards: [
          { title: "Atorvastatin 80mg", body: "Lowers LDL cholesterol and stabilizes plaque in your arteries. Take at night. Most important med for preventing another heart attack. Side effects to watch: muscle pain or weakness — tell me if this happens, we have alternatives.", emoji: "💊" },
          { title: "Metoprolol 50mg", body: "Slows your heart rate and lowers blood pressure. Reduces the workload on your heart while it heals. Take in the morning. Don't stop suddenly — must be tapered. May cause fatigue or dizziness.", emoji: "💓" },
          { title: "Aspirin + Clopidogrel", body: "Dual antiplatelet therapy — prevents blood clots from forming on your stent. Take both daily for 12 months (then we'll reassess). Do NOT skip doses. If you need surgery or dental work, call me first.", emoji: "🩸" },
          { title: "Your Numbers to Know", body: "LDL goal: <70. BP goal: <130/80. Resting heart rate goal: 60-80. Weight goal: lose 20 lbs over 6 months (slow and steady). Know these numbers like you know your crew's work schedules.", emoji: "📊" },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Heart Health Homework — Week 1",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Take blood pressure and resting heart rate every morning before meds. Log it. We're looking for BP <130/80 and HR 60-80. If BP is above 140/90 or HR above 100 on any day, text the clinic.", sortOrder: 0 },
          { type: "ACTION", description: "Walk for 30 minutes at a moderate pace, 5 days this week. Moderate = you can talk but not sing. Use the rate of perceived exertion scale: stay at 3-4 out of 10. If you feel chest pressure, severe shortness of breath, or dizziness — STOP and call 911.", sortOrder: 1 },
          { type: "ACTION", description: "Set up a weekly pill organizer (AM/PM). Take all meds at the same time every day. Set a phone alarm if you're not a routine person. Missing clopidogrel even once increases stent clot risk.", sortOrder: 2 },
          { type: "ACTION", description: "Smoking urge tracker: every time you get a craving, write down the time, what you were doing, and what you did instead. We'll look for patterns. Keep nicotine gum or lozenges accessible.", sortOrder: 3 },
          { type: "JOURNAL_PROMPT", prompts: [
            "How are you feeling physically? Any chest sensations, unusual fatigue, or shortness of breath during walks?",
            "How are you handling the smoking cravings? What's your hardest trigger time?",
          ], spaceSizeHint: "medium", sortOrder: 4 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your BP/HR log, walking log, and smoking urge tracker. We'll review labs from last week.", sortOrder: 5 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createPriyaModule(robertProgram.id, 1, {
    title: "Week 2: Heart-Healthy Eating & Cholesterol",
    subtitle: "Mar 12 – Mar 19",
    summary: "Diet changes to bring LDL under 70 without increasing medication.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Visit Recap",
      content: {
        type: "TEXT",
        body: "BP has been averaging 128/78 — right on target. Heart rate is steady at 68. Good. Walking is going well — you did 5 out of 7 days.\n\nSmoking: you had 4 cravings this week, all in the evening after dinner. You used the gum 3 times and white-knuckled it once. That's great. Evening is your highest-risk window — we need a plan for that.\n\nNow let's talk food. Your LDL is 110 and we need it under 70. The statin is doing its job but diet can drop it another 15-20 points. I'm not asking you to eat salad every day — I'm asking for specific swaps that target cholesterol directly.",
      },
    },
    {
      type: "STRATEGY_CARDS",
      title: "Cholesterol-Lowering Food Swaps",
      content: {
        type: "STRATEGY_CARDS",
        deckName: "Heart-Smart Eating",
        cards: [
          { title: "Red Meat → Fish 2x/Week", body: "Swap 2 red meat meals per week for fatty fish: salmon, mackerel, sardines, or tuna. Omega-3s directly reduce triglycerides and inflammation. Grill, bake, or pan-sear — don't fry it.", emoji: "🐟" },
          { title: "Butter → Olive Oil", body: "Cook with olive oil instead of butter. Use it on bread instead of butter. Drizzle on vegetables. Monounsaturated fats in olive oil lower LDL without lowering HDL (the good cholesterol).", emoji: "🫒" },
          { title: "Add Fiber, Drop Cholesterol", body: "Soluble fiber (oatmeal, beans, lentils, apples, barley) physically binds to cholesterol in your gut and removes it. 1 bowl of oatmeal per day can lower LDL by 5-10%. Add a handful of walnuts for bonus points.", emoji: "🥣" },
          { title: "Cut the Processed Stuff", body: "Deli meats, hot dogs, bacon, frozen meals — loaded with sodium and saturated fat. Sodium raises BP, sat fat raises LDL. Read labels: aim for <2,300mg sodium/day total. Fresh > packaged.", emoji: "🚫" },
          { title: "Beer → Limits", body: "1 drink/day max. One 12oz beer, one 5oz glass of wine, or one 1.5oz spirit. More than that raises triglycerides and BP. If you can cut alcohol completely for now, even better — your liver is processing a lot of meds already.", emoji: "🍺" },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Heart Health Homework — Week 2",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Eat fish for dinner at least 2 times this week. Easy options: salmon filets (season with lemon + olive oil, bake 400° for 12 min), canned tuna salad on whole grain bread, or frozen fish filets (check sodium).", sortOrder: 0 },
          { type: "ACTION", description: "Start eating oatmeal for breakfast 4+ days this week. Not the instant sugary kind — plain oats with berries, walnuts, and a drizzle of honey. This directly lowers LDL.", sortOrder: 1 },
          { type: "ACTION", description: "Continue 30-minute walks, 5 days. If you feel ready, try increasing to 35-40 minutes or adding a slight incline. Stay in the 3-4/10 effort zone. Wear your heart rate monitor if you have one.", sortOrder: 2 },
          { type: "ACTION", description: "Evening smoking craving plan: after dinner, immediately go for a 10-minute walk or do a hands-busy activity (dishes, fix something in the garage, crossword puzzle). Don't sit on the couch in your old smoking spot.", sortOrder: 3 },
          { type: "ACTION", description: "Continue BP/HR log every morning.", sortOrder: 4 },
          { type: "JOURNAL_PROMPT", prompts: [
            "How did the fish meals go? Any recipes you'd make again?",
            "How are evening cravings? Is the post-dinner walk helping?",
          ], spaceSizeHint: "medium", sortOrder: 5 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your BP/HR log and food log. We'll discuss your return-to-work plan.", sortOrder: 6 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createPriyaModule(robertProgram.id, 2, {
    title: "Week 3: Exercise Progression & Return to Work",
    subtitle: "Mar 19 – Mar 26",
    summary: "Progress your exercise capacity and plan a safe return to the physical demands of your job.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Visit Recap",
      content: {
        type: "TEXT",
        body: "Everything is trending well. BP averaging 125/76, HR stable. You've been walking 35-40 minutes consistently. No chest symptoms.\n\nYou're asking about returning to work. Construction is demanding — lifting, climbing, bending all day. Here's the plan:\n- This week we add resistance training to build your work capacity back up\n- Week 4 we'll do a simulated work assessment — lifting, carrying, climbing stairs with load\n- If that goes well, you can return to light duty in Week 5 with restrictions (no lifting >30 lbs for 2 more weeks)\n\nThe goal is to return strong and confident, not just 'allowed.'",
      },
    },
    {
      type: "HOMEWORK",
      title: "Heart Health Homework — Week 3",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Walking: increase to 40-45 minutes, 5 days. On 2 of those days, add 3 intervals of brisk walking (1 minute fast / 2 minutes normal pace). This builds cardiovascular fitness. Monitor heart rate — stay under 120 bpm.", sortOrder: 0 },
          { type: "ACTION", description: "Resistance training: 3 days this week (Mon/Wed/Fri). Exercises: bodyweight squats 3x12, wall push-ups 3x10, seated rows with resistance band 3x12, step-ups on a low step 3x10 each leg. Rest 60 seconds between sets. Stop if you feel chest pressure.", sortOrder: 1 },
          { type: "ACTION", description: "Practice work simulation: carry a 20-lb bag (groceries, tool bag) up and down one flight of stairs, 3 times. Rest between trips. How does your heart feel? Log your heart rate after each trip.", sortOrder: 2 },
          { type: "ACTION", description: "Continue heart-healthy eating: fish 2x/week, oatmeal for breakfast, olive oil instead of butter. Add 1 serving of beans or lentils 3x this week (chili, soup, side dish).", sortOrder: 3 },
          { type: "ACTION", description: "Continue BP/HR log. Add post-exercise HR reading after each workout.", sortOrder: 4 },
          { type: "JOURNAL_PROMPT", prompts: [
            "How did the resistance training feel? Any chest symptoms, unusual fatigue, or dizziness?",
            "How did the stair simulation go? How confident do you feel about going back to work?",
            "Smoking update: how many cravings this week? Are they getting less frequent?",
          ], spaceSizeHint: "medium", sortOrder: 5 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your exercise log with heart rate readings. We'll do the formal work capacity assessment next visit.", sortOrder: 6 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createPriyaModule(robertProgram.id, 3, {
    title: "Week 4: Work Clearance & Long-Term Prevention",
    subtitle: "Mar 26 – Apr 2",
    summary: "Complete work capacity assessment and build your lifelong heart health maintenance plan.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Visit Recap",
      content: {
        type: "TEXT",
        body: "Robert, you passed the work capacity assessment with flying colors. Carried 30 lbs up 2 flights, heart rate peaked at 118, recovered to baseline in 3 minutes, no symptoms. I'm clearing you for light duty starting next week with a 30-lb lifting restriction for 2 more weeks, then full duty.\n\nYou're now 10 weeks smoke-free. Cravings are down to 1-2 per week. Your risk of another MI has already dropped significantly.\n\nLet's build your long-term plan. Heart disease is a lifelong management situation, but with what you're doing now, the odds are strongly in your favor.",
      },
    },
    {
      type: "STRATEGY_CARDS",
      title: "Your Heart Health Rules for Life",
      content: {
        type: "STRATEGY_CARDS",
        deckName: "Robert's Rules",
        cards: [
          { title: "Never Miss Meds", body: "Take your medications every single day. Especially clopidogrel (for the next 4 months) and atorvastatin (forever). Missing even one day of clopidogrel increases stent clot risk. Set the alarm, use the pill box, no excuses.", emoji: "💊" },
          { title: "Exercise is Non-Negotiable", body: "150 minutes/week of moderate exercise — minimum. That's 30 minutes, 5 days. Walking counts. This is as important as your medications. Schedule it like a work meeting.", emoji: "🏃" },
          { title: "Know Your Warning Signs", body: "Chest pressure, jaw pain, arm pain, sudden severe shortness of breath, cold sweats — call 911 immediately. Don't drive yourself. Don't wait to see if it passes. You know what a heart attack feels like now. Act fast.", emoji: "🚨" },
          { title: "Annual Checkups Forever", body: "Lipid panel every 6 months for the first year, then annually. Echo annually. Stress test if symptoms change. BP check at every visit. These appointments catch problems early.", emoji: "📅" },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Heart Health Homework — Week 4",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Write out your weekly exercise plan for when you're back at work. You'll be physically active on the job, but you still need dedicated cardio on non-work days and resistance training 2x/week. Schedule specific days and times.", sortOrder: 0 },
          { type: "ACTION", description: "Create a wallet card with: your medications and doses, your cardiologist's phone number, your allergies, and the sentence 'I have a heart stent placed [date]. I take clopidogrel — do not stop without cardiology approval.' Carry it always.", sortOrder: 1 },
          { type: "ACTION", description: "Schedule your 3-month follow-up: lipid panel + office visit. Call the clinic this week to book it.", sortOrder: 2 },
          { type: "ACTION", description: "Talk to your crew foreman about your return. Light duty for 2 weeks (max 30 lbs), then full duty. Take breaks if you feel fatigued — don't push through chest symptoms to prove yourself.", sortOrder: 3 },
          { type: "JOURNAL_PROMPT", prompts: [
            "How do you feel about going back to work? Excited, nervous, or both?",
            "What's changed about how you think about your health since the heart attack?",
            "What's your plan if you feel a smoking craving on the job site? Who on your crew knows you quit?",
          ], spaceSizeHint: "large", sortOrder: 4 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your exercise plan and wallet card. Next visit will be in 4 weeks (monthly check-in phase).", sortOrder: 5 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "EVERY_OTHER_DAY",
      },
    },
  ]);

  // ── Priya's Program 2: Maria G. — Hypertension management ──────
  const mariaProgram = await prisma.program.create({
    data: {
      clinicianId: priyaClinician.clinicianProfile!.id,
      title: "Maria G.",
      description: "67-year-old retired school principal. Stage 2 hypertension (avg 158/95), resistant to adding a 3rd medication. Currently on lisinopril 20mg and amlodipine 5mg. Sedentary, high sodium diet (loves cooking Latin food). Family history of stroke (mother at 72). Goals: get BP under 140/90 through lifestyle changes, avoid a third medication.",
      cadence: "BIWEEKLY",
      enrollmentMethod: "INVITE",
      sessionType: "ONE_ON_ONE",
      status: "PUBLISHED",
    },
  });

  await createPriyaModule(mariaProgram.id, 0, {
    title: "Week 1: BP Monitoring & Sodium Awareness",
    subtitle: "Mar 5 – Mar 19",
    summary: "Establish a home monitoring routine and identify where sodium is hiding in your diet.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Visit Recap",
      content: {
        type: "TEXT",
        body: "Maria, I hear you — you don't want a third medication. Let's see what lifestyle changes can do first. But I need to be honest: if BP stays above 150/90 after 8 weeks of real effort, we'll need to revisit medication. Your family history of stroke makes this serious.\n\nThe good news: lifestyle changes can lower systolic BP by 10-15 points. That could be the difference between needing more meds and not.\n\nToday's game plan: start home monitoring (office readings aren't enough), and figure out where all the sodium in your diet is coming from. I know your cooking is important to you — we're not going to ruin your recipes. We're going to make smart adjustments.",
      },
    },
    {
      type: "STRATEGY_CARDS",
      title: "Sodium Swaps for Latin Cooking",
      content: {
        type: "STRATEGY_CARDS",
        deckName: "Flavor Without Sodium",
        cards: [
          { title: "Sazón → Homemade Sazón", body: "Commercial Sazón packets are mostly MSG and salt. Make your own: cumin, garlic powder, coriander, annatto/achiote, onion powder, oregano, black pepper. Same color, same flavor, fraction of the sodium.", emoji: "🧂" },
          { title: "Canned Beans → Dry or Rinse", body: "One can of beans has 800mg+ sodium. Rinse canned beans to cut sodium by 40%. Even better: cook dry beans in a pressure cooker with your own seasoning. Batch-cook on Sunday.", emoji: "🫘" },
          { title: "Bouillon Cubes → Low-Sodium Broth", body: "One bouillon cube = 1,000mg sodium. Switch to low-sodium broth or make your own caldo: roast chicken bones with onion, garlic, cilantro. Freeze in ice cube trays for easy use.", emoji: "🍲" },
          { title: "Lime, Cilantro, Chili", body: "These three ingredients add so much flavor you won't miss the salt. Squeeze lime on everything. Fresh cilantro on top. Chili flakes or fresh jalapeño for heat. Your tongue adjusts to less salt in 2-3 weeks.", emoji: "🍋" },
          { title: "The 2,300mg Rule", body: "That's your daily sodium limit — about 1 teaspoon of salt total. Most Americans eat 3,400mg+. Check every label. One fast food meal can use your entire day's allowance.", emoji: "📏" },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Heart Health Homework — Week 1",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Take blood pressure 2x daily: morning (before meds, after sitting quietly for 5 min) and evening (before dinner). Use your left arm, feet flat on the floor, arm supported on a table. Log every reading.", sortOrder: 0 },
          { type: "ACTION", description: "Food sodium audit: for 5 days, read the sodium content on everything you eat. Write it down. Don't change anything yet — just observe. I bet you'll be shocked by some of the numbers.", sortOrder: 1 },
          { type: "ACTION", description: "Make the homemade sazón recipe (I'll email it to you). Use it in one dish this week instead of the packet. Ask your family if they notice a difference.", sortOrder: 2 },
          { type: "ACTION", description: "Walk 20 minutes, 4 days this week. Morning is best for BP. Walk in your neighborhood or at the mall. Bring your phone for safety. Even a slow stroll counts right now.", sortOrder: 3 },
          { type: "JOURNAL_PROMPT", prompts: [
            "What was your highest sodium food this week? Were you surprised by any readings?",
            "How does it feel checking your BP at home? Any anxiety about the numbers?",
          ], spaceSizeHint: "medium", sortOrder: 4 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your BP log, sodium food diary, and the homemade sazón for me to try!", sortOrder: 5 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "DAILY",
      },
    },
  ]);

  await createPriyaModule(mariaProgram.id, 1, {
    title: "Week 2: DASH Diet & Movement",
    subtitle: "Mar 19 – Apr 2",
    summary: "Adopt the DASH eating pattern and build a sustainable walking habit.",
    estimatedMinutes: 20,
  }, [
    {
      type: "TEXT",
      title: "Visit Recap",
      content: {
        type: "TEXT",
        body: "Your home BP readings averaged 152/92 — that's lower than the office reading (white coat effect is real!). But still too high.\n\nYour sodium diary was eye-opening: you're averaging about 3,800mg/day. The biggest offenders: commercial sazón (2 dishes), canned beans (3 meals), bread (adds up fast), and cheese. The homemade sazón worked great though — your husband said the arroz con pollo tasted the same!\n\nWe're going to follow the DASH diet approach — it's the most evidence-based eating pattern for lowering blood pressure. It's not a restrictive diet. It's about adding more of the good stuff (potassium, calcium, magnesium) while reducing sodium.",
      },
    },
    {
      type: "CHECKLIST",
      title: "DASH Diet Daily Targets",
      content: {
        type: "CHECKLIST",
        items: [
          { text: "4-5 servings of vegetables (1 serving = 1 cup raw or ½ cup cooked)", sortOrder: 0 },
          { text: "4-5 servings of fruit (1 serving = 1 medium fruit or ½ cup)", sortOrder: 1 },
          { text: "2-3 servings of low-fat dairy (milk, yogurt, cheese)", sortOrder: 2 },
          { text: "2 servings of lean protein (chicken, fish, beans)", sortOrder: 3 },
          { text: "4-5 servings of nuts/seeds/legumes per week", sortOrder: 4 },
          { text: "Limit sodium to <2,300mg (check labels!)", sortOrder: 5 },
          { text: "Limit alcohol to 1 drink/day", sortOrder: 6 },
        ],
      },
    },
    {
      type: "HOMEWORK",
      title: "Heart Health Homework — Week 2",
      content: {
        type: "HOMEWORK",
        items: [
          { type: "ACTION", description: "Follow the DASH daily targets (checklist above) for 10 out of 14 days. Don't try to be perfect — aim for most days. The biggest impact comes from adding potassium-rich foods (bananas, sweet potatoes, spinach, beans, avocado).", sortOrder: 0 },
          { type: "ACTION", description: "Replace canned beans with dry beans cooked in your pressure cooker (at least 2 meals). Rinse canned beans when you do use them.", sortOrder: 1 },
          { type: "ACTION", description: "Walking: increase to 25-30 minutes, 5 days. Try to walk after dinner — post-meal walking specifically lowers BP. Invite your husband — making it social helps consistency.", sortOrder: 2 },
          { type: "ACTION", description: "Continue 2x daily BP monitoring. We're looking for a downward trend.", sortOrder: 3 },
          { type: "JOURNAL_PROMPT", prompts: [
            "How is the DASH eating going? What meals have you enjoyed? What's been hard to change?",
            "Compare your BP readings from Week 1 to now. Any trend?",
            "Has your family been supportive of the changes? Any pushback on the cooking modifications?",
          ], spaceSizeHint: "medium", sortOrder: 4 },
          { type: "BRING_TO_SESSION", reminderText: "Bring your BP log. If we see improvement, we stay the course. If not, we adjust.", sortOrder: 5 },
        ],
        dueTimingType: "BEFORE_NEXT_SESSION",
        completionRule: "ALL",
        reminderCadence: "EVERY_OTHER_DAY",
      },
    },
  ]);

  const priyaPrograms = [robertProgram, mariaProgram];

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

  // ── Seed Program Templates ──────────────────────────────
  // Delete existing templates before re-seeding
  const existingTemplates = await prisma.program.findMany({ where: { isTemplate: true } });
  for (const t of existingTemplates) {
    const tModules = await prisma.module.findMany({ where: { programId: t.id } });
    for (const m of tModules) {
      await prisma.part.deleteMany({ where: { moduleId: m.id } });
    }
    await prisma.module.deleteMany({ where: { programId: t.id } });
    const tTrackers = await prisma.dailyTracker.findMany({ where: { programId: t.id } });
    for (const tr of tTrackers) {
      await prisma.dailyTrackerField.deleteMany({ where: { trackerId: tr.id } });
    }
    await prisma.dailyTracker.deleteMany({ where: { programId: t.id } });
    await prisma.program.delete({ where: { id: t.id } });
  }

  console.log("\nSeeding program templates...");
  const templateClinicianId = admin.clinicianProfile!.id;

  const t1 = await seedTemplate1_CBTDepression(prisma, templateClinicianId);
  console.log(`  ✓ Template 1: ${t1.title}`);
  const t2 = await seedTemplate2_DBTSkillsTraining(prisma, templateClinicianId);
  console.log(`  ✓ Template 2: ${t2.title}`);
  const t3 = await seedTemplate3_ERPForOCD(prisma, templateClinicianId);
  console.log(`  ✓ Template 3: ${t3.title}`);
  const t4 = await seedTemplate4_CPT_PTSD(prisma, templateClinicianId);
  console.log(`  ✓ Template 4: ${t4.title}`);
  const t5 = await seedTemplate5_CBTI_Insomnia(prisma, templateClinicianId);
  console.log(`  ✓ Template 5: ${t5.title}`);
  const t6 = await seedTemplate6_RelapsePrevention(prisma, templateClinicianId);
  console.log(`  ✓ Template 6: ${t6.title}`);
  const t7 = await seedTemplate7_BehavioralActivation(prisma, templateClinicianId);
  console.log(`  ✓ Template 7: ${t7.title}`);
  const t8 = await seedTemplate8_MBSR(prisma, templateClinicianId);
  console.log(`  ✓ Template 8: ${t8.title}`);
  const t9 = await seedTemplate9_AngerManagement(prisma, templateClinicianId);
  console.log(`  ✓ Template 9: ${t9.title}`);
  const t10 = await seedTemplate10_ParentingSkills(prisma, templateClinicianId);
  console.log(`  ✓ Template 10: ${t10.title}`);
  console.log("All 10 templates seeded.");

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

  console.log("\n--- Jim (Physical Therapist) ---");
  console.log(`Email: jim@jim.com`);
  console.log(`Password: Jim1`);
  console.log(`User ID: ${jimClinician.id}`);
  console.log("Jim's client programs:");
  for (const p of jimPrograms) {
    console.log(`- ${p.title} (${p.id})`);
  }

  console.log("\n--- Maya (Registered Dietitian) ---");
  console.log(`Email: maya@maya.com`);
  console.log(`Password: Maya1`);
  console.log(`User ID: ${mayaClinician.id}`);
  console.log("Maya's client programs:");
  for (const p of mayaPrograms) {
    console.log(`- ${p.title} (${p.id})`);
  }

  console.log("\n--- Priya (Cardiologist) ---");
  console.log(`Email: priya@priya.com`);
  console.log(`Password: Priya1`);
  console.log(`User ID: ${priyaClinician.id}`);
  console.log("Priya's client programs:");
  for (const p of priyaPrograms) {
    console.log(`- ${p.title} (${p.id})`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
