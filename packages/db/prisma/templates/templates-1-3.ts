// ============================================================
// Template 1: CBT for Depression (12 modules)
// Template 2: DBT Skills Training (12 modules)
// Template 3: ERP for OCD (16 modules)
// ============================================================

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createModule(
  prisma: any,
  programId: string,
  sortOrder: number,
  moduleData: {
    title: string;
    subtitle?: string;
    summary?: string;
    estimatedMinutes?: number;
  },
  parts: {
    type: string;
    title: string;
    isRequired?: boolean;
    content: any;
  }[]
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

// ============================================================
// TEMPLATE 1 — CBT for Depression (12 weeks)
// ============================================================

export async function seedTemplate1_CBTDepression(
  prisma: any,
  clinicianId: string
) {
  const program = await prisma.program.create({
    data: {
      clinicianId,
      title: "CBT for Depression",
      description:
        "A 12-week structured Cognitive Behavioral Therapy program for adults with moderate to severe depression. Covers behavioral activation, cognitive restructuring, core beliefs, and relapse prevention.",
      category: "Depression",
      durationWeeks: 12,
      cadence: "WEEKLY",
      sessionType: "ONE_ON_ONE",
      isTemplate: true,
      status: "PUBLISHED",
    },
  });

  // ── Module 1: Welcome & Assessment ──────────────────────────
  await createModule(
    prisma,
    program.id,
    0,
    {
      title: "Welcome & Assessment",
      subtitle: "Getting Started",
      summary:
        "Learn what CBT is, how it treats depression, and complete your baseline assessments.",
      estimatedMinutes: 45,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "Welcome to CBT for Depression",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Welcome to this Cognitive Behavioral Therapy program for depression. CBT is one of the most researched and effective treatments for depression. It works by helping you notice the connection between your thoughts, feelings, and behaviors — and then teaching you practical skills to shift patterns that keep depression going.</p><p style="margin-bottom: 12px; line-height: 1.6;">Over the next 12 weeks you will:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Learn how depression works from a CBT perspective</li><li style="margin-bottom: 6px;">Track your mood and activities to find patterns</li><li style="margin-bottom: 6px;">Practice behavioral activation — doing more of what matters even when motivation is low</li><li style="margin-bottom: 6px;">Identify and challenge unhelpful thinking patterns</li><li style="margin-bottom: 6px;">Build a relapse prevention plan so your gains last</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Each week includes reading, a short assessment, strategy cards you can revisit anytime, and homework to practice between sessions. There is no need to rush. Go at a pace that works for you and your clinician.</p>`,
        },
      },
      {
        type: "ASSESSMENT",
        title: "PHQ-9 Baseline",
        content: {
          type: "ASSESSMENT",
          title: "Patient Health Questionnaire (PHQ-9)",
          instructions:
            "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
          scoringMethod: "SUM",
          questions: [
            {
              question:
                "Little interest or pleasure in doing things",
              type: "LIKERT",
              required: true,
              sortOrder: 0,
              likertMin: 0,
              likertMax: 3,
              likertMinLabel: "Not at all",
              likertMaxLabel: "Nearly every day",
            },
            {
              question: "Feeling down, depressed, or hopeless",
              type: "LIKERT",
              required: true,
              sortOrder: 1,
              likertMin: 0,
              likertMax: 3,
              likertMinLabel: "Not at all",
              likertMaxLabel: "Nearly every day",
            },
            {
              question:
                "Trouble falling or staying asleep, or sleeping too much",
              type: "LIKERT",
              required: true,
              sortOrder: 2,
              likertMin: 0,
              likertMax: 3,
              likertMinLabel: "Not at all",
              likertMaxLabel: "Nearly every day",
            },
            {
              question: "Feeling tired or having little energy",
              type: "LIKERT",
              required: true,
              sortOrder: 3,
              likertMin: 0,
              likertMax: 3,
              likertMinLabel: "Not at all",
              likertMaxLabel: "Nearly every day",
            },
            {
              question: "Poor appetite or overeating",
              type: "LIKERT",
              required: true,
              sortOrder: 4,
              likertMin: 0,
              likertMax: 3,
              likertMinLabel: "Not at all",
              likertMaxLabel: "Nearly every day",
            },
            {
              question:
                "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
              type: "LIKERT",
              required: true,
              sortOrder: 5,
              likertMin: 0,
              likertMax: 3,
              likertMinLabel: "Not at all",
              likertMaxLabel: "Nearly every day",
            },
            {
              question:
                "Trouble concentrating on things, such as reading the newspaper or watching television",
              type: "LIKERT",
              required: true,
              sortOrder: 6,
              likertMin: 0,
              likertMax: 3,
              likertMinLabel: "Not at all",
              likertMaxLabel: "Nearly every day",
            },
            {
              question:
                "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
              type: "LIKERT",
              required: true,
              sortOrder: 7,
              likertMin: 0,
              likertMax: 3,
              likertMinLabel: "Not at all",
              likertMaxLabel: "Nearly every day",
            },
            {
              question:
                "Thoughts that you would be better off dead or of hurting yourself in some way",
              type: "LIKERT",
              required: true,
              sortOrder: 8,
              likertMin: 0,
              likertMax: 3,
              likertMinLabel: "Not at all",
              likertMaxLabel: "Nearly every day",
            },
          ],
        },
      },
      {
        type: "ASSESSMENT",
        title: "GAD-7 Baseline",
        content: {
          type: "ASSESSMENT",
          title: "Generalized Anxiety Disorder Scale (GAD-7)",
          instructions:
            "Over the last 2 weeks, how often have you been bothered by the following problems?",
          scoringMethod: "SUM",
          questions: [
            {
              question: "Feeling nervous, anxious, or on edge",
              type: "LIKERT",
              required: true,
              sortOrder: 0,
              likertMin: 0,
              likertMax: 3,
              likertMinLabel: "Not at all",
              likertMaxLabel: "Nearly every day",
            },
            {
              question:
                "Not being able to stop or control worrying",
              type: "LIKERT",
              required: true,
              sortOrder: 1,
              likertMin: 0,
              likertMax: 3,
              likertMinLabel: "Not at all",
              likertMaxLabel: "Nearly every day",
            },
            {
              question:
                "Worrying too much about different things",
              type: "LIKERT",
              required: true,
              sortOrder: 2,
              likertMin: 0,
              likertMax: 3,
              likertMinLabel: "Not at all",
              likertMaxLabel: "Nearly every day",
            },
            {
              question: "Trouble relaxing",
              type: "LIKERT",
              required: true,
              sortOrder: 3,
              likertMin: 0,
              likertMax: 3,
              likertMinLabel: "Not at all",
              likertMaxLabel: "Nearly every day",
            },
            {
              question:
                "Being so restless that it is hard to sit still",
              type: "LIKERT",
              required: true,
              sortOrder: 4,
              likertMin: 0,
              likertMax: 3,
              likertMinLabel: "Not at all",
              likertMaxLabel: "Nearly every day",
            },
            {
              question:
                "Becoming easily annoyed or irritable",
              type: "LIKERT",
              required: true,
              sortOrder: 5,
              likertMin: 0,
              likertMax: 3,
              likertMinLabel: "Not at all",
              likertMaxLabel: "Nearly every day",
            },
            {
              question:
                "Feeling afraid as if something awful might happen",
              type: "LIKERT",
              required: true,
              sortOrder: 6,
              likertMin: 0,
              likertMax: 3,
              likertMinLabel: "Not at all",
              likertMaxLabel: "Nearly every day",
            },
          ],
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Your Depression Story",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "In your own words, describe what depression feels like for you on a typical day.",
            "What are you hoping to get out of this program? What would your life look like if depression had less power over you?",
          ],
          spaceSizeHint: "large",
        },
      },
      {
        type: "CHECKLIST",
        title: "Getting Started Checklist",
        content: {
          type: "CHECKLIST",
          items: [
            { text: "Read the welcome material above", sortOrder: 0 },
            { text: "Complete the PHQ-9 assessment", sortOrder: 1 },
            { text: "Complete the GAD-7 assessment", sortOrder: 2 },
            { text: "Write in the journal prompt", sortOrder: 3 },
            {
              text: "Schedule your first session with your clinician",
              sortOrder: 4,
            },
          ],
        },
      },
    ]
  );

  // ── Module 2: Understanding the CBT Model ──────────────────
  await createModule(
    prisma,
    program.id,
    1,
    {
      title: "Understanding the CBT Model",
      subtitle: "Thoughts, Feelings & Behaviors",
      summary:
        "Learn how your thoughts, emotions, and actions are connected and how this cycle keeps depression going.",
      estimatedMinutes: 35,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "The CBT Triangle",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">CBT is based on a simple but powerful idea: your thoughts, feelings, and behaviors are all connected. When you change one, the others shift too.</p><p style="margin-bottom: 12px; line-height: 1.6;">Imagine a triangle:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Thoughts</strong> sit at the top. These are the running commentary in your mind — interpretations, predictions, judgments.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Feelings</strong> are on one corner. These are your emotions (sad, anxious, guilty) and physical sensations (fatigue, heaviness, tension).</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Behaviors</strong> are on the other corner. These are the things you do or avoid doing.</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">In depression, this triangle often looks like this:</p><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Something happens (you cancel plans with a friend).</li><li style="margin-bottom: 6px;">A thought shows up: "I always let people down."</li><li style="margin-bottom: 6px;">That thought triggers a feeling: sadness, guilt, heaviness.</li><li style="margin-bottom: 6px;">The feeling drives a behavior: you stay in bed, avoid texting back.</li><li style="margin-bottom: 6px;">Staying in bed gives you more time to think negatively, which makes you feel worse.</li></ol><p style="margin-bottom: 12px; line-height: 1.6;">This is called a <strong style="color: var(--steady-teal);">negative cycle</strong>. The good news is that CBT gives you tools to interrupt the cycle at any point. Over the coming weeks you will learn to:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Notice your automatic thoughts (Module 5)</li><li style="margin-bottom: 6px;">Increase activities that lift your mood (Modules 3-4)</li><li style="margin-bottom: 6px;">Challenge unhelpful thinking patterns (Modules 6-7)</li><li style="margin-bottom: 6px;">Change the core beliefs that drive the whole cycle (Modules 8-9)</li></ul>`,
        },
      },
      {
        type: "STYLED_CONTENT",
        title: "Depression Through the CBT Lens",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Depression is not just feeling sad. It is a pattern where low mood, withdrawal, and negative thinking reinforce each other over time.</p><p style="margin-bottom: 12px; line-height: 1.6;">Here is what often happens:</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Withdrawal loop</strong>: You feel tired, so you skip activities. With fewer positive experiences, your mood drops further. Lower mood makes you even less likely to do things.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Thinking traps</strong>: Depression makes your brain act like a filter that only lets in the bad. You might dismiss a compliment, dwell on a mistake, or predict that nothing will get better. These are not character flaws — they are symptoms of how depression reshapes thinking.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Physical impact</strong>: Sleep changes, appetite changes, fatigue, and difficulty concentrating are all part of depression. They are not laziness. They are your nervous system responding to a prolonged state of low mood.</p><p style="margin-bottom: 12px; line-height: 1.6;">CBT works because it gives you concrete skills to break these loops. You do not need to wait until you feel motivated. In fact, one of the first things we will practice is acting before the motivation shows up — because in depression, action often comes before motivation, not the other way around.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "CBT Model Quick Reference",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "CBT Model Quick Reference",
          cards: [
            {
              title: "The CBT Triangle",
              body: "Thoughts, feelings, and behaviors are connected in a triangle. Changing one changes the others. You do not have to fix everything at once — pick one corner to start.",
              emoji: "🔺",
            },
            {
              title: "Depression Withdrawal Loop",
              body: "Low mood leads to doing less, which leads to fewer positive experiences, which lowers mood further. Breaking this loop with small actions is the first step.",
              emoji: "🔄",
            },
            {
              title: "Action Before Motivation",
              body: "In depression, motivation rarely comes first. Do the activity first, even in a small way, and motivation often follows. This is the opposite of what your brain tells you.",
              emoji: "🚀",
            },
            {
              title: "Thoughts Are Not Facts",
              body: "Depression colors your thinking. A thought like 'nothing will get better' feels true but it is a symptom, not a prediction. You will learn to test these thoughts with evidence.",
              emoji: "💭",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Thought-Feeling-Behavior Log",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Three times this week, notice a moment when your mood shifts. Write down: (1) What happened, (2) What thought went through your mind, (3) What emotion you felt and how strong it was (0-10), (4) What you did next. Use the journal prompt below or a notebook.",
            },
            {
              type: "JOURNAL_PROMPT",
              description:
                "At the end of the week, look at your three entries. Do you notice any patterns? Are certain thoughts or situations showing up more than once?",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "EVERY_OTHER_DAY",
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Mapping Your CBT Triangle",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "Think of a recent time you felt really low. Walk through the CBT triangle: What was the situation? What thoughts came up? What emotions did you feel? What did you do (or not do)?",
            "Now imagine a small change at one corner of the triangle. If you changed the behavior (even slightly), how might the thoughts or feelings shift?",
          ],
          spaceSizeHint: "large",
        },
      },
    ]
  );

  // ── Module 3: Behavioral Activation I — Activity Monitoring ─
  await createModule(
    prisma,
    program.id,
    2,
    {
      title: "Behavioral Activation I",
      subtitle: "Activity Monitoring",
      summary:
        "Start tracking your daily activities and their effect on your mood to find patterns and build a foundation for change.",
      estimatedMinutes: 30,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "Why Activity Monitoring Matters",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">When you are depressed, it can feel like everything you do is the same shade of gray. But research shows that is usually not the case — some activities give you a small lift, and others pull you down. The problem is that depression makes it hard to notice the difference.</p><p style="margin-bottom: 12px; line-height: 1.6;">Activity monitoring is a simple tool that helps you see what is actually happening in your day. For this week, you will keep a basic log of what you do and rate two things:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Pleasure</strong>: How much did you enjoy this activity? (0 = none, 10 = a lot)</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Mastery</strong>: How much of a sense of accomplishment did you get? (0 = none, 10 = a lot)</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Why mastery? Because when you are depressed, even getting out of bed can be a real achievement. Mastery captures that. You might not enjoy doing laundry, but completing it when everything feels heavy is worth recognizing.</p><p style="margin-bottom: 12px; line-height: 1.6;">This is not about doing more yet. This week is about noticing. Next week we will use what you learn to plan activities strategically.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Activity Monitoring Tips",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Activity Monitoring Tips",
          cards: [
            {
              title: "Log in Real Time",
              body: "Try to rate activities right after you do them. If you wait until the end of the day, depression will color everything gray. A quick note on your phone works fine.",
              emoji: "📝",
            },
            {
              title: "Include Everything",
              body: "Log routine activities too — meals, showers, commuting. You might be surprised which small activities give you a mood boost or a sense of mastery.",
              emoji: "📋",
            },
            {
              title: "No Judgment",
              body: "This is data collection, not a report card. Low pleasure and mastery scores are normal in depression. The goal is to find patterns, not to feel bad about the numbers.",
              emoji: "🔍",
            },
            {
              title: "Mastery Counts",
              body: "If you brushed your teeth when getting out of bed felt impossible, that is mastery. Rate it relative to how hard it was for you today, not compared to what a non-depressed person might feel.",
              emoji: "🏆",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Activity Log Week 1",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Keep a daily activity log for at least 5 of the next 7 days. For each activity, write down: the activity, the time, a pleasure rating (0-10), and a mastery rating (0-10). Aim for at least 5 activities per day.",
            },
            {
              type: "BRING_TO_SESSION",
              description:
                "Bring your completed activity log to your next session. We will look for patterns together — which activities scored highest for pleasure? Which for mastery? Are there times of day that are consistently better or worse?",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Reflecting on Activities",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "Before you start logging, list five activities that used to bring you pleasure before depression. Are you still doing any of them? If not, what got in the way?",
          ],
          spaceSizeHint: "large",
        },
      },
    ]
  );

  // ── Module 4: Behavioral Activation II — Activity Scheduling ─
  await createModule(
    prisma,
    program.id,
    3,
    {
      title: "Behavioral Activation II",
      subtitle: "Activity Scheduling",
      summary:
        "Use your activity monitoring data to plan activities that boost mood and build momentum.",
      estimatedMinutes: 35,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "From Monitoring to Scheduling",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Last week you tracked your activities and rated them for pleasure and mastery. This week, you will use that data to start doing more of what helps and less of what drains you.</p><p style="margin-bottom: 12px; line-height: 1.6;">Behavioral activation works on a simple principle: <strong style="color: var(--steady-teal);">your mood follows your behavior, not the other way around</strong>. When you wait until you feel like doing something, depression wins — because it rarely lets you feel like doing anything.</p><p style="margin-bottom: 12px; line-height: 1.6;">Instead, we schedule activities in advance and do them whether we feel like it or not. This sounds hard, and it is — but it works. Here is how:</p><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Review your log</strong>: Look at which activities scored highest for pleasure or mastery.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Pick 2-3 activities</strong> to schedule this week. Start small — a 10-minute walk, calling a friend for 5 minutes, cooking one meal.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Put them on your calendar</strong> with a specific day and time.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Do them at the scheduled time</strong>, even if your mood says not to.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Rate them after</strong> — you will often find the experience was better than depression predicted.</li></ol><p style="margin-bottom: 12px; line-height: 1.6;">The key is to start with small, achievable goals. We are not trying to fill your calendar. We are trying to break the withdrawal cycle one activity at a time.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Behavioral Activation Strategies",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Behavioral Activation Strategies",
          cards: [
            {
              title: "The 5-Minute Rule",
              body: "Tell yourself you only have to do the activity for 5 minutes. If after 5 minutes you want to stop, you can. Most of the time, once you start, you will keep going.",
              emoji: "⏱️",
            },
            {
              title: "Schedule, Don't Decide",
              body: "Put activities on your calendar at specific times. When the time comes, do it — no decision needed. Depression thrives on 'I will do it later' because later never comes.",
              emoji: "📅",
            },
            {
              title: "Balance Pleasure and Mastery",
              body: "A good week has both pleasure activities (fun, enjoyable) and mastery activities (accomplishments, productive). You need both to build momentum.",
              emoji: "⚖️",
            },
            {
              title: "Grade on a Curve",
              body: "When depressed, doing 50% of what you planned is a success. Do not compare yourself to your non-depressed self. Celebrate the attempts, not just the completions.",
              emoji: "🎯",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Scheduled Activities Week",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Review your activity log from last week and identify the 3 activities with the highest pleasure or mastery scores. Schedule at least 2 of these for specific times this week.",
            },
            {
              type: "ACTION",
              description:
                "Add one new activity you have been avoiding — something small that used to bring you pleasure or a sense of accomplishment. Schedule it at a specific time.",
            },
            {
              type: "JOURNAL_PROMPT",
              description:
                "After each scheduled activity, rate your mood before (predicted) and after (actual). How often was the experience better than you expected?",
            },
            {
              type: "BRING_TO_SESSION",
              description:
                "Bring your activity schedule and before/after mood ratings. We will discuss what you learned about the gap between predicted and actual mood.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Predicting vs. Experiencing",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "Think about a time you did something even though you did not feel like it. How did you feel afterward compared to what you expected?",
            "What is one activity depression is telling you to skip this week? What might happen if you did it anyway?",
          ],
          spaceSizeHint: "large",
        },
      },
    ]
  );

  // ── Module 5: Identifying Automatic Thoughts ───────────────
  await createModule(
    prisma,
    program.id,
    4,
    {
      title: "Identifying Automatic Thoughts",
      subtitle: "Catching Your Thoughts",
      summary:
        "Learn to notice the automatic negative thoughts that fuel depression and start keeping a thought record.",
      estimatedMinutes: 40,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "What Are Automatic Thoughts?",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Your brain produces thousands of thoughts every day, most of which pass by without you noticing them. In CBT, we call these <strong style="color: var(--steady-teal);">automatic thoughts</strong> — they pop up quickly, feel true, and happen without effort.</p><p style="margin-bottom: 12px; line-height: 1.6;">When you are depressed, many of these automatic thoughts are negative:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">"I can't do anything right."</li><li style="margin-bottom: 6px;">"Nobody really cares about me."</li><li style="margin-bottom: 6px;">"Things will never get better."</li><li style="margin-bottom: 6px;">"I should be able to handle this."</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">These thoughts are not facts. They are habits of mind that depression reinforces. The first step to changing them is learning to catch them.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">How to catch automatic thoughts:</h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Notice a mood shift.</strong> Whenever your mood drops, gets worse, or you feel a surge of sadness, guilt, or anxiety — pause.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Ask: "What just went through my mind?"</strong> There is almost always a thought, image, or memory connected to the mood shift.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Write it down exactly as it came.</strong> Do not edit or soften it. Capture the raw thought.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Rate how much you believe it</strong> (0-100%).</li></ol><p style="margin-bottom: 12px; line-height: 1.6;">This week you will practice catching automatic thoughts using a thought record. It takes practice — at first you might only catch thoughts after the fact. That is normal. With time, you will start noticing them in real time.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Catching Automatic Thoughts",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Catching Automatic Thoughts",
          cards: [
            {
              title: "Mood as a Signal",
              body: "Use mood shifts as an alarm. Whenever your mood dips, ask 'What just went through my mind?' That question is the gateway to catching automatic thoughts.",
              emoji: "🔔",
            },
            {
              title: "Write It Raw",
              body: "Write automatic thoughts word-for-word, even if they feel embarrassing or extreme. The messy version is the real one. Cleaning it up hides the pattern you need to see.",
              emoji: "✏️",
            },
            {
              title: "Hot Thoughts",
              body: "If you notice several thoughts at once, look for the 'hot thought' — the one that carries the most emotional charge. That is the one to work with first.",
              emoji: "🔥",
            },
            {
              title: "Thoughts Are Guesses",
              body: "An automatic thought feels like a fact but it is really your brain's best guess. 'I always fail' is a prediction, not a truth. We will learn to check these predictions with evidence.",
              emoji: "🤔",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Thought Record Practice",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Complete at least 5 thought records this week. For each, write: (1) Situation — what happened, (2) Mood — what you felt and its intensity 0-100, (3) Automatic thought — the exact thought, (4) Belief rating — how much you believe the thought 0-100%. Do not try to change the thoughts yet — just catch them.",
            },
            {
              type: "ACTION",
              description:
                "Continue your behavioral activation schedule from last week. Keep at least 2 planned activities on your calendar.",
            },
            {
              type: "BRING_TO_SESSION",
              description:
                "Bring your thought records to your next session. We will review them together and start identifying common thinking patterns.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Your Automatic Thoughts",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "Think back over the past few days. What is one automatic thought that keeps showing up? How does it make you feel? How much do you believe it right now (0-100%)?",
          ],
          spaceSizeHint: "large",
        },
      },
    ]
  );

  // ── Module 6: Cognitive Distortions ────────────────────────
  await createModule(
    prisma,
    program.id,
    5,
    {
      title: "Cognitive Distortions",
      subtitle: "Thinking Traps",
      summary:
        "Learn the common thinking traps that depression uses and start recognizing which ones show up in your own thoughts.",
      estimatedMinutes: 40,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "Common Thinking Traps in Depression",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Now that you have been catching automatic thoughts, you are probably starting to see patterns. In CBT, we call these patterns <strong style="color: var(--steady-teal);">cognitive distortions</strong> or thinking traps. Everyone falls into them sometimes, but depression makes them much more frequent and convincing.</p><p style="margin-bottom: 12px; line-height: 1.6;">Here are the most common ones:</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">All-or-Nothing Thinking</strong>: Seeing things in black and white. "If I'm not perfect, I'm a failure." There is no middle ground.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Overgeneralization</strong>: One bad event becomes a never-ending pattern. "I messed up this presentation. I always mess things up."</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Mental Filter</strong>: Focusing only on the negative and filtering out anything positive. You get 10 compliments and 1 criticism, and you only think about the criticism.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Disqualifying the Positive</strong>: Dismissing good things as flukes. "They only said that to be nice."</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Mind Reading</strong>: Assuming you know what others are thinking. "Everyone at the party thought I was boring."</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Fortune Telling</strong>: Predicting the worst outcome as if it is certain. "I'll definitely fail the interview."</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Catastrophizing</strong>: Blowing things out of proportion. A small mistake becomes a disaster.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Emotional Reasoning</strong>: Feeling something and treating it as evidence. "I feel worthless, so I must be worthless."</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Should Statements</strong>: Rigid rules about how you or others should be. "I should be able to handle this without help."</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Labeling</strong>: Attaching a global label instead of describing a specific behavior. Instead of "I made a mistake," you say "I'm a loser."</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Personalization</strong>: Blaming yourself for things outside your control. "My friend is in a bad mood — it must be something I did."</p><p style="margin-bottom: 12px; line-height: 1.6;">This week, go back through your thought records and label which thinking trap each automatic thought falls into. Most thoughts fit more than one. The goal is not to eliminate these patterns overnight — it is to start recognizing them so they lose some of their power.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Thinking Traps Reference",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Thinking Traps Reference",
          cards: [
            {
              title: "All-or-Nothing Thinking",
              body: "You see things in only two categories — perfect or terrible. Look for the gray area. Most things in life fall somewhere in between, and that is okay.",
              emoji: "⚫",
            },
            {
              title: "Overgeneralization",
              body: "One event becomes 'always' or 'never.' Watch for those words. Replace them with specifics: 'This time I struggled with X' instead of 'I always fail.'",
              emoji: "🔁",
            },
            {
              title: "Mental Filter",
              body: "You zoom in on the one negative detail and ignore everything else. Try to name three neutral or positive things about the same situation.",
              emoji: "🔎",
            },
            {
              title: "Emotional Reasoning",
              body: "Feeling it does not make it true. 'I feel like a burden' is a feeling, not a fact. Ask yourself: what evidence exists outside of this feeling?",
              emoji: "💔",
            },
            {
              title: "Should Statements",
              body: "'I should be further along by now.' Should statements create guilt and shame. Replace 'should' with 'I would like to' or 'it would be helpful if.'",
              emoji: "📏",
            },
            {
              title: "Fortune Telling",
              body: "You predict a negative outcome as if it is certain. But you cannot see the future. How many times have your worst-case predictions actually come true?",
              emoji: "🔮",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Labeling Thinking Traps",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Go back through your thought records from last week and label each automatic thought with one or more cognitive distortions from the list above. Write the distortion name next to each thought.",
            },
            {
              type: "ACTION",
              description:
                "This week, complete 5 new thought records and include the cognitive distortion label for each one. Notice which thinking traps come up most often for you.",
            },
            {
              type: "BRING_TO_SESSION",
              description:
                "Bring your labeled thought records. We will discuss your most common thinking traps and start learning how to challenge them next week.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "EVERY_OTHER_DAY",
        },
      },
    ]
  );

  // ── Module 7: Cognitive Restructuring I — Examining Evidence ─
  await createModule(
    prisma,
    program.id,
    6,
    {
      title: "Cognitive Restructuring I",
      subtitle: "Examining the Evidence",
      summary:
        "Learn to challenge automatic thoughts by examining the evidence for and against them.",
      estimatedMinutes: 40,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "Putting Thoughts on Trial",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">You have been catching automatic thoughts and labeling the thinking traps they fall into. Now it is time to challenge them.</p><p style="margin-bottom: 12px; line-height: 1.6;">Cognitive restructuring is the core skill of CBT. It does not mean forcing positive thinking or pretending everything is fine. It means looking at your thoughts like a scientist looks at a hypothesis — with curiosity, not certainty.</p><p style="margin-bottom: 12px; line-height: 1.6;">The main technique this week is <strong style="color: var(--steady-teal);">examining the evidence</strong>:</p><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Write the automatic thought</strong> (e.g., "I'm going to fail this project")</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Evidence FOR the thought</strong>: What facts support it? ("I missed one deadline last month.")</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Evidence AGAINST the thought</strong>: What facts contradict it? ("I finished three other projects on time. My boss gave me positive feedback last week. I have the skills to do this.")</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Balanced thought</strong>: Based on ALL the evidence, what is a more realistic way to see this? ("I've been mostly on track. Missing one deadline doesn't mean I'll fail. I can ask for help if I need it.")</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Re-rate your belief</strong> in the original thought (0-100%) and your mood.</li></ol><p style="margin-bottom: 12px; line-height: 1.6;">The balanced thought is not the opposite of the negative thought — it is the more accurate version that accounts for all the evidence, not just the depression-filtered version.</p><p style="margin-bottom: 12px; line-height: 1.6;">This takes practice. Your first few balanced thoughts might feel forced or unconvincing. That is normal. Keep practicing, and they will start to feel more natural.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Evidence Examination Tools",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Evidence Examination Tools",
          cards: [
            {
              title: "The Friend Test",
              body: "If your best friend had this thought, what would you say to them? You would probably be kinder and more balanced. Give yourself the same compassion you would give a friend.",
              emoji: "👥",
            },
            {
              title: "Evidence Not Feelings",
              body: "When listing evidence, stick to facts. 'I feel like a failure' is not evidence — it is the thought restated. 'I got a C on one test' is evidence. Keep it concrete.",
              emoji: "📊",
            },
            {
              title: "Balanced Not Positive",
              body: "A balanced thought is realistic, not cheerful. 'Everything will be perfect' is as distorted as 'Everything is terrible.' Aim for accuracy, not optimism.",
              emoji: "⚖️",
            },
            {
              title: "Belief Re-Rating",
              body: "After examining evidence, re-rate your belief in the original thought. Even a small drop — from 90% to 70% — means the skill is working. Change builds gradually.",
              emoji: "📉",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Evidence-Based Thought Records",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Complete 5 full thought records this week using the evidence examination technique: (1) Situation, (2) Automatic thought + belief rating, (3) Cognitive distortion label, (4) Evidence FOR, (5) Evidence AGAINST, (6) Balanced thought, (7) Re-rate belief and mood.",
            },
            {
              type: "ACTION",
              description:
                "Continue behavioral activation — keep at least 2 scheduled pleasant activities this week.",
            },
            {
              type: "BRING_TO_SESSION",
              description:
                "Bring your complete thought records. We will review them together and refine your balanced thoughts.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 8: Cognitive Restructuring II — Advanced Techniques ─
  await createModule(
    prisma,
    program.id,
    7,
    {
      title: "Cognitive Restructuring II",
      subtitle: "Advanced Techniques",
      summary:
        "Deepen your cognitive restructuring skills with behavioral experiments, the downward arrow, and decatastrophizing.",
      estimatedMinutes: 40,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "Beyond the Evidence Table",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Examining evidence is powerful, but sometimes you need other tools. This week you will learn three advanced techniques for working with stubborn thoughts.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">1. Behavioral Experiments</strong>
Instead of arguing with a thought in your head, test it in the real world. If your thought is "If I speak up in the meeting, people will think I'm stupid," design an experiment: speak up once and observe what actually happens. Record the prediction beforehand and the actual outcome afterward.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">2. The Downward Arrow</strong>
Sometimes an automatic thought is connected to a deeper belief. The downward arrow technique helps you find it:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Start with the automatic thought: "I made a mistake on the report."</li><li style="margin-bottom: 6px;">Ask: "If that were true, what would it mean about me?" → "It means I'm incompetent."</li><li style="margin-bottom: 6px;">Ask again: "And if I were incompetent, what would that mean?" → "I'll lose my job."</li><li style="margin-bottom: 6px;">Keep going: "And if I lost my job?" → "I'd be worthless."</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">The deepest answer reveals a <strong style="color: var(--steady-teal);">core belief</strong> — the engine driving many of your automatic thoughts. We will work with core beliefs more in Module 9.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">3. Decatastrophizing</strong>
When you are catastrophizing, ask three questions:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">What is the <strong style="color: var(--steady-teal);">worst</strong> thing that could happen?</li><li style="margin-bottom: 6px;">What is the <strong style="color: var(--steady-teal);">best</strong> thing that could happen?</li><li style="margin-bottom: 6px;">What is the <strong style="color: var(--steady-teal);">most likely</strong> thing that will happen?</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Usually the most likely outcome is manageable — not great, but not a disaster either.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Advanced Restructuring",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Advanced Restructuring",
          cards: [
            {
              title: "Behavioral Experiment",
              body: "Write your prediction before acting, then record what actually happened. Depression's predictions are usually much worse than reality. Real-world data beats thought arguments.",
              emoji: "🧪",
            },
            {
              title: "Downward Arrow",
              body: "Keep asking 'If that were true, what would it mean about me?' until you hit a core belief like 'I'm unlovable' or 'I'm incompetent.' Knowing your core beliefs is the key to deep change.",
              emoji: "⬇️",
            },
            {
              title: "Decatastrophize",
              body: "Ask: What is the worst, best, and most likely outcome? Then ask: If the worst happened, could I cope? Usually the answer is yes, even if it would be unpleasant.",
              emoji: "🌡️",
            },
            {
              title: "Combine Techniques",
              body: "Use evidence examination first. If the thought is still sticky, try a behavioral experiment. If it connects to a theme about who you are, use the downward arrow.",
              emoji: "🧰",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Advanced Techniques Practice",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Design and carry out one behavioral experiment this week. Write your prediction before the experiment, then record the actual outcome afterward. Rate your belief in the original thought before and after.",
            },
            {
              type: "ACTION",
              description:
                "Use the downward arrow technique on one stubborn automatic thought. Keep asking 'If that were true, what would it mean about me?' until you reach a core belief. Write out the chain of thoughts.",
            },
            {
              type: "ACTION",
              description:
                "Continue filling out at least 3 standard thought records using evidence examination.",
            },
            {
              type: "BRING_TO_SESSION",
              description:
                "Bring your behavioral experiment results, downward arrow chain, and thought records. We will review the core belief you discovered.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "EVERY_OTHER_DAY",
        },
      },
    ]
  );

  // ── Module 9: Core Beliefs ─────────────────────────────────
  await createModule(
    prisma,
    program.id,
    8,
    {
      title: "Core Beliefs",
      subtitle: "Changing Deep Patterns",
      summary:
        "Identify and start reshaping the core beliefs about yourself, others, and the world that drive your depressive thinking.",
      estimatedMinutes: 45,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "Understanding Core Beliefs",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Core beliefs are the deepest level of thinking in CBT. They are broad, rigid statements about yourself, other people, or the world that you learned early in life and reinforced over time.</p><p style="margin-bottom: 12px; line-height: 1.6;">Common core beliefs in depression include:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">About the self: "I am worthless," "I am unlovable," "I am incompetent"</li><li style="margin-bottom: 6px;">About others: "People will always leave," "No one can be trusted"</li><li style="margin-bottom: 6px;">About the world: "The world is unfair," "Nothing ever works out"</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Core beliefs act like a lens. When you believe "I am incompetent," you notice every mistake, dismiss every success, and interpret ambiguous situations as confirmation of incompetence. This is not a choice — it is your brain's confirmation bias running on autopilot.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">How to work with core beliefs:</h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Name the belief</strong>: Use the downward arrow results from last week. Write the core belief in clear, simple terms.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Rate how much you believe it</strong> (0-100%).</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Find the evidence</strong>: Just like with automatic thoughts, list evidence that supports and contradicts the core belief. This time, draw from your whole life — not just recent events.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Develop an alternative belief</strong>: What is a more balanced, accurate belief? (e.g., "I am competent at many things and still learning in others.")</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Keep a positive data log</strong>: Every day, write down one piece of evidence — however small — that supports the new belief. Over weeks, this builds a counter-narrative.</li></ol><p style="margin-bottom: 12px; line-height: 1.6;">Core beliefs do not change overnight. They change gradually, through consistent practice. Each piece of evidence you log weakens the old belief and strengthens the new one.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Core Belief Work",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Core Belief Work",
          cards: [
            {
              title: "Old Belief vs. New Belief",
              body: "Write your old core belief on one side and your new balanced belief on the other. Read the new belief every morning. Repetition matters — you are overwriting years of mental programming.",
              emoji: "📄",
            },
            {
              title: "Positive Data Log",
              body: "Every day, write down one thing that supports your new belief. It can be tiny — 'I helped a coworker' supports 'I have value.' These small pieces add up over time.",
              emoji: "📒",
            },
            {
              title: "The Continuum Technique",
              body: "Instead of 'I am competent' vs. 'I am incompetent,' put it on a scale of 0-100. Most people fall somewhere in the middle. Where do you realistically fall today?",
              emoji: "📏",
            },
            {
              title: "Historical Test",
              body: "Look at your whole life for evidence against the core belief. Your depressed brain skips these memories. Think about childhood achievements, friendships, things you survived.",
              emoji: "📚",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Core Belief Worksheet",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Write down your main core belief (from the downward arrow exercise). Rate how much you believe it 0-100%. Then write an alternative, more balanced belief and rate how much you believe that one.",
            },
            {
              type: "ACTION",
              description:
                "Start a positive data log. Every day this week, write down at least one piece of evidence — however small — that supports your new balanced belief.",
            },
            {
              type: "ACTION",
              description:
                "Continue 3 standard thought records and at least 2 scheduled pleasant activities.",
            },
            {
              type: "BRING_TO_SESSION",
              description:
                "Bring your core belief worksheet and daily positive data log. We will review the evidence together.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Exploring Your Core Beliefs",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "What is the core belief you discovered through the downward arrow? Where do you think it came from? Can you remember early experiences that may have planted this belief?",
            "If your core belief were completely true, how would your life be different from what it actually is? What evidence from your real life contradicts it?",
          ],
          spaceSizeHint: "large",
        },
      },
    ]
  );

  // ── Module 10: Mid-Point Assessment & Problem Solving ──────
  await createModule(
    prisma,
    program.id,
    9,
    {
      title: "Mid-Point Review & Problem Solving",
      subtitle: "Taking Stock",
      summary:
        "Reassess your symptoms, review your progress, and learn problem-solving skills for real-life stressors.",
      estimatedMinutes: 40,
    },
    [
      {
        type: "ASSESSMENT",
        title: "PHQ-9 Mid-Point",
        content: {
          type: "ASSESSMENT",
          title: "Patient Health Questionnaire (PHQ-9) — Mid-Point",
          instructions:
            "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
          scoringMethod: "SUM",
          questions: [
            { question: "Little interest or pleasure in doing things", type: "LIKERT", required: true, sortOrder: 0, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Feeling down, depressed, or hopeless", type: "LIKERT", required: true, sortOrder: 1, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Trouble falling or staying asleep, or sleeping too much", type: "LIKERT", required: true, sortOrder: 2, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Feeling tired or having little energy", type: "LIKERT", required: true, sortOrder: 3, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Poor appetite or overeating", type: "LIKERT", required: true, sortOrder: 4, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down", type: "LIKERT", required: true, sortOrder: 5, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Trouble concentrating on things, such as reading the newspaper or watching television", type: "LIKERT", required: true, sortOrder: 6, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual", type: "LIKERT", required: true, sortOrder: 7, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Thoughts that you would be better off dead or of hurting yourself in some way", type: "LIKERT", required: true, sortOrder: 8, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
          ],
        },
      },
      {
        type: "STYLED_CONTENT",
        title: "Problem-Solving Skills",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Depression does not just distort your thinking — it also makes real-life problems feel unsolvable. This week, you will learn a structured approach to problem solving that works even when your mood is low.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">The 6-Step Problem-Solving Method:</h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Define the problem clearly.</strong> Be specific. Not "My life is a mess" but "I'm behind on three work deadlines."</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Brainstorm solutions.</strong> Write down every option you can think of, even silly ones. Do not judge them yet.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Evaluate each option.</strong> For each, list pros and cons. Consider short-term and long-term consequences.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Choose the best option</strong> (or combine several).</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Make a plan.</strong> Break the solution into concrete steps with specific times.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Review the outcome.</strong> Did it work? What would you do differently?</li></ol><p style="margin-bottom: 12px; line-height: 1.6;">This method is especially useful for the problems that fuel depression — relationship issues, work stress, financial concerns, health challenges. Instead of ruminating (going in circles in your mind), you take structured action.</p><p style="margin-bottom: 12px; line-height: 1.6;">A key insight: you do not need a perfect solution. A good-enough solution that you actually implement beats a perfect solution you never start.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Problem-Solving Reference",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Problem-Solving Reference",
          cards: [
            {
              title: "Define It Specifically",
              body: "Vague problems feel overwhelming. Turn 'everything is falling apart' into one concrete problem statement. Solve that one first. Then pick the next one.",
              emoji: "🎯",
            },
            {
              title: "Brainstorm Without Judging",
              body: "In step 2, quantity beats quality. Write down 10 options without evaluating any of them. Depression says 'nothing will work' — brainstorming overrides that filter.",
              emoji: "💡",
            },
            {
              title: "Good Enough Wins",
              body: "Perfectionism is depression's partner. A plan that is 70% perfect but actually happens beats a plan that is 100% perfect but stays in your head.",
              emoji: "✅",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Problem-Solving Practice",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Choose one real problem you are facing right now. Work through all 6 steps of the problem-solving method on paper. Implement at least step 5 (make a plan and start it) before next session.",
            },
            {
              type: "ACTION",
              description:
                "Continue your positive data log, thought records (at least 3), and 2 scheduled pleasant activities.",
            },
            {
              type: "BRING_TO_SESSION",
              description:
                "Bring your completed problem-solving worksheet and your PHQ-9 mid-point score. We will compare it to your baseline.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "EVERY_OTHER_DAY",
        },
      },
    ]
  );

  // ── Module 11: Rumination & Worry ─────────────────────────
  await createModule(
    prisma,
    program.id,
    10,
    {
      title: "Managing Rumination & Worry",
      subtitle: "Breaking the Cycle",
      summary:
        "Learn techniques to break free from repetitive negative thinking, including worry time, attention training, and behavioral interruption.",
      estimatedMinutes: 35,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "Rumination: Depression's Favorite Tool",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Rumination is when your mind replays the same negative thoughts over and over: "Why did I say that? What's wrong with me? Why can't I just be normal?" Unlike problem-solving, rumination goes in circles. It feels productive — like you are working through something — but it actually deepens depression.</p><p style="margin-bottom: 12px; line-height: 1.6;">Research shows that people who ruminate more have longer and more severe depressive episodes. The good news is that rumination is a habit, and habits can be changed.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">Techniques to manage rumination:</h3><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">1. Scheduled Worry Time</strong>
Set aside 15 minutes at the same time each day as your "worry time." When rumination pops up outside that window, tell yourself: "I'll deal with that during worry time." Write the thought down and move on. During worry time, go through your list. Most items will feel less urgent by then.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">2. Attention Shift</strong>
Rumination happens when your attention gets stuck on internal thoughts. Shift to external focus: name 5 things you can see, 4 you can hear, 3 you can touch. This grounds you in the present.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">3. Behavioral Interruption</strong>
When you catch yourself ruminating, change your physical state: stand up, go outside, splash cold water on your face, or start a brief activity. Movement breaks the mental loop.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">4. Distinguish Rumination from Problem-Solving</strong>
Ask: "Am I actually getting closer to a solution, or am I going in circles?" If circles, use one of the techniques above. If it is a solvable problem, use the 6-step method from last week.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Anti-Rumination Tools",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Anti-Rumination Tools",
          cards: [
            {
              title: "Scheduled Worry Time",
              body: "Give rumination a 15-minute appointment each day. Outside that time, write the worry down and postpone it. By appointment time, most worries shrink on their own.",
              emoji: "⏰",
            },
            {
              title: "5-4-3 Grounding",
              body: "Name 5 things you see, 4 you hear, 3 you can touch. This pulls your attention from the internal thought spiral to the external world. Do it slowly and deliberately.",
              emoji: "🌍",
            },
            {
              title: "Move Your Body",
              body: "Rumination loves stillness. When you catch yourself spiraling, change your physical state immediately — stand up, walk, stretch. Even 2 minutes of movement can break the loop.",
              emoji: "🏃",
            },
            {
              title: "Circles vs. Progress",
              body: "Ask: 'Am I getting closer to a solution or going in circles?' If circles, stop and use a technique. If there is a real problem, write it down and use the 6-step method.",
              emoji: "🔄",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Rumination Management",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Implement scheduled worry time this week. Set a 15-minute window at the same time each day. When you catch yourself ruminating outside that time, write the thought on a list and postpone it. Track how many times per day you postpone.",
            },
            {
              type: "ACTION",
              description:
                "Practice the 5-4-3 grounding technique at least once per day, even if you are not actively ruminating. Building the habit makes it easier to use when you need it.",
            },
            {
              type: "BRING_TO_SESSION",
              description:
                "Bring your worry postponement log and notes on how worry time went. How did it feel to postpone? Were the worries still as urgent during the scheduled time?",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 12: Relapse Prevention & Graduation ────────────
  await createModule(
    prisma,
    program.id,
    11,
    {
      title: "Relapse Prevention & Graduation",
      subtitle: "Maintaining Your Gains",
      summary:
        "Build a personalized relapse prevention plan, complete your final assessment, and celebrate your progress.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "ASSESSMENT",
        title: "PHQ-9 Final",
        content: {
          type: "ASSESSMENT",
          title: "Patient Health Questionnaire (PHQ-9) — Final",
          instructions:
            "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
          scoringMethod: "SUM",
          questions: [
            { question: "Little interest or pleasure in doing things", type: "LIKERT", required: true, sortOrder: 0, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Feeling down, depressed, or hopeless", type: "LIKERT", required: true, sortOrder: 1, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Trouble falling or staying asleep, or sleeping too much", type: "LIKERT", required: true, sortOrder: 2, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Feeling tired or having little energy", type: "LIKERT", required: true, sortOrder: 3, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Poor appetite or overeating", type: "LIKERT", required: true, sortOrder: 4, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down", type: "LIKERT", required: true, sortOrder: 5, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Trouble concentrating on things, such as reading the newspaper or watching television", type: "LIKERT", required: true, sortOrder: 6, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual", type: "LIKERT", required: true, sortOrder: 7, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Thoughts that you would be better off dead or of hurting yourself in some way", type: "LIKERT", required: true, sortOrder: 8, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
          ],
        },
      },
      {
        type: "ASSESSMENT",
        title: "GAD-7 Final",
        content: {
          type: "ASSESSMENT",
          title: "Generalized Anxiety Disorder Scale (GAD-7) — Final",
          instructions:
            "Over the last 2 weeks, how often have you been bothered by the following problems?",
          scoringMethod: "SUM",
          questions: [
            { question: "Feeling nervous, anxious, or on edge", type: "LIKERT", required: true, sortOrder: 0, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Not being able to stop or control worrying", type: "LIKERT", required: true, sortOrder: 1, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Worrying too much about different things", type: "LIKERT", required: true, sortOrder: 2, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Trouble relaxing", type: "LIKERT", required: true, sortOrder: 3, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Being so restless that it is hard to sit still", type: "LIKERT", required: true, sortOrder: 4, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Becoming easily annoyed or irritable", type: "LIKERT", required: true, sortOrder: 5, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
            { question: "Feeling afraid as if something awful might happen", type: "LIKERT", required: true, sortOrder: 6, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
          ],
        },
      },
      {
        type: "STYLED_CONTENT",
        title: "Building Your Relapse Prevention Plan",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">You have made real progress over the past 12 weeks. But depression can come back, especially during stressful times. A relapse prevention plan helps you catch early warning signs and take action before a temporary dip becomes a full relapse.</p><p style="margin-bottom: 12px; line-height: 1.6;">Your plan should include:</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">1. Early Warning Signs</strong>
What are YOUR specific signs that depression might be returning? These are personal — they might include sleeping more, canceling plans, not returning texts, losing interest in food, or having more "I can't do this" thoughts. Write down your top 5.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">2. Triggers</strong>
What situations, seasons, or events tend to trigger depression for you? Stress at work? Conflict in relationships? Winter months? Isolation? Know your triggers so you can prepare.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">3. Action Steps</strong>
When you notice early warning signs, what will you do?</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Resume activity scheduling (even 2 planned activities per week helps)</li><li style="margin-bottom: 6px;">Pull out your thought records and start catching automatic thoughts again</li><li style="margin-bottom: 6px;">Contact your clinician or therapist</li><li style="margin-bottom: 6px;">Use your strategy cards</li><li style="margin-bottom: 6px;">Tell a trusted person what is happening</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">4. Support System</strong>
Who will you reach out to? Write down 2-3 names and how you will contact them.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">5. Skills to Maintain</strong>
Which CBT skills will you keep practicing regularly, even when you feel good? We recommend: activity scheduling, thought records when mood dips, and your daily tracker.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Relapse Prevention",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Relapse Prevention",
          cards: [
            {
              title: "Early Warning Signs",
              body: "Know your personal red flags. When you notice 2 or more of your early warning signs in a week, treat it as a signal to activate your plan — do not wait for things to get worse.",
              emoji: "🚨",
            },
            {
              title: "Setback vs. Relapse",
              body: "A bad day or bad week is a setback, not a relapse. Setbacks are normal. Use your skills, and most setbacks resolve. A relapse is weeks of declining mood without intervention.",
              emoji: "📊",
            },
            {
              title: "Maintenance Mode",
              body: "Keep 2 pleasant activities on your schedule each week, even when you feel good. This is like exercise for your mood — you do not stop just because you are fit.",
              emoji: "🔧",
            },
            {
              title: "Ask for Help Early",
              body: "Reaching out when you first notice warning signs is a sign of strength, not weakness. It is much easier to course-correct early than to climb back from a deep episode.",
              emoji: "🤝",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Relapse Prevention Plan",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Write your personal relapse prevention plan with all 5 sections: (1) Your top 5 early warning signs, (2) Your personal triggers, (3) Action steps you will take, (4) Your support system with names and contact info, (5) CBT skills you will maintain.",
            },
            {
              type: "BRING_TO_SESSION",
              description:
                "Bring your written relapse prevention plan and final assessment scores to your last session. We will finalize the plan together and discuss next steps.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "EVERY_OTHER_DAY",
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Reflecting on Your Journey",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "Look back at what you wrote in Module 1 about what depression feels like for you. How has your experience changed over these 12 weeks?",
            "What is the most important skill or insight you have gained from this program? How will you carry it forward?",
            "Write a brief letter to your future self — the version of you who might be struggling again someday. What do you want to remind them?",
          ],
          spaceSizeHint: "large",
        },
      },
    ]
  );

  // ── Daily Tracker for CBT Depression ───────────────────────
  await prisma.dailyTracker.create({
    data: {
      programId: program.id,
      createdById: clinicianId,
      name: "Daily Mood & Activity Tracker",
      description:
        "Track your mood, sleep, activity level, and thought patterns daily to monitor progress throughout the CBT program.",
      fields: {
        create: [
          {
            label: "Overall mood today",
            fieldType: "SCALE",
            sortOrder: 0,
            isRequired: true,
            options: { min: 1, max: 10, minLabel: "Very low", maxLabel: "Great" },
          },
          {
            label: "Hours of sleep last night",
            fieldType: "NUMBER",
            sortOrder: 1,
            isRequired: true,
            options: { min: 0, max: 24, unit: "hours" },
          },
          {
            label: "Did you complete a planned activity today?",
            fieldType: "YES_NO",
            sortOrder: 2,
            isRequired: true,
          },
          {
            label: "Number of negative automatic thoughts you caught today",
            fieldType: "NUMBER",
            sortOrder: 3,
            isRequired: false,
            options: { min: 0, max: 100 },
          },
          {
            label: "Anxiety level today",
            fieldType: "SCALE",
            sortOrder: 4,
            isRequired: true,
            options: { min: 0, max: 10, minLabel: "None", maxLabel: "Severe" },
          },
          {
            label: "Activities completed today",
            fieldType: "MULTI_CHECK",
            sortOrder: 5,
            isRequired: false,
            options: {
              choices: [
                "Exercise or movement",
                "Social interaction",
                "Work or productive task",
                "Hobby or creative activity",
                "Self-care (shower, cooking, etc.)",
                "Time outdoors",
              ],
            },
          },
          {
            label: "One thing that went well today",
            fieldType: "FREE_TEXT",
            sortOrder: 6,
            isRequired: false,
          },
        ],
      },
    },
  });

  return program;
}

// ============================================================
// TEMPLATE 2 — DBT Skills Training (12 weeks)
// ============================================================

export async function seedTemplate2_DBTSkillsTraining(
  prisma: any,
  clinicianId: string
) {
  const program = await prisma.program.create({
    data: {
      clinicianId,
      title: "DBT Skills Training",
      description:
        "A 12-week Dialectical Behavior Therapy skills training program covering the four core skill modules: Mindfulness, Distress Tolerance, Emotion Regulation, and Interpersonal Effectiveness.",
      category: "Emotion Regulation",
      durationWeeks: 12,
      cadence: "WEEKLY",
      sessionType: "GROUP",
      isTemplate: true,
      status: "PUBLISHED",
    },
  });

  // ── Module 1: Orientation & Mindfulness Core ───────────────
  await createModule(
    prisma,
    program.id,
    0,
    {
      title: "Orientation & Mindfulness Core",
      subtitle: "Getting Started with DBT",
      summary:
        "Learn the goals of DBT, the biosocial theory, and begin practicing core mindfulness skills.",
      estimatedMinutes: 45,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "Welcome to DBT Skills Training",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Welcome to this Dialectical Behavior Therapy (DBT) skills training program. DBT was originally developed by Dr. Marsha Linehan to help people who struggle with intense emotions, but its skills are useful for anyone who wants to manage emotions more effectively.</p><p style="margin-bottom: 12px; line-height: 1.6;">DBT is built on a key idea called <strong style="color: var(--steady-teal);">dialectics</strong> — the idea that two things that seem like opposites can both be true at the same time. The most important dialectic in DBT is:</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">You are doing the best you can AND you need to do better.</h3><p style="margin-bottom: 12px; line-height: 1.6;">This is not a contradiction. It means we accept where you are right now while also working toward change. Acceptance and change go hand in hand.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">The Four Skill Modules:</h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Mindfulness</strong> (Weeks 1-3): The foundation of all other skills. Learning to observe your experience without judgment and to be present in the moment.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Distress Tolerance</strong> (Weeks 4-6): Skills for surviving emotional crises without making things worse.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Emotion Regulation</strong> (Weeks 7-9): Understanding your emotions and learning to change the ones you want to change.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Interpersonal Effectiveness</strong> (Weeks 10-12): Communicating your needs, setting boundaries, and maintaining self-respect in relationships.</li></ol><p style="margin-bottom: 12px; line-height: 1.6;">Each week includes teaching, practice exercises, and homework. The skills build on each other, and mindfulness is woven throughout the entire program.</p>`,
        },
      },
      {
        type: "STYLED_CONTENT",
        title: "The Biosocial Theory",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">DBT's biosocial theory explains why some people have a harder time with emotions than others. It is not about blame — it is about understanding.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The biological part:</strong> Some people are born with a nervous system that is more sensitive to emotions. They feel things faster, more intensely, and it takes longer for the emotion to come back down. This is not a choice or a weakness — it is wiring.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The social part:</strong> When an emotionally sensitive person grows up in an environment that dismisses, punishes, or ignores their emotions (called an invalidating environment), they never learn healthy ways to manage intense feelings. Examples of invalidation: being told "you're overreacting," "just calm down," or "that's nothing to cry about."</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The result:</strong> You feel emotions intensely but were never taught what to do with them. You might swing between suppressing emotions and being overwhelmed by them. DBT teaches you the skills you were never given.</p><p style="margin-bottom: 12px; line-height: 1.6;">Important: understanding the biosocial theory is not about blaming your parents or your biology. It is about making sense of your experience so you can move forward with skills that actually help.</p>`,
        },
      },
      {
        type: "ASSESSMENT",
        title: "DERS Baseline",
        content: {
          type: "ASSESSMENT",
          title: "Difficulties in Emotion Regulation Scale (DERS)",
          instructions:
            "Please indicate how often the following statements apply to you. 1 = Almost never (0-10%), 2 = Sometimes (11-35%), 3 = About half the time (36-65%), 4 = Most of the time (66-90%), 5 = Almost always (91-100%).",
          scoringMethod: "SUM",
          questions: [
            { question: "I am clear about my feelings.", type: "LIKERT", required: true, sortOrder: 0, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "I pay attention to how I feel.", type: "LIKERT", required: true, sortOrder: 1, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "I experience my emotions as overwhelming and out of control.", type: "LIKERT", required: true, sortOrder: 2, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "I have no idea how I am feeling.", type: "LIKERT", required: true, sortOrder: 3, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "I have difficulty making sense out of my feelings.", type: "LIKERT", required: true, sortOrder: 4, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "I am attentive to my feelings.", type: "LIKERT", required: true, sortOrder: 5, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "I know exactly how I am feeling.", type: "LIKERT", required: true, sortOrder: 6, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "I care about what I am feeling.", type: "LIKERT", required: true, sortOrder: 7, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "I am confused about how I feel.", type: "LIKERT", required: true, sortOrder: 8, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I acknowledge my emotions.", type: "LIKERT", required: true, sortOrder: 9, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I become angry with myself for feeling that way.", type: "LIKERT", required: true, sortOrder: 10, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I become embarrassed for feeling that way.", type: "LIKERT", required: true, sortOrder: 11, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I have difficulty getting work done.", type: "LIKERT", required: true, sortOrder: 12, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I become out of control.", type: "LIKERT", required: true, sortOrder: 13, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I believe that I will remain that way for a long time.", type: "LIKERT", required: true, sortOrder: 14, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I believe that I will end up feeling very depressed.", type: "LIKERT", required: true, sortOrder: 15, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I believe that my feelings are valid and important.", type: "LIKERT", required: true, sortOrder: 16, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I have difficulty focusing on other things.", type: "LIKERT", required: true, sortOrder: 17, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I feel out of control.", type: "LIKERT", required: true, sortOrder: 18, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I can still get things done.", type: "LIKERT", required: true, sortOrder: 19, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I feel ashamed with myself for feeling that way.", type: "LIKERT", required: true, sortOrder: 20, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I know that I can find a way to eventually feel better.", type: "LIKERT", required: true, sortOrder: 21, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I feel like I am weak.", type: "LIKERT", required: true, sortOrder: 22, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I feel like I can remain in control of my behaviors.", type: "LIKERT", required: true, sortOrder: 23, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I feel guilty for feeling that way.", type: "LIKERT", required: true, sortOrder: 24, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I have difficulty concentrating.", type: "LIKERT", required: true, sortOrder: 25, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I have difficulty controlling my behaviors.", type: "LIKERT", required: true, sortOrder: 26, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I believe that there is nothing I can do to make myself feel better.", type: "LIKERT", required: true, sortOrder: 27, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I become irritated with myself for feeling that way.", type: "LIKERT", required: true, sortOrder: 28, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I start to feel very bad about myself.", type: "LIKERT", required: true, sortOrder: 29, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I believe that wallowing in it is all I can do.", type: "LIKERT", required: true, sortOrder: 30, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I lose control over my behaviors.", type: "LIKERT", required: true, sortOrder: 31, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I have difficulty thinking about anything else.", type: "LIKERT", required: true, sortOrder: 32, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I take time to figure out what I'm really feeling.", type: "LIKERT", required: true, sortOrder: 33, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, it takes me a long time to feel better.", type: "LIKERT", required: true, sortOrder: 34, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, my emotions feel overwhelming.", type: "LIKERT", required: true, sortOrder: 35, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
          ],
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "DBT Foundations",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "DBT Foundations",
          cards: [
            {
              title: "The Core Dialectic",
              body: "You are doing the best you can AND you need to do better. Both are true. Acceptance without change leads to stagnation. Change without acceptance leads to self-judgment.",
              emoji: "☯️",
            },
            {
              title: "Wise Mind",
              body: "Wise Mind is the overlap between Emotion Mind (ruled by feelings) and Reasonable Mind (ruled by logic). It is the calm knowing you feel in your gut. Practice pausing and asking: what does Wise Mind say?",
              emoji: "🧠",
            },
            {
              title: "Radical Acceptance",
              body: "Radical acceptance means fully accepting reality as it is — not approving of it or giving up, but stopping the fight against what has already happened. Pain is inevitable; suffering from refusing to accept adds to the pain.",
              emoji: "🙏",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Mindfulness Practice Week 1",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Practice the Wise Mind exercise daily: Close your eyes, take 3 deep breaths, and ask 'What does Wise Mind say about this?' on a decision or feeling you are experiencing. Write down what comes up.",
            },
            {
              type: "ACTION",
              description:
                "Practice 5 minutes of mindful breathing each day. Set a timer, focus on your breath. When your mind wanders, gently bring it back. Note how many times it wandered — this is not failure, it is the exercise.",
            },
            {
              type: "JOURNAL_PROMPT",
              description:
                "Write about a time when you were in Emotion Mind and it led to a choice you regretted. What might Wise Mind have said in that moment?",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 2: Mindfulness — What Skills ────────────────────
  await createModule(
    prisma,
    program.id,
    1,
    {
      title: "Mindfulness: What Skills",
      subtitle: "Observe, Describe, Participate",
      summary:
        "Learn the three 'what' skills of mindfulness: observing your experience, describing it in words, and fully participating in the moment.",
      estimatedMinutes: 35,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "The Three What Skills",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Mindfulness in DBT is broken into two sets of skills: the "what" skills (what you do) and the "how" skills (how you do it). This week we cover the "what" skills.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">1. Observe</strong>
Observing means noticing your experience without getting caught up in it. You step back and watch your thoughts, emotions, and sensations as if you were watching clouds pass across the sky.</p><p style="margin-bottom: 12px; line-height: 1.6;">Practice: Sit quietly for 2 minutes. Notice sensations in your body — the chair beneath you, air on your skin, sounds around you. When a thought appears, notice it and let it go. Do not follow it.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">2. Describe</strong>
Describing means putting words on what you observe. Instead of "I feel terrible," you might say: "I notice a tightness in my chest. I notice the thought that I can't handle this. I notice sadness."</p><p style="margin-bottom: 12px; line-height: 1.6;">Describing is powerful because it creates distance between you and your experience. You go from being inside the emotion to naming it from the outside.</p><p style="margin-bottom: 12px; line-height: 1.6;">Practice: After observing for 2 minutes, spend 1 minute describing what you noticed. Use the phrase "I notice..." to start each description.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">3. Participate</strong>
Participating means throwing yourself fully into whatever you are doing, without self-consciousness. When you are cooking, just cook. When you are listening to a friend, just listen. When you are playing with your kids, just play.</p><p style="margin-bottom: 12px; line-height: 1.6;">Participation is the opposite of being "in your head." It is being fully in the moment.</p><p style="margin-bottom: 12px; line-height: 1.6;">Practice: Choose one daily activity (washing dishes, walking, eating a meal) and do it with full participation this week. Notice when your mind pulls you away and gently come back.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "What Skills Reference",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Mindfulness What Skills",
          cards: [
            {
              title: "Observe",
              body: "Step back and notice your experience without getting caught up in it. Watch thoughts like clouds passing. You are the sky, not the weather. Just notice — do not react.",
              emoji: "👁️",
            },
            {
              title: "Describe",
              body: "Put words on your experience: 'I notice tension in my shoulders. I notice the thought that I'm not good enough.' Using 'I notice' creates space between you and the experience.",
              emoji: "🏷️",
            },
            {
              title: "Participate",
              body: "Throw yourself fully into the present activity. No multitasking, no running commentary in your head. Just do the thing completely. This is where flow lives.",
              emoji: "🌊",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "What Skills Practice",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Practice the Observe skill for 5 minutes daily. Sit quietly and notice thoughts, sensations, and sounds without following or judging them. Log how many days you practiced.",
            },
            {
              type: "ACTION",
              description:
                "Practice the Describe skill at least 3 times this week when you notice an emotion. Use 'I notice...' statements to label what you are experiencing (thought, emotion, body sensation).",
            },
            {
              type: "ACTION",
              description:
                "Choose one routine activity (eating a meal, showering, walking) and practice full Participation each day. When your mind wanders, gently bring it back to the activity.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 3: Mindfulness — How Skills ─────────────────────
  await createModule(
    prisma,
    program.id,
    2,
    {
      title: "Mindfulness: How Skills",
      subtitle: "Non-Judgmentally, One-Mindfully, Effectively",
      summary:
        "Learn the three 'how' skills that guide the way you practice mindfulness: without judgment, one thing at a time, and doing what works.",
      estimatedMinutes: 35,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "The Three How Skills",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">The "how" skills describe the attitude you bring to mindfulness practice — and to life in general.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">1. Non-Judgmentally</strong>
Judgment means labeling things as good or bad, right or wrong. Non-judgmental practice means sticking to the facts.</p><p style="margin-bottom: 12px; line-height: 1.6;">Instead of: "I had a terrible day" (judgment)
Try: "I was late to work, had a difficult conversation with my manager, and skipped lunch" (facts)</p><p style="margin-bottom: 12px; line-height: 1.6;">Instead of: "I'm so stupid for feeling this way" (judgment)
Try: "I notice I'm feeling anxious. Anxiety is showing up right now" (observation)</p><p style="margin-bottom: 12px; line-height: 1.6;">Important: Non-judgmental does not mean approving of everything. It means describing reality accurately instead of adding a layer of evaluation that usually makes you feel worse.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">2. One-Mindfully</strong>
One-mindfully means doing one thing at a time with your full attention. When you eat, just eat. When you listen, just listen. When you worry, notice that you are worrying and gently redirect.</p><p style="margin-bottom: 12px; line-height: 1.6;">Our minds constantly jump between past (regret) and future (worry). One-mindfully brings you back to now — the only moment you can actually influence.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">3. Effectively</strong>
Effectively means doing what works in a given situation, even if it is not what feels fair or what you think should work. It means playing the hand you are dealt rather than the hand you wish you had.</p><p style="margin-bottom: 12px; line-height: 1.6;">Asking yourself: "What is my goal right now? What action will move me toward it?" — that is effectiveness. It means letting go of being right in favor of being effective.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "How Skills Reference",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Mindfulness How Skills",
          cards: [
            {
              title: "Non-Judgmentally",
              body: "Replace judgments with facts. 'This is awful' becomes 'This is hard for me right now.' Judgments add suffering on top of pain. Facts let you respond clearly.",
              emoji: "⚖️",
            },
            {
              title: "One-Mindfully",
              body: "Do one thing at a time with full attention. When you notice your mind jumping to the past or future, gently come back to right now. This is a practice, not a destination.",
              emoji: "1️⃣",
            },
            {
              title: "Effectively",
              body: "Do what works, not what feels fair. Ask: 'What is my goal? What action moves me toward it?' Let go of being right in favor of being effective. Results matter more than principles in a crisis.",
              emoji: "🎯",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "How Skills Practice",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Practice non-judgmental observation 3 times this week. When you catch yourself making a judgment (good/bad, should/shouldn't), rewrite it as a factual description. Log the original judgment and the factual version.",
            },
            {
              type: "ACTION",
              description:
                "Practice one-mindfully during at least one meal per day. Put away your phone, turn off the TV, and focus entirely on the experience of eating. Notice textures, flavors, and the pace of eating.",
            },
            {
              type: "ACTION",
              description:
                "Identify one situation this week where you were focused on being right instead of being effective. Write about what happened and what an effective response would have looked like.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "EVERY_OTHER_DAY",
        },
      },
    ]
  );

  // ── Module 4: Distress Tolerance — Crisis Survival (TIPP) ──
  await createModule(
    prisma,
    program.id,
    3,
    {
      title: "Distress Tolerance: Crisis Survival",
      subtitle: "TIPP Skills",
      summary:
        "Learn immediate crisis survival skills using the TIPP technique: Temperature, Intense exercise, Paced breathing, and Progressive relaxation.",
      estimatedMinutes: 35,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "When Emotions Hit 8 Out of 10",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Distress tolerance skills are for moments when your emotional intensity is high — 7 or above on a 0-10 scale — and you need to get through the moment without making things worse.</p><p style="margin-bottom: 12px; line-height: 1.6;">These are not long-term solutions. They are emergency tools. Like a fire extinguisher, you hope you rarely need them, but when you do, they can prevent a lot of damage.</p><p style="margin-bottom: 12px; line-height: 1.6;">The TIPP skills work because they directly change your body's chemistry, which changes how you feel. When emotions are at an 8 or higher, talking yourself out of it rarely works. Your body needs to come down first.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">T — Temperature</strong>
Hold ice cubes in your hands, splash cold water on your face, or put a cold pack on the back of your neck. Cold activates the dive reflex, which slows your heart rate and calms your nervous system within 30 seconds.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">I — Intense Exercise</strong>
Do something physically intense for 10-20 minutes: run, do jumping jacks, climb stairs, or do burpees. Intense exercise burns off the adrenaline and cortisol flooding your body during emotional crises.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">P — Paced Breathing</strong>
Breathe in slowly for 4 counts, hold for 4, breathe out for 6-8 counts. Making the exhale longer than the inhale activates your parasympathetic nervous system — the braking system for stress.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">P — Progressive (Paired) Muscle Relaxation</strong>
Tense a muscle group for 5 seconds, then release for 10 seconds. Work from your feet to your face. The release after tension triggers physical relaxation that anxiety cannot coexist with.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "TIPP Skills",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "TIPP Crisis Survival",
          cards: [
            {
              title: "T — Temperature",
              body: "Hold ice, splash cold water on your face, or put a cold pack on your neck. Cold triggers the dive reflex and slows your heart rate within 30 seconds. Keep ice packs in your freezer.",
              emoji: "🧊",
            },
            {
              title: "I — Intense Exercise",
              body: "Run, do jumping jacks, or climb stairs for 10-20 minutes. This burns off the stress hormones flooding your body. It does not have to be graceful — just intense.",
              emoji: "🏃",
            },
            {
              title: "P — Paced Breathing",
              body: "Breathe in for 4 counts, hold for 4, out for 6-8 counts. The long exhale activates your calming nervous system. Do this for 2-5 minutes until you feel your body slow down.",
              emoji: "🌬️",
            },
            {
              title: "P — Progressive Relaxation",
              body: "Tense each muscle group for 5 seconds, then release for 10. Start with your feet, work up to your face. The release after tension creates deep physical relaxation.",
              emoji: "💆",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "TIPP Practice",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Practice each TIPP skill at least once this week — even if you are not in crisis. Try the cold water face splash, do a short burst of intense exercise, practice 5 minutes of paced breathing, and do one full progressive muscle relaxation session. Rate your distress before and after each practice.",
            },
            {
              type: "ACTION",
              description:
                "Create a TIPP kit: put ice packs in your freezer, identify where you can exercise quickly, and set a paced breathing reminder on your phone. Having the tools ready makes them easier to use in a crisis.",
            },
            {
              type: "BRING_TO_SESSION",
              description:
                "Bring your practice log with before/after distress ratings for each TIPP skill. We will discuss which ones worked best for you.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "EVERY_OTHER_DAY",
        },
      },
    ]
  );

  // ── Module 5: Distress Tolerance — ACCEPTS & Self-Soothe ──
  await createModule(
    prisma,
    program.id,
    4,
    {
      title: "Distress Tolerance: ACCEPTS & Self-Soothe",
      subtitle: "Distraction & Comfort",
      summary:
        "Learn the ACCEPTS distraction skills and the five-senses self-soothing technique for riding out distress.",
      estimatedMinutes: 35,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "ACCEPTS: Healthy Distraction",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">When you are in emotional pain but not in an acute crisis, distraction can help you ride out the wave until the intensity passes. The ACCEPTS acronym gives you seven categories of distraction:</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">A — Activities</strong>: Do something that requires focus — a puzzle, cooking, cleaning, a video game, drawing.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">C — Contributing</strong>: Help someone else. Volunteer, do a favor for a neighbor, write an encouraging text. Getting outside your own pain, even briefly, shifts your emotional state.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">C — Comparisons</strong>: Compare your current situation to a time when things were worse and you survived. Or compare to others who are coping with similar challenges. This is not about minimizing your pain — it is about perspective.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">E — Emotions</strong>: Generate a different emotion. Watch a funny video, listen to uplifting music, read something inspiring. You are not suppressing the painful emotion — you are adding a competing emotion to the mix.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">P — Pushing Away</strong>: Mentally put the distressing situation in a box and put it on a shelf. You are not ignoring it forever — you are setting it aside temporarily so you can cope right now.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">T — Thoughts</strong>: Fill your mind with other thoughts. Count backward from 100 by 7s, recite song lyrics, name every state capital. This occupies the mental space that rumination wants.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">S — Sensations</strong>: Use intense physical sensation to shift attention. Hold ice, snap a rubber band on your wrist, bite into a lemon, take a very hot or very cold shower.</p>`,
        },
      },
      {
        type: "STYLED_CONTENT",
        title: "Self-Soothe with Five Senses",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Self-soothing is the gentle version of distress tolerance. While TIPP and ACCEPTS are active strategies, self-soothing is about comforting yourself the way you would comfort a friend or a child.</p><p style="margin-bottom: 12px; line-height: 1.6;">The five senses give you a framework:</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Vision</strong>: Look at something beautiful — nature, art, photos of loved ones, a sunset. Light a candle and watch the flame.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Hearing</strong>: Listen to calming music, nature sounds, rain, or a guided meditation. Hum or sing softly to yourself.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Smell</strong>: Use a scented candle, essential oil, fresh flowers, or bake something with cinnamon. Smell is deeply connected to emotional memory and comfort.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Taste</strong>: Have a warm cup of tea, a piece of chocolate, or your favorite comfort food. Eat slowly and mindfully.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Touch</strong>: Wrap yourself in a soft blanket, take a warm bath, pet an animal, hold a warm mug. Physical comfort sends safety signals to your nervous system.</p><p style="margin-bottom: 12px; line-height: 1.6;">Self-soothing is not indulgent — it is necessary. Many people who struggle with emotion regulation were never taught that they deserve comfort. You do.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "ACCEPTS & Self-Soothe",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "ACCEPTS & Self-Soothe",
          cards: [
            {
              title: "ACCEPTS Overview",
              body: "Activities, Contributing, Comparisons, Emotions, Pushing Away, Thoughts, Sensations. Pick the one that fits the moment. Distraction is not avoidance — it is buying time until the wave passes.",
              emoji: "🛟",
            },
            {
              title: "Self-Soothe with Senses",
              body: "Comfort yourself through sight, sound, smell, taste, and touch. This is not selfish — it is a skill. Make a list of soothing options for each sense and keep it where you can find it.",
              emoji: "🕯️",
            },
            {
              title: "Contributing to Others",
              body: "Helping someone else during your own distress sounds counterintuitive, but it works. Even a small act of kindness generates positive emotion and shifts your focus outward.",
              emoji: "💝",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "ACCEPTS & Self-Soothe Practice",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Create a personal self-soothe kit: list 2-3 specific options for each of the five senses that you find comforting. Keep this list on your phone or somewhere accessible.",
            },
            {
              type: "ACTION",
              description:
                "Use at least 3 different ACCEPTS strategies this week when you feel distressed. Log which strategy you used, the situation, and rate your distress before and after (0-10).",
            },
            {
              type: "ACTION",
              description:
                "Practice intentional self-soothing at least once this week, even if you are not in distress. Choose one sense and spend 10 minutes fully engaging it.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "EVERY_OTHER_DAY",
        },
      },
    ]
  );

  // ── Module 6: Distress Tolerance — Radical Acceptance ──────
  await createModule(
    prisma,
    program.id,
    5,
    {
      title: "Distress Tolerance: Radical Acceptance",
      subtitle: "Accepting Reality",
      summary:
        "Learn and practice radical acceptance — fully accepting reality as it is — and the skill of turning the mind toward acceptance.",
      estimatedMinutes: 40,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "What Is Radical Acceptance?",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Radical acceptance is one of the most powerful — and most difficult — skills in DBT. It means fully, completely accepting reality as it is in this moment.</p><p style="margin-bottom: 8px; line-height: 1.6;">Radical acceptance does NOT mean:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Approving of what happened</li><li style="margin-bottom: 6px;">Saying it is okay or fair</li><li style="margin-bottom: 6px;">Giving up or giving in</li><li style="margin-bottom: 6px;">Forgetting or forgiving</li></ul><p style="margin-bottom: 8px; line-height: 1.6;">Radical acceptance DOES mean:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Acknowledging that this is what happened</li><li style="margin-bottom: 6px;">Stopping the fight against reality</li><li style="margin-bottom: 6px;">Letting go of bitterness about how things "should" be</li><li style="margin-bottom: 6px;">Freeing up energy to respond to what IS</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Why it matters:</strong> Suffering = Pain + Non-acceptance. Pain is part of life — loss, rejection, illness, unfairness. You cannot avoid pain. But when you refuse to accept reality ("This shouldn't have happened! It's not fair! Why me?"), you add a layer of suffering on top of the pain.</p><p style="margin-bottom: 12px; line-height: 1.6;">Radical acceptance removes the suffering layer. The pain remains, but the struggle against reality stops.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Turning the Mind</strong>: Acceptance is not a one-time decision. You will need to turn your mind toward acceptance over and over. Each time your mind screams "I can't accept this!" you gently turn it back: "This is what happened. I accept reality as it is. I can choose what to do next."</p><p style="margin-bottom: 12px; line-height: 1.6;">This is a practice. Some realities take days, weeks, or months to fully accept. That is okay. Every time you turn the mind counts.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Radical Acceptance",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Radical Acceptance",
          cards: [
            {
              title: "Pain vs. Suffering",
              body: "Pain is inevitable — suffering is optional. Suffering comes from refusing to accept reality. When you stop fighting what IS, the suffering layer drops away, leaving just the pain to work with.",
              emoji: "🌱",
            },
            {
              title: "Turning the Mind",
              body: "Acceptance is a choice you make again and again. When your mind protests — 'This is unfair!' — gently turn it back: 'This happened. I accept it. Now, what can I do?' Turn, and turn again.",
              emoji: "🔄",
            },
            {
              title: "Half-Smile",
              body: "Slightly turn up the corners of your mouth — a half-smile. This tiny physical change sends acceptance signals to your brain. Use it when practicing radical acceptance to reinforce willingness.",
              emoji: "🙂",
            },
            {
              title: "Willingness vs. Willfulness",
              body: "Willingness is accepting reality and doing what the situation requires. Willfulness is refusing to accept, trying to control what you cannot, or giving up entirely. Choose willingness.",
              emoji: "🤲",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Radical Acceptance Practice",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Choose one reality in your life that you have been struggling to accept — something you cannot change. Practice turning the mind toward acceptance at least once per day. Write down the reality, your initial resistance, and the phrase you used to turn your mind.",
            },
            {
              type: "ACTION",
              description:
                "Practice the half-smile technique 3 times this week. When you notice frustration or resistance, slightly turn up the corners of your mouth and relax your face. Notice what shifts.",
            },
            {
              type: "JOURNAL_PROMPT",
              description:
                "Write about something painful that you have accepted in the past. How did you get from resistance to acceptance? What changed? How can you apply that process to something you are struggling with now?",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "EVERY_OTHER_DAY",
        },
      },
    ]
  );

  // ── Module 7: Emotion Regulation — Understanding Emotions ──
  await createModule(
    prisma,
    program.id,
    6,
    {
      title: "Emotion Regulation: Understanding Emotions",
      subtitle: "The Function of Emotions",
      summary:
        "Learn why emotions exist, how they work, and how to identify and label them accurately using the emotion model.",
      estimatedMinutes: 40,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "Emotions Are Not the Enemy",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">If you struggle with intense emotions, you might see them as the problem. But emotions are not the enemy — they are information. Every emotion has a function:</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Fear</strong> tells you there is a threat and prepares your body to respond.
<strong style="color: var(--steady-teal);">Anger</strong> tells you a boundary has been crossed and motivates you to protect it.
<strong style="color: var(--steady-teal);">Sadness</strong> tells you something important has been lost and signals a need for support.
<strong style="color: var(--steady-teal);">Shame</strong> tells you that you have violated a social norm and prompts you to repair the relationship.
<strong style="color: var(--steady-teal);">Joy</strong> tells you something aligns with your values and motivates you to pursue more of it.</p><p style="margin-bottom: 8px; line-height: 1.6;">Problems happen when:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">The emotion does not fit the facts (you feel terror in a safe situation)</li><li style="margin-bottom: 6px;">The emotion fits the facts but its intensity is disproportionate</li><li style="margin-bottom: 6px;">You act on the emotion in ways that create more problems</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Emotion regulation is not about eliminating emotions. It is about:
1. Understanding what your emotions are telling you
2. Reducing vulnerability to unwanted intense emotions
3. Changing emotions that do not fit the facts
4. Managing the impact of emotions you cannot change</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Emotion Model:</strong>
Every emotional experience follows a pattern: Prompting Event → Interpretation → Emotion (body sensation + action urge + feeling) → Behavior → Aftereffects. Learning to map this chain gives you multiple points where you can intervene.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Emotion Regulation Basics",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Emotion Regulation Basics",
          cards: [
            {
              title: "Emotions Are Information",
              body: "Every emotion carries a message. Fear says 'danger,' anger says 'boundary crossed,' sadness says 'loss.' Before trying to change an emotion, ask what it is telling you.",
              emoji: "📩",
            },
            {
              title: "Check the Facts",
              body: "Ask: Does my emotion fit the facts of the situation? Is the threat real? Is the loss real? If the emotion matches reality, it is giving you good information. If not, the emotion may need updating.",
              emoji: "🔍",
            },
            {
              title: "Name It to Tame It",
              body: "Research shows that putting a precise label on an emotion ('I feel frustrated and disappointed') reduces its intensity. The more specific the label, the more it helps.",
              emoji: "🏷️",
            },
            {
              title: "The Emotion Chain",
              body: "Event → Interpretation → Emotion → Behavior → Aftereffects. You can intervene at any link. Change the interpretation, change the behavior, or change the event you expose yourself to.",
              emoji: "⛓️",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Emotion Tracking",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Complete 5 emotion logs this week. For each, map the full chain: (1) Prompting event — what happened, (2) Your interpretation — what you told yourself, (3) Emotion name + intensity 0-10, (4) Body sensations, (5) Action urge, (6) What you actually did, (7) Aftereffects.",
            },
            {
              type: "ACTION",
              description:
                "For each emotion you logged, practice Check the Facts: Is my interpretation accurate? Does the emotion fit the facts? Is the intensity proportionate?",
            },
            {
              type: "BRING_TO_SESSION",
              description:
                "Bring your emotion logs. We will review them to identify patterns in your emotional responses and discuss which links in the chain are best to target.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 8: Emotion Regulation — Opposite Action & PLEASE ─
  await createModule(
    prisma,
    program.id,
    7,
    {
      title: "Emotion Regulation: Opposite Action & PLEASE",
      subtitle: "Changing Unwanted Emotions",
      summary:
        "Learn opposite action for changing emotions that do not fit the facts, and the PLEASE skills for reducing emotional vulnerability.",
      estimatedMinutes: 40,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "Opposite Action",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Every emotion comes with an action urge. Fear urges you to avoid. Anger urges you to attack. Sadness urges you to withdraw. Shame urges you to hide.</p><p style="margin-bottom: 12px; line-height: 1.6;">When the emotion fits the facts, following the urge often makes sense. If a car is speeding toward you, fear's urge to jump out of the way is helpful.</p><p style="margin-bottom: 12px; line-height: 1.6;">But when the emotion does NOT fit the facts — or when acting on the urge will make things worse — opposite action is the skill to use.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">How opposite action works:</h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Identify the emotion and its action urge.</li><li style="margin-bottom: 6px;">Check the facts: Does this emotion fit the situation?</li><li style="margin-bottom: 6px;">If the emotion does not fit the facts (or acting on it will make things worse), do the OPPOSITE of what the emotion urges.</li></ol><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Examples:</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Fear</strong> (unjustified) urges avoidance → Approach what you fear. Do it gradually.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Anger</strong> (unjustified) urges attack → Be gentle. Validate the other person. Take a step back.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Sadness</strong> (unjustified) urges withdrawal → Get active. Reach out to people. Engage.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Shame</strong> (unjustified) urges hiding → Share your experience with someone safe. Hold your head up.</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Important</strong>: Opposite action only works when done ALL THE WAY — with your body, your face, your posture, and your thoughts. Half-hearted opposite action does not change the emotion.</p><p style="margin-bottom: 12px; line-height: 1.6;">Also important: Only use opposite action when the emotion does NOT fit the facts. If the emotion is justified, problem-solving is usually the better approach.</p>`,
        },
      },
      {
        type: "STYLED_CONTENT",
        title: "PLEASE Skills — Reducing Vulnerability",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Your body's physical state directly affects your emotional state. When you are tired, hungry, sick, or sedentary, you are far more vulnerable to emotional overwhelm. The PLEASE skills reduce this vulnerability:</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">PL — treat PhysicaL illness</strong>: Take your medications, see your doctor, address chronic pain. Physical health problems amplify emotional pain.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">E — balanced Eating</strong>: Eat regularly, eat enough, and eat nourishing food. Blood sugar crashes trigger irritability and emotional vulnerability. Do not skip meals.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">A — Avoid mood-Altering substances</strong>: Alcohol, recreational drugs, and excessive caffeine all destabilize emotions. If you are working on emotion regulation, these work against you.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">S — balanced Sleep</strong>: Get 7-9 hours. Go to bed and wake up at consistent times. Sleep deprivation is one of the strongest predictors of emotional dysregulation.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">E — Exercise</strong>: Move your body regularly — at least 20 minutes of moderate activity most days. Exercise is one of the most effective emotion regulation tools available. It changes brain chemistry in ways that improve mood and reduce reactivity.</p><p style="margin-bottom: 12px; line-height: 1.6;">These are not glamorous skills, but they are the foundation. If you skip PLEASE, all the other skills work less effectively. Think of PLEASE as charging your battery — a full battery handles stress better than a depleted one.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Opposite Action & PLEASE",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Opposite Action & PLEASE",
          cards: [
            {
              title: "Opposite Action",
              body: "When an emotion does not fit the facts, do the opposite of what it urges. Fear urges avoidance — approach. Sadness urges withdrawal — engage. Go all the way — body, face, and mind.",
              emoji: "↔️",
            },
            {
              title: "All the Way",
              body: "Opposite action only works when done fully. If anger urges yelling and you stay silent but clench your fists and seethe — that is not opposite action. Relax your body, soften your face, validate the other person.",
              emoji: "💯",
            },
            {
              title: "PLEASE Skills",
              body: "PhysicaL illness, Eating, Avoid substances, Sleep, Exercise. These basics are the foundation of emotion regulation. When PLEASE is neglected, every emotion hits harder.",
              emoji: "🔋",
            },
            {
              title: "Sleep Is Medicine",
              body: "Sleep deprivation makes emotions 60% more intense. Consistent bedtimes and wake times are not optional — they are an emotion regulation strategy. Protect your sleep like your wellbeing depends on it, because it does.",
              emoji: "😴",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Opposite Action & PLEASE Practice",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Practice opposite action at least twice this week. When you notice an emotion that does not fit the facts (or acting on it would make things worse), identify the action urge and do the opposite — all the way. Log: the emotion, the urge, what you did instead, and how the emotion changed.",
            },
            {
              type: "ACTION",
              description:
                "Track your PLEASE skills daily: Did you eat 3 meals? Avoid mood-altering substances? Get 7-9 hours of sleep? Exercise for 20+ minutes? Rate your overall vulnerability each day (0-10).",
            },
            {
              type: "BRING_TO_SESSION",
              description:
                "Bring your opposite action logs and PLEASE tracking sheet. We will look at the relationship between PLEASE compliance and emotional intensity.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 9: Emotion Regulation — Building Positive Experiences ─
  await createModule(
    prisma,
    program.id,
    8,
    {
      title: "Emotion Regulation: Building Positive Experiences",
      subtitle: "Accumulating Positives",
      summary:
        "Learn to deliberately build a life that generates positive emotions through short-term pleasant events and long-term values-based goals.",
      estimatedMinutes: 35,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "Building a Life Worth Living",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Emotion regulation is not just about managing painful emotions — it is also about building positive ones. DBT calls this "accumulating positive experiences."</p><p style="margin-bottom: 12px; line-height: 1.6;">There are two time frames:</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Short-term: Pleasant Events</strong>
Do at least one pleasant thing every day. This is not optional self-care advice — it is a prescription. When your life lacks pleasure, you become more vulnerable to negative emotions.</p><p style="margin-bottom: 12px; line-height: 1.6;">Pleasant events do not have to be big: a cup of good coffee, 10 minutes in the sun, listening to a song you love, petting your cat, a warm shower. The key is to be mindful during the event — actually notice and absorb the positive experience instead of letting it pass by.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Long-term: Values and Goals</strong>
Short-term pleasant events keep your mood stable, but a sense of purpose and direction creates deeper, lasting positive emotion. This means:</p><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Identify your values — what matters most to you (relationships, creativity, learning, health, service).</li><li style="margin-bottom: 6px;">Set one goal in each area that aligns with your values.</li><li style="margin-bottom: 6px;">Break each goal into small, concrete steps.</li><li style="margin-bottom: 6px;">Take one step this week.</li></ol><p style="margin-bottom: 12px; line-height: 1.6;">When your life is organized around your values, positive emotions come naturally. When it is not, no amount of coping skills can fill the gap.</p><p style="margin-bottom: 12px; line-height: 1.6;">One more skill: <strong style="color: var(--steady-teal);">attend to relationships</strong>. Positive relationships are the strongest predictor of emotional wellbeing. Invest in the people who matter to you — a text, a call, a coffee date. Even when you do not feel like it.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Building Positives",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Building Positive Experiences",
          cards: [
            {
              title: "One Pleasant Thing Daily",
              body: "Do one enjoyable thing every day — however small. Be mindful during it. Actually absorb the positive experience instead of rushing through. This builds a buffer against negative emotions.",
              emoji: "🌸",
            },
            {
              title: "Values-Based Goals",
              body: "Identify what matters most to you, then set one small goal in that area. A life aligned with your values generates positive emotion naturally. One step at a time is enough.",
              emoji: "🧭",
            },
            {
              title: "Attend to Relationships",
              body: "Positive relationships are the strongest predictor of emotional wellbeing. Reach out to one person you care about today. A brief connection counts — a text, a call, a shared meal.",
              emoji: "👫",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Accumulating Positives",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Do one pleasant event every day this week. Be mindful during it — put down your phone, pay attention, notice the positive feelings. Log each event and rate how much you enjoyed it (0-10).",
            },
            {
              type: "ACTION",
              description:
                "Identify your top 3 values (things that matter most to you). For each, write one concrete goal and one small step you can take this week. Take at least one step.",
            },
            {
              type: "ACTION",
              description:
                "Reach out to someone you care about at least 3 times this week. This can be a text, call, coffee, or just asking how they are doing.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 10: Interpersonal Effectiveness — DEAR MAN ──────
  await createModule(
    prisma,
    program.id,
    9,
    {
      title: "Interpersonal Effectiveness: DEAR MAN",
      subtitle: "Asking for What You Need",
      summary:
        "Learn the DEAR MAN skill for making effective requests and saying no while maintaining the relationship.",
      estimatedMinutes: 40,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "DEAR MAN: Getting What You Want",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Interpersonal effectiveness means communicating in ways that get your needs met while preserving the relationship and your self-respect. The DEAR MAN skill is for asking for something you need or saying no to something you do not want.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">D — Describe</strong>: Describe the situation using facts only. No judgments, no interpretations. "You said you would call me back on Tuesday, and it is now Friday."</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">E — Express</strong>: Express how the situation makes you feel. Use "I" statements. "I feel worried when I do not hear back because I start to think something is wrong."</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">A — Assert</strong>: Ask for what you want clearly and specifically. Do not hint. Do not expect people to read your mind. "I would like you to call me back within 24 hours when I leave a message."</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">R — Reinforce</strong>: Explain why it would be good for the other person to give you what you want. "If I know I'll hear back from you quickly, I won't need to call multiple times, which I know you don't like."</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">M — Mindful</strong>: Stay focused on your goal. Do not get distracted by side topics, past grievances, or the other person's attempts to change the subject. If they bring up something else, say: "I hear you, and I'd like to talk about that too. Right now, I'm focused on..."</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">A — Appear Confident</strong>: Stand or sit up straight, make eye contact, use a steady tone of voice. Even if you feel anxious, acting confident makes your request more likely to be taken seriously.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">N — Negotiate</strong>: Be willing to give to get. If the other person cannot give you exactly what you asked for, propose an alternative. "If calling within 24 hours is hard, could you at least send a quick text?"</p><p style="margin-bottom: 12px; line-height: 1.6;">DEAR MAN is a framework, not a script. Adapt it to your situation and your communication style.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "DEAR MAN Reference",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "DEAR MAN",
          cards: [
            {
              title: "Describe + Express",
              body: "State the facts of the situation (no judgment), then express how you feel using 'I' statements. This sets the stage without putting the other person on the defensive.",
              emoji: "🗣️",
            },
            {
              title: "Assert + Reinforce",
              body: "Ask for what you want clearly — no hinting. Then explain why it benefits them too. People are more willing to change when they see what is in it for them.",
              emoji: "💪",
            },
            {
              title: "Stay Mindful",
              body: "Do not get sidetracked. If the conversation drifts, gently bring it back: 'I'd like to discuss that too, and right now I'm focused on...' Repeat your request like a broken record if needed.",
              emoji: "🎯",
            },
            {
              title: "Appear Confident + Negotiate",
              body: "Even if you feel shaky inside, use confident body language — eye contact, steady voice. And be willing to negotiate. A partial win is still a win.",
              emoji: "🤝",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "DEAR MAN Practice",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Identify one situation this week where you need to ask for something or say no. Write out a DEAR MAN script in advance — all 7 components. Practice it aloud before using it.",
            },
            {
              type: "ACTION",
              description:
                "Use your DEAR MAN script in the real situation. Afterward, rate: (1) Did I get what I wanted? (2) Is the relationship intact? (3) Do I feel good about how I handled it?",
            },
            {
              type: "BRING_TO_SESSION",
              description:
                "Bring your DEAR MAN script and outcome ratings. We will discuss what worked and what you might adjust for next time.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "EVERY_OTHER_DAY",
        },
      },
    ]
  );

  // ── Module 11: Interpersonal Effectiveness — GIVE & FAST ───
  await createModule(
    prisma,
    program.id,
    10,
    {
      title: "Interpersonal Effectiveness: GIVE & FAST",
      subtitle: "Relationships & Self-Respect",
      summary:
        "Learn the GIVE skill for maintaining relationships and the FAST skill for maintaining self-respect in interactions.",
      estimatedMinutes: 35,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "GIVE: Keeping the Relationship",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">While DEAR MAN focuses on getting what you want, GIVE focuses on maintaining the relationship during the conversation. Use GIVE when the relationship matters more than (or as much as) the outcome.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">G — Gentle</strong>: No attacks, no threats, no judging. Be kind even when you are frustrated. "I'm upset about this" is gentle. "You always do this because you don't care" is not.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">I — Interested</strong>: Listen to the other person. Make eye contact, nod, ask questions. People are far more likely to listen to you when they feel heard by you.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">V — Validate</strong>: Acknowledge the other person's feelings, thoughts, and experience — even if you disagree with their behavior. "I understand why you felt overwhelmed" validates without excusing.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">E — Easy Manner</strong>: Use humor when appropriate. Smile. Be relaxed. People respond to ease. A rigid, tense approach puts others on the defensive.</p><p style="margin-bottom: 12px; line-height: 1.6;">GIVE and DEAR MAN work together. You can be assertive (DEAR MAN) while also being kind and respectful (GIVE). These are not opposites.</p>`,
        },
      },
      {
        type: "STYLED_CONTENT",
        title: "FAST: Keeping Your Self-Respect",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">FAST is about maintaining your self-respect during interactions. Use FAST when you are tempted to sacrifice your values or integrity to get what you want or to please others.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">F — Fair</strong>: Be fair to yourself AND the other person. Do not give in to guilt trips. Do not bully. Find the balance between your needs and theirs.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">A — no Apologies</strong> (when unwarranted): Do not apologize for having an opinion, making a request, or disagreeing. Apologize when you have actually done something wrong — not for existing.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">S — Stick to values</strong>: Know your values before you enter the conversation. Do not sell out to get what you want or to avoid conflict. Ask: "Will I feel good about how I handled this tomorrow?"</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">T — Truthful</strong>: Do not lie, exaggerate, or act helpless when you are not. Honesty builds self-respect. If you get what you want through manipulation, you lose something more important.</p><p style="margin-bottom: 8px; line-height: 1.6;">The balance between DEAR MAN, GIVE, and FAST depends on what matters most in the situation:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">If the OBJECTIVE matters most → lean on DEAR MAN</li><li style="margin-bottom: 6px;">If the RELATIONSHIP matters most → lean on GIVE</li><li style="margin-bottom: 6px;">If your SELF-RESPECT matters most → lean on FAST</li></ul>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "GIVE & FAST Reference",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "GIVE & FAST",
          cards: [
            {
              title: "GIVE for Relationships",
              body: "Gentle, Interested, Validate, Easy manner. You can be assertive and kind at the same time. People are more likely to listen when they feel respected.",
              emoji: "💚",
            },
            {
              title: "FAST for Self-Respect",
              body: "Fair, no unnecessary Apologies, Stick to values, Truthful. Do not sacrifice your integrity to avoid conflict. Self-respect is worth more than any single interaction.",
              emoji: "🛡️",
            },
            {
              title: "The Three Priorities",
              body: "Every interaction has three priorities: your objective, the relationship, and your self-respect. Decide which matters most before you start the conversation, and lean on the matching skill.",
              emoji: "🔺",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "GIVE & FAST Practice",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Practice GIVE in at least 2 conversations this week. Focus on validating the other person's experience even when you disagree with their behavior. Log the conversation and what validation you offered.",
            },
            {
              type: "ACTION",
              description:
                "Identify one situation where you are tempted to over-apologize or compromise your values. Use FAST: do not apologize unnecessarily, stick to your values, and be honest. Write about how it felt.",
            },
            {
              type: "ACTION",
              description:
                "Before one important conversation this week, decide your priority: objective, relationship, or self-respect. Choose the matching skill set (DEAR MAN, GIVE, or FAST) and use it intentionally.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "EVERY_OTHER_DAY",
        },
      },
    ]
  );

  // ── Module 12: Integration & Skills Maintenance ────────────
  await createModule(
    prisma,
    program.id,
    11,
    {
      title: "Integration & Skills Maintenance",
      subtitle: "Putting It All Together",
      summary:
        "Review all four skill modules, create a personalized skills plan, complete your final assessment, and plan for ongoing practice.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "ASSESSMENT",
        title: "DERS Final",
        content: {
          type: "ASSESSMENT",
          title: "Difficulties in Emotion Regulation Scale (DERS) — Final",
          instructions:
            "Please indicate how often the following statements apply to you. 1 = Almost never (0-10%), 2 = Sometimes (11-35%), 3 = About half the time (36-65%), 4 = Most of the time (66-90%), 5 = Almost always (91-100%).",
          scoringMethod: "SUM",
          questions: [
            { question: "I am clear about my feelings.", type: "LIKERT", required: true, sortOrder: 0, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "I pay attention to how I feel.", type: "LIKERT", required: true, sortOrder: 1, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "I experience my emotions as overwhelming and out of control.", type: "LIKERT", required: true, sortOrder: 2, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "I have no idea how I am feeling.", type: "LIKERT", required: true, sortOrder: 3, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "I have difficulty making sense out of my feelings.", type: "LIKERT", required: true, sortOrder: 4, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "I am attentive to my feelings.", type: "LIKERT", required: true, sortOrder: 5, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "I know exactly how I am feeling.", type: "LIKERT", required: true, sortOrder: 6, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "I care about what I am feeling.", type: "LIKERT", required: true, sortOrder: 7, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "I am confused about how I feel.", type: "LIKERT", required: true, sortOrder: 8, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I acknowledge my emotions.", type: "LIKERT", required: true, sortOrder: 9, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I become angry with myself for feeling that way.", type: "LIKERT", required: true, sortOrder: 10, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I become embarrassed for feeling that way.", type: "LIKERT", required: true, sortOrder: 11, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I have difficulty getting work done.", type: "LIKERT", required: true, sortOrder: 12, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I become out of control.", type: "LIKERT", required: true, sortOrder: 13, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I believe that I will remain that way for a long time.", type: "LIKERT", required: true, sortOrder: 14, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I believe that I will end up feeling very depressed.", type: "LIKERT", required: true, sortOrder: 15, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I believe that my feelings are valid and important.", type: "LIKERT", required: true, sortOrder: 16, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I have difficulty focusing on other things.", type: "LIKERT", required: true, sortOrder: 17, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I feel out of control.", type: "LIKERT", required: true, sortOrder: 18, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I can still get things done.", type: "LIKERT", required: true, sortOrder: 19, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I feel ashamed with myself for feeling that way.", type: "LIKERT", required: true, sortOrder: 20, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I know that I can find a way to eventually feel better.", type: "LIKERT", required: true, sortOrder: 21, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I feel like I am weak.", type: "LIKERT", required: true, sortOrder: 22, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I feel like I can remain in control of my behaviors.", type: "LIKERT", required: true, sortOrder: 23, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I feel guilty for feeling that way.", type: "LIKERT", required: true, sortOrder: 24, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I have difficulty concentrating.", type: "LIKERT", required: true, sortOrder: 25, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I have difficulty controlling my behaviors.", type: "LIKERT", required: true, sortOrder: 26, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I believe that there is nothing I can do to make myself feel better.", type: "LIKERT", required: true, sortOrder: 27, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I become irritated with myself for feeling that way.", type: "LIKERT", required: true, sortOrder: 28, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I start to feel very bad about myself.", type: "LIKERT", required: true, sortOrder: 29, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I believe that wallowing in it is all I can do.", type: "LIKERT", required: true, sortOrder: 30, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I lose control over my behaviors.", type: "LIKERT", required: true, sortOrder: 31, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I have difficulty thinking about anything else.", type: "LIKERT", required: true, sortOrder: 32, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, I take time to figure out what I'm really feeling.", type: "LIKERT", required: true, sortOrder: 33, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, it takes me a long time to feel better.", type: "LIKERT", required: true, sortOrder: 34, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
            { question: "When I'm upset, my emotions feel overwhelming.", type: "LIKERT", required: true, sortOrder: 35, likertMin: 1, likertMax: 5, likertMinLabel: "Almost never", likertMaxLabel: "Almost always" },
          ],
        },
      },
      {
        type: "STYLED_CONTENT",
        title: "Your Personal Skills Plan",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">You have now learned skills across all four DBT modules. The key to making them stick is having a plan for which skills to use when.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">Your go-to skills by situation:</h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Emotional crisis (intensity 8-10)</strong>: TIPP first, then ACCEPTS or self-soothe once intensity drops below 7.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Painful reality you cannot change</strong>: Radical acceptance + turning the mind.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Emotion that does not fit the facts</strong>: Check the facts, then opposite action.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Need to ask for something or say no</strong>: DEAR MAN + GIVE or FAST depending on priority.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Feeling emotionally vulnerable in general</strong>: PLEASE skills + accumulating positives.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Rumination or overthinking</strong>: Mindfulness (observe + describe) + participate in an activity.</li></ol><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Maintenance plan:</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Practice mindfulness daily, even 5 minutes</li><li style="margin-bottom: 6px;">Review your strategy cards weekly</li><li style="margin-bottom: 6px;">Continue your daily tracker</li><li style="margin-bottom: 6px;">Use the diary card to log skill use</li><li style="margin-bottom: 6px;">Schedule a booster session if you notice skills slipping</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Remember: skills are like muscles. They get stronger with use and weaken without it. The goal is not perfection — it is consistent practice.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Skills Integration",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Skills Integration",
          cards: [
            {
              title: "Match the Skill to the Situation",
              body: "Crisis? Use TIPP. Unchangeable pain? Radical acceptance. Unjustified emotion? Opposite action. Need something from someone? DEAR MAN. Always start with: What do I need right now?",
              emoji: "🗂️",
            },
            {
              title: "Skills Are Muscles",
              body: "Practice daily, especially when you do not need to. A skill you have rehearsed 100 times will be there in a crisis. A skill you only read about once will not. Repetition is the point.",
              emoji: "💪",
            },
            {
              title: "Progress Not Perfection",
              body: "You will forget skills, fall back on old patterns, and have bad days. That is not failure — it is being human. Notice it, use the skill, and keep going. Recovery is not linear.",
              emoji: "📈",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Skills Maintenance Plan",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Write your personal skills maintenance plan: (1) Your top 3 go-to skills for emotional crises, (2) Your daily mindfulness practice commitment, (3) Your PLEASE skills routine, (4) Your plan for when skills start slipping (who to contact, what to do).",
            },
            {
              type: "BRING_TO_SESSION",
              description:
                "Bring your skills maintenance plan and final DERS scores to your last session. We will compare to baseline and finalize your plan.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "EVERY_OTHER_DAY",
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Reflecting on Your DBT Journey",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "Which DBT skill has had the biggest impact on your life so far? Describe a specific moment where it made a difference.",
            "What is one thing you understand about your emotions now that you did not understand 12 weeks ago?",
            "Write a commitment to yourself about how you will continue using DBT skills going forward.",
          ],
          spaceSizeHint: "large",
        },
      },
    ]
  );

  // ── Daily Tracker for DBT Skills Training ──────────────────
  await prisma.dailyTracker.create({
    data: {
      programId: program.id,
      createdById: clinicianId,
      name: "DBT Daily Diary Card",
      description:
        "Track your emotions, urges, skill use, and PLEASE compliance daily — the cornerstone of DBT skills practice.",
      fields: {
        create: [
          {
            label: "Highest emotional intensity today (0-10)",
            fieldType: "SCALE",
            sortOrder: 0,
            isRequired: true,
            options: { min: 0, max: 10, minLabel: "Calm", maxLabel: "Most intense" },
          },
          {
            label: "Primary emotion today",
            fieldType: "MULTI_CHECK",
            sortOrder: 1,
            isRequired: true,
            options: {
              choices: [
                "Sadness",
                "Anger",
                "Fear/Anxiety",
                "Shame",
                "Joy",
                "Disgust",
                "Surprise",
                "Love",
              ],
            },
          },
          {
            label: "Did you use a DBT skill today?",
            fieldType: "YES_NO",
            sortOrder: 2,
            isRequired: true,
          },
          {
            label: "Which skills did you use?",
            fieldType: "MULTI_CHECK",
            sortOrder: 3,
            isRequired: false,
            options: {
              choices: [
                "Mindfulness",
                "TIPP",
                "ACCEPTS",
                "Self-Soothe",
                "Radical Acceptance",
                "Opposite Action",
                "Check the Facts",
                "DEAR MAN",
                "GIVE",
                "FAST",
                "PLEASE",
              ],
            },
          },
          {
            label: "Urge to engage in problem behavior (0-10)",
            fieldType: "SCALE",
            sortOrder: 4,
            isRequired: true,
            options: { min: 0, max: 10, minLabel: "No urge", maxLabel: "Strongest urge" },
          },
          {
            label: "Did you act on the urge?",
            fieldType: "YES_NO",
            sortOrder: 5,
            isRequired: true,
          },
          {
            label: "Hours of sleep last night",
            fieldType: "NUMBER",
            sortOrder: 6,
            isRequired: true,
            options: { min: 0, max: 24, unit: "hours" },
          },
          {
            label: "PLEASE compliance today",
            fieldType: "MULTI_CHECK",
            sortOrder: 7,
            isRequired: false,
            options: {
              choices: [
                "Ate 3 balanced meals",
                "Avoided mood-altering substances",
                "Exercised 20+ minutes",
                "Took medications as prescribed",
              ],
            },
          },
          {
            label: "One thing I did well today",
            fieldType: "FREE_TEXT",
            sortOrder: 8,
            isRequired: false,
          },
        ],
      },
    },
  });

  return program;
}

// ============================================================
// TEMPLATE 3 — ERP for OCD (16 modules)
// ============================================================

export async function seedTemplate3_ERPForOCD(
  prisma: any,
  clinicianId: string
) {
  const program = await prisma.program.create({
    data: {
      clinicianId,
      title: "ERP for OCD",
      description:
        "A 16-week Exposure and Response Prevention program for adults with Obsessive-Compulsive Disorder. Covers psychoeducation, hierarchy building, graded exposures across OCD subtypes, and relapse prevention.",
      category: "OCD",
      durationWeeks: 16,
      cadence: "WEEKLY",
      sessionType: "ONE_ON_ONE",
      isTemplate: true,
      status: "PUBLISHED",
    },
  });

  // ── Module 1: Welcome & Assessment ─────────────────────────
  await createModule(
    prisma,
    program.id,
    0,
    {
      title: "Welcome & Assessment",
      subtitle: "Getting Started with ERP",
      summary:
        "Learn what ERP is, how it treats OCD, and complete your baseline Y-BOCS assessment.",
      estimatedMinutes: 45,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "Welcome to ERP for OCD",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Welcome to this Exposure and Response Prevention (ERP) program for Obsessive-Compulsive Disorder. ERP is the gold standard treatment for OCD, with decades of research showing it helps 60-80% of people who complete it.</p><p style="margin-bottom: 12px; line-height: 1.6;">OCD has two parts:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Obsessions</strong>: Unwanted, intrusive thoughts, images, or urges that cause significant anxiety. Examples: fear of contamination, doubts about safety, unwanted violent or sexual thoughts, need for things to feel "just right."</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Compulsions</strong>: Behaviors or mental acts you perform to reduce the anxiety caused by obsessions. Examples: washing, checking, counting, repeating, seeking reassurance, mental reviewing.</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">The compulsions provide short-term relief but strengthen the OCD cycle in the long run. Each time you do a compulsion, your brain learns: "That thought was dangerous, and the compulsion saved me." This makes the obsession come back stronger.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">How ERP works:</h3><p style="margin-bottom: 12px; line-height: 1.6;">ERP breaks this cycle by having you:
1. <strong style="color: var(--steady-teal);">Expose</strong> yourself to situations, thoughts, or images that trigger your obsessions (gradually, at a pace you control)
2. <strong style="color: var(--steady-teal);">Prevent the response</strong> — resist doing the compulsion
3. <strong style="color: var(--steady-teal);">Stay with the anxiety</strong> until it naturally decreases on its own (which it always does)</p><p style="margin-bottom: 12px; line-height: 1.6;">Over time, your brain learns that the feared outcome does not happen (or that you can handle it), and the obsessions lose their power. This process is called habituation and new learning.</p><p style="margin-bottom: 12px; line-height: 1.6;">This program will guide you step by step. You and your clinician will build a personalized exposure hierarchy and work through it together.</p>`,
        },
      },
      {
        type: "ASSESSMENT",
        title: "Y-BOCS Baseline",
        content: {
          type: "ASSESSMENT",
          title: "Yale-Brown Obsessive Compulsive Scale (Y-BOCS)",
          instructions:
            "The following questions ask about your obsessive and compulsive symptoms. Rate each item for the past week.",
          scoringMethod: "SUM",
          questions: [
            {
              question: "How much of your time is occupied by obsessive thoughts?",
              type: "LIKERT",
              required: true,
              sortOrder: 0,
              likertMin: 0,
              likertMax: 4,
              likertMinLabel: "None",
              likertMaxLabel: "Extreme (more than 8 hrs/day or near-constant)",
            },
            {
              question: "How much do your obsessive thoughts interfere with your social or work functioning?",
              type: "LIKERT",
              required: true,
              sortOrder: 1,
              likertMin: 0,
              likertMax: 4,
              likertMinLabel: "No interference",
              likertMaxLabel: "Incapacitating",
            },
            {
              question: "How much distress do your obsessive thoughts cause you?",
              type: "LIKERT",
              required: true,
              sortOrder: 2,
              likertMin: 0,
              likertMax: 4,
              likertMinLabel: "None",
              likertMaxLabel: "Near-constant, disabling distress",
            },
            {
              question: "How much of an effort do you make to resist the obsessive thoughts?",
              type: "LIKERT",
              required: true,
              sortOrder: 3,
              likertMin: 0,
              likertMax: 4,
              likertMinLabel: "Always make an effort to resist",
              likertMaxLabel: "No effort to resist, completely yielding",
            },
            {
              question: "How much control do you have over your obsessive thoughts?",
              type: "LIKERT",
              required: true,
              sortOrder: 4,
              likertMin: 0,
              likertMax: 4,
              likertMinLabel: "Complete control",
              likertMaxLabel: "No control, rarely able to even momentarily divert thinking",
            },
            {
              question: "How much time do you spend performing compulsive behaviors?",
              type: "LIKERT",
              required: true,
              sortOrder: 5,
              likertMin: 0,
              likertMax: 4,
              likertMinLabel: "None",
              likertMaxLabel: "Extreme (more than 8 hrs/day or near-constant)",
            },
            {
              question: "How much do your compulsive behaviors interfere with your social or work functioning?",
              type: "LIKERT",
              required: true,
              sortOrder: 6,
              likertMin: 0,
              likertMax: 4,
              likertMinLabel: "No interference",
              likertMaxLabel: "Incapacitating",
            },
            {
              question: "How anxious would you become if prevented from performing your compulsive behaviors?",
              type: "LIKERT",
              required: true,
              sortOrder: 7,
              likertMin: 0,
              likertMax: 4,
              likertMinLabel: "Not at all anxious",
              likertMaxLabel: "Extreme, incapacitating anxiety",
            },
            {
              question: "How much of an effort do you make to resist the compulsions?",
              type: "LIKERT",
              required: true,
              sortOrder: 8,
              likertMin: 0,
              likertMax: 4,
              likertMinLabel: "Always make an effort to resist",
              likertMaxLabel: "No effort to resist, completely yielding",
            },
            {
              question: "How much control do you have over your compulsive behaviors?",
              type: "LIKERT",
              required: true,
              sortOrder: 9,
              likertMin: 0,
              likertMax: 4,
              likertMinLabel: "Complete control",
              likertMaxLabel: "No control, rarely able to even momentarily delay compulsion",
            },
          ],
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Your OCD Story",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "Describe your OCD in your own words. What are your main obsessions and compulsions? When did they start, and how have they changed over time?",
            "What has OCD taken from you? What would your life look like if OCD had less power?",
          ],
          spaceSizeHint: "large",
        },
      },
      {
        type: "CHECKLIST",
        title: "Getting Started Checklist",
        content: {
          type: "CHECKLIST",
          items: [
            { text: "Read the welcome material", sortOrder: 0 },
            { text: "Complete the Y-BOCS assessment", sortOrder: 1 },
            { text: "Write in the journal prompt", sortOrder: 2 },
            { text: "Schedule your first session with your clinician", sortOrder: 3 },
          ],
        },
      },
    ]
  );

  // ── Module 2: Understanding the OCD Cycle ──────────────────
  await createModule(
    prisma,
    program.id,
    1,
    {
      title: "Understanding the OCD Cycle",
      subtitle: "How OCD Works",
      summary:
        "Learn the cognitive-behavioral model of OCD — the obsession-anxiety-compulsion-relief cycle — and why compulsions make OCD worse.",
      estimatedMinutes: 35,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "The OCD Cycle",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">OCD runs on a cycle with four steps:</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">1. Trigger</strong> → Something in your environment or your mind sets off an obsessive thought. This could be touching a doorknob, seeing a knife, driving past a school, or just a random intrusive thought popping up.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">2. Obsession</strong> → An unwanted, intrusive thought, image, or urge appears. "What if the doorknob had germs?" "What if I hurt someone?" "What if I left the stove on?" The thought feels urgent, dangerous, and meaningful.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">3. Anxiety/Distress</strong> → The obsession triggers intense anxiety, disgust, doubt, or guilt. Your body's alarm system activates — heart racing, muscles tense, stomach churning. The discomfort feels unbearable.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">4. Compulsion</strong> → You perform a behavior or mental act to reduce the anxiety: wash your hands, check the stove, review the memory, seek reassurance, avoid the trigger. The anxiety drops — temporarily.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The problem:</strong> The relief from the compulsion reinforces the cycle. Your brain records: "That thought WAS dangerous, and the compulsion saved me." Next time the thought appears, the anxiety is just as strong (or stronger), and you need the compulsion again.</p><p style="margin-bottom: 12px; line-height: 1.6;">Over time, the cycle speeds up. Triggers multiply. Compulsions expand. Avoidance grows. This is how OCD takes over.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">How ERP breaks the cycle:</strong> By exposing yourself to the trigger and preventing the compulsion, your brain learns something new: "The thought showed up, I didn't do the compulsion, and nothing terrible happened. I can handle the anxiety, and it goes down on its own." This weakens the cycle at its core.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "OCD Cycle Reference",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Understanding OCD",
          cards: [
            {
              title: "The OCD Cycle",
              body: "Trigger → Obsession → Anxiety → Compulsion → Temporary Relief → Stronger OCD. Every compulsion you perform teaches your brain the obsession was a real threat. Breaking the cycle means stopping at step 4.",
              emoji: "🔄",
            },
            {
              title: "Intrusive Thoughts Are Normal",
              body: "Everyone has intrusive thoughts — even bizarre or disturbing ones. The difference in OCD is that you take them seriously. The thought is not the problem — the meaning you give it is.",
              emoji: "💭",
            },
            {
              title: "Anxiety Always Comes Down",
              body: "Anxiety is like a wave. It rises, peaks, and falls — every single time. If you do not do the compulsion, the wave still comes down. ERP teaches your body to trust this process.",
              emoji: "🌊",
            },
            {
              title: "Compulsions Feed OCD",
              body: "Compulsions feel like the solution but they are the fuel. Every time you check, wash, or avoid, you are feeding the OCD monster. ERP starves it by cutting off the compulsion.",
              emoji: "🔒",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "OCD Cycle Mapping",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Map your OCD cycle at least 5 times this week. For each occurrence, write: (1) Trigger — what set it off, (2) Obsession — the intrusive thought or image, (3) Anxiety level 0-10, (4) Compulsion — what you did, (5) Did anxiety go down? For how long?",
            },
            {
              type: "ACTION",
              description:
                "Start tracking how much time per day you spend on compulsions (including mental compulsions and avoidance). Write down a rough estimate each evening.",
            },
            {
              type: "BRING_TO_SESSION",
              description:
                "Bring your OCD cycle maps. We will use these to identify your obsession themes and begin building your exposure hierarchy next week.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 3: Building Your Exposure Hierarchy ─────────────
  await createModule(
    prisma,
    program.id,
    2,
    {
      title: "Building Your Exposure Hierarchy",
      subtitle: "Creating Your Fear Ladder",
      summary:
        "Create a personalized hierarchy of feared situations ranked by distress level, which will guide your exposure work for the rest of the program.",
      estimatedMinutes: 40,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "The Exposure Hierarchy",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">An exposure hierarchy (also called a fear ladder) is a ranked list of situations, thoughts, and triggers related to your OCD — from least anxiety-provoking to most anxiety-provoking.</p><p style="margin-bottom: 8px; line-height: 1.6;">We use a 0-100 scale called SUDS (Subjective Units of Distress):</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">0-20: Minimal anxiety, easy to resist compulsion</li><li style="margin-bottom: 6px;">25-40: Mild anxiety, some discomfort but manageable</li><li style="margin-bottom: 6px;">45-60: Moderate anxiety, noticeable distress, strong urge to ritualize</li><li style="margin-bottom: 6px;">65-80: High anxiety, very difficult to resist compulsion</li><li style="margin-bottom: 6px;">85-100: Extreme anxiety, feels unbearable</li></ul><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">How to build your hierarchy:</h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">List all your triggers, feared situations, and avoided situations.</strong> Be specific. Not just "contamination" but "touching a public bathroom door handle and not washing hands for 30 minutes."</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Rate each item</strong> from 0-100 SUDS.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Arrange them in order</strong> from lowest to highest.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Fill in gaps.</strong> Make sure you have items at every level: some easy ones (20-30), some moderate (40-60), some hard (70-85), and your toughest challenges (90-100).</li></ol><p style="margin-bottom: 12px; line-height: 1.6;">You will start exposures at the lower end — items rated 30-40 — and work your way up. You never have to start at the top. Each successful exposure builds confidence and tolerance for the next one.</p><p style="margin-bottom: 12px; line-height: 1.6;">Your clinician will help you refine this list. This is one of the most important tools in the program, so take your time with it.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Hierarchy Building Tips",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Building Your Hierarchy",
          cards: [
            {
              title: "Be Specific",
              body: "Vague items are hard to practice. 'Touching something contaminated' is vague. 'Touching the kitchen trash can lid and waiting 20 minutes before washing' is specific and doable.",
              emoji: "🎯",
            },
            {
              title: "Include Avoidance",
              body: "List things you avoid because of OCD — places, people, activities. These avoidances are compulsions too. Approaching them gradually is an important part of ERP.",
              emoji: "🚪",
            },
            {
              title: "Start in the Sweet Spot",
              body: "Begin with items rated 30-45 SUDS. Hard enough to be meaningful, manageable enough to succeed. Success builds momentum. We will work up to the hard stuff when you are ready.",
              emoji: "🪜",
            },
            {
              title: "Mental Compulsions Count",
              body: "Include mental rituals in your hierarchy — mental reviewing, counting, praying, neutralizing thoughts. These are compulsions too, and response prevention applies to them.",
              emoji: "🧠",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Build Your Hierarchy",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Create your exposure hierarchy. List at least 15-20 OCD-related triggers and feared situations. Rate each one 0-100 SUDS. Arrange them from lowest to highest. Make sure you have items at every level (low, moderate, high, extreme).",
            },
            {
              type: "ACTION",
              description:
                "For each item on your hierarchy, write down: (1) The specific trigger/situation, (2) The obsessive thought it triggers, (3) The compulsion you normally do, (4) Your SUDS rating.",
            },
            {
              type: "BRING_TO_SESSION",
              description:
                "Bring your completed hierarchy. We will review it together, fill in gaps, and plan your first exposures for next week.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "EVERY_OTHER_DAY",
        },
      },
    ]
  );

  // ── Modules 4-12: Graded Exposure Practice (9 weeks) ───────
  // Each module focuses on a different level/theme of the hierarchy

  const exposureModules = [
    {
      sortOrder: 3,
      title: "Beginning Exposures (SUDS 25-40)",
      subtitle: "First Steps",
      summary:
        "Start your first in-vivo and imaginal exposures at the lower end of your hierarchy. Learn how to conduct an exposure and track habituation.",
      text: {
        title: "Your First Exposures",
        body: `<p style="margin-bottom: 12px; line-height: 1.6;">This week you will do your first real exposures. Starting at the lower end of your hierarchy (SUDS 25-40), you will practice approaching feared situations while preventing compulsions.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;"><strong style="color: var(--steady-teal);">How to do an exposure:</strong></h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Choose an item</strong> from the low end of your hierarchy.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Rate your SUDS</strong> before you begin (0-100).</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Enter the situation</strong> or engage with the trigger. Do not avoid or minimize it.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Prevent the compulsion.</strong> This is the key. Touch the doorknob and do NOT wash. Leave the house and do NOT go back to check. Have the intrusive thought and do NOT neutralize it.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Stay with the anxiety.</strong> Rate your SUDS every 5 minutes. Watch the anxiety peak and then — slowly — start to come down.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Continue until SUDS drops by at least half</strong> or you have stayed for 30-45 minutes.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Rate your SUDS</strong> at the end.</li></ol><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What to expect:</strong>
Your anxiety WILL go up at first. This is the point. But if you stay and do not ritualize, your brain begins to learn: "This is uncomfortable, but I can handle it. Nothing terrible happened." The anxiety comes down — maybe not all the way the first time, but it does come down.</p><p style="margin-bottom: 12px; line-height: 1.6;">With repeated practice (the same exposure 3-5 times), the peak SUDS gets lower each time. This is habituation. Once an item no longer triggers significant anxiety (SUDS below 20), you move up the hierarchy.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;"><strong style="color: var(--steady-teal);">Important rules:</strong></h3><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">No subtle avoidance (looking away, thinking of something else, reassuring yourself)</li><li style="margin-bottom: 6px;">No delayed compulsions (washing an hour later still counts as a compulsion)</li><li style="margin-bottom: 6px;">Practice the same exposure multiple times before moving up</li><li style="margin-bottom: 6px;">It is okay if the first attempt is hard — that means it is working</li></ul>`,
      },
      cards: [
        {
          title: "Rate, Expose, Wait, Rate",
          body: "Rate SUDS before. Enter the situation. Prevent the compulsion. Rate SUDS every 5 minutes. Stay until it drops significantly. This is the basic ERP cycle. Repeat 3-5 times per item.",
          emoji: "📊",
        },
        {
          title: "Anxiety Is Temporary",
          body: "Anxiety always peaks and falls. Your OCD says it will last forever — it is lying. Track your SUDS during exposures and watch the evidence accumulate: the wave always comes down.",
          emoji: "🌊",
        },
        {
          title: "No Subtle Avoidance",
          body: "Distraction, mental reassurance, looking away, and 'just quickly checking once' are all subtle avoidance. Full exposure means fully engaging with the trigger. Lean into the discomfort.",
          emoji: "👀",
        },
        {
          title: "Discomfort Means Progress",
          body: "If the exposure is easy, it is not challenging enough. Mild to moderate discomfort (SUDS 30-50) is the sweet spot for learning. Embrace the discomfort — it is the sound of OCD losing power.",
          emoji: "💪",
        },
      ],
      homework: [
        {
          type: "ACTION" as const,
          description:
            "Complete 3 exposures from the SUDS 25-40 range of your hierarchy this week. For each, record: the item, SUDS before, SUDS at peak, SUDS at end, duration, and whether you resisted the compulsion.",
        },
        {
          type: "ACTION" as const,
          description:
            "Practice each exposure at least twice. Repeat the same item until your peak SUDS drops below 25 before moving to the next item.",
        },
        {
          type: "BRING_TO_SESSION" as const,
          description:
            "Bring your exposure logs. We will review your habituation patterns and plan next week's exposures.",
        },
      ],
    },
    {
      sortOrder: 4,
      title: "Continuing Low-Level Exposures (SUDS 35-50)",
      subtitle: "Building Momentum",
      summary:
        "Continue working through lower hierarchy items while building tolerance and confidence in the ERP process.",
      text: {
        title: "Building on Your Progress",
        body: `<p style="margin-bottom: 12px; line-height: 1.6;">By now you have completed several exposures and experienced the anxiety wave rising and falling. This week, continue working through items in the SUDS 35-50 range.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;"><strong style="color: var(--steady-teal);">Key lessons from last week:</strong></h3><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Anxiety does come down without compulsions (you proved this to yourself)</li><li style="margin-bottom: 6px;">The anticipation is usually worse than the actual exposure</li><li style="margin-bottom: 6px;">Each repetition gets easier</li></ul><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;"><strong style="color: var(--steady-teal);">This week's focus: response prevention in daily life</strong></h3><p style="margin-bottom: 12px; line-height: 1.6;">Exposures during homework time are important, but the real progress comes from applying response prevention throughout your day. Every time you face a trigger in daily life and resist the compulsion, you are doing ERP.</p><p style="margin-bottom: 8px; line-height: 1.6;">Start noticing moments in your regular day where OCD makes demands:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">The urge to check the lock one more time</li><li style="margin-bottom: 6px;">The urge to wash after touching something</li><li style="margin-bottom: 6px;">The urge to seek reassurance after an intrusive thought</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Each of these is an opportunity. You do not have to resist every single urge perfectly — but start choosing to resist some of them. Each resistance weakens OCD.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Tracking tip:</strong> Keep a simple daily tally of (1) how many times you resisted a compulsion, and (2) how many times you gave in. Over the weeks, the ratio will shift.</p>`,
      },
      cards: [
        {
          title: "Daily Life Is an Exposure",
          body: "Every trigger you face in your regular day is an exposure opportunity. The more you resist compulsions in real life — not just during homework — the faster OCD weakens.",
          emoji: "🏠",
        },
        {
          title: "Track Your Resistance Ratio",
          body: "Keep a daily tally: compulsions resisted vs. compulsions completed. You do not need a perfect score. Just keep shifting the ratio in the right direction, week by week.",
          emoji: "📈",
        },
      ],
      homework: [
        {
          type: "ACTION" as const,
          description:
            "Complete 4 formal exposures from the SUDS 35-50 range this week. Continue recording SUDS before, peak, and after. Repeat any items from last week that still trigger significant anxiety.",
        },
        {
          type: "ACTION" as const,
          description:
            "Track your daily compulsion resistance ratio. Each evening, estimate: how many times did you resist a compulsion vs. give in? Write down the numbers.",
        },
        {
          type: "BRING_TO_SESSION" as const,
          description:
            "Bring your exposure logs and daily resistance tracking. We will review and adjust your hierarchy if needed.",
        },
      ],
    },
    {
      sortOrder: 5,
      title: "Moderate Exposures (SUDS 45-60)",
      subtitle: "Stepping Up",
      summary:
        "Move into the moderate range of your hierarchy with longer exposure durations and more challenging triggers.",
      text: {
        title: "Stepping Into the Moderate Zone",
        body: `<p style="margin-bottom: 12px; line-height: 1.6;">You have successfully worked through the lower end of your hierarchy. Now it is time to step into the moderate range (SUDS 45-60). These items will be noticeably harder — the anxiety will be more intense and the urge to ritualize will be stronger.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;"><strong style="color: var(--steady-teal);">What is different at this level:</strong></h3><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Peak SUDS will be higher (this is expected)</li><li style="margin-bottom: 6px;">Habituation may take longer (30-45 minutes instead of 15-20)</li><li style="margin-bottom: 6px;">The urge to do subtle avoidance will be stronger</li><li style="margin-bottom: 6px;">You may need more repetitions before an item drops below threshold</li></ul><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;"><strong style="color: var(--steady-teal);">Imaginal exposure introduction:</strong></h3><p style="margin-bottom: 12px; line-height: 1.6;">For some OCD triggers, in-vivo (real-life) exposure is not possible or safe. For example, if your obsession is "what if I accidentally hurt someone," you cannot actually create that situation. This is where imaginal exposure comes in.</p><p style="margin-bottom: 12px; line-height: 1.6;">Imaginal exposure means deliberately thinking about the feared thought or scenario in vivid detail — without neutralizing, reassuring, or ritualizing. You write a script describing the feared scenario and read it repeatedly until the anxiety decreases.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;"><strong style="color: var(--steady-teal);">How to do imaginal exposure:</strong></h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Write a 1-2 paragraph script of your feared scenario in present tense, first person, with sensory details.</li><li style="margin-bottom: 6px;">Read it aloud slowly. Rate SUDS every 5 minutes.</li><li style="margin-bottom: 6px;">Re-read it 3-4 times in a row or until SUDS drops significantly.</li><li style="margin-bottom: 6px;">Do NOT follow it with reassurance, checking, or mental review.</li></ol><p style="margin-bottom: 12px; line-height: 1.6;">Imaginal and in-vivo exposures work together. Many people use imaginal exposure for intrusive thoughts and in-vivo exposure for situational triggers.</p>`,
      },
      cards: [
        {
          title: "Expect Higher Peaks",
          body: "Moderate exposures mean higher peak anxiety. This is normal and expected. The peak is not dangerous — it is uncomfortable. Trust the process: it will come down, just as it did with easier items.",
          emoji: "📊",
        },
        {
          title: "Imaginal Exposure",
          body: "Write a vivid script of your feared scenario. Read it aloud repeatedly. Do not reassure yourself afterward. This teaches your brain that having the thought is not dangerous — it is just a thought.",
          emoji: "📝",
        },
        {
          title: "Longer Durations",
          body: "Be prepared to stay with moderate exposures for 30-45 minutes. Set a timer, commit to the full duration, and track your SUDS. Leaving too early prevents full learning.",
          emoji: "⏱️",
        },
      ],
      homework: [
        {
          type: "ACTION" as const,
          description:
            "Complete 4 exposures from the SUDS 45-60 range this week. At least one should be an imaginal exposure — write a script of a feared intrusive thought and read it 3-4 times. Record all SUDS ratings.",
        },
        {
          type: "ACTION" as const,
          description:
            "Continue daily response prevention in your regular life. Aim to resist at least 50% of compulsive urges that arise naturally.",
        },
        {
          type: "BRING_TO_SESSION" as const,
          description:
            "Bring your exposure logs and imaginal exposure script. We will review habituation patterns and plan higher-level exposures.",
        },
      ],
    },
    {
      sortOrder: 6,
      title: "Moderate-High Exposures (SUDS 55-70)",
      subtitle: "Deepening the Work",
      summary:
        "Tackle more challenging items on your hierarchy including combined in-vivo and imaginal exposures.",
      text: {
        title: "Pushing Through the Middle",
        body: `<p style="margin-bottom: 12px; line-height: 1.6;">The moderate-to-high range is often where ERP feels the most difficult. The lower items have become manageable, but the harder items still feel intimidating. This is the plateau where many people are tempted to stall. Do not let OCD convince you that "this far is enough."</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;"><strong style="color: var(--steady-teal);">Combined exposures:</strong></h3><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">This week, try combining in-vivo and imaginal exposure. For example:</li><li style="margin-bottom: 6px;">Touch a "contaminated" surface (in-vivo) while thinking "I could get seriously ill" (imaginal) — without washing or reassuring</li><li style="margin-bottom: 6px;">Leave the house without checking (in-vivo) while thinking "what if I left the stove on and the house burns down" (imaginal) — without going back</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Combined exposures are powerful because they address both the external trigger and the internal thought at the same time.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;"><strong style="color: var(--steady-teal);">Dealing with the urge to stop:</strong></h3><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Your OCD will tell you to stop. Common thoughts at this stage:</li><li style="margin-bottom: 6px;">"I've improved enough, I can stop here"</li><li style="margin-bottom: 6px;">"This one is too hard"</li><li style="margin-bottom: 6px;">"What if this exposure actually causes something bad to happen?"</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Recognize these as OCD talking. Every one of your previous exposures had the same fear before you did them, and every time the feared outcome did not happen. Trust the evidence, not the feeling.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Response prevention for mental compulsions:</strong>
If you notice mental reviewing, counting, praying, or self-reassurance during exposures, these are mental compulsions. Practice noticing them and letting them go. Do not engage. Let the uncertainty sit.</p>`,
      },
      cards: [
        {
          title: "Combined Exposures",
          body: "Pair an in-vivo trigger with an imaginal feared thought for maximum impact. This addresses both the situation and the catastrophic meaning OCD attaches to it.",
          emoji: "🔗",
        },
        {
          title: "OCD Says Stop",
          body: "'You have improved enough' is OCD talking. If you stop in the middle of your hierarchy, OCD keeps everything above that line. Push through — the freedom is worth the discomfort.",
          emoji: "🚫",
        },
        {
          title: "Let Uncertainty Sit",
          body: "OCD demands certainty: 'Are you SURE it is safe?' The goal of ERP is to tolerate uncertainty, not to prove safety. The answer is always: 'I don't know, and I can handle that.'",
          emoji: "❓",
        },
      ],
      homework: [
        {
          type: "ACTION" as const,
          description:
            "Complete 4 exposures from the SUDS 55-70 range. Include at least one combined in-vivo + imaginal exposure. Record all SUDS ratings and duration.",
        },
        {
          type: "ACTION" as const,
          description:
            "Identify and resist at least 2 mental compulsions this week (mental reviewing, reassurance-seeking thoughts, counting, praying). Write down what the mental compulsion was and how you resisted.",
        },
        {
          type: "BRING_TO_SESSION" as const,
          description:
            "Bring your exposure logs and notes on mental compulsion resistance. We will plan the upper-level exposures.",
        },
      ],
    },
    {
      sortOrder: 7,
      title: "High-Level Exposures (SUDS 65-80)",
      subtitle: "Facing the Hard Stuff",
      summary:
        "Work through the high-anxiety items on your hierarchy, including prolonged exposures and contamination/checking challenges.",
      text: {
        title: "The Upper Hierarchy",
        body: `<p style="margin-bottom: 12px; line-height: 1.6;">You are now in the upper portion of your hierarchy. These are the items that felt impossible when you started this program. But you have built up tolerance, confidence, and evidence that anxiety comes down without compulsions.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Prolonged exposure:</strong>
For high-SUDS items, plan for longer sessions — 45-60 minutes. The longer you stay, the more your brain learns. If you leave during peak anxiety, the exposure may actually reinforce the fear.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;"><strong style="color: var(--steady-teal);">Exposure to core fears:</strong></h3><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">At this level, you may encounter exposures that touch your core fears — the "worst case scenario" thoughts that OCD uses as its ultimate weapon:</li><li style="margin-bottom: 6px;">"What if I am a bad person?"</li><li style="margin-bottom: 6px;">"What if I get contaminated and die?"</li><li style="margin-bottom: 6px;">"What if I am responsible for someone getting hurt?"</li><li style="margin-bottom: 6px;">"What if this means something terrible about me?"</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">These core fears are what give OCD its power. Facing them directly — through imaginal exposure scripts and behavioral experiments — is how you take that power back.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Remember:</strong> You are not doing these exposures because the feared outcomes are impossible. You are doing them because you are learning to tolerate uncertainty and to live your life even when OCD screams that you should not. The goal is not 100% certainty that bad things will not happen. The goal is the ability to move forward without certainty.</p>`,
      },
      cards: [
        {
          title: "Stay Past the Peak",
          body: "For high-level exposures, commit to 45-60 minutes. Leaving during peak anxiety teaches your brain that the situation really was dangerous. Staying teaches it that you can handle this.",
          emoji: "⏳",
        },
        {
          title: "Core Fears",
          body: "OCD's power comes from core fears — the 'what if' scenarios you cannot disprove. Facing them directly through exposure takes away their power. Not because they become impossible, but because you stop needing certainty.",
          emoji: "🎯",
        },
        {
          title: "Tolerance Over Certainty",
          body: "ERP does not make you 100% certain bad things will not happen. It makes you able to live your life without needing that certainty. That is true freedom from OCD.",
          emoji: "🗽",
        },
      ],
      homework: [
        {
          type: "ACTION" as const,
          description:
            "Complete 3-4 exposures from the SUDS 65-80 range this week. Plan for 45-60 minute sessions. Record SUDS every 5 minutes to track the full habituation curve.",
        },
        {
          type: "ACTION" as const,
          description:
            "Write an imaginal exposure script that addresses one of your core fears. Read it aloud at least 3 times this week without engaging in any mental compulsions afterward.",
        },
        {
          type: "BRING_TO_SESSION" as const,
          description:
            "Bring your exposure logs, SUDS tracking sheets, and imaginal script. We will review your progress on the upper hierarchy.",
        },
      ],
    },
    {
      sortOrder: 8,
      title: "Advanced Exposures (SUDS 75-90)",
      subtitle: "Approaching the Summit",
      summary:
        "Tackle near-top hierarchy items with advanced exposure techniques including loop recordings and prolonged imaginal exposure.",
      text: {
        title: "The Final Stretch of Challenging Items",
        body: `<p style="margin-bottom: 12px; line-height: 1.6;">You are now working near the top of your hierarchy. These are the items you may have thought you could never face. You are facing them.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;"><strong style="color: var(--steady-teal);">Advanced exposure techniques:</strong></h3><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Loop recording</strong>: Record your core obsessive thought (e.g., "What if I hurt someone? What if I'm a terrible person?") on your phone and listen to it on repeat for 30-45 minutes. At first, SUDS will be high. By the end, the thought starts to lose its emotional charge — it becomes boring. This is habituation in action.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Contamination spreading</strong>: If contamination is part of your OCD, practice touching a feared object and then deliberately spreading the "contamination" — touching your phone, your clothes, your furniture. This prevents the mental compulsion of keeping "clean" and "dirty" zones separate.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Uncertainty scripts</strong>: Write and read statements like "Maybe I did leave the stove on. Maybe something bad will happen. I don't know, and I'm choosing to live my life anyway." The goal is not to prove safety — it is to practice tolerating not knowing.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What success looks like at this stage:</strong>
Success is not zero anxiety. Success is being willing to have the anxiety, not doing the compulsion, and going about your day. Some items on your hierarchy may never drop to SUDS 0 — and that is fine. If they drop from 85 to 35, you can live with 35.</p>`,
      },
      cards: [
        {
          title: "Loop Recording",
          body: "Record your obsessive thought and listen on repeat for 30-45 minutes. The thought loses its power through sheer repetition. What was terrifying becomes boring. That is the point.",
          emoji: "🔁",
        },
        {
          title: "Spread the Contamination",
          body: "Touch the feared object, then touch everything else. Your phone, your face, your bed. Break down the clean/dirty boundary that OCD created. Contamination OCD relies on keeping things separate.",
          emoji: "🤲",
        },
        {
          title: "Embrace Uncertainty",
          body: "'Maybe something bad will happen. I don't know.' Saying this and sitting with it is one of the most powerful exposures. OCD demands certainty. Recovery means not needing it.",
          emoji: "🌫️",
        },
      ],
      homework: [
        {
          type: "ACTION" as const,
          description:
            "Complete 3 exposures from the SUDS 75-90 range. Try at least one advanced technique: loop recording, contamination spreading, or uncertainty scripts. Record all SUDS ratings.",
        },
        {
          type: "ACTION" as const,
          description:
            "Create a loop recording of your primary intrusive thought. Listen to it for at least 30 minutes without doing any compulsion during or after. Record SUDS at 5, 10, 15, 20, 25, and 30 minutes.",
        },
        {
          type: "BRING_TO_SESSION" as const,
          description:
            "Bring your exposure logs and loop recording SUDS data. We will review and prepare for the top of the hierarchy.",
        },
      ],
    },
    {
      sortOrder: 9,
      title: "Peak Exposures (SUDS 85-100)",
      subtitle: "The Top of the Ladder",
      summary:
        "Face the most challenging items on your hierarchy — the ones OCD said you could never do.",
      text: {
        title: "Facing Your Biggest Fears",
        body: `<p style="margin-bottom: 12px; line-height: 1.6;">You have arrived at the top of your hierarchy. These are the items that seemed impossible when you started this program. The fact that you are here — that you have worked through dozens of exposures, tolerated intense anxiety, and resisted compulsions — is a testament to your courage.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;"><strong style="color: var(--steady-teal);">Top-level exposures may include:</strong></h3><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">The scenario OCD says would destroy you</li><li style="margin-bottom: 6px;">Extended periods without checking or seeking reassurance</li><li style="margin-bottom: 6px;">Direct confrontation with your worst intrusive thought</li><li style="margin-bottom: 6px;">Real-life situations you have avoided for months or years</li></ul><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;"><strong style="color: var(--steady-teal);">How to approach these:</strong></h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Plan the exposure carefully with your clinician.</li><li style="margin-bottom: 6px;">Expect high SUDS (80-100). This is the point.</li><li style="margin-bottom: 6px;">Commit to the full duration (45-60 minutes minimum).</li><li style="margin-bottom: 6px;">Remember: you have done dozens of exposures that felt "too hard" and survived every one.</li><li style="margin-bottom: 6px;">The anxiety WILL come down. It may take longer, but it will.</li></ol><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;"><strong style="color: var(--steady-teal);">After the exposure:</strong></h3><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Do NOT seek reassurance</li><li style="margin-bottom: 6px;">Do NOT mentally review to make sure "everything is okay"</li><li style="margin-bottom: 6px;">Do NOT do the compulsion "just this once"</li><li style="margin-bottom: 6px;">Sit with whatever you feel. Write about it if that helps. But do not undo the exposure with a compulsion.</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Completing your top hierarchy items does not mean OCD is gone forever. It means you have proven to yourself that you can face anything OCD throws at you and come out the other side.</p>`,
      },
      cards: [
        {
          title: "You Have Done Harder Than You Thought",
          body: "Every item on your hierarchy once felt impossible. You did them anyway. The top items feel the same way right now — and you will get through them the same way. Trust your track record.",
          emoji: "🏔️",
        },
        {
          title: "Do Not Undo the Exposure",
          body: "After a top-level exposure, the urge to check, reassure, or review will be intense. Resist. Undoing the exposure with a compulsion erases the learning. Sit with it and let it pass.",
          emoji: "🔒",
        },
        {
          title: "Courage Over Comfort",
          body: "ERP is not about being comfortable. It is about choosing to live your life fully despite discomfort. Every exposure you do is an act of courage. OCD shrinks when you stop running.",
          emoji: "🦁",
        },
      ],
      homework: [
        {
          type: "ACTION" as const,
          description:
            "Complete 2-3 exposures from the SUDS 85-100 range this week. These should be planned with your clinician. Commit to the full duration and resist all compulsions during and after.",
        },
        {
          type: "ACTION" as const,
          description:
            "After each peak exposure, write a brief reflection: What was the feared outcome? What actually happened? How does this change your belief about the obsession?",
        },
        {
          type: "BRING_TO_SESSION" as const,
          description:
            "Bring your exposure logs and reflections. We will celebrate your progress and begin consolidation.",
        },
      ],
    },
    {
      sortOrder: 10,
      title: "Consolidation & Generalization I",
      subtitle: "Spreading the Gains",
      summary:
        "Practice exposures in new contexts and situations to generalize your learning and prevent OCD from finding new hiding places.",
      text: {
        title: "Generalizing Your Progress",
        body: `<p style="margin-bottom: 12px; line-height: 1.6;">You have worked through your hierarchy from bottom to top. Now it is time to make sure the gains generalize — that they carry over into all areas of your life, not just the specific situations you practiced.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Why generalization matters:</strong>
OCD is context-dependent. You might be comfortable touching a doorknob at home but still anxious about a doorknob at a hospital. You might tolerate an intrusive thought about one person but not another. Generalization means exposing yourself to variations of your triggers so the learning applies broadly.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;"><strong style="color: var(--steady-teal);">How to generalize:</strong></h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Vary the context</strong>: Do your exposures in different locations, at different times of day, with different people present.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Vary the specifics</strong>: If you practiced touching one type of surface, expand to others. If you wrote one imaginal script, write others with different details.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Reduce safety behaviors</strong>: Look for subtle safety behaviors you may still be using — carrying hand sanitizer "just in case," having a mental exit strategy, choosing specific seats. Drop them.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Practice in real life</strong>: Move from structured homework exposures to spontaneous, daily-life response prevention. When OCD pops up, lean in instead of ritualizing.</li></ol><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;"><strong style="color: var(--steady-teal);">Common safety behaviors to watch for:</strong></h3><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Doing exposures only when you feel "ready" or "strong"</li><li style="margin-bottom: 6px;">Choosing the easiest version of a trigger</li><li style="margin-bottom: 6px;">Having a reassurance backup ("I'll text my therapist if it gets bad")</li><li style="margin-bottom: 6px;">Monitoring your anxiety level too frequently during exposure</li></ul>`,
      },
      cards: [
        {
          title: "Vary the Context",
          body: "OCD is sneaky — it can accept one context while hiding in others. Practice exposures in different places, times, and situations. Make the learning broad, not narrow.",
          emoji: "🗺️",
        },
        {
          title: "Drop Safety Behaviors",
          body: "Carrying sanitizer 'just in case,' mentally planning escape routes, seeking subtle reassurance — these are safety behaviors that maintain OCD. Identify yours and drop them one by one.",
          emoji: "🛡️",
        },
      ],
      homework: [
        {
          type: "ACTION" as const,
          description:
            "Take 3 exposures you have already mastered and practice them in a new context — different location, time, or situation. Record how the experience compared to the original exposure.",
        },
        {
          type: "ACTION" as const,
          description:
            "Identify 2-3 subtle safety behaviors you are still using. Choose one to drop this week and practice without it.",
        },
        {
          type: "BRING_TO_SESSION" as const,
          description:
            "Bring your generalization logs and safety behavior inventory. We will identify remaining safety behaviors and plan further generalization.",
        },
      ],
    },
    {
      sortOrder: 11,
      title: "Consolidation & Generalization II",
      subtitle: "Building Independence",
      summary:
        "Continue generalizing your gains and practice designing and conducting exposures independently.",
      text: {
        title: "Becoming Your Own ERP Therapist",
        body: `<p style="margin-bottom: 12px; line-height: 1.6;">An important part of maintaining your gains long-term is learning to design and conduct your own exposures — without your clinician guiding every step.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;"><strong style="color: var(--steady-teal);">How to be your own ERP therapist:</strong></h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Recognize OCD's new tricks.</strong> OCD may shift themes — from contamination to harm, from checking to "just right." The content changes but the process is the same: obsession → anxiety → compulsion urge → ERP.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Build a new mini-hierarchy on the spot.</strong> When a new trigger appears, rate it, break it into steps, and start exposing yourself. You now have the skills to do this.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Apply the same rules:</strong> No avoidance, no compulsions, stay with the anxiety, let it come down naturally.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Trust the process.</strong> You have months of evidence that ERP works for you. When a new fear feels overwhelming, remind yourself: every previous fear felt the same way before you faced it.</li></ol><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">This week's practice:</strong> Design your own exposure for a trigger that is NOT on your original hierarchy — something new that OCD has been doing. Build a mini-hierarchy, plan the exposure, and do it on your own.</p>`,
      },
      cards: [
        {
          title: "OCD Changes Themes",
          body: "When you master one theme, OCD may shift to another. 'See? This is different!' It is not. The cycle is the same. Apply ERP to the new theme the same way you did the old one.",
          emoji: "🎭",
        },
        {
          title: "Be Your Own Therapist",
          body: "You know how to build a hierarchy, design an exposure, and prevent compulsions. When a new trigger appears, handle it yourself. You have been trained for this.",
          emoji: "🎓",
        },
      ],
      homework: [
        {
          type: "ACTION" as const,
          description:
            "Identify a new OCD trigger that is NOT on your original hierarchy. Build a mini-hierarchy for it (at least 5 items), design an exposure for a moderate item, and complete it. Record your SUDS and process.",
        },
        {
          type: "ACTION" as const,
          description:
            "Continue daily response prevention. Track your overall compulsion resistance ratio for the week.",
        },
        {
          type: "BRING_TO_SESSION" as const,
          description:
            "Bring your self-designed exposure and results. We will discuss your ability to independently manage OCD triggers.",
        },
      ],
    },
  ];

  for (const mod of exposureModules) {
    await createModule(
      prisma,
      program.id,
      mod.sortOrder,
      {
        title: mod.title,
        subtitle: mod.subtitle,
        summary: mod.summary,
        estimatedMinutes: 40,
      },
      [
        {
          type: "STYLED_CONTENT",
          title: mod.text.title,
          content: { type: "STYLED_CONTENT", rawContent: "", styledHtml: mod.text.body },
        },
        {
          type: "STRATEGY_CARDS",
          title: `${mod.subtitle} Strategy Cards`,
          content: {
            type: "STRATEGY_CARDS",
            deckName: mod.title,
            cards: mod.cards,
          },
        },
        {
          type: "HOMEWORK",
          title: `${mod.subtitle} Homework`,
          content: {
            type: "HOMEWORK",
            items: mod.homework,
            dueTimingType: "BEFORE_NEXT_SESSION",
            completionRule: "MAJORITY",
            reminderCadence: "DAILY",
          },
        },
      ]
    );
  }

  // ── Module 13: Mid-Point Assessment ────────────────────────
  await createModule(
    prisma,
    program.id,
    12,
    {
      title: "Mid-Point Assessment & Review",
      subtitle: "Taking Stock",
      summary:
        "Reassess your OCD symptoms with the Y-BOCS and review your progress from the first half of the program.",
      estimatedMinutes: 35,
    },
    [
      {
        type: "ASSESSMENT",
        title: "Y-BOCS Mid-Point",
        content: {
          type: "ASSESSMENT",
          title: "Yale-Brown Obsessive Compulsive Scale (Y-BOCS) — Mid-Point",
          instructions:
            "The following questions ask about your obsessive and compulsive symptoms. Rate each item for the past week.",
          scoringMethod: "SUM",
          questions: [
            { question: "How much of your time is occupied by obsessive thoughts?", type: "LIKERT", required: true, sortOrder: 0, likertMin: 0, likertMax: 4, likertMinLabel: "None", likertMaxLabel: "Extreme (more than 8 hrs/day or near-constant)" },
            { question: "How much do your obsessive thoughts interfere with your social or work functioning?", type: "LIKERT", required: true, sortOrder: 1, likertMin: 0, likertMax: 4, likertMinLabel: "No interference", likertMaxLabel: "Incapacitating" },
            { question: "How much distress do your obsessive thoughts cause you?", type: "LIKERT", required: true, sortOrder: 2, likertMin: 0, likertMax: 4, likertMinLabel: "None", likertMaxLabel: "Near-constant, disabling distress" },
            { question: "How much of an effort do you make to resist the obsessive thoughts?", type: "LIKERT", required: true, sortOrder: 3, likertMin: 0, likertMax: 4, likertMinLabel: "Always make an effort to resist", likertMaxLabel: "No effort to resist, completely yielding" },
            { question: "How much control do you have over your obsessive thoughts?", type: "LIKERT", required: true, sortOrder: 4, likertMin: 0, likertMax: 4, likertMinLabel: "Complete control", likertMaxLabel: "No control, rarely able to even momentarily divert thinking" },
            { question: "How much time do you spend performing compulsive behaviors?", type: "LIKERT", required: true, sortOrder: 5, likertMin: 0, likertMax: 4, likertMinLabel: "None", likertMaxLabel: "Extreme (more than 8 hrs/day or near-constant)" },
            { question: "How much do your compulsive behaviors interfere with your social or work functioning?", type: "LIKERT", required: true, sortOrder: 6, likertMin: 0, likertMax: 4, likertMinLabel: "No interference", likertMaxLabel: "Incapacitating" },
            { question: "How anxious would you become if prevented from performing your compulsive behaviors?", type: "LIKERT", required: true, sortOrder: 7, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all anxious", likertMaxLabel: "Extreme, incapacitating anxiety" },
            { question: "How much of an effort do you make to resist the compulsions?", type: "LIKERT", required: true, sortOrder: 8, likertMin: 0, likertMax: 4, likertMinLabel: "Always make an effort to resist", likertMaxLabel: "No effort to resist, completely yielding" },
            { question: "How much control do you have over your compulsive behaviors?", type: "LIKERT", required: true, sortOrder: 9, likertMin: 0, likertMax: 4, likertMinLabel: "Complete control", likertMaxLabel: "No control, rarely able to even momentarily delay compulsion" },
          ],
        },
      },
      {
        type: "STYLED_CONTENT",
        title: "Reviewing Your Progress",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Pause and look back at where you started. Compare your baseline Y-BOCS score to your mid-point score. Look at your exposure logs from the first few weeks compared to now.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">Questions to consider:</h3><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">How much time per day are you spending on compulsions now vs. when you started?</li><li style="margin-bottom: 6px;">Which hierarchy items that felt impossible are now manageable?</li><li style="margin-bottom: 6px;">How has your life changed as OCD takes up less space?</li><li style="margin-bottom: 6px;">What situations are you able to do now that you were avoiding before?</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">A typical ERP response: Y-BOCS scores drop 40-60% from baseline to end of treatment. If your scores have dropped significantly, the treatment is working. If scores have not changed much, discuss with your clinician — you may need to adjust the approach.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Common mid-point patterns:</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Some people see dramatic improvement by week 8</li><li style="margin-bottom: 6px;">Others see steady, gradual improvement</li><li style="margin-bottom: 6px;">Some hit a plateau and need to push harder on upper hierarchy items</li><li style="margin-bottom: 6px;">Setbacks (temporary spikes) are normal, especially during stressful periods</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Whatever your pattern, the key is to keep going. The second half of the program focuses on consolidation, generalization, and relapse prevention.</p>`,
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Progress Reflection",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "Compare your life today to your life when you started this program. What has changed? What can you do now that OCD prevented before?",
            "What has been the hardest part of ERP so far? What kept you going?",
          ],
          spaceSizeHint: "large",
        },
      },
    ]
  );

  // ── Module 14: Managing Setbacks ───────────────────────────
  await createModule(
    prisma,
    program.id,
    13,
    {
      title: "Managing Setbacks",
      subtitle: "When OCD Fights Back",
      summary:
        "Learn how to handle OCD setbacks, lapses, and symptom spikes without losing your progress.",
      estimatedMinutes: 35,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "Setbacks Are Part of Recovery",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">At some point during recovery, OCD will spike again. You might do a compulsion you had stopped. You might avoid a situation you had been facing. A new obsession theme might appear.</p><p style="margin-bottom: 12px; line-height: 1.6;">This is normal. This is NOT a sign that ERP failed or that you are back to square one.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Lapse vs. relapse:</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">A <strong style="color: var(--steady-teal);">lapse</strong> is a brief return to OCD behavior — doing a compulsion, avoiding a trigger. It is a slip.</li><li style="margin-bottom: 6px;">A <strong style="color: var(--steady-teal);">relapse</strong> is a sustained return to the full OCD cycle over weeks or months.</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Lapses are normal and expected. Relapses are preventable — by catching lapses early and applying your ERP skills.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">What to do when you lapse:</h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Notice it without judgment.</strong> "I washed my hands after touching the doorknob. That was a compulsion." No need for self-criticism.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Do not compensate.</strong> Do not do extra exposures to "make up for it." Just resume your normal ERP practice.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Re-expose immediately.</strong> Go back and touch the doorknob again — this time without washing. Correct the lapse as soon as possible.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Identify what triggered the spike.</strong> Stress? Poor sleep? A life change? Knowing the trigger helps you prepare for next time.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Return to basics.</strong> Review your hierarchy. Do a few exposures. Resume response prevention in daily life.</li></ol><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Common lapse triggers:</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Major life stress (job change, relationship conflict, illness)</li><li style="margin-bottom: 6px;">Sleep deprivation</li><li style="margin-bottom: 6px;">Stopping ERP practice ("I'm better now, I don't need to keep doing this")</li><li style="margin-bottom: 6px;">A new OCD theme that catches you off guard</li><li style="margin-bottom: 6px;">Seasonal changes or hormonal shifts</li></ul>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Managing Setbacks",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Managing Setbacks",
          cards: [
            {
              title: "Lapse ≠ Relapse",
              body: "A single compulsion is a lapse, not a relapse. Do not catastrophize. Notice it, re-expose, and move on. One slip does not erase months of progress.",
              emoji: "📉",
            },
            {
              title: "Re-Expose Immediately",
              body: "After a lapse, go back to the trigger and face it again without the compulsion. The sooner you correct the lapse, the less power it has. Do not wait until tomorrow.",
              emoji: "⚡",
            },
            {
              title: "Stress Is a Trigger",
              body: "OCD spikes during stress because your emotional reserves are depleted. Expect it. Prepare for it. When life gets hard, double down on ERP practice, do not abandon it.",
              emoji: "📈",
            },
            {
              title: "Return to Basics",
              body: "When OCD flares up, return to the fundamentals: identify the obsession, resist the compulsion, stay with the anxiety. You know how to do this. Trust your training.",
              emoji: "🔙",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Setback Preparedness",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Write a personal setback plan: (1) Your top 3 early warning signs that OCD is flaring up, (2) Your top 3 lapse triggers (situations where OCD is most likely to spike), (3) Your action steps — what you will do immediately when you notice a lapse.",
            },
            {
              type: "ACTION",
              description:
                "Deliberately practice a few exposures from the lower-to-middle range of your hierarchy this week. Keeping these skills sharp is like maintaining a muscle.",
            },
            {
              type: "BRING_TO_SESSION",
              description:
                "Bring your written setback plan. We will review it together and make sure it covers the most likely scenarios.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "EVERY_OTHER_DAY",
        },
      },
    ]
  );

  // ── Module 15: Values-Based Living ─────────────────────────
  await createModule(
    prisma,
    program.id,
    14,
    {
      title: "Values-Based Living",
      subtitle: "Beyond OCD",
      summary:
        "Reconnect with your values and start building a life that is defined by what matters to you, not by what OCD says to avoid.",
      estimatedMinutes: 35,
    },
    [
      {
        type: "STYLED_CONTENT",
        title: "Living by Values, Not by OCD",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">OCD narrows your life. It tells you what to avoid, where not to go, what not to touch, what not to think. Over time, your world gets smaller. Even as ERP reduces your compulsions, there may be life areas you have been avoiding for so long that you have forgotten they exist.</p><p style="margin-bottom: 12px; line-height: 1.6;">This module is about expanding your life in the direction of your values.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Values are not goals.</strong> Goals are things you achieve ("get a promotion"). Values are ongoing directions you move toward ("be engaged and excellent in my work"). You never finish a value — you keep living it.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Common value areas:</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Relationships (partner, family, friends)</li><li style="margin-bottom: 6px;">Work/career</li><li style="margin-bottom: 6px;">Education/learning</li><li style="margin-bottom: 6px;">Health/physical wellbeing</li><li style="margin-bottom: 6px;">Recreation/fun</li><li style="margin-bottom: 6px;">Spirituality/meaning</li><li style="margin-bottom: 6px;">Community/service</li><li style="margin-bottom: 6px;">Creativity</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">How OCD interfered with your values:</strong>
For each value area, consider:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">What was I doing in this area before OCD took over?</li><li style="margin-bottom: 6px;">What am I avoiding because of OCD?</li><li style="margin-bottom: 6px;">What would I do differently if OCD had no say?</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Taking values-based action:</strong>
1. Choose 2-3 value areas that matter most to you right now.
2. For each, identify one specific action you can take this week that moves you toward that value.
3. The action should be something OCD would have stopped you from doing.
4. Do it as an exposure — approach it with willingness, tolerate any OCD-related discomfort, and stay engaged.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Values-Based Living",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Values-Based Living",
          cards: [
            {
              title: "Values Over Avoidance",
              body: "OCD says 'avoid this, skip that, do not go there.' Your values say 'this matters to me.' When they conflict, choose values. ERP is the tool that makes it possible.",
              emoji: "🧭",
            },
            {
              title: "Expand Your Life",
              body: "Recovery is not just about reducing OCD. It is about building a bigger, richer life. What have you been missing? What do you want to start doing again? Go toward it.",
              emoji: "🌍",
            },
            {
              title: "Willingness Is the Key",
              body: "Being willing to have discomfort in service of your values is the essence of recovery. You do not need to feel comfortable. You need to be willing. Willingness plus action equals freedom.",
              emoji: "🔑",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Values-Based Action",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Write down your top 3 values. For each, describe how OCD has interfered with living that value. Then write one specific action you will take this week that moves toward that value despite OCD.",
            },
            {
              type: "ACTION",
              description:
                "Take at least 2 of the values-based actions you identified. Treat them as exposures — approach with willingness, tolerate any OCD discomfort, and stay engaged in the activity.",
            },
            {
              type: "BRING_TO_SESSION",
              description:
                "Bring your values worksheet and notes on your values-based actions. We will discuss how it felt to do things that matter to you rather than things OCD demands.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "MAJORITY",
          reminderCadence: "EVERY_OTHER_DAY",
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Your Values and OCD",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "If OCD disappeared tomorrow, what would you do first? What does that tell you about your values?",
            "Describe the life you want to build going forward. Be specific about what your days, relationships, and activities would look like.",
          ],
          spaceSizeHint: "large",
        },
      },
    ]
  );

  // ── Module 16: Relapse Prevention & Graduation ────────────
  await createModule(
    prisma,
    program.id,
    15,
    {
      title: "Relapse Prevention & Graduation",
      subtitle: "Maintaining Your Freedom",
      summary:
        "Complete your final Y-BOCS, build a comprehensive relapse prevention plan, and graduate from the program.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "ASSESSMENT",
        title: "Y-BOCS Final",
        content: {
          type: "ASSESSMENT",
          title: "Yale-Brown Obsessive Compulsive Scale (Y-BOCS) — Final",
          instructions:
            "The following questions ask about your obsessive and compulsive symptoms. Rate each item for the past week.",
          scoringMethod: "SUM",
          questions: [
            { question: "How much of your time is occupied by obsessive thoughts?", type: "LIKERT", required: true, sortOrder: 0, likertMin: 0, likertMax: 4, likertMinLabel: "None", likertMaxLabel: "Extreme (more than 8 hrs/day or near-constant)" },
            { question: "How much do your obsessive thoughts interfere with your social or work functioning?", type: "LIKERT", required: true, sortOrder: 1, likertMin: 0, likertMax: 4, likertMinLabel: "No interference", likertMaxLabel: "Incapacitating" },
            { question: "How much distress do your obsessive thoughts cause you?", type: "LIKERT", required: true, sortOrder: 2, likertMin: 0, likertMax: 4, likertMinLabel: "None", likertMaxLabel: "Near-constant, disabling distress" },
            { question: "How much of an effort do you make to resist the obsessive thoughts?", type: "LIKERT", required: true, sortOrder: 3, likertMin: 0, likertMax: 4, likertMinLabel: "Always make an effort to resist", likertMaxLabel: "No effort to resist, completely yielding" },
            { question: "How much control do you have over your obsessive thoughts?", type: "LIKERT", required: true, sortOrder: 4, likertMin: 0, likertMax: 4, likertMinLabel: "Complete control", likertMaxLabel: "No control, rarely able to even momentarily divert thinking" },
            { question: "How much time do you spend performing compulsive behaviors?", type: "LIKERT", required: true, sortOrder: 5, likertMin: 0, likertMax: 4, likertMinLabel: "None", likertMaxLabel: "Extreme (more than 8 hrs/day or near-constant)" },
            { question: "How much do your compulsive behaviors interfere with your social or work functioning?", type: "LIKERT", required: true, sortOrder: 6, likertMin: 0, likertMax: 4, likertMinLabel: "No interference", likertMaxLabel: "Incapacitating" },
            { question: "How anxious would you become if prevented from performing your compulsive behaviors?", type: "LIKERT", required: true, sortOrder: 7, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all anxious", likertMaxLabel: "Extreme, incapacitating anxiety" },
            { question: "How much of an effort do you make to resist the compulsions?", type: "LIKERT", required: true, sortOrder: 8, likertMin: 0, likertMax: 4, likertMinLabel: "Always make an effort to resist", likertMaxLabel: "No effort to resist, completely yielding" },
            { question: "How much control do you have over your compulsive behaviors?", type: "LIKERT", required: true, sortOrder: 9, likertMin: 0, likertMax: 4, likertMinLabel: "Complete control", likertMaxLabel: "No control, rarely able to even momentarily delay compulsion" },
          ],
        },
      },
      {
        type: "STYLED_CONTENT",
        title: "Your Relapse Prevention Plan",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">You have completed 16 weeks of ERP. You have faced fears you thought were impossible. You have proven to yourself that anxiety always comes down, that intrusive thoughts are just thoughts, and that you can live a full life without compulsions.</p><p style="margin-bottom: 12px; line-height: 1.6;">But OCD can come back — especially during stress. A solid relapse prevention plan keeps your gains intact.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">Your plan should include:</h3><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">1. Early Warning Signs</strong>
What are YOUR signs that OCD is creeping back? Examples:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Spending more time on compulsions</li><li style="margin-bottom: 6px;">Avoiding situations you had mastered</li><li style="margin-bottom: 6px;">Checking "just once" (the gateway compulsion)</li><li style="margin-bottom: 6px;">New intrusive thoughts that feel different but have the same OCD pattern</li><li style="margin-bottom: 6px;">Reassurance seeking increasing</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">2. High-Risk Situations</strong>
When is OCD most likely to spike? Major stress, sleep deprivation, illness, life transitions, holidays, relationship conflict.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">3. Immediate Action Steps</strong>
What will you do at the first sign of a spike?</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Resume daily response prevention</li><li style="margin-bottom: 6px;">Do 2-3 exposures from your hierarchy</li><li style="margin-bottom: 6px;">Review your strategy cards</li><li style="margin-bottom: 6px;">Contact your clinician</li><li style="margin-bottom: 6px;">Do NOT start doing compulsions "just until the stress passes"</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">4. Ongoing Maintenance</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Do at least one exposure per week, even when you feel fine</li><li style="margin-bottom: 6px;">Continue your daily tracker</li><li style="margin-bottom: 6px;">Practice tolerating uncertainty in everyday life</li><li style="margin-bottom: 6px;">Keep expanding your life in values-based directions</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">5. Support System</strong>
Who will you reach out to? Write names and contact methods.</p><p style="margin-bottom: 12px; line-height: 1.6;">OCD management is a long-term practice, not a one-time fix. The skills you have learned will serve you for the rest of your life — as long as you keep using them.</p>`,
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Relapse Prevention",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "OCD Relapse Prevention",
          cards: [
            {
              title: "Weekly Maintenance Exposures",
              body: "Do at least one exposure per week even when you feel good. This keeps your skills sharp and prevents OCD from quietly regaining territory. Think of it as a booster shot.",
              emoji: "💉",
            },
            {
              title: "Catch It Early",
              body: "The earlier you notice OCD creeping back, the easier it is to stop. 'Just this once' checking becomes daily checking fast. Intervene at the first warning sign, not the fifth.",
              emoji: "🚨",
            },
            {
              title: "Stress = Vulnerability",
              body: "OCD spikes during stress because your emotional resources are depleted. When a big stressor hits, increase your ERP practice rather than decreasing it. More practice, not less.",
              emoji: "⚡",
            },
            {
              title: "You Have the Tools",
              body: "You have completed a full ERP program. You know how to build hierarchies, conduct exposures, resist compulsions, and manage setbacks. These skills are yours for life. Use them.",
              emoji: "🧰",
            },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Relapse Prevention Plan",
        content: {
          type: "HOMEWORK",
          items: [
            {
              type: "ACTION",
              description:
                "Write your comprehensive relapse prevention plan with all 5 sections: (1) Your top 5 early warning signs, (2) Your high-risk situations, (3) Immediate action steps, (4) Ongoing maintenance routine, (5) Support system with names and contacts.",
            },
            {
              type: "BRING_TO_SESSION",
              description:
                "Bring your written relapse prevention plan and final Y-BOCS scores. We will finalize the plan together and discuss next steps for long-term maintenance.",
            },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "EVERY_OTHER_DAY",
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Reflecting on Your ERP Journey",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "Look back at what you wrote in Module 1 about what OCD had taken from you. How has that changed over these 16 weeks?",
            "What is the most important thing you have learned about yourself through ERP?",
            "Write a letter to your future self for a day when OCD is trying to make a comeback. What do you want to remind yourself of?",
          ],
          spaceSizeHint: "large",
        },
      },
    ]
  );

  // ── Daily Tracker for ERP OCD ──────────────────────────────
  await prisma.dailyTracker.create({
    data: {
      programId: program.id,
      createdById: clinicianId,
      name: "OCD Daily Symptom Tracker",
      description:
        "Track your OCD symptoms, compulsion time, exposure practice, and anxiety levels daily.",
      fields: {
        create: [
          {
            label: "Highest OCD-related anxiety today (0-10)",
            fieldType: "SCALE",
            sortOrder: 0,
            isRequired: true,
            options: { min: 0, max: 10, minLabel: "None", maxLabel: "Extreme" },
          },
          {
            label: "Time spent on compulsions today (minutes)",
            fieldType: "NUMBER",
            sortOrder: 1,
            isRequired: true,
            options: { min: 0, max: 1440, unit: "minutes" },
          },
          {
            label: "Did you do a formal exposure today?",
            fieldType: "YES_NO",
            sortOrder: 2,
            isRequired: true,
          },
          {
            label: "Number of compulsions resisted today",
            fieldType: "NUMBER",
            sortOrder: 3,
            isRequired: false,
            options: { min: 0, max: 200 },
          },
          {
            label: "Number of compulsions completed today",
            fieldType: "NUMBER",
            sortOrder: 4,
            isRequired: false,
            options: { min: 0, max: 200 },
          },
          {
            label: "OCD themes active today",
            fieldType: "MULTI_CHECK",
            sortOrder: 5,
            isRequired: false,
            options: {
              choices: [
                "Contamination",
                "Checking",
                "Harm/violence",
                "Symmetry/ordering",
                "Sexual/religious",
                "Perfectionism",
                "Health anxiety",
                "Relationship OCD",
                "Other",
              ],
            },
          },
          {
            label: "Avoidance level today",
            fieldType: "SCALE",
            sortOrder: 6,
            isRequired: true,
            options: {
              min: 0,
              max: 10,
              minLabel: "No avoidance",
              maxLabel: "Avoided many situations",
            },
          },
          {
            label: "Notes on today's exposures or challenges",
            fieldType: "FREE_TEXT",
            sortOrder: 7,
            isRequired: false,
          },
        ],
      },
    },
  });

  return program;
}
