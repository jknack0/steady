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
        type: "STYLED_CONTENT",
        title: "What Is Anger?",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Anger is a normal, healthy emotion that every person experiences. It is part of the human survival system. When you sense a threat — whether it is physical danger, unfair treatment, or a blocked goal — your brain activates the fight-or-flight response. Your heart beats faster, your muscles tighten, and your body prepares to take action. This is anger doing its job.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Anger vs. Aggression</strong>
Anger is a feeling. Aggression is a behavior. You can feel angry without acting aggressively. This is the single most important idea in anger management: you are always responsible for what you do with your anger, even though you cannot always control whether anger shows up.</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Anger</strong> = an internal emotional experience (feeling frustrated, irritated, furious)</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Aggression</strong> = an external action meant to hurt or intimidate (yelling, hitting, throwing things, threatening)</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Many people grew up believing that anger itself is bad or dangerous. It is not. Anger tells you that something matters to you. The problem is not the feeling — the problem is what happens when anger leads to hurtful words or actions.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Anger Cycle</strong>
Anger follows a predictable pattern. Understanding this pattern gives you places to intervene before things get out of control.</p><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Trigger</strong>: Something happens that sets you off. It could be external (someone cuts you off in traffic, a coworker takes credit for your work) or internal (a frustrating memory, feeling disrespected).</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Thoughts</strong>: Your mind interprets the trigger. These thoughts happen fast and often feel like facts. Examples: "They did that on purpose," "Nobody respects me," "This is unfair."</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Physical Signs</strong>: Your body reacts. You might notice a clenched jaw, tight fists, racing heart, hot face, shallow breathing, or a knot in your stomach.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Behavior</strong>: You act on the anger. This could be yelling, slamming doors, giving the silent treatment, or — on the healthy side — taking a break, talking it through, or going for a walk.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Consequences</strong>: Your behavior creates results. Aggressive behavior damages relationships, causes guilt, and often makes the original problem worse. Healthy behavior protects relationships and solves problems.</li></ol><p style="margin-bottom: 12px; line-height: 1.6;">The goal of this program is not to eliminate anger. That is neither possible nor desirable. The goal is to slow down the anger cycle so you can choose your behavior instead of reacting on autopilot.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What You Will Learn</strong>
Over the next 8 weeks, you will build a toolkit of skills:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Recognizing your personal triggers and early warning signs</li><li style="margin-bottom: 6px;">Using the timeout technique to cool down before reacting</li><li style="margin-bottom: 6px;">Changing the thoughts that fuel anger (cognitive restructuring)</li><li style="margin-bottom: 6px;">Communicating assertively instead of aggressively</li><li style="margin-bottom: 6px;">Relaxation techniques to lower your baseline tension</li><li style="margin-bottom: 6px;">Problem-solving skills for recurring anger situations</li><li style="margin-bottom: 6px;">A personal anger management plan you can use for the rest of your life</li></ul>`,
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
        type: "STYLED_CONTENT",
        title: "What Sets You Off?",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Anger does not come from nowhere. It is always triggered by something, even when the trigger is hard to identify in the moment. This session is about becoming an expert on your own anger — knowing exactly what sets you off and catching the early warning signs before anger takes over.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">External Triggers</strong>
External triggers are things that happen outside of you. They include:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Situations</strong>: Being stuck in traffic, running late, technology breaking down, noisy environments</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">People</strong>: A critical boss, a disrespectful stranger, a partner who does not listen, a child who will not cooperate</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Events</strong>: Being lied to, having plans cancelled, receiving unfair criticism, witnessing injustice</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Environmental stressors</strong>: Crowded spaces, long wait times, uncomfortable temperatures</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Internal Triggers</strong>
Internal triggers come from inside you. They are just as powerful as external triggers, but harder to spot:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Thoughts and memories</strong>: Replaying an argument in your mind, remembering past mistreatment, imagining worst-case scenarios</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Physical states</strong>: Being hungry, tired, in pain, or sick significantly lowers your anger threshold. The acronym HALT is helpful — ask yourself: Am I Hungry, Angry (already at a low simmer), Lonely, or Tired?</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Emotional states</strong>: Feeling disrespected, embarrassed, hurt, scared, or powerless often shows up as anger because anger feels more powerful than vulnerability</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Unmet expectations</strong>: Expecting something to happen a certain way and having reality fall short</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Trigger + Vulnerability Formula</strong>
Most anger episodes are not caused by the trigger alone. They result from a trigger hitting you when you are already vulnerable. The same situation that barely bothers you on a good day can feel infuriating when you are tired, stressed, or already upset about something else.</p><p style="margin-bottom: 12px; line-height: 1.6;">Trigger + Vulnerability = Intensity of Anger Response</p><p style="margin-bottom: 12px; line-height: 1.6;">This is why tracking your anger episodes over time reveals patterns. You may discover that most of your worst anger happens when you are sleep-deprived, when you skip meals, or when you are already stressed about work.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Physical Warning Signs</strong>
Your body is the best early warning system for anger. The fight-or-flight response creates physical changes that happen before you consciously realize you are getting angry. Common physical warning signs include:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Clenched jaw or grinding teeth</li><li style="margin-bottom: 6px;">Tight fists or gripping objects harder</li><li style="margin-bottom: 6px;">Racing or pounding heart</li><li style="margin-bottom: 6px;">Tight chest or difficulty breathing</li><li style="margin-bottom: 6px;">Hot face, neck, or ears</li><li style="margin-bottom: 6px;">Shallow, rapid breathing</li><li style="margin-bottom: 6px;">Tension in shoulders, neck, or back</li><li style="margin-bottom: 6px;">Feeling restless or unable to sit still</li><li style="margin-bottom: 6px;">Sweating</li><li style="margin-bottom: 6px;">Upset stomach or knot in the gut</li><li style="margin-bottom: 6px;">Speaking louder or faster</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Everyone has their own signature warning signs. Some people feel it first in their jaw. Others feel it in their chest. Learning your pattern is essential because these physical signs give you a window of opportunity — the few seconds or minutes before anger peaks — to use the skills you will learn in this program.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Body Scan</strong>
A quick body scan is one of the fastest ways to check your anger level at any moment. Starting from the top of your head, mentally scan down through your face, jaw, neck, shoulders, chest, arms, hands, stomach, and legs. Notice where you are holding tension. Rate your overall anger from 0 (completely calm) to 10 (the angriest you have ever been). If you are at a 4 or above, it is time to use a coping skill.</p>`,
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
        type: "STYLED_CONTENT",
        title: "The Timeout Technique",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">The timeout is the single most important anger management skill you will learn. It is simple, powerful, and works in almost every situation. The idea is straightforward: when you notice your anger rising to a level where you might say or do something harmful, you remove yourself from the situation, cool down, and return when you are calm enough to handle things constructively.</p><p style="margin-bottom: 12px; line-height: 1.6;">This is not the silent treatment. It is not storming off. It is not punishing the other person by disappearing. It is a deliberate, respectful strategy for protecting yourself and your relationships from the damage that happens when anger takes over.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">When to Use a Timeout</strong>
Use a timeout when:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Your anger level is at a 5 or above on the 0-10 scale</li><li style="margin-bottom: 6px;">You notice your physical warning signs ramping up (clenched jaw, racing heart, hot face)</li><li style="margin-bottom: 6px;">You are starting to raise your voice or use harsh words</li><li style="margin-bottom: 6px;">You feel the urge to hit, throw, or break something</li><li style="margin-bottom: 6px;">You realize you are no longer listening to the other person and are just waiting to attack</li><li style="margin-bottom: 6px;">You catch yourself thinking in absolutes: "always," "never," "I can't stand this"</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">The key is to use the timeout EARLY — before you reach a 7, 8, or 9 on the anger scale. The higher your anger climbs, the harder it is to think clearly enough to take a break.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">The Timeout Steps</h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Recognize</strong>: Notice your warning signs. Scan your body. Acknowledge to yourself: "I am getting too angry to handle this well right now."</li></ol><p style="margin-bottom: 12px; line-height: 1.6;">2. <strong style="color: var(--steady-teal);">Announce</strong>: Tell the other person you need a break. Use a calm, neutral tone. Say something like:
   - "I need to take a break. I'll be back in 30 minutes."
   - "I'm getting too heated. Let me step away and cool down so we can talk about this productively."
   - "I need a timeout. This is important to me and I want to discuss it when I'm calmer."</p><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Leave</strong>: Physically leave the situation. Go for a walk, go to another room, step outside. Do not stay in the same space trying to be quiet — distance matters.</li></ol><p style="margin-bottom: 12px; line-height: 1.6;">4. <strong style="color: var(--steady-teal);">Cool Down</strong>: Use active cool-down strategies. Do NOT spend this time rehearsing the argument or building your case. Instead:
   - Walk briskly for 10-15 minutes
   - Splash cold water on your face and wrists
   - Do deep breathing: inhale for 4 counts, hold for 7, exhale for 8
   - Count backwards from 100 by 7s (this forces your thinking brain to engage)
   - Listen to calming music
   - Do a quick workout (push-ups, jumping jacks)</p><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Return</strong>: Come back within the agreed-upon time (usually 30-60 minutes). Let the other person know you are ready to talk. If you are still too angry, let them know you need more time, but commit to a specific return time.</li></ol><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Timeout Agreements</strong>
The timeout works best when the important people in your life understand and agree to the process. Sit down with your partner, family members, or housemates during a calm moment and create a timeout agreement:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Both people can call a timeout at any time</li><li style="margin-bottom: 6px;">The person calling timeout states when they will return</li><li style="margin-bottom: 6px;">The other person respects the timeout without following or continuing the argument</li><li style="margin-bottom: 6px;">Both people agree that the issue will be revisited — timeout is a pause, not an escape</li><li style="margin-bottom: 6px;">Neither person uses timeout to avoid all difficult conversations</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What Timeout Is NOT</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">It is not the silent treatment (you communicate clearly and return)</li><li style="margin-bottom: 6px;">It is not storming off in anger (you leave calmly and intentionally)</li><li style="margin-bottom: 6px;">It is not avoiding the issue forever (you come back to discuss it)</li><li style="margin-bottom: 6px;">It is not weakness (it takes significant strength to walk away when you are angry)</li></ul>`,
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
        type: "STYLED_CONTENT",
        title: "Hot Thoughts and Cool Thoughts",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Between the trigger and the angry reaction, there is always a thought. Sometimes the thought is so fast you do not even notice it, but it is there. These lightning-fast thoughts are what turn a frustrating situation into a rage-inducing one. In anger management, we call them "hot thoughts" because they heat up your anger.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">Common Types of Hot Thoughts</h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Demanding ("Should" Thinking)</strong>: Turning your preferences into rigid demands. "They SHOULD know better." "He MUST treat me with respect." "Things SHOULDN'T be this way." The word "should" is one of the most anger-producing words in the English language because it sets up an expectation that the world must operate according to your rules.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Catastrophizing</strong>: Blowing things out of proportion. "This is the worst thing that could happen." "Everything is ruined." "I can't take this anymore." When you catastrophize, a manageable frustration turns into an unbearable crisis.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Labeling</strong>: Reducing a whole person to a single negative label. "He's an idiot." "She's so selfish." "They're worthless." Labeling dehumanizes the other person and makes it easier to justify aggression toward them.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Mind-Reading</strong>: Assuming you know why someone did what they did, and always assuming the worst. "She did that on purpose to disrespect me." "He knows exactly what he's doing." "They don't care about me at all." Mind-reading fills in the blanks with the most infuriating explanation.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Personalizing</strong>: Taking everything as a personal attack. "He cut me off in traffic because he thinks he's better than me." "She's late because she doesn't respect my time." In reality, most of what other people do has nothing to do with you.</li></ol><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Replacing Hot Thoughts with Cool Thoughts</strong>
Cool thoughts are not fake positive thoughts. They are balanced, realistic thoughts that consider the full picture. The goal is not to pretend nothing is wrong — it is to think accurately so your anger matches the actual situation.</p><p style="margin-bottom: 12px; line-height: 1.6;">Hot thought: "She SHOULD have called me back by now. She obviously doesn't care."
Cool thought: "I'd prefer she called back sooner. She might be busy. I can follow up or let her know it's important to me."</p><p style="margin-bottom: 12px; line-height: 1.6;">Hot thought: "This is UNBELIEVABLE. Everything always goes wrong for me."
Cool thought: "This is frustrating. Not everything goes wrong — there are things going right too. What can I do to fix this specific problem?"</p><p style="margin-bottom: 12px; line-height: 1.6;">Hot thought: "That driver is a complete jerk."
Cool thought: "That driver made a bad move. Maybe they didn't see me, or maybe they're having a terrible day. It's not worth getting worked up over."</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">How to Catch and Change Hot Thoughts</strong>
1. Notice your anger rising (physical warning signs)
2. Pause and ask: "What thought just went through my mind?"
3. Identify the type of hot thought (demanding, catastrophizing, labeling, mind-reading, personalizing)
4. Ask yourself: "Is this thought a fact or an assumption? Am I seeing the full picture? What would I tell a friend who had this thought?"
5. Replace the hot thought with a cooler, more balanced thought</p><p style="margin-bottom: 12px; line-height: 1.6;">This is not about suppressing anger or pretending things are fine. It is about making sure your anger is based on what is actually happening rather than on distorted thinking. When your thinking is accurate, your anger will match the situation — and you will be better equipped to handle it.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Communication Styles",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">The way you communicate when you are upset has a huge impact on whether conflicts get resolved or get worse. Most people default to one of four communication styles, especially under stress. Understanding these styles helps you recognize your patterns and shift toward the one that works best.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Passive (The Doormat)</strong>
Passive communicators avoid conflict at all costs. They do not speak up for themselves, give in to keep the peace, and stuff their feelings down. On the surface, they seem easygoing, but underneath, resentment builds. Eventually, the resentment explodes — and they swing to aggression, shocking everyone around them.</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">"It's fine, whatever you want."</li><li style="margin-bottom: 6px;">"I don't care." (When they actually do care deeply)</li><li style="margin-bottom: 6px;">Agreeing to things they do not want to do, then feeling angry about it later</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Aggressive (The Bulldozer)</strong>
Aggressive communicators express their needs at the expense of others. They use intimidation, blame, criticism, threats, or insults to get their way. They may get short-term results, but they destroy trust and damage relationships.</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">"You ALWAYS do this! What is WRONG with you?"</li><li style="margin-bottom: 6px;">Yelling, pointing fingers, slamming things</li><li style="margin-bottom: 6px;">Name-calling, threatening, belittling</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Passive-Aggressive (The Sniper)</strong>
Passive-aggressive communicators express anger indirectly. They use sarcasm, the silent treatment, backhanded compliments, deliberate procrastination, or subtle sabotage. They deny being angry while behaving in ways that clearly communicate hostility.</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">"Sure, I'd LOVE to do that." (dripping with sarcasm)</li><li style="margin-bottom: 6px;">"forgetting" to do something they promised</li><li style="margin-bottom: 6px;">Giving the silent treatment for days</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Assertive (Direct and Respectful)</strong>
Assertive communicators express their needs, feelings, and boundaries clearly and directly while respecting the other person. They stand up for themselves without attacking. Assertive communication is the goal.</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">"I feel frustrated when meetings start late because it throws off my schedule. Can we agree to start on time?"</li><li style="margin-bottom: 6px;">"I disagree, and here is why."</li><li style="margin-bottom: 6px;">"I need some space right now. Can we talk about this in an hour?"</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The I-Statement Formula</strong>
I-statements are the core tool of assertive communication. They express how you feel and what you need without blaming or attacking the other person.</p><p style="margin-bottom: 12px; line-height: 1.6;">The formula is: "I feel ___ when ___ because ___. I need ___."</p><p style="margin-bottom: 8px; line-height: 1.6;">Examples:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">"I feel disrespected when you check your phone while I'm talking because it seems like what I'm saying doesn't matter. I need you to put your phone down during our conversations."</li><li style="margin-bottom: 6px;">"I feel overwhelmed when I come home to a messy kitchen because I've been working all day too. I need us to share the cleanup."</li><li style="margin-bottom: 6px;">"I feel hurt when plans get cancelled last minute because I had set aside that time. I need more notice if plans change."</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Tips for Assertive Communication</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Use a calm, firm voice — not loud, not whispering</li><li style="margin-bottom: 6px;">Make eye contact</li><li style="margin-bottom: 6px;">Keep your body language open (uncrossed arms, relaxed posture)</li><li style="margin-bottom: 6px;">Stick to the specific situation — do not bring up past grievances</li><li style="margin-bottom: 6px;">Avoid "you always" and "you never" — these are hot thought phrases that escalate conflict</li><li style="margin-bottom: 6px;">Listen to the other person's response with genuine curiosity</li><li style="margin-bottom: 6px;">Be willing to compromise when appropriate, but do not abandon your core needs</li></ul>`,
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
        type: "STYLED_CONTENT",
        title: "Calming Your Body to Calm Your Mind",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Anger lives in your body as much as it lives in your mind. When the fight-or-flight response is activated, your muscles tense, your breathing gets shallow, your heart pounds, and your body floods with stress hormones. You cannot think clearly in this state. The thinking part of your brain (the prefrontal cortex) goes partially offline, and the reactive part (the amygdala) takes over.</p><p style="margin-bottom: 12px; line-height: 1.6;">Relaxation techniques work by reversing the physical stress response. When you deliberately relax your muscles, slow your breathing, and ground yourself in the present moment, you send a signal to your brain that the danger has passed. This brings the thinking brain back online so you can make better choices.</p><p style="margin-bottom: 12px; line-height: 1.6;">These techniques work best when you practice them regularly — not just when you are angry. Think of it like exercise: the more you train, the stronger your ability to use these skills under pressure.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Progressive Muscle Relaxation (PMR)</strong>
PMR involves deliberately tensing and then releasing each muscle group in your body. The contrast between tension and release teaches your muscles what true relaxation feels like.</p><p style="margin-bottom: 12px; line-height: 1.6;">How to do it:
1. Find a comfortable position (sitting or lying down)
2. Start with your feet: tense the muscles as tightly as you can for 5 seconds
3. Release suddenly and notice the feeling of relaxation for 10-15 seconds
4. Move up through your body: calves, thighs, buttocks, stomach, chest, hands, forearms, upper arms, shoulders, neck, face
5. For each group: tense for 5 seconds, release for 10-15 seconds
6. After completing all muscle groups, take a few deep breaths and notice how your body feels</p><p style="margin-bottom: 12px; line-height: 1.6;">Practice PMR for 10-15 minutes daily. Over time, you will learn to quickly release tension in specific body parts without going through the whole sequence.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Deep Breathing Techniques</strong>
Deep, slow breathing is the fastest way to calm your nervous system. When you are angry, your breathing becomes shallow and rapid. Deliberately slowing it down reverses the stress response.</p><p style="margin-bottom: 12px; line-height: 1.6;">4-7-8 Breathing:
1. Inhale through your nose for 4 counts
2. Hold your breath for 7 counts
3. Exhale slowly through your mouth for 8 counts
4. Repeat 4 times</p><p style="margin-bottom: 12px; line-height: 1.6;">The long exhale is the key. Exhaling slowly activates the parasympathetic nervous system (the "rest and digest" system), which directly counteracts the fight-or-flight response.</p><p style="margin-bottom: 12px; line-height: 1.6;">Box Breathing (used by military and first responders):
1. Inhale for 4 counts
2. Hold for 4 counts
3. Exhale for 4 counts
4. Hold for 4 counts
5. Repeat 4-6 times</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Grounding Techniques for Anger</strong>
Grounding techniques pull your attention out of your angry thoughts and into the present moment. They are especially useful when your mind is racing or replaying an upsetting situation.</p><p style="margin-bottom: 8px; line-height: 1.6;">5-4-3-2-1 Senses Grounding:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Name 5 things you can see</li><li style="margin-bottom: 6px;">Name 4 things you can touch (and touch them)</li><li style="margin-bottom: 6px;">Name 3 things you can hear</li><li style="margin-bottom: 6px;">Name 2 things you can smell</li><li style="margin-bottom: 6px;">Name 1 thing you can taste</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Cold Water Reset:
Splash cold water on your face or hold ice cubes in your hands. The cold sensation activates the dive reflex, which immediately slows your heart rate and calms your nervous system. This is one of the fastest de-escalation techniques available.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">When to Use These Skills</strong>
Use relaxation skills proactively (daily practice to lower your baseline tension) and reactively (in the moment when anger starts building). If your anger is above a 4 on the 0-10 scale, start with breathing and grounding. If you catch it early (2-3), a quick body scan and a few deep breaths may be enough.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Solving the Problem Behind the Anger",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Some anger episodes are one-time events — a stranger cuts you off in traffic and you never see them again. But much of the anger that damages your life comes from recurring situations: the same argument with your partner, the same frustration at work, the same pattern with a family member. For these situations, managing your anger in the moment is not enough. You also need to solve the underlying problem.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Structured Problem-Solving</strong>
When you are angry, your brain narrows its focus to two options: fight or give up. Structured problem-solving reopens your thinking so you can see all the options available.</p><p style="margin-bottom: 8px; line-height: 1.6;">Step 1: Define the Problem Without Blame
State the problem as a situation to be solved, not as someone's fault.</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Instead of: "My coworker is lazy and dumps everything on me."</li><li style="margin-bottom: 6px;">Try: "Work is not being divided evenly on my team, and I am taking on more than my share."</li></ul><p style="margin-bottom: 8px; line-height: 1.6;">Step 2: Brainstorm Solutions
Write down every possible solution, even ones that seem silly or extreme. Do not judge or eliminate any option yet. The goal is quantity, not quality. Common solutions include:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Having a direct conversation (using I-statements)</li><li style="margin-bottom: 6px;">Setting a boundary</li><li style="margin-bottom: 6px;">Changing your own behavior or routine</li><li style="margin-bottom: 6px;">Accepting what you cannot change and adjusting your expectations</li><li style="margin-bottom: 6px;">Involving a third party (supervisor, mediator, counselor)</li><li style="margin-bottom: 6px;">Removing yourself from the situation</li></ul><p style="margin-bottom: 8px; line-height: 1.6;">Step 3: Evaluate Each Solution
For each option, consider:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Will this actually solve the problem?</li><li style="margin-bottom: 6px;">What are the risks or downsides?</li><li style="margin-bottom: 6px;">Is this something I can realistically do?</li><li style="margin-bottom: 6px;">Does this align with the kind of person I want to be?</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Step 4: Pick One and Try It
Choose the solution that seems most likely to work and that you are willing to commit to. Do not wait for the perfect option — progress beats perfection.</p><p style="margin-bottom: 12px; line-height: 1.6;">Step 5: Review
After trying the solution, evaluate: Did it work? Did the problem improve? Do I need to adjust or try a different solution?</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Conflict Resolution</strong>
Conflicts between people require a slightly different approach because another person's needs and perspective are involved.</p><p style="margin-bottom: 12px; line-height: 1.6;">Listen First: Before stating your position, genuinely try to understand the other person's perspective. Ask open-ended questions: "Help me understand how you see this." "What matters most to you about this?" People are far more willing to listen to you after they feel heard.</p><p style="margin-bottom: 12px; line-height: 1.6;">Find Common Ground: In most conflicts, both people want the same underlying things — respect, fairness, connection. Identify what you agree on before diving into disagreements.</p><p style="margin-bottom: 12px; line-height: 1.6;">Compromise: A good compromise means both people give a little and both people get something important. It is not about winning. Ask: "What would work for both of us?" "What could I do differently, and what could you do differently?"</p><p style="margin-bottom: 12px; line-height: 1.6;">Know When to Walk Away: Not every conflict can be resolved. Some people are not willing to compromise, and some situations cannot change. In those cases, your problem-solving options include accepting the situation, setting firm boundaries, or removing yourself from the relationship or environment.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Keeping Your Gains",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">You have spent the past 7 weeks building anger management skills: recognizing triggers and warning signs, using timeouts, restructuring hot thoughts, communicating assertively, using relaxation techniques, and solving problems constructively. This final session is about making sure these skills stick.</p><p style="margin-bottom: 12px; line-height: 1.6;">Anger management is not a cure. It is an ongoing practice, like physical fitness. You do not go to the gym for 8 weeks and then stop exercising forever. The same is true for anger management. You will have setbacks. You will lose your temper sometimes. The difference now is that you have tools to recover quickly and get back on track.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What to Expect Going Forward</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Progress is not linear. You will have good weeks and harder weeks.</li><li style="margin-bottom: 6px;">Stress, fatigue, illness, and major life changes can temporarily increase anger. This is normal.</li><li style="margin-bottom: 6px;">A setback does not erase your progress. One angry outburst does not mean you are back to square one. It means you are human.</li><li style="margin-bottom: 6px;">The skills get easier with practice. Techniques that feel awkward now will eventually become second nature.</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Warning Signs of Relapse</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Stopping daily tracker or self-monitoring</li><li style="margin-bottom: 6px;">Skipping relaxation practice</li><li style="margin-bottom: 6px;">Falling back into hot thought patterns without catching them</li><li style="margin-bottom: 6px;">Using passive or aggressive communication instead of assertive</li><li style="margin-bottom: 6px;">Avoiding conflicts instead of addressing them</li><li style="margin-bottom: 6px;">Increased substance use (alcohol, drugs) to cope with anger</li><li style="margin-bottom: 6px;">People around you commenting that your temper seems worse</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Your Personal Anger Management Plan</strong>
This week, you will create a written plan that you can keep and refer to whenever you need it. Your plan should include:</p><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">My top triggers (situations, people, internal states)</li><li style="margin-bottom: 6px;">My personal warning signs (physical signals that anger is building)</li><li style="margin-bottom: 6px;">My timeout plan (what I will say, where I will go, what I will do to cool down)</li><li style="margin-bottom: 6px;">My go-to cool-down strategies (breathing, PMR, grounding, cold water, exercise)</li><li style="margin-bottom: 6px;">My hot thought traps (the types of hot thoughts I fall into most) and my cool thought replacements</li><li style="margin-bottom: 6px;">My assertive communication scripts (I-statements I can use for common conflicts)</li><li style="margin-bottom: 6px;">My support people (who I can call when I need help)</li><li style="margin-bottom: 6px;">My daily maintenance routine (relaxation practice, anger tracking, stress management)</li></ol><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Continuing the Work</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Keep using the daily tracker for at least 3 more months</li><li style="margin-bottom: 6px;">Practice PMR or deep breathing daily, even on good days</li><li style="margin-bottom: 6px;">Review your anger management plan once a month</li><li style="margin-bottom: 6px;">Reach out to your clinician or support person if anger starts escalating</li><li style="margin-bottom: 6px;">Remember: asking for help is a sign of strength, not failure</li></ul>`,
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
        type: "STYLED_CONTENT",
        title: "Why Children Misbehave",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Every parent deals with challenging child behavior. Tantrums, defiance, whining, hitting, refusing to follow directions — these behaviors are stressful and exhausting. But they are also normal parts of child development. Understanding why children misbehave is the first step toward changing the pattern.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">Common Reasons Children Misbehave</h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Attention-Seeking</strong>: Children need attention like they need food and water. If they cannot get positive attention (praise, play, conversation), they will seek negative attention (acting out, whining, breaking rules). Negative attention is still attention, and for a child, any attention is better than being ignored.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Testing Boundaries</strong>: Children are constantly learning where the limits are. When a child breaks a rule, they are often asking: "Is this rule real? What happens if I push past it?" This is not defiance for the sake of defiance — it is how children learn about the world and their place in it.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Skill Deficits</strong>: Sometimes children misbehave because they genuinely do not have the skills to do what is being asked. A 3-year-old who hits when frustrated may not yet have the language skills to say "I'm angry." A 6-year-old who has messy tantrums may not have learned how to manage big emotions. They are not choosing to be difficult — they are struggling with something they have not yet learned.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Developmental Stage</strong>: What looks like misbehavior is often age-appropriate behavior. Toddlers say "no" to everything because they are developing independence. Preschoolers have meltdowns because their emotional brains are growing faster than their ability to regulate. Older children push back as they develop their own identity. Knowing what is typical for your child's age helps you set realistic expectations.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Stress and Transitions</strong>: Changes in routine, family stress, a new sibling, moving, starting school, parental conflict — all of these can trigger increased behavior problems. Children often express stress through their behavior because they do not have the words or self-awareness to say "I'm stressed."</li></ol><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Behavior Equation</strong>
All behavior follows a predictable pattern called the ABC model:</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">A — Antecedent</strong> (What happens before the behavior)
This is the trigger or the situation. It includes what you asked the child to do, what was happening in the environment, and the child's internal state (tired, hungry, overstimulated).</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">B — Behavior</strong> (What the child does)
This is the specific, observable action. Describe it in concrete terms: "She screamed and threw her toy" rather than "She had a bad attitude."</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">C — Consequence</strong> (What happens after the behavior)
This is the most important part. The consequence determines whether the behavior will happen again. If the child gets what they want after a tantrum (the toy, your attention, escape from a task), the tantrum is more likely to happen next time. If the tantrum does not work and calm behavior does, the child learns to use calm behavior instead.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Key Insight</strong>
You cannot directly control your child's behavior. But you can control the antecedents (how you set up situations) and the consequences (how you respond). By changing what comes before and after the behavior, you change the behavior itself.</p><p style="margin-bottom: 8px; line-height: 1.6;">This program will teach you specific, research-backed techniques for:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Giving your child plenty of positive attention so they do not need to seek negative attention</li><li style="margin-bottom: 6px;">Setting clear expectations and giving effective commands</li><li style="margin-bottom: 6px;">Responding to misbehavior in ways that reduce it over time</li><li style="margin-bottom: 6px;">Building a stronger, more positive relationship with your child</li></ul>`,
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
        type: "STYLED_CONTENT",
        title: "The Power of Special Time",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Special Time is one of the most powerful tools in this entire program. It is 15 minutes of daily, one-on-one, child-led play where your only job is to follow your child's lead and shower them with positive attention. It sounds simple, but the effects are profound.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What Special Time Is</strong>
Special Time is a daily 15-minute period where:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Your child chooses the activity (within reason — constructive play, not screens)</li><li style="margin-bottom: 6px;">You follow their lead completely</li><li style="margin-bottom: 6px;">You give them your undivided attention (no phone, no other children, no multitasking)</li><li style="margin-bottom: 6px;">You use PRIDE skills (explained below)</li><li style="margin-bottom: 6px;">You do NOT give commands, ask leading questions, or criticize</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What Special Time Is NOT</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">It is not a reward for good behavior (it happens every day regardless)</li><li style="margin-bottom: 6px;">It is not regular playtime (it has specific rules about what you do and do not do)</li><li style="margin-bottom: 6px;">It is not a teaching moment (resist the urge to correct, instruct, or quiz)</li><li style="margin-bottom: 6px;">It is not screen time or watching TV together</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Why Special Time Works</strong>
Special Time works because it directly addresses the number one cause of child behavior problems: the need for attention. When children get 15 minutes of focused, positive, unconditional attention every day, their need to seek attention through misbehavior drops dramatically.</p><p style="margin-bottom: 12px; line-height: 1.6;">Special Time also rebuilds the parent-child relationship. When interactions have become mostly negative (commands, corrections, arguments), both parent and child start to dread being around each other. Special Time creates a daily experience of genuine enjoyment and connection.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The PRIDE Skills</strong>
During Special Time, use these five skills:</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">P — Praise</strong>: Give specific, labeled praise. "Great job stacking those blocks so carefully!" "I love how you are sharing the crayons with me!" (Not just "Good job.")</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">R — Reflect</strong>: Repeat or paraphrase what your child says. Child: "I'm making a castle." Parent: "You're building a big castle!" This shows you are listening and interested.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">I — Imitate</strong>: Copy what your child is doing. If they stack blocks, you stack blocks. If they draw a sun, you draw a sun. This tells the child: "What you are doing matters. I want to do it too."</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">D — Describe</strong>: Narrate what your child is doing like a sportscaster. "You're putting the red block on top of the blue one. Now you're reaching for the green one." This communicates that you are paying close attention.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">E — Enthusiasm</strong>: Show genuine excitement and warmth. Smile, use an animated voice, lean in. Your enthusiasm tells your child that spending time with them is enjoyable, not a chore.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Rules for Special Time</strong>
During Special Time, avoid:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Commands</strong>: Do not tell the child what to do. No "Put that there" or "Why don't you try this?"</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Questions</strong>: Minimize questions, especially leading ones. Questions put you in charge. Instead of "What color is that?" say "You picked the blue one!"</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Criticism</strong>: No correcting, teaching, or negative comments. If the child draws a green sun, do not say "Suns are yellow." Say "You're drawing a bright green sun!"</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Getting Started</strong>
1. Pick a consistent daily time (after school, before dinner, etc.)
2. Set a timer for 15 minutes
3. Let your child choose the activity
4. Practice PRIDE skills for the full 15 minutes
5. When the timer goes off, say something like: "Our special time is over for today. I really enjoyed playing with you. We'll do it again tomorrow."</p><p style="margin-bottom: 12px; line-height: 1.6;">Most parents report noticeable changes in their child's behavior within 1-2 weeks of consistent Special Time.</p>`,
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
        type: "STYLED_CONTENT",
        title: "The Power of Labeled Praise",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Praise is the most underused parenting tool available. Most parents give far more corrections, commands, and criticisms than they give praise. Research consistently shows that a high ratio of positive attention to corrective attention is one of the strongest predictors of good child behavior and a healthy parent-child relationship.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Generic Praise vs. Labeled Praise</strong>
Not all praise is equally effective.</p><p style="margin-bottom: 12px; line-height: 1.6;">Generic praise is vague: "Good job." "Nice." "Way to go." It tells the child you approve, but it does not tell them exactly what they did right. The child has to guess what you liked.</p><p style="margin-bottom: 12px; line-height: 1.6;">Labeled praise is specific: "Great job putting your shoes on all by yourself!" "I love how gently you are petting the dog." "Thank you for using your indoor voice." Labeled praise tells the child exactly which behavior you want to see again.</p><p style="margin-bottom: 8px; line-height: 1.6;">Labeled praise is more effective because:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">It teaches the child which specific behaviors you value</li><li style="margin-bottom: 6px;">It is more believable ("Good job" can sound hollow; specific praise sounds genuine)</li><li style="margin-bottom: 6px;">It builds the child's competence and confidence (they know exactly what they did well)</li><li style="margin-bottom: 6px;">It increases the chance the behavior will happen again</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Examples of Labeled Praise</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">"Thank you for coming the first time I called you." (compliance)</li><li style="margin-bottom: 6px;">"I noticed you shared your snack with your brother. That was very kind." (sharing)</li><li style="margin-bottom: 6px;">"You worked really hard on that homework even though it was tough. I'm proud of your effort." (persistence)</li><li style="margin-bottom: 6px;">"Great job using your words to tell me you were frustrated instead of yelling." (emotional regulation)</li><li style="margin-bottom: 6px;">"I love how you put your plate in the sink without being asked." (responsibility)</li><li style="margin-bottom: 6px;">"You waited so patiently while I was on the phone. Thank you." (patience)</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The 5:1 Ratio</strong>
Research shows that the healthiest relationships — including parent-child relationships — have at least 5 positive interactions for every 1 negative interaction. This is called the 5:1 ratio.</p><p style="margin-bottom: 12px; line-height: 1.6;">Most parents in struggling relationships with their children are at a 1:1 ratio or even a 1:5 ratio (more negatives than positives). Shifting this ratio is one of the fastest ways to improve your child's behavior and your relationship with them.</p><p style="margin-bottom: 8px; line-height: 1.6;">To build your ratio:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Give labeled praise every time you notice your child doing something positive, even small things</li><li style="margin-bottom: 6px;">Praise effort, not just results ("You tried so hard" matters more than "You got it right")</li><li style="margin-bottom: 6px;">Praise the absence of problem behavior ("You played so nicely with your sister all morning")</li><li style="margin-bottom: 6px;">Catch behaviors you normally take for granted (sitting quietly, eating without complaint, following a routine)</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What You Pay Attention To Grows</strong>
This is the single most important principle in parenting: behaviors that get attention increase, and behaviors that are ignored decrease. If you spend most of your energy reacting to misbehavior, misbehavior grows. If you spend most of your energy noticing and praising good behavior, good behavior grows.</p><p style="margin-bottom: 12px; line-height: 1.6;">This does not mean you ignore all misbehavior (later sessions cover how to respond effectively). It means you deliberately shift your attention toward the positive. Think of praise as sunlight — whatever you shine it on will grow.</p>`,
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
        type: "STYLED_CONTENT",
        title: "The Art of Active Ignoring",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Active ignoring is one of the most effective — and most difficult — parenting techniques. It works by removing the attention that fuels minor misbehavior. When a child whines, throws a tantrum, makes silly noises for attention, or repeats an annoying behavior to get a reaction, active ignoring removes the payoff.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">How Active Ignoring Works</strong>
Remember the principle from last session: behaviors that get attention increase. This works in reverse too: behaviors that get no attention decrease. When you actively ignore a minor misbehavior, you are removing the fuel that keeps it going.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Steps of Active Ignoring</strong>
1. <strong style="color: var(--steady-teal);">Decide</strong>: Quickly determine if the behavior is safe to ignore (see guidelines below).
2. <strong style="color: var(--steady-teal);">Turn Away</strong>: Physically turn your body away from the child. Do not make eye contact.
3. <strong style="color: var(--steady-teal);">Zero Attention</strong>: Give absolutely no attention to the behavior — no eye contact, no sighing, no facial expressions, no commentary, no arguing, no explaining. Pretend the behavior is invisible.
4. <strong style="color: var(--steady-teal);">Stay Calm</strong>: This is the hardest part. The child will likely escalate the behavior before stopping (this is called an "extinction burst" — it gets worse before it gets better). Stay calm and keep ignoring.
5. <strong style="color: var(--steady-teal);">Praise Immediately When the Behavior Stops</strong>: The moment the child stops the unwanted behavior and does something appropriate (even if it is just being quiet for a few seconds), turn back toward them, make eye contact, and give specific labeled praise. "Thank you for using your calm voice. Now I can listen to you."</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What TO Ignore (Minor, Attention-Seeking Behaviors)</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Whining</li><li style="margin-bottom: 6px;">Pouting or sulking</li><li style="margin-bottom: 6px;">Mild tantrums (crying, foot-stomping when they do not get what they want)</li><li style="margin-bottom: 6px;">Making silly noises or faces for attention</li><li style="margin-bottom: 6px;">Repeating the same request after you have said no</li><li style="margin-bottom: 6px;">Talking back or arguing (after you have stated your decision once)</li><li style="margin-bottom: 6px;">Dramatic displays of frustration (flopping on the floor, sighing loudly)</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What NOT to Ignore (Dangerous or Destructive Behaviors)</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Hitting, kicking, biting, or any physical aggression toward people</li><li style="margin-bottom: 6px;">Destroying property</li><li style="margin-bottom: 6px;">Self-harm</li><li style="margin-bottom: 6px;">Running into the street or other safety issues</li><li style="margin-bottom: 6px;">Extreme verbal aggression or threats</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">These behaviors need an immediate, calm response (which you will learn in later sessions). They should never be ignored.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Extinction Burst</strong>
When you first start ignoring a behavior that used to get attention, the behavior will almost always get worse before it gets better. The child is thinking: "This used to work. Maybe I'm not doing it hard enough." So they scream louder, whine more intensely, or have a bigger tantrum.</p><p style="margin-bottom: 12px; line-height: 1.6;">This is normal and expected. If you give in during the extinction burst, you teach the child that escalating works — and the behavior will be worse than before. If you hold firm, the behavior will decrease significantly within a few days to a week.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Golden Rule of Active Ignoring</strong>
Active ignoring ONLY works when paired with positive attention for good behavior. If you ignore misbehavior but also ignore good behavior, the child has no way to earn your attention. The equation is: ignore the negative + praise the positive = behavior change.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Commands That Work",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">One of the most common sources of parent-child conflict is commands — telling your child what to do. Many behavior problems are not actually about defiance; they are about how the command was given. Research shows that changing the way you give commands can dramatically improve compliance without any punishment needed.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Why Commands Fail</strong>
Most parents make the same mistakes with commands:</p><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Question Commands</strong>: "Can you put your shoes on?" "Would you like to clean up now?" These sound polite, but they give the child the option to say no. If it is not optional, do not phrase it as a question.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Chain Commands</strong>: "Go upstairs, brush your teeth, put on your pajamas, pick out a book, and get in bed." This is 5 commands in one sentence. Most children can hold 1-2 instructions at a time. Chain commands set them up to fail.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Vague Commands</strong>: "Be good." "Clean up." "Behave yourself." These mean different things to different people. Your child may genuinely not know what you expect.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Repeated Commands</strong>: Saying the same thing 5 times, getting louder each time. This teaches the child they do not need to listen until you yell.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Shouted Commands from Across the Room</strong>: "COME SET THE TABLE!" yelled from the kitchen while the child is watching TV in another room. The command gets lost in the distance and competes with the distraction.</li></ol><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">How to Give Effective Commands</h3><p style="margin-bottom: 12px; line-height: 1.6;">Step 1: <strong style="color: var(--steady-teal);">Get Close</strong> — Walk over to your child. Get within arm's reach. Do not yell commands from another room.</p><p style="margin-bottom: 12px; line-height: 1.6;">Step 2: <strong style="color: var(--steady-teal);">Get Their Attention</strong> — Say their name and wait for eye contact. Gently touch their shoulder if needed. Make sure they are looking at you before you speak.</p><p style="margin-bottom: 12px; line-height: 1.6;">Step 3: <strong style="color: var(--steady-teal);">Use a Firm, Calm Voice</strong> — Not angry, not pleading, not questioning. Firm and matter-of-fact.</p><p style="margin-bottom: 12px; line-height: 1.6;">Step 4: <strong style="color: var(--steady-teal);">Be Specific</strong> — Tell them exactly what to do. "Please put your shoes on the shoe rack by the door" is far better than "Clean up."</p><p style="margin-bottom: 12px; line-height: 1.6;">Step 5: <strong style="color: var(--steady-teal);">One Command at a Time</strong> — Give one instruction. Wait for it to be completed before giving the next one.</p><p style="margin-bottom: 12px; line-height: 1.6;">Step 6: <strong style="color: var(--steady-teal);">Wait 5 Seconds</strong> — After giving the command, be silent and wait. Count to 5 slowly in your head. Most children need a moment to process. Do not repeat the command, nag, or explain. Just wait.</p><p style="margin-bottom: 12px; line-height: 1.6;">Step 7: <strong style="color: var(--steady-teal);">Follow Through</strong> — If the child complies, praise immediately: "Thank you for putting your shoes away the first time I asked!" If the child does not comply after 5 seconds, calmly give the command one more time. If they still do not comply, follow through with a consequence (covered in later sessions).</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Do vs. Don't Commands</strong>
Tell children what TO do rather than what NOT to do.</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Instead of "Stop running" → "Please walk."</li><li style="margin-bottom: 6px;">Instead of "Don't yell" → "Please use your indoor voice."</li><li style="margin-bottom: 6px;">Instead of "Stop hitting your brother" → "Keep your hands to yourself."</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Positive commands give children a clear action to take. Negative commands only tell them to stop, without providing an alternative behavior.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Realistic Expectations</strong>
No child will comply 100% of the time. A realistic compliance goal is 75-80%. If your child is complying with most commands most of the time, you are in a healthy range. Expecting perfection creates frustration for both of you.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Consequences That Teach",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Consequences are one of the most important tools in parenting, but many parents struggle with using them effectively. The goal of a consequence is not to punish — it is to teach. When consequences are used well, children learn that their choices have predictable outcomes, which helps them make better choices in the future.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Natural Consequences</strong>
Natural consequences happen on their own, without any action from you. They are the natural result of a child's behavior.</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Forgetting their lunch → being hungry at school</li><li style="margin-bottom: 6px;">Not wearing a coat → feeling cold</li><li style="margin-bottom: 6px;">Being rough with a toy → the toy breaks</li><li style="margin-bottom: 6px;">Not studying → getting a poor grade</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Natural consequences are powerful teachers because the lesson comes from reality, not from you. The child cannot argue with you about it — the consequence just happens.</p><p style="margin-bottom: 8px; line-height: 1.6;">When to let natural consequences play out:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">The consequence is not dangerous</li><li style="margin-bottom: 6px;">The consequence is not too severe for the child's age</li><li style="margin-bottom: 6px;">The child can learn from the experience</li></ul><p style="margin-bottom: 8px; line-height: 1.6;">When NOT to use natural consequences:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">The natural consequence involves danger (running into traffic, touching a hot stove)</li><li style="margin-bottom: 6px;">The consequence is too far in the future for the child to connect it to the behavior</li><li style="margin-bottom: 6px;">The consequence affects other people unfairly</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Logical Consequences</strong>
Logical consequences are set up by you, the parent, but they are directly related to the behavior. They are the "then" in an "if... then" statement.</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">If you throw your toy → the toy goes away for the rest of the day</li><li style="margin-bottom: 6px;">If you do not finish homework before dinner → no screen time after dinner</li><li style="margin-bottom: 6px;">If you hit your sibling → you lose the privilege of playing together and must play separately for 30 minutes</li><li style="margin-bottom: 6px;">If you do not clean up your mess → you do not get to start a new activity until the mess is cleaned</li></ul><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">Rules for Effective Logical Consequences</h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Related</strong>: The consequence must be connected to the behavior. Taking away dessert because a child did not clean their room does not make logical sense. Taking away the toy that was thrown does.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Reasonable</strong>: The consequence must be proportional. Grounding a child for a week because they forgot to put away their backpack is too extreme. Losing screen time for the evening is proportional.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Respectful</strong>: Deliver the consequence in a calm, matter-of-fact voice. No yelling, no shaming, no long lectures. "You threw the toy, so the toy is going away for today. You can have it back tomorrow."</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Revealed in Advance</strong>: Whenever possible, tell the child what the consequence will be before the behavior happens. "If you throw your food, dinner is over." This gives the child a chance to make a good choice. It also removes the sense that you are being arbitrary or unfair.</li></ol><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">How to Deliver a Logical Consequence</strong>
1. State what happened: "You threw your toy."
2. State the consequence: "The toy goes away for the rest of today."
3. Follow through immediately (remove the toy)
4. Keep it brief: Do not lecture. Do not say "I told you so." Do not re-explain for 5 minutes.
5. Move on: After the consequence is delivered, return to normal interaction. Do not hold a grudge.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Common Mistakes</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Making consequences too harsh in the heat of the moment ("You're grounded for a month!")</li><li style="margin-bottom: 6px;">Threatening consequences you do not follow through on</li><li style="margin-bottom: 6px;">Using consequences that are unrelated to the behavior</li><li style="margin-bottom: 6px;">Delivering consequences with anger, sarcasm, or shaming</li><li style="margin-bottom: 6px;">Not following through consistently (sometimes enforcing, sometimes not)</li></ul>`,
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
        type: "STYLED_CONTENT",
        title: "How to Use Timeout Effectively",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Timeout is one of the most well-researched discipline techniques in child psychology. When done correctly, it is highly effective. When done incorrectly, it can make behavior worse. This session teaches you the evidence-based timeout procedure so you can use it with confidence.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What Timeout Actually Is</strong>
Timeout is short for "time out from positive reinforcement." It means briefly removing the child from a situation where they are receiving attention (positive or negative) for misbehavior. It is not isolation, it is not punishment, and it is not meant to scare the child. It is a calm, structured break that removes the payoff for the misbehavior.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">When to Use Timeout</strong>
Timeout is appropriate for:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Aggressive behavior (hitting, kicking, biting, throwing things at people)</li><li style="margin-bottom: 6px;">Deliberate destruction of property</li><li style="margin-bottom: 6px;">Dangerous behavior</li><li style="margin-bottom: 6px;">Non-compliance after a warning has been given and ignored</li></ul><p style="margin-bottom: 8px; line-height: 1.6;">Timeout is NOT appropriate for:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Minor, attention-seeking behaviors (use active ignoring instead)</li><li style="margin-bottom: 6px;">Accidents (spilling milk, tripping)</li><li style="margin-bottom: 6px;">Emotional expressions (crying, being scared, being sad)</li><li style="margin-bottom: 6px;">Behaviors the child does not yet have the skills to control</li></ul><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">The Timeout Procedure</h3><p style="margin-bottom: 12px; line-height: 1.6;">Step 1: <strong style="color: var(--steady-teal);">Give a Warning</strong>
The first time the behavior occurs, give one clear, calm warning: "If you hit again, you will go to timeout." This gives the child a chance to stop. Only give ONE warning — if you warn 5 times, you are teaching the child they get 5 free passes.</p><p style="margin-bottom: 12px; line-height: 1.6;">Step 2: <strong style="color: var(--steady-teal);">Follow Through</strong>
If the behavior happens again after the warning, immediately and calmly say: "You hit again. You need to go to timeout." Lead the child to the timeout spot. If the child resists, gently but firmly guide them.</p><p style="margin-bottom: 8px; line-height: 1.6;">Step 3: <strong style="color: var(--steady-teal);">The Timeout Spot</strong>
Choose a spot that is:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Boring (no toys, no screens, no interesting things to look at)</li><li style="margin-bottom: 6px;">Safe (no dangerous objects)</li><li style="margin-bottom: 6px;">Visible to you (you need to see the child but not interact with them)</li><li style="margin-bottom: 6px;">Consistent (always the same spot)</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Good options: a specific chair, a step, a corner of the room. Bad options: the child's bedroom (too many toys), a dark closet (scary and punitive), anywhere the child cannot be seen.</p><p style="margin-bottom: 8px; line-height: 1.6;">Step 4: <strong style="color: var(--steady-teal);">Set the Timer</strong>
The general guideline is 1 minute per year of age:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">2-year-old: 2 minutes</li><li style="margin-bottom: 6px;">3-year-old: 3 minutes</li><li style="margin-bottom: 6px;">5-year-old: 5 minutes</li><li style="margin-bottom: 6px;">Maximum: 5 minutes for any age (longer timeouts are not more effective)</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">The timer starts when the child is sitting calmly. If the child is screaming or leaving the spot, the timer has not started. Calmly say: "The timer starts when you are sitting quietly." Do not argue, lecture, or engage. Wait.</p><p style="margin-bottom: 12px; line-height: 1.6;">Step 5: <strong style="color: var(--steady-teal);">During Timeout</strong>
Give zero attention. Do not talk to the child, make eye contact, or respond to anything they say. If they leave the spot, calmly return them without conversation. If other children try to interact with the child in timeout, redirect them.</p><p style="margin-bottom: 12px; line-height: 1.6;">Step 6: <strong style="color: var(--steady-teal);">End Timeout</strong>
When the timer goes off, go to the child calmly. Get down to their eye level. Briefly state why they were in timeout: "You went to timeout because you hit your sister." Then reconnect: "I love you. Let's go play." Do not lecture. Do not make the child apologize in the moment (forced apologies teach nothing). Keep it brief and warm.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">After Timeout: Reconnect, Don't Lecture</strong>
The most important part of timeout is what happens after. Many parents use this moment to deliver a long lecture about why the behavior was wrong. This undermines the timeout. The child has already experienced the consequence. Now they need to know that you still love them and that they can start fresh. A brief, warm reconnection does this.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">When Timeout Is Not Working</strong>
If timeout is not reducing the behavior after 2-3 consistent weeks, check:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Are you following the procedure exactly?</li><li style="margin-bottom: 6px;">Is the timeout spot truly boring?</li><li style="margin-bottom: 6px;">Are you giving too many warnings before following through?</li><li style="margin-bottom: 6px;">Are you providing enough positive attention and praise at other times?</li><li style="margin-bottom: 6px;">Is the behavior driven by something timeout cannot address (anxiety, skill deficit, sensory issue)?</li></ul>`,
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
        type: "STYLED_CONTENT",
        title: "Reward Systems That Work",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Behavior charts and reward systems can be powerful tools for motivating positive behavior change in children. They work by making expectations clear, tracking progress visually, and providing incentives for meeting goals. However, they need to be set up correctly to be effective.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">How Behavior Charts Work</strong>
A behavior chart is a visual tracking system where a child earns stickers, checkmarks, or tokens for performing specific target behaviors. When they earn enough, they receive a predetermined reward.</p><p style="margin-bottom: 12px; line-height: 1.6;">Example: A child who struggles with morning routines earns a sticker for each step completed independently (getting dressed, brushing teeth, eating breakfast, putting on shoes). After earning 20 stickers, they get to choose a family activity for Saturday.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">Rules for Effective Behavior Charts</h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Target Specific Behaviors</strong>: Do not put "be good" on a chart. Instead, use specific, observable behaviors: "Put dirty clothes in the hamper," "Use kind words with your sister," "Complete homework before screen time." The child should know exactly what earns a sticker.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Start with 1-2 Behaviors</strong>: Do not overload the chart. Start with the 1-2 behaviors you most want to change. Once those are consistent, you can swap in new ones.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Make Goals Achievable</strong>: Set the bar low at first. If the child needs 100 stickers before earning a reward, they will give up after day 2. Start with small goals (earn 5 stickers = reward) and gradually increase.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Give Rewards Immediately at First</strong>: Young children (under 6) need immediate reinforcement. Earning a sticker right after the behavior, plus a small daily reward, is more effective than a weekly reward. As the child gets older, you can stretch the time between behavior and reward.</li></ol><p style="margin-bottom: 12px; line-height: 1.6;">5. <strong style="color: var(--steady-teal);">Use a Mix of Rewards</strong>: Rewards do not have to be toys or treats. Many of the best rewards are activities, privileges, and time:
   - Extra story at bedtime
   - Choosing what's for dinner
   - 15 extra minutes before bedtime
   - A special outing with one parent
   - Having a friend over
   - Choosing a family movie
   - Screen time
   - A small treat or toy</p><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Pair with Praise</strong>: The chart is a supplement to labeled praise, not a replacement. Every time a child earns a sticker, pair it with specific praise: "You put your plate in the sink without being asked — great job! You earned a sticker!"</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Fade Rewards Over Time</strong>: The ultimate goal is for the behavior to become a habit that does not need external rewards. Once a behavior is consistent for 3-4 weeks, start reducing the rewards gradually. The praise continues, but the stickers and prizes phase out.</li></ol><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">Age-Appropriate Reward Ideas</h3><p style="margin-bottom: 12px; line-height: 1.6;">Toddlers (2-3): Sticker on a simple chart, immediate small reward (special snack, extra story, choosing a song), lots of praise and excitement.</p><p style="margin-bottom: 12px; line-height: 1.6;">Preschool (4-5): Sticker chart with small daily rewards and a bigger weekly reward for meeting the goal. Let the child decorate the chart.</p><p style="margin-bottom: 12px; line-height: 1.6;">School-Age (6-10): Token economy (tokens earned for behaviors, spent on rewards from a "menu"). Can handle longer delays between behavior and reward. Involve the child in choosing target behaviors and rewards.</p><p style="margin-bottom: 12px; line-height: 1.6;">Preteen (11-12): Point system. More autonomy in setting goals. Rewards focus on privileges (later bedtime, screen time, outings with friends). Less need for visible charts — can use a simple tracking app or notebook.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">When Behavior Charts Do Not Work</strong>
If a chart is not working after 2 weeks of consistent use, check:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Are the target behaviors specific and achievable?</li><li style="margin-bottom: 6px;">Is the reward meaningful to the child?</li><li style="margin-bottom: 6px;">Is the goal reachable (not too many stickers needed)?</li><li style="margin-bottom: 6px;">Are you pairing the chart with praise?</li><li style="margin-bottom: 6px;">Are you being consistent (tracking every day, not forgetting)?</li><li style="margin-bottom: 6px;">Is the child involved in the process (they helped choose behaviors and rewards)?</li></ul>`,
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
        type: "STYLED_CONTENT",
        title: "When Things Get Tough",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">You now have a solid toolkit of parenting skills: Special Time, labeled praise, active ignoring, effective commands, natural and logical consequences, timeout, and behavior charts. This session is about applying these tools to the specific situations that challenge parents most.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Public Misbehavior</strong>
The grocery store tantrum. The restaurant meltdown. The playground defiance. Public misbehavior feels worse because other people are watching, and many parents respond differently in public (giving in to stop the embarrassment) than they would at home.</p><p style="margin-bottom: 8px; line-height: 1.6;">Prevention strategies:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Prepare your child in advance: "We are going to the store. The rules are: stay near me, use your indoor voice, and no asking for treats. If you follow the rules, you can choose one small item at the end."</li><li style="margin-bottom: 6px;">Bring something to keep them occupied (a small toy, a snack, a job like crossing items off the list)</li><li style="margin-bottom: 6px;">Go at times when your child is not tired or hungry (HALT applies to children too)</li><li style="margin-bottom: 6px;">Keep trips as short as possible for young children</li></ul><p style="margin-bottom: 8px; line-height: 1.6;">In-the-moment response:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Use the same strategies you use at home (do not change the rules because you are in public)</li><li style="margin-bottom: 6px;">Stay calm. Other people's judgment is temporary; your consistency is permanent.</li><li style="margin-bottom: 6px;">If the child melts down, calmly remove them from the situation: "We need to take a break. We are going to the car until you are calm."</li><li style="margin-bottom: 6px;">Follow through on stated consequences, even when it is inconvenient</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Sibling Conflict</strong>
Sibling fighting is one of the most draining parts of parenting. Children fight with siblings for attention, out of jealousy, because of developmental differences, and because they are still learning social skills.</p><p style="margin-bottom: 8px; line-height: 1.6;">Strategies:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Do not always play referee. For minor conflicts (arguing over who gets the remote), let them try to work it out themselves first. Step in only if it becomes physical or one child is being bullied.</li><li style="margin-bottom: 6px;">Avoid taking sides. Instead of deciding who is right, focus on the solution: "You both want the same toy. What is a solution that works for both of you?"</li><li style="margin-bottom: 6px;">Praise cooperation heavily: "You two figured that out all by yourselves! Great teamwork."</li><li style="margin-bottom: 6px;">Give each child one-on-one time (Special Time) so they are not competing for your attention</li><li style="margin-bottom: 6px;">Teach conflict resolution skills: "Tell your brother how you feel using your words. Say: I feel upset when you take my toy because I was playing with it."</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Transitions</strong>
Many children struggle with transitions — stopping one activity and starting another. Tantrums at bedtime, resistance to leaving the park, meltdowns when screen time ends.</p><p style="margin-bottom: 8px; line-height: 1.6;">Strategies:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Give advance warnings: "In 5 minutes, we are leaving the park." "In 2 minutes, the tablet is going off."</li><li style="margin-bottom: 6px;">Use visual timers for younger children</li><li style="margin-bottom: 6px;">Create consistent routines so transitions are predictable</li><li style="margin-bottom: 6px;">Offer choices within the transition: "It's time to leave. Do you want to go down the slide one more time or swing one more time?"</li><li style="margin-bottom: 6px;">Praise smooth transitions: "You turned off the TV the first time I asked — awesome job!"</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Homework Battles</strong>
Homework conflicts are extremely common and can poison the parent-child relationship if not handled well.</p><p style="margin-bottom: 8px; line-height: 1.6;">Strategies:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Create a consistent homework routine (same time, same place, same rules every day)</li><li style="margin-bottom: 6px;">Set a timer for work periods and break periods (e.g., 20 minutes of work, 5 minutes of break)</li><li style="margin-bottom: 6px;">Be available to help, but do not do the work for them</li><li style="margin-bottom: 6px;">Praise effort, not perfection: "I can see you are really working hard on this math."</li><li style="margin-bottom: 6px;">Use natural consequences: if homework is not done, the child faces the school consequence (not turning it in)</li><li style="margin-bottom: 6px;">Do not make homework a power struggle. If it is becoming a nightly battle, talk to the teacher about adjusting expectations.</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Key to All Challenging Situations: Prevention + Consistency</strong>
The best way to handle difficult situations is to prevent them. Prepare your child, set clear expectations, and structure the environment for success. When misbehavior does happen, respond consistently using the same tools you use at home. Children do best when the rules are the same everywhere, every time, with every caregiver.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Keeping Your Gains",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">You have spent 9 weeks building a toolkit of evidence-based parenting skills. You have learned how to fill your child's attention tank with Special Time and labeled praise. You have learned when to ignore and when to intervene. You have learned how to give commands that work, use consequences that teach, and structure discipline with timeout. You have tackled challenging situations with prevention plans and consistent responses.</p><p style="margin-bottom: 12px; line-height: 1.6;">This final session is about making sure these skills stick and continue to grow with your child.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Maintaining Consistency</strong>
The most important factor in long-term parenting success is consistency. Children need to know that the rules are the same today as they were yesterday and will be tomorrow. This does not mean being rigid — it means being predictable.</p><p style="margin-bottom: 8px; line-height: 1.6;">Tips for maintaining consistency:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Keep doing Special Time daily, even when things are going well. It is preventive, not just reactive.</li><li style="margin-bottom: 6px;">Continue giving 10+ labeled praises per day. This never stops being effective.</li><li style="margin-bottom: 6px;">Stick to the consequences you have set. Inconsistency is the fastest way to undo progress.</li><li style="margin-bottom: 6px;">Communicate with co-parents, grandparents, and caregivers so everyone is using the same strategies.</li><li style="margin-bottom: 6px;">Review your skills periodically — read through your notes from this program once a month.</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Adjusting Strategies as Your Child Grows</strong>
The principles of effective parenting stay the same across ages, but the specific techniques need to adjust:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Toddlers and preschoolers need more physical guidance, simpler language, immediate rewards, and shorter timeouts.</li><li style="margin-bottom: 6px;">School-age children can handle more verbal reasoning, longer delays between behavior and reward, and more involvement in setting rules and consequences.</li><li style="margin-bottom: 6px;">Preteens and teenagers need increasing autonomy, natural consequences over imposed consequences, collaborative problem-solving, and respect for their growing independence.</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">As your child develops, shift from directing to guiding to collaborating. The balance of power changes, but the core ingredients remain: positive attention, clear expectations, consistent follow-through, and a warm, respectful relationship.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">When to Seek Additional Help</strong>
These strategies work for the majority of common behavior problems. However, some situations need additional professional support:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Behavior problems that do not improve after 3-4 months of consistent strategy use</li><li style="margin-bottom: 6px;">Extreme aggression, self-harm, or cruelty to animals</li><li style="margin-bottom: 6px;">Behavior problems that occur primarily at school (may indicate learning disability, ADHD, or social difficulties)</li><li style="margin-bottom: 6px;">Signs of anxiety or depression in your child</li><li style="margin-bottom: 6px;">Significant family stress (divorce, trauma, grief) affecting the child</li><li style="margin-bottom: 6px;">Your own anger, frustration, or mental health making it hard to use these skills consistently</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Seeking help is not a failure. It is a sign that you care enough to get your child what they need.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Your Parenting Plan</strong>
This week, you will create a written parenting plan that summarizes what you have learned and what you will continue doing. Keep this plan where you can see it and review it monthly.</p>`,
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
