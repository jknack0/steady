// ============================================================================
// Templates 7-8: Behavioral Activation for Depression, MBSR
// ============================================================================

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
async function createModuleWithParts(
  prisma: any,
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


// ============================================================================
// TEMPLATE 7 — Behavioral Activation (BA) for Depression — 10 Modules
// ============================================================================
export async function seedTemplate7_BehavioralActivation(prisma: any, clinicianId: string) {
  const program = await prisma.program.create({
    data: {
      clinicianId,
      title: "Behavioral Activation for Depression",
      description:
        "A 10-week evidence-based program that treats depression by helping you re-engage with meaningful, valued activities. Behavioral Activation works from the outside in — by changing what you do, you change how you feel. Targets PHQ-9 reduction and BADS improvement.",
      category: "Depression",
      durationWeeks: 10,
      cadence: "WEEKLY",
      sessionType: "ONE_ON_ONE",
      isTemplate: true,
      status: "PUBLISHED",
    },
  });

  // ── Module 1: Understanding Depression & Behavioral Activation ──────────
  await createModuleWithParts(
    prisma,
    program.id,
    0,
    {
      title: "Understanding Depression & Behavioral Activation",
      subtitle: "Session 1",
      summary: "Learn how depression creates a withdrawal cycle and how changing your behavior can break it.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "How Depression Works",
        content: {
          type: "TEXT",
          body: "Depression is one of the most common mental health conditions in the world. If you are living with depression, you are not alone, and it is not your fault.\n\n**The Depression Withdrawal Cycle**\nWhen you feel depressed, your energy drops. Things that used to feel enjoyable start to feel pointless or exhausting. So you do less. You might stop seeing friends, skip hobbies, call in sick to work, or spend more time in bed. This is completely understandable — your body and mind are telling you to conserve energy.\n\nBut here is the problem: the less you do, the worse you feel. When you withdraw from activities, you lose the things that used to give you pleasure, accomplishment, and connection. Without those positive experiences, your mood drops even further. Then you withdraw even more. This creates a downward spiral.\n\nIt looks like this:\n\n1. You feel low → you do less\n2. Doing less → fewer positive experiences\n3. Fewer positive experiences → mood drops further\n4. Mood drops → you do even less\n5. The cycle continues\n\n**The Behavior-First Approach**\nMost people think they need to feel better before they can start doing things again. They wait for motivation to show up. But research shows that motivation rarely comes first. Instead, action comes first, and motivation follows.\n\nBehavioral Activation (BA) flips the usual approach. Instead of waiting to feel better, you start doing things — even when you do not feel like it — and your mood improves as a result. This is not about positive thinking or pushing through with willpower. It is about making small, strategic choices to re-engage with life in ways that matter to you.\n\n**What to Expect in This Program**\nOver the next 10 weeks, you will:\n- Track your daily activities and moods to find patterns\n- Identify your core values — what truly matters to you\n- Schedule activities that bring pleasure and a sense of accomplishment\n- Learn to break overwhelming tasks into small, doable steps\n- Recognize and reverse avoidance patterns\n- Build a social support system\n- Manage rumination (repetitive negative thinking)\n- Create a long-term plan to maintain your gains\n\nThis program is based on decades of research. Behavioral Activation is as effective as antidepressant medication for many people with depression, and the skills you learn here will last a lifetime.",
        },
      },
      {
        type: "ASSESSMENT",
        title: "PHQ-9 Baseline Assessment",
        content: {
          type: "ASSESSMENT",
          title: "PHQ-9 (Patient Health Questionnaire-9)",
          instructions:
            "Over the last 2 weeks, how often have you been bothered by any of the following problems? Select the answer that best describes your experience.",
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
            { question: "Thoughts that you would be better off dead, or of hurting yourself in some way", type: "LIKERT", required: true, sortOrder: 8, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 1 Homework: Activity Monitoring",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "For each day this week, write down every activity you do and the time you do it. Include everything — eating, watching TV, lying in bed, walking to the mailbox, showering. No activity is too small.", isRecurring: true, sortOrder: 0 },
            { type: "ACTION", description: "Next to each activity, rate your mood from 0 (worst) to 10 (best) during that activity.", isRecurring: true, sortOrder: 1 },
            { type: "BRING_TO_SESSION", description: "Bring your completed activity log to the next session so we can look for patterns together.", sortOrder: 2 },
          ],
        },
      },
    ]
  );

  // ── Module 2: Activity Monitoring ───────────────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    1,
    {
      title: "Activity Monitoring",
      subtitle: "Session 2",
      summary: "Review your activity log and discover the connection between what you do and how you feel.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Tracking Patterns Between Activity and Mood",
        content: {
          type: "TEXT",
          body: "Last week, you tracked your activities and your mood. Now it is time to look at what the data tells you.\n\n**Why Tracking Matters**\nWhen you are depressed, it can feel like your mood is random — like sadness just hits you for no reason. But when you look at your activity log carefully, you will almost always find patterns. Certain activities tend to lift your mood (even slightly), and certain situations tend to make it worse.\n\n**Two Types of Rewarding Activities**\nResearch shows that two kinds of activities are especially important for mood:\n\n1. **Pleasure activities** — Things you enjoy. They make you feel good in the moment. Examples: listening to music, petting your dog, eating a favorite food, watching a funny show, taking a warm bath.\n\n2. **Mastery activities** — Things that give you a sense of accomplishment. They may not feel fun, but you feel better about yourself afterward. Examples: doing the dishes, finishing a work task, exercising, paying a bill, cooking a meal.\n\nMost people with depression have lost both types of activities. Their days are filled with things that are neither enjoyable nor meaningful — scrolling social media, lying in bed, staring at the TV without watching.\n\n**How to Read Your Activity Log**\nLook through your log and ask:\n- Which activities gave me the highest mood ratings?\n- Which gave me the lowest?\n- Are there times of day when I consistently feel better or worse?\n- How much of my day is spent on activities that are neither pleasurable nor accomplishment-based?\n- Am I spending a lot of time in bed or alone?\n\n**Rating Pleasure and Mastery**\nThis week, you will add two new ratings to your activity tracking:\n- **Pleasure (P)**: Rate from 0 to 10 how enjoyable the activity was\n- **Mastery (M)**: Rate from 0 to 10 how much accomplishment you felt\n\nSome activities will be high in both. Some will be high in one but not the other. Both types are valuable. The goal is to fill your week with more activities that score at least a 3 or 4 on either scale.",
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 2 Homework: Pleasure & Mastery Tracking",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Continue logging every activity each day. For each activity, add a Pleasure rating (P: 0-10) and a Mastery rating (M: 0-10) alongside your mood rating.", isRecurring: true, sortOrder: 0 },
            { type: "ACTION", description: "At the end of each day, circle the three activities that had the highest combined P + M scores.", isRecurring: true, sortOrder: 1 },
            { type: "BRING_TO_SESSION", description: "Bring your completed log with pleasure and mastery ratings to the next session.", sortOrder: 2 },
          ],
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Reflecting on Patterns",
        content: {
          type: "JOURNAL_PROMPT",
          prompt: "Look at your activity log from last week. What patterns do you notice? Are there activities where your mood was higher than you expected? Times of day that are consistently hard? Activities you used to enjoy but have stopped doing? Write about what you see.",
        },
      },
    ]
  );

  // ── Module 3: Values Identification ─────────────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    2,
    {
      title: "Values Identification",
      subtitle: "Session 3",
      summary: "Identify your core values and use them as a compass for choosing activities.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Values as Your Compass",
        content: {
          type: "TEXT",
          body: "When you are depressed, it is hard to know what to do. Everything feels pointless. That is why you need a compass — something to guide your choices even when motivation is low.\n\nYour values are that compass.\n\n**What Are Values?**\nValues are the things that matter most to you in life. They are not goals you achieve and check off. They are directions you move toward, like a compass pointing north. You never arrive at north, but it always tells you which way to walk.\n\nFor example:\n- A goal is \"run a 5K.\" A value is \"taking care of my body.\"\n- A goal is \"call my sister.\" A value is \"being close to family.\"\n- A goal is \"finish my report.\" A value is \"doing meaningful work.\"\n\n**Life Domains**\nValues show up across different areas of life. Here are the main domains to consider:\n\n1. **Relationships** — family, friends, romantic partners. How do you want to show up for the people you care about?\n2. **Work / Education** — career, school, professional development. What kind of worker or student do you want to be?\n3. **Health / Physical well-being** — exercise, nutrition, sleep, medical care. How do you want to treat your body?\n4. **Leisure / Recreation** — hobbies, fun, play, creativity. What brings you joy?\n5. **Spirituality / Inner life** — religion, meditation, philosophy, personal growth. What gives your life meaning?\n6. **Community / Citizenship** — volunteering, activism, being a good neighbor. How do you want to contribute to the world around you?\n\n**Why Values Matter for Depression**\nDepression narrows your world. It tells you nothing matters. But when you reconnect with your values, you remember what does matter — even if it does not feel that way right now. Acting on your values, even in small ways, builds a life worth living. And that is the strongest antidote to depression.\n\n**Values Are Not Shoulds**\nThis is important: your values are yours. They are not what your parents want for you, what society expects, or what you think you should care about. If you value creativity more than career advancement, that is valid. If you value solitude more than socializing, that is valid too. Be honest with yourself about what truly matters to you.",
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 3 Homework: Values Exploration",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Review the six life domains (Relationships, Work/Education, Health, Leisure, Spirituality, Community). For each one, write 1-2 sentences about what matters to you in that area.", sortOrder: 0 },
            { type: "ACTION", description: "Rank your top 5 values across all domains. Which ones feel most important to your life right now?", sortOrder: 1 },
            { type: "ACTION", description: "For each of your top 5 values, rate how well your current daily activities align with that value on a scale of 1 (not at all) to 10 (fully aligned).", sortOrder: 2 },
            { type: "JOURNAL_PROMPT", description: "Write about one value that feels especially neglected right now. What would it look like to take even one small step toward it this week?", sortOrder: 3 },
          ],
        },
      },
    ]
  );

  // ── Module 4: Activity Scheduling ───────────────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    3,
    {
      title: "Activity Scheduling",
      subtitle: "Session 4",
      summary: "Learn to schedule pleasure and mastery activities that align with your values.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Scheduling Activities on Purpose",
        content: {
          type: "TEXT",
          body: "Now that you know your values and have been tracking your activities, it is time to take the most important step in Behavioral Activation: scheduling activities on purpose.\n\n**Why Scheduling Matters**\nWhen you are depressed, you probably wait to feel like doing something before you do it. The problem is that depression takes away your motivation, so you end up waiting forever. The motivation never comes, so you never act, and the cycle continues.\n\nScheduling breaks this cycle. When an activity is on your calendar, you do not wait for motivation — you treat it like an appointment. You would not skip a doctor's appointment because you did not feel like going. Treat your scheduled activities the same way.\n\n**What to Schedule**\nAim for a mix of:\n- **Pleasure activities**: Things that bring enjoyment, even small ones\n- **Mastery activities**: Things that give you a sense of accomplishment\n- **Values-aligned activities**: Things that connect to your top values\n\nThe best activities hit two or all three of these categories. For example, cooking a healthy meal could be pleasurable (you enjoy cooking), provide mastery (you completed a task), and align with your health value.\n\n**How Many Activities?**\nStart with just two planned activities per day — one in the morning or afternoon and one in the evening. As you build momentum, you can add more. Do not try to overhaul your entire schedule at once. That is a recipe for giving up.\n\n**What If I Do Not Feel Like It?**\nYou will not feel like it. That is expected. Do the activity anyway. Remember: mood follows action, not the other way around. Most people report that once they start the activity, it feels better than they expected. Not always great — but better than doing nothing.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Activity Scheduling Strategies",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "📅", title: "Schedule It or It Won't Happen", body: "If it is not on your calendar, it will not get done. Depression steals motivation, so do not rely on feeling like it. Write it down, set a time, and treat it like a non-negotiable appointment." },
            { emoji: "🐣", title: "Start Small — 5 Minutes Counts", body: "You do not have to run a marathon. A 5-minute walk counts. Washing three dishes counts. Sending one text counts. The hardest part is starting. Once you start, you can always keep going — but even 5 minutes is a win." },
            { emoji: "🔄", title: "Mood Follows Action", body: "Do not wait until you feel motivated to do something. Motivation comes after you start, not before. Act first, and your mood will catch up. Research proves this again and again." },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 4 Homework: Schedule Activities",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Schedule 2 activities per day for the coming week. At least one should be a pleasure activity and one a mastery activity. Choose activities that align with your top values.", sortOrder: 0 },
            { type: "ACTION", description: "Write each activity in your calendar or planner with a specific day and time.", sortOrder: 1 },
            { type: "ACTION", description: "After completing each scheduled activity, rate your mood before (predicted) and after (actual). Notice the difference.", isRecurring: true, sortOrder: 2 },
            { type: "BRING_TO_SESSION", description: "Bring your completed activity schedule with before/after mood ratings to the next session.", sortOrder: 3 },
          ],
        },
      },
    ]
  );

  // ── Module 5: Graded Task Assignment ────────────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    4,
    {
      title: "Graded Task Assignment",
      subtitle: "Session 5",
      summary: "Break overwhelming tasks into tiny, doable steps to overcome avoidance.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Breaking Big Tasks into Small Steps",
        content: {
          type: "TEXT",
          body: "When you are depressed, even simple tasks can feel overwhelming. Doing the laundry can feel like climbing a mountain. Answering an email can feel impossible. Your brain sees the whole task at once and shuts down.\n\nThis is called task paralysis, and it is one of the most common and frustrating parts of depression.\n\n**Graded Task Assignment**\nThe solution is not to push harder or try to power through. Instead, you break the task into the smallest possible steps — so small that each one feels almost too easy.\n\nHere is an example. Let us say you need to clean your kitchen, but the thought of it feels overwhelming:\n\n1. Stand up and walk to the kitchen (that is step 1 — just get there)\n2. Pick up one item from the counter and put it where it belongs\n3. Throw away one piece of trash\n4. Put one dish in the sink\n5. Rinse one dish\n6. Wipe one section of the counter\n\nNotice that \"clean the kitchen\" has been broken into six tiny steps. You only need to do step 1. If you stop there, that is fine — you still took action. But most people find that once they start, they keep going.\n\n**The Key Principles**\n- **Make each step so small it feels almost silly.** If a step feels hard, break it down further.\n- **Give yourself permission to stop after any step.** This removes the pressure.\n- **Celebrate completing each step.** Every step forward counts, no matter how small.\n- **Do not judge yourself for needing to break things down.** This is a strategy used by astronauts, athletes, and CEOs — not just people with depression.\n\n**Why This Works**\nDepression makes your brain overestimate how hard things will be and underestimate your ability to handle them. By breaking tasks into tiny steps, you prove to your brain — one step at a time — that you can do hard things. Each completed step builds momentum and confidence.",
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 5 Homework: Graded Task Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Pick one task you have been avoiding. It could be anything — cleaning, a phone call, paperwork, an errand. Write it down.", sortOrder: 0 },
            { type: "ACTION", description: "Break that task into at least 5 small steps. Make each step so small it feels easy.", sortOrder: 1 },
            { type: "ACTION", description: "This week, do step 1. If you feel like continuing, do step 2. Stop whenever you need to. Come back to the next step tomorrow.", sortOrder: 2 },
            { type: "BRING_TO_SESSION", description: "Bring your task breakdown and notes on how far you got to the next session.", sortOrder: 3 },
          ],
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Exploring Avoidance",
        content: {
          type: "JOURNAL_PROMPT",
          prompt: "Think about the tasks you have been avoiding the most. What is the feeling that comes up when you think about doing them? Is it fear, guilt, exhaustion, or something else? Write about one avoided task and what makes it feel so hard. Then try breaking it into the smallest possible first step.",
        },
      },
    ]
  );

  // ── Module 6: Managing Avoidance (TRAP vs TRAC) ────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    5,
    {
      title: "Managing Avoidance — TRAP vs TRAC",
      subtitle: "Session 6",
      summary: "Recognize avoidance patterns and learn to replace them with alternative coping.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Understanding TRAP and TRAC",
        content: {
          type: "TEXT",
          body: "By now, you have probably noticed that avoidance is a major driver of depression. When something feels hard, scary, or unpleasant, your instinct is to avoid it. And in the short term, avoidance works — you feel relief. But in the long term, avoidance makes everything worse.\n\nToday you will learn a powerful framework for understanding and breaking avoidance patterns: TRAP vs TRAC.\n\n**TRAP: The Avoidance Pattern**\nTRAP stands for:\n- **T — Trigger**: Something happens (an event, a thought, a feeling)\n- **R — Response**: You have an emotional reaction (sadness, anxiety, fatigue, dread)\n- **AP — Avoidance Pattern**: You avoid the situation, withdraw, or do something unhelpful\n\nHere is an example:\n- **Trigger**: Your friend invites you to dinner\n- **Response**: You feel anxious and tired. You think \"I will not be good company.\"\n- **Avoidance Pattern**: You cancel, stay home, watch TV alone, feel worse\n\nThe avoidance feels like the right choice in the moment. But it keeps the depression going.\n\n**TRAC: The Alternative**\nTRAC stands for:\n- **T — Trigger**: Same trigger\n- **R — Response**: Same emotional reaction (you cannot control this)\n- **AC — Alternative Coping**: Instead of avoiding, you do something different — something that moves you toward your values\n\nUsing the same example:\n- **Trigger**: Your friend invites you to dinner\n- **Response**: You feel anxious and tired. You think \"I will not be good company.\"\n- **Alternative Coping**: You go anyway, even for 30 minutes. Or you suggest a shorter activity like coffee instead of dinner. You take action aligned with your value of friendship.\n\n**The Key Insight**\nYou cannot control the trigger or your initial emotional response. Those happen automatically. But you can control what you do next. TRAP keeps you stuck. TRAC moves you forward.\n\n**Common Avoidance Patterns to Watch For**\n- Canceling plans\n- Staying in bed past your alarm\n- Scrolling your phone to numb out\n- Saying \"I will do it tomorrow\" (repeatedly)\n- Using alcohol or food to cope\n- Keeping busy with unimportant things to avoid important ones",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "TRAP vs TRAC Cards",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "🪤", title: "TRAP — Recognize the Pattern", body: "Trigger → Response → Avoidance Pattern. When you notice yourself avoiding, pause and name it: 'I am in a TRAP right now.' Awareness is the first step to change." },
            { emoji: "🛤️", title: "TRAC — Choose a Different Path", body: "Trigger → Response → Alternative Coping. You cannot stop the trigger or the emotion. But you can choose a different action. Ask yourself: 'What would I do right now if I were not depressed?'" },
            { emoji: "⚖️", title: "Short-Term Relief vs Long-Term Cost", body: "Avoidance feels good now but costs you later. Alternative coping feels hard now but pays off later. Which would your future self thank you for?" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 6 Homework: TRAP to TRAC",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "This week, identify 3 situations where you fall into a TRAP (Trigger → Response → Avoidance Pattern). Write down each TRAP in detail.", sortOrder: 0 },
            { type: "ACTION", description: "For each TRAP, write out a TRAC — what Alternative Coping could you use instead of the avoidance pattern?", sortOrder: 1 },
            { type: "ACTION", description: "Try to convert at least one TRAP into a TRAC this week. Do the alternative coping even if it feels hard.", sortOrder: 2 },
            { type: "BRING_TO_SESSION", description: "Bring your 3 TRAP/TRAC worksheets to the next session.", sortOrder: 3 },
          ],
        },
      },
    ]
  );

  // ── Module 7: Social Activation ─────────────────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    6,
    {
      title: "Social Activation",
      subtitle: "Session 7",
      summary: "Understand the link between isolation and depression and begin rebuilding social connection.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Breaking the Isolation Cycle",
        content: {
          type: "TEXT",
          body: "Humans are social animals. We need connection with others to thrive. But depression makes you pull away from people. You might feel like you are a burden, that no one wants to hear from you, or that being around others takes too much energy.\n\nThis isolation is one of the most harmful parts of depression, because social connection is one of the strongest protectors of mental health.\n\n**How Isolation Feeds Depression**\nWhen you isolate:\n- You lose access to people who care about you and could support you\n- You spend more time alone with negative thoughts and rumination\n- You lose the mood boost that comes from laughing, talking, and being seen\n- You stop getting the reality checks that others provide (\"No, you are not a burden\")\n- Your world shrinks, which confirms the depression's message that nothing matters\n\n**Why Social Activation Is Hard**\nSocial avoidance often comes from thoughts like:\n- \"I will bring everyone down.\"\n- \"No one really wants to see me.\"\n- \"I do not have the energy to be social.\"\n- \"I have nothing interesting to say.\"\n- \"They are better off without me.\"\n\nThese thoughts feel absolutely true when you are depressed. But they are symptoms of depression, not facts. Depression distorts how you see yourself and how you think others see you.\n\n**Starting Small**\nYou do not need to throw a party or join a club. Social activation can be tiny:\n- Sending a text that says \"Hey, thinking of you\"\n- Saying hi to a neighbor\n- Calling a family member for 5 minutes\n- Sitting in a coffee shop (being around people counts)\n- Accepting one invitation this week, even if you go for only 20 minutes\n\n**The 20-Minute Rule**\nGive yourself permission to leave any social situation after 20 minutes. This makes it easier to show up in the first place. Most of the time, once you are there, you will stay longer. But knowing you can leave takes the pressure off.",
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 7 Homework: Social Reconnection",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Schedule one social activity this week. It can be brief — a 10-minute phone call, a short walk with someone, or coffee with a friend. Put it on your calendar with a specific day and time.", sortOrder: 0 },
            { type: "ACTION", description: "Rate your mood before and after the social activity. Note whether the experience was better, worse, or about the same as you expected.", sortOrder: 1 },
            { type: "ACTION", description: "If the scheduled activity feels too big, use graded task assignment: break it into smaller steps (e.g., step 1: send the text, step 2: agree on a time, step 3: show up).", sortOrder: 2 },
          ],
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Reflecting on Social Avoidance",
        content: {
          type: "JOURNAL_PROMPT",
          prompt: "Think about the last time you turned down a social invitation or avoided reaching out to someone. What thoughts went through your mind? What emotions did you feel? Looking back, do you think those thoughts were fully accurate, or was depression coloring your perception? What might you do differently next time?",
        },
      },
    ]
  );

  // ── Module 8: Rumination Management ─────────────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    7,
    {
      title: "Rumination Management",
      subtitle: "Session 8",
      summary: "Learn to distinguish rumination from problem-solving and use activity to break rumination cycles.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Rumination vs Problem-Solving",
        content: {
          type: "TEXT",
          body: "If you have depression, you probably spend a lot of time thinking. Not productive thinking — the kind that goes in circles. You replay the past, analyze what went wrong, and ask yourself \"why\" questions that have no answers. This is called rumination.\n\n**What Is Rumination?**\nRumination is repetitive, passive thinking about your problems, your feelings, and their causes. It feels like thinking, but it is not productive. It does not lead to solutions. It just makes you feel worse.\n\nExamples of rumination:\n- \"Why am I like this?\"\n- \"What is wrong with me?\"\n- \"Why can I not just be normal?\"\n- Replaying a conversation and thinking about what you should have said\n- Going over all the reasons your life is not where you want it to be\n- Comparing yourself to others and feeling like a failure\n\n**Rumination vs Problem-Solving**\nRumination and problem-solving can look similar on the surface. Both involve thinking about a problem. But there are important differences:\n\n**Problem-solving:**\n- Focuses on specific, solvable problems\n- Generates possible solutions\n- Leads to a plan of action\n- Has a clear stopping point\n- You feel slightly better afterward\n\n**Rumination:**\n- Focuses on feelings and abstract questions (\"Why me?\")\n- Goes in circles without generating solutions\n- Does not lead to action\n- Has no stopping point — it can go on for hours\n- You feel worse afterward\n\n**The Rumination Test**\nAsk yourself: \"Have I had this exact thought before? Did thinking about it last time lead to a solution?\" If the answer is yes and no, you are ruminating.\n\n**Activity as the Antidote**\nHere is what research shows: the best way to stop rumination is not to try harder to solve the problem in your head. It is to do something. Anything. Get up, move your body, call someone, do a task. Activity interrupts the rumination cycle because it shifts your attention from your internal world to the external world.\n\nThis is why Behavioral Activation is so powerful for depression — it directly targets rumination by replacing passive thinking with active doing.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Rumination Management Strategies",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "🔁", title: "Is This Problem-Solving or Ruminating?", body: "Ask yourself: Am I moving toward a solution, or am I going in circles? If you have been thinking about the same thing for more than 10 minutes without a new idea, you are ruminating. Time to switch to action." },
            { emoji: "🏃", title: "Activity as Antidote to Rumination", body: "When you catch yourself ruminating, do not try to think your way out of it. Get up and do something — anything from your activity schedule. Movement and engagement break the cycle faster than thinking ever will." },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 8 Homework: Interrupting Rumination",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "This week, when you catch yourself ruminating, immediately switch to a scheduled activity from your activity menu. Track how many times you successfully interrupted rumination.", isRecurring: true, sortOrder: 0 },
            { type: "ACTION", description: "Set 3 phone alarms at random times each day. When the alarm goes off, check: Am I ruminating right now? If yes, get up and do something for at least 5 minutes.", sortOrder: 1 },
            { type: "JOURNAL_PROMPT", description: "At the end of the week, write about what you noticed. Was rumination happening more than you realized? Were you able to interrupt it? What activities were most effective at breaking the cycle?", sortOrder: 2 },
          ],
        },
      },
    ]
  );

  // ── Module 9: Consolidation & Mid-Assessment ────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    8,
    {
      title: "Consolidation & Mid-Assessment",
      subtitle: "Session 9",
      summary: "Review your progress, complete a mid-treatment assessment, and build your personal activity menu.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Checking In on Your Progress",
        content: {
          type: "TEXT",
          body: "You are nine weeks into this program. That is a real accomplishment. Let us take a step back and look at how far you have come.\n\n**What You Have Learned So Far**\n- How the depression withdrawal cycle works and how to break it\n- How to monitor your activities and spot patterns\n- Your core values and how to use them as a compass\n- How to schedule pleasure and mastery activities\n- How to break overwhelming tasks into tiny steps\n- How to recognize TRAPs and convert them to TRACs\n- How to rebuild social connections\n- How to interrupt rumination with action\n\n**Building Your Personal Activity Menu**\nBy now, you have tried many different activities. Some worked well. Some did not. That is completely normal. What matters is that you now have data about what helps you.\n\nYour Personal Activity Menu is a go-to list of activities you can turn to when your mood drops. Think of it like a menu at a restaurant — when you are hungry, you do not want to figure out what to cook from scratch. You want to pick from a list of options.\n\nYour menu should include:\n- 3-5 activities that boost your mood quickly (pleasure activities)\n- 3-5 activities that give you a sense of accomplishment (mastery activities)\n- 2-3 social activities you can do even when you feel like isolating\n- 2-3 activities that work well for interrupting rumination\n\nWrite this list on a card or in your phone. When you are feeling low, do not ask yourself \"What should I do?\" — just pull out your menu and pick something.",
        },
      },
      {
        type: "ASSESSMENT",
        title: "PHQ-9 Mid-Treatment Assessment",
        content: {
          type: "ASSESSMENT",
          title: "PHQ-9 (Patient Health Questionnaire-9) — Mid-Treatment",
          instructions:
            "Over the last 2 weeks, how often have you been bothered by any of the following problems? Select the answer that best describes your experience.",
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
            { question: "Thoughts that you would be better off dead, or of hurting yourself in some way", type: "LIKERT", required: true, sortOrder: 8, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 9 Homework: Build Your Activity Menu",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Create your Personal Activity Menu. List 3-5 pleasure activities, 3-5 mastery activities, 2-3 social activities, and 2-3 rumination-busting activities that have worked for you.", sortOrder: 0 },
            { type: "ACTION", description: "Write the menu on a card you can keep in your wallet or save it as a note on your phone. You should be able to access it instantly when your mood dips.", sortOrder: 1 },
            { type: "ACTION", description: "Use your activity menu at least once this week when you notice your mood dropping. Note which activity you chose and how it helped.", sortOrder: 2 },
          ],
        },
      },
    ]
  );

  // ── Module 10: Maintenance & Relapse Prevention ─────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    9,
    {
      title: "Maintenance & Relapse Prevention",
      subtitle: "Session 10",
      summary: "Create a long-term maintenance plan with early warning signs, activity schedules, and support contacts.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Maintaining Your Gains",
        content: {
          type: "TEXT",
          body: "Congratulations. You have completed the Behavioral Activation program. Over the past 10 weeks, you have built real skills for managing depression. But the work does not stop here. Depression can come back, especially during stressful times. Having a maintenance plan makes the difference between a brief dip and a full relapse.\n\n**Understanding Setbacks vs Relapse**\nA setback is a temporary return of some depressive symptoms. Everyone has bad days or bad weeks. A setback does not mean you have failed or that the treatment did not work. It is a normal part of life.\n\nA relapse is a full return to the depressive episode — weeks or months of withdrawal, low mood, and inactivity. The goal of a maintenance plan is to catch setbacks early and prevent them from becoming relapses.\n\n**Early Warning Signs**\nYour early warning signs are the first things that change when depression starts creeping back. They are different for everyone. Common ones include:\n- Skipping activities you had been doing regularly\n- Spending more time in bed\n- Canceling plans with friends or family\n- Increased rumination\n- Losing interest in things you had been enjoying\n- Feeling more tired than usual\n- Neglecting self-care (showering, eating well, exercising)\n\nKnowing your personal warning signs is crucial. When you spot them early, you can take action before things spiral.\n\n**Your Maintenance Plan**\nA good maintenance plan includes:\n1. **Your personal early warning signs** — the first 3-5 things that change when depression starts returning\n2. **Your activity schedule** — the daily and weekly activities that keep your mood stable\n3. **Your activity menu** — go-to activities for when your mood drops\n4. **Your support contacts** — people you can reach out to when you need help\n5. **Your TRAC strategies** — how you will respond to avoidance urges\n6. **When to seek help** — specific signs that tell you to contact your therapist or doctor\n\n**Keep Going**\nThe skills you learned in this program are yours forever. Activity monitoring, values-based scheduling, graded task assignment, TRAP to TRAC, social activation, and rumination interruption — these are tools you can use for the rest of your life. The key is to keep using them, even when you feel well. Prevention is always easier than recovery.",
        },
      },
      {
        type: "ASSESSMENT",
        title: "PHQ-9 Final Assessment",
        content: {
          type: "ASSESSMENT",
          title: "PHQ-9 (Patient Health Questionnaire-9) — Final",
          instructions:
            "Over the last 2 weeks, how often have you been bothered by any of the following problems? Select the answer that best describes your experience.",
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
            { question: "Thoughts that you would be better off dead, or of hurting yourself in some way", type: "LIKERT", required: true, sortOrder: 8, likertMin: 0, likertMax: 3, likertMinLabel: "Not at all", likertMaxLabel: "Nearly every day" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Final Homework: Write Your Maintenance Plan",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Write down your top 3-5 personal early warning signs — the first things that change when depression starts creeping back.", sortOrder: 0 },
            { type: "ACTION", description: "Create a weekly activity schedule that includes at least one pleasure activity, one mastery activity, and one social activity each day.", sortOrder: 1 },
            { type: "ACTION", description: "List 3-5 support contacts — people you can call when you are struggling. Include at least one professional (therapist, doctor, crisis line).", sortOrder: 2 },
            { type: "ACTION", description: "Write down your plan for what to do when you notice early warning signs. Be specific: 'If I start canceling plans, I will text [name] and schedule something small within 24 hours.'", sortOrder: 3 },
            { type: "BRING_TO_SESSION", description: "Bring your completed maintenance plan to your final session for review.", sortOrder: 4 },
          ],
        },
      },
    ]
  );

  // ── Daily Tracker: Activity & Mood Log ──────────────────────────────────
  const activityTracker = await prisma.dailyTracker.create({
    data: {
      programId: program.id,
      createdById: clinicianId,
      name: "Activity & Mood Log",
      description: "Track your daily mood, activities, and engagement to spot patterns and measure progress.",
    },
  });

  await prisma.dailyTrackerField.createMany({
    data: [
      { trackerId: activityTracker.id, label: "Mood", fieldType: "SCALE", sortOrder: 0, isRequired: true, options: { min: 0, max: 10, minLabel: "Worst mood", maxLabel: "Best mood" } },
      { trackerId: activityTracker.id, label: "Number of activities completed", fieldType: "NUMBER", sortOrder: 1, isRequired: true },
      { trackerId: activityTracker.id, label: "Pleasure rating", fieldType: "SCALE", sortOrder: 2, isRequired: true, options: { min: 0, max: 10, minLabel: "No pleasure", maxLabel: "Great pleasure" } },
      { trackerId: activityTracker.id, label: "Accomplishment rating", fieldType: "SCALE", sortOrder: 3, isRequired: true, options: { min: 0, max: 10, minLabel: "No accomplishment", maxLabel: "Great accomplishment" } },
      { trackerId: activityTracker.id, label: "Hours spent in bed beyond sleep", fieldType: "NUMBER", sortOrder: 4, isRequired: true },
      { trackerId: activityTracker.id, label: "Social interactions", fieldType: "NUMBER", sortOrder: 5, isRequired: true },
      { trackerId: activityTracker.id, label: "Notes", fieldType: "FREE_TEXT", sortOrder: 6, isRequired: false },
    ],
  });

  return program;
}


// ============================================================================
// TEMPLATE 8 — MBSR (Mindfulness-Based Stress Reduction) — 8 Modules
// ============================================================================
export async function seedTemplate8_MBSR(prisma: any, clinicianId: string) {
  const program = await prisma.program.create({
    data: {
      clinicianId,
      title: "Mindfulness-Based Stress Reduction (MBSR)",
      description:
        "An 8-week evidence-based program based on Jon Kabat-Zinn's MBSR curriculum. Learn to reduce stress, manage pain, and improve well-being through mindfulness meditation, body awareness, and gentle movement. Targets PSS reduction and FFMQ improvement.",
      category: "Mindfulness",
      durationWeeks: 8,
      cadence: "WEEKLY",
      sessionType: "ONE_ON_ONE",
      isTemplate: true,
      status: "PUBLISHED",
    },
  });

  // ── Module 1: Introduction & Body Scan ──────────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    0,
    {
      title: "Introduction & Body Scan",
      subtitle: "Week 1",
      summary: "Learn what mindfulness is, complete a baseline stress assessment, and begin body scan practice.",
      estimatedMinutes: 60,
    },
    [
      {
        type: "TEXT",
        title: "What Is Mindfulness?",
        content: {
          type: "TEXT",
          body: "Welcome to the Mindfulness-Based Stress Reduction program. Over the next 8 weeks, you will learn a set of practices that can change your relationship with stress, pain, and difficult emotions.\n\n**Defining Mindfulness**\nMindfulness means paying attention on purpose, in the present moment, and without judgment.\n\nLet us break that down:\n- **Paying attention on purpose**: Most of the time, your mind is on autopilot. You eat without tasting, walk without noticing, and listen without hearing. Mindfulness is the deliberate choice to pay attention.\n- **In the present moment**: Your mind spends most of its time in the past (replaying, regretting) or the future (planning, worrying). Mindfulness brings you back to the only moment that actually exists — right now.\n- **Without judgment**: Your mind constantly labels experiences as good or bad, right or wrong. Mindfulness invites you to notice what is happening without adding those labels. A sensation is just a sensation. A thought is just a thought.\n\n**What Mindfulness Is Not**\n- It is not about emptying your mind or stopping your thoughts. Thoughts will come. You simply learn to notice them without getting swept away.\n- It is not relaxation. Sometimes mindfulness is relaxing. Sometimes it is uncomfortable. Both are fine.\n- It is not a religion. While mindfulness has roots in Buddhist meditation, the MBSR program is completely secular and evidence-based.\n- It is not about being passive or accepting bad situations. Mindfulness helps you see clearly so you can respond wisely.\n\n**The Body Scan**\nYour first formal practice is the body scan. In a body scan, you lie down and slowly move your attention through each part of your body, from your toes to the top of your head. You are not trying to relax or change anything. You are simply noticing what is there — warmth, coolness, tingling, tension, numbness, or nothing at all.\n\nThe body scan teaches you to:\n- Direct your attention where you choose\n- Notice physical sensations you usually ignore\n- Observe without reacting\n- Be patient with yourself when your mind wanders (and it will — that is normal)\n\n**Why Start with the Body?**\nYour body is always in the present moment. Your mind may be in the past or future, but your body is always here and now. Learning to tune into your body gives you a reliable anchor to the present moment, no matter what is happening in your life.",
        },
      },
      {
        type: "ASSESSMENT",
        title: "PSS-10 Baseline Assessment",
        content: {
          type: "ASSESSMENT",
          title: "Perceived Stress Scale (PSS-10)",
          instructions:
            "The questions in this scale ask you about your feelings and thoughts during the last month. In each case, please indicate how often you felt or thought a certain way.",
          scoringMethod: "SUM",
          questions: [
            { question: "In the last month, how often have you been upset because of something that happened unexpectedly?", type: "LIKERT", required: true, sortOrder: 0, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you felt that you were unable to control the important things in your life?", type: "LIKERT", required: true, sortOrder: 1, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you felt nervous and stressed?", type: "LIKERT", required: true, sortOrder: 2, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you felt confident about your ability to handle your personal problems?", type: "LIKERT", required: true, sortOrder: 3, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you felt that things were going your way?", type: "LIKERT", required: true, sortOrder: 4, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you found that you could not cope with all the things that you had to do?", type: "LIKERT", required: true, sortOrder: 5, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you been able to control irritations in your life?", type: "LIKERT", required: true, sortOrder: 6, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you felt that you were on top of things?", type: "LIKERT", required: true, sortOrder: 7, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you been angered because of things that were outside of your control?", type: "LIKERT", required: true, sortOrder: 8, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?", type: "LIKERT", required: true, sortOrder: 9, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
          ],
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Foundational Attitudes of Mindfulness",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "🌱", title: "Beginner's Mind", body: "See each moment as if for the first time. Even if you have done something a thousand times, approach it fresh. Beginner's mind keeps you curious and open, rather than stuck in assumptions about how things are." },
            { emoji: "⚖️", title: "Non-Judging", body: "Notice when your mind labels something as good or bad, right or wrong. You do not need to stop the judging — just notice it. 'There is judging.' Then gently return your attention to what you are observing." },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 1 Homework",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Practice the body scan for 20 minutes daily, 6 days this week. Find a quiet place, lie down, and slowly move your attention from your toes to the top of your head. When your mind wanders, gently bring it back.", isRecurring: true, sortOrder: 0 },
            { type: "ACTION", description: "Eat one meal this week mindfully. Turn off screens, sit down, and pay full attention to the taste, texture, smell, and appearance of your food. Notice when your mind wanders and bring it back to the experience of eating.", sortOrder: 1 },
            { type: "JOURNAL_PROMPT", description: "After your first body scan, write a few sentences about what you noticed. What sensations did you feel? Where did your mind go? What was the experience like?", sortOrder: 2 },
          ],
        },
      },
    ]
  );

  // ── Module 2: Perception & Response ─────────────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    1,
    {
      title: "Perception & Response",
      subtitle: "Week 2",
      summary: "Explore how automatic perceptions shape your reactions and learn to see more clearly.",
      estimatedMinutes: 60,
    },
    [
      {
        type: "TEXT",
        title: "Seeing vs Interpreting",
        content: {
          type: "TEXT",
          body: "This week, we explore something that happens so fast you usually do not notice it: the gap between what actually happens and the story your mind tells about it.\n\n**Automatic Perception**\nYour brain is a meaning-making machine. Something happens, and before you even realize it, your brain has already interpreted it, judged it, and decided how to react. This all happens in a fraction of a second.\n\nFor example:\n- You hear a loud noise → Your brain says \"Danger!\" → Your body tenses up\n- A coworker does not say hello → Your brain says \"She is upset with me\" → You feel anxious\n- You feel a pain in your chest → Your brain says \"Heart attack!\" → You panic\n\nIn each case, the interpretation happens so fast that it feels like reality. But it is not reality — it is your brain's best guess. And your brain's guesses are often wrong.\n\n**Seeing vs Interpreting**\nMindfulness helps you slow down enough to notice the difference between what you actually observe (seeing) and what your mind adds to it (interpreting).\n\n- **Seeing**: \"My coworker walked past without saying hello.\"\n- **Interpreting**: \"She is angry at me. I must have done something wrong.\"\n\n- **Seeing**: \"I feel tightness in my chest.\"\n- **Interpreting**: \"Something is seriously wrong with me.\"\n\n- **Seeing**: \"My partner sighed.\"\n- **Interpreting**: \"He is frustrated with me again.\"\n\nThe seeing is factual. The interpreting is a story. Both happen, but mindfulness helps you tell them apart.\n\n**Why This Matters**\nWhen you mistake your interpretations for facts, you react to a story rather than to reality. This leads to unnecessary stress, conflict, and suffering. When you can pause and notice the gap between what happened and what your mind says about it, you gain freedom. You can choose how to respond instead of being hijacked by automatic reactions.\n\n**This Week's Practice: Sitting Meditation**\nYou will add sitting meditation to your practice this week. Sit in a comfortable, upright position and focus your attention on your breathing. When thoughts arise, notice them without getting caught up in them — as if you were watching clouds pass across the sky. Then gently return your attention to the breath.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Perception Strategies",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "🗺️", title: "The Map Is Not the Territory", body: "Your thoughts about reality are not reality itself. They are a map — useful, but not the actual territory. When you feel certain about an interpretation, pause and ask: Is this a fact, or is this my mind's story about the fact?" },
            { emoji: "⏸️", title: "Responding vs Reacting", body: "Reacting is automatic — it happens before you think. Responding is deliberate — you pause, notice what is happening, and choose your action. Mindfulness builds the pause between stimulus and response." },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 2 Homework",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Practice the body scan daily (20 minutes), plus add 10 minutes of sitting meditation focusing on the breath. Alternate: body scan one day, sitting meditation the next.", isRecurring: true, sortOrder: 0 },
            { type: "JOURNAL_PROMPT", description: "Each day, notice one moment when you reacted automatically to something. Write down: (1) What actually happened (the facts), (2) What your mind said about it (the interpretation), (3) How you reacted. Just notice — you do not need to change anything yet.", sortOrder: 1 },
          ],
        },
      },
    ]
  );

  // ── Module 3: Mindfulness of Breath & Body ──────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    2,
    {
      title: "Mindfulness of Breath & Body",
      subtitle: "Week 3",
      summary: "Deepen breath awareness, begin tracking pleasant events, and learn to use the breath as an anchor.",
      estimatedMinutes: 60,
    },
    [
      {
        type: "TEXT",
        title: "The Breath as Anchor",
        content: {
          type: "TEXT",
          body: "Your breath is always with you. It is happening right now, in this very moment. Unlike your thoughts, which bounce between past and future, your breath is always in the present. This makes it the perfect anchor for mindfulness.\n\n**Using the Breath**\nWhen you focus on your breathing, you are not trying to breathe in a special way. You are not trying to slow it down, deepen it, or control it. You are simply noticing it as it is.\n\nNotice:\n- Where do you feel the breath most clearly? The nostrils? The chest? The belly?\n- Is the breath long or short? Deep or shallow?\n- Is there a pause between the in-breath and the out-breath?\n- Does the breath change as you observe it? That is fine — just notice.\n\n**When Your Mind Wanders**\nYour mind will wander. This is not a failure — it is what minds do. The moment you notice your mind has wandered is actually a moment of mindfulness. You woke up. Now gently guide your attention back to the breath. No frustration, no self-criticism. Just come back.\n\nYou might need to come back a hundred times in a single meditation. Each time is a success, not a failure. Each time you come back, you are strengthening your attention muscle.\n\n**Pleasant Events Calendar**\nThis week, you will start tracking pleasant events. At least once a day, notice something pleasant — it can be very small. A warm cup of coffee. Sunlight on your face. A kind word from someone.\n\nFor each pleasant event, notice:\n- What happened?\n- What did you feel in your body?\n- What thoughts went through your mind?\n- How do you feel now, remembering it?\n\nThe point is not to force positive thinking. It is to notice that pleasant moments happen more often than depression or stress lets you see. You are training your attention to pick up on what is already there.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Breath & Body Strategies",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "⚓", title: "Breath as Anchor", body: "Your breath is always here, always now. When your mind spins out into worry, regret, or planning, return to the breath. Feel one full in-breath. Feel one full out-breath. You are here." },
            { emoji: "🌊", title: "This Too Shall Pass", body: "Every sensation, every emotion, every thought — they all arise and pass away. You do not need to hold on to pleasant experiences or push away unpleasant ones. Just watch them come and go, like waves on a shore." },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 3 Homework",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Alternate between body scan and sitting meditation daily (20 minutes each). Try to practice 6 out of 7 days.", isRecurring: true, sortOrder: 0 },
            { type: "ACTION", description: "Keep a Pleasant Events Calendar. Each day, notice and record at least one pleasant event. Write down what happened, what you felt in your body, what thoughts arose, and how you feel now.", isRecurring: true, sortOrder: 1 },
            { type: "BRING_TO_SESSION", description: "Bring your Pleasant Events Calendar to the next session.", sortOrder: 2 },
          ],
        },
      },
    ]
  );

  // ── Module 4: Stress & Reactivity ───────────────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    3,
    {
      title: "Stress & Reactivity",
      subtitle: "Week 4",
      summary: "Understand the stress response and how mindfulness can interrupt automatic stress reactions.",
      estimatedMinutes: 60,
    },
    [
      {
        type: "TEXT",
        title: "Understanding the Stress Response",
        content: {
          type: "TEXT",
          body: "Stress is not the enemy. Your reaction to stress is what causes most of the suffering.\n\n**The Fight-Flight-Freeze Response**\nYour body has a built-in alarm system designed to keep you safe. When your brain detects danger — real or imagined — it triggers the stress response:\n\n- **Fight**: Your body prepares to confront the threat. Heart rate increases, muscles tense, adrenaline surges.\n- **Flight**: Your body prepares to escape. Same physical changes, but the urge is to run.\n- **Freeze**: Your body shuts down. You feel paralyzed, numb, or unable to think clearly.\n\nThis system works perfectly when the threat is physical — a car swerving toward you, a fire, a dangerous animal. The problem is that your brain triggers the same alarm for things that are not physically dangerous: a critical email from your boss, a disagreement with your partner, a pile of bills, a deadline.\n\nYour body cannot tell the difference between a real threat and a perceived one. It responds the same way.\n\n**Chronic Stress**\nWhen the alarm system stays on too long — because modern life is full of perceived threats — it damages your body and mind. Chronic stress contributes to:\n- High blood pressure and heart disease\n- Weakened immune system\n- Digestive problems\n- Anxiety and depression\n- Difficulty sleeping\n- Difficulty concentrating\n\n**How Mindfulness Interrupts the Cycle**\nMindfulness does not eliminate stress. But it creates a space between the stressful event and your reaction. In that space, you can choose how to respond instead of being hijacked by your alarm system.\n\nHere is how it works:\n1. Something stressful happens\n2. You notice the stress arising in your body (tight shoulders, clenched jaw, fast heartbeat)\n3. Instead of reacting immediately, you pause\n4. You take a breath and observe what is happening\n5. You choose a response that is wise rather than reactive\n\nThis does not mean you never feel stressed. It means stress does not control you.\n\n**Unpleasant Events Calendar**\nThis week, you will track unpleasant events — the opposite of last week. When something unpleasant happens, notice: What happened? What did you feel in your body? What thoughts arose? How did you react? This builds awareness of your stress patterns.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Stress Response Strategies",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "🛑", title: "STOP: Stop, Take a Breath, Observe, Proceed", body: "When you feel stress rising, use STOP. Stop what you are doing. Take one conscious breath. Observe what is happening in your body, thoughts, and emotions. Then proceed with awareness. This takes 10 seconds and can change your entire response." },
            { emoji: "🎯", title: "Stress Is Not the Enemy — Reactivity Is", body: "You cannot eliminate stress from your life. But you can change how you relate to it. The stress itself is often brief. It is your reaction — the worry, the rumination, the tension you hold for hours — that causes the real damage." },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 4 Homework",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Practice sitting meditation daily for 20 minutes. Focus on breath, then expand awareness to include body sensations, sounds, and thoughts.", isRecurring: true, sortOrder: 0 },
            { type: "ACTION", description: "Keep an Unpleasant Events Calendar. Each day, notice and record one unpleasant event. Write what happened, body sensations, thoughts, and how you reacted.", isRecurring: true, sortOrder: 1 },
            { type: "ACTION", description: "Practice STOP (Stop, Take a breath, Observe, Proceed) at least twice daily — once when something stressful happens, and once at a random time.", isRecurring: true, sortOrder: 2 },
          ],
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Stress Patterns",
        content: {
          type: "JOURNAL_PROMPT",
          prompt: "Review your Unpleasant Events Calendar entries from this week. What patterns do you notice in how your body responds to stress? Are there certain types of situations that trigger the strongest reactions? How did you handle them — and was there a moment where you were able to pause before reacting?",
        },
      },
    ]
  );

  // ── Module 5: Responding to Stress (Midpoint) ──────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    4,
    {
      title: "Responding to Stress",
      subtitle: "Week 5 — Midpoint",
      summary: "Deepen your ability to respond rather than react to stress. Complete a mid-treatment assessment.",
      estimatedMinutes: 60,
    },
    [
      {
        type: "TEXT",
        title: "Finding the Pause",
        content: {
          type: "TEXT",
          body: "You are now at the midpoint of the MBSR program. Over the past four weeks, you have been building a foundation: learning to pay attention to your body, your breath, your perceptions, and your stress reactions. This week, we go deeper into the heart of MBSR — learning to respond to stress with awareness instead of reacting on autopilot.\n\n**Responding vs Reacting**\nReacting is automatic. Something happens, and you fire back without thinking. You snap at your partner, you send an angry email, you eat a bag of chips, you pour a drink. These reactions often make things worse.\n\nResponding is intentional. Something happens, and you pause. You feel the stress in your body. You notice your thoughts. You take a breath. And then you choose what to do. The choice may look similar to the reaction — sometimes you do need to act quickly or set a boundary — but it comes from awareness rather than autopilot.\n\n**The Space Between**\nViktor Frankl, a psychiatrist who survived the Holocaust, wrote: \"Between stimulus and response there is a space. In that space is our freedom and our power to choose our response. In our response lies our growth and our freedom.\"\n\nMindfulness practice is the practice of finding that space. Every time you sit and notice a thought without getting lost in it, you are practicing the pause. Every time you feel a difficult sensation in your body and stay with it rather than running away, you are building your capacity to respond rather than react.\n\n**Expanding Your Practice**\nThis week, extend your formal practice to 30 minutes daily. You can do sitting meditation, mindful movement (gentle stretching with full awareness), or a combination. The key is consistency — 30 minutes, every day. This is where the real transformation happens.\n\n**Mindful Movement**\nMindful movement is yoga or stretching done with complete attention. You move slowly, notice every sensation, and honor your body's limits. It is not about flexibility or fitness. It is about being fully present in your body as it moves.",
        },
      },
      {
        type: "ASSESSMENT",
        title: "PSS-10 Mid-Treatment Assessment",
        content: {
          type: "ASSESSMENT",
          title: "Perceived Stress Scale (PSS-10) — Mid-Treatment",
          instructions:
            "The questions in this scale ask you about your feelings and thoughts during the last month. In each case, please indicate how often you felt or thought a certain way.",
          scoringMethod: "SUM",
          questions: [
            { question: "In the last month, how often have you been upset because of something that happened unexpectedly?", type: "LIKERT", required: true, sortOrder: 0, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you felt that you were unable to control the important things in your life?", type: "LIKERT", required: true, sortOrder: 1, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you felt nervous and stressed?", type: "LIKERT", required: true, sortOrder: 2, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you felt confident about your ability to handle your personal problems?", type: "LIKERT", required: true, sortOrder: 3, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you felt that things were going your way?", type: "LIKERT", required: true, sortOrder: 4, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you found that you could not cope with all the things that you had to do?", type: "LIKERT", required: true, sortOrder: 5, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you been able to control irritations in your life?", type: "LIKERT", required: true, sortOrder: 6, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you felt that you were on top of things?", type: "LIKERT", required: true, sortOrder: 7, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you been angered because of things that were outside of your control?", type: "LIKERT", required: true, sortOrder: 8, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?", type: "LIKERT", required: true, sortOrder: 9, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
          ],
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Responding to Stress Strategies",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "🕊️", title: "The Space Between Stimulus and Response", body: "There is always a space — even if it is tiny — between what happens to you and what you do about it. Mindfulness makes that space bigger. In that space, you are free." },
            { emoji: "🏄", title: "You Can't Stop the Waves But You Can Learn to Surf", body: "Stress, pain, difficulty — these are waves that will keep coming. You cannot control the ocean. But you can learn to ride the waves with skill and balance instead of being knocked down by them." },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 5 Homework",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Extend daily formal practice to 30 minutes. You may do sitting meditation, mindful movement (gentle yoga or stretching with awareness), or a combination.", isRecurring: true, sortOrder: 0 },
            { type: "ACTION", description: "Continue using STOP throughout the day, especially in stressful moments.", isRecurring: true, sortOrder: 1 },
            { type: "JOURNAL_PROMPT", description: "Write about a time this week when you were able to respond to stress rather than react. What did you notice in your body? What helped you pause?", sortOrder: 2 },
          ],
        },
      },
    ]
  );

  // ── Module 6: Mindful Communication ─────────────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    5,
    {
      title: "Mindful Communication",
      subtitle: "Week 6",
      summary: "Learn to listen with full presence and speak with awareness in your relationships.",
      estimatedMinutes: 60,
    },
    [
      {
        type: "TEXT",
        title: "Listening Without Planning Your Response",
        content: {
          type: "TEXT",
          body: "Most of us think we are good listeners. But if you pay close attention, you will notice something: while someone else is talking, you are usually planning what you are going to say next. You are not really listening — you are waiting for your turn to speak.\n\nMindful communication brings the same quality of attention you have been cultivating in meditation into your conversations and relationships.\n\n**Mindful Listening**\nMindful listening means giving your full attention to the other person. Not just hearing their words, but really taking in what they are saying — their meaning, their tone, their emotion.\n\nWhen you listen mindfully:\n- You set aside your own agenda\n- You do not plan your response while they are speaking\n- You notice when your mind wanders and bring it back to the speaker\n- You listen for what is underneath the words — the feelings, the needs, the concerns\n- You resist the urge to fix, advise, or argue\n\nThis is harder than it sounds. Your mind wants to jump in with opinions, solutions, and counterarguments. That is normal. Just notice the urge and return your attention to the other person.\n\n**Mindful Speaking**\nMindful speaking means being aware of what you are saying, why you are saying it, and how you are saying it.\n\nBefore you speak, pause and ask:\n- Is what I am about to say true?\n- Is it helpful?\n- Is this the right time to say it?\n- What is my intention — to connect, to be right, to control?\n\nYou do not need to filter every word. But bringing even a small amount of awareness to your speech can transform your relationships.\n\n**Communication and Stress**\nMany of our biggest stressors involve other people — conflict, misunderstanding, feeling unheard, saying things we regret. Mindful communication does not eliminate these challenges, but it gives you a better chance of navigating them skillfully.\n\nWhen you listen fully, people feel heard. When people feel heard, conflict decreases. When you speak with awareness, you say what you mean without causing unnecessary harm. This creates a cycle of trust and connection.",
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 6 Homework",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Continue 30 minutes of daily formal practice (sitting meditation or mindful movement).", isRecurring: true, sortOrder: 0 },
            { type: "ACTION", description: "Practice mindful listening in at least one conversation each day. Give the other person your full attention. Notice when your mind wanders or starts planning a response, and bring it back to listening.", isRecurring: true, sortOrder: 1 },
            { type: "ACTION", description: "Before one conversation this week, set an intention: 'I will listen fully before I respond.' Notice how the conversation is different.", sortOrder: 2 },
          ],
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Communication Patterns",
        content: {
          type: "JOURNAL_PROMPT",
          prompt: "Think about your communication habits. When do you tend to listen well? When do you tend to tune out, interrupt, or plan your response? Is there a particular relationship where mindful communication could make a difference? Write about what you noticed when you practiced mindful listening this week.",
        },
      },
    ]
  );

  // ── Module 7: Loving-Kindness & Self-Compassion ─────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    6,
    {
      title: "Loving-Kindness & Self-Compassion",
      subtitle: "Week 7",
      summary: "Learn loving-kindness meditation and extend compassion to yourself and others.",
      estimatedMinutes: 60,
    },
    [
      {
        type: "TEXT",
        title: "Loving-Kindness Meditation",
        content: {
          type: "TEXT",
          body: "For six weeks, you have been practicing mindfulness — paying attention to the present moment with openness and curiosity. This week, we add a new dimension: intentionally cultivating warmth, kindness, and compassion.\n\n**What Is Loving-Kindness?**\nLoving-kindness (sometimes called metta) is the practice of sending good wishes to yourself and others. It is not about forcing a feeling. It is about setting an intention and repeating simple phrases that express your wish for well-being.\n\nThe traditional phrases are:\n- May I be safe\n- May I be happy\n- May I be healthy\n- May I live with ease\n\nYou start by directing these wishes toward yourself. Then you gradually expand outward — to someone you love, to a neutral person, to someone you find difficult, and eventually to all living beings.\n\n**Why Self-Compassion Matters**\nMany people find it easy to feel compassion for others but struggle to extend it to themselves. When you make a mistake, you criticize yourself harshly. When you are in pain, you tell yourself to toughen up. When you fail, you call yourself names you would never use with a friend.\n\nThis inner critic is not motivating — it is destructive. Research shows that self-compassion is a far better motivator than self-criticism. People who treat themselves with kindness are more resilient, more willing to try again after failure, and less prone to anxiety and depression.\n\nSelf-compassion has three components:\n1. **Self-kindness**: Treating yourself with the same warmth you would give a good friend\n2. **Common humanity**: Recognizing that suffering and imperfection are part of being human — you are not alone in your struggles\n3. **Mindfulness**: Acknowledging your pain without exaggerating it or suppressing it\n\n**How to Practice**\nSit comfortably and close your eyes. Bring to mind an image of yourself. Slowly repeat the phrases:\n- May I be safe\n- May I be happy\n- May I be healthy\n- May I live with ease\n\nSay them slowly. Feel each word. If emotions arise — tears, resistance, disbelief — that is normal. Just notice and continue.\n\nAfter a few minutes, bring to mind someone you love. Direct the phrases to them: May you be safe. May you be happy. May you be healthy. May you live with ease.\n\nThen bring to mind a neutral person — someone you see regularly but do not know well (a cashier, a neighbor). Direct the phrases to them.\n\nFinally, if you are ready, bring to mind someone you find difficult. This is the hardest part. You are not condoning their behavior — you are wishing them well as a fellow human being.\n\nEnd by expanding the phrases to all beings everywhere: May all beings be safe. May all beings be happy. May all beings be healthy. May all beings live with ease.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Loving-Kindness Strategies",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "💛", title: "May I Be Safe, May I Be Happy, May I Be Healthy, May I Live with Ease", body: "These four phrases are the foundation of loving-kindness practice. Repeat them slowly, directing them first to yourself, then to others. You are planting seeds of compassion. They grow with practice." },
            { emoji: "🤝", title: "Self-Compassion Is Not Self-Indulgence", body: "Being kind to yourself is not lazy, weak, or selfish. It is how you build the inner resources to handle life's challenges. You cannot pour from an empty cup. Self-compassion fills the cup." },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Week 7 Homework",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Practice loving-kindness meditation for 20 minutes daily. Start with yourself, then extend to a loved one, a neutral person, and (if you are ready) a difficult person.", isRecurring: true, sortOrder: 0 },
            { type: "ACTION", description: "When you notice your inner critic this week, pause and ask: What would I say to a friend in this situation? Then say that to yourself.", isRecurring: true, sortOrder: 1 },
            { type: "JOURNAL_PROMPT", description: "Write about your experience with loving-kindness meditation. What was it like to direct kindness toward yourself? Was it easy or difficult? What emotions came up?", sortOrder: 2 },
          ],
        },
      },
    ]
  );

  // ── Module 8: Integration & Moving Forward ──────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    7,
    {
      title: "Integration & Moving Forward",
      subtitle: "Week 8",
      summary: "Complete your final assessment, design your personal practice plan, and make mindfulness a way of life.",
      estimatedMinutes: 60,
    },
    [
      {
        type: "TEXT",
        title: "Mindfulness as a Way of Life",
        content: {
          type: "TEXT",
          body: "You have reached the final week of the MBSR program. Over the past 8 weeks, you have learned practices that can serve you for the rest of your life. But the real question is: what happens now?\n\n**From Practice to Way of Life**\nMBSR is not a course you complete and forget. It is the beginning of a lifelong relationship with the present moment. The practices you have learned — body scan, sitting meditation, mindful movement, loving-kindness — are tools you can return to again and again.\n\nBut mindfulness is more than formal practice. It is a way of being in the world:\n- Eating a meal with full attention is mindfulness\n- Listening to someone without planning your response is mindfulness\n- Feeling the sun on your face and really noticing it is mindfulness\n- Recognizing stress in your body before it takes over is mindfulness\n- Treating yourself with kindness when you make a mistake is mindfulness\n\n**What You Have Learned**\nLet us review what you have cultivated over 8 weeks:\n\n1. **Body awareness**: You can tune into your body and notice sensations, tension, and emotions stored in your physical form\n2. **Breath as anchor**: You can use your breath to return to the present moment at any time\n3. **Seeing vs interpreting**: You can distinguish between what actually happens and the stories your mind tells about it\n4. **Stress awareness**: You understand your stress response and can interrupt automatic reactivity\n5. **The pause**: You can create space between stimulus and response, giving yourself the freedom to choose\n6. **Mindful communication**: You can listen with presence and speak with awareness\n7. **Self-compassion**: You can treat yourself with the same kindness you would offer a friend\n\n**Designing Your Practice**\nThere is no single right way to maintain a mindfulness practice. Some people meditate every morning. Some practice before bed. Some do 10 minutes, some do 45. The best practice is the one you will actually do.\n\nConsider:\n- What time of day works best for you?\n- What practices resonated most? (Body scan? Sitting? Movement? Loving-kindness?)\n- How long can you realistically commit to each day?\n- What informal practices can you weave into daily life?\n\nStart with a plan you are confident you can sustain. You can always expand it later. Consistency matters more than duration — 10 minutes every day is better than 60 minutes once a week.\n\n**When Practice Fades**\nAt some point, your practice will fade. Life gets busy, motivation drops, and you stop sitting. This is normal. It happens to everyone, including long-term meditators.\n\nWhen it happens, do not beat yourself up. Just start again. Sit down, take one breath, and begin. Every moment is a chance to start fresh. That is the essence of mindfulness — always beginning again.",
        },
      },
      {
        type: "ASSESSMENT",
        title: "PSS-10 Final Assessment",
        content: {
          type: "ASSESSMENT",
          title: "Perceived Stress Scale (PSS-10) — Final",
          instructions:
            "The questions in this scale ask you about your feelings and thoughts during the last month. In each case, please indicate how often you felt or thought a certain way.",
          scoringMethod: "SUM",
          questions: [
            { question: "In the last month, how often have you been upset because of something that happened unexpectedly?", type: "LIKERT", required: true, sortOrder: 0, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you felt that you were unable to control the important things in your life?", type: "LIKERT", required: true, sortOrder: 1, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you felt nervous and stressed?", type: "LIKERT", required: true, sortOrder: 2, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you felt confident about your ability to handle your personal problems?", type: "LIKERT", required: true, sortOrder: 3, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you felt that things were going your way?", type: "LIKERT", required: true, sortOrder: 4, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you found that you could not cope with all the things that you had to do?", type: "LIKERT", required: true, sortOrder: 5, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you been able to control irritations in your life?", type: "LIKERT", required: true, sortOrder: 6, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you felt that you were on top of things?", type: "LIKERT", required: true, sortOrder: 7, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you been angered because of things that were outside of your control?", type: "LIKERT", required: true, sortOrder: 8, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
            { question: "In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?", type: "LIKERT", required: true, sortOrder: 9, likertMin: 0, likertMax: 4, likertMinLabel: "Never", likertMaxLabel: "Very often" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Final Homework: Design Your Personal Practice Plan",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Design your personal daily mindfulness practice plan. Write down: which practice(s) you will do, what time of day, how long, and where. Start with something you are confident you can sustain.", sortOrder: 0 },
            { type: "ACTION", description: "Choose 2-3 informal mindfulness practices to weave into daily life (mindful eating, mindful walking, STOP practice, mindful listening). Write them down.", sortOrder: 1 },
            { type: "ACTION", description: "Identify what you will do when your practice fades. Write a simple 'restart plan' — the smallest step you can take to begin again (e.g., 'Sit for 3 breaths').", sortOrder: 2 },
            { type: "BRING_TO_SESSION", description: "Bring your personal practice plan to the final session for discussion.", sortOrder: 3 },
          ],
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Reflecting on the Journey",
        content: {
          type: "JOURNAL_PROMPT",
          prompt: "Reflect on your 8-week MBSR journey. What has changed — in how you relate to stress, to your body, to other people, to yourself? What practices resonated most with you? What surprised you? What will you carry forward? Take your time with this reflection. There are no right answers.",
        },
      },
    ]
  );

  // ── Daily Tracker: Mindfulness Practice Log ─────────────────────────────
  const mindfulnessTracker = await prisma.dailyTracker.create({
    data: {
      programId: program.id,
      createdById: clinicianId,
      name: "Mindfulness Practice Log",
      description: "Track your daily mindfulness practice, stress levels, and informal practice.",
    },
  });

  await prisma.dailyTrackerField.createMany({
    data: [
      { trackerId: mindfulnessTracker.id, label: "Formal practice completed", fieldType: "YES_NO", sortOrder: 0, isRequired: true },
      { trackerId: mindfulnessTracker.id, label: "Duration (minutes)", fieldType: "NUMBER", sortOrder: 1, isRequired: true },
      { trackerId: mindfulnessTracker.id, label: "Practice type", fieldType: "MULTI_CHECK", sortOrder: 2, isRequired: true, options: { options: ["Body Scan", "Sitting Meditation", "Mindful Movement", "Walking Meditation", "Loving-Kindness", "Choiceless Awareness"] } },
      { trackerId: mindfulnessTracker.id, label: "Stress level", fieldType: "SCALE", sortOrder: 3, isRequired: true, options: { min: 0, max: 10, minLabel: "No stress", maxLabel: "Extreme stress" } },
      { trackerId: mindfulnessTracker.id, label: "Informal practice completed", fieldType: "YES_NO", sortOrder: 4, isRequired: true },
      { trackerId: mindfulnessTracker.id, label: "Notes", fieldType: "FREE_TEXT", sortOrder: 5, isRequired: false },
    ],
  });

  return program;
}
