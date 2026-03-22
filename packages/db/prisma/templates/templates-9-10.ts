// ============================================================================
// Templates 9-10: Anger Management, Parenting Skills (PCIT / PMT)
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
// TEMPLATE 9 — Anger Management — 8 Modules
// ============================================================================
export async function seedTemplate9_AngerManagement(prisma: any, clinicianId: string) {
  const program = await prisma.program.create({
    data: {
      clinicianId,
      title: "Anger Management",
      description:
        "An 8-week structured anger management program that teaches participants to understand their anger, recognize triggers and warning signs, use timeout and de-escalation techniques, restructure anger-fueling thoughts, communicate assertively, and build a long-term anger management plan.",
      category: "Anger",
      durationWeeks: 8,
      cadence: "WEEKLY",
      sessionType: "ONE_ON_ONE",
      isTemplate: true,
      status: "PUBLISHED",
    },
  });

  // ── Module 1: Understanding Anger ──────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    0,
    {
      title: "Understanding Anger",
      subtitle: "Session 1",
      summary: "Learn what anger is, how it differs from aggression, and how the anger cycle works.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "What Is Anger?",
        content: {
          type: "TEXT",
          body: "Anger is a normal, healthy emotion that every person experiences. It is part of the human survival system. When you sense a threat — whether it is physical danger, unfair treatment, or a blocked goal — your brain activates the fight-or-flight response. Your heart beats faster, your muscles tighten, and your body prepares to take action. This is anger doing its job.\n\n**Anger vs. Aggression**\nAnger is a feeling. Aggression is a behavior. You can feel angry without acting aggressively. This is the single most important idea in anger management: you are always responsible for what you do with your anger, even though you cannot always control whether anger shows up.\n\n- **Anger** = an internal emotional experience (feeling frustrated, irritated, furious)\n- **Aggression** = an external action meant to hurt or intimidate (yelling, hitting, throwing things, threatening)\n\nMany people grew up believing that anger itself is bad or dangerous. It is not. Anger tells you that something matters to you. The problem is not the feeling — the problem is what happens when anger leads to hurtful words or actions.\n\n**The Anger Cycle**\nAnger follows a predictable pattern. Understanding this pattern gives you places to intervene before things get out of control.\n\n1. **Trigger**: Something happens that sets you off. It could be external (someone cuts you off in traffic, a coworker takes credit for your work) or internal (a frustrating memory, feeling disrespected).\n\n2. **Thoughts**: Your mind interprets the trigger. These thoughts happen fast and often feel like facts. Examples: \"They did that on purpose,\" \"Nobody respects me,\" \"This is unfair.\"\n\n3. **Physical Signs**: Your body reacts. You might notice a clenched jaw, tight fists, racing heart, hot face, shallow breathing, or a knot in your stomach.\n\n4. **Behavior**: You act on the anger. This could be yelling, slamming doors, giving the silent treatment, or — on the healthy side — taking a break, talking it through, or going for a walk.\n\n5. **Consequences**: Your behavior creates results. Aggressive behavior damages relationships, causes guilt, and often makes the original problem worse. Healthy behavior protects relationships and solves problems.\n\nThe goal of this program is not to eliminate anger. That is neither possible nor desirable. The goal is to slow down the anger cycle so you can choose your behavior instead of reacting on autopilot.\n\n**What You Will Learn**\nOver the next 8 weeks, you will build a toolkit of skills:\n- Recognizing your personal triggers and early warning signs\n- Using the timeout technique to cool down before reacting\n- Changing the thoughts that fuel anger (cognitive restructuring)\n- Communicating assertively instead of aggressively\n- Relaxation techniques to lower your baseline tension\n- Problem-solving skills for recurring anger situations\n- A personal anger management plan you can use for the rest of your life",
        },
      },
      {
        type: "ASSESSMENT",
        title: "Anger Assessment — Baseline",
        content: {
          type: "ASSESSMENT",
          title: "Anger Expression Inventory — Baseline",
          instructions:
            "Read each statement and select the response that best describes how often you have experienced the following over the past two weeks.",
          scoringMethod: "SUM",
          questions: [
            { question: "I feel angry.", type: "LIKERT", required: true, sortOrder: 0, likertMin: 1, likertMax: 4, likertMinLabel: "Almost Never", likertMaxLabel: "Almost Always" },
            { question: "I feel irritated or annoyed.", type: "LIKERT", required: true, sortOrder: 1, likertMin: 1, likertMax: 4, likertMinLabel: "Almost Never", likertMaxLabel: "Almost Always" },
            { question: "I feel furious or enraged.", type: "LIKERT", required: true, sortOrder: 2, likertMin: 1, likertMax: 4, likertMinLabel: "Almost Never", likertMaxLabel: "Almost Always" },
            { question: "I express my anger outwardly (yelling, arguing, slamming things).", type: "LIKERT", required: true, sortOrder: 3, likertMin: 1, likertMax: 4, likertMinLabel: "Almost Never", likertMaxLabel: "Almost Always" },
            { question: "I hold my anger in and do not show it.", type: "LIKERT", required: true, sortOrder: 4, likertMin: 1, likertMax: 4, likertMinLabel: "Almost Never", likertMaxLabel: "Almost Always" },
            { question: "I say nasty or hurtful things when I am angry.", type: "LIKERT", required: true, sortOrder: 5, likertMin: 1, likertMax: 4, likertMinLabel: "Almost Never", likertMaxLabel: "Almost Always" },
            { question: "I feel like hitting or breaking something when I am angry.", type: "LIKERT", required: true, sortOrder: 6, likertMin: 1, likertMax: 4, likertMinLabel: "Almost Never", likertMaxLabel: "Almost Always" },
            { question: "My anger has caused problems in my relationships.", type: "LIKERT", required: true, sortOrder: 7, likertMin: 1, likertMax: 4, likertMinLabel: "Almost Never", likertMaxLabel: "Almost Always" },
            { question: "I am able to calm myself down when I start feeling angry.", type: "LIKERT", required: true, sortOrder: 8, likertMin: 1, likertMax: 4, likertMinLabel: "Almost Never", likertMaxLabel: "Almost Always" },
            { question: "I can talk about what is bothering me in a calm, respectful way.", type: "LIKERT", required: true, sortOrder: 9, likertMin: 1, likertMax: 4, likertMinLabel: "Almost Never", likertMaxLabel: "Almost Always" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 1 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Begin tracking your anger episodes this week using the daily tracker. Each time you feel angry, note what happened (trigger), what you thought, what you felt in your body, what you did, and what the outcome was.", sortOrder: 0 },
            { type: "ACTION", description: "Review the anger cycle diagram and identify which stage you usually notice your anger first (thoughts, physical signs, or behavior).", sortOrder: 1 },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Key Takeaways",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "\u26a0\ufe0f", title: "Anger Is Normal \u2014 Aggression Is Not", body: "Anger is a feeling you cannot always prevent. Aggression is a behavior you always have a choice about. Feeling angry does not make you a bad person. Acting aggressively causes harm." },
            { emoji: "\ud83d\udea8", title: "Know Your Warning Signs", body: "Your body tells you anger is building before your mind catches up. Watch for: clenched jaw, tight fists, racing heart, hot face, shallow breathing, tension in your shoulders, or a knot in your stomach. The earlier you notice, the easier it is to manage." },
          ],
        },
      },
    ]
  );

  // ── Module 2: Identifying Triggers & Warning Signs ──────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    1,
    {
      title: "Identifying Triggers & Warning Signs",
      subtitle: "Session 2",
      summary: "Map your personal anger triggers and learn to recognize early physical warning signs.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "What Sets You Off?",
        content: {
          type: "TEXT",
          body: "Anger does not come from nowhere. It is always triggered by something, even when the trigger is hard to identify in the moment. This session is about becoming an expert on your own anger — knowing exactly what sets you off and catching the early warning signs before anger takes over.\n\n**External Triggers**\nExternal triggers are things that happen outside of you. They include:\n- **Situations**: Being stuck in traffic, running late, technology breaking down, noisy environments\n- **People**: A critical boss, a disrespectful stranger, a partner who does not listen, a child who will not cooperate\n- **Events**: Being lied to, having plans cancelled, receiving unfair criticism, witnessing injustice\n- **Environmental stressors**: Crowded spaces, long wait times, uncomfortable temperatures\n\n**Internal Triggers**\nInternal triggers come from inside you. They are just as powerful as external triggers, but harder to spot:\n- **Thoughts and memories**: Replaying an argument in your mind, remembering past mistreatment, imagining worst-case scenarios\n- **Physical states**: Being hungry, tired, in pain, or sick significantly lowers your anger threshold. The acronym HALT is helpful — ask yourself: Am I Hungry, Angry (already at a low simmer), Lonely, or Tired?\n- **Emotional states**: Feeling disrespected, embarrassed, hurt, scared, or powerless often shows up as anger because anger feels more powerful than vulnerability\n- **Unmet expectations**: Expecting something to happen a certain way and having reality fall short\n\n**The Trigger + Vulnerability Formula**\nMost anger episodes are not caused by the trigger alone. They result from a trigger hitting you when you are already vulnerable. The same situation that barely bothers you on a good day can feel infuriating when you are tired, stressed, or already upset about something else.\n\nTrigger + Vulnerability = Intensity of Anger Response\n\nThis is why tracking your anger episodes over time reveals patterns. You may discover that most of your worst anger happens when you are sleep-deprived, when you skip meals, or when you are already stressed about work.\n\n**Physical Warning Signs**\nYour body is the best early warning system for anger. The fight-or-flight response creates physical changes that happen before you consciously realize you are getting angry. Common physical warning signs include:\n\n- Clenched jaw or grinding teeth\n- Tight fists or gripping objects harder\n- Racing or pounding heart\n- Tight chest or difficulty breathing\n- Hot face, neck, or ears\n- Shallow, rapid breathing\n- Tension in shoulders, neck, or back\n- Feeling restless or unable to sit still\n- Sweating\n- Upset stomach or knot in the gut\n- Speaking louder or faster\n\nEveryone has their own signature warning signs. Some people feel it first in their jaw. Others feel it in their chest. Learning your pattern is essential because these physical signs give you a window of opportunity — the few seconds or minutes before anger peaks — to use the skills you will learn in this program.\n\n**The Body Scan**\nA quick body scan is one of the fastest ways to check your anger level at any moment. Starting from the top of your head, mentally scan down through your face, jaw, neck, shoulders, chest, arms, hands, stomach, and legs. Notice where you are holding tension. Rate your overall anger from 0 (completely calm) to 10 (the angriest you have ever been). If you are at a 4 or above, it is time to use a coping skill.",
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 2 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Create a personal trigger map: list your top 5 external triggers and top 5 internal triggers. For each one, write down how often it happens and how intense the anger usually is (0-10).", sortOrder: 0 },
            { type: "ACTION", description: "Identify your personal physical warning signs. Which parts of your body react first when anger starts building?", sortOrder: 1 },
            { type: "ACTION", description: "Practice a quick body scan at least 3 times per day this week (morning, midday, evening). Rate your anger level from 0 to 10 each time.", sortOrder: 2 },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Recent Anger Episode",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "Describe your most recent anger episode in detail. What happened right before you got angry (the trigger)? What were you already dealing with that day (your vulnerability)? What thoughts went through your mind? What did you feel in your body and where? What did you do? What happened as a result? Looking back, at what point could you have done something different?",
          ],
          spaceSizeHint: "large",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Key Takeaways",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "\ud83d\udea6", title: "HALT: Hungry, Angry, Lonely, Tired", body: "Before reacting, check in with yourself. Are you hungry? Already simmering about something else? Feeling isolated? Running on too little sleep? These vulnerability factors lower your anger threshold and make everything feel worse than it is." },
            { emoji: "\ud83e\udec1", title: "Body Scan for Anger", body: "Scan from head to toe: jaw, shoulders, chest, fists, stomach. Notice where tension lives. Rate your anger 0-10. If you are at 4 or above, take action now \u2014 before it climbs higher. Your body knows before your mind does." },
          ],
        },
      },
    ]
  );

  // ── Module 3: The Timeout Technique ──────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    2,
    {
      title: "The Timeout Technique",
      subtitle: "Session 3",
      summary: "Learn and practice the most important anger management skill: the structured timeout.",
      estimatedMinutes: 45,
    },
    [
      {
        type: "TEXT",
        title: "The Timeout Technique",
        content: {
          type: "TEXT",
          body: "The timeout is the single most important anger management skill you will learn. It is simple, powerful, and works in almost every situation. The idea is straightforward: when you notice your anger rising to a level where you might say or do something harmful, you remove yourself from the situation, cool down, and return when you are calm enough to handle things constructively.\n\nThis is not the silent treatment. It is not storming off. It is not punishing the other person by disappearing. It is a deliberate, respectful strategy for protecting yourself and your relationships from the damage that happens when anger takes over.\n\n**When to Use a Timeout**\nUse a timeout when:\n- Your anger level is at a 5 or above on the 0-10 scale\n- You notice your physical warning signs ramping up (clenched jaw, racing heart, hot face)\n- You are starting to raise your voice or use harsh words\n- You feel the urge to hit, throw, or break something\n- You realize you are no longer listening to the other person and are just waiting to attack\n- You catch yourself thinking in absolutes: \"always,\" \"never,\" \"I can't stand this\"\n\nThe key is to use the timeout EARLY — before you reach a 7, 8, or 9 on the anger scale. The higher your anger climbs, the harder it is to think clearly enough to take a break.\n\n**The Timeout Steps**\n\n1. **Recognize**: Notice your warning signs. Scan your body. Acknowledge to yourself: \"I am getting too angry to handle this well right now.\"\n\n2. **Announce**: Tell the other person you need a break. Use a calm, neutral tone. Say something like:\n   - \"I need to take a break. I'll be back in 30 minutes.\"\n   - \"I'm getting too heated. Let me step away and cool down so we can talk about this productively.\"\n   - \"I need a timeout. This is important to me and I want to discuss it when I'm calmer.\"\n\n3. **Leave**: Physically leave the situation. Go for a walk, go to another room, step outside. Do not stay in the same space trying to be quiet — distance matters.\n\n4. **Cool Down**: Use active cool-down strategies. Do NOT spend this time rehearsing the argument or building your case. Instead:\n   - Walk briskly for 10-15 minutes\n   - Splash cold water on your face and wrists\n   - Do deep breathing: inhale for 4 counts, hold for 7, exhale for 8\n   - Count backwards from 100 by 7s (this forces your thinking brain to engage)\n   - Listen to calming music\n   - Do a quick workout (push-ups, jumping jacks)\n\n5. **Return**: Come back within the agreed-upon time (usually 30-60 minutes). Let the other person know you are ready to talk. If you are still too angry, let them know you need more time, but commit to a specific return time.\n\n**Timeout Agreements**\nThe timeout works best when the important people in your life understand and agree to the process. Sit down with your partner, family members, or housemates during a calm moment and create a timeout agreement:\n- Both people can call a timeout at any time\n- The person calling timeout states when they will return\n- The other person respects the timeout without following or continuing the argument\n- Both people agree that the issue will be revisited — timeout is a pause, not an escape\n- Neither person uses timeout to avoid all difficult conversations\n\n**What Timeout Is NOT**\n- It is not the silent treatment (you communicate clearly and return)\n- It is not storming off in anger (you leave calmly and intentionally)\n- It is not avoiding the issue forever (you come back to discuss it)\n- It is not weakness (it takes significant strength to walk away when you are angry)",
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 3 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Practice the timeout technique at least once this week. It can be for any level of anger or frustration, not just major conflicts. Use it as practice for when you really need it.", sortOrder: 0 },
            { type: "ACTION", description: "Create a timeout agreement with at least one key person in your life (partner, family member, roommate). Discuss the steps together during a calm moment. Write down the agreed-upon rules.", sortOrder: 1 },
            { type: "ACTION", description: "Make a list of 5 cool-down activities that work for you personally. Post the list somewhere you can see it easily (phone, fridge, wallet).", sortOrder: 2 },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Key Takeaways",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "\u23f8\ufe0f", title: "Timeout Steps: 1) Notice 2) Announce 3) Leave 4) Cool Down 5) Return", body: "Follow the steps in order every time. Do not skip the announcement \u2014 walking away without saying anything escalates conflict. Do not skip the return \u2014 avoiding the conversation is not a timeout." },
            { emoji: "\ud83d\udcaa", title: "Timeout Is Strength, Not Weakness", body: "Walking away when you are angry takes more self-control than staying and fighting. It protects your relationships, prevents regret, and shows the other person that you care enough to handle things right." },
            { emoji: "\u2744\ufe0f", title: "Cool-Down Activities", body: "Walk briskly for 10-15 minutes. Splash cold water on your face and wrists. Count backwards from 100 by 7s. Do deep breathing (4-7-8 pattern). Do 20 push-ups or jumping jacks. Listen to calming music. The goal is to engage your body and shift your brain out of fight mode." },
          ],
        },
      },
    ]
  );

  // ── Module 4: Cognitive Restructuring for Anger ──────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    3,
    {
      title: "Cognitive Restructuring for Anger",
      subtitle: "Session 4",
      summary: "Learn to identify and change the 'hot thoughts' that fuel anger.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Hot Thoughts and Cool Thoughts",
        content: {
          type: "TEXT",
          body: "Between the trigger and the angry reaction, there is always a thought. Sometimes the thought is so fast you do not even notice it, but it is there. These lightning-fast thoughts are what turn a frustrating situation into a rage-inducing one. In anger management, we call them \"hot thoughts\" because they heat up your anger.\n\n**Common Types of Hot Thoughts**\n\n1. **Demanding (\"Should\" Thinking)**: Turning your preferences into rigid demands. \"They SHOULD know better.\" \"He MUST treat me with respect.\" \"Things SHOULDN'T be this way.\" The word \"should\" is one of the most anger-producing words in the English language because it sets up an expectation that the world must operate according to your rules.\n\n2. **Catastrophizing**: Blowing things out of proportion. \"This is the worst thing that could happen.\" \"Everything is ruined.\" \"I can't take this anymore.\" When you catastrophize, a manageable frustration turns into an unbearable crisis.\n\n3. **Labeling**: Reducing a whole person to a single negative label. \"He's an idiot.\" \"She's so selfish.\" \"They're worthless.\" Labeling dehumanizes the other person and makes it easier to justify aggression toward them.\n\n4. **Mind-Reading**: Assuming you know why someone did what they did, and always assuming the worst. \"She did that on purpose to disrespect me.\" \"He knows exactly what he's doing.\" \"They don't care about me at all.\" Mind-reading fills in the blanks with the most infuriating explanation.\n\n5. **Personalizing**: Taking everything as a personal attack. \"He cut me off in traffic because he thinks he's better than me.\" \"She's late because she doesn't respect my time.\" In reality, most of what other people do has nothing to do with you.\n\n**Replacing Hot Thoughts with Cool Thoughts**\nCool thoughts are not fake positive thoughts. They are balanced, realistic thoughts that consider the full picture. The goal is not to pretend nothing is wrong — it is to think accurately so your anger matches the actual situation.\n\nHot thought: \"She SHOULD have called me back by now. She obviously doesn't care.\"\nCool thought: \"I'd prefer she called back sooner. She might be busy. I can follow up or let her know it's important to me.\"\n\nHot thought: \"This is UNBELIEVABLE. Everything always goes wrong for me.\"\nCool thought: \"This is frustrating. Not everything goes wrong — there are things going right too. What can I do to fix this specific problem?\"\n\nHot thought: \"That driver is a complete jerk.\"\nCool thought: \"That driver made a bad move. Maybe they didn't see me, or maybe they're having a terrible day. It's not worth getting worked up over.\"\n\n**How to Catch and Change Hot Thoughts**\n1. Notice your anger rising (physical warning signs)\n2. Pause and ask: \"What thought just went through my mind?\"\n3. Identify the type of hot thought (demanding, catastrophizing, labeling, mind-reading, personalizing)\n4. Ask yourself: \"Is this thought a fact or an assumption? Am I seeing the full picture? What would I tell a friend who had this thought?\"\n5. Replace the hot thought with a cooler, more balanced thought\n\nThis is not about suppressing anger or pretending things are fine. It is about making sure your anger is based on what is actually happening rather than on distorted thinking. When your thinking is accurate, your anger will match the situation — and you will be better equipped to handle it.",
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 4 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Catch at least 3 hot thoughts this week. For each one, write down: the situation, the hot thought, the type of hot thought (demanding, catastrophizing, labeling, mind-reading, personalizing), and a cooler replacement thought.", sortOrder: 0 },
            { type: "JOURNAL_PROMPT", description: "At the end of each day, review any anger episodes and identify which hot thoughts were involved. Write a brief thought record: situation, hot thought, anger level (0-10), cool thought, anger level after cool thought.", sortOrder: 1 },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Thought Record for Anger",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "Think of a recent anger episode. Write down the situation, the hot thought that fueled your anger, what type of hot thought it was, and what a cooler, more balanced thought might be. How does the cooler thought change how you feel about the situation?",
          ],
          spaceSizeHint: "large",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Key Takeaways",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "\ud83d\udd25", title: "Hot Thoughts vs Cool Thoughts", body: "Hot thoughts heat up your anger by distorting reality. Cool thoughts bring it down by seeing the full picture. Hot: \"He ALWAYS does this!\" Cool: \"He did this today and it's frustrating. Let me address it directly.\" The goal is accuracy, not positivity." },
            { emoji: "\ud83d\udeab", title: "'Should' Is a Trap", body: "Every time you say someone \"should\" or \"must\" do something, you are demanding the world operate by your rules. People will not always meet your expectations. Replace \"should\" with \"I'd prefer\" or \"It would be better if\" \u2014 and notice your anger drop." },
            { emoji: "\u2696\ufe0f", title: "Is This Worth My Peace?", body: "Before you react, ask: Will this matter in a week? In a month? In a year? Is the situation as bad as my hot thoughts are making it seem? Is my anger going to fix this or make it worse? Choose your peace over being right." },
          ],
        },
      },
    ]
  );

  // ── Module 5: Assertive Communication ──────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    4,
    {
      title: "Assertive Communication",
      subtitle: "Session 5",
      summary: "Learn the difference between passive, aggressive, and assertive communication and practice I-statements.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Communication Styles",
        content: {
          type: "TEXT",
          body: "The way you communicate when you are upset has a huge impact on whether conflicts get resolved or get worse. Most people default to one of four communication styles, especially under stress. Understanding these styles helps you recognize your patterns and shift toward the one that works best.\n\n**Passive (The Doormat)**\nPassive communicators avoid conflict at all costs. They do not speak up for themselves, give in to keep the peace, and stuff their feelings down. On the surface, they seem easygoing, but underneath, resentment builds. Eventually, the resentment explodes — and they swing to aggression, shocking everyone around them.\n- \"It's fine, whatever you want.\"\n- \"I don't care.\" (When they actually do care deeply)\n- Agreeing to things they do not want to do, then feeling angry about it later\n\n**Aggressive (The Bulldozer)**\nAggressive communicators express their needs at the expense of others. They use intimidation, blame, criticism, threats, or insults to get their way. They may get short-term results, but they destroy trust and damage relationships.\n- \"You ALWAYS do this! What is WRONG with you?\"\n- Yelling, pointing fingers, slamming things\n- Name-calling, threatening, belittling\n\n**Passive-Aggressive (The Sniper)**\nPassive-aggressive communicators express anger indirectly. They use sarcasm, the silent treatment, backhanded compliments, deliberate procrastination, or subtle sabotage. They deny being angry while behaving in ways that clearly communicate hostility.\n- \"Sure, I'd LOVE to do that.\" (dripping with sarcasm)\n- \"forgetting\" to do something they promised\n- Giving the silent treatment for days\n\n**Assertive (Direct and Respectful)**\nAssertive communicators express their needs, feelings, and boundaries clearly and directly while respecting the other person. They stand up for themselves without attacking. Assertive communication is the goal.\n- \"I feel frustrated when meetings start late because it throws off my schedule. Can we agree to start on time?\"\n- \"I disagree, and here is why.\"\n- \"I need some space right now. Can we talk about this in an hour?\"\n\n**The I-Statement Formula**\nI-statements are the core tool of assertive communication. They express how you feel and what you need without blaming or attacking the other person.\n\nThe formula is: \"I feel ___ when ___ because ___. I need ___.\" \n\nExamples:\n- \"I feel disrespected when you check your phone while I'm talking because it seems like what I'm saying doesn't matter. I need you to put your phone down during our conversations.\"\n- \"I feel overwhelmed when I come home to a messy kitchen because I've been working all day too. I need us to share the cleanup.\"\n- \"I feel hurt when plans get cancelled last minute because I had set aside that time. I need more notice if plans change.\"\n\n**Tips for Assertive Communication**\n- Use a calm, firm voice — not loud, not whispering\n- Make eye contact\n- Keep your body language open (uncrossed arms, relaxed posture)\n- Stick to the specific situation — do not bring up past grievances\n- Avoid \"you always\" and \"you never\" — these are hot thought phrases that escalate conflict\n- Listen to the other person's response with genuine curiosity\n- Be willing to compromise when appropriate, but do not abandon your core needs",
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 5 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Use an I-statement in one real situation this week. Write down the situation, what you said, and how the other person responded. Note what felt different compared to how you would have handled it before.", sortOrder: 0 },
            { type: "ACTION", description: "Identify your default communication style under stress (passive, aggressive, passive-aggressive). Write down 3 recent examples where you used that style and rewrite each using assertive communication.", sortOrder: 1 },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Key Takeaways",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "\ud83d\udde3\ufe0f", title: "Passive vs Aggressive vs Assertive", body: "Passive = you don't matter, I'll give in. Aggressive = I matter, you don't. Assertive = we both matter, let's figure this out. Assertive is the only style that protects your self-respect AND your relationships." },
            { emoji: "\ud83d\udcac", title: "The I-Statement Formula", body: "\"I feel ___ when ___ because ___. I need ___.\" This structure keeps the focus on your experience instead of attacking the other person. It is direct, honest, and respectful. Practice it until it becomes natural." },
            { emoji: "\ud83e\udd1d", title: "You Can Be Firm AND Kind", body: "Assertive does not mean aggressive. You can hold your ground, set boundaries, and express anger while still being respectful. Firmness and kindness are not opposites \u2014 they are the combination that makes people listen." },
          ],
        },
      },
    ]
  );

  // ── Module 6: Relaxation & De-escalation Skills ──────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    5,
    {
      title: "Relaxation & De-escalation Skills",
      subtitle: "Session 6",
      summary: "Learn progressive muscle relaxation, deep breathing, and grounding techniques to lower anger intensity.",
      estimatedMinutes: 45,
    },
    [
      {
        type: "TEXT",
        title: "Calming Your Body to Calm Your Mind",
        content: {
          type: "TEXT",
          body: "Anger lives in your body as much as it lives in your mind. When the fight-or-flight response is activated, your muscles tense, your breathing gets shallow, your heart pounds, and your body floods with stress hormones. You cannot think clearly in this state. The thinking part of your brain (the prefrontal cortex) goes partially offline, and the reactive part (the amygdala) takes over.\n\nRelaxation techniques work by reversing the physical stress response. When you deliberately relax your muscles, slow your breathing, and ground yourself in the present moment, you send a signal to your brain that the danger has passed. This brings the thinking brain back online so you can make better choices.\n\nThese techniques work best when you practice them regularly — not just when you are angry. Think of it like exercise: the more you train, the stronger your ability to use these skills under pressure.\n\n**Progressive Muscle Relaxation (PMR)**\nPMR involves deliberately tensing and then releasing each muscle group in your body. The contrast between tension and release teaches your muscles what true relaxation feels like.\n\nHow to do it:\n1. Find a comfortable position (sitting or lying down)\n2. Start with your feet: tense the muscles as tightly as you can for 5 seconds\n3. Release suddenly and notice the feeling of relaxation for 10-15 seconds\n4. Move up through your body: calves, thighs, buttocks, stomach, chest, hands, forearms, upper arms, shoulders, neck, face\n5. For each group: tense for 5 seconds, release for 10-15 seconds\n6. After completing all muscle groups, take a few deep breaths and notice how your body feels\n\nPractice PMR for 10-15 minutes daily. Over time, you will learn to quickly release tension in specific body parts without going through the whole sequence.\n\n**Deep Breathing Techniques**\nDeep, slow breathing is the fastest way to calm your nervous system. When you are angry, your breathing becomes shallow and rapid. Deliberately slowing it down reverses the stress response.\n\n4-7-8 Breathing:\n1. Inhale through your nose for 4 counts\n2. Hold your breath for 7 counts\n3. Exhale slowly through your mouth for 8 counts\n4. Repeat 4 times\n\nThe long exhale is the key. Exhaling slowly activates the parasympathetic nervous system (the \"rest and digest\" system), which directly counteracts the fight-or-flight response.\n\nBox Breathing (used by military and first responders):\n1. Inhale for 4 counts\n2. Hold for 4 counts\n3. Exhale for 4 counts\n4. Hold for 4 counts\n5. Repeat 4-6 times\n\n**Grounding Techniques for Anger**\nGrounding techniques pull your attention out of your angry thoughts and into the present moment. They are especially useful when your mind is racing or replaying an upsetting situation.\n\n5-4-3-2-1 Senses Grounding:\n- Name 5 things you can see\n- Name 4 things you can touch (and touch them)\n- Name 3 things you can hear\n- Name 2 things you can smell\n- Name 1 thing you can taste\n\nCold Water Reset:\nSplash cold water on your face or hold ice cubes in your hands. The cold sensation activates the dive reflex, which immediately slows your heart rate and calms your nervous system. This is one of the fastest de-escalation techniques available.\n\n**When to Use These Skills**\nUse relaxation skills proactively (daily practice to lower your baseline tension) and reactively (in the moment when anger starts building). If your anger is above a 4 on the 0-10 scale, start with breathing and grounding. If you catch it early (2-3), a quick body scan and a few deep breaths may be enough.",
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 6 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Practice Progressive Muscle Relaxation (PMR) for 10-15 minutes daily this week. Do it at a consistent time (e.g., before bed or after work) so it becomes a habit.", sortOrder: 0, isRecurring: true },
            { type: "ACTION", description: "Use deep breathing (4-7-8 or box breathing) whenever your anger rises above a 4 on the 0-10 scale. Log each time you use it and note whether your anger level dropped.", sortOrder: 1, isRecurring: true },
            { type: "ACTION", description: "Try the cold water reset at least once this week when you feel anger building. Note how quickly it affected your heart rate and anger level.", sortOrder: 2 },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Key Takeaways",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "\ud83c\udf2c\ufe0f", title: "4-7-8 Breathing", body: "Inhale for 4 counts. Hold for 7 counts. Exhale slowly for 8 counts. Repeat 4 times. The long exhale is the key \u2014 it activates your calming nervous system and directly counters the fight-or-flight response." },
            { emoji: "\ud83d\udcaa", title: "Progressive Muscle Relaxation Quick Guide", body: "Tense each muscle group hard for 5 seconds, then release for 10-15 seconds. Start at your feet and work up to your face. Do this for 10-15 minutes daily. Over time, you will be able to release tension on command." },
            { emoji: "\ud83c\udf0d", title: "Ground Yourself: 5-4-3-2-1 Senses", body: "5 things you see. 4 things you touch. 3 things you hear. 2 things you smell. 1 thing you taste. This pulls your brain out of angry thoughts and into the present moment, where the threat usually is not as big as it seems." },
          ],
        },
      },
    ]
  );

  // ── Module 7: Problem-Solving & Conflict Resolution ──────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    6,
    {
      title: "Problem-Solving & Conflict Resolution",
      subtitle: "Session 7",
      summary: "Learn structured problem-solving for recurring anger triggers and healthy conflict resolution skills.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Solving the Problem Behind the Anger",
        content: {
          type: "TEXT",
          body: "Some anger episodes are one-time events — a stranger cuts you off in traffic and you never see them again. But much of the anger that damages your life comes from recurring situations: the same argument with your partner, the same frustration at work, the same pattern with a family member. For these situations, managing your anger in the moment is not enough. You also need to solve the underlying problem.\n\n**Structured Problem-Solving**\nWhen you are angry, your brain narrows its focus to two options: fight or give up. Structured problem-solving reopens your thinking so you can see all the options available.\n\nStep 1: Define the Problem Without Blame\nState the problem as a situation to be solved, not as someone's fault.\n- Instead of: \"My coworker is lazy and dumps everything on me.\"\n- Try: \"Work is not being divided evenly on my team, and I am taking on more than my share.\"\n\nStep 2: Brainstorm Solutions\nWrite down every possible solution, even ones that seem silly or extreme. Do not judge or eliminate any option yet. The goal is quantity, not quality. Common solutions include:\n- Having a direct conversation (using I-statements)\n- Setting a boundary\n- Changing your own behavior or routine\n- Accepting what you cannot change and adjusting your expectations\n- Involving a third party (supervisor, mediator, counselor)\n- Removing yourself from the situation\n\nStep 3: Evaluate Each Solution\nFor each option, consider:\n- Will this actually solve the problem?\n- What are the risks or downsides?\n- Is this something I can realistically do?\n- Does this align with the kind of person I want to be?\n\nStep 4: Pick One and Try It\nChoose the solution that seems most likely to work and that you are willing to commit to. Do not wait for the perfect option — progress beats perfection.\n\nStep 5: Review\nAfter trying the solution, evaluate: Did it work? Did the problem improve? Do I need to adjust or try a different solution?\n\n**Conflict Resolution**\nConflicts between people require a slightly different approach because another person's needs and perspective are involved.\n\nListen First: Before stating your position, genuinely try to understand the other person's perspective. Ask open-ended questions: \"Help me understand how you see this.\" \"What matters most to you about this?\" People are far more willing to listen to you after they feel heard.\n\nFind Common Ground: In most conflicts, both people want the same underlying things — respect, fairness, connection. Identify what you agree on before diving into disagreements.\n\nCompromise: A good compromise means both people give a little and both people get something important. It is not about winning. Ask: \"What would work for both of us?\" \"What could I do differently, and what could you do differently?\"\n\nKnow When to Walk Away: Not every conflict can be resolved. Some people are not willing to compromise, and some situations cannot change. In those cases, your problem-solving options include accepting the situation, setting firm boundaries, or removing yourself from the relationship or environment.",
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 7 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Choose one recurring anger trigger in your life. Apply the 5-step problem-solving process: define the problem without blame, brainstorm at least 5 solutions, evaluate each one, pick one, and try it this week.", sortOrder: 0 },
            { type: "ACTION", description: "In one conflict or disagreement this week, practice listening first before stating your position. Note what happened differently when you led with curiosity instead of defense.", sortOrder: 1 },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Conflict Reflection",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "Think about a recurring conflict in your life \u2014 one that keeps coming back. What is the underlying problem (stated without blame)? What have you tried so far? What solutions have you not yet considered? What would a good compromise look like? What would you need to say, and how would you say it assertively?",
          ],
          spaceSizeHint: "large",
        },
      },
    ]
  );

  // ── Module 8: Maintenance & Relapse Prevention ──────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    7,
    {
      title: "Maintenance & Relapse Prevention",
      subtitle: "Session 8",
      summary: "Build your personal anger management plan and prepare for long-term success.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Keeping Your Gains",
        content: {
          type: "TEXT",
          body: "You have spent the past 7 weeks building anger management skills: recognizing triggers and warning signs, using timeouts, restructuring hot thoughts, communicating assertively, using relaxation techniques, and solving problems constructively. This final session is about making sure these skills stick.\n\nAnger management is not a cure. It is an ongoing practice, like physical fitness. You do not go to the gym for 8 weeks and then stop exercising forever. The same is true for anger management. You will have setbacks. You will lose your temper sometimes. The difference now is that you have tools to recover quickly and get back on track.\n\n**What to Expect Going Forward**\n- Progress is not linear. You will have good weeks and harder weeks.\n- Stress, fatigue, illness, and major life changes can temporarily increase anger. This is normal.\n- A setback does not erase your progress. One angry outburst does not mean you are back to square one. It means you are human.\n- The skills get easier with practice. Techniques that feel awkward now will eventually become second nature.\n\n**Warning Signs of Relapse**\n- Stopping daily tracker or self-monitoring\n- Skipping relaxation practice\n- Falling back into hot thought patterns without catching them\n- Using passive or aggressive communication instead of assertive\n- Avoiding conflicts instead of addressing them\n- Increased substance use (alcohol, drugs) to cope with anger\n- People around you commenting that your temper seems worse\n\n**Your Personal Anger Management Plan**\nThis week, you will create a written plan that you can keep and refer to whenever you need it. Your plan should include:\n\n1. My top triggers (situations, people, internal states)\n2. My personal warning signs (physical signals that anger is building)\n3. My timeout plan (what I will say, where I will go, what I will do to cool down)\n4. My go-to cool-down strategies (breathing, PMR, grounding, cold water, exercise)\n5. My hot thought traps (the types of hot thoughts I fall into most) and my cool thought replacements\n6. My assertive communication scripts (I-statements I can use for common conflicts)\n7. My support people (who I can call when I need help)\n8. My daily maintenance routine (relaxation practice, anger tracking, stress management)\n\n**Continuing the Work**\n- Keep using the daily tracker for at least 3 more months\n- Practice PMR or deep breathing daily, even on good days\n- Review your anger management plan once a month\n- Reach out to your clinician or support person if anger starts escalating\n- Remember: asking for help is a sign of strength, not failure",
        },
      },
      {
        type: "ASSESSMENT",
        title: "Anger Assessment — Final",
        content: {
          type: "ASSESSMENT",
          title: "Anger Expression Inventory — Final",
          instructions:
            "Read each statement and select the response that best describes how often you have experienced the following over the past two weeks. Compare your responses to your baseline assessment from Session 1.",
          scoringMethod: "SUM",
          questions: [
            { question: "I feel angry.", type: "LIKERT", required: true, sortOrder: 0, likertMin: 1, likertMax: 4, likertMinLabel: "Almost Never", likertMaxLabel: "Almost Always" },
            { question: "I feel irritated or annoyed.", type: "LIKERT", required: true, sortOrder: 1, likertMin: 1, likertMax: 4, likertMinLabel: "Almost Never", likertMaxLabel: "Almost Always" },
            { question: "I feel furious or enraged.", type: "LIKERT", required: true, sortOrder: 2, likertMin: 1, likertMax: 4, likertMinLabel: "Almost Never", likertMaxLabel: "Almost Always" },
            { question: "I express my anger outwardly (yelling, arguing, slamming things).", type: "LIKERT", required: true, sortOrder: 3, likertMin: 1, likertMax: 4, likertMinLabel: "Almost Never", likertMaxLabel: "Almost Always" },
            { question: "I hold my anger in and do not show it.", type: "LIKERT", required: true, sortOrder: 4, likertMin: 1, likertMax: 4, likertMinLabel: "Almost Never", likertMaxLabel: "Almost Always" },
            { question: "I say nasty or hurtful things when I am angry.", type: "LIKERT", required: true, sortOrder: 5, likertMin: 1, likertMax: 4, likertMinLabel: "Almost Never", likertMaxLabel: "Almost Always" },
            { question: "I feel like hitting or breaking something when I am angry.", type: "LIKERT", required: true, sortOrder: 6, likertMin: 1, likertMax: 4, likertMinLabel: "Almost Never", likertMaxLabel: "Almost Always" },
            { question: "My anger has caused problems in my relationships.", type: "LIKERT", required: true, sortOrder: 7, likertMin: 1, likertMax: 4, likertMinLabel: "Almost Never", likertMaxLabel: "Almost Always" },
            { question: "I am able to calm myself down when I start feeling angry.", type: "LIKERT", required: true, sortOrder: 8, likertMin: 1, likertMax: 4, likertMinLabel: "Almost Never", likertMaxLabel: "Almost Always" },
            { question: "I can talk about what is bothering me in a calm, respectful way.", type: "LIKERT", required: true, sortOrder: 9, likertMin: 1, likertMax: 4, likertMinLabel: "Almost Never", likertMaxLabel: "Almost Always" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 8 Practice — Anger Management Plan",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Write your personal Anger Management Plan covering all 8 areas: triggers, warning signs, timeout plan, cool-down strategies, hot thought traps with cool thought replacements, assertive scripts, support people, and daily maintenance routine.", sortOrder: 0 },
            { type: "ACTION", description: "Share your plan with at least one support person and ask them to help you stay accountable.", sortOrder: 1 },
            { type: "ACTION", description: "Continue using the daily anger tracker for at least 3 more months. Set a reminder to review your anger management plan once per month.", sortOrder: 2 },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Key Takeaways",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "\ud83d\udcdd", title: "My Anger Management Plan Checklist", body: "1. My top triggers \u2714\ufe0f 2. My warning signs \u2714\ufe0f 3. My timeout plan \u2714\ufe0f 4. My cool-down strategies \u2714\ufe0f 5. My hot thought traps + cool thoughts \u2714\ufe0f 6. My assertive scripts \u2714\ufe0f 7. My support people \u2714\ufe0f 8. My daily routine \u2714\ufe0f. Write it down. Keep it where you can see it. Review it monthly." },
          ],
        },
      },
    ]
  );

  // ── Daily Tracker: Anger Log ──────────────────────
  const angerTracker = await prisma.dailyTracker.create({
    data: {
      programId: program.id,
      createdById: clinicianId,
      name: "Anger Log",
      description: "Track your daily anger levels, episodes, and coping skill usage.",
    },
  });

  await prisma.dailyTrackerField.createMany({
    data: [
      { trackerId: angerTracker.id, label: "Highest Anger Level Today", fieldType: "SCALE", sortOrder: 0, isRequired: true, options: { min: 0, max: 10, minLabel: "No anger", maxLabel: "Extreme anger" } },
      { trackerId: angerTracker.id, label: "Number of Anger Episodes", fieldType: "NUMBER", sortOrder: 1, isRequired: true },
      { trackerId: angerTracker.id, label: "Used Coping Skill", fieldType: "YES_NO", sortOrder: 2, isRequired: true },
      { trackerId: angerTracker.id, label: "Used Timeout", fieldType: "YES_NO", sortOrder: 3, isRequired: true },
      { trackerId: angerTracker.id, label: "Aggressive Behavior", fieldType: "YES_NO", sortOrder: 4, isRequired: true },
      { trackerId: angerTracker.id, label: "Notes", fieldType: "FREE_TEXT", sortOrder: 5, isRequired: false },
    ],
  });

  return program;
}


// ============================================================================
// TEMPLATE 10 — Parenting Skills (PCIT / Parent Management Training) — 10 Modules
// ============================================================================
export async function seedTemplate10_ParentingSkills(prisma: any, clinicianId: string) {
  const program = await prisma.program.create({
    data: {
      clinicianId,
      title: "Parenting Skills",
      description:
        "A 10-week evidence-based parenting program grounded in Parent-Child Interaction Therapy (PCIT) and Parent Management Training (PMT). Teaches positive attention strategies, effective commands, structured discipline, and behavior management techniques to reduce child behavior problems and strengthen the parent-child relationship.",
      category: "Parenting",
      durationWeeks: 10,
      cadence: "WEEKLY",
      sessionType: "ONE_ON_ONE",
      isTemplate: true,
      status: "PUBLISHED",
    },
  });

  // ── Module 1: Understanding Child Behavior ──────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    0,
    {
      title: "Understanding Child Behavior",
      subtitle: "Session 1",
      summary: "Learn why children misbehave and how the behavior equation (antecedent + behavior + consequence) works.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Why Children Misbehave",
        content: {
          type: "TEXT",
          body: "Every parent deals with challenging child behavior. Tantrums, defiance, whining, hitting, refusing to follow directions — these behaviors are stressful and exhausting. But they are also normal parts of child development. Understanding why children misbehave is the first step toward changing the pattern.\n\n**Common Reasons Children Misbehave**\n\n1. **Attention-Seeking**: Children need attention like they need food and water. If they cannot get positive attention (praise, play, conversation), they will seek negative attention (acting out, whining, breaking rules). Negative attention is still attention, and for a child, any attention is better than being ignored.\n\n2. **Testing Boundaries**: Children are constantly learning where the limits are. When a child breaks a rule, they are often asking: \"Is this rule real? What happens if I push past it?\" This is not defiance for the sake of defiance — it is how children learn about the world and their place in it.\n\n3. **Skill Deficits**: Sometimes children misbehave because they genuinely do not have the skills to do what is being asked. A 3-year-old who hits when frustrated may not yet have the language skills to say \"I'm angry.\" A 6-year-old who has messy tantrums may not have learned how to manage big emotions. They are not choosing to be difficult — they are struggling with something they have not yet learned.\n\n4. **Developmental Stage**: What looks like misbehavior is often age-appropriate behavior. Toddlers say \"no\" to everything because they are developing independence. Preschoolers have meltdowns because their emotional brains are growing faster than their ability to regulate. Older children push back as they develop their own identity. Knowing what is typical for your child's age helps you set realistic expectations.\n\n5. **Stress and Transitions**: Changes in routine, family stress, a new sibling, moving, starting school, parental conflict — all of these can trigger increased behavior problems. Children often express stress through their behavior because they do not have the words or self-awareness to say \"I'm stressed.\"\n\n**The Behavior Equation**\nAll behavior follows a predictable pattern called the ABC model:\n\n**A — Antecedent** (What happens before the behavior)\nThis is the trigger or the situation. It includes what you asked the child to do, what was happening in the environment, and the child's internal state (tired, hungry, overstimulated).\n\n**B — Behavior** (What the child does)\nThis is the specific, observable action. Describe it in concrete terms: \"She screamed and threw her toy\" rather than \"She had a bad attitude.\"\n\n**C — Consequence** (What happens after the behavior)\nThis is the most important part. The consequence determines whether the behavior will happen again. If the child gets what they want after a tantrum (the toy, your attention, escape from a task), the tantrum is more likely to happen next time. If the tantrum does not work and calm behavior does, the child learns to use calm behavior instead.\n\n**The Key Insight**\nYou cannot directly control your child's behavior. But you can control the antecedents (how you set up situations) and the consequences (how you respond). By changing what comes before and after the behavior, you change the behavior itself.\n\nThis program will teach you specific, research-backed techniques for:\n- Giving your child plenty of positive attention so they do not need to seek negative attention\n- Setting clear expectations and giving effective commands\n- Responding to misbehavior in ways that reduce it over time\n- Building a stronger, more positive relationship with your child",
        },
      },
      {
        type: "ASSESSMENT",
        title: "Child Behavior Inventory — Baseline",
        content: {
          type: "ASSESSMENT",
          title: "Child Behavior Inventory — Baseline",
          instructions:
            "Please rate how often your child displays each of the following behaviors. Think about the past two weeks.",
          scoringMethod: "SUM",
          questions: [
            { question: "Refuses to obey instructions or rules.", type: "LIKERT", required: true, sortOrder: 0, likertMin: 1, likertMax: 7, likertMinLabel: "Never", likertMaxLabel: "Always" },
            { question: "Has tantrums or meltdowns.", type: "LIKERT", required: true, sortOrder: 1, likertMin: 1, likertMax: 7, likertMinLabel: "Never", likertMaxLabel: "Always" },
            { question: "Whines or cries to get their way.", type: "LIKERT", required: true, sortOrder: 2, likertMin: 1, likertMax: 7, likertMinLabel: "Never", likertMaxLabel: "Always" },
            { question: "Argues with adults.", type: "LIKERT", required: true, sortOrder: 3, likertMin: 1, likertMax: 7, likertMinLabel: "Never", likertMaxLabel: "Always" },
            { question: "Acts aggressively (hitting, kicking, biting, throwing things).", type: "LIKERT", required: true, sortOrder: 4, likertMin: 1, likertMax: 7, likertMinLabel: "Never", likertMaxLabel: "Always" },
            { question: "Destroys toys or other objects.", type: "LIKERT", required: true, sortOrder: 5, likertMin: 1, likertMax: 7, likertMinLabel: "Never", likertMaxLabel: "Always" },
            { question: "Has difficulty playing with other children.", type: "LIKERT", required: true, sortOrder: 6, likertMin: 1, likertMax: 7, likertMinLabel: "Never", likertMaxLabel: "Always" },
            { question: "Has difficulty paying attention or staying on task.", type: "LIKERT", required: true, sortOrder: 7, likertMin: 1, likertMax: 7, likertMinLabel: "Never", likertMaxLabel: "Always" },
            { question: "Gets easily frustrated.", type: "LIKERT", required: true, sortOrder: 8, likertMin: 1, likertMax: 7, likertMinLabel: "Never", likertMaxLabel: "Always" },
            { question: "Has difficulty following routines (bedtime, morning, meals).", type: "LIKERT", required: true, sortOrder: 9, likertMin: 1, likertMax: 7, likertMinLabel: "Never", likertMaxLabel: "Always" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 1 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Observe and log your child's behavior for one week without changing anything. For each notable behavior (positive or negative), write down the Antecedent (what happened before), the Behavior (what the child did), and the Consequence (what happened after, including your response).", sortOrder: 0 },
            { type: "ACTION", description: "Count how many positive interactions (praise, smiles, physical affection, engaged conversation) vs. corrective interactions (commands, criticism, redirection, scolding) you have with your child in one typical day. Write down the numbers.", sortOrder: 1 },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Key Takeaways",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "\ud83d\udca1", title: "All Behavior Is Communication", body: "When your child acts out, they are telling you something: I need attention. I'm overwhelmed. I don't know how to do this. I'm testing the limits. Instead of asking \"Why is my child being bad?\" ask \"What is my child trying to tell me?\"" },
            { emoji: "\u2b50", title: "Catch Them Being Good", body: "Children repeat behaviors that get attention. If you only notice misbehavior, your child learns that acting out is the best way to get your attention. Make a deliberate effort to notice and praise good behavior \u2014 even small things like playing quietly, sharing, or following a direction without being asked twice." },
          ],
        },
      },
    ]
  );

  // ── Module 2: Special Time (Child-Directed Interaction) ──────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    1,
    {
      title: "Special Time (Child-Directed Interaction)",
      subtitle: "Session 2",
      summary: "Learn to conduct daily special time using child-led play and PRIDE skills.",
      estimatedMinutes: 45,
    },
    [
      {
        type: "TEXT",
        title: "The Power of Special Time",
        content: {
          type: "TEXT",
          body: "Special Time is one of the most powerful tools in this entire program. It is 15 minutes of daily, one-on-one, child-led play where your only job is to follow your child's lead and shower them with positive attention. It sounds simple, but the effects are profound.\n\n**What Special Time Is**\nSpecial Time is a daily 15-minute period where:\n- Your child chooses the activity (within reason — constructive play, not screens)\n- You follow their lead completely\n- You give them your undivided attention (no phone, no other children, no multitasking)\n- You use PRIDE skills (explained below)\n- You do NOT give commands, ask leading questions, or criticize\n\n**What Special Time Is NOT**\n- It is not a reward for good behavior (it happens every day regardless)\n- It is not regular playtime (it has specific rules about what you do and do not do)\n- It is not a teaching moment (resist the urge to correct, instruct, or quiz)\n- It is not screen time or watching TV together\n\n**Why Special Time Works**\nSpecial Time works because it directly addresses the number one cause of child behavior problems: the need for attention. When children get 15 minutes of focused, positive, unconditional attention every day, their need to seek attention through misbehavior drops dramatically.\n\nSpecial Time also rebuilds the parent-child relationship. When interactions have become mostly negative (commands, corrections, arguments), both parent and child start to dread being around each other. Special Time creates a daily experience of genuine enjoyment and connection.\n\n**The PRIDE Skills**\nDuring Special Time, use these five skills:\n\n**P — Praise**: Give specific, labeled praise. \"Great job stacking those blocks so carefully!\" \"I love how you are sharing the crayons with me!\" (Not just \"Good job.\")\n\n**R — Reflect**: Repeat or paraphrase what your child says. Child: \"I'm making a castle.\" Parent: \"You're building a big castle!\" This shows you are listening and interested.\n\n**I — Imitate**: Copy what your child is doing. If they stack blocks, you stack blocks. If they draw a sun, you draw a sun. This tells the child: \"What you are doing matters. I want to do it too.\"\n\n**D — Describe**: Narrate what your child is doing like a sportscaster. \"You're putting the red block on top of the blue one. Now you're reaching for the green one.\" This communicates that you are paying close attention.\n\n**E — Enthusiasm**: Show genuine excitement and warmth. Smile, use an animated voice, lean in. Your enthusiasm tells your child that spending time with them is enjoyable, not a chore.\n\n**Rules for Special Time**\nDuring Special Time, avoid:\n- **Commands**: Do not tell the child what to do. No \"Put that there\" or \"Why don't you try this?\"\n- **Questions**: Minimize questions, especially leading ones. Questions put you in charge. Instead of \"What color is that?\" say \"You picked the blue one!\"\n- **Criticism**: No correcting, teaching, or negative comments. If the child draws a green sun, do not say \"Suns are yellow.\" Say \"You're drawing a bright green sun!\"\n\n**Getting Started**\n1. Pick a consistent daily time (after school, before dinner, etc.)\n2. Set a timer for 15 minutes\n3. Let your child choose the activity\n4. Practice PRIDE skills for the full 15 minutes\n5. When the timer goes off, say something like: \"Our special time is over for today. I really enjoyed playing with you. We'll do it again tomorrow.\"\n\nMost parents report noticeable changes in their child's behavior within 1-2 weeks of consistent Special Time.",
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 2 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Conduct 15 minutes of Special Time every day this week. Set a timer, let your child choose the activity, and practice all 5 PRIDE skills (Praise, Reflect, Imitate, Describe, Enthusiasm). Log each session: what activity your child chose, which PRIDE skills you used, and how your child responded.", sortOrder: 0, isRecurring: true },
            { type: "ACTION", description: "After each Special Time session, note how you felt and how your child seemed. Did you notice any changes in their behavior in the hours after Special Time?", sortOrder: 1, isRecurring: true },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Key Takeaways",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "\u23f0", title: "Special Time Rules", body: "15 minutes. Every day. Child chooses the activity. No commands. No questions. No criticism. No phone. Just you, your child, and your full attention. Set a timer and commit." },
            { emoji: "\ud83c\udfc6", title: "PRIDE Skills", body: "Praise (specific). Reflect (repeat what they say). Imitate (copy what they do). Describe (narrate their play). Enthusiasm (show genuine joy). These 5 skills fill your child's attention tank so they do not need to act out to get noticed." },
            { emoji: "\ud83c\udfa8", title: "Describe, Don't Direct", body: "Instead of telling your child what to do during play, describe what they are already doing. \"You're building a tall tower!\" instead of \"Try putting the red one on top.\" Following their lead shows respect and builds confidence." },
          ],
        },
      },
    ]
  );

  // ── Module 3: Labeled Praise & Positive Attention ──────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    2,
    {
      title: "Labeled Praise & Positive Attention",
      subtitle: "Session 3",
      summary: "Master the art of labeled praise and build a 5:1 ratio of positive to corrective interactions.",
      estimatedMinutes: 45,
    },
    [
      {
        type: "TEXT",
        title: "The Power of Labeled Praise",
        content: {
          type: "TEXT",
          body: "Praise is the most underused parenting tool available. Most parents give far more corrections, commands, and criticisms than they give praise. Research consistently shows that a high ratio of positive attention to corrective attention is one of the strongest predictors of good child behavior and a healthy parent-child relationship.\n\n**Generic Praise vs. Labeled Praise**\nNot all praise is equally effective.\n\nGeneric praise is vague: \"Good job.\" \"Nice.\" \"Way to go.\" It tells the child you approve, but it does not tell them exactly what they did right. The child has to guess what you liked.\n\nLabeled praise is specific: \"Great job putting your shoes on all by yourself!\" \"I love how gently you are petting the dog.\" \"Thank you for using your indoor voice.\" Labeled praise tells the child exactly which behavior you want to see again.\n\nLabeled praise is more effective because:\n- It teaches the child which specific behaviors you value\n- It is more believable (\"Good job\" can sound hollow; specific praise sounds genuine)\n- It builds the child's competence and confidence (they know exactly what they did well)\n- It increases the chance the behavior will happen again\n\n**Examples of Labeled Praise**\n- \"Thank you for coming the first time I called you.\" (compliance)\n- \"I noticed you shared your snack with your brother. That was very kind.\" (sharing)\n- \"You worked really hard on that homework even though it was tough. I'm proud of your effort.\" (persistence)\n- \"Great job using your words to tell me you were frustrated instead of yelling.\" (emotional regulation)\n- \"I love how you put your plate in the sink without being asked.\" (responsibility)\n- \"You waited so patiently while I was on the phone. Thank you.\" (patience)\n\n**The 5:1 Ratio**\nResearch shows that the healthiest relationships — including parent-child relationships — have at least 5 positive interactions for every 1 negative interaction. This is called the 5:1 ratio.\n\nMost parents in struggling relationships with their children are at a 1:1 ratio or even a 1:5 ratio (more negatives than positives). Shifting this ratio is one of the fastest ways to improve your child's behavior and your relationship with them.\n\nTo build your ratio:\n- Give labeled praise every time you notice your child doing something positive, even small things\n- Praise effort, not just results (\"You tried so hard\" matters more than \"You got it right\")\n- Praise the absence of problem behavior (\"You played so nicely with your sister all morning\")\n- Catch behaviors you normally take for granted (sitting quietly, eating without complaint, following a routine)\n\n**What You Pay Attention To Grows**\nThis is the single most important principle in parenting: behaviors that get attention increase, and behaviors that are ignored decrease. If you spend most of your energy reacting to misbehavior, misbehavior grows. If you spend most of your energy noticing and praising good behavior, good behavior grows.\n\nThis does not mean you ignore all misbehavior (later sessions cover how to respond effectively). It means you deliberately shift your attention toward the positive. Think of praise as sunlight — whatever you shine it on will grow.",
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 3 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Give at least 10 labeled praises per day this week. Keep a tally on your phone or a piece of paper. Make sure each praise is specific (says exactly what the child did right, not just \"good job\").", sortOrder: 0, isRecurring: true },
            { type: "ACTION", description: "Track your positive-to-negative interaction ratio for at least one full day. Count every praise, smile, hug, and positive comment as a positive interaction. Count every command, correction, criticism, and raised voice as a negative interaction. What is your ratio?", sortOrder: 1 },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Noticing the Positive",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "After one week of intentional labeled praise, what changes have you noticed? How did your child respond to the increased positive attention? Did you notice any changes in their behavior? How did it feel for you to focus on catching good behavior instead of correcting bad behavior? What was hardest about this exercise?",
          ],
          spaceSizeHint: "large",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Key Takeaways",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "\u2b50", title: "Labeled Praise Examples", body: "\"Thank you for coming when I called.\" \"I love how you shared with your sister.\" \"Great job putting your shoes on by yourself.\" \"You used your words instead of yelling \u2014 that was awesome.\" Be specific. Be genuine. Be frequent." },
            { emoji: "\ud83d\udcca", title: "The 5:1 Ratio", body: "For every correction, command, or criticism, aim for at least 5 praises, smiles, or positive interactions. Most struggling families are at 1:1 or worse. Track your ratio for one day \u2014 the number will surprise you." },
            { emoji: "\ud83c\udf31", title: "What You Pay Attention To Grows", body: "Behaviors that get attention increase. Behaviors that are ignored decrease. If you want more good behavior, shine your attention on it. Praise is free, unlimited, and the most powerful behavior change tool you have." },
          ],
        },
      },
    ]
  );

  // ── Module 4: Active Ignoring ──────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    3,
    {
      title: "Active Ignoring",
      subtitle: "Session 4",
      summary: "Learn planned ignoring for minor misbehavior and how to pair it with praise when the behavior stops.",
      estimatedMinutes: 45,
    },
    [
      {
        type: "TEXT",
        title: "The Art of Active Ignoring",
        content: {
          type: "TEXT",
          body: "Active ignoring is one of the most effective — and most difficult — parenting techniques. It works by removing the attention that fuels minor misbehavior. When a child whines, throws a tantrum, makes silly noises for attention, or repeats an annoying behavior to get a reaction, active ignoring removes the payoff.\n\n**How Active Ignoring Works**\nRemember the principle from last session: behaviors that get attention increase. This works in reverse too: behaviors that get no attention decrease. When you actively ignore a minor misbehavior, you are removing the fuel that keeps it going.\n\n**The Steps of Active Ignoring**\n1. **Decide**: Quickly determine if the behavior is safe to ignore (see guidelines below).\n2. **Turn Away**: Physically turn your body away from the child. Do not make eye contact.\n3. **Zero Attention**: Give absolutely no attention to the behavior — no eye contact, no sighing, no facial expressions, no commentary, no arguing, no explaining. Pretend the behavior is invisible.\n4. **Stay Calm**: This is the hardest part. The child will likely escalate the behavior before stopping (this is called an \"extinction burst\" — it gets worse before it gets better). Stay calm and keep ignoring.\n5. **Praise Immediately When the Behavior Stops**: The moment the child stops the unwanted behavior and does something appropriate (even if it is just being quiet for a few seconds), turn back toward them, make eye contact, and give specific labeled praise. \"Thank you for using your calm voice. Now I can listen to you.\"\n\n**What TO Ignore (Minor, Attention-Seeking Behaviors)**\n- Whining\n- Pouting or sulking\n- Mild tantrums (crying, foot-stomping when they do not get what they want)\n- Making silly noises or faces for attention\n- Repeating the same request after you have said no\n- Talking back or arguing (after you have stated your decision once)\n- Dramatic displays of frustration (flopping on the floor, sighing loudly)\n\n**What NOT to Ignore (Dangerous or Destructive Behaviors)**\n- Hitting, kicking, biting, or any physical aggression toward people\n- Destroying property\n- Self-harm\n- Running into the street or other safety issues\n- Extreme verbal aggression or threats\n\nThese behaviors need an immediate, calm response (which you will learn in later sessions). They should never be ignored.\n\n**The Extinction Burst**\nWhen you first start ignoring a behavior that used to get attention, the behavior will almost always get worse before it gets better. The child is thinking: \"This used to work. Maybe I'm not doing it hard enough.\" So they scream louder, whine more intensely, or have a bigger tantrum.\n\nThis is normal and expected. If you give in during the extinction burst, you teach the child that escalating works — and the behavior will be worse than before. If you hold firm, the behavior will decrease significantly within a few days to a week.\n\n**The Golden Rule of Active Ignoring**\nActive ignoring ONLY works when paired with positive attention for good behavior. If you ignore misbehavior but also ignore good behavior, the child has no way to earn your attention. The equation is: ignore the negative + praise the positive = behavior change.",
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 4 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Identify 2 specific minor, attention-seeking behaviors your child does that you will actively ignore this week. Write down the behaviors and commit to giving zero attention when they happen.", sortOrder: 0 },
            { type: "ACTION", description: "Each time you actively ignore a behavior, log what happened: the behavior, how long it lasted, whether it escalated (extinction burst), and what your child did when it stopped. Praise immediately when the behavior stops.", sortOrder: 1, isRecurring: true },
            { type: "ACTION", description: "Continue giving 10+ labeled praises per day and conducting daily Special Time. Active ignoring only works when there is plenty of positive attention for good behavior.", sortOrder: 2, isRecurring: true },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Key Takeaways",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "\ud83d\ude48", title: "Active Ignoring Steps", body: "1. Decide: Is it safe to ignore? 2. Turn Away: No eye contact. 3. Zero Attention: No sighs, no comments, no reactions. 4. Stay Calm: It will get worse before it gets better. 5. Praise: The instant the behavior stops, turn back and praise." },
            { emoji: "\u2705\u274c", title: "What to Ignore vs What NOT to Ignore", body: "IGNORE: whining, pouting, mild tantrums, silly noises, repeated requests after 'no,' dramatic sighing. DO NOT IGNORE: hitting, kicking, biting, destroying property, self-harm, running into danger. Safety always comes first." },
            { emoji: "\ud83e\uddd8", title: "Stay Calm \u2014 They're Testing", body: "When you start ignoring, the behavior WILL get worse before it gets better. This is called an extinction burst. Your child is testing: \"Does this still work?\" If you hold firm, they learn it doesn't. If you give in, they learn to escalate. Stay the course." },
          ],
        },
      },
    ]
  );

  // ── Module 5: Effective Commands ──────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    4,
    {
      title: "Effective Commands",
      subtitle: "Session 5",
      summary: "Learn how to give commands that work: specific, calm, one at a time, with follow-through.",
      estimatedMinutes: 45,
    },
    [
      {
        type: "TEXT",
        title: "Commands That Work",
        content: {
          type: "TEXT",
          body: "One of the most common sources of parent-child conflict is commands — telling your child what to do. Many behavior problems are not actually about defiance; they are about how the command was given. Research shows that changing the way you give commands can dramatically improve compliance without any punishment needed.\n\n**Why Commands Fail**\nMost parents make the same mistakes with commands:\n\n1. **Question Commands**: \"Can you put your shoes on?\" \"Would you like to clean up now?\" These sound polite, but they give the child the option to say no. If it is not optional, do not phrase it as a question.\n\n2. **Chain Commands**: \"Go upstairs, brush your teeth, put on your pajamas, pick out a book, and get in bed.\" This is 5 commands in one sentence. Most children can hold 1-2 instructions at a time. Chain commands set them up to fail.\n\n3. **Vague Commands**: \"Be good.\" \"Clean up.\" \"Behave yourself.\" These mean different things to different people. Your child may genuinely not know what you expect.\n\n4. **Repeated Commands**: Saying the same thing 5 times, getting louder each time. This teaches the child they do not need to listen until you yell.\n\n5. **Shouted Commands from Across the Room**: \"COME SET THE TABLE!\" yelled from the kitchen while the child is watching TV in another room. The command gets lost in the distance and competes with the distraction.\n\n**How to Give Effective Commands**\n\nStep 1: **Get Close** — Walk over to your child. Get within arm's reach. Do not yell commands from another room.\n\nStep 2: **Get Their Attention** — Say their name and wait for eye contact. Gently touch their shoulder if needed. Make sure they are looking at you before you speak.\n\nStep 3: **Use a Firm, Calm Voice** — Not angry, not pleading, not questioning. Firm and matter-of-fact.\n\nStep 4: **Be Specific** — Tell them exactly what to do. \"Please put your shoes on the shoe rack by the door\" is far better than \"Clean up.\"\n\nStep 5: **One Command at a Time** — Give one instruction. Wait for it to be completed before giving the next one.\n\nStep 6: **Wait 5 Seconds** — After giving the command, be silent and wait. Count to 5 slowly in your head. Most children need a moment to process. Do not repeat the command, nag, or explain. Just wait.\n\nStep 7: **Follow Through** — If the child complies, praise immediately: \"Thank you for putting your shoes away the first time I asked!\" If the child does not comply after 5 seconds, calmly give the command one more time. If they still do not comply, follow through with a consequence (covered in later sessions).\n\n**Do vs. Don't Commands**\nTell children what TO do rather than what NOT to do.\n- Instead of \"Stop running\" → \"Please walk.\"\n- Instead of \"Don't yell\" → \"Please use your indoor voice.\"\n- Instead of \"Stop hitting your brother\" → \"Keep your hands to yourself.\"\n\nPositive commands give children a clear action to take. Negative commands only tell them to stop, without providing an alternative behavior.\n\n**Realistic Expectations**\nNo child will comply 100% of the time. A realistic compliance goal is 75-80%. If your child is complying with most commands most of the time, you are in a healthy range. Expecting perfection creates frustration for both of you.",
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 5 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Practice effective commands this week using all the steps: get close, get attention, calm firm voice, be specific, one at a time, wait 5 seconds, follow through with praise for compliance. Track your child's compliance rate over the week (how many commands followed vs. not followed).", sortOrder: 0, isRecurring: true },
            { type: "ACTION", description: "Identify 3 commands you frequently give that are vague, question-based, or chain commands. Rewrite each as a specific, direct, one-step command.", sortOrder: 1 },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Key Takeaways",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "\ud83d\udcdd", title: "Effective Command Checklist", body: "1. Get close. 2. Get eye contact. 3. Calm, firm voice. 4. Be specific. 5. One command at a time. 6. Wait 5 seconds silently. 7. Praise compliance or follow through with consequence." },
            { emoji: "\u261d\ufe0f", title: "One Command at a Time", body: "\"Go brush your teeth, put on pajamas, and get in bed\" is 3 commands. Give one: \"Please go brush your teeth.\" When they return, give the next. Setting children up for success means keeping it simple." },
            { emoji: "\u23f3", title: "5-Second Rule: Wait Before Repeating", body: "After giving a command, stop talking. Count slowly to 5. Most children need processing time. Repeating immediately teaches them to tune you out. Silence after a command is powerful." },
          ],
        },
      },
    ]
  );

  // ── Module 6: Natural & Logical Consequences ──────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    5,
    {
      title: "Natural & Logical Consequences",
      subtitle: "Session 6",
      summary: "Learn the difference between natural and logical consequences and how to use them effectively.",
      estimatedMinutes: 45,
    },
    [
      {
        type: "TEXT",
        title: "Consequences That Teach",
        content: {
          type: "TEXT",
          body: "Consequences are one of the most important tools in parenting, but many parents struggle with using them effectively. The goal of a consequence is not to punish — it is to teach. When consequences are used well, children learn that their choices have predictable outcomes, which helps them make better choices in the future.\n\n**Natural Consequences**\nNatural consequences happen on their own, without any action from you. They are the natural result of a child's behavior.\n\n- Forgetting their lunch → being hungry at school\n- Not wearing a coat → feeling cold\n- Being rough with a toy → the toy breaks\n- Not studying → getting a poor grade\n\nNatural consequences are powerful teachers because the lesson comes from reality, not from you. The child cannot argue with you about it — the consequence just happens.\n\nWhen to let natural consequences play out:\n- The consequence is not dangerous\n- The consequence is not too severe for the child's age\n- The child can learn from the experience\n\nWhen NOT to use natural consequences:\n- The natural consequence involves danger (running into traffic, touching a hot stove)\n- The consequence is too far in the future for the child to connect it to the behavior\n- The consequence affects other people unfairly\n\n**Logical Consequences**\nLogical consequences are set up by you, the parent, but they are directly related to the behavior. They are the \"then\" in an \"if... then\" statement.\n\n- If you throw your toy → the toy goes away for the rest of the day\n- If you do not finish homework before dinner → no screen time after dinner\n- If you hit your sibling → you lose the privilege of playing together and must play separately for 30 minutes\n- If you do not clean up your mess → you do not get to start a new activity until the mess is cleaned\n\n**Rules for Effective Logical Consequences**\n\n1. **Related**: The consequence must be connected to the behavior. Taking away dessert because a child did not clean their room does not make logical sense. Taking away the toy that was thrown does.\n\n2. **Reasonable**: The consequence must be proportional. Grounding a child for a week because they forgot to put away their backpack is too extreme. Losing screen time for the evening is proportional.\n\n3. **Respectful**: Deliver the consequence in a calm, matter-of-fact voice. No yelling, no shaming, no long lectures. \"You threw the toy, so the toy is going away for today. You can have it back tomorrow.\"\n\n4. **Revealed in Advance**: Whenever possible, tell the child what the consequence will be before the behavior happens. \"If you throw your food, dinner is over.\" This gives the child a chance to make a good choice. It also removes the sense that you are being arbitrary or unfair.\n\n**How to Deliver a Logical Consequence**\n1. State what happened: \"You threw your toy.\"\n2. State the consequence: \"The toy goes away for the rest of today.\"\n3. Follow through immediately (remove the toy)\n4. Keep it brief: Do not lecture. Do not say \"I told you so.\" Do not re-explain for 5 minutes.\n5. Move on: After the consequence is delivered, return to normal interaction. Do not hold a grudge.\n\n**Common Mistakes**\n- Making consequences too harsh in the heat of the moment (\"You're grounded for a month!\")\n- Threatening consequences you do not follow through on\n- Using consequences that are unrelated to the behavior\n- Delivering consequences with anger, sarcasm, or shaming\n- Not following through consistently (sometimes enforcing, sometimes not)",
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 6 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Identify 3 recurring problem behaviors and write a logical consequence for each using the 4 Rs: Related, Reasonable, Respectful, and Revealed in advance. Discuss these with your child during a calm moment.", sortOrder: 0 },
            { type: "ACTION", description: "Use at least one logical consequence this week. Log what happened: the behavior, the consequence you gave, how you delivered it (voice, tone), and how your child responded.", sortOrder: 1 },
            { type: "ACTION", description: "Allow at least one natural consequence to occur this week (as long as it is safe). Resist the urge to rescue or lecture. Afterward, briefly empathize: \"That was tough, wasn't it?\" and let the lesson stand.", sortOrder: 2 },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Key Takeaways",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "\ud83c\udf3f", title: "Natural vs Logical Consequences", body: "Natural: Reality teaches the lesson (no coat = cold). Logical: You set up a consequence connected to the behavior (throw toy = toy goes away). Both teach better than punishment because the child sees the direct link between their choice and the outcome." },
            { emoji: "\ud83d\udccf", title: "The Consequence Formula", body: "Related (connected to the behavior). Reasonable (proportional, not extreme). Respectful (calm voice, no shaming). Revealed in advance (\"If you do X, then Y will happen\"). Hit all 4 Rs and consequences become teaching tools, not punishments." },
            { emoji: "\ud83e\uddd8", title: "Keep It Calm, Keep It Brief", body: "State what happened. State the consequence. Follow through. Move on. No lectures, no \"I told you so,\" no anger. The calmer you are, the more the child focuses on their own behavior instead of your reaction." },
          ],
        },
      },
    ]
  );

  // ── Module 7: Timeout & Structured Discipline ──────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    6,
    {
      title: "Timeout & Structured Discipline",
      subtitle: "Session 7",
      summary: "Learn the correct timeout procedure and when to use structured discipline.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "How to Use Timeout Effectively",
        content: {
          type: "TEXT",
          body: "Timeout is one of the most well-researched discipline techniques in child psychology. When done correctly, it is highly effective. When done incorrectly, it can make behavior worse. This session teaches you the evidence-based timeout procedure so you can use it with confidence.\n\n**What Timeout Actually Is**\nTimeout is short for \"time out from positive reinforcement.\" It means briefly removing the child from a situation where they are receiving attention (positive or negative) for misbehavior. It is not isolation, it is not punishment, and it is not meant to scare the child. It is a calm, structured break that removes the payoff for the misbehavior.\n\n**When to Use Timeout**\nTimeout is appropriate for:\n- Aggressive behavior (hitting, kicking, biting, throwing things at people)\n- Deliberate destruction of property\n- Dangerous behavior\n- Non-compliance after a warning has been given and ignored\n\nTimeout is NOT appropriate for:\n- Minor, attention-seeking behaviors (use active ignoring instead)\n- Accidents (spilling milk, tripping)\n- Emotional expressions (crying, being scared, being sad)\n- Behaviors the child does not yet have the skills to control\n\n**The Timeout Procedure**\n\nStep 1: **Give a Warning**\nThe first time the behavior occurs, give one clear, calm warning: \"If you hit again, you will go to timeout.\" This gives the child a chance to stop. Only give ONE warning — if you warn 5 times, you are teaching the child they get 5 free passes.\n\nStep 2: **Follow Through**\nIf the behavior happens again after the warning, immediately and calmly say: \"You hit again. You need to go to timeout.\" Lead the child to the timeout spot. If the child resists, gently but firmly guide them.\n\nStep 3: **The Timeout Spot**\nChoose a spot that is:\n- Boring (no toys, no screens, no interesting things to look at)\n- Safe (no dangerous objects)\n- Visible to you (you need to see the child but not interact with them)\n- Consistent (always the same spot)\n\nGood options: a specific chair, a step, a corner of the room. Bad options: the child's bedroom (too many toys), a dark closet (scary and punitive), anywhere the child cannot be seen.\n\nStep 4: **Set the Timer**\nThe general guideline is 1 minute per year of age:\n- 2-year-old: 2 minutes\n- 3-year-old: 3 minutes\n- 5-year-old: 5 minutes\n- Maximum: 5 minutes for any age (longer timeouts are not more effective)\n\nThe timer starts when the child is sitting calmly. If the child is screaming or leaving the spot, the timer has not started. Calmly say: \"The timer starts when you are sitting quietly.\" Do not argue, lecture, or engage. Wait.\n\nStep 5: **During Timeout**\nGive zero attention. Do not talk to the child, make eye contact, or respond to anything they say. If they leave the spot, calmly return them without conversation. If other children try to interact with the child in timeout, redirect them.\n\nStep 6: **End Timeout**\nWhen the timer goes off, go to the child calmly. Get down to their eye level. Briefly state why they were in timeout: \"You went to timeout because you hit your sister.\" Then reconnect: \"I love you. Let's go play.\" Do not lecture. Do not make the child apologize in the moment (forced apologies teach nothing). Keep it brief and warm.\n\n**After Timeout: Reconnect, Don't Lecture**\nThe most important part of timeout is what happens after. Many parents use this moment to deliver a long lecture about why the behavior was wrong. This undermines the timeout. The child has already experienced the consequence. Now they need to know that you still love them and that they can start fresh. A brief, warm reconnection does this.\n\n**When Timeout Is Not Working**\nIf timeout is not reducing the behavior after 2-3 consistent weeks, check:\n- Are you following the procedure exactly?\n- Is the timeout spot truly boring?\n- Are you giving too many warnings before following through?\n- Are you providing enough positive attention and praise at other times?\n- Is the behavior driven by something timeout cannot address (anxiety, skill deficit, sensory issue)?",
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 7 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Set up a timeout spot in your home following the guidelines: boring, safe, visible, consistent. Show it to your child during a calm moment and explain the timeout rules matter-of-factly: \"When you hit or break rules after a warning, you will sit here for [X] minutes. When the time is up, you can come back and play.\"", sortOrder: 0 },
            { type: "ACTION", description: "Use the timeout procedure this week if the opportunity arises. Follow all steps exactly: one warning, follow through, boring spot, 1 min per year of age, timer starts when calm, zero attention during, brief reconnection after. Log what happened.", sortOrder: 1 },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "CHECKLIST",
        title: "Timeout Setup Checklist",
        content: {
          type: "CHECKLIST",
          items: [
            { label: "Chosen a specific timeout spot (chair, step, or corner)", sortOrder: 0 },
            { label: "Spot is boring (no toys, screens, or interesting items nearby)", sortOrder: 1 },
            { label: "Spot is safe (no dangerous objects within reach)", sortOrder: 2 },
            { label: "Spot is visible to me (I can see the child without engaging)", sortOrder: 3 },
            { label: "Timer or phone ready (1 minute per year of age, max 5 minutes)", sortOrder: 4 },
            { label: "Explained timeout rules to child during a calm moment", sortOrder: 5 },
            { label: "Discussed timeout plan with co-parent or other caregivers for consistency", sortOrder: 6 },
          ],
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Key Takeaways",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "\u23f1\ufe0f", title: "Timeout Procedure Steps", body: "1. Warning: \"If you hit again, timeout.\" 2. Follow through immediately. 3. Lead child to timeout spot. 4. Timer: 1 min per year of age (max 5 min). 5. Timer starts when child is calm. 6. Zero attention during timeout. 7. Brief reconnection after." },
            { emoji: "\u26a0\ufe0f", title: "Warning Before Timeout", body: "Give ONE warning, not five. \"If you do [behavior] again, you will go to timeout.\" If it happens again, follow through immediately. Multiple warnings teach children they get multiple free passes." },
            { emoji: "\u2764\ufe0f", title: "After Timeout: Reconnect, Don't Lecture", body: "When timeout ends, briefly state why: \"You went to timeout because you hit.\" Then reconnect warmly: \"I love you. Let's go play.\" No long lectures. No guilt trips. No forced apologies. Brief, warm, and forward-looking." },
          ],
        },
      },
    ]
  );

  // ── Module 8: Behavior Charts & Reward Systems ──────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    7,
    {
      title: "Behavior Charts & Reward Systems",
      subtitle: "Session 8",
      summary: "Learn to create effective behavior charts and token economies to motivate positive behavior.",
      estimatedMinutes: 45,
    },
    [
      {
        type: "TEXT",
        title: "Reward Systems That Work",
        content: {
          type: "TEXT",
          body: "Behavior charts and reward systems can be powerful tools for motivating positive behavior change in children. They work by making expectations clear, tracking progress visually, and providing incentives for meeting goals. However, they need to be set up correctly to be effective.\n\n**How Behavior Charts Work**\nA behavior chart is a visual tracking system where a child earns stickers, checkmarks, or tokens for performing specific target behaviors. When they earn enough, they receive a predetermined reward.\n\nExample: A child who struggles with morning routines earns a sticker for each step completed independently (getting dressed, brushing teeth, eating breakfast, putting on shoes). After earning 20 stickers, they get to choose a family activity for Saturday.\n\n**Rules for Effective Behavior Charts**\n\n1. **Target Specific Behaviors**: Do not put \"be good\" on a chart. Instead, use specific, observable behaviors: \"Put dirty clothes in the hamper,\" \"Use kind words with your sister,\" \"Complete homework before screen time.\" The child should know exactly what earns a sticker.\n\n2. **Start with 1-2 Behaviors**: Do not overload the chart. Start with the 1-2 behaviors you most want to change. Once those are consistent, you can swap in new ones.\n\n3. **Make Goals Achievable**: Set the bar low at first. If the child needs 100 stickers before earning a reward, they will give up after day 2. Start with small goals (earn 5 stickers = reward) and gradually increase.\n\n4. **Give Rewards Immediately at First**: Young children (under 6) need immediate reinforcement. Earning a sticker right after the behavior, plus a small daily reward, is more effective than a weekly reward. As the child gets older, you can stretch the time between behavior and reward.\n\n5. **Use a Mix of Rewards**: Rewards do not have to be toys or treats. Many of the best rewards are activities, privileges, and time:\n   - Extra story at bedtime\n   - Choosing what's for dinner\n   - 15 extra minutes before bedtime\n   - A special outing with one parent\n   - Having a friend over\n   - Choosing a family movie\n   - Screen time\n   - A small treat or toy\n\n6. **Pair with Praise**: The chart is a supplement to labeled praise, not a replacement. Every time a child earns a sticker, pair it with specific praise: \"You put your plate in the sink without being asked — great job! You earned a sticker!\"\n\n7. **Fade Rewards Over Time**: The ultimate goal is for the behavior to become a habit that does not need external rewards. Once a behavior is consistent for 3-4 weeks, start reducing the rewards gradually. The praise continues, but the stickers and prizes phase out.\n\n**Age-Appropriate Reward Ideas**\n\nToddlers (2-3): Sticker on a simple chart, immediate small reward (special snack, extra story, choosing a song), lots of praise and excitement.\n\nPreschool (4-5): Sticker chart with small daily rewards and a bigger weekly reward for meeting the goal. Let the child decorate the chart.\n\nSchool-Age (6-10): Token economy (tokens earned for behaviors, spent on rewards from a \"menu\"). Can handle longer delays between behavior and reward. Involve the child in choosing target behaviors and rewards.\n\nPreteen (11-12): Point system. More autonomy in setting goals. Rewards focus on privileges (later bedtime, screen time, outings with friends). Less need for visible charts — can use a simple tracking app or notebook.\n\n**When Behavior Charts Do Not Work**\nIf a chart is not working after 2 weeks of consistent use, check:\n- Are the target behaviors specific and achievable?\n- Is the reward meaningful to the child?\n- Is the goal reachable (not too many stickers needed)?\n- Are you pairing the chart with praise?\n- Are you being consistent (tracking every day, not forgetting)?\n- Is the child involved in the process (they helped choose behaviors and rewards)?",
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 8 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Create a behavior chart for 1-2 specific target behaviors. Involve your child in the process: let them help choose the behaviors, pick stickers or tokens, and select rewards from a menu you approve. Post the chart somewhere visible.", sortOrder: 0 },
            { type: "ACTION", description: "Use the chart consistently for the rest of the week. Track stickers daily, pair each one with labeled praise, and deliver rewards when earned. Log what is working and what is not.", sortOrder: 1, isRecurring: true },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Key Takeaways",
        content: {
          type: "STRATEGY_CARDS",
          cards: [
            { emoji: "\ud83c\udfc5", title: "Behavior Chart Tips", body: "1. Target specific behaviors (not \"be good\"). 2. Start with 1-2 behaviors. 3. Set achievable goals. 4. Reward quickly at first. 5. Pair with labeled praise. 6. Involve your child. 7. Fade rewards once the behavior becomes a habit." },
            { emoji: "\ud83c\udf81", title: "Reward Ideas by Age", body: "Toddlers: stickers, extra story, special snack. Preschool: sticker chart + small daily/weekly reward. School-age: token economy, privilege menu. Preteens: point system, privileges (screen time, outings, later bedtime). The best rewards are often activities and time, not things." },
            { emoji: "\ud83d\udcc9", title: "Fade Rewards Gradually", body: "Rewards get the behavior started. Praise keeps it going. Once a behavior is consistent for 3-4 weeks, slowly reduce the external rewards while maintaining the praise. The goal is a habit, not a lifelong bribery system." },
          ],
        },
      },
    ]
  );

  // ── Module 9: Managing Challenging Situations ──────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    8,
    {
      title: "Managing Challenging Situations",
      subtitle: "Session 9",
      summary: "Apply your skills to common challenging situations: public misbehavior, sibling conflict, transitions, and homework battles.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "When Things Get Tough",
        content: {
          type: "TEXT",
          body: "You now have a solid toolkit of parenting skills: Special Time, labeled praise, active ignoring, effective commands, natural and logical consequences, timeout, and behavior charts. This session is about applying these tools to the specific situations that challenge parents most.\n\n**Public Misbehavior**\nThe grocery store tantrum. The restaurant meltdown. The playground defiance. Public misbehavior feels worse because other people are watching, and many parents respond differently in public (giving in to stop the embarrassment) than they would at home.\n\nPrevention strategies:\n- Prepare your child in advance: \"We are going to the store. The rules are: stay near me, use your indoor voice, and no asking for treats. If you follow the rules, you can choose one small item at the end.\"\n- Bring something to keep them occupied (a small toy, a snack, a job like crossing items off the list)\n- Go at times when your child is not tired or hungry (HALT applies to children too)\n- Keep trips as short as possible for young children\n\nIn-the-moment response:\n- Use the same strategies you use at home (do not change the rules because you are in public)\n- Stay calm. Other people's judgment is temporary; your consistency is permanent.\n- If the child melts down, calmly remove them from the situation: \"We need to take a break. We are going to the car until you are calm.\"\n- Follow through on stated consequences, even when it is inconvenient\n\n**Sibling Conflict**\nSibling fighting is one of the most draining parts of parenting. Children fight with siblings for attention, out of jealousy, because of developmental differences, and because they are still learning social skills.\n\nStrategies:\n- Do not always play referee. For minor conflicts (arguing over who gets the remote), let them try to work it out themselves first. Step in only if it becomes physical or one child is being bullied.\n- Avoid taking sides. Instead of deciding who is right, focus on the solution: \"You both want the same toy. What is a solution that works for both of you?\"\n- Praise cooperation heavily: \"You two figured that out all by yourselves! Great teamwork.\"\n- Give each child one-on-one time (Special Time) so they are not competing for your attention\n- Teach conflict resolution skills: \"Tell your brother how you feel using your words. Say: I feel upset when you take my toy because I was playing with it.\"\n\n**Transitions**\nMany children struggle with transitions — stopping one activity and starting another. Tantrums at bedtime, resistance to leaving the park, meltdowns when screen time ends.\n\nStrategies:\n- Give advance warnings: \"In 5 minutes, we are leaving the park.\" \"In 2 minutes, the tablet is going off.\"\n- Use visual timers for younger children\n- Create consistent routines so transitions are predictable\n- Offer choices within the transition: \"It's time to leave. Do you want to go down the slide one more time or swing one more time?\"\n- Praise smooth transitions: \"You turned off the TV the first time I asked — awesome job!\"\n\n**Homework Battles**\nHomework conflicts are extremely common and can poison the parent-child relationship if not handled well.\n\nStrategies:\n- Create a consistent homework routine (same time, same place, same rules every day)\n- Set a timer for work periods and break periods (e.g., 20 minutes of work, 5 minutes of break)\n- Be available to help, but do not do the work for them\n- Praise effort, not perfection: \"I can see you are really working hard on this math.\"\n- Use natural consequences: if homework is not done, the child faces the school consequence (not turning it in)\n- Do not make homework a power struggle. If it is becoming a nightly battle, talk to the teacher about adjusting expectations.\n\n**The Key to All Challenging Situations: Prevention + Consistency**\nThe best way to handle difficult situations is to prevent them. Prepare your child, set clear expectations, and structure the environment for success. When misbehavior does happen, respond consistently using the same tools you use at home. Children do best when the rules are the same everywhere, every time, with every caregiver.",
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 9 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Identify your top 3 most challenging situations (e.g., bedtime, grocery store, sibling fights, homework, morning routine). For each one, write a prevention plan (what you will do BEFORE the situation) and a response plan (what you will do DURING the situation using the skills from this program).", sortOrder: 0 },
            { type: "ACTION", description: "Implement your prevention + response plan for at least one challenging situation this week. Log what happened: what you did differently, how your child responded, and what you would adjust next time.", sortOrder: 1 },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Progress Reflection",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "Think about the past 8 weeks of this program. What has changed in your daily interactions with your child? Which techniques have been most helpful? Which situations are still challenging? How has your relationship with your child shifted? What has surprised you about this process?",
          ],
          spaceSizeHint: "large",
        },
      },
    ]
  );

  // ── Module 10: Maintenance & Review ──────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    9,
    {
      title: "Maintenance & Review",
      subtitle: "Session 10",
      summary: "Review your progress, complete the final assessment, and create a long-term parenting plan.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Keeping Your Gains",
        content: {
          type: "TEXT",
          body: "You have spent 9 weeks building a toolkit of evidence-based parenting skills. You have learned how to fill your child's attention tank with Special Time and labeled praise. You have learned when to ignore and when to intervene. You have learned how to give commands that work, use consequences that teach, and structure discipline with timeout. You have tackled challenging situations with prevention plans and consistent responses.\n\nThis final session is about making sure these skills stick and continue to grow with your child.\n\n**Maintaining Consistency**\nThe most important factor in long-term parenting success is consistency. Children need to know that the rules are the same today as they were yesterday and will be tomorrow. This does not mean being rigid — it means being predictable.\n\nTips for maintaining consistency:\n- Keep doing Special Time daily, even when things are going well. It is preventive, not just reactive.\n- Continue giving 10+ labeled praises per day. This never stops being effective.\n- Stick to the consequences you have set. Inconsistency is the fastest way to undo progress.\n- Communicate with co-parents, grandparents, and caregivers so everyone is using the same strategies.\n- Review your skills periodically — read through your notes from this program once a month.\n\n**Adjusting Strategies as Your Child Grows**\nThe principles of effective parenting stay the same across ages, but the specific techniques need to adjust:\n\n- Toddlers and preschoolers need more physical guidance, simpler language, immediate rewards, and shorter timeouts.\n- School-age children can handle more verbal reasoning, longer delays between behavior and reward, and more involvement in setting rules and consequences.\n- Preteens and teenagers need increasing autonomy, natural consequences over imposed consequences, collaborative problem-solving, and respect for their growing independence.\n\nAs your child develops, shift from directing to guiding to collaborating. The balance of power changes, but the core ingredients remain: positive attention, clear expectations, consistent follow-through, and a warm, respectful relationship.\n\n**When to Seek Additional Help**\nThese strategies work for the majority of common behavior problems. However, some situations need additional professional support:\n- Behavior problems that do not improve after 3-4 months of consistent strategy use\n- Extreme aggression, self-harm, or cruelty to animals\n- Behavior problems that occur primarily at school (may indicate learning disability, ADHD, or social difficulties)\n- Signs of anxiety or depression in your child\n- Significant family stress (divorce, trauma, grief) affecting the child\n- Your own anger, frustration, or mental health making it hard to use these skills consistently\n\nSeeking help is not a failure. It is a sign that you care enough to get your child what they need.\n\n**Your Parenting Plan**\nThis week, you will create a written parenting plan that summarizes what you have learned and what you will continue doing. Keep this plan where you can see it and review it monthly.",
        },
      },
      {
        type: "ASSESSMENT",
        title: "Child Behavior Inventory — Final",
        content: {
          type: "ASSESSMENT",
          title: "Child Behavior Inventory — Final",
          instructions:
            "Please rate how often your child displays each of the following behaviors. Think about the past two weeks. Compare your responses to your baseline assessment from Session 1.",
          scoringMethod: "SUM",
          questions: [
            { question: "Refuses to obey instructions or rules.", type: "LIKERT", required: true, sortOrder: 0, likertMin: 1, likertMax: 7, likertMinLabel: "Never", likertMaxLabel: "Always" },
            { question: "Has tantrums or meltdowns.", type: "LIKERT", required: true, sortOrder: 1, likertMin: 1, likertMax: 7, likertMinLabel: "Never", likertMaxLabel: "Always" },
            { question: "Whines or cries to get their way.", type: "LIKERT", required: true, sortOrder: 2, likertMin: 1, likertMax: 7, likertMinLabel: "Never", likertMaxLabel: "Always" },
            { question: "Argues with adults.", type: "LIKERT", required: true, sortOrder: 3, likertMin: 1, likertMax: 7, likertMinLabel: "Never", likertMaxLabel: "Always" },
            { question: "Acts aggressively (hitting, kicking, biting, throwing things).", type: "LIKERT", required: true, sortOrder: 4, likertMin: 1, likertMax: 7, likertMinLabel: "Never", likertMaxLabel: "Always" },
            { question: "Destroys toys or other objects.", type: "LIKERT", required: true, sortOrder: 5, likertMin: 1, likertMax: 7, likertMinLabel: "Never", likertMaxLabel: "Always" },
            { question: "Has difficulty playing with other children.", type: "LIKERT", required: true, sortOrder: 6, likertMin: 1, likertMax: 7, likertMinLabel: "Never", likertMaxLabel: "Always" },
            { question: "Has difficulty paying attention or staying on task.", type: "LIKERT", required: true, sortOrder: 7, likertMin: 1, likertMax: 7, likertMinLabel: "Never", likertMaxLabel: "Always" },
            { question: "Gets easily frustrated.", type: "LIKERT", required: true, sortOrder: 8, likertMin: 1, likertMax: 7, likertMinLabel: "Never", likertMaxLabel: "Always" },
            { question: "Has difficulty following routines (bedtime, morning, meals).", type: "LIKERT", required: true, sortOrder: 9, likertMin: 1, likertMax: 7, likertMinLabel: "Never", likertMaxLabel: "Always" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 10 Practice — Parenting Plan",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Write your personal Parenting Plan including: (1) Strategies that are working best for your family, (2) Specific situations that are still challenging and your plan for each, (3) Your daily routine (Special Time, labeled praises, consistency practices), (4) Support resources (clinician, family, community), (5) Signs that you might need additional help.", sortOrder: 0 },
            { type: "ACTION", description: "Share your parenting plan with your co-parent or a trusted support person. Set a calendar reminder to review the plan once per month.", sortOrder: 1 },
            { type: "ACTION", description: "Continue using the daily parenting tracker for at least 3 more months to maintain accountability and track progress.", sortOrder: 2 },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Then and Now",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "Compare where you are now to where you were in Week 1. How has your understanding of your child's behavior changed? What skills have become second nature? What has improved most in your relationship with your child? What are you most proud of? What will you continue working on?",
          ],
          spaceSizeHint: "large",
        },
      },
    ]
  );

  // ── Daily Tracker: Parenting Log ──────────────────────
  const parentingTracker = await prisma.dailyTracker.create({
    data: {
      programId: program.id,
      createdById: clinicianId,
      name: "Parenting Log",
      description: "Track your daily parenting practices, child behavior, and stress level.",
    },
  });

  await prisma.dailyTrackerField.createMany({
    data: [
      { trackerId: parentingTracker.id, label: "Special Time Completed", fieldType: "YES_NO", sortOrder: 0, isRequired: true },
      { trackerId: parentingTracker.id, label: "Duration of Special Time (minutes)", fieldType: "NUMBER", sortOrder: 1, isRequired: false },
      { trackerId: parentingTracker.id, label: "Labeled Praises Given", fieldType: "NUMBER", sortOrder: 2, isRequired: true },
      { trackerId: parentingTracker.id, label: "Behavior Incidents", fieldType: "NUMBER", sortOrder: 3, isRequired: true },
      { trackerId: parentingTracker.id, label: "Used Planned Response", fieldType: "YES_NO", sortOrder: 4, isRequired: true },
      { trackerId: parentingTracker.id, label: "Your Stress Level", fieldType: "SCALE", sortOrder: 5, isRequired: true, options: { min: 0, max: 10, minLabel: "No stress", maxLabel: "Extreme stress" } },
      { trackerId: parentingTracker.id, label: "Notes", fieldType: "FREE_TEXT", sortOrder: 6, isRequired: false },
    ],
  });

  return program;
}
