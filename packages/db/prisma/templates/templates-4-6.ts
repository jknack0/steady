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
        type: "STYLED_CONTENT",
        title: "Understanding PTSD",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Post-Traumatic Stress Disorder (PTSD) is a condition that can develop after you experience or witness something very frightening, dangerous, or shocking. It is not a sign of weakness. PTSD happens because your brain is trying to protect you from future danger, but it gets stuck in alarm mode.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">How PTSD Works</strong>
When something traumatic happens, your brain stores the memory differently than normal memories. Instead of being filed away as something that happened in the past, the memory stays active. This is why you might:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Have nightmares or flashbacks that feel like the event is happening again</li><li style="margin-bottom: 6px;">Feel on edge or jumpy, as if danger is always nearby</li><li style="margin-bottom: 6px;">Avoid people, places, or situations that remind you of what happened</li><li style="margin-bottom: 6px;">Feel numb, disconnected, or unable to enjoy things you used to like</li><li style="margin-bottom: 6px;">Have trouble sleeping or concentrating</li><li style="margin-bottom: 6px;">Feel guilty, ashamed, or angry much of the time</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What Keeps PTSD Going</strong>
Two main things keep PTSD symptoms going:</p><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Avoidance</strong>: When you avoid thinking about or talking about what happened, your brain never gets the chance to process the memory properly. The memory stays raw and unprocessed.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Stuck Points</strong>: After trauma, most people develop certain beliefs that feel true but actually keep them stuck. For example, you might believe the trauma was your fault, that the world is completely dangerous, or that you can never trust anyone again. These beliefs — called stuck points — cause painful emotions and keep you from recovering.</li></ol><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">How CPT Helps</strong>
Cognitive Processing Therapy works by helping you:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Process your trauma memory so it loses its power over you</li><li style="margin-bottom: 6px;">Identify and challenge stuck points — the unhelpful beliefs that keep you suffering</li><li style="margin-bottom: 6px;">Develop more balanced, accurate ways of thinking about what happened and about yourself</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">This is a 12-session program. Research shows that most people experience significant improvement in PTSD symptoms by the end of treatment. You do not need to describe your trauma in detail to benefit from this therapy.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Understanding Stuck Points",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Now that you have written your Impact Statement, we can begin to look at how you have been making sense of what happened. After a trauma, it is very common to develop beliefs that feel completely true but actually keep you stuck in pain. We call these "stuck points."</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What Are Stuck Points?</strong>
Stuck points are thoughts or beliefs that:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Developed because of the trauma or were made stronger by it</li><li style="margin-bottom: 6px;">Keep you feeling afraid, guilty, ashamed, or angry</li><li style="margin-bottom: 6px;">Stop you from recovering and moving forward</li><li style="margin-bottom: 6px;">Often contain words like "always," "never," "should," "must," or "everyone"</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Common Types of Stuck Points</strong>
Stuck points usually fall into two categories:</p><p style="margin-bottom: 12px; line-height: 1.6;">1. <strong style="color: var(--steady-teal);">Beliefs about why the trauma happened (assimilated beliefs)</strong>: These are attempts to keep your old view of the world intact by blaming yourself. Examples:
   - "I should have known better."
   - "If I had done something differently, it wouldn't have happened."
   - "I must have done something to cause it."</p><p style="margin-bottom: 12px; line-height: 1.6;">2. <strong style="color: var(--steady-teal);">Beliefs about yourself and the world that changed because of the trauma (over-accommodated beliefs)</strong>: These are new, extreme beliefs that developed after the trauma. Examples:
   - "I can never trust anyone."
   - "The world is completely dangerous."
   - "I am permanently damaged."
   - "No one will ever love me."</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Why Stuck Points Matter</strong>
Stuck points are the engine that drives PTSD symptoms. When you believe "the world is always dangerous," your brain stays in alarm mode. When you believe "it was my fault," you feel guilt and shame constantly. Changing these beliefs is the core of CPT and the key to your recovery.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Identifying Your Stuck Points</strong>
Look at your Impact Statement and notice any statements that:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Contain extreme language (always, never, everyone, no one)</li><li style="margin-bottom: 6px;">Blame you for things that were not in your control</li><li style="margin-bottom: 6px;">Make broad conclusions about yourself, others, or the world</li><li style="margin-bottom: 6px;">Keep you feeling bad about yourself or afraid of the future</li></ul>`,
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
        type: "STYLED_CONTENT",
        title: "The Connection Between Thoughts and Feelings",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">One of the most important skills in CPT is learning to tell the difference between a thought and a feeling. This sounds simple, but when you are in distress, thoughts and feelings can feel like the same thing.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Thoughts vs. Feelings</strong>
A feeling is an emotion — it can usually be described in one word: sad, angry, scared, guilty, ashamed, happy, calm. A thought is a sentence or statement in your mind — it is your brain's interpretation of what is happening.</p><p style="margin-bottom: 12px; line-height: 1.6;">Here is the key insight: <strong style="color: var(--steady-teal);">It is not the event itself that causes your feelings — it is what you tell yourself about the event.</strong></p><p style="margin-bottom: 8px; line-height: 1.6;">Example:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Event: A friend does not return your call.</li><li style="margin-bottom: 6px;">Thought A: "They must be busy." → Feeling: neutral, understanding</li><li style="margin-bottom: 6px;">Thought B: "Nobody cares about me." → Feeling: sad, lonely</li><li style="margin-bottom: 6px;">Thought C: "Something bad happened to them." → Feeling: worried, anxious</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">The same event leads to completely different feelings depending on the thought. This is powerful because while you cannot always control what happens to you, you can learn to notice and change your thoughts.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The ABC Model</strong>
In CPT, we use the ABC model to break down these connections:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">A = Activating Event</strong>: Something happens (or you remember something)</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">B = Belief / Thought</strong>: What you tell yourself about it</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">C = Consequence</strong>: The emotion you feel and what you do as a result</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Most of the time, we jump straight from A to C — something happens and we feel terrible. We skip B entirely. The goal of CPT is to slow down and catch B so you can examine whether that thought is accurate.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Natural Emotions vs. Manufactured Emotions</strong>
Some emotions after trauma are natural and need to be felt — sadness about what you lost, genuine fear during a dangerous moment. Other emotions are manufactured by stuck points — guilt based on false self-blame, shame based on inaccurate beliefs about yourself. Natural emotions pass with time. Manufactured emotions stay as long as the stuck point stays. CPT focuses on the manufactured emotions by changing the thoughts that create them.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Socratic Questioning",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Now that you can identify your thoughts and see how they create emotions, the next step is learning to question those thoughts. This does not mean telling yourself to "think positive" or pretending everything is fine. It means examining your thoughts the way a scientist would examine a hypothesis — with curiosity and evidence.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Socratic Questions</strong>
Use these questions to examine any stuck point:</p><p style="margin-bottom: 12px; line-height: 1.6;">1. <strong style="color: var(--steady-teal);">What is the evidence for and against this thought?</strong>
List facts (not feelings) that support the thought, then list facts that go against it. Be honest on both sides.</p><p style="margin-bottom: 12px; line-height: 1.6;">2. <strong style="color: var(--steady-teal);">Is this thought a habit or based on facts?</strong>
Sometimes we think something because we have thought it so many times, not because it is actually true.</p><p style="margin-bottom: 12px; line-height: 1.6;">3. <strong style="color: var(--steady-teal);">Am I confusing a thought with a fact?</strong>
"I feel like a failure" is a thought, not a fact. What would a fact look like?</p><p style="margin-bottom: 12px; line-height: 1.6;">4. <strong style="color: var(--steady-teal);">Am I thinking in all-or-nothing terms?</strong>
Look for extremes: always, never, everyone, no one, completely, totally. Reality usually falls somewhere in the middle.</p><p style="margin-bottom: 12px; line-height: 1.6;">5. <strong style="color: var(--steady-teal);">Am I using a reliable source of information?</strong>
Is your conclusion based on what you actually know, or on what you fear? Are you relying on your emotions as evidence?</p><p style="margin-bottom: 12px; line-height: 1.6;">6. <strong style="color: var(--steady-teal);">Am I confusing "possible" with "likely"?</strong>
Just because something could happen does not mean it probably will happen.</p><p style="margin-bottom: 12px; line-height: 1.6;">7. <strong style="color: var(--steady-teal);">Are my judgments based on feelings rather than facts?</strong>
Feeling unsafe and being unsafe are two different things.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">How to Use Socratic Questioning</strong>
Take one of your stuck points and run it through these questions. Write down your answers. Be patient with yourself — this skill takes practice. You are not trying to talk yourself out of your feelings. You are trying to see if the thought behind the feeling is actually accurate.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Problematic Thinking Patterns",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Everyone uses shortcuts in their thinking — our brains are wired to make quick judgments. After trauma, these shortcuts can become extreme and lead to patterns that keep PTSD going. Learning to recognize these patterns is one of the most powerful tools in your recovery.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">The 7 Problematic Thinking Patterns</h3><p style="margin-bottom: 12px; line-height: 1.6;">1. <strong style="color: var(--steady-teal);">Jumping to Conclusions (or Mind Reading)</strong>
Assuming you know what others are thinking without checking. Example: "Everyone can tell something is wrong with me."</p><p style="margin-bottom: 12px; line-height: 1.6;">2. <strong style="color: var(--steady-teal);">Exaggerating or Minimizing</strong>
Blowing something out of proportion or making it seem less important than it is. Example: Exaggerating — "One mistake means I am a total failure." Minimizing — "The abuse was not that bad, other people had it worse."</p><p style="margin-bottom: 12px; line-height: 1.6;">3. <strong style="color: var(--steady-teal);">Ignoring Important Parts of the Situation</strong>
Focusing only on the parts that fit your stuck point and ignoring evidence that goes against it. Example: "He lied to me, so nobody can be trusted" — ignoring the many people who have been honest with you.</p><p style="margin-bottom: 12px; line-height: 1.6;">4. <strong style="color: var(--steady-teal);">Oversimplifying</strong>
Seeing things as all good or all bad with no middle ground. Example: "Either I am completely safe or I am in danger."</p><p style="margin-bottom: 12px; line-height: 1.6;">5. <strong style="color: var(--steady-teal);">Overgeneralizing</strong>
Taking one event and applying it to all situations. Example: "One person hurt me, so all people are dangerous."</p><p style="margin-bottom: 12px; line-height: 1.6;">6. <strong style="color: var(--steady-teal);">Mind Reading</strong>
Assuming you know what others think or feel about you without asking. Example: "My therapist probably thinks I am pathetic."</p><p style="margin-bottom: 12px; line-height: 1.6;">7. <strong style="color: var(--steady-teal);">Emotional Reasoning</strong>
Using your feelings as evidence for a belief. Example: "I feel guilty, so it must have been my fault."</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Spotting the Patterns</strong>
When you notice a stuck point, ask yourself: "Which pattern am I using?" Often, a single stuck point uses more than one pattern. Naming the pattern takes away some of its power and makes it easier to challenge.</p>`,
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
        type: "STYLED_CONTENT",
        title: "The Challenging Beliefs Worksheet",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">The Challenging Beliefs Worksheet is the main tool in CPT. It brings together everything you have learned so far — identifying stuck points, Socratic questioning, and recognizing problematic thinking patterns — into one structured process.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">The Worksheet Has These Columns:</h3><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Column A — Situation</strong>: Briefly describe what happened or what you were thinking about.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Column B — Automatic Thought / Stuck Point</strong>: Write down the stuck point exactly as it appeared in your mind.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Column C — Emotion(s)</strong>: Name the emotion(s) you felt. Rate each one from 0 to 100 for intensity.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Column D — Challenging Questions</strong>: Use the Socratic Questions to examine the thought. Write your answers:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">What is the evidence for and against?</li><li style="margin-bottom: 6px;">Is this a habit or based on facts?</li><li style="margin-bottom: 6px;">Am I using a problematic thinking pattern?</li><li style="margin-bottom: 6px;">What would I tell a friend who had this thought?</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Column E — Problematic Pattern(s)</strong>: Which of the 7 patterns does this thought use?</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Column F — Alternative Thought</strong>: Write a more balanced, accurate thought that takes all the evidence into account. This is not a positive thought — it is a realistic one.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Column G — Re-Rate Emotion(s)</strong>: Now re-rate the emotions from Column C. They usually decrease — sometimes a lot, sometimes a little. Any decrease shows the process is working.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Important Tips</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">The alternative thought should feel believable to you, not like empty positive thinking</li><li style="margin-bottom: 6px;">It is okay if the emotion does not change much at first — this takes practice</li><li style="margin-bottom: 6px;">Use the worksheet every time you notice a stuck point causing distress</li><li style="margin-bottom: 6px;">Bring your completed worksheets to each session</li></ul>`,
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
        type: "STYLED_CONTENT",
        title: "Safety After Trauma",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Starting with this session, we will focus on five key areas where trauma tends to create stuck points: safety, trust, power and control, esteem, and intimacy. We start with safety because it is the most basic need.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">How Trauma Changes Beliefs About Safety</h3><p style="margin-bottom: 12px; line-height: 1.6;">Before trauma, most people have some balance in how they view safety. They know that bad things can happen, but they also know that most of the time, most situations are safe enough.</p><p style="margin-bottom: 12px; line-height: 1.6;">After trauma, beliefs about safety often shift to one of two extremes:</p><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Over-accommodated (too extreme)</strong>: "The world is completely dangerous." "I am never safe." "Something bad could happen at any moment." This leads to constant anxiety, hypervigilance, avoidance of normal activities, and an inability to relax.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Assimilated (self-blame)</strong>: "It happened because I was not careful enough." "If I am perfect in my safety behaviors, I can prevent anything bad from happening." This leads to excessive safety behaviors, self-blame, and the illusion that you can control everything.</li></ol><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Self-Safety vs. Other-Safety</strong>
Some people develop stuck points about their own safety: "I can never be safe again." Others develop stuck points about the safety of loved ones: "If I do not watch my children every second, something terrible will happen to them."</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Finding Balance</strong>
A balanced belief about safety acknowledges that:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Bad things can happen, but they do not happen all the time</li><li style="margin-bottom: 6px;">You can take reasonable precautions without letting fear run your life</li><li style="margin-bottom: 6px;">Feeling unsafe and being unsafe are not the same thing</li><li style="margin-bottom: 6px;">You can learn to tolerate some uncertainty without falling apart</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Your Task</strong>
Look at your stuck points related to safety. Ask:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Am I treating the world as more dangerous than it actually is?</li><li style="margin-bottom: 6px;">Am I blaming myself for not being safe enough?</li><li style="margin-bottom: 6px;">What safety behaviors am I doing that go beyond what is reasonable?</li><li style="margin-bottom: 6px;">What would a balanced view of safety look like for me?</li></ul>`,
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
        type: "STYLED_CONTENT",
        title: "Trust After Trauma",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Trust is one of the areas most deeply affected by trauma. Many people with PTSD struggle to trust others, and just as importantly, they struggle to trust themselves.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">How Trauma Disrupts Trust</h3><p style="margin-bottom: 12px; line-height: 1.6;">Trust involves making yourself vulnerable — believing that another person will not hurt you, or that your own judgment is sound. When trauma happens, especially if it involves another person, trust gets shattered in multiple directions:</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Trust in Others</strong>
Common stuck points:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">"I can never trust anyone again."</li><li style="margin-bottom: 6px;">"People will always let me down."</li><li style="margin-bottom: 6px;">"If I let someone get close, they will hurt me."</li><li style="margin-bottom: 6px;">"No one is who they seem to be."</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">These beliefs lead to isolation, difficulty in relationships, and loneliness — which actually make PTSD symptoms worse.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Trust in Yourself</strong>
Common stuck points:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">"I cannot trust my own judgment — look what happened."</li><li style="margin-bottom: 6px;">"My instincts failed me, so they are worthless."</li><li style="margin-bottom: 6px;">"I will always make bad decisions."</li><li style="margin-bottom: 6px;">"I should have seen it coming."</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">These beliefs lead to indecision, dependence on others, and constant second-guessing.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Finding Balanced Trust</strong>
Balanced trust recognizes that:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Most people are trustworthy in most situations, but not all people are trustworthy in all situations</li><li style="margin-bottom: 6px;">Trust is earned gradually — it does not have to be all or nothing</li><li style="margin-bottom: 6px;">Your judgment has been right many times, even if it was wrong in one situation</li><li style="margin-bottom: 6px;">Trusting yourself does not mean being perfect — it means you can handle what comes</li><li style="margin-bottom: 6px;">You can set boundaries while still allowing people in</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Trust Continuum</strong>
Instead of thinking about trust as on or off, think of it as a scale from 0 to 100. Different people earn different levels of trust. A new coworker might be at 30. A close friend might be at 80. No one needs to be at 100. This gives you much more flexibility than all-or-nothing trust.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Power and Control After Trauma",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">During a traumatic event, you experienced a loss of control — something terrible happened and you could not stop it. This experience can profoundly change how you think about power and control in your daily life.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">How Trauma Disrupts Beliefs About Control</h3><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Over-Controlling (Over-Accommodation)</strong>
Some people respond to trauma by trying to control everything:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">"If I control every detail, nothing bad will happen again."</li><li style="margin-bottom: 6px;">"I must always be in charge to stay safe."</li><li style="margin-bottom: 6px;">"If I let go of control even a little, something terrible will happen."</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">This leads to rigid behavior, difficulty relaxing, conflicts with others, exhaustion, and anxiety when things do not go according to plan.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Helplessness (Assimilation)</strong>
Other people respond by giving up on control entirely:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">"I have no control over anything — what is the point of trying?"</li><li style="margin-bottom: 6px;">"Bad things just happen to me and there is nothing I can do."</li><li style="margin-bottom: 6px;">"I am completely powerless."</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">This leads to passivity, depression, difficulty making decisions, and a sense of hopelessness.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Finding Balanced Control</strong>
The reality is that you have control over some things and not others. Balanced beliefs about power and control recognize:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">You have control over your own choices, even when you cannot control the outcome</li><li style="margin-bottom: 6px;">Not being able to prevent the trauma does not mean you are powerless in all areas of life</li><li style="margin-bottom: 6px;">Trying to control everything is exhausting and impossible</li><li style="margin-bottom: 6px;">Having influence is different from having total control</li><li style="margin-bottom: 6px;">It is possible to feel empowered while accepting that some things are beyond your control</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What You Can and Cannot Control</strong>
You CAN control: your effort, your reactions, how you treat people, seeking help, setting boundaries, your daily habits.
You CANNOT control: other people's actions, random events, the past, the weather, other people's feelings about you.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Esteem After Trauma",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Esteem — how you value yourself and others — is often deeply damaged by trauma. Many people with PTSD carry intense shame and believe they are fundamentally broken, worthless, or different from everyone else.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">How Trauma Disrupts Self-Esteem</h3><p style="margin-bottom: 8px; line-height: 1.6;">Common stuck points about self-esteem:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">"I am damaged goods."</li><li style="margin-bottom: 6px;">"What happened to me proves there is something wrong with me."</li><li style="margin-bottom: 6px;">"I am not as good as other people."</li><li style="margin-bottom: 6px;">"I am weak because I could not handle it."</li><li style="margin-bottom: 6px;">"I should be over this by now."</li><li style="margin-bottom: 6px;">"I do not deserve good things."</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">These beliefs lead to depression, withdrawal, self-sabotage, difficulty accepting compliments, and a deep sense of shame.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">How Trauma Disrupts Esteem of Others</h3><p style="margin-bottom: 8px; line-height: 1.6;">Some people develop stuck points about other people's worth:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">"People are basically selfish and cruel."</li><li style="margin-bottom: 6px;">"Nobody is truly good."</li><li style="margin-bottom: 6px;">"Everyone is just looking out for themselves."</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">These beliefs lead to cynicism, isolation, and difficulty forming relationships.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Shame vs. Guilt</strong>
It is important to understand the difference:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Guilt</strong> says: "I did something bad." Guilt is about a specific behavior.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Shame</strong> says: "I am bad." Shame is about your whole self.</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Guilt can be healthy — it motivates you to make amends or change behavior. Shame is almost always destructive because it attacks your identity, not your actions.</p><p style="margin-bottom: 12px; line-height: 1.6;">After trauma, many people carry shame that does not belong to them. If someone harmed you, the shame belongs to the person who chose to act, not to you.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Rebuilding Self-Esteem</strong>
Balanced self-esteem means:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">You have worth regardless of what happened to you</li><li style="margin-bottom: 6px;">Having been a victim does not define who you are</li><li style="margin-bottom: 6px;">You can acknowledge your struggles without seeing yourself as broken</li><li style="margin-bottom: 6px;">You deserve care, respect, and good things in your life</li><li style="margin-bottom: 6px;">Surviving trauma takes strength, not weakness</li></ul>`,
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
        type: "STYLED_CONTENT",
        title: "Intimacy After Trauma",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Intimacy is the ability to be close to someone — emotionally, physically, or both. Trauma can make intimacy feel dangerous, uncomfortable, or impossible. This module helps you examine your beliefs about closeness and connection.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">How Trauma Disrupts Intimacy</h3><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Emotional Intimacy</strong>
Common stuck points:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">"If I let someone know the real me, they will leave."</li><li style="margin-bottom: 6px;">"Being vulnerable means being weak."</li><li style="margin-bottom: 6px;">"I cannot let anyone see how damaged I am."</li><li style="margin-bottom: 6px;">"I do not deserve love or connection."</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">These beliefs lead to emotional walls, surface-level relationships, and loneliness even when surrounded by people.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Physical Intimacy</strong>
Especially after physical or sexual trauma, stuck points may include:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">"My body is not safe."</li><li style="margin-bottom: 6px;">"Being touched means losing control."</li><li style="margin-bottom: 6px;">"Physical closeness always leads to pain."</li><li style="margin-bottom: 6px;">"I am disgusting or tainted."</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">These beliefs can affect everything from hugging a friend to being intimate with a partner.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Self-Intimacy</strong>
Some people lose the ability to be comfortable with themselves:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">"I cannot stand being alone with my own thoughts."</li><li style="margin-bottom: 6px;">"I have to stay busy or the memories will come."</li><li style="margin-bottom: 6px;">"I do not really know who I am anymore."</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Finding Balanced Intimacy</strong>
Balanced beliefs about intimacy recognize:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Closeness involves risk, but it also brings connection, support, and joy</li><li style="margin-bottom: 6px;">You can set the pace for how close you get to someone</li><li style="margin-bottom: 6px;">Vulnerability is not weakness — it is courage</li><li style="margin-bottom: 6px;">Past experiences with intimacy do not determine future experiences</li><li style="margin-bottom: 6px;">You deserve caring, respectful relationships</li><li style="margin-bottom: 6px;">It is okay to take it slow and rebuild gradually</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Moving Forward</strong>
Recovering intimacy does not mean forcing yourself into uncomfortable situations. It means:
1. Identifying the stuck points that keep you isolated
2. Challenging those stuck points with evidence
3. Taking small, chosen steps toward connection at your own pace
4. Communicating your needs and boundaries to people you trust</p>`,
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
        type: "STYLED_CONTENT",
        title: "How Far You Have Come",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">This is your final session of Cognitive Processing Therapy. Take a moment to recognize what you have accomplished. Over the past 12 weeks, you have done some of the hardest work a person can do — you have faced your trauma and changed the beliefs that were keeping you stuck.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What You Have Learned</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">How PTSD works and why avoidance keeps it going</li><li style="margin-bottom: 6px;">The difference between thoughts and feelings</li><li style="margin-bottom: 6px;">How to identify stuck points — the beliefs that drive your pain</li><li style="margin-bottom: 6px;">How to challenge those stuck points using Socratic Questioning</li><li style="margin-bottom: 6px;">How to recognize problematic thinking patterns</li><li style="margin-bottom: 6px;">How to use the Challenging Beliefs Worksheet to develop balanced, realistic thoughts</li><li style="margin-bottom: 6px;">How trauma affects beliefs about safety, trust, power/control, esteem, and intimacy</li><li style="margin-bottom: 6px;">How to develop more balanced beliefs in each of these areas</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What Happens Now</strong>
CPT gives you skills for life. After this program:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">You may still have some PTSD symptoms, but they should be significantly reduced</li><li style="margin-bottom: 6px;">When stuck points come back — and they sometimes will — you have the tools to challenge them</li><li style="margin-bottom: 6px;">You know how to use the Challenging Beliefs Worksheet on your own</li><li style="margin-bottom: 6px;">You can identify problematic thinking patterns when they show up</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Continuing Your Recovery</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Keep using the Challenging Beliefs Worksheet whenever you notice stuck points</li><li style="margin-bottom: 6px;">If symptoms return or get worse, reach out to your therapist</li><li style="margin-bottom: 6px;">Continue the healthy habits you have built during treatment</li><li style="margin-bottom: 6px;">Be patient with yourself — recovery is not a straight line</li><li style="margin-bottom: 6px;">Celebrate the courage it took to do this work</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">A Note About Setbacks</strong>
Life will bring new stressors. Sometimes an anniversary, a news story, or a new loss will bring old symptoms back temporarily. This does not mean treatment failed. It means you are human. Use your CPT skills to work through it, and reach out for support if you need it.</p>`,
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
        type: "STYLED_CONTENT",
        title: "How Sleep Works",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Sleep is not just "shutting off" — it is an active process controlled by two systems in your brain. Understanding these systems is the first step to fixing your sleep.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">The Two-Process Model of Sleep</h3><p style="margin-bottom: 12px; line-height: 1.6;">1. <strong style="color: var(--steady-teal);">Sleep Drive (Process S)</strong>
Your sleep drive works like hunger. The longer you are awake, the stronger your urge to sleep becomes. This is caused by a chemical called adenosine that builds up in your brain during the day. The more adenosine you have, the sleepier you feel. When you sleep, your brain clears the adenosine, and the cycle starts over.</p><p style="margin-bottom: 12px; line-height: 1.6;">Caffeine works by blocking adenosine receptors — it does not reduce your need for sleep; it just masks it. That is why you crash when it wears off.</p><p style="margin-bottom: 12px; line-height: 1.6;">2. <strong style="color: var(--steady-teal);">Circadian Rhythm (Process C)</strong>
Your circadian rhythm is your internal 24-hour clock. It controls when you feel alert and when you feel sleepy, mostly through a hormone called melatonin. Your brain starts releasing melatonin about 2 hours before your natural bedtime when the light dims. Bright light (especially blue light from screens) stops melatonin production.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Sleep Architecture</strong>
A normal night of sleep includes 4-6 cycles, each lasting about 90 minutes. Each cycle includes:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Light sleep (stages 1-2): Your body relaxes, heart rate slows</li><li style="margin-bottom: 6px;">Deep sleep (stage 3): Physical restoration, immune function, memory consolidation</li><li style="margin-bottom: 6px;">REM sleep: Dreaming, emotional processing, learning</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">You get more deep sleep early in the night and more REM sleep later. This is why cutting sleep short robs you of dream sleep.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What Causes Chronic Insomnia</strong>
Most people experience short-term sleep problems after stress, illness, or a life change. For most, sleep returns to normal on its own. Chronic insomnia develops when the things you DO in response to poor sleep actually make the problem worse:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Going to bed early to "catch up" → weakens your sleep drive</li><li style="margin-bottom: 6px;">Staying in bed awake → your brain learns that bed = being awake</li><li style="margin-bottom: 6px;">Napping during the day → reduces your sleep drive at night</li><li style="margin-bottom: 6px;">Worrying about sleep → activates your stress system, which blocks sleep</li><li style="margin-bottom: 6px;">Spending more time in bed → spreads your sleep thin and makes it lighter</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">These are not character flaws — they are completely natural responses to losing sleep. But they create a cycle that keeps insomnia going long after the original cause is gone. CBT-I breaks this cycle.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Sleep Restriction: Building a Stronger Sleep Drive",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Sleep restriction is the single most effective technique in CBT-I. It sounds counterintuitive — you are going to spend LESS time in bed to sleep BETTER. Here is why it works.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Problem: Too Much Time in Bed</strong>
When you have insomnia, the natural response is to spend more time in bed — going to bed earlier, sleeping in later, lying in bed hoping sleep will come. But this actually makes insomnia worse because:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">It weakens your sleep drive (you are not building up enough adenosine)</li><li style="margin-bottom: 6px;">It trains your brain that bed = lying awake</li><li style="margin-bottom: 6px;">It spreads your sleep thin, making it lighter and more fragmented</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Imagine spreading a small amount of butter over a huge piece of bread — you get a thin, unsatisfying layer. Sleep restriction is like using a smaller piece of bread so the butter is thick and rich.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">How Sleep Restriction Works</h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Calculate your average total sleep time</strong> from your sleep diary. For example, if you spend 9 hours in bed but only sleep 6 hours, your average sleep time is about 6 hours.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Set your sleep window</strong> to match your average sleep time (minimum 5 hours — we never go below that). If you sleep 6 hours on average, your initial sleep window is 6 hours.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Choose a fixed wake time</strong> that works for your schedule and stick with it every day, including weekends. This is the anchor of your new sleep schedule.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Calculate your bedtime</strong> by counting back from your wake time. If your wake time is 6:30 AM and your sleep window is 6 hours, your bedtime is 12:30 AM.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Do not get into bed before your prescribed bedtime</strong>, even if you feel sleepy. Use that extra evening time to wind down, read, or do something quiet.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Get out of bed at your fixed wake time</strong> every day, no matter how you slept.</li></ol><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What to Expect</strong>
The first week is hard. You will be sleepy. This is intentional — you are building up sleep drive. Within 1-2 weeks, you will:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Fall asleep faster</li><li style="margin-bottom: 6px;">Sleep more deeply</li><li style="margin-bottom: 6px;">Wake up less during the night</li><li style="margin-bottom: 6px;">Spend a higher percentage of your bed time actually sleeping</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Adjusting Your Sleep Window</strong>
Once your sleep efficiency (time asleep / time in bed) reaches 85% or higher for 5 days, you can extend your sleep window by 15 minutes. We will adjust this together each session.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Important Safety Note</strong>
If you drive for a living or operate heavy machinery, tell your clinician — we may need to modify this approach. Sleepiness is expected in the first week, so be cautious about activities requiring alertness.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Stimulus Control: Bed = Sleep",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Your brain is an association machine. It links places, activities, and cues with certain states. If you have spent months or years lying in bed awake, worrying, watching TV, scrolling your phone, or trying to force sleep, your brain has learned: bed = being awake. Stimulus control reverses this by rebuilding the association: bed = sleep.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">The Rules of Stimulus Control</h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Use your bed only for sleep and sex.</strong> No reading, no screens, no eating, no worrying, no planning your day. Everything else happens outside the bed.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Only go to bed when you feel sleepy.</strong> Sleepy means your eyes are heavy and you are struggling to stay awake — not just tired or fatigued. There is a difference. Fatigue is feeling exhausted; sleepiness is the inability to stay awake.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">If you cannot fall asleep within about 20 minutes, get up.</strong> Go to another room and do something calm and boring in dim light — read a dull book, fold laundry, listen to quiet music. Return to bed only when you feel sleepy again. Do NOT watch the clock — estimate 20 minutes.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Repeat rule 3 as many times as necessary.</strong> Some nights, especially at first, you may get up several times. That is okay. Each time, you are teaching your brain that this bed is for sleeping.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Get up at the same time every morning.</strong> Your fixed wake time does not change regardless of how much you slept. This is critical for resetting your circadian rhythm.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Do not nap during the day.</strong> Napping reduces your sleep drive and makes it harder to fall asleep at night. If you absolutely must nap, keep it before 2 PM and under 20 minutes.</li></ol><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Why This Works</strong>
Every time you lie in bed awake, you strengthen the bed-wakefulness connection. Every time you get up when you cannot sleep, you weaken it. Every time you fall asleep quickly in bed, you strengthen the bed-sleep connection. Over days and weeks, this retraining becomes automatic.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Hardest Part</strong>
Getting out of a warm bed when you cannot sleep feels terrible. Your brain will argue: "Just stay, you might fall asleep soon." But lying there awake is exactly what caused the problem. Getting up is uncomfortable in the short term but transformative in the long term.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Changing Your Thoughts About Sleep",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">By now you may have noticed that much of your insomnia is driven by what you THINK about sleep, not just what you DO. Worrying about sleep is one of the biggest factors that keeps insomnia going.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Insomnia Worry Cycle</strong>
Here is how it works:
1. You have a bad night of sleep
2. You worry about the consequences ("I will not be able to function tomorrow")
3. The next night, you start worrying about whether you will sleep
4. The worry activates your stress response (cortisol, adrenaline)
5. The stress response blocks sleep
6. You do not sleep well, confirming your fears
7. The cycle repeats and gets stronger</p><p style="margin-bottom: 12px; line-height: 1.6;">Notice: it is the WORRY, not the sleep loss itself, that drives most of the cycle.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">Common Unhelpful Sleep Beliefs</h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Catastrophizing the consequences</strong>: "If I do not sleep tonight, I will not be able to function at all tomorrow." Reality: You have had bad nights before and still functioned. Not perfectly, but adequately.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Unrealistic expectations</strong>: "I need 8 hours of perfect, unbroken sleep." Reality: Waking briefly during the night is normal. Sleep quality matters more than quantity.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Helplessness</strong>: "There is nothing I can do about my insomnia." Reality: You are doing something right now — CBT-I has a 70-80% success rate.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Clock watching</strong>: "It is 2 AM and I am still awake — I have only 4 hours left." Reality: Checking the clock adds pressure and activates your alarm system.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Performance anxiety</strong>: "I have to fall asleep NOW." Reality: Sleep cannot be forced. The trying is what prevents it.</li></ol><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">How to Challenge Sleep Thoughts</strong>
When you notice a worry about sleep, ask:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">What is the evidence that this thought is true?</li><li style="margin-bottom: 6px;">What is the evidence against it?</li><li style="margin-bottom: 6px;">What is the most realistic outcome (not the worst case)?</li><li style="margin-bottom: 6px;">Have I managed before after a bad night? What happened?</li><li style="margin-bottom: 6px;">Is this thought helping me or making things worse?</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Then replace the unhelpful thought with a more balanced one. Not positive — balanced. "I might not sleep great tonight, but I have handled that before and I will get through tomorrow" is more helpful than "I will definitely sleep perfectly tonight."</p>`,
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
        type: "STYLED_CONTENT",
        title: "Relaxation Techniques and Sleep Hygiene",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Relaxation is not about forcing yourself to relax — that is a contradiction. It is about giving your body the signals that it is safe to wind down. Combined with good sleep hygiene practices, these techniques create the optimal conditions for sleep.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Progressive Muscle Relaxation (PMR)</strong>
PMR involves tensing and then releasing different muscle groups. This works because:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Physical tension signals danger to your brain. Releasing tension signals safety.</li><li style="margin-bottom: 6px;">It gives your mind something to focus on instead of worries.</li><li style="margin-bottom: 6px;">It activates the parasympathetic nervous system (your body's "rest and digest" mode).</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">How to do it:
1. Start with your feet. Tense the muscles for 5 seconds. Release for 10 seconds. Notice the difference.
2. Move to your calves, thighs, abdomen, chest, hands, arms, shoulders, neck, and face.
3. After finishing, lie still and notice the sensation of relaxation throughout your body.
4. Practice daily for 15-20 minutes, ideally NOT in bed (remember — bed is for sleep only). Practice in your chair or on the couch.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Diaphragmatic Breathing (Belly Breathing)</strong>
1. Place one hand on your chest and one on your belly.
2. Breathe in slowly through your nose for 4 seconds — your belly should rise, not your chest.
3. Hold for 1-2 seconds.
4. Exhale slowly through your mouth for 6 seconds.
5. Repeat for 5-10 minutes.</p><p style="margin-bottom: 12px; line-height: 1.6;">The key is making your exhale longer than your inhale. This directly activates your parasympathetic nervous system.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Sleep Hygiene Essentials</strong>
Sleep hygiene alone does not cure insomnia, but poor sleep hygiene makes everything harder:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Light</strong>: Dim lights 1-2 hours before bed. Avoid screens or use blue-light filters. Get bright light exposure within 30 minutes of waking.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Temperature</strong>: Keep your bedroom cool (65-68 degrees F / 18-20 degrees C). Your body needs to cool down to fall asleep.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Caffeine</strong>: Stop caffeine at least 8 hours before bed. For some people, even 10-12 hours. Remember that caffeine is in tea, chocolate, and some medications.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Alcohol</strong>: Avoid alcohol within 3 hours of bed. It fragments sleep and suppresses REM.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Exercise</strong>: Regular exercise improves sleep, but finish vigorous exercise at least 3-4 hours before bed. Gentle stretching or yoga in the evening is fine.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Evening routine</strong>: Create a consistent 30-60 minute wind-down routine. Same activities, same order, same time. This signals to your brain that sleep is coming.</li></ul>`,
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
        type: "STYLED_CONTENT",
        title: "Keeping Your Sleep on Track",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Congratulations — you have completed CBT-I. Over the past 6 weeks, you have made real changes to how your brain approaches sleep. Let us review what you have learned and build a plan for keeping your sleep healthy for life.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What You Have Learned</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">How the two-process model of sleep works (sleep drive + circadian rhythm)</li><li style="margin-bottom: 6px;">Sleep restriction: matching time in bed to actual sleep time</li><li style="margin-bottom: 6px;">Stimulus control: bed = sleep, and getting up when you cannot sleep</li><li style="margin-bottom: 6px;">Cognitive restructuring: identifying and challenging anxious thoughts about sleep</li><li style="margin-bottom: 6px;">Relaxation techniques: PMR, diaphragmatic breathing, body scan</li><li style="margin-bottom: 6px;">Sleep hygiene: optimizing your habits and environment</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Continuing Your Sleep Schedule</strong>
Your current sleep window is working well. Here is how to maintain and gradually expand it:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Keep your fixed wake time every day, including weekends</li><li style="margin-bottom: 6px;">Extend your sleep window by 15 minutes at a time when sleep efficiency stays above 85% for a full week</li><li style="margin-bottom: 6px;">Most people reach their natural sleep need within a few more weeks of gradual extension</li><li style="margin-bottom: 6px;">If sleep quality drops, tighten the window back by 15 minutes</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What to Do If Insomnia Returns</strong>
Insomnia can come back during times of stress, illness, travel, or life changes. This is normal. Here is your action plan:</p><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">First 1-2 bad nights</strong>: Do nothing different. Bad nights happen. Do not compensate (no napping, no going to bed early, no sleeping in).</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">3-5 bad nights</strong>: Restart stimulus control rules strictly. Get out of bed if you cannot sleep. Check your sleep hygiene.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">1 week or more</strong>: Restart a mild sleep restriction. Tighten your sleep window by 30-60 minutes. Use your thought records to challenge sleep worries.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">2 weeks or more</strong>: Contact your clinician for a booster session.</li></ol><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The most important thing is to not let old habits creep back.</strong> The behaviors that "help" in the short term (staying in bed, napping, going to bed early) are exactly what caused chronic insomnia in the first place. Trust the process — it worked before and it will work again.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Relapse Is a Process, Not an Event",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Most people think of relapse as the moment they pick up a drink or use a substance. But relapse actually begins long before that moment. Understanding relapse as a process gives you many chances to intervene before use ever happens.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">The Three Stages of Relapse</h3><p style="margin-bottom: 8px; line-height: 1.6;">1. <strong style="color: var(--steady-teal);">Emotional Relapse</strong>
You are not thinking about using, but your emotions and behaviors are setting you up for it. Warning signs include:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Bottling up emotions instead of talking about them</li><li style="margin-bottom: 6px;">Isolating from people who support your recovery</li><li style="margin-bottom: 6px;">Not going to meetings, therapy, or other support</li><li style="margin-bottom: 6px;">Poor self-care: not eating well, not sleeping, not exercising</li><li style="margin-bottom: 6px;">Increased anxiety, irritability, or anger</li></ul><p style="margin-bottom: 8px; line-height: 1.6;">2. <strong style="color: var(--steady-teal);">Mental Relapse</strong>
Part of you wants to use and part of you does not. There is a war in your mind. Warning signs include:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Thinking about people, places, and things associated with use</li><li style="margin-bottom: 6px;">Minimizing the consequences of past use ("It was not that bad")</li><li style="margin-bottom: 6px;">Bargaining ("Maybe I could just use once" or "I could switch to something less harmful")</li><li style="margin-bottom: 6px;">Planning a relapse — figuring out how you could use without getting caught</li><li style="margin-bottom: 6px;">Romanticizing past use — remembering the good times and forgetting the bad</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">3. <strong style="color: var(--steady-teal);">Physical Relapse</strong>
Actual use of the substance. By this point, the emotional and mental stages have already happened.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Why This Matters</strong>
If you only watch for physical relapse, you catch it too late. This program teaches you to spot emotional and mental relapse early — when it is much easier to get back on track.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Relapse Prevention Model</strong>
Relapse prevention is based on a simple idea: recovery is a skill, and like any skill, it can be learned, practiced, and strengthened. You will learn to:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Identify your personal high-risk situations</li><li style="margin-bottom: 6px;">Build coping skills for each type of risk</li><li style="margin-bottom: 6px;">Develop a balanced lifestyle that supports recovery</li><li style="margin-bottom: 6px;">Handle lapses without letting them become full relapse</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">A Lapse Is Not a Relapse</strong>
If you do use, it does not mean you have failed. A lapse (a single use) becomes a relapse (a return to old patterns) only if you give up. The most important thing after a lapse is what you do next.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Mapping Your High-Risk Situations",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">A high-risk situation is any situation that threatens your sense of control and increases the likelihood of use. Research shows that most relapses happen in predictable situations. By identifying yours, you can prepare for them in advance.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">The Three Main Categories of High-Risk Situations</h3><p style="margin-bottom: 8px; line-height: 1.6;">1. <strong style="color: var(--steady-teal);">Negative Emotional States (35% of relapses)</strong>
This is the single biggest trigger category. It includes:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Anger, frustration, resentment</li><li style="margin-bottom: 6px;">Anxiety, worry, fear</li><li style="margin-bottom: 6px;">Sadness, depression, loneliness</li><li style="margin-bottom: 6px;">Boredom, emptiness</li><li style="margin-bottom: 6px;">Shame, guilt</li><li style="margin-bottom: 6px;">Stress, feeling overwhelmed</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">When you used substances to manage emotions, your brain learned that the substance is a solution. In recovery, you need to teach it new solutions.</p><p style="margin-bottom: 8px; line-height: 1.6;">2. <strong style="color: var(--steady-teal);">Social Pressure (20% of relapses)</strong>
This includes:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Direct pressure: someone offering you a substance or encouraging you to use</li><li style="margin-bottom: 6px;">Indirect pressure: being around people who are using, feeling left out, wanting to fit in</li><li style="margin-bottom: 6px;">Celebrations, parties, holidays</li><li style="margin-bottom: 6px;">Conflict with others (arguments, criticism, rejection)</li></ul><p style="margin-bottom: 8px; line-height: 1.6;">3. <strong style="color: var(--steady-teal);">Other Situations (45% of relapses)</strong>
This includes:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Physical discomfort or pain</li><li style="margin-bottom: 6px;">Positive emotions ("things are going so well, I deserve a reward")</li><li style="margin-bottom: 6px;">Cravings triggered by cues (driving past a bar, seeing a commercial, smelling alcohol)</li><li style="margin-bottom: 6px;">Testing personal control ("I bet I could have just one")</li><li style="margin-bottom: 6px;">Certain times of day or days of the week associated with use</li><li style="margin-bottom: 6px;">Having money in your pocket</li><li style="margin-bottom: 6px;">Being alone with nothing to do</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Creating Your Risk Map</strong>
For each high-risk situation, you need to know:
1. What is the situation?
2. How strong is the risk (low / medium / high)?
3. Can I avoid this situation?
4. If I cannot avoid it, what is my coping plan?</p><p style="margin-bottom: 12px; line-height: 1.6;">You do not need to avoid every situation forever — but in early recovery, avoidance is a legitimate strategy. As your skills grow, you can gradually face more situations with confidence.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Understanding and Managing Cravings",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Cravings are one of the biggest challenges in recovery. The good news is that cravings are temporary, predictable, and manageable. Every craving you survive without using makes the next one weaker.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What Is a Craving?</strong>
A craving is an intense desire to use a substance. It can include:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Strong urges or impulses to use</li><li style="margin-bottom: 6px;">Physical sensations: tightness in the chest, dry mouth, restlessness, stomach knots</li><li style="margin-bottom: 6px;">Thoughts about using: "I need it," "Just one," "I cannot stand this"</li><li style="margin-bottom: 6px;">Memories of using: the taste, the feeling, the ritual</li><li style="margin-bottom: 6px;">Emotional states: agitation, anxiety, excitement</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Craving Wave</strong>
Cravings follow a wave pattern. They build, peak, and then subside — typically within 15-30 minutes. No craving lasts forever. If you do not feed it, it will pass.</p><p style="margin-bottom: 12px; line-height: 1.6;">Think of it like a wave in the ocean. You can try to fight the wave (which exhausts you) or you can surf it — ride it up, over the peak, and down the other side.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What Triggers Cravings?</strong>
Cravings are triggered by cues that your brain has associated with use:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">External cues</strong>: Seeing a bar, finding old paraphernalia, being in a place where you used, seeing other people drink or use, commercials, movies</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Internal cues</strong>: Certain emotions (stress, excitement, boredom), physical states (pain, fatigue), thoughts ("I deserve this"), time of day</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Every time you experienced the substance after a cue, the connection between that cue and the craving got stronger. In recovery, by not using after the cue, you weaken that connection over time. This is called extinction.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">Craving Coping Skills</h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Urge Surfing</strong>: Notice the craving without acting on it. Observe it like a scientist. Where do you feel it in your body? How intense is it on a 0-10 scale? Watch it rise, peak, and fall. You are the observer, not the craving.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Delay</strong>: Tell yourself: "I will wait 30 minutes before I decide." During that 30 minutes, do something else. Most cravings pass within this time.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Distract</strong>: Engage in an activity that requires attention — call someone, go for a walk, do a puzzle, take a shower, clean something, play a game.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Dispute</strong>: Challenge the thoughts fueling the craving. "I need it" → "I want it, but I do not need it." "I cannot stand this" → "This is uncomfortable but I have survived every craving so far."</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Escape</strong>: If you are in a high-risk situation, leave. You can always explain later. Your recovery comes first.</li></ol>`,
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
        type: "STYLED_CONTENT",
        title: "Thoughts That Lead to Use",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Your thoughts play a huge role in whether you use or stay in recovery. The way you interpret situations — what you tell yourself about what happens — can either protect your recovery or put it at risk.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Permission-Giving Thoughts</strong>
These are the sneaky thoughts your brain uses to make using seem okay:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">"I deserve a break" (entitlement)</li><li style="margin-bottom: 6px;">"Just this once" (minimizing)</li><li style="margin-bottom: 6px;">"No one will know" (secrecy)</li><li style="margin-bottom: 6px;">"I have been so good, one time will not hurt" (rewarding)</li><li style="margin-bottom: 6px;">"Things are going well, I can handle it now" (overconfidence)</li><li style="margin-bottom: 6px;">"Things are terrible, what is the point?" (giving up)</li><li style="margin-bottom: 6px;">"Everyone else drinks — I am the weird one" (normalizing)</li><li style="margin-bottom: 6px;">"I will start fresh tomorrow / Monday / next month" (procrastination)</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">These thoughts feel logical in the moment, but they are traps. Learning to recognize them instantly is one of the most powerful skills in recovery.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Apparently Irrelevant Decisions (AIDs)</strong>
These are small decisions that seem harmless but move you closer to use:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Driving past the liquor store instead of taking a different route</li><li style="margin-bottom: 6px;">Keeping alcohol in the house "for guests"</li><li style="margin-bottom: 6px;">Going to a party where people will be drinking "just to be social"</li><li style="margin-bottom: 6px;">Reconnecting with a friend who still uses "because we go way back"</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Each decision alone seems innocent. Together, they create a path straight to relapse. Awareness of these decisions is key.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Challenging Unhelpful Thoughts</strong>
When you catch a permission-giving thought:
1. Name it: "That is a permission-giving thought."
2. Challenge it: "What would actually happen if I used? Play the tape forward."
3. Replace it: "I do not need to use to cope. I have other tools. I have come too far to go back."
4. Act: Do something that supports recovery — call someone, go to a meeting, use a coping skill.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Emotions and Recovery",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">For many people, substances served as emotional management tools. Alcohol numbed anxiety. Stimulants powered through depression. Opioids soothed emotional pain. In recovery, you need new ways to handle the emotions that substances used to manage.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Why Emotions Feel Bigger in Recovery</strong>
During active use, substances dulled your emotions. In early recovery, emotions can feel overwhelming — like someone turned the volume to maximum. This is normal. Your brain is recalibrating. It does not mean something is wrong; it means your nervous system is healing.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Emotion-Use Cycle</strong>
1. You feel a difficult emotion (stress, anger, sadness, boredom)
2. The feeling is uncomfortable
3. Your brain remembers that the substance made the feeling go away (quickly)
4. You crave the substance
5. You use
6. The emotion temporarily decreases
7. The emotion comes back — often worse — plus guilt and shame
8. Repeat</p><p style="margin-bottom: 12px; line-height: 1.6;">Breaking this cycle requires inserting new coping skills at step 3 — after the feeling but before the craving takes over.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">Healthy Emotion Management Skills</h3><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Grounding (for overwhelming emotions)</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">5-4-3-2-1: Name 5 things you see, 4 you hear, 3 you can touch, 2 you smell, 1 you taste</li><li style="margin-bottom: 6px;">Cold water on your face or wrists</li><li style="margin-bottom: 6px;">Describe your surroundings out loud in detail</li><li style="margin-bottom: 6px;">Press your feet firmly into the floor and notice the sensation</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Processing (for persistent emotions)</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Talk to someone you trust about how you feel</li><li style="margin-bottom: 6px;">Write about the emotion in your journal — describe it, name it, explore where it comes from</li><li style="margin-bottom: 6px;">Move your body — emotions are physical; moving helps release them</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Sitting With (for unavoidable emotions)</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Not every emotion needs to be fixed or made to go away</li><li style="margin-bottom: 6px;">Sometimes the healthiest response is to feel the feeling, know that it will pass, and not run from it</li><li style="margin-bottom: 6px;">Practice tolerating discomfort in small doses — this builds your capacity over time</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Self-Soothing (for distress)</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Do something kind for yourself: a warm bath, favorite music, a walk in nature, a good meal</li><li style="margin-bottom: 6px;">Call on your five senses: light a candle, wrap in a soft blanket, sip hot tea</li><li style="margin-bottom: 6px;">Remind yourself: "This feeling is temporary. I do not have to escape it. I can handle this."</li></ul>`,
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
        type: "STYLED_CONTENT",
        title: "Navigating Social Pressure",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Relationships and social situations are some of the trickiest parts of recovery. The people around you can be your greatest source of support — or your biggest risk factor. This module helps you navigate both.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">Types of Social Pressure</h3><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Direct Pressure</strong>: Someone offers you a substance, insists you drink, or questions your decision not to use. This is the easiest type to recognize but can be hard to resist, especially from close friends or family.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Indirect Pressure</strong>: Being around people who are using, feeling like you do not fit in, watching others enjoy substances at a party, or experiencing the social rituals you used to participate in (happy hour, passing a joint, toasting with champagne).</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Internal Pressure</strong>: Feeling like you "should" be able to drink like a normal person, comparing yourself to others, or believing that recovery makes you different or less fun.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">How to Handle Pressure</h3><p style="margin-bottom: 12px; line-height: 1.6;">1. <strong style="color: var(--steady-teal);">Have your response ready BEFORE you need it.</strong> Plan exactly what you will say when someone offers. Keep it simple:
   - "No thanks, I am not drinking."
   - "I am good with water."
   - "I am driving."
   - You do not owe anyone an explanation.</p><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Bring your own drink.</strong> Having a non-alcoholic beverage in your hand prevents offers and makes you feel less conspicuous.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Have an exit plan.</strong> Before any social event, know how you will leave if you need to. Drive yourself. Tell a trusted friend you might need to go early.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Know your limits.</strong> In early recovery, it is okay to skip events where substances will be central. You are not missing out — you are protecting your recovery.</li></ol><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Evaluating Your Relationships</strong>
Some relationships support recovery. Others threaten it. Ask honestly about each person in your life:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Does this person respect my recovery?</li><li style="margin-bottom: 6px;">Do I use or want to use when I am around them?</li><li style="margin-bottom: 6px;">Does this person encourage healthy behaviors?</li><li style="margin-bottom: 6px;">Can I be honest with this person about my struggles?</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">You may need to distance yourself from some relationships, at least temporarily. This is not selfish — it is survival.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Why Lifestyle Balance Matters",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">One of the biggest threats to long-term recovery is a life that feels empty, boring, or like nothing but obligations. If your daily life is all "should" and no "want," your brain will eventually look for relief — and it knows exactly where to find it.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Should-Want Balance</strong>
Marlatt and Gordon, who developed the relapse prevention model, identified an imbalance between "shoulds" (obligations, responsibilities, things you have to do) and "wants" (pleasures, hobbies, things you enjoy) as a major relapse risk factor.</p><p style="margin-bottom: 8px; line-height: 1.6;">When your life is all shoulds:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">You feel resentful, trapped, and exhausted</li><li style="margin-bottom: 6px;">You develop a sense of entitlement: "I deserve a reward" (and the substance was your reward)</li><li style="margin-bottom: 6px;">You have no positive experiences to offset the daily grind</li><li style="margin-bottom: 6px;">Recovery feels like one more should — one more deprivation</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Building Positive Activities Into Your Life</strong>
Recovery is not just about removing the substance — it is about building a life you do not need to escape from. Ask yourself:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">What did I enjoy before substance use took over?</li><li style="margin-bottom: 6px;">What have I always wanted to try?</li><li style="margin-bottom: 6px;">What activities give me a sense of accomplishment?</li><li style="margin-bottom: 6px;">What activities help me feel connected to others?</li><li style="margin-bottom: 6px;">What brings me physical pleasure (exercise, nature, food, music)?</li></ul><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">The Four Pillars of a Balanced Recovery Lifestyle</h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Physical Health</strong>: Regular exercise (even walking counts), balanced meals, adequate sleep, medical checkups. Your body has been through a lot. Taking care of it is not optional.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Social Connection</strong>: Healthy relationships, community involvement, support groups, volunteering. Humans are social creatures. Isolation is dangerous in recovery.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Meaningful Activity</strong>: Work, education, creativity, hobbies, goals. Having something to work toward gives you a reason to stay sober beyond "not using."</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Rest and Pleasure</strong>: Downtime, fun, relaxation, play. These are not luxuries — they are necessities. Without them, burnout leads to relapse.</li></ol><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Practical Tip</strong>
Schedule at least one enjoyable activity every day. It does not have to be big — a 15-minute walk, a favorite meal, a phone call with a friend, 20 minutes with a hobby. The key is consistency.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Solving Problems Without Substances",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Life does not stop throwing problems at you just because you are in recovery. Financial stress, relationship conflicts, work issues, health problems — these all keep coming. The difference now is that you need to face them without the substance that used to be your default escape.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Problem-Solving Process</strong>
When problems feel overwhelming, a structured approach helps. Follow these steps:</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Step 1: Define the Problem Clearly</strong>
Vague problems feel unsolvable. "Everything is falling apart" is not a problem — it is a feeling. Get specific: "I am behind on rent by $400 and it is due in two weeks." Specific problems have specific solutions.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Step 2: Brainstorm Solutions</strong>
Write down every possible solution without judging any of them. Include bad ideas, creative ideas, and obvious ideas. The goal is quantity, not quality. Often the best solution comes from combining several ideas.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Step 3: Evaluate Each Option</strong>
For each solution, ask:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">What are the pros and cons?</li><li style="margin-bottom: 6px;">Is this realistic?</li><li style="margin-bottom: 6px;">Does this align with my recovery?</li><li style="margin-bottom: 6px;">What are the short-term and long-term consequences?</li></ul><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Step 4: Choose the Best Option</strong>
Pick the solution (or combination) that has the most benefits and fewest drawbacks. It does not have to be perfect — good enough is good enough.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Step 5: Make a Plan and Act</strong>
Break the solution into small, specific steps with deadlines. Take the first step today. Action creates momentum.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Step 6: Review the Result</strong>
Did it work? If yes, great. If not, go back to step 2 and try a different approach. Solving problems is a process, not a one-shot attempt.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Common Traps</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Analysis paralysis</strong>: Overthinking instead of acting. Remember: a good plan today is better than a perfect plan next month.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Avoidance</strong>: Ignoring the problem and hoping it goes away. It rarely does — and the stress of avoidance often triggers cravings.</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Catastrophizing</strong>: Assuming the worst outcome is certain. Check: what is the MOST LIKELY outcome, not the worst possible one?</li></ul>`,
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
        type: "STYLED_CONTENT",
        title: "Anger and Recovery",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Anger is one of the emotions most closely linked to relapse. Many people in recovery struggle with anger — either expressing too much of it or stuffing it down until it explodes. Neither approach serves you well.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Why Anger Is So Risky in Recovery</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Anger creates intense physical arousal (racing heart, muscle tension, adrenaline) that your brain can mistake for a craving</li><li style="margin-bottom: 6px;">Anger gives permission: "After what they did to me, I have every right to use"</li><li style="margin-bottom: 6px;">Suppressed anger builds resentment, which is one of the biggest relapse triggers</li><li style="margin-bottom: 6px;">Anger often damages relationships — and damaged relationships trigger more anger and isolation</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Understanding Your Anger</strong>
Anger is often a secondary emotion — meaning it covers up another feeling underneath. Common emotions that hide under anger:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Hurt ("They disrespected me" → "I feel hurt that they do not value me")</li><li style="margin-bottom: 6px;">Fear ("They are threatening my safety / stability / relationship")</li><li style="margin-bottom: 6px;">Shame ("They saw something about me I did not want them to see")</li><li style="margin-bottom: 6px;">Helplessness ("I cannot control this situation")</li></ul><p style="margin-bottom: 12px; line-height: 1.6;">Recognizing the primary emotion underneath anger gives you more options for responding.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Anger Escalation Ladder</strong>
Anger does not go from 0 to 100 instantly — it escalates through stages:
1. <strong style="color: var(--steady-teal);">Irritation</strong> — mild annoyance, easily managed
2. <strong style="color: var(--steady-teal);">Frustration</strong> — growing impatience, harder to ignore
3. <strong style="color: var(--steady-teal);">Anger</strong> — strong emotion, physiological arousal, urge to act
4. <strong style="color: var(--steady-teal);">Rage</strong> — loss of rational thinking, saying or doing things you regret</p><p style="margin-bottom: 12px; line-height: 1.6;">The key is to intervene at stages 1 or 2, before you reach 3 or 4.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">Anger Management Skills</h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Recognize your warning signs</strong>: What does anger feel like in your body BEFORE you lose control? Jaw clenching? Fists tightening? Heart racing? Hot face? These are your early warning signals.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Take a time-out</strong>: When you feel the warning signs, step away. Say: "I need a few minutes. I will come back when I am calmer." Walk away, breathe, cool down. This is not weakness — it is strategy.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Use the STOP technique</strong>: Stop (do not react), Take a breath, Observe (what am I feeling? what is actually happening?), Proceed (choose a response instead of reacting).</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Express anger assertively, not aggressively</strong>: Assertive — "I feel frustrated when plans change at the last minute. I need more notice." Aggressive — "You always do this! You do not care about anyone but yourself!" The difference: assertive describes YOUR feeling. Aggressive attacks the other person.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Physical release</strong>: When anger energy is high, discharge it safely: walk briskly, do push-ups, squeeze a stress ball, punch a pillow. The adrenaline needs somewhere to go.</li></ol>`,
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
        type: "STYLED_CONTENT",
        title: "Lapse vs. Relapse: The Abstinence Violation Effect",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">A lapse is a single episode of substance use after a period of abstinence. A relapse is a return to the old pattern of regular use. A lapse does NOT have to become a relapse. The difference is what you do next.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">The Abstinence Violation Effect (AVE)</strong>
This is the most dangerous moment in recovery. The AVE is what happens in your mind after a lapse:</p><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Guilt and shame</strong>: "I used. I am a failure. I am weak. I am hopeless."</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">All-or-nothing thinking</strong>: "I already ruined my sobriety, so it does not matter anymore. I might as well keep using."</li><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Attribution to self</strong>: "This proves I cannot do this. I am an addict and I always will be."</li></ol><p style="margin-bottom: 12px; line-height: 1.6;">This thinking pattern turns a single slip into a full relapse. The lapse itself is a problem, but the AVE is what makes it catastrophic.</p><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Reframing a Lapse</strong>
A more helpful way to think about a lapse:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">It is information, not proof of failure</li><li style="margin-bottom: 6px;">It tells you something about your coping skills, your triggers, or your support system that needs attention</li><li style="margin-bottom: 6px;">Recovery is not ruined — every day of sobriety still counts</li><li style="margin-bottom: 6px;">The question is not "why did I use?" but "what will I do NOW?"</li></ul><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">Your Lapse Response Plan</h3><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Stop using immediately.</strong> One use does not have to become two. Put the substance down, pour it out, leave the situation.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Tell someone.</strong> Call your sponsor, therapist, or a trusted friend within 24 hours. Secrecy fuels relapse. Saying it out loud breaks the cycle.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Get safe.</strong> Remove yourself from the high-risk situation. Go home, go to a meeting, go to a safe person's house.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Analyze what happened.</strong> Once you are safe and sober, examine the chain of events. What was the trigger? Where did the process start? What coping skill could have helped? This is learning, not self-punishment.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Recommit and adjust.</strong> Reaffirm your commitment to recovery. Adjust your plan based on what you learned. Maybe you need more support, a schedule change, or a new coping strategy.</li></ol><ol style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;"><strong style="color: var(--steady-teal);">Forgive yourself.</strong> This is not permission to use again. It is permission to be human, learn from it, and keep going.</li></ol><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Important</strong>
If you have a lapse, safety comes first. If you have been abstinent for a while and use the same amount you used to, your tolerance is lower. This is a medical risk, especially with opioids and alcohol. Use with caution and tell someone.</p>`,
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
        type: "STYLED_CONTENT",
        title: "Recovery Does Not Happen Alone",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Research consistently shows that social support is one of the strongest predictors of long-term recovery. People who have a solid recovery network are significantly less likely to relapse. This is not about having lots of friends — it is about having the RIGHT connections.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">The Layers of Your Support Network</h3><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Layer 1 — Inner Circle (2-3 people)</strong>
These are the people you call at 2 AM when a craving hits. They know your story, they understand recovery, and they will answer the phone. This might be a sponsor, a recovery mentor, a therapist, or a very close friend.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Layer 2 — Recovery Community (5-10 people)</strong>
People who share your recovery journey — members of support groups, sober friends, people in your treatment program. You see them regularly and they understand what you are going through without you having to explain.</p><p style="margin-bottom: 12px; line-height: 1.6;"><strong style="color: var(--steady-teal);">Layer 3 — General Support (10-20 people)</strong>
Friends, family members, coworkers, and community members who know about your recovery and support it, even if they do not fully understand it. They provide normal social connection and a sense of belonging.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">Building Each Layer</h3><p style="margin-bottom: 8px; line-height: 1.6;">For your Inner Circle:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Be intentional about who you put here — these relationships require trust and availability</li><li style="margin-bottom: 6px;">Ask directly: "Would you be willing to be someone I call when things get hard?"</li><li style="margin-bottom: 6px;">Maintain these relationships even when things are going well — do not just call in crisis</li></ul><p style="margin-bottom: 8px; line-height: 1.6;">For your Recovery Community:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Attend support groups regularly (AA, NA, SMART Recovery, Refuge Recovery, or others)</li><li style="margin-bottom: 6px;">Volunteer in recovery settings</li><li style="margin-bottom: 6px;">Be a resource for someone newer to recovery — helping others strengthens your own commitment</li></ul><p style="margin-bottom: 8px; line-height: 1.6;">For General Support:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Engage in community activities: sports leagues, classes, volunteer work, faith communities</li><li style="margin-bottom: 6px;">Be open about your recovery with safe people — hiding it is exhausting</li><li style="margin-bottom: 6px;">Invest in relationships that are not centered on substances</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What to Do When You Feel Alone</strong>
Everyone in recovery feels alone sometimes. When it hits:</p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Go to a meeting or support group — you do not have to talk; just show up</li><li style="margin-bottom: 6px;">Call someone from your list — even if you do not feel like it</li><li style="margin-bottom: 6px;">Go somewhere with people: a library, a coffee shop, a park</li><li style="margin-bottom: 6px;">Remember: the feeling of loneliness is temporary. Isolation makes it worse. Connection makes it better.</li></ul>`,
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
        type: "STYLED_CONTENT",
        title: "Building Your Personal Plan",
        content: {
          type: "STYLED_CONTENT",
          rawContent: "",
          styledHtml: `<p style="margin-bottom: 12px; line-height: 1.6;">Over the past 12 weeks, you have built an impressive toolkit for recovery. This final session brings everything together into a single plan you can reference anytime. Your relapse prevention plan is a living document — update it as you learn more about yourself and your recovery.</p><h3 style="color: var(--steady-warm-500); margin-top: 16px; margin-bottom: 8px;">Your Plan Should Include:</h3><p style="margin-bottom: 8px; line-height: 1.6;">1. <strong style="color: var(--steady-teal);">My Personal Warning Signs</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Emotional relapse signs (feelings and behaviors)</li><li style="margin-bottom: 6px;">Mental relapse signs (thoughts and desires)</li><li style="margin-bottom: 6px;">What other people have told me they notice when I am struggling</li></ul><p style="margin-bottom: 8px; line-height: 1.6;">2. <strong style="color: var(--steady-teal);">My High-Risk Situations</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">My top 5 triggers</li><li style="margin-bottom: 6px;">The emotions most likely to lead to use</li><li style="margin-bottom: 6px;">The people, places, and situations I need to avoid or manage carefully</li></ul><p style="margin-bottom: 8px; line-height: 1.6;">3. <strong style="color: var(--steady-teal);">My Coping Skills</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">For cravings: what works for me (urge surfing, delay, distract, dispute, escape)</li><li style="margin-bottom: 6px;">For negative emotions: grounding, processing, sitting with, self-soothing</li><li style="margin-bottom: 6px;">For social pressure: my refusal strategy, my exit plan</li><li style="margin-bottom: 6px;">For anger: STOP technique, time-outs, I-statements</li><li style="margin-bottom: 6px;">For problems: the 6-step problem-solving process</li></ul><p style="margin-bottom: 8px; line-height: 1.6;">4. <strong style="color: var(--steady-teal);">My Support Network</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Inner circle (names and numbers)</li><li style="margin-bottom: 6px;">Recovery community (groups, meetings, people)</li><li style="margin-bottom: 6px;">General support (friends, family, community)</li></ul><p style="margin-bottom: 8px; line-height: 1.6;">5. <strong style="color: var(--steady-teal);">My Lapse Response Plan</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Stop using immediately</li><li style="margin-bottom: 6px;">Call: [name] [number]</li><li style="margin-bottom: 6px;">Go to: [safe place]</li><li style="margin-bottom: 6px;">Analyze what happened</li><li style="margin-bottom: 6px;">Recommit and adjust</li><li style="margin-bottom: 6px;">Forgive myself</li></ul><p style="margin-bottom: 8px; line-height: 1.6;">6. <strong style="color: var(--steady-teal);">My Balanced Lifestyle</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Physical health habits I will maintain</li><li style="margin-bottom: 6px;">Social connections I will nurture</li><li style="margin-bottom: 6px;">Meaningful activities I will continue</li><li style="margin-bottom: 6px;">Pleasure and rest I will protect</li></ul><p style="margin-bottom: 8px; line-height: 1.6;">7. <strong style="color: var(--steady-teal);">My Motivation</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Why I chose recovery</li><li style="margin-bottom: 6px;">What I have gained since getting sober</li><li style="margin-bottom: 6px;">What I would lose if I went back</li><li style="margin-bottom: 6px;">Who I am doing this for (including myself)</li></ul><p style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: var(--steady-teal);">What Happens Now</strong></p><ul style="margin: 8px 0; padding-left: 20px;"><li style="margin-bottom: 6px;">Review your plan weekly for the first month, then monthly</li><li style="margin-bottom: 6px;">Update it as your life changes</li><li style="margin-bottom: 6px;">Share it with your support people</li><li style="margin-bottom: 6px;">If you feel yourself slipping, re-read it immediately</li><li style="margin-bottom: 6px;">If you need more support, reach out to your clinician — booster sessions are always available</li></ul>`,
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
