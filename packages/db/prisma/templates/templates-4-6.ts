// ============================================================================
// Templates 4-6: CPT for PTSD, CBT-I for Insomnia, Relapse Prevention
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
// TEMPLATE 4 — Cognitive Processing Therapy (CPT) for PTSD — 12 Modules
// ============================================================================
export async function seedTemplate4_CPT_PTSD(prisma: any, clinicianId: string) {
  const program = await prisma.program.create({
    data: {
      clinicianId,
      title: "Cognitive Processing Therapy for PTSD",
      description:
        "A 12-session evidence-based treatment for post-traumatic stress disorder. CPT helps you understand and change unhelpful thoughts related to your trauma so you can reduce PTSD symptoms and improve your quality of life.",
      category: "PTSD",
      durationWeeks: 12,
      cadence: "WEEKLY",
      sessionType: "ONE_ON_ONE",
      isTemplate: true,
      status: "PUBLISHED",
    },
  });

  // ── Module 1: Education About PTSD ──────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    0,
    {
      title: "Education About PTSD",
      subtitle: "Session 1",
      summary: "Learn what PTSD is, how it develops, and how CPT will help you recover.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Understanding PTSD",
        content: {
          type: "TEXT",
          body: "Post-Traumatic Stress Disorder (PTSD) is a condition that can develop after you experience or witness something very frightening, dangerous, or shocking. It is not a sign of weakness. PTSD happens because your brain is trying to protect you from future danger, but it gets stuck in alarm mode.\n\n**How PTSD Works**\nWhen something traumatic happens, your brain stores the memory differently than normal memories. Instead of being filed away as something that happened in the past, the memory stays active. This is why you might:\n\n- Have nightmares or flashbacks that feel like the event is happening again\n- Feel on edge or jumpy, as if danger is always nearby\n- Avoid people, places, or situations that remind you of what happened\n- Feel numb, disconnected, or unable to enjoy things you used to like\n- Have trouble sleeping or concentrating\n- Feel guilty, ashamed, or angry much of the time\n\n**What Keeps PTSD Going**\nTwo main things keep PTSD symptoms going:\n\n1. **Avoidance**: When you avoid thinking about or talking about what happened, your brain never gets the chance to process the memory properly. The memory stays raw and unprocessed.\n\n2. **Stuck Points**: After trauma, most people develop certain beliefs that feel true but actually keep them stuck. For example, you might believe the trauma was your fault, that the world is completely dangerous, or that you can never trust anyone again. These beliefs — called stuck points — cause painful emotions and keep you from recovering.\n\n**How CPT Helps**\nCognitive Processing Therapy works by helping you:\n- Process your trauma memory so it loses its power over you\n- Identify and challenge stuck points — the unhelpful beliefs that keep you suffering\n- Develop more balanced, accurate ways of thinking about what happened and about yourself\n\nThis is a 12-session program. Research shows that most people experience significant improvement in PTSD symptoms by the end of treatment. You do not need to describe your trauma in detail to benefit from this therapy.",
        },
      },
      {
        type: "ASSESSMENT",
        title: "PCL-5 (PTSD Checklist)",
        content: {
          type: "ASSESSMENT",
          title: "PCL-5 (PTSD Checklist for DSM-5)",
          instructions:
            "Below is a list of problems that people sometimes have in response to a very stressful experience. Please read each problem carefully and then select one of the numbers to indicate how much you have been bothered by that problem in the past month.",
          scoringMethod: "SUM",
          questions: [
            { question: "Repeated, disturbing, and unwanted memories of the stressful experience?", type: "LIKERT", required: true, sortOrder: 0, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Repeated, disturbing dreams of the stressful experience?", type: "LIKERT", required: true, sortOrder: 1, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Suddenly feeling or acting as if the stressful experience were actually happening again (as if you were actually back there reliving it)?", type: "LIKERT", required: true, sortOrder: 2, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Feeling very upset when something reminded you of the stressful experience?", type: "LIKERT", required: true, sortOrder: 3, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Having strong physical reactions when something reminded you of the stressful experience (for example, heart pounding, trouble breathing, sweating)?", type: "LIKERT", required: true, sortOrder: 4, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Avoiding memories, thoughts, or feelings related to the stressful experience?", type: "LIKERT", required: true, sortOrder: 5, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Avoiding external reminders of the stressful experience (for example, people, places, conversations, activities, objects, or situations)?", type: "LIKERT", required: true, sortOrder: 6, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Trouble remembering important parts of the stressful experience?", type: "LIKERT", required: true, sortOrder: 7, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Having strong negative beliefs about yourself, other people, or the world (for example, having thoughts such as: I am bad, there is something seriously wrong with me, no one can be trusted, the world is completely dangerous)?", type: "LIKERT", required: true, sortOrder: 8, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Blaming yourself or someone else for the stressful experience or what happened after it?", type: "LIKERT", required: true, sortOrder: 9, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Having strong negative feelings such as fear, horror, anger, guilt, or shame?", type: "LIKERT", required: true, sortOrder: 10, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Loss of interest in activities that you used to enjoy?", type: "LIKERT", required: true, sortOrder: 11, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Feeling distant or cut off from other people?", type: "LIKERT", required: true, sortOrder: 12, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Trouble experiencing positive feelings (for example, being unable to feel happiness or have loving feelings for people close to you)?", type: "LIKERT", required: true, sortOrder: 13, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Irritable behavior, angry outbursts, or acting aggressively?", type: "LIKERT", required: true, sortOrder: 14, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Taking too many risks or doing things that could cause you harm?", type: "LIKERT", required: true, sortOrder: 15, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Being \"superalert\" or watchful or on guard?", type: "LIKERT", required: true, sortOrder: 16, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Feeling jumpy or easily startled?", type: "LIKERT", required: true, sortOrder: 17, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Having difficulty concentrating?", type: "LIKERT", required: true, sortOrder: 18, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Trouble falling or staying asleep?", type: "LIKERT", required: true, sortOrder: 19, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
          ],
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Impact Statement: The Meaning of Your Trauma",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "Please write at least one page about what it means to you that this traumatic event happened. Do not describe the event itself — instead, focus on why you think it happened and how it has changed your views about yourself and the world. Consider the following areas: safety, trust, power/control, self-esteem, and relationships with others.",
          ],
          spaceSizeHint: "large",
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 1 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Write your Impact Statement: at least one page about what it means to you that the trauma happened. Focus on why you think it happened and how it changed your beliefs about yourself, others, and the world." },
            { type: "ACTION", description: "Read the handout on PTSD symptoms and notice which symptoms you experience most. Keep this list handy for your next session." },
            { type: "JOURNAL_PROMPT", description: "Each day this week, notice one moment when a PTSD symptom showed up. Write down what happened, what you felt in your body, and what thought went through your mind." },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 2: The Meaning of the Event ──────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    1,
    {
      title: "The Meaning of the Event",
      subtitle: "Session 2",
      summary: "Review your impact statement and begin identifying stuck points.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Understanding Stuck Points",
        content: {
          type: "TEXT",
          body: "Now that you have written your Impact Statement, we can begin to look at how you have been making sense of what happened. After a trauma, it is very common to develop beliefs that feel completely true but actually keep you stuck in pain. We call these \"stuck points.\"\n\n**What Are Stuck Points?**\nStuck points are thoughts or beliefs that:\n- Developed because of the trauma or were made stronger by it\n- Keep you feeling afraid, guilty, ashamed, or angry\n- Stop you from recovering and moving forward\n- Often contain words like \"always,\" \"never,\" \"should,\" \"must,\" or \"everyone\"\n\n**Common Types of Stuck Points**\nStuck points usually fall into two categories:\n\n1. **Beliefs about why the trauma happened (assimilated beliefs)**: These are attempts to keep your old view of the world intact by blaming yourself. Examples:\n   - \"I should have known better.\"\n   - \"If I had done something differently, it wouldn't have happened.\"\n   - \"I must have done something to cause it.\"\n\n2. **Beliefs about yourself and the world that changed because of the trauma (over-accommodated beliefs)**: These are new, extreme beliefs that developed after the trauma. Examples:\n   - \"I can never trust anyone.\"\n   - \"The world is completely dangerous.\"\n   - \"I am permanently damaged.\"\n   - \"No one will ever love me.\"\n\n**Why Stuck Points Matter**\nStuck points are the engine that drives PTSD symptoms. When you believe \"the world is always dangerous,\" your brain stays in alarm mode. When you believe \"it was my fault,\" you feel guilt and shame constantly. Changing these beliefs is the core of CPT and the key to your recovery.\n\n**Identifying Your Stuck Points**\nLook at your Impact Statement and notice any statements that:\n- Contain extreme language (always, never, everyone, no one)\n- Blame you for things that were not in your control\n- Make broad conclusions about yourself, others, or the world\n- Keep you feeling bad about yourself or afraid of the future",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Common Stuck Points",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Recognizing Stuck Points",
          cards: [
            { title: "Self-Blame", body: "Believing you caused or could have prevented the trauma. Ask yourself: did I have all the information I have now? Was I really in control of what happened?", emoji: "🪞" },
            { title: "All-or-Nothing", body: "Seeing things in extremes with no middle ground. Phrases like 'always,' 'never,' 'everyone,' and 'no one' are clues that a thought might be a stuck point.", emoji: "⚖️" },
            { title: "Overgeneralization", body: "Taking one bad experience and applying it to everything. One person harmed you, but that does not mean all people are dangerous.", emoji: "🌐" },
            { title: "Mind Reading", body: "Assuming you know what others think or that they judge you. You cannot read minds. Check the evidence before accepting the thought.", emoji: "🔮" },
            { title: "Emotional Reasoning", body: "Believing something is true because it feels true. Feeling unsafe does not mean you are unsafe right now. Feelings are real but not always accurate.", emoji: "💭" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 2 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Re-read your Impact Statement and underline or highlight any stuck points you can find. Write each stuck point on a separate line in your journal." },
            { type: "ACTION", description: "Complete at least one ABC Worksheet each day: A = Activating event (what happened), B = Belief or stuck point (what you told yourself), C = Consequence (how you felt and what you did)." },
            { type: "JOURNAL_PROMPT", description: "Write about a moment this week when you noticed a stuck point showing up in your thinking. What was the situation? What was the stuck point? How did it make you feel?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 3: Identifying Thoughts and Feelings ─────────────
  await createModuleWithParts(
    prisma,
    program.id,
    2,
    {
      title: "Identifying Thoughts and Feelings",
      subtitle: "Session 3",
      summary: "Learn to tell the difference between thoughts and feelings, and see how thoughts drive emotions.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "The Connection Between Thoughts and Feelings",
        content: {
          type: "TEXT",
          body: "One of the most important skills in CPT is learning to tell the difference between a thought and a feeling. This sounds simple, but when you are in distress, thoughts and feelings can feel like the same thing.\n\n**Thoughts vs. Feelings**\nA feeling is an emotion — it can usually be described in one word: sad, angry, scared, guilty, ashamed, happy, calm. A thought is a sentence or statement in your mind — it is your brain's interpretation of what is happening.\n\nHere is the key insight: **It is not the event itself that causes your feelings — it is what you tell yourself about the event.**\n\nExample:\n- Event: A friend does not return your call.\n- Thought A: \"They must be busy.\" → Feeling: neutral, understanding\n- Thought B: \"Nobody cares about me.\" → Feeling: sad, lonely\n- Thought C: \"Something bad happened to them.\" → Feeling: worried, anxious\n\nThe same event leads to completely different feelings depending on the thought. This is powerful because while you cannot always control what happens to you, you can learn to notice and change your thoughts.\n\n**The ABC Model**\nIn CPT, we use the ABC model to break down these connections:\n- **A = Activating Event**: Something happens (or you remember something)\n- **B = Belief / Thought**: What you tell yourself about it\n- **C = Consequence**: The emotion you feel and what you do as a result\n\nMost of the time, we jump straight from A to C — something happens and we feel terrible. We skip B entirely. The goal of CPT is to slow down and catch B so you can examine whether that thought is accurate.\n\n**Natural Emotions vs. Manufactured Emotions**\nSome emotions after trauma are natural and need to be felt — sadness about what you lost, genuine fear during a dangerous moment. Other emotions are manufactured by stuck points — guilt based on false self-blame, shame based on inaccurate beliefs about yourself. Natural emotions pass with time. Manufactured emotions stay as long as the stuck point stays. CPT focuses on the manufactured emotions by changing the thoughts that create them.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Catching Your Thoughts",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Thought Awareness Tools",
          cards: [
            { title: "The Pause", body: "When you notice a strong emotion, stop and ask: 'What just went through my mind?' The thought that triggers the emotion often flashes by so quickly you miss it. Pausing helps you catch it.", emoji: "⏸️" },
            { title: "Name It to Tame It", body: "Label your emotions specifically. Instead of 'I feel bad,' try 'I feel guilty' or 'I feel ashamed.' Specific labels help your brain process emotions more effectively.", emoji: "🏷️" },
            { title: "The Reporter", body: "Pretend you are a reporter describing the situation. Stick to the facts only — no interpretations. This helps separate what actually happened from the meaning you gave it.", emoji: "📰" },
            { title: "Thought vs. Fact", body: "Ask yourself: 'Is this a thought or a fact?' A fact can be verified. A thought is your interpretation. 'They did not call back' is a fact. 'They do not care about me' is a thought.", emoji: "🔍" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 3 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Complete at least one ABC Worksheet every day this week. Focus on moments when you felt a strong negative emotion. Write down the activating event, the belief/thought, and the consequence (emotion + behavior)." },
            { type: "ACTION", description: "Practice labeling your emotions with specific words throughout the day. When you notice you feel 'bad,' dig deeper: is it guilt, shame, anger, sadness, fear, or something else?" },
            { type: "JOURNAL_PROMPT", description: "Pick one ABC Worksheet from this week. Look at the belief you wrote down. Is it a fact or an interpretation? How might someone else see the same situation differently?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 4: Challenging Thoughts (Socratic Questioning) ───
  await createModuleWithParts(
    prisma,
    program.id,
    3,
    {
      title: "Challenging Thoughts",
      subtitle: "Session 4",
      summary: "Learn Socratic questioning to examine whether your stuck points are accurate.",
      estimatedMinutes: 55,
    },
    [
      {
        type: "TEXT",
        title: "Socratic Questioning",
        content: {
          type: "TEXT",
          body: "Now that you can identify your thoughts and see how they create emotions, the next step is learning to question those thoughts. This does not mean telling yourself to \"think positive\" or pretending everything is fine. It means examining your thoughts the way a scientist would examine a hypothesis — with curiosity and evidence.\n\n**Socratic Questions**\nUse these questions to examine any stuck point:\n\n1. **What is the evidence for and against this thought?**\nList facts (not feelings) that support the thought, then list facts that go against it. Be honest on both sides.\n\n2. **Is this thought a habit or based on facts?**\nSometimes we think something because we have thought it so many times, not because it is actually true.\n\n3. **Am I confusing a thought with a fact?**\n\"I feel like a failure\" is a thought, not a fact. What would a fact look like?\n\n4. **Am I thinking in all-or-nothing terms?**\nLook for extremes: always, never, everyone, no one, completely, totally. Reality usually falls somewhere in the middle.\n\n5. **Am I using a reliable source of information?**\nIs your conclusion based on what you actually know, or on what you fear? Are you relying on your emotions as evidence?\n\n6. **Am I confusing \"possible\" with \"likely\"?**\nJust because something could happen does not mean it probably will happen.\n\n7. **Are my judgments based on feelings rather than facts?**\nFeeling unsafe and being unsafe are two different things.\n\n**How to Use Socratic Questioning**\nTake one of your stuck points and run it through these questions. Write down your answers. Be patient with yourself — this skill takes practice. You are not trying to talk yourself out of your feelings. You are trying to see if the thought behind the feeling is actually accurate.",
        },
      },
      {
        type: "CHECKLIST",
        title: "Socratic Questioning Checklist",
        content: {
          type: "CHECKLIST",
          items: [
            { text: "I chose a stuck point to examine", sortOrder: 0 },
            { text: "I listed evidence FOR the thought (facts only)", sortOrder: 1 },
            { text: "I listed evidence AGAINST the thought (facts only)", sortOrder: 2 },
            { text: "I checked for all-or-nothing language", sortOrder: 3 },
            { text: "I asked whether this is a habit thought or fact-based", sortOrder: 4 },
            { text: "I checked if I am confusing a thought with a fact", sortOrder: 5 },
            { text: "I wrote a more balanced alternative thought", sortOrder: 6 },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 4 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Choose your top 3 stuck points from your list. Run each one through the Socratic Questions. Write down the evidence for and against each stuck point." },
            { type: "ACTION", description: "Complete at least one Challenging Questions Worksheet per day. Use the list of Socratic Questions to examine a stuck point from your ABC Worksheet." },
            { type: "JOURNAL_PROMPT", description: "After challenging one of your stuck points, write about what you found. Did the evidence support the thought or go against it? How do you feel now compared to before you examined it?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 5: Patterns of Problematic Thinking ──────────────
  await createModuleWithParts(
    prisma,
    program.id,
    4,
    {
      title: "Patterns of Problematic Thinking",
      subtitle: "Session 5",
      summary: "Identify common thinking patterns that keep you stuck and learn to spot them in daily life.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Problematic Thinking Patterns",
        content: {
          type: "TEXT",
          body: "Everyone uses shortcuts in their thinking — our brains are wired to make quick judgments. After trauma, these shortcuts can become extreme and lead to patterns that keep PTSD going. Learning to recognize these patterns is one of the most powerful tools in your recovery.\n\n**The 7 Problematic Thinking Patterns**\n\n1. **Jumping to Conclusions (or Mind Reading)**\nAssuming you know what others are thinking without checking. Example: \"Everyone can tell something is wrong with me.\"\n\n2. **Exaggerating or Minimizing**\nBlowing something out of proportion or making it seem less important than it is. Example: Exaggerating — \"One mistake means I am a total failure.\" Minimizing — \"The abuse was not that bad, other people had it worse.\"\n\n3. **Ignoring Important Parts of the Situation**\nFocusing only on the parts that fit your stuck point and ignoring evidence that goes against it. Example: \"He lied to me, so nobody can be trusted\" — ignoring the many people who have been honest with you.\n\n4. **Oversimplifying**\nSeeing things as all good or all bad with no middle ground. Example: \"Either I am completely safe or I am in danger.\"\n\n5. **Overgeneralizing**\nTaking one event and applying it to all situations. Example: \"One person hurt me, so all people are dangerous.\"\n\n6. **Mind Reading**\nAssuming you know what others think or feel about you without asking. Example: \"My therapist probably thinks I am pathetic.\"\n\n7. **Emotional Reasoning**\nUsing your feelings as evidence for a belief. Example: \"I feel guilty, so it must have been my fault.\"\n\n**Spotting the Patterns**\nWhen you notice a stuck point, ask yourself: \"Which pattern am I using?\" Often, a single stuck point uses more than one pattern. Naming the pattern takes away some of its power and makes it easier to challenge.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Thinking Pattern Quick Reference",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Problematic Thinking Patterns",
          cards: [
            { title: "Jumping to Conclusions", body: "You assume something is true without checking the facts. Ask: 'Do I have actual evidence for this, or am I guessing?'", emoji: "🦘" },
            { title: "Exaggerating or Minimizing", body: "You make something bigger or smaller than it really is. Ask: 'Am I seeing this in its true size, or am I distorting it?'", emoji: "🔎" },
            { title: "Ignoring Evidence", body: "You focus only on information that fits your stuck point. Ask: 'What am I leaving out? What evidence goes against my thought?'", emoji: "🙈" },
            { title: "Oversimplifying", body: "You see things in black and white with no gray area. Ask: 'Is there a middle ground between these two extremes?'", emoji: "⬛" },
            { title: "Overgeneralizing", body: "You take one experience and apply it to everything. Ask: 'Am I making a rule out of one example?'", emoji: "🌊" },
            { title: "Emotional Reasoning", body: "You treat a feeling as proof of a fact. Ask: 'Just because I feel this way, does that make it true?'", emoji: "🌀" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 5 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Go back through your list of stuck points and label each one with the problematic thinking pattern(s) it uses. Write the pattern name next to each stuck point." },
            { type: "ACTION", description: "Complete at least one Problematic Thinking Patterns Worksheet per day. When you catch a stuck point, identify which of the 7 patterns it fits." },
            { type: "JOURNAL_PROMPT", description: "Which thinking pattern do you use most often? Write about a specific time this week when you caught yourself using it. What was the situation, the thought, and the pattern?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 6: Challenging Beliefs Worksheet — Part 1 ────────
  await createModuleWithParts(
    prisma,
    program.id,
    5,
    {
      title: "Challenging Beliefs — Learning the Worksheet",
      subtitle: "Session 6",
      summary: "Learn to use the Challenging Beliefs Worksheet, the main tool for changing stuck points.",
      estimatedMinutes: 55,
    },
    [
      {
        type: "TEXT",
        title: "The Challenging Beliefs Worksheet",
        content: {
          type: "TEXT",
          body: "The Challenging Beliefs Worksheet is the main tool in CPT. It brings together everything you have learned so far — identifying stuck points, Socratic questioning, and recognizing problematic thinking patterns — into one structured process.\n\n**The Worksheet Has These Columns:**\n\n**Column A — Situation**: Briefly describe what happened or what you were thinking about.\n\n**Column B — Automatic Thought / Stuck Point**: Write down the stuck point exactly as it appeared in your mind.\n\n**Column C — Emotion(s)**: Name the emotion(s) you felt. Rate each one from 0 to 100 for intensity.\n\n**Column D — Challenging Questions**: Use the Socratic Questions to examine the thought. Write your answers:\n- What is the evidence for and against?\n- Is this a habit or based on facts?\n- Am I using a problematic thinking pattern?\n- What would I tell a friend who had this thought?\n\n**Column E — Problematic Pattern(s)**: Which of the 7 patterns does this thought use?\n\n**Column F — Alternative Thought**: Write a more balanced, accurate thought that takes all the evidence into account. This is not a positive thought — it is a realistic one.\n\n**Column G — Re-Rate Emotion(s)**: Now re-rate the emotions from Column C. They usually decrease — sometimes a lot, sometimes a little. Any decrease shows the process is working.\n\n**Important Tips**\n- The alternative thought should feel believable to you, not like empty positive thinking\n- It is okay if the emotion does not change much at first — this takes practice\n- Use the worksheet every time you notice a stuck point causing distress\n- Bring your completed worksheets to each session",
        },
      },
      {
        type: "CHECKLIST",
        title: "Challenging Beliefs Worksheet Steps",
        content: {
          type: "CHECKLIST",
          items: [
            { text: "Describe the situation briefly (Column A)", sortOrder: 0 },
            { text: "Write the stuck point word-for-word (Column B)", sortOrder: 1 },
            { text: "Name and rate emotions 0-100 (Column C)", sortOrder: 2 },
            { text: "Answer at least 3 Socratic Questions (Column D)", sortOrder: 3 },
            { text: "Identify problematic thinking pattern(s) (Column E)", sortOrder: 4 },
            { text: "Write a balanced alternative thought (Column F)", sortOrder: 5 },
            { text: "Re-rate your emotions (Column G)", sortOrder: 6 },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 6 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Complete at least one full Challenging Beliefs Worksheet per day. Choose your most distressing stuck points first." },
            { type: "ACTION", description: "Keep your Stuck Points Log updated — add any new stuck points you notice during the week." },
            { type: "BRING_TO_SESSION", description: "Bring all completed Challenging Beliefs Worksheets from this week. We will review them together." },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 7: Safety ────────────────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    6,
    {
      title: "Beliefs About Safety",
      subtitle: "Session 7",
      summary: "Examine how trauma changed your beliefs about safety for yourself and others.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Safety After Trauma",
        content: {
          type: "TEXT",
          body: "Starting with this session, we will focus on five key areas where trauma tends to create stuck points: safety, trust, power and control, esteem, and intimacy. We start with safety because it is the most basic need.\n\n**How Trauma Changes Beliefs About Safety**\n\nBefore trauma, most people have some balance in how they view safety. They know that bad things can happen, but they also know that most of the time, most situations are safe enough.\n\nAfter trauma, beliefs about safety often shift to one of two extremes:\n\n1. **Over-accommodated (too extreme)**: \"The world is completely dangerous.\" \"I am never safe.\" \"Something bad could happen at any moment.\" This leads to constant anxiety, hypervigilance, avoidance of normal activities, and an inability to relax.\n\n2. **Assimilated (self-blame)**: \"It happened because I was not careful enough.\" \"If I am perfect in my safety behaviors, I can prevent anything bad from happening.\" This leads to excessive safety behaviors, self-blame, and the illusion that you can control everything.\n\n**Self-Safety vs. Other-Safety**\nSome people develop stuck points about their own safety: \"I can never be safe again.\" Others develop stuck points about the safety of loved ones: \"If I do not watch my children every second, something terrible will happen to them.\"\n\n**Finding Balance**\nA balanced belief about safety acknowledges that:\n- Bad things can happen, but they do not happen all the time\n- You can take reasonable precautions without letting fear run your life\n- Feeling unsafe and being unsafe are not the same thing\n- You can learn to tolerate some uncertainty without falling apart\n\n**Your Task**\nLook at your stuck points related to safety. Ask:\n- Am I treating the world as more dangerous than it actually is?\n- Am I blaming myself for not being safe enough?\n- What safety behaviors am I doing that go beyond what is reasonable?\n- What would a balanced view of safety look like for me?",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Rebalancing Safety Beliefs",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Safety Reframes",
          cards: [
            { title: "Safe Enough", body: "You do not need to be 100% safe to live your life. 'Safe enough' means you have taken reasonable precautions and can move forward even with some uncertainty.", emoji: "🛡️" },
            { title: "Then vs. Now", body: "You were unsafe then, during the trauma. Right now, in this moment, check: are you actually in danger? If not, remind yourself: 'That was then. This is now. I am safe right now.'", emoji: "🕰️" },
            { title: "Reasonable Precautions", body: "There is a difference between reasonable safety (locking your door) and excessive safety (never leaving the house). Ask: would most people consider this precaution reasonable?", emoji: "🔒" },
            { title: "Tolerating Uncertainty", body: "No one can guarantee complete safety. The goal is not to eliminate all risk — it is to live fully while managing risk wisely.", emoji: "🌤️" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 7 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Complete at least one Challenging Beliefs Worksheet per day focused on a stuck point about safety (your safety or others' safety)." },
            { type: "ACTION", description: "Choose one avoidance behavior related to safety and take a small step toward reducing it. For example, if you avoid going to the grocery store alone, go once this week for a short trip." },
            { type: "JOURNAL_PROMPT", description: "Write about how your beliefs about safety changed after the trauma. What did you believe before? What do you believe now? What would a balanced view of safety look like?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 8: Trust ─────────────────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    7,
    {
      title: "Beliefs About Trust",
      subtitle: "Session 8",
      summary: "Examine how trauma changed your beliefs about trusting yourself and others.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Trust After Trauma",
        content: {
          type: "TEXT",
          body: "Trust is one of the areas most deeply affected by trauma. Many people with PTSD struggle to trust others, and just as importantly, they struggle to trust themselves.\n\n**How Trauma Disrupts Trust**\n\nTrust involves making yourself vulnerable — believing that another person will not hurt you, or that your own judgment is sound. When trauma happens, especially if it involves another person, trust gets shattered in multiple directions:\n\n**Trust in Others**\nCommon stuck points:\n- \"I can never trust anyone again.\"\n- \"People will always let me down.\"\n- \"If I let someone get close, they will hurt me.\"\n- \"No one is who they seem to be.\"\n\nThese beliefs lead to isolation, difficulty in relationships, and loneliness — which actually make PTSD symptoms worse.\n\n**Trust in Yourself**\nCommon stuck points:\n- \"I cannot trust my own judgment — look what happened.\"\n- \"My instincts failed me, so they are worthless.\"\n- \"I will always make bad decisions.\"\n- \"I should have seen it coming.\"\n\nThese beliefs lead to indecision, dependence on others, and constant second-guessing.\n\n**Finding Balanced Trust**\nBalanced trust recognizes that:\n- Most people are trustworthy in most situations, but not all people are trustworthy in all situations\n- Trust is earned gradually — it does not have to be all or nothing\n- Your judgment has been right many times, even if it was wrong in one situation\n- Trusting yourself does not mean being perfect — it means you can handle what comes\n- You can set boundaries while still allowing people in\n\n**The Trust Continuum**\nInstead of thinking about trust as on or off, think of it as a scale from 0 to 100. Different people earn different levels of trust. A new coworker might be at 30. A close friend might be at 80. No one needs to be at 100. This gives you much more flexibility than all-or-nothing trust.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Rebuilding Trust",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Trust Tools",
          cards: [
            { title: "The Trust Thermometer", body: "Rate your trust in someone on a 0-100 scale. Ask what specific evidence moves the number up or down. This prevents all-or-nothing trust decisions.", emoji: "🌡️" },
            { title: "Past Judgment Check", body: "List 5 times your judgment was right. Your brain focuses on the time it failed, but your track record is likely much better than your stuck point suggests.", emoji: "✅" },
            { title: "Small Tests", body: "Rebuild trust gradually by giving small tests — share something minor and see how the person responds. Trust is built through consistent small actions over time.", emoji: "🧪" },
            { title: "One Person, One Situation", body: "The person who harmed you was one person in one situation. That does not make a rule about all people in all situations. Check your overgeneralization.", emoji: "👤" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 8 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Complete at least one Challenging Beliefs Worksheet per day focused on a stuck point about trust — either trust in others or trust in yourself." },
            { type: "ACTION", description: "Use the Trust Thermometer to rate your trust in three important people in your life. Write down what specific evidence supports each rating." },
            { type: "JOURNAL_PROMPT", description: "Write about how your ability to trust changed after the trauma. Do you struggle more with trusting others or trusting yourself? What would balanced trust look like in your closest relationship?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 9: Power and Control ─────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    8,
    {
      title: "Beliefs About Power and Control",
      subtitle: "Session 9",
      summary: "Examine how trauma changed your beliefs about having control over your life.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Power and Control After Trauma",
        content: {
          type: "TEXT",
          body: "During a traumatic event, you experienced a loss of control — something terrible happened and you could not stop it. This experience can profoundly change how you think about power and control in your daily life.\n\n**How Trauma Disrupts Beliefs About Control**\n\n**Over-Controlling (Over-Accommodation)**\nSome people respond to trauma by trying to control everything:\n- \"If I control every detail, nothing bad will happen again.\"\n- \"I must always be in charge to stay safe.\"\n- \"If I let go of control even a little, something terrible will happen.\"\n\nThis leads to rigid behavior, difficulty relaxing, conflicts with others, exhaustion, and anxiety when things do not go according to plan.\n\n**Helplessness (Assimilation)**\nOther people respond by giving up on control entirely:\n- \"I have no control over anything — what is the point of trying?\"\n- \"Bad things just happen to me and there is nothing I can do.\"\n- \"I am completely powerless.\"\n\nThis leads to passivity, depression, difficulty making decisions, and a sense of hopelessness.\n\n**Finding Balanced Control**\nThe reality is that you have control over some things and not others. Balanced beliefs about power and control recognize:\n\n- You have control over your own choices, even when you cannot control the outcome\n- Not being able to prevent the trauma does not mean you are powerless in all areas of life\n- Trying to control everything is exhausting and impossible\n- Having influence is different from having total control\n- It is possible to feel empowered while accepting that some things are beyond your control\n\n**What You Can and Cannot Control**\nYou CAN control: your effort, your reactions, how you treat people, seeking help, setting boundaries, your daily habits.\nYou CANNOT control: other people's actions, random events, the past, the weather, other people's feelings about you.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Reclaiming Power",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Power and Control Tools",
          cards: [
            { title: "Circle of Control", body: "Draw two circles. Put things you CAN control in the inner circle and things you CANNOT control in the outer. Focus your energy on the inner circle. Let go of the outer.", emoji: "⭕" },
            { title: "Choice Points", body: "Even in difficult situations, you have choices. Identifying your options — even small ones — is an act of power. Ask: 'What CAN I do right now?'", emoji: "🔀" },
            { title: "Good Enough Control", body: "You do not need perfect control. 'Good enough' preparation and planning is healthy. Perfectionism in control is a sign of anxiety, not strength.", emoji: "👍" },
            { title: "Influence vs. Control", body: "You can influence many things without controlling them. You can communicate your needs, set boundaries, and make choices — the outcome may vary, and that is okay.", emoji: "🌱" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 9 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Complete at least one Challenging Beliefs Worksheet per day focused on a stuck point about power and control — either over-controlling or helplessness." },
            { type: "ACTION", description: "Draw your Circle of Control. Write down 5 things in your inner circle (things you can control) and 5 in the outer circle (things you cannot). Put the diagram somewhere you will see it daily." },
            { type: "JOURNAL_PROMPT", description: "Do you tend more toward over-controlling or toward helplessness? Write about a specific situation this week where you noticed this pattern. How would a balanced response look?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 10: Esteem ───────────────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    9,
    {
      title: "Beliefs About Esteem",
      subtitle: "Session 10",
      summary: "Examine how trauma changed your beliefs about your own worth and the worth of others.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Esteem After Trauma",
        content: {
          type: "TEXT",
          body: "Esteem — how you value yourself and others — is often deeply damaged by trauma. Many people with PTSD carry intense shame and believe they are fundamentally broken, worthless, or different from everyone else.\n\n**How Trauma Disrupts Self-Esteem**\n\nCommon stuck points about self-esteem:\n- \"I am damaged goods.\"\n- \"What happened to me proves there is something wrong with me.\"\n- \"I am not as good as other people.\"\n- \"I am weak because I could not handle it.\"\n- \"I should be over this by now.\"\n- \"I do not deserve good things.\"\n\nThese beliefs lead to depression, withdrawal, self-sabotage, difficulty accepting compliments, and a deep sense of shame.\n\n**How Trauma Disrupts Esteem of Others**\n\nSome people develop stuck points about other people's worth:\n- \"People are basically selfish and cruel.\"\n- \"Nobody is truly good.\"\n- \"Everyone is just looking out for themselves.\"\n\nThese beliefs lead to cynicism, isolation, and difficulty forming relationships.\n\n**Shame vs. Guilt**\nIt is important to understand the difference:\n- **Guilt** says: \"I did something bad.\" Guilt is about a specific behavior.\n- **Shame** says: \"I am bad.\" Shame is about your whole self.\n\nGuilt can be healthy — it motivates you to make amends or change behavior. Shame is almost always destructive because it attacks your identity, not your actions.\n\nAfter trauma, many people carry shame that does not belong to them. If someone harmed you, the shame belongs to the person who chose to act, not to you.\n\n**Rebuilding Self-Esteem**\nBalanced self-esteem means:\n- You have worth regardless of what happened to you\n- Having been a victim does not define who you are\n- You can acknowledge your struggles without seeing yourself as broken\n- You deserve care, respect, and good things in your life\n- Surviving trauma takes strength, not weakness",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Rebuilding Esteem",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Esteem Tools",
          cards: [
            { title: "The Shame Test", body: "Ask: 'Would I feel shame if this happened to my best friend?' If not, the shame does not belong to you. Shame after trauma often lands on the wrong person.", emoji: "🪶" },
            { title: "Actions Over Identity", body: "Replace 'I am...' statements with 'I did...' or 'Something happened to me...' statements. You are not defined by the worst thing that happened to you.", emoji: "🔄" },
            { title: "Evidence of Worth", body: "List 5 things you have done that show your character — helping someone, surviving a hard time, learning something new. Your worth is shown through hundreds of moments, not one event.", emoji: "📋" },
            { title: "Compassionate Witness", body: "Imagine telling your story to someone who truly cares and would never blame you. What would they say? Speak to yourself the way they would.", emoji: "💙" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 10 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Complete at least one Challenging Beliefs Worksheet per day focused on a stuck point about self-esteem or the worth of others." },
            { type: "ACTION", description: "Write a list of 10 qualities, skills, or accomplishments that show your worth as a person. These can be small (I make good coffee) or big (I survived and am still here)." },
            { type: "JOURNAL_PROMPT", description: "Write about how the trauma affected how you see yourself. What did you believe about yourself before? What do you believe now? If shame is part of your experience, consider: does that shame rightfully belong to you?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 11: Intimacy ─────────────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    10,
    {
      title: "Beliefs About Intimacy",
      subtitle: "Session 11",
      summary: "Examine how trauma changed your ability to be close to others emotionally and physically.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Intimacy After Trauma",
        content: {
          type: "TEXT",
          body: "Intimacy is the ability to be close to someone — emotionally, physically, or both. Trauma can make intimacy feel dangerous, uncomfortable, or impossible. This module helps you examine your beliefs about closeness and connection.\n\n**How Trauma Disrupts Intimacy**\n\n**Emotional Intimacy**\nCommon stuck points:\n- \"If I let someone know the real me, they will leave.\"\n- \"Being vulnerable means being weak.\"\n- \"I cannot let anyone see how damaged I am.\"\n- \"I do not deserve love or connection.\"\n\nThese beliefs lead to emotional walls, surface-level relationships, and loneliness even when surrounded by people.\n\n**Physical Intimacy**\nEspecially after physical or sexual trauma, stuck points may include:\n- \"My body is not safe.\"\n- \"Being touched means losing control.\"\n- \"Physical closeness always leads to pain.\"\n- \"I am disgusting or tainted.\"\n\nThese beliefs can affect everything from hugging a friend to being intimate with a partner.\n\n**Self-Intimacy**\nSome people lose the ability to be comfortable with themselves:\n- \"I cannot stand being alone with my own thoughts.\"\n- \"I have to stay busy or the memories will come.\"\n- \"I do not really know who I am anymore.\"\n\n**Finding Balanced Intimacy**\nBalanced beliefs about intimacy recognize:\n- Closeness involves risk, but it also brings connection, support, and joy\n- You can set the pace for how close you get to someone\n- Vulnerability is not weakness — it is courage\n- Past experiences with intimacy do not determine future experiences\n- You deserve caring, respectful relationships\n- It is okay to take it slow and rebuild gradually\n\n**Moving Forward**\nRecovering intimacy does not mean forcing yourself into uncomfortable situations. It means:\n1. Identifying the stuck points that keep you isolated\n2. Challenging those stuck points with evidence\n3. Taking small, chosen steps toward connection at your own pace\n4. Communicating your needs and boundaries to people you trust",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Rebuilding Intimacy",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Intimacy Tools",
          cards: [
            { title: "Walls vs. Boundaries", body: "Walls keep everyone out and are built from fear. Boundaries are chosen limits that let safe people in while keeping unsafe people out. You need boundaries, not walls.", emoji: "🧱" },
            { title: "Gradual Steps", body: "You do not have to go from isolation to deep vulnerability overnight. Small steps count: making eye contact, sharing one honest thing, accepting a compliment. Each step builds capacity.", emoji: "🪜" },
            { title: "Chosen Vulnerability", body: "You get to choose when, with whom, and how much you open up. Vulnerability forced on you is violation. Vulnerability you choose is strength.", emoji: "🗝️" },
            { title: "Separating Past from Present", body: "The person in front of you now is not the person who harmed you. When old fear arises in a safe situation, remind yourself: this is a different person, a different time, a different place.", emoji: "🔀" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 11 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Complete at least one Challenging Beliefs Worksheet per day focused on a stuck point about intimacy — emotional closeness, physical closeness, or self-intimacy." },
            { type: "ACTION", description: "Choose one small step toward connection this week. This could be calling a friend, sharing something honest with someone you trust, or spending quiet time with yourself without distraction." },
            { type: "JOURNAL_PROMPT", description: "Write about what intimacy means to you now compared to before the trauma. What kind of closeness do you want in your life? What stuck points stand between you and that closeness?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 12: Looking Back, Moving Forward ─────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    11,
    {
      title: "Looking Back, Moving Forward",
      subtitle: "Session 12",
      summary: "Review your progress, re-assess PTSD symptoms, and build a plan for continued recovery.",
      estimatedMinutes: 55,
    },
    [
      {
        type: "TEXT",
        title: "How Far You Have Come",
        content: {
          type: "TEXT",
          body: "This is your final session of Cognitive Processing Therapy. Take a moment to recognize what you have accomplished. Over the past 12 weeks, you have done some of the hardest work a person can do — you have faced your trauma and changed the beliefs that were keeping you stuck.\n\n**What You Have Learned**\n- How PTSD works and why avoidance keeps it going\n- The difference between thoughts and feelings\n- How to identify stuck points — the beliefs that drive your pain\n- How to challenge those stuck points using Socratic Questioning\n- How to recognize problematic thinking patterns\n- How to use the Challenging Beliefs Worksheet to develop balanced, realistic thoughts\n- How trauma affects beliefs about safety, trust, power/control, esteem, and intimacy\n- How to develop more balanced beliefs in each of these areas\n\n**What Happens Now**\nCPT gives you skills for life. After this program:\n- You may still have some PTSD symptoms, but they should be significantly reduced\n- When stuck points come back — and they sometimes will — you have the tools to challenge them\n- You know how to use the Challenging Beliefs Worksheet on your own\n- You can identify problematic thinking patterns when they show up\n\n**Continuing Your Recovery**\n- Keep using the Challenging Beliefs Worksheet whenever you notice stuck points\n- If symptoms return or get worse, reach out to your therapist\n- Continue the healthy habits you have built during treatment\n- Be patient with yourself — recovery is not a straight line\n- Celebrate the courage it took to do this work\n\n**A Note About Setbacks**\nLife will bring new stressors. Sometimes an anniversary, a news story, or a new loss will bring old symptoms back temporarily. This does not mean treatment failed. It means you are human. Use your CPT skills to work through it, and reach out for support if you need it.",
        },
      },
      {
        type: "ASSESSMENT",
        title: "PCL-5 Post-Treatment",
        content: {
          type: "ASSESSMENT",
          title: "PCL-5 (PTSD Checklist for DSM-5) — Post-Treatment",
          instructions:
            "Below is a list of problems that people sometimes have in response to a very stressful experience. Please read each problem carefully and then select one of the numbers to indicate how much you have been bothered by that problem in the past month.",
          scoringMethod: "SUM",
          questions: [
            { question: "Repeated, disturbing, and unwanted memories of the stressful experience?", type: "LIKERT", required: true, sortOrder: 0, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Repeated, disturbing dreams of the stressful experience?", type: "LIKERT", required: true, sortOrder: 1, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Suddenly feeling or acting as if the stressful experience were actually happening again (as if you were actually back there reliving it)?", type: "LIKERT", required: true, sortOrder: 2, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Feeling very upset when something reminded you of the stressful experience?", type: "LIKERT", required: true, sortOrder: 3, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Having strong physical reactions when something reminded you of the stressful experience (for example, heart pounding, trouble breathing, sweating)?", type: "LIKERT", required: true, sortOrder: 4, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Avoiding memories, thoughts, or feelings related to the stressful experience?", type: "LIKERT", required: true, sortOrder: 5, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Avoiding external reminders of the stressful experience (for example, people, places, conversations, activities, objects, or situations)?", type: "LIKERT", required: true, sortOrder: 6, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Trouble remembering important parts of the stressful experience?", type: "LIKERT", required: true, sortOrder: 7, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Having strong negative beliefs about yourself, other people, or the world (for example, having thoughts such as: I am bad, there is something seriously wrong with me, no one can be trusted, the world is completely dangerous)?", type: "LIKERT", required: true, sortOrder: 8, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Blaming yourself or someone else for the stressful experience or what happened after it?", type: "LIKERT", required: true, sortOrder: 9, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Having strong negative feelings such as fear, horror, anger, guilt, or shame?", type: "LIKERT", required: true, sortOrder: 10, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Loss of interest in activities that you used to enjoy?", type: "LIKERT", required: true, sortOrder: 11, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Feeling distant or cut off from other people?", type: "LIKERT", required: true, sortOrder: 12, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Trouble experiencing positive feelings (for example, being unable to feel happiness or have loving feelings for people close to you)?", type: "LIKERT", required: true, sortOrder: 13, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Irritable behavior, angry outbursts, or acting aggressively?", type: "LIKERT", required: true, sortOrder: 14, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Taking too many risks or doing things that could cause you harm?", type: "LIKERT", required: true, sortOrder: 15, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Being \"superalert\" or watchful or on guard?", type: "LIKERT", required: true, sortOrder: 16, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Feeling jumpy or easily startled?", type: "LIKERT", required: true, sortOrder: 17, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Having difficulty concentrating?", type: "LIKERT", required: true, sortOrder: 18, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
            { question: "Trouble falling or staying asleep?", type: "LIKERT", required: true, sortOrder: 19, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all", likertMaxLabel: "Extremely" },
          ],
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Rewritten Impact Statement",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "Write a new Impact Statement about what it means to you NOW that the trauma happened. Focus on how your beliefs have changed over the course of treatment. How do you see yourself, others, and the world differently? What have you learned about your own strength? What are your hopes for the future?",
          ],
          spaceSizeHint: "large",
        },
      },
      {
        type: "CHECKLIST",
        title: "Continuing Recovery Plan",
        content: {
          type: "CHECKLIST",
          items: [
            { text: "I have a copy of the Challenging Beliefs Worksheet to use on my own", sortOrder: 0 },
            { text: "I know my top remaining stuck points and how to challenge them", sortOrder: 1 },
            { text: "I have identified at least 2 people I can reach out to for support", sortOrder: 2 },
            { text: "I know the warning signs that my symptoms are returning", sortOrder: 3 },
            { text: "I have a plan for what to do if symptoms get worse (including contacting my therapist)", sortOrder: 4 },
            { text: "I have written my new Impact Statement", sortOrder: 5 },
            { text: "I recognize the progress I have made", sortOrder: 6 },
          ],
        },
      },
    ]
  );

  // ── DailyTracker for PTSD ───────────────────────────────────
  const ptsdTracker = await prisma.dailyTracker.create({
    data: {
      programId: program.id,
      createdById: clinicianId,
      name: "PTSD Daily Check-In",
      description: "Track your PTSD symptoms, stuck points, and coping each day.",
    },
  });

  await prisma.dailyTrackerField.createMany({
    data: [
      { trackerId: ptsdTracker.id, label: "Overall distress level", fieldType: "SCALE", sortOrder: 0, isRequired: true, options: { min: 0, max: 10, minLabel: "No distress", maxLabel: "Extreme distress" } },
      { trackerId: ptsdTracker.id, label: "Intrusive memories or flashbacks", fieldType: "SCALE", sortOrder: 1, isRequired: true, options: { min: 0, max: 10, minLabel: "None", maxLabel: "Constant" } },
      { trackerId: ptsdTracker.id, label: "Avoidance behaviors", fieldType: "SCALE", sortOrder: 2, isRequired: true, options: { min: 0, max: 10, minLabel: "None", maxLabel: "Avoided many things" } },
      { trackerId: ptsdTracker.id, label: "Hypervigilance / feeling on edge", fieldType: "SCALE", sortOrder: 3, isRequired: true, options: { min: 0, max: 10, minLabel: "Calm", maxLabel: "Extremely on edge" } },
      { trackerId: ptsdTracker.id, label: "Did you notice a stuck point today?", fieldType: "YES_NO", sortOrder: 4, isRequired: true },
      { trackerId: ptsdTracker.id, label: "Did you challenge a stuck point today?", fieldType: "YES_NO", sortOrder: 5, isRequired: true },
      { trackerId: ptsdTracker.id, label: "Hours of sleep last night", fieldType: "NUMBER", sortOrder: 6, isRequired: true },
      { trackerId: ptsdTracker.id, label: "Nightmare last night?", fieldType: "YES_NO", sortOrder: 7, isRequired: true },
      { trackerId: ptsdTracker.id, label: "Coping strategies used today", fieldType: "MULTI_CHECK", sortOrder: 8, isRequired: false, options: { options: ["Challenging Beliefs Worksheet", "Grounding exercise", "Physical activity", "Talked to someone", "Deep breathing", "Journaling", "Other"] } },
      { trackerId: ptsdTracker.id, label: "Anything else to note about today", fieldType: "FREE_TEXT", sortOrder: 9, isRequired: false },
    ],
  });

  return program;
}


// ============================================================================
// TEMPLATE 5 — CBT-I (Cognitive Behavioral Therapy for Insomnia) — 6 Modules
// ============================================================================
export async function seedTemplate5_CBTI_Insomnia(prisma: any, clinicianId: string) {
  const program = await prisma.program.create({
    data: {
      clinicianId,
      title: "CBT-I for Insomnia",
      description:
        "A 6-session evidence-based treatment for chronic insomnia. CBT-I is the gold-standard first-line treatment recommended by the American College of Physicians. It addresses the thoughts, behaviors, and habits that keep insomnia going — without medication.",
      category: "Insomnia",
      durationWeeks: 6,
      cadence: "WEEKLY",
      sessionType: "ONE_ON_ONE",
      isTemplate: true,
      status: "PUBLISHED",
    },
  });

  // ── Module 1: Understanding Insomnia & Sleep Education ──────
  await createModuleWithParts(
    prisma,
    program.id,
    0,
    {
      title: "Understanding Insomnia and Sleep",
      subtitle: "Session 1",
      summary: "Learn how sleep works, what causes insomnia, and how CBT-I will help you sleep better.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "How Sleep Works",
        content: {
          type: "TEXT",
          body: "Sleep is not just \"shutting off\" — it is an active process controlled by two systems in your brain. Understanding these systems is the first step to fixing your sleep.\n\n**The Two-Process Model of Sleep**\n\n1. **Sleep Drive (Process S)**\nYour sleep drive works like hunger. The longer you are awake, the stronger your urge to sleep becomes. This is caused by a chemical called adenosine that builds up in your brain during the day. The more adenosine you have, the sleepier you feel. When you sleep, your brain clears the adenosine, and the cycle starts over.\n\nCaffeine works by blocking adenosine receptors — it does not reduce your need for sleep; it just masks it. That is why you crash when it wears off.\n\n2. **Circadian Rhythm (Process C)**\nYour circadian rhythm is your internal 24-hour clock. It controls when you feel alert and when you feel sleepy, mostly through a hormone called melatonin. Your brain starts releasing melatonin about 2 hours before your natural bedtime when the light dims. Bright light (especially blue light from screens) stops melatonin production.\n\n**Sleep Architecture**\nA normal night of sleep includes 4-6 cycles, each lasting about 90 minutes. Each cycle includes:\n- Light sleep (stages 1-2): Your body relaxes, heart rate slows\n- Deep sleep (stage 3): Physical restoration, immune function, memory consolidation\n- REM sleep: Dreaming, emotional processing, learning\n\nYou get more deep sleep early in the night and more REM sleep later. This is why cutting sleep short robs you of dream sleep.\n\n**What Causes Chronic Insomnia**\nMost people experience short-term sleep problems after stress, illness, or a life change. For most, sleep returns to normal on its own. Chronic insomnia develops when the things you DO in response to poor sleep actually make the problem worse:\n\n- Going to bed early to \"catch up\" → weakens your sleep drive\n- Staying in bed awake → your brain learns that bed = being awake\n- Napping during the day → reduces your sleep drive at night\n- Worrying about sleep → activates your stress system, which blocks sleep\n- Spending more time in bed → spreads your sleep thin and makes it lighter\n\nThese are not character flaws — they are completely natural responses to losing sleep. But they create a cycle that keeps insomnia going long after the original cause is gone. CBT-I breaks this cycle.",
        },
      },
      {
        type: "ASSESSMENT",
        title: "Insomnia Severity Index (ISI)",
        content: {
          type: "ASSESSMENT",
          title: "Insomnia Severity Index (ISI)",
          instructions:
            "For each question, please rate the current (i.e., last 2 weeks) severity of your insomnia problem(s).",
          scoringMethod: "SUM",
          questions: [
            { question: "Difficulty falling asleep", type: "LIKERT", required: true, sortOrder: 0, likertMin: 0, likertMax: 4, likertMinLabel: "None", likertMaxLabel: "Very severe" },
            { question: "Difficulty staying asleep", type: "LIKERT", required: true, sortOrder: 1, likertMin: 0, likertMax: 4, likertMinLabel: "None", likertMaxLabel: "Very severe" },
            { question: "Problems waking up too early", type: "LIKERT", required: true, sortOrder: 2, likertMin: 0, likertMax: 4, likertMinLabel: "None", likertMaxLabel: "Very severe" },
            { question: "How satisfied/dissatisfied are you with your current sleep pattern?", type: "LIKERT", required: true, sortOrder: 3, likertMin: 0, likertMax: 4, likertMinLabel: "Very satisfied", likertMaxLabel: "Very dissatisfied" },
            { question: "How noticeable to others do you think your sleep problem is in terms of impairing the quality of your life?", type: "LIKERT", required: true, sortOrder: 4, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all noticeable", likertMaxLabel: "Very much noticeable" },
            { question: "How worried/distressed are you about your current sleep problem?", type: "LIKERT", required: true, sortOrder: 5, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all worried", likertMaxLabel: "Very much worried" },
            { question: "To what extent do you consider your sleep problem to interfere with your daily functioning (e.g., daytime fatigue, mood, ability to function at work/daily chores, concentration, memory, mood, etc.) currently?", type: "LIKERT", required: true, sortOrder: 6, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all interfering", likertMaxLabel: "Very much interfering" },
          ],
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Sleep Facts vs. Myths",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Sleep Facts",
          cards: [
            { title: "8 Hours Is Not a Rule", body: "Sleep need varies from person to person (6-9 hours is normal for adults). Focus on how you feel during the day, not a specific number. Chasing 8 hours can actually worsen insomnia.", emoji: "🕗" },
            { title: "One Bad Night Is Okay", body: "Everyone has bad nights. Your body is remarkably good at recovering. One bad night does not ruin your week — but worrying about it might.", emoji: "🌙" },
            { title: "You Cannot Force Sleep", body: "Sleep is the opposite of effort. The harder you try to fall asleep, the more awake you become. Instead, focus on creating the right conditions and let sleep come to you.", emoji: "🧘" },
            { title: "Lying Awake Hurts More Than Helps", body: "Spending long hours in bed awake teaches your brain that bed is a place for being awake. Getting out of bed when you cannot sleep is one of the most powerful things you can do.", emoji: "🛏️" },
            { title: "Alcohol Is Not a Sleep Aid", body: "Alcohol helps you fall asleep faster but destroys sleep quality. It suppresses REM sleep, increases awakenings in the second half of the night, and worsens insomnia over time.", emoji: "🍷" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 1 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Begin keeping a sleep diary every morning. Within 30 minutes of waking, record: what time you got into bed, how long it took to fall asleep (estimate), how many times you woke up, how long you were awake in the middle of the night total, what time you woke up for good, what time you got out of bed, and rate your sleep quality 1-5." },
            { type: "ACTION", description: "Track your caffeine intake this week — record every caffeinated drink (coffee, tea, soda, energy drink) and the time you had it." },
            { type: "RESOURCE_REVIEW", description: "Review the handout on sleep hygiene basics. Identify which habits you already follow and which you could improve." },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 2: Sleep Restriction Therapy ─────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    1,
    {
      title: "Sleep Restriction Therapy",
      subtitle: "Session 2",
      summary: "Build a stronger sleep drive by matching your time in bed to how much you actually sleep.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Sleep Restriction: Building a Stronger Sleep Drive",
        content: {
          type: "TEXT",
          body: "Sleep restriction is the single most effective technique in CBT-I. It sounds counterintuitive — you are going to spend LESS time in bed to sleep BETTER. Here is why it works.\n\n**The Problem: Too Much Time in Bed**\nWhen you have insomnia, the natural response is to spend more time in bed — going to bed earlier, sleeping in later, lying in bed hoping sleep will come. But this actually makes insomnia worse because:\n\n- It weakens your sleep drive (you are not building up enough adenosine)\n- It trains your brain that bed = lying awake\n- It spreads your sleep thin, making it lighter and more fragmented\n\nImagine spreading a small amount of butter over a huge piece of bread — you get a thin, unsatisfying layer. Sleep restriction is like using a smaller piece of bread so the butter is thick and rich.\n\n**How Sleep Restriction Works**\n\n1. **Calculate your average total sleep time** from your sleep diary. For example, if you spend 9 hours in bed but only sleep 6 hours, your average sleep time is about 6 hours.\n\n2. **Set your sleep window** to match your average sleep time (minimum 5 hours — we never go below that). If you sleep 6 hours on average, your initial sleep window is 6 hours.\n\n3. **Choose a fixed wake time** that works for your schedule and stick with it every day, including weekends. This is the anchor of your new sleep schedule.\n\n4. **Calculate your bedtime** by counting back from your wake time. If your wake time is 6:30 AM and your sleep window is 6 hours, your bedtime is 12:30 AM.\n\n5. **Do not get into bed before your prescribed bedtime**, even if you feel sleepy. Use that extra evening time to wind down, read, or do something quiet.\n\n6. **Get out of bed at your fixed wake time** every day, no matter how you slept.\n\n**What to Expect**\nThe first week is hard. You will be sleepy. This is intentional — you are building up sleep drive. Within 1-2 weeks, you will:\n- Fall asleep faster\n- Sleep more deeply\n- Wake up less during the night\n- Spend a higher percentage of your bed time actually sleeping\n\n**Adjusting Your Sleep Window**\nOnce your sleep efficiency (time asleep / time in bed) reaches 85% or higher for 5 days, you can extend your sleep window by 15 minutes. We will adjust this together each session.\n\n**Important Safety Note**\nIf you drive for a living or operate heavy machinery, tell your clinician — we may need to modify this approach. Sleepiness is expected in the first week, so be cautious about activities requiring alertness.",
        },
      },
      {
        type: "CHECKLIST",
        title: "Sleep Restriction Setup",
        content: {
          type: "CHECKLIST",
          items: [
            { text: "I calculated my average total sleep time from my sleep diary", sortOrder: 0 },
            { text: "I chose a fixed wake time that I can keep 7 days a week", sortOrder: 1 },
            { text: "I calculated my prescribed bedtime (wake time minus sleep window)", sortOrder: 2 },
            { text: "I set an alarm for my wake time every day this week", sortOrder: 3 },
            { text: "I told household members about my new schedule so they can support me", sortOrder: 4 },
            { text: "I planned quiet activities for the extra evening time before my new bedtime", sortOrder: 5 },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 2 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Follow your prescribed sleep window every night this week: do not get into bed before your set bedtime, and get out of bed at your fixed wake time every morning — including weekends." },
            { type: "ACTION", description: "Continue your daily sleep diary every morning. Record all the same information as last week." },
            { type: "ACTION", description: "If you cannot fall asleep within about 20 minutes (do not watch the clock — estimate), get out of bed, go to another room, and do something calm until you feel sleepy, then return to bed. Repeat as needed." },
            { type: "JOURNAL_PROMPT", description: "At the end of the week, write about how sleep restriction went. What was hardest? Did you notice any changes in how quickly you fell asleep or how deeply you slept?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 3: Stimulus Control ──────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    2,
    {
      title: "Stimulus Control",
      subtitle: "Session 3",
      summary: "Retrain your brain to associate bed with sleep instead of wakefulness and worry.",
      estimatedMinutes: 45,
    },
    [
      {
        type: "TEXT",
        title: "Stimulus Control: Bed = Sleep",
        content: {
          type: "TEXT",
          body: "Your brain is an association machine. It links places, activities, and cues with certain states. If you have spent months or years lying in bed awake, worrying, watching TV, scrolling your phone, or trying to force sleep, your brain has learned: bed = being awake. Stimulus control reverses this by rebuilding the association: bed = sleep.\n\n**The Rules of Stimulus Control**\n\n1. **Use your bed only for sleep and sex.** No reading, no screens, no eating, no worrying, no planning your day. Everything else happens outside the bed.\n\n2. **Only go to bed when you feel sleepy.** Sleepy means your eyes are heavy and you are struggling to stay awake — not just tired or fatigued. There is a difference. Fatigue is feeling exhausted; sleepiness is the inability to stay awake.\n\n3. **If you cannot fall asleep within about 20 minutes, get up.** Go to another room and do something calm and boring in dim light — read a dull book, fold laundry, listen to quiet music. Return to bed only when you feel sleepy again. Do NOT watch the clock — estimate 20 minutes.\n\n4. **Repeat rule 3 as many times as necessary.** Some nights, especially at first, you may get up several times. That is okay. Each time, you are teaching your brain that this bed is for sleeping.\n\n5. **Get up at the same time every morning.** Your fixed wake time does not change regardless of how much you slept. This is critical for resetting your circadian rhythm.\n\n6. **Do not nap during the day.** Napping reduces your sleep drive and makes it harder to fall asleep at night. If you absolutely must nap, keep it before 2 PM and under 20 minutes.\n\n**Why This Works**\nEvery time you lie in bed awake, you strengthen the bed-wakefulness connection. Every time you get up when you cannot sleep, you weaken it. Every time you fall asleep quickly in bed, you strengthen the bed-sleep connection. Over days and weeks, this retraining becomes automatic.\n\n**The Hardest Part**\nGetting out of a warm bed when you cannot sleep feels terrible. Your brain will argue: \"Just stay, you might fall asleep soon.\" But lying there awake is exactly what caused the problem. Getting up is uncomfortable in the short term but transformative in the long term.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Stimulus Control Tips",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Stimulus Control Toolkit",
          cards: [
            { title: "The Cozy Spot", body: "Set up a comfortable spot outside your bedroom for middle-of-the-night awakenings. Have a blanket, dim lamp, and a boring book ready. Making it easy to get up makes you more likely to do it.", emoji: "🪑" },
            { title: "Sleepy vs. Tired", body: "Tired means you have no energy. Sleepy means your eyes are heavy and you are nodding off. Only go to bed when you are sleepy. If you are tired but alert, stay up a bit longer.", emoji: "😴" },
            { title: "No Clock Watching", body: "Turn your clock away from you or put your phone face-down. Checking the time when you cannot sleep creates anxiety and makes it even harder to fall asleep.", emoji: "🕐" },
            { title: "The 20-Minute Rule", body: "Do not actually time yourself — estimates are fine. If it FEELS like you have been lying there a while and you are getting frustrated, that is your signal to get up.", emoji: "⏳" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 3 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Follow all 6 stimulus control rules every night this week. Continue your prescribed sleep window from last session." },
            { type: "ACTION", description: "Set up your 'cozy spot' for getting out of bed — a comfortable chair in another room with a dim light and a calm activity ready." },
            { type: "ACTION", description: "Continue your daily sleep diary. Add a note each morning about whether you got out of bed during the night and how many times." },
            { type: "JOURNAL_PROMPT", description: "Write about your experience with getting out of bed when you could not sleep. Was it easier or harder than expected? Did you notice any change in how you feel about your bed?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 4: Cognitive Restructuring for Sleep ──────────────
  await createModuleWithParts(
    prisma,
    program.id,
    3,
    {
      title: "Cognitive Restructuring for Sleep",
      subtitle: "Session 4",
      summary: "Identify and change the anxious thoughts about sleep that keep you awake at night.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Changing Your Thoughts About Sleep",
        content: {
          type: "TEXT",
          body: "By now you may have noticed that much of your insomnia is driven by what you THINK about sleep, not just what you DO. Worrying about sleep is one of the biggest factors that keeps insomnia going.\n\n**The Insomnia Worry Cycle**\nHere is how it works:\n1. You have a bad night of sleep\n2. You worry about the consequences (\"I will not be able to function tomorrow\")\n3. The next night, you start worrying about whether you will sleep\n4. The worry activates your stress response (cortisol, adrenaline)\n5. The stress response blocks sleep\n6. You do not sleep well, confirming your fears\n7. The cycle repeats and gets stronger\n\nNotice: it is the WORRY, not the sleep loss itself, that drives most of the cycle.\n\n**Common Unhelpful Sleep Beliefs**\n\n1. **Catastrophizing the consequences**: \"If I do not sleep tonight, I will not be able to function at all tomorrow.\" Reality: You have had bad nights before and still functioned. Not perfectly, but adequately.\n\n2. **Unrealistic expectations**: \"I need 8 hours of perfect, unbroken sleep.\" Reality: Waking briefly during the night is normal. Sleep quality matters more than quantity.\n\n3. **Helplessness**: \"There is nothing I can do about my insomnia.\" Reality: You are doing something right now — CBT-I has a 70-80% success rate.\n\n4. **Clock watching**: \"It is 2 AM and I am still awake — I have only 4 hours left.\" Reality: Checking the clock adds pressure and activates your alarm system.\n\n5. **Performance anxiety**: \"I have to fall asleep NOW.\" Reality: Sleep cannot be forced. The trying is what prevents it.\n\n**How to Challenge Sleep Thoughts**\nWhen you notice a worry about sleep, ask:\n- What is the evidence that this thought is true?\n- What is the evidence against it?\n- What is the most realistic outcome (not the worst case)?\n- Have I managed before after a bad night? What happened?\n- Is this thought helping me or making things worse?\n\nThen replace the unhelpful thought with a more balanced one. Not positive — balanced. \"I might not sleep great tonight, but I have handled that before and I will get through tomorrow\" is more helpful than \"I will definitely sleep perfectly tonight.\"",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Reframing Sleep Worries",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Sleep Thought Reframes",
          cards: [
            { title: "Tomorrow Will Be Okay", body: "You have survived every bad night so far. You may be tired, but you will function. Your brain is better at compensating than you think. One bad night does not ruin a day.", emoji: "🌅" },
            { title: "Let Go of the Effort", body: "Sleep is like a cat — chase it and it runs away. Sit quietly and it comes to you. Your job is not to make sleep happen. Your job is to create the conditions and let go.", emoji: "🐱" },
            { title: "Normal Awakenings", body: "Waking up during the night is normal — everyone does it. Good sleepers just fall back asleep quickly and forget it happened. You will get there too.", emoji: "🔄" },
            { title: "This Is Temporary", body: "Insomnia feels permanent but it is not. The techniques you are learning change your brain's sleep patterns. Most people see major improvement within 4-6 weeks.", emoji: "📅" },
            { title: "Worry Time Is Not Bed Time", body: "If you have worries to process, schedule 15 minutes of 'worry time' in the early evening. Write your worries down. Then close the notebook. Bed time is not worry time.", emoji: "📓" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 4 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Keep a Thought Record for sleep-related thoughts this week. When you catch a worry about sleep, write down: the thought, the emotion, the evidence for and against the thought, and a more balanced alternative thought." },
            { type: "ACTION", description: "Schedule a 15-minute 'worry time' in the early evening (at least 2 hours before bed). Write down your worries, then close the notebook and move on. If worries come at bedtime, remind yourself: 'I already dealt with that during worry time.'" },
            { type: "ACTION", description: "Continue sleep restriction and stimulus control. Continue your daily sleep diary." },
            { type: "JOURNAL_PROMPT", description: "What is your biggest fear about not sleeping? Write it down, then write the evidence for and against it. What actually happens on the days after you sleep poorly?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 5: Relaxation and Sleep Hygiene ──────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    4,
    {
      title: "Relaxation and Sleep Hygiene",
      subtitle: "Session 5",
      summary: "Learn relaxation techniques and optimize your habits and environment for sleep.",
      estimatedMinutes: 45,
    },
    [
      {
        type: "TEXT",
        title: "Relaxation Techniques and Sleep Hygiene",
        content: {
          type: "TEXT",
          body: "Relaxation is not about forcing yourself to relax — that is a contradiction. It is about giving your body the signals that it is safe to wind down. Combined with good sleep hygiene practices, these techniques create the optimal conditions for sleep.\n\n**Progressive Muscle Relaxation (PMR)**\nPMR involves tensing and then releasing different muscle groups. This works because:\n- Physical tension signals danger to your brain. Releasing tension signals safety.\n- It gives your mind something to focus on instead of worries.\n- It activates the parasympathetic nervous system (your body's \"rest and digest\" mode).\n\nHow to do it:\n1. Start with your feet. Tense the muscles for 5 seconds. Release for 10 seconds. Notice the difference.\n2. Move to your calves, thighs, abdomen, chest, hands, arms, shoulders, neck, and face.\n3. After finishing, lie still and notice the sensation of relaxation throughout your body.\n4. Practice daily for 15-20 minutes, ideally NOT in bed (remember — bed is for sleep only). Practice in your chair or on the couch.\n\n**Diaphragmatic Breathing (Belly Breathing)**\n1. Place one hand on your chest and one on your belly.\n2. Breathe in slowly through your nose for 4 seconds — your belly should rise, not your chest.\n3. Hold for 1-2 seconds.\n4. Exhale slowly through your mouth for 6 seconds.\n5. Repeat for 5-10 minutes.\n\nThe key is making your exhale longer than your inhale. This directly activates your parasympathetic nervous system.\n\n**Sleep Hygiene Essentials**\nSleep hygiene alone does not cure insomnia, but poor sleep hygiene makes everything harder:\n\n- **Light**: Dim lights 1-2 hours before bed. Avoid screens or use blue-light filters. Get bright light exposure within 30 minutes of waking.\n- **Temperature**: Keep your bedroom cool (65-68 degrees F / 18-20 degrees C). Your body needs to cool down to fall asleep.\n- **Caffeine**: Stop caffeine at least 8 hours before bed. For some people, even 10-12 hours. Remember that caffeine is in tea, chocolate, and some medications.\n- **Alcohol**: Avoid alcohol within 3 hours of bed. It fragments sleep and suppresses REM.\n- **Exercise**: Regular exercise improves sleep, but finish vigorous exercise at least 3-4 hours before bed. Gentle stretching or yoga in the evening is fine.\n- **Evening routine**: Create a consistent 30-60 minute wind-down routine. Same activities, same order, same time. This signals to your brain that sleep is coming.",
        },
      },
      {
        type: "CHECKLIST",
        title: "Sleep Hygiene Checklist",
        content: {
          type: "CHECKLIST",
          items: [
            { text: "Bedroom is cool (65-68 F / 18-20 C)", sortOrder: 0 },
            { text: "Bedroom is dark (blackout curtains or sleep mask)", sortOrder: 1 },
            { text: "Bedroom is quiet (or use white noise)", sortOrder: 2 },
            { text: "No caffeine after 2 PM (or earlier)", sortOrder: 3 },
            { text: "No alcohol within 3 hours of bedtime", sortOrder: 4 },
            { text: "Screens off or blue-light filtered 1 hour before bed", sortOrder: 5 },
            { text: "Consistent wind-down routine started", sortOrder: 6 },
            { text: "Bright light exposure within 30 minutes of waking", sortOrder: 7 },
            { text: "No vigorous exercise within 3-4 hours of bed", sortOrder: 8 },
          ],
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Wind-Down Toolkit",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Relaxation Tools",
          cards: [
            { title: "Progressive Muscle Relaxation", body: "Tense each muscle group for 5 seconds, release for 10. Work from toes to head. Practice in a chair, not in bed. Daily practice trains your body to relax on cue.", emoji: "💪" },
            { title: "4-6 Breathing", body: "Breathe in for 4 counts, out for 6 counts. The longer exhale slows your heart rate and calms your nervous system. Use this anywhere — in the car, at your desk, or before bed.", emoji: "🌬️" },
            { title: "Body Scan", body: "Lie down and slowly bring attention to each body part from toes to head. Do not try to change anything — just notice. This gentle focus quiets the mind without effort.", emoji: "🧘" },
            { title: "The Boring Book", body: "Keep a dull book (not exciting, not on a screen) for when you cannot sleep. Reading something boring in dim light lets your mind drift without stimulation.", emoji: "📖" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 5 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Practice Progressive Muscle Relaxation for 15-20 minutes every day this week. Do it in a chair or on the couch, NOT in bed. Aim for the same time each day, ideally during your wind-down routine." },
            { type: "ACTION", description: "Implement at least 3 new sleep hygiene changes from the checklist this week. Track which ones you tried and what you noticed." },
            { type: "ACTION", description: "Continue sleep restriction, stimulus control, and your daily sleep diary. We will review your sleep window and adjust if your sleep efficiency is above 85%." },
            { type: "JOURNAL_PROMPT", description: "How is your relationship with sleep changing? Compare how you felt about going to bed at the start of this program to how you feel now." },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 6: Relapse Prevention & Wrap-Up ──────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    5,
    {
      title: "Maintaining Your Gains",
      subtitle: "Session 6",
      summary: "Re-assess your insomnia, consolidate skills, and build a plan for long-term healthy sleep.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Keeping Your Sleep on Track",
        content: {
          type: "TEXT",
          body: "Congratulations — you have completed CBT-I. Over the past 6 weeks, you have made real changes to how your brain approaches sleep. Let us review what you have learned and build a plan for keeping your sleep healthy for life.\n\n**What You Have Learned**\n- How the two-process model of sleep works (sleep drive + circadian rhythm)\n- Sleep restriction: matching time in bed to actual sleep time\n- Stimulus control: bed = sleep, and getting up when you cannot sleep\n- Cognitive restructuring: identifying and challenging anxious thoughts about sleep\n- Relaxation techniques: PMR, diaphragmatic breathing, body scan\n- Sleep hygiene: optimizing your habits and environment\n\n**Continuing Your Sleep Schedule**\nYour current sleep window is working well. Here is how to maintain and gradually expand it:\n- Keep your fixed wake time every day, including weekends\n- Extend your sleep window by 15 minutes at a time when sleep efficiency stays above 85% for a full week\n- Most people reach their natural sleep need within a few more weeks of gradual extension\n- If sleep quality drops, tighten the window back by 15 minutes\n\n**What to Do If Insomnia Returns**\nInsomnia can come back during times of stress, illness, travel, or life changes. This is normal. Here is your action plan:\n\n1. **First 1-2 bad nights**: Do nothing different. Bad nights happen. Do not compensate (no napping, no going to bed early, no sleeping in).\n2. **3-5 bad nights**: Restart stimulus control rules strictly. Get out of bed if you cannot sleep. Check your sleep hygiene.\n3. **1 week or more**: Restart a mild sleep restriction. Tighten your sleep window by 30-60 minutes. Use your thought records to challenge sleep worries.\n4. **2 weeks or more**: Contact your clinician for a booster session.\n\n**The most important thing is to not let old habits creep back.** The behaviors that \"help\" in the short term (staying in bed, napping, going to bed early) are exactly what caused chronic insomnia in the first place. Trust the process — it worked before and it will work again.",
        },
      },
      {
        type: "ASSESSMENT",
        title: "ISI Post-Treatment",
        content: {
          type: "ASSESSMENT",
          title: "Insomnia Severity Index (ISI) — Post-Treatment",
          instructions:
            "For each question, please rate the current (i.e., last 2 weeks) severity of your insomnia problem(s).",
          scoringMethod: "SUM",
          questions: [
            { question: "Difficulty falling asleep", type: "LIKERT", required: true, sortOrder: 0, likertMin: 0, likertMax: 4, likertMinLabel: "None", likertMaxLabel: "Very severe" },
            { question: "Difficulty staying asleep", type: "LIKERT", required: true, sortOrder: 1, likertMin: 0, likertMax: 4, likertMinLabel: "None", likertMaxLabel: "Very severe" },
            { question: "Problems waking up too early", type: "LIKERT", required: true, sortOrder: 2, likertMin: 0, likertMax: 4, likertMinLabel: "None", likertMaxLabel: "Very severe" },
            { question: "How satisfied/dissatisfied are you with your current sleep pattern?", type: "LIKERT", required: true, sortOrder: 3, likertMin: 0, likertMax: 4, likertMinLabel: "Very satisfied", likertMaxLabel: "Very dissatisfied" },
            { question: "How noticeable to others do you think your sleep problem is in terms of impairing the quality of your life?", type: "LIKERT", required: true, sortOrder: 4, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all noticeable", likertMaxLabel: "Very much noticeable" },
            { question: "How worried/distressed are you about your current sleep problem?", type: "LIKERT", required: true, sortOrder: 5, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all worried", likertMaxLabel: "Very much worried" },
            { question: "To what extent do you consider your sleep problem to interfere with your daily functioning (e.g., daytime fatigue, mood, ability to function at work/daily chores, concentration, memory, mood, etc.) currently?", type: "LIKERT", required: true, sortOrder: 6, likertMin: 0, likertMax: 4, likertMinLabel: "Not at all interfering", likertMaxLabel: "Very much interfering" },
          ],
        },
      },
      {
        type: "CHECKLIST",
        title: "Long-Term Sleep Maintenance Plan",
        content: {
          type: "CHECKLIST",
          items: [
            { text: "I have a consistent wake time I will keep 7 days a week", sortOrder: 0 },
            { text: "I know my ideal sleep window (bedtime to wake time)", sortOrder: 1 },
            { text: "I will use stimulus control: bed is for sleep and sex only", sortOrder: 2 },
            { text: "I will get out of bed if I cannot sleep within ~20 minutes", sortOrder: 3 },
            { text: "I know how to challenge anxious thoughts about sleep", sortOrder: 4 },
            { text: "I have a wind-down routine I can use every night", sortOrder: 5 },
            { text: "I know the relapse plan: what to do after 1 bad night, 3-5 bad nights, and 1+ week", sortOrder: 6 },
            { text: "I have my clinician's contact information for booster sessions if needed", sortOrder: 7 },
          ],
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Reflecting on Your Sleep Journey",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "How has your relationship with sleep changed since starting CBT-I? What do you understand now that you did not understand before?",
            "What was the hardest technique to stick with? What made the biggest difference for you?",
            "Write a letter to your future self for a night when insomnia tries to come back. What would you want to remind yourself?",
          ],
          spaceSizeHint: "large",
        },
      },
    ]
  );

  // ── DailyTracker for Insomnia ───────────────────────────────
  const insomniaTracker = await prisma.dailyTracker.create({
    data: {
      programId: program.id,
      createdById: clinicianId,
      name: "Sleep Diary",
      description: "Daily sleep diary to track your sleep patterns and progress.",
    },
  });

  await prisma.dailyTrackerField.createMany({
    data: [
      { trackerId: insomniaTracker.id, label: "What time did you get into bed?", fieldType: "TIME", sortOrder: 0, isRequired: true },
      { trackerId: insomniaTracker.id, label: "How long did it take to fall asleep (minutes)?", fieldType: "NUMBER", sortOrder: 1, isRequired: true },
      { trackerId: insomniaTracker.id, label: "How many times did you wake up during the night?", fieldType: "NUMBER", sortOrder: 2, isRequired: true },
      { trackerId: insomniaTracker.id, label: "Total time awake during the night (minutes)?", fieldType: "NUMBER", sortOrder: 3, isRequired: true },
      { trackerId: insomniaTracker.id, label: "What time did you wake up for good?", fieldType: "TIME", sortOrder: 4, isRequired: true },
      { trackerId: insomniaTracker.id, label: "What time did you get out of bed?", fieldType: "TIME", sortOrder: 5, isRequired: true },
      { trackerId: insomniaTracker.id, label: "Sleep quality rating", fieldType: "SCALE", sortOrder: 6, isRequired: true, options: { min: 1, max: 5, minLabel: "Very poor", maxLabel: "Very good" } },
      { trackerId: insomniaTracker.id, label: "Daytime energy level", fieldType: "SCALE", sortOrder: 7, isRequired: true, options: { min: 1, max: 5, minLabel: "Very low", maxLabel: "Very high" } },
      { trackerId: insomniaTracker.id, label: "Did you nap today?", fieldType: "YES_NO", sortOrder: 8, isRequired: true },
      { trackerId: insomniaTracker.id, label: "Did you follow your prescribed sleep window?", fieldType: "YES_NO", sortOrder: 9, isRequired: true },
      { trackerId: insomniaTracker.id, label: "Did you get out of bed when you could not sleep?", fieldType: "YES_NO", sortOrder: 10, isRequired: false },
      { trackerId: insomniaTracker.id, label: "Notes about last night", fieldType: "FREE_TEXT", sortOrder: 11, isRequired: false },
    ],
  });

  return program;
}


// ============================================================================
// TEMPLATE 6 — Relapse Prevention for Substance Use — 12 Modules
// ============================================================================
export async function seedTemplate6_RelapsePrevention(prisma: any, clinicianId: string) {
  const program = await prisma.program.create({
    data: {
      clinicianId,
      title: "Relapse Prevention for Substance Use",
      description:
        "A 12-session evidence-based relapse prevention program grounded in cognitive-behavioral principles. This program helps you understand your triggers, build coping skills, and create a sustainable recovery plan. It is designed for people who have already completed initial treatment and want to maintain their progress.",
      category: "Substance Use",
      durationWeeks: 12,
      cadence: "WEEKLY",
      sessionType: "ONE_ON_ONE",
      isTemplate: true,
      status: "PUBLISHED",
    },
  });

  // ── Module 1: Understanding Relapse ─────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    0,
    {
      title: "Understanding Relapse",
      subtitle: "Session 1",
      summary: "Learn how relapse works as a process — not a single event — and how this program will help you stay on track.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Relapse Is a Process, Not an Event",
        content: {
          type: "TEXT",
          body: "Most people think of relapse as the moment they pick up a drink or use a substance. But relapse actually begins long before that moment. Understanding relapse as a process gives you many chances to intervene before use ever happens.\n\n**The Three Stages of Relapse**\n\n1. **Emotional Relapse**\nYou are not thinking about using, but your emotions and behaviors are setting you up for it. Warning signs include:\n- Bottling up emotions instead of talking about them\n- Isolating from people who support your recovery\n- Not going to meetings, therapy, or other support\n- Poor self-care: not eating well, not sleeping, not exercising\n- Increased anxiety, irritability, or anger\n\n2. **Mental Relapse**\nPart of you wants to use and part of you does not. There is a war in your mind. Warning signs include:\n- Thinking about people, places, and things associated with use\n- Minimizing the consequences of past use (\"It was not that bad\")\n- Bargaining (\"Maybe I could just use once\" or \"I could switch to something less harmful\")\n- Planning a relapse — figuring out how you could use without getting caught\n- Romanticizing past use — remembering the good times and forgetting the bad\n\n3. **Physical Relapse**\nActual use of the substance. By this point, the emotional and mental stages have already happened.\n\n**Why This Matters**\nIf you only watch for physical relapse, you catch it too late. This program teaches you to spot emotional and mental relapse early — when it is much easier to get back on track.\n\n**The Relapse Prevention Model**\nRelapse prevention is based on a simple idea: recovery is a skill, and like any skill, it can be learned, practiced, and strengthened. You will learn to:\n- Identify your personal high-risk situations\n- Build coping skills for each type of risk\n- Develop a balanced lifestyle that supports recovery\n- Handle lapses without letting them become full relapse\n\n**A Lapse Is Not a Relapse**\nIf you do use, it does not mean you have failed. A lapse (a single use) becomes a relapse (a return to old patterns) only if you give up. The most important thing after a lapse is what you do next.",
        },
      },
      {
        type: "ASSESSMENT",
        title: "AUDIT (Alcohol Use Disorders Identification Test)",
        content: {
          type: "ASSESSMENT",
          title: "AUDIT (Alcohol Use Disorders Identification Test)",
          instructions:
            "Please answer each question about your alcohol use. Choose the answer that is most correct for you. If the questions do not apply to your substance of concern, your clinician will discuss adapted questions with you.",
          scoringMethod: "SUM",
          questions: [
            {
              question: "How often do you have a drink containing alcohol?",
              type: "MULTIPLE_CHOICE",
              required: true,
              sortOrder: 0,
              options: [
                { label: "Never", value: 0 },
                { label: "Monthly or less", value: 1 },
                { label: "2-4 times a month", value: 2 },
                { label: "2-3 times a week", value: 3 },
                { label: "4 or more times a week", value: 4 },
              ],
            },
            {
              question: "How many drinks containing alcohol do you have on a typical day when you are drinking?",
              type: "MULTIPLE_CHOICE",
              required: true,
              sortOrder: 1,
              options: [
                { label: "1 or 2", value: 0 },
                { label: "3 or 4", value: 1 },
                { label: "5 or 6", value: 2 },
                { label: "7, 8, or 9", value: 3 },
                { label: "10 or more", value: 4 },
              ],
            },
            {
              question: "How often do you have six or more drinks on one occasion?",
              type: "MULTIPLE_CHOICE",
              required: true,
              sortOrder: 2,
              options: [
                { label: "Never", value: 0 },
                { label: "Less than monthly", value: 1 },
                { label: "Monthly", value: 2 },
                { label: "Weekly", value: 3 },
                { label: "Daily or almost daily", value: 4 },
              ],
            },
            {
              question: "How often during the last year have you found that you were not able to stop drinking once you had started?",
              type: "MULTIPLE_CHOICE",
              required: true,
              sortOrder: 3,
              options: [
                { label: "Never", value: 0 },
                { label: "Less than monthly", value: 1 },
                { label: "Monthly", value: 2 },
                { label: "Weekly", value: 3 },
                { label: "Daily or almost daily", value: 4 },
              ],
            },
            {
              question: "How often during the last year have you failed to do what was normally expected from you because of your drinking?",
              type: "MULTIPLE_CHOICE",
              required: true,
              sortOrder: 4,
              options: [
                { label: "Never", value: 0 },
                { label: "Less than monthly", value: 1 },
                { label: "Monthly", value: 2 },
                { label: "Weekly", value: 3 },
                { label: "Daily or almost daily", value: 4 },
              ],
            },
            {
              question: "How often during the last year have you needed a first drink in the morning to get yourself going after a heavy drinking session?",
              type: "MULTIPLE_CHOICE",
              required: true,
              sortOrder: 5,
              options: [
                { label: "Never", value: 0 },
                { label: "Less than monthly", value: 1 },
                { label: "Monthly", value: 2 },
                { label: "Weekly", value: 3 },
                { label: "Daily or almost daily", value: 4 },
              ],
            },
            {
              question: "How often during the last year have you had a feeling of guilt or remorse after drinking?",
              type: "MULTIPLE_CHOICE",
              required: true,
              sortOrder: 6,
              options: [
                { label: "Never", value: 0 },
                { label: "Less than monthly", value: 1 },
                { label: "Monthly", value: 2 },
                { label: "Weekly", value: 3 },
                { label: "Daily or almost daily", value: 4 },
              ],
            },
            {
              question: "How often during the last year have you been unable to remember what happened the night before because you had been drinking?",
              type: "MULTIPLE_CHOICE",
              required: true,
              sortOrder: 7,
              options: [
                { label: "Never", value: 0 },
                { label: "Less than monthly", value: 1 },
                { label: "Monthly", value: 2 },
                { label: "Weekly", value: 3 },
                { label: "Daily or almost daily", value: 4 },
              ],
            },
            {
              question: "Have you or someone else been injured as a result of your drinking?",
              type: "MULTIPLE_CHOICE",
              required: true,
              sortOrder: 8,
              options: [
                { label: "No", value: 0 },
                { label: "Yes, but not in the last year", value: 2 },
                { label: "Yes, during the last year", value: 4 },
              ],
            },
            {
              question: "Has a relative or friend, or a doctor or another health worker been concerned about your drinking or suggested you cut down?",
              type: "MULTIPLE_CHOICE",
              required: true,
              sortOrder: 9,
              options: [
                { label: "No", value: 0 },
                { label: "Yes, but not in the last year", value: 2 },
                { label: "Yes, during the last year", value: 4 },
              ],
            },
          ],
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Early Warning Signs",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Relapse Warning Signs",
          cards: [
            { title: "Emotional Red Flags", body: "Watch for bottling up feelings, isolation, skipping meals, poor sleep, and growing irritability. These are signs of emotional relapse — the earliest stage. Address them now.", emoji: "🚩" },
            { title: "Romanticizing Use", body: "When you start remembering only the good times and forgetting the consequences, your brain is setting a trap. Play the tape forward — remember how the story ends, not just how it starts.", emoji: "🎬" },
            { title: "Bargaining", body: "Thoughts like 'maybe just once' or 'I could handle it now' are signs of mental relapse. These thoughts are normal but they are not true. Talk to someone before acting on them.", emoji: "🤝" },
            { title: "HALT", body: "Check yourself: am I Hungry, Angry, Lonely, or Tired? These four states dramatically increase vulnerability to relapse. Meet the basic need first, then reassess.", emoji: "✋" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 1 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Write your personal history of use: when it started, how it progressed, what consequences it caused, and what motivated you to seek help. Be honest — this is for your eyes and your clinician's only." },
            { type: "ACTION", description: "Make a list of your personal warning signs for each stage of relapse — emotional, mental, and physical. Ask someone close to you what changes they notice when you are struggling." },
            { type: "JOURNAL_PROMPT", description: "What does recovery mean to you? Not what it means to your family or your therapist — what does it mean to YOU? What kind of life are you building?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 2: Identifying High-Risk Situations ──────────────
  await createModuleWithParts(
    prisma,
    program.id,
    1,
    {
      title: "Identifying High-Risk Situations",
      subtitle: "Session 2",
      summary: "Map your personal triggers — the people, places, emotions, and situations that put your recovery at risk.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Mapping Your High-Risk Situations",
        content: {
          type: "TEXT",
          body: "A high-risk situation is any situation that threatens your sense of control and increases the likelihood of use. Research shows that most relapses happen in predictable situations. By identifying yours, you can prepare for them in advance.\n\n**The Three Main Categories of High-Risk Situations**\n\n1. **Negative Emotional States (35% of relapses)**\nThis is the single biggest trigger category. It includes:\n- Anger, frustration, resentment\n- Anxiety, worry, fear\n- Sadness, depression, loneliness\n- Boredom, emptiness\n- Shame, guilt\n- Stress, feeling overwhelmed\n\nWhen you used substances to manage emotions, your brain learned that the substance is a solution. In recovery, you need to teach it new solutions.\n\n2. **Social Pressure (20% of relapses)**\nThis includes:\n- Direct pressure: someone offering you a substance or encouraging you to use\n- Indirect pressure: being around people who are using, feeling left out, wanting to fit in\n- Celebrations, parties, holidays\n- Conflict with others (arguments, criticism, rejection)\n\n3. **Other Situations (45% of relapses)**\nThis includes:\n- Physical discomfort or pain\n- Positive emotions (\"things are going so well, I deserve a reward\")\n- Cravings triggered by cues (driving past a bar, seeing a commercial, smelling alcohol)\n- Testing personal control (\"I bet I could have just one\")\n- Certain times of day or days of the week associated with use\n- Having money in your pocket\n- Being alone with nothing to do\n\n**Creating Your Risk Map**\nFor each high-risk situation, you need to know:\n1. What is the situation?\n2. How strong is the risk (low / medium / high)?\n3. Can I avoid this situation?\n4. If I cannot avoid it, what is my coping plan?\n\nYou do not need to avoid every situation forever — but in early recovery, avoidance is a legitimate strategy. As your skills grow, you can gradually face more situations with confidence.",
        },
      },
      {
        type: "CHECKLIST",
        title: "High-Risk Situation Inventory",
        content: {
          type: "CHECKLIST",
          items: [
            { text: "I listed my negative emotional triggers (anger, anxiety, sadness, boredom, etc.)", sortOrder: 0 },
            { text: "I listed the social situations that put me at risk", sortOrder: 1 },
            { text: "I identified the people who are risky for my recovery", sortOrder: 2 },
            { text: "I identified the places associated with my past use", sortOrder: 3 },
            { text: "I identified the times of day or week when I am most vulnerable", sortOrder: 4 },
            { text: "I rated each situation as low, medium, or high risk", sortOrder: 5 },
            { text: "I identified which situations I can avoid and which I need to face", sortOrder: 6 },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 2 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Complete your personal High-Risk Situation Inventory. List at least 10 situations, rate their risk level, and note whether you can avoid them or need a coping plan." },
            { type: "ACTION", description: "Identify your top 3 highest-risk situations. For each one, write down what you will do if you find yourself in that situation. Be specific — not 'I will cope' but 'I will call my sponsor, leave the situation, or do 5 minutes of deep breathing.'" },
            { type: "JOURNAL_PROMPT", description: "Think about a time when you relapsed or came close to relapsing. What was the situation? What were you feeling? Looking back, where did the process start — and where could you have intervened?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 3: Coping with Cravings ──────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    2,
    {
      title: "Coping with Cravings",
      subtitle: "Session 3",
      summary: "Learn what cravings are, why they happen, and practical skills to ride them out.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Understanding and Managing Cravings",
        content: {
          type: "TEXT",
          body: "Cravings are one of the biggest challenges in recovery. The good news is that cravings are temporary, predictable, and manageable. Every craving you survive without using makes the next one weaker.\n\n**What Is a Craving?**\nA craving is an intense desire to use a substance. It can include:\n- Strong urges or impulses to use\n- Physical sensations: tightness in the chest, dry mouth, restlessness, stomach knots\n- Thoughts about using: \"I need it,\" \"Just one,\" \"I cannot stand this\"\n- Memories of using: the taste, the feeling, the ritual\n- Emotional states: agitation, anxiety, excitement\n\n**The Craving Wave**\nCravings follow a wave pattern. They build, peak, and then subside — typically within 15-30 minutes. No craving lasts forever. If you do not feed it, it will pass.\n\nThink of it like a wave in the ocean. You can try to fight the wave (which exhausts you) or you can surf it — ride it up, over the peak, and down the other side.\n\n**What Triggers Cravings?**\nCravings are triggered by cues that your brain has associated with use:\n- **External cues**: Seeing a bar, finding old paraphernalia, being in a place where you used, seeing other people drink or use, commercials, movies\n- **Internal cues**: Certain emotions (stress, excitement, boredom), physical states (pain, fatigue), thoughts (\"I deserve this\"), time of day\n\nEvery time you experienced the substance after a cue, the connection between that cue and the craving got stronger. In recovery, by not using after the cue, you weaken that connection over time. This is called extinction.\n\n**Craving Coping Skills**\n\n1. **Urge Surfing**: Notice the craving without acting on it. Observe it like a scientist. Where do you feel it in your body? How intense is it on a 0-10 scale? Watch it rise, peak, and fall. You are the observer, not the craving.\n\n2. **Delay**: Tell yourself: \"I will wait 30 minutes before I decide.\" During that 30 minutes, do something else. Most cravings pass within this time.\n\n3. **Distract**: Engage in an activity that requires attention — call someone, go for a walk, do a puzzle, take a shower, clean something, play a game.\n\n4. **Dispute**: Challenge the thoughts fueling the craving. \"I need it\" → \"I want it, but I do not need it.\" \"I cannot stand this\" → \"This is uncomfortable but I have survived every craving so far.\"\n\n5. **Escape**: If you are in a high-risk situation, leave. You can always explain later. Your recovery comes first.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Craving Survival Kit",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Craving Tools",
          cards: [
            { title: "Urge Surfing", body: "Close your eyes. Notice the craving as a sensation in your body. Rate it 0-10. Breathe into it. Watch the number change. It will peak and fall within 15-30 minutes. You do not have to act on it.", emoji: "🏄" },
            { title: "Play the Tape Forward", body: "Your brain shows you the highlight reel of using. Manually play the rest: the hangover, the shame, the broken promises, the consequences. Remember the full story, not just the first scene.", emoji: "📼" },
            { title: "Call Before You Fall", body: "Pick up the phone and call someone before you pick up the substance. It does not have to be a deep conversation — just connecting with another human can break the craving cycle.", emoji: "📱" },
            { title: "Change Your State", body: "Splash cold water on your face, take a brisk walk, hold ice cubes, or do 20 jumping jacks. Changing your physical state quickly can interrupt a craving.", emoji: "🧊" },
            { title: "The 30-Minute Rule", body: "Promise yourself you will wait 30 minutes before acting on any craving. Set a timer. In 30 minutes, reassess. The craving is almost always weaker or gone.", emoji: "⏱️" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 3 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Practice urge surfing at least twice this week when you experience a craving. Record: what triggered it, how intense it was (0-10), what you did, how long it lasted, and what the intensity was afterward." },
            { type: "ACTION", description: "Create your personal Craving Emergency Plan card: list 3 people you can call, 3 activities that distract you, and 3 thoughts that help you ride it out. Keep this card with you at all times." },
            { type: "JOURNAL_PROMPT", description: "Describe a craving you had this week in detail. What triggered it? What did it feel like in your body? What thoughts came with it? What did you do? What happened next?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 4: Managing Negative Thinking ────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    3,
    {
      title: "Managing Negative Thinking",
      subtitle: "Session 4",
      summary: "Identify and change the thought patterns that fuel substance use.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Thoughts That Lead to Use",
        content: {
          type: "TEXT",
          body: "Your thoughts play a huge role in whether you use or stay in recovery. The way you interpret situations — what you tell yourself about what happens — can either protect your recovery or put it at risk.\n\n**Permission-Giving Thoughts**\nThese are the sneaky thoughts your brain uses to make using seem okay:\n\n- \"I deserve a break\" (entitlement)\n- \"Just this once\" (minimizing)\n- \"No one will know\" (secrecy)\n- \"I have been so good, one time will not hurt\" (rewarding)\n- \"Things are going well, I can handle it now\" (overconfidence)\n- \"Things are terrible, what is the point?\" (giving up)\n- \"Everyone else drinks — I am the weird one\" (normalizing)\n- \"I will start fresh tomorrow / Monday / next month\" (procrastination)\n\nThese thoughts feel logical in the moment, but they are traps. Learning to recognize them instantly is one of the most powerful skills in recovery.\n\n**Apparently Irrelevant Decisions (AIDs)**\nThese are small decisions that seem harmless but move you closer to use:\n- Driving past the liquor store instead of taking a different route\n- Keeping alcohol in the house \"for guests\"\n- Going to a party where people will be drinking \"just to be social\"\n- Reconnecting with a friend who still uses \"because we go way back\"\n\nEach decision alone seems innocent. Together, they create a path straight to relapse. Awareness of these decisions is key.\n\n**Challenging Unhelpful Thoughts**\nWhen you catch a permission-giving thought:\n1. Name it: \"That is a permission-giving thought.\"\n2. Challenge it: \"What would actually happen if I used? Play the tape forward.\"\n3. Replace it: \"I do not need to use to cope. I have other tools. I have come too far to go back.\"\n4. Act: Do something that supports recovery — call someone, go to a meeting, use a coping skill.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Thought Traps in Recovery",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Permission-Giving Thought Busters",
          cards: [
            { title: "Just This Once", body: "Your brain says it will be only one time. But you have heard this before. Ask: when has 'just once' ever actually been just once for me? Be honest.", emoji: "1️⃣" },
            { title: "I Deserve It", body: "You do deserve good things — but the substance never actually delivered. What you really deserve is the life you are building in recovery. Reward yourself with something that does not take your progress away.", emoji: "🎁" },
            { title: "No One Will Know", body: "You will know. And the consequences of use do not depend on whether others find out. The damage happens whether it is secret or not.", emoji: "🔒" },
            { title: "What Is the Point?", body: "When everything feels hopeless, the point is that you have survived every bad day so far without using. The feeling will pass. The consequences of using will not.", emoji: "🌊" },
            { title: "I Can Handle It Now", body: "Overconfidence is one of the most dangerous states in recovery. The belief that you have 'beaten' addiction is exactly when you are most vulnerable. Stay humble, stay careful.", emoji: "⚠️" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 4 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Keep a Thought Log this week. When you notice a permission-giving thought or an apparently irrelevant decision, write it down, name the type, challenge it, and write a recovery-supporting replacement thought." },
            { type: "ACTION", description: "Review your past week and identify any 'apparently irrelevant decisions' you made that moved you closer to a high-risk situation. Write down at least 2 and describe what you will do differently." },
            { type: "JOURNAL_PROMPT", description: "What is your most frequent permission-giving thought? Where did it come from? Write a detailed rebuttal to this thought that you can pull out the next time it shows up." },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 5: Managing Emotions Without Substances ──────────
  await createModuleWithParts(
    prisma,
    program.id,
    4,
    {
      title: "Managing Emotions Without Substances",
      subtitle: "Session 5",
      summary: "Build healthy ways to handle difficult emotions that used to lead to substance use.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Emotions and Recovery",
        content: {
          type: "TEXT",
          body: "For many people, substances served as emotional management tools. Alcohol numbed anxiety. Stimulants powered through depression. Opioids soothed emotional pain. In recovery, you need new ways to handle the emotions that substances used to manage.\n\n**Why Emotions Feel Bigger in Recovery**\nDuring active use, substances dulled your emotions. In early recovery, emotions can feel overwhelming — like someone turned the volume to maximum. This is normal. Your brain is recalibrating. It does not mean something is wrong; it means your nervous system is healing.\n\n**The Emotion-Use Cycle**\n1. You feel a difficult emotion (stress, anger, sadness, boredom)\n2. The feeling is uncomfortable\n3. Your brain remembers that the substance made the feeling go away (quickly)\n4. You crave the substance\n5. You use\n6. The emotion temporarily decreases\n7. The emotion comes back — often worse — plus guilt and shame\n8. Repeat\n\nBreaking this cycle requires inserting new coping skills at step 3 — after the feeling but before the craving takes over.\n\n**Healthy Emotion Management Skills**\n\n**Grounding (for overwhelming emotions)**\n- 5-4-3-2-1: Name 5 things you see, 4 you hear, 3 you can touch, 2 you smell, 1 you taste\n- Cold water on your face or wrists\n- Describe your surroundings out loud in detail\n- Press your feet firmly into the floor and notice the sensation\n\n**Processing (for persistent emotions)**\n- Talk to someone you trust about how you feel\n- Write about the emotion in your journal — describe it, name it, explore where it comes from\n- Move your body — emotions are physical; moving helps release them\n\n**Sitting With (for unavoidable emotions)**\n- Not every emotion needs to be fixed or made to go away\n- Sometimes the healthiest response is to feel the feeling, know that it will pass, and not run from it\n- Practice tolerating discomfort in small doses — this builds your capacity over time\n\n**Self-Soothing (for distress)**\n- Do something kind for yourself: a warm bath, favorite music, a walk in nature, a good meal\n- Call on your five senses: light a candle, wrap in a soft blanket, sip hot tea\n- Remind yourself: \"This feeling is temporary. I do not have to escape it. I can handle this.\"",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Emotion Coping Skills",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Emotion Toolkit",
          cards: [
            { title: "5-4-3-2-1 Grounding", body: "Name 5 things you see, 4 you hear, 3 you can touch, 2 you smell, 1 you taste. This pulls you out of your head and into the present moment. Use it when emotions feel overwhelming.", emoji: "🖐️" },
            { title: "Name It to Tame It", body: "Saying 'I feel angry' out loud or on paper reduces the intensity of the emotion. Be specific: not just 'bad' but 'frustrated and disrespected.' Naming creates distance.", emoji: "🏷️" },
            { title: "Move Your Body", body: "Emotions live in the body, not just the mind. A 10-minute walk, push-ups, stretching, or dancing can shift your emotional state when nothing else works.", emoji: "🚶" },
            { title: "The Feeling Will Pass", body: "No emotion lasts forever. Even the most intense feeling peaks and fades. You do not need to escape it — you just need to outlast it. You have done this before.", emoji: "🌊" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 5 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Practice the 5-4-3-2-1 grounding technique at least once a day this week — even when you are not distressed. Building the skill when calm makes it available when you need it most." },
            { type: "ACTION", description: "Each day, track your strongest emotion and what you did with it. Did you stuff it, act on it impulsively, or use a healthy coping skill? No judgment — just notice the pattern." },
            { type: "JOURNAL_PROMPT", description: "What emotion is hardest for you to sit with? Write about why you think that emotion is so difficult. What does your brain tell you will happen if you feel it fully without using?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 6: Social Pressure and Relationships ─────────────
  await createModuleWithParts(
    prisma,
    program.id,
    5,
    {
      title: "Social Pressure and Relationships",
      subtitle: "Session 6",
      summary: "Learn to handle social pressure to use and build a recovery-supportive social network.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Navigating Social Pressure",
        content: {
          type: "TEXT",
          body: "Relationships and social situations are some of the trickiest parts of recovery. The people around you can be your greatest source of support — or your biggest risk factor. This module helps you navigate both.\n\n**Types of Social Pressure**\n\n**Direct Pressure**: Someone offers you a substance, insists you drink, or questions your decision not to use. This is the easiest type to recognize but can be hard to resist, especially from close friends or family.\n\n**Indirect Pressure**: Being around people who are using, feeling like you do not fit in, watching others enjoy substances at a party, or experiencing the social rituals you used to participate in (happy hour, passing a joint, toasting with champagne).\n\n**Internal Pressure**: Feeling like you \"should\" be able to drink like a normal person, comparing yourself to others, or believing that recovery makes you different or less fun.\n\n**How to Handle Pressure**\n\n1. **Have your response ready BEFORE you need it.** Plan exactly what you will say when someone offers. Keep it simple:\n   - \"No thanks, I am not drinking.\"\n   - \"I am good with water.\"\n   - \"I am driving.\"\n   - You do not owe anyone an explanation.\n\n2. **Bring your own drink.** Having a non-alcoholic beverage in your hand prevents offers and makes you feel less conspicuous.\n\n3. **Have an exit plan.** Before any social event, know how you will leave if you need to. Drive yourself. Tell a trusted friend you might need to go early.\n\n4. **Know your limits.** In early recovery, it is okay to skip events where substances will be central. You are not missing out — you are protecting your recovery.\n\n**Evaluating Your Relationships**\nSome relationships support recovery. Others threaten it. Ask honestly about each person in your life:\n- Does this person respect my recovery?\n- Do I use or want to use when I am around them?\n- Does this person encourage healthy behaviors?\n- Can I be honest with this person about my struggles?\n\nYou may need to distance yourself from some relationships, at least temporarily. This is not selfish — it is survival.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Social Situation Survival",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Social Tools",
          cards: [
            { title: "The Broken Record", body: "If someone pushes after you say no, repeat the same phrase calmly. 'No thanks.' 'No, I am good.' You do not need a new reason each time. Repetition works.", emoji: "🔁" },
            { title: "Exit Strategy", body: "Before any risky social event: drive yourself, keep your phone charged, have cab money, and tell one person you might leave early. Having an escape route reduces anxiety.", emoji: "🚗" },
            { title: "Your Team", body: "Identify 3-5 people who actively support your recovery. These are the people you call first, spend time with most, and lean on when it gets hard. Nurture these relationships.", emoji: "👥" },
            { title: "It Gets Easier", body: "The first sober party, holiday, and Friday night feel strange. The tenth feels normal. Every social situation you navigate sober builds confidence for the next one.", emoji: "📈" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 6 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Write your go-to refusal statement and practice saying it out loud 5 times. It should feel natural and automatic when you need it." },
            { type: "ACTION", description: "Evaluate your top 10 relationships using the questions from this module. Sort them into 'supports recovery,' 'neutral,' and 'threatens recovery.' Share this with your clinician." },
            { type: "JOURNAL_PROMPT", description: "Who in your life is hardest to say no to? Why? What would you need to change about that relationship to protect your recovery?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 7: Building a Balanced Lifestyle ─────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    6,
    {
      title: "Building a Balanced Lifestyle",
      subtitle: "Session 7",
      summary: "Create balance between obligations and enjoyment so that recovery feels sustainable, not like deprivation.",
      estimatedMinutes: 45,
    },
    [
      {
        type: "TEXT",
        title: "Why Lifestyle Balance Matters",
        content: {
          type: "TEXT",
          body: "One of the biggest threats to long-term recovery is a life that feels empty, boring, or like nothing but obligations. If your daily life is all \"should\" and no \"want,\" your brain will eventually look for relief — and it knows exactly where to find it.\n\n**The Should-Want Balance**\nMarlatt and Gordon, who developed the relapse prevention model, identified an imbalance between \"shoulds\" (obligations, responsibilities, things you have to do) and \"wants\" (pleasures, hobbies, things you enjoy) as a major relapse risk factor.\n\nWhen your life is all shoulds:\n- You feel resentful, trapped, and exhausted\n- You develop a sense of entitlement: \"I deserve a reward\" (and the substance was your reward)\n- You have no positive experiences to offset the daily grind\n- Recovery feels like one more should — one more deprivation\n\n**Building Positive Activities Into Your Life**\nRecovery is not just about removing the substance — it is about building a life you do not need to escape from. Ask yourself:\n- What did I enjoy before substance use took over?\n- What have I always wanted to try?\n- What activities give me a sense of accomplishment?\n- What activities help me feel connected to others?\n- What brings me physical pleasure (exercise, nature, food, music)?\n\n**The Four Pillars of a Balanced Recovery Lifestyle**\n\n1. **Physical Health**: Regular exercise (even walking counts), balanced meals, adequate sleep, medical checkups. Your body has been through a lot. Taking care of it is not optional.\n\n2. **Social Connection**: Healthy relationships, community involvement, support groups, volunteering. Humans are social creatures. Isolation is dangerous in recovery.\n\n3. **Meaningful Activity**: Work, education, creativity, hobbies, goals. Having something to work toward gives you a reason to stay sober beyond \"not using.\"\n\n4. **Rest and Pleasure**: Downtime, fun, relaxation, play. These are not luxuries — they are necessities. Without them, burnout leads to relapse.\n\n**Practical Tip**\nSchedule at least one enjoyable activity every day. It does not have to be big — a 15-minute walk, a favorite meal, a phone call with a friend, 20 minutes with a hobby. The key is consistency.",
        },
      },
      {
        type: "CHECKLIST",
        title: "Lifestyle Balance Assessment",
        content: {
          type: "CHECKLIST",
          items: [
            { text: "I exercise or move my body at least 3 times per week", sortOrder: 0 },
            { text: "I eat regular, balanced meals most days", sortOrder: 1 },
            { text: "I get 7-9 hours of sleep most nights", sortOrder: 2 },
            { text: "I have at least one person I talk to honestly about my recovery", sortOrder: 3 },
            { text: "I do something enjoyable (not obligation) every day", sortOrder: 4 },
            { text: "I have a hobby or creative outlet", sortOrder: 5 },
            { text: "I have something I am working toward (a goal)", sortOrder: 6 },
            { text: "I take at least one full day off from obligations per week", sortOrder: 7 },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 7 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Make a list of 20 activities you enjoy or used to enjoy that do not involve substances. These can be big (hiking, concerts) or small (hot baths, puzzles, cooking). Post this list somewhere visible." },
            { type: "ACTION", description: "Schedule at least one enjoyable activity every day this week. Treat it as non-negotiable — as important as a medical appointment." },
            { type: "JOURNAL_PROMPT", description: "How does your current should-want balance look? Are you running on obligations alone? What would a more balanced week look like for you?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 8: Problem-Solving Skills ────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    7,
    {
      title: "Problem-Solving Skills",
      subtitle: "Session 8",
      summary: "Learn a structured approach to handling life problems without turning to substances.",
      estimatedMinutes: 45,
    },
    [
      {
        type: "TEXT",
        title: "Solving Problems Without Substances",
        content: {
          type: "TEXT",
          body: "Life does not stop throwing problems at you just because you are in recovery. Financial stress, relationship conflicts, work issues, health problems — these all keep coming. The difference now is that you need to face them without the substance that used to be your default escape.\n\n**The Problem-Solving Process**\nWhen problems feel overwhelming, a structured approach helps. Follow these steps:\n\n**Step 1: Define the Problem Clearly**\nVague problems feel unsolvable. \"Everything is falling apart\" is not a problem — it is a feeling. Get specific: \"I am behind on rent by $400 and it is due in two weeks.\" Specific problems have specific solutions.\n\n**Step 2: Brainstorm Solutions**\nWrite down every possible solution without judging any of them. Include bad ideas, creative ideas, and obvious ideas. The goal is quantity, not quality. Often the best solution comes from combining several ideas.\n\n**Step 3: Evaluate Each Option**\nFor each solution, ask:\n- What are the pros and cons?\n- Is this realistic?\n- Does this align with my recovery?\n- What are the short-term and long-term consequences?\n\n**Step 4: Choose the Best Option**\nPick the solution (or combination) that has the most benefits and fewest drawbacks. It does not have to be perfect — good enough is good enough.\n\n**Step 5: Make a Plan and Act**\nBreak the solution into small, specific steps with deadlines. Take the first step today. Action creates momentum.\n\n**Step 6: Review the Result**\nDid it work? If yes, great. If not, go back to step 2 and try a different approach. Solving problems is a process, not a one-shot attempt.\n\n**Common Traps**\n- **Analysis paralysis**: Overthinking instead of acting. Remember: a good plan today is better than a perfect plan next month.\n- **Avoidance**: Ignoring the problem and hoping it goes away. It rarely does — and the stress of avoidance often triggers cravings.\n- **Catastrophizing**: Assuming the worst outcome is certain. Check: what is the MOST LIKELY outcome, not the worst possible one?",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Problem-Solving Quick Tools",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Problem-Solving Toolkit",
          cards: [
            { title: "Get Specific", body: "Turn vague overwhelm into a clear problem statement. 'I am stressed about money' becomes 'I need $400 for rent in 2 weeks.' Specific problems have specific solutions.", emoji: "🎯" },
            { title: "The 10-Idea Method", body: "Force yourself to write 10 possible solutions — even silly ones. By idea 7 or 8, your brain starts getting creative. The best solution is often hiding in the later ideas.", emoji: "💡" },
            { title: "One Step Today", body: "You do not have to solve the whole problem today. Just take one step. Action breaks the freeze response and builds momentum toward a solution.", emoji: "👣" },
            { title: "Ask for Help", body: "Asking for help is not weakness — it is one of the best problem-solving strategies. Other people see solutions you cannot see. A sponsor, counselor, friend, or family member might have exactly the idea you need.", emoji: "🤲" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 8 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Choose a current real-life problem and work through all 6 steps of the problem-solving process. Write down the problem, your brainstormed solutions, your evaluation, your chosen solution, your action plan, and take the first step this week." },
            { type: "ACTION", description: "Identify one problem you have been avoiding. Write it down as a specific problem statement. Even if you do not solve it this week, naming it removes some of its power." },
            { type: "JOURNAL_PROMPT", description: "How did you used to handle problems before recovery? How did that work out? What is different about approaching problems sober?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 9: Anger Management ──────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    8,
    {
      title: "Anger Management",
      subtitle: "Session 9",
      summary: "Learn to handle anger constructively instead of letting it drive substance use.",
      estimatedMinutes: 45,
    },
    [
      {
        type: "TEXT",
        title: "Anger and Recovery",
        content: {
          type: "TEXT",
          body: "Anger is one of the emotions most closely linked to relapse. Many people in recovery struggle with anger — either expressing too much of it or stuffing it down until it explodes. Neither approach serves you well.\n\n**Why Anger Is So Risky in Recovery**\n- Anger creates intense physical arousal (racing heart, muscle tension, adrenaline) that your brain can mistake for a craving\n- Anger gives permission: \"After what they did to me, I have every right to use\"\n- Suppressed anger builds resentment, which is one of the biggest relapse triggers\n- Anger often damages relationships — and damaged relationships trigger more anger and isolation\n\n**Understanding Your Anger**\nAnger is often a secondary emotion — meaning it covers up another feeling underneath. Common emotions that hide under anger:\n- Hurt (\"They disrespected me\" → \"I feel hurt that they do not value me\")\n- Fear (\"They are threatening my safety / stability / relationship\")\n- Shame (\"They saw something about me I did not want them to see\")\n- Helplessness (\"I cannot control this situation\")\n\nRecognizing the primary emotion underneath anger gives you more options for responding.\n\n**The Anger Escalation Ladder**\nAnger does not go from 0 to 100 instantly — it escalates through stages:\n1. **Irritation** — mild annoyance, easily managed\n2. **Frustration** — growing impatience, harder to ignore\n3. **Anger** — strong emotion, physiological arousal, urge to act\n4. **Rage** — loss of rational thinking, saying or doing things you regret\n\nThe key is to intervene at stages 1 or 2, before you reach 3 or 4.\n\n**Anger Management Skills**\n\n1. **Recognize your warning signs**: What does anger feel like in your body BEFORE you lose control? Jaw clenching? Fists tightening? Heart racing? Hot face? These are your early warning signals.\n\n2. **Take a time-out**: When you feel the warning signs, step away. Say: \"I need a few minutes. I will come back when I am calmer.\" Walk away, breathe, cool down. This is not weakness — it is strategy.\n\n3. **Use the STOP technique**: Stop (do not react), Take a breath, Observe (what am I feeling? what is actually happening?), Proceed (choose a response instead of reacting).\n\n4. **Express anger assertively, not aggressively**: Assertive — \"I feel frustrated when plans change at the last minute. I need more notice.\" Aggressive — \"You always do this! You do not care about anyone but yourself!\" The difference: assertive describes YOUR feeling. Aggressive attacks the other person.\n\n5. **Physical release**: When anger energy is high, discharge it safely: walk briskly, do push-ups, squeeze a stress ball, punch a pillow. The adrenaline needs somewhere to go.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Anger Tools",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Anger Management",
          cards: [
            { title: "STOP", body: "Stop — freeze, do not react. Take a breath — slow, deep. Observe — what am I actually feeling? What is really going on? Proceed — choose a thoughtful response instead of an impulsive reaction.", emoji: "🛑" },
            { title: "What Is Under the Anger?", body: "Anger often masks hurt, fear, shame, or helplessness. Ask yourself: if I peel back the anger, what feeling is underneath? Addressing the real emotion is more effective.", emoji: "🧅" },
            { title: "The Time-Out", body: "Stepping away is not running away. Say 'I need 10 minutes' and come back when you are calm enough to have a productive conversation. This prevents damage that is hard to undo.", emoji: "⏸️" },
            { title: "I-Statements", body: "Replace 'You always...' with 'I feel... when...' This shifts from attack to communication. People are much more likely to hear you when they do not feel attacked.", emoji: "💬" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 9 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Track your anger this week. Each time you feel angry or irritated, record: the situation, the intensity (0-10), what you felt underneath the anger, and how you responded. Look for patterns." },
            { type: "ACTION", description: "Practice the STOP technique at least 3 times this week — even for mild irritation. The more you practice at low levels, the easier it is to use at high levels." },
            { type: "JOURNAL_PROMPT", description: "Think about a time when anger led you to use or came close. What happened? What was under the anger? What could you do differently now with the skills you have learned?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 10: Handling Lapses ──────────────────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    9,
    {
      title: "Handling Lapses",
      subtitle: "Session 10",
      summary: "Learn the difference between a lapse and a relapse, and develop a plan for getting back on track quickly.",
      estimatedMinutes: 50,
    },
    [
      {
        type: "TEXT",
        title: "Lapse vs. Relapse: The Abstinence Violation Effect",
        content: {
          type: "TEXT",
          body: "A lapse is a single episode of substance use after a period of abstinence. A relapse is a return to the old pattern of regular use. A lapse does NOT have to become a relapse. The difference is what you do next.\n\n**The Abstinence Violation Effect (AVE)**\nThis is the most dangerous moment in recovery. The AVE is what happens in your mind after a lapse:\n\n1. **Guilt and shame**: \"I used. I am a failure. I am weak. I am hopeless.\"\n2. **All-or-nothing thinking**: \"I already ruined my sobriety, so it does not matter anymore. I might as well keep using.\"\n3. **Attribution to self**: \"This proves I cannot do this. I am an addict and I always will be.\"\n\nThis thinking pattern turns a single slip into a full relapse. The lapse itself is a problem, but the AVE is what makes it catastrophic.\n\n**Reframing a Lapse**\nA more helpful way to think about a lapse:\n- It is information, not proof of failure\n- It tells you something about your coping skills, your triggers, or your support system that needs attention\n- Recovery is not ruined — every day of sobriety still counts\n- The question is not \"why did I use?\" but \"what will I do NOW?\"\n\n**Your Lapse Response Plan**\n\n1. **Stop using immediately.** One use does not have to become two. Put the substance down, pour it out, leave the situation.\n\n2. **Tell someone.** Call your sponsor, therapist, or a trusted friend within 24 hours. Secrecy fuels relapse. Saying it out loud breaks the cycle.\n\n3. **Get safe.** Remove yourself from the high-risk situation. Go home, go to a meeting, go to a safe person's house.\n\n4. **Analyze what happened.** Once you are safe and sober, examine the chain of events. What was the trigger? Where did the process start? What coping skill could have helped? This is learning, not self-punishment.\n\n5. **Recommit and adjust.** Reaffirm your commitment to recovery. Adjust your plan based on what you learned. Maybe you need more support, a schedule change, or a new coping strategy.\n\n6. **Forgive yourself.** This is not permission to use again. It is permission to be human, learn from it, and keep going.\n\n**Important**\nIf you have a lapse, safety comes first. If you have been abstinent for a while and use the same amount you used to, your tolerance is lower. This is a medical risk, especially with opioids and alcohol. Use with caution and tell someone.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Lapse Recovery Tools",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Getting Back on Track",
          cards: [
            { title: "One Slip, Not a Slide", body: "A lapse is like tripping on a staircase. You can catch yourself on the next step, or you can let yourself tumble to the bottom. The choice is yours. Catch yourself NOW.", emoji: "🪜" },
            { title: "Call Within 24 Hours", body: "Tell someone what happened within one day. The longer you keep it secret, the more power it has. Saying it out loud breaks shame's grip and reconnects you to support.", emoji: "📞" },
            { title: "What Can I Learn?", body: "Every lapse is data. Ask: what was the trigger? What was I feeling? What was I telling myself? Where did the chain of events start? Use this to strengthen your plan.", emoji: "🔬" },
            { title: "Your Sobriety Is Not Erased", body: "Every sober day still happened. Every skill you built is still there. A lapse does not erase your progress — it tests it. Get back on track and keep building.", emoji: "🏗️" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 10 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Write your personal Lapse Response Plan: who you will call (list 3 names and numbers), where you will go, and what steps you will take. Keep this card in your wallet or saved on your phone." },
            { type: "ACTION", description: "Practice your response to the Abstinence Violation Effect. Write down the self-defeating thoughts that would come up after a lapse, and next to each one, write a more balanced response." },
            { type: "JOURNAL_PROMPT", description: "If you have had a lapse in the past, write about what happened and what you did afterward. Looking back with what you know now, what would you do differently? If you have not lapsed, write about what you would want someone to say to you if you did." },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 11: Building Your Support Network ────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    10,
    {
      title: "Building Your Support Network",
      subtitle: "Session 11",
      summary: "Strengthen your recovery community and create a sustainable support system.",
      estimatedMinutes: 45,
    },
    [
      {
        type: "TEXT",
        title: "Recovery Does Not Happen Alone",
        content: {
          type: "TEXT",
          body: "Research consistently shows that social support is one of the strongest predictors of long-term recovery. People who have a solid recovery network are significantly less likely to relapse. This is not about having lots of friends — it is about having the RIGHT connections.\n\n**The Layers of Your Support Network**\n\n**Layer 1 — Inner Circle (2-3 people)**\nThese are the people you call at 2 AM when a craving hits. They know your story, they understand recovery, and they will answer the phone. This might be a sponsor, a recovery mentor, a therapist, or a very close friend.\n\n**Layer 2 — Recovery Community (5-10 people)**\nPeople who share your recovery journey — members of support groups, sober friends, people in your treatment program. You see them regularly and they understand what you are going through without you having to explain.\n\n**Layer 3 — General Support (10-20 people)**\nFriends, family members, coworkers, and community members who know about your recovery and support it, even if they do not fully understand it. They provide normal social connection and a sense of belonging.\n\n**Building Each Layer**\n\nFor your Inner Circle:\n- Be intentional about who you put here — these relationships require trust and availability\n- Ask directly: \"Would you be willing to be someone I call when things get hard?\"\n- Maintain these relationships even when things are going well — do not just call in crisis\n\nFor your Recovery Community:\n- Attend support groups regularly (AA, NA, SMART Recovery, Refuge Recovery, or others)\n- Volunteer in recovery settings\n- Be a resource for someone newer to recovery — helping others strengthens your own commitment\n\nFor General Support:\n- Engage in community activities: sports leagues, classes, volunteer work, faith communities\n- Be open about your recovery with safe people — hiding it is exhausting\n- Invest in relationships that are not centered on substances\n\n**What to Do When You Feel Alone**\nEveryone in recovery feels alone sometimes. When it hits:\n- Go to a meeting or support group — you do not have to talk; just show up\n- Call someone from your list — even if you do not feel like it\n- Go somewhere with people: a library, a coffee shop, a park\n- Remember: the feeling of loneliness is temporary. Isolation makes it worse. Connection makes it better.",
        },
      },
      {
        type: "STRATEGY_CARDS",
        title: "Connection Tools",
        content: {
          type: "STRATEGY_CARDS",
          deckName: "Building Recovery Community",
          cards: [
            { title: "Your Emergency List", body: "Write the names and phone numbers of 5 people you can call in a crisis. Keep it in your wallet AND on your phone. In a crisis, your brain will not remember — your list will.", emoji: "📋" },
            { title: "Show Up Even When You Do Not Want To", body: "The meetings and gatherings you least want to attend are often the ones you need most. Connection is a discipline, not just a feeling. Show up, even reluctantly.", emoji: "🚪" },
            { title: "Give Back", body: "Helping someone else in recovery is one of the most effective ways to strengthen your own. It reminds you how far you have come and gives your experience purpose.", emoji: "🤝" },
            { title: "Connection Before Isolation", body: "When you feel the urge to withdraw, do the opposite. Text someone. Call someone. Go somewhere with people. Isolation is where relapse breeds. Connection is the antidote.", emoji: "🌐" },
          ],
        },
      },
      {
        type: "HOMEWORK",
        title: "Session 11 Practice",
        content: {
          type: "HOMEWORK",
          items: [
            { type: "ACTION", description: "Map your current support network using the 3 layers. Write names in each layer. Identify which layers are strong and which need work. Commit to one action to strengthen a weak layer this week." },
            { type: "ACTION", description: "Reach out to at least 2 people in your recovery community this week — not because you need something, but just to connect. Recovery relationships need maintenance." },
            { type: "JOURNAL_PROMPT", description: "What is your biggest barrier to asking for help? Where did you learn that asking for help is bad or weak? How might things be different if you allowed yourself to lean on others?" },
          ],
          dueTimingType: "BEFORE_NEXT_SESSION",
          completionRule: "ALL",
          reminderCadence: "DAILY",
        },
      },
    ]
  );

  // ── Module 12: Your Relapse Prevention Plan ─────────────────
  await createModuleWithParts(
    prisma,
    program.id,
    11,
    {
      title: "Your Relapse Prevention Plan",
      subtitle: "Session 12",
      summary: "Bring everything together into a comprehensive, personal relapse prevention plan you can carry forward.",
      estimatedMinutes: 55,
    },
    [
      {
        type: "TEXT",
        title: "Building Your Personal Plan",
        content: {
          type: "TEXT",
          body: "Over the past 12 weeks, you have built an impressive toolkit for recovery. This final session brings everything together into a single plan you can reference anytime. Your relapse prevention plan is a living document — update it as you learn more about yourself and your recovery.\n\n**Your Plan Should Include:**\n\n1. **My Personal Warning Signs**\n- Emotional relapse signs (feelings and behaviors)\n- Mental relapse signs (thoughts and desires)\n- What other people have told me they notice when I am struggling\n\n2. **My High-Risk Situations**\n- My top 5 triggers\n- The emotions most likely to lead to use\n- The people, places, and situations I need to avoid or manage carefully\n\n3. **My Coping Skills**\n- For cravings: what works for me (urge surfing, delay, distract, dispute, escape)\n- For negative emotions: grounding, processing, sitting with, self-soothing\n- For social pressure: my refusal strategy, my exit plan\n- For anger: STOP technique, time-outs, I-statements\n- For problems: the 6-step problem-solving process\n\n4. **My Support Network**\n- Inner circle (names and numbers)\n- Recovery community (groups, meetings, people)\n- General support (friends, family, community)\n\n5. **My Lapse Response Plan**\n- Stop using immediately\n- Call: [name] [number]\n- Go to: [safe place]\n- Analyze what happened\n- Recommit and adjust\n- Forgive myself\n\n6. **My Balanced Lifestyle**\n- Physical health habits I will maintain\n- Social connections I will nurture\n- Meaningful activities I will continue\n- Pleasure and rest I will protect\n\n7. **My Motivation**\n- Why I chose recovery\n- What I have gained since getting sober\n- What I would lose if I went back\n- Who I am doing this for (including myself)\n\n**What Happens Now**\n- Review your plan weekly for the first month, then monthly\n- Update it as your life changes\n- Share it with your support people\n- If you feel yourself slipping, re-read it immediately\n- If you need more support, reach out to your clinician — booster sessions are always available",
        },
      },
      {
        type: "ASSESSMENT",
        title: "AUDIT Post-Treatment",
        content: {
          type: "ASSESSMENT",
          title: "AUDIT (Alcohol Use Disorders Identification Test) — Post-Treatment",
          instructions:
            "Please answer each question about your alcohol use over the past month. Choose the answer that is most correct for you.",
          scoringMethod: "SUM",
          questions: [
            {
              question: "How often do you have a drink containing alcohol?",
              type: "MULTIPLE_CHOICE",
              required: true,
              sortOrder: 0,
              options: [
                { label: "Never", value: 0 },
                { label: "Monthly or less", value: 1 },
                { label: "2-4 times a month", value: 2 },
                { label: "2-3 times a week", value: 3 },
                { label: "4 or more times a week", value: 4 },
              ],
            },
            {
              question: "How many drinks containing alcohol do you have on a typical day when you are drinking?",
              type: "MULTIPLE_CHOICE",
              required: true,
              sortOrder: 1,
              options: [
                { label: "1 or 2", value: 0 },
                { label: "3 or 4", value: 1 },
                { label: "5 or 6", value: 2 },
                { label: "7, 8, or 9", value: 3 },
                { label: "10 or more", value: 4 },
              ],
            },
            {
              question: "How often do you have six or more drinks on one occasion?",
              type: "MULTIPLE_CHOICE",
              required: true,
              sortOrder: 2,
              options: [
                { label: "Never", value: 0 },
                { label: "Less than monthly", value: 1 },
                { label: "Monthly", value: 2 },
                { label: "Weekly", value: 3 },
                { label: "Daily or almost daily", value: 4 },
              ],
            },
            {
              question: "How often during the last year have you found that you were not able to stop drinking once you had started?",
              type: "MULTIPLE_CHOICE",
              required: true,
              sortOrder: 3,
              options: [
                { label: "Never", value: 0 },
                { label: "Less than monthly", value: 1 },
                { label: "Monthly", value: 2 },
                { label: "Weekly", value: 3 },
                { label: "Daily or almost daily", value: 4 },
              ],
            },
            {
              question: "How often during the last year have you failed to do what was normally expected from you because of your drinking?",
              type: "MULTIPLE_CHOICE",
              required: true,
              sortOrder: 4,
              options: [
                { label: "Never", value: 0 },
                { label: "Less than monthly", value: 1 },
                { label: "Monthly", value: 2 },
                { label: "Weekly", value: 3 },
                { label: "Daily or almost daily", value: 4 },
              ],
            },
            {
              question: "How often during the last year have you needed a first drink in the morning to get yourself going after a heavy drinking session?",
              type: "MULTIPLE_CHOICE",
              required: true,
              sortOrder: 5,
              options: [
                { label: "Never", value: 0 },
                { label: "Less than monthly", value: 1 },
                { label: "Monthly", value: 2 },
                { label: "Weekly", value: 3 },
                { label: "Daily or almost daily", value: 4 },
              ],
            },
            {
              question: "How often during the last year have you had a feeling of guilt or remorse after drinking?",
              type: "MULTIPLE_CHOICE",
              required: true,
              sortOrder: 6,
              options: [
                { label: "Never", value: 0 },
                { label: "Less than monthly", value: 1 },
                { label: "Monthly", value: 2 },
                { label: "Weekly", value: 3 },
                { label: "Daily or almost daily", value: 4 },
              ],
            },
            {
              question: "How often during the last year have you been unable to remember what happened the night before because you had been drinking?",
              type: "MULTIPLE_CHOICE",
              required: true,
              sortOrder: 7,
              options: [
                { label: "Never", value: 0 },
                { label: "Less than monthly", value: 1 },
                { label: "Monthly", value: 2 },
                { label: "Weekly", value: 3 },
                { label: "Daily or almost daily", value: 4 },
              ],
            },
            {
              question: "Have you or someone else been injured as a result of your drinking?",
              type: "MULTIPLE_CHOICE",
              required: true,
              sortOrder: 8,
              options: [
                { label: "No", value: 0 },
                { label: "Yes, but not in the last year", value: 2 },
                { label: "Yes, during the last year", value: 4 },
              ],
            },
            {
              question: "Has a relative or friend, or a doctor or another health worker been concerned about your drinking or suggested you cut down?",
              type: "MULTIPLE_CHOICE",
              required: true,
              sortOrder: 9,
              options: [
                { label: "No", value: 0 },
                { label: "Yes, but not in the last year", value: 2 },
                { label: "Yes, during the last year", value: 4 },
              ],
            },
          ],
        },
      },
      {
        type: "CHECKLIST",
        title: "Relapse Prevention Plan Completion",
        content: {
          type: "CHECKLIST",
          items: [
            { text: "I have written my personal warning signs for each stage of relapse", sortOrder: 0 },
            { text: "I have identified my top 5 high-risk situations with coping plans for each", sortOrder: 1 },
            { text: "I have my craving coping skills listed and practiced", sortOrder: 2 },
            { text: "I have my emotion management skills listed", sortOrder: 3 },
            { text: "I have my support network mapped with current phone numbers", sortOrder: 4 },
            { text: "I have my lapse response plan written and shared with my inner circle", sortOrder: 5 },
            { text: "I have a balanced lifestyle plan that includes daily enjoyable activities", sortOrder: 6 },
            { text: "I have written my personal motivation for recovery", sortOrder: 7 },
            { text: "I know how to reach my clinician for booster sessions", sortOrder: 8 },
          ],
        },
      },
      {
        type: "JOURNAL_PROMPT",
        title: "Letter to Yourself",
        content: {
          type: "JOURNAL_PROMPT",
          prompts: [
            "Write a letter to your future self — the version of you who is struggling, craving, or thinking about giving up. What would you want that person to remember? What have you learned? Why is recovery worth it? Be specific, be honest, and be kind. Keep this letter. Read it when you need it.",
          ],
          spaceSizeHint: "large",
        },
      },
    ]
  );

  // ── DailyTracker for Substance Use Recovery ─────────────────
  const recoveryTracker = await prisma.dailyTracker.create({
    data: {
      programId: program.id,
      createdById: clinicianId,
      name: "Recovery Daily Check-In",
      description: "Track your cravings, mood, coping, and recovery progress each day.",
    },
  });

  await prisma.dailyTrackerField.createMany({
    data: [
      { trackerId: recoveryTracker.id, label: "Strongest craving today", fieldType: "SCALE", sortOrder: 0, isRequired: true, options: { min: 0, max: 10, minLabel: "No cravings", maxLabel: "Extreme craving" } },
      { trackerId: recoveryTracker.id, label: "Overall mood", fieldType: "SCALE", sortOrder: 1, isRequired: true, options: { min: 0, max: 10, minLabel: "Very low", maxLabel: "Very good" } },
      { trackerId: recoveryTracker.id, label: "Stress level", fieldType: "SCALE", sortOrder: 2, isRequired: true, options: { min: 0, max: 10, minLabel: "No stress", maxLabel: "Extreme stress" } },
      { trackerId: recoveryTracker.id, label: "Did you use any substances today?", fieldType: "YES_NO", sortOrder: 3, isRequired: true },
      { trackerId: recoveryTracker.id, label: "Did you attend a meeting or support group?", fieldType: "YES_NO", sortOrder: 4, isRequired: false },
      { trackerId: recoveryTracker.id, label: "Did you connect with someone in your support network?", fieldType: "YES_NO", sortOrder: 5, isRequired: true },
      { trackerId: recoveryTracker.id, label: "Coping skills used today", fieldType: "MULTI_CHECK", sortOrder: 6, isRequired: false, options: { options: ["Urge surfing", "Called someone", "Physical activity", "Grounding exercise", "Problem-solving", "Journaling", "Meeting/support group", "Deep breathing", "Other"] } },
      { trackerId: recoveryTracker.id, label: "Did you do something enjoyable today (not an obligation)?", fieldType: "YES_NO", sortOrder: 7, isRequired: true },
      { trackerId: recoveryTracker.id, label: "Hours of sleep last night", fieldType: "NUMBER", sortOrder: 8, isRequired: true },
      { trackerId: recoveryTracker.id, label: "Anything else to note about today", fieldType: "FREE_TEXT", sortOrder: 9, isRequired: false },
    ],
  });

  return program;
}
