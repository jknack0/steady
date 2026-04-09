// ── Feelings Wheel Taxonomy (Willcox 7-core) ────────

export interface EmotionTertiary {
  id: string;
  label: string;
}

export interface EmotionSecondary {
  id: string;
  label: string;
  children: EmotionTertiary[];
}

export interface EmotionCategory {
  id: string;
  label: string;
  color: string;
  children: EmotionSecondary[];
}

export interface Emotion {
  id: string;
  label: string;
  color: string;
  primaryId: string;
}

export const FEELINGS_WHEEL: EmotionCategory[] = [
  {
    id: "happy",
    label: "Happy",
    color: "#8FAE8B",
    children: [
      {
        id: "happy.playful",
        label: "Playful",
        children: [
          { id: "happy.playful.aroused", label: "Aroused" },
          { id: "happy.playful.cheeky", label: "Cheeky" },
        ],
      },
      {
        id: "happy.content",
        label: "Content",
        children: [
          { id: "happy.content.free", label: "Free" },
          { id: "happy.content.joyful", label: "Joyful" },
        ],
      },
      {
        id: "happy.interested",
        label: "Interested",
        children: [
          { id: "happy.interested.curious", label: "Curious" },
          { id: "happy.interested.inquisitive", label: "Inquisitive" },
        ],
      },
      {
        id: "happy.proud",
        label: "Proud",
        children: [
          { id: "happy.proud.successful", label: "Successful" },
          { id: "happy.proud.confident", label: "Confident" },
        ],
      },
      {
        id: "happy.accepted",
        label: "Accepted",
        children: [
          { id: "happy.accepted.respected", label: "Respected" },
          { id: "happy.accepted.valued", label: "Valued" },
        ],
      },
      {
        id: "happy.powerful",
        label: "Powerful",
        children: [
          { id: "happy.powerful.courageous", label: "Courageous" },
          { id: "happy.powerful.creative", label: "Creative" },
        ],
      },
      {
        id: "happy.peaceful",
        label: "Peaceful",
        children: [
          { id: "happy.peaceful.loving", label: "Loving" },
          { id: "happy.peaceful.thankful", label: "Thankful" },
        ],
      },
      {
        id: "happy.trusting",
        label: "Trusting",
        children: [
          { id: "happy.trusting.sensitive", label: "Sensitive" },
          { id: "happy.trusting.intimate", label: "Intimate" },
        ],
      },
      {
        id: "happy.optimistic",
        label: "Optimistic",
        children: [
          { id: "happy.optimistic.hopeful", label: "Hopeful" },
          { id: "happy.optimistic.inspired", label: "Inspired" },
        ],
      },
    ],
  },
  {
    id: "sad",
    label: "Sad",
    color: "#6B8DB2",
    children: [
      {
        id: "sad.lonely",
        label: "Lonely",
        children: [
          { id: "sad.lonely.isolated", label: "Isolated" },
          { id: "sad.lonely.abandoned", label: "Abandoned" },
        ],
      },
      {
        id: "sad.vulnerable",
        label: "Vulnerable",
        children: [
          { id: "sad.vulnerable.victimized", label: "Victimized" },
          { id: "sad.vulnerable.fragile", label: "Fragile" },
        ],
      },
      {
        id: "sad.despair",
        label: "Despair",
        children: [
          { id: "sad.despair.grief", label: "Grief" },
          { id: "sad.despair.powerless", label: "Powerless" },
        ],
      },
      {
        id: "sad.guilty",
        label: "Guilty",
        children: [
          { id: "sad.guilty.ashamed", label: "Ashamed" },
          { id: "sad.guilty.remorseful", label: "Remorseful" },
        ],
      },
      {
        id: "sad.depressed",
        label: "Depressed",
        children: [
          { id: "sad.depressed.inferior", label: "Inferior" },
          { id: "sad.depressed.empty", label: "Empty" },
        ],
      },
      {
        id: "sad.hurt",
        label: "Hurt",
        children: [
          { id: "sad.hurt.embarrassed", label: "Embarrassed" },
          { id: "sad.hurt.disappointed", label: "Disappointed" },
        ],
      },
    ],
  },
  {
    id: "angry",
    label: "Angry",
    color: "#C75C5C",
    children: [
      {
        id: "angry.letdown",
        label: "Let Down",
        children: [
          { id: "angry.letdown.betrayed", label: "Betrayed" },
          { id: "angry.letdown.resentful", label: "Resentful" },
        ],
      },
      {
        id: "angry.humiliated",
        label: "Humiliated",
        children: [
          { id: "angry.humiliated.disrespected", label: "Disrespected" },
          { id: "angry.humiliated.ridiculed", label: "Ridiculed" },
        ],
      },
      {
        id: "angry.bitter",
        label: "Bitter",
        children: [
          { id: "angry.bitter.indignant", label: "Indignant" },
          { id: "angry.bitter.violated", label: "Violated" },
        ],
      },
      {
        id: "angry.mad",
        label: "Mad",
        children: [
          { id: "angry.mad.furious", label: "Furious" },
          { id: "angry.mad.jealous", label: "Jealous" },
        ],
      },
      {
        id: "angry.aggressive",
        label: "Aggressive",
        children: [
          { id: "angry.aggressive.provoked", label: "Provoked" },
          { id: "angry.aggressive.hostile", label: "Hostile" },
        ],
      },
      {
        id: "angry.frustrated",
        label: "Frustrated",
        children: [
          { id: "angry.frustrated.infuriated", label: "Infuriated" },
          { id: "angry.frustrated.annoyed", label: "Annoyed" },
        ],
      },
      {
        id: "angry.distant",
        label: "Distant",
        children: [
          { id: "angry.distant.withdrawn", label: "Withdrawn" },
          { id: "angry.distant.numb", label: "Numb" },
        ],
      },
      {
        id: "angry.critical",
        label: "Critical",
        children: [
          { id: "angry.critical.skeptical", label: "Skeptical" },
          { id: "angry.critical.dismissive", label: "Dismissive" },
        ],
      },
    ],
  },
  {
    id: "fearful",
    label: "Fearful",
    color: "#9B7DB8",
    children: [
      {
        id: "fearful.scared",
        label: "Scared",
        children: [
          { id: "fearful.scared.helpless", label: "Helpless" },
          { id: "fearful.scared.frightened", label: "Frightened" },
        ],
      },
      {
        id: "fearful.anxious",
        label: "Anxious",
        children: [
          { id: "fearful.anxious.overwhelmed", label: "Overwhelmed" },
          { id: "fearful.anxious.worried", label: "Worried" },
        ],
      },
      {
        id: "fearful.insecure",
        label: "Insecure",
        children: [
          { id: "fearful.insecure.inadequate", label: "Inadequate" },
          { id: "fearful.insecure.inferior", label: "Inferior" },
        ],
      },
      {
        id: "fearful.weak",
        label: "Weak",
        children: [
          { id: "fearful.weak.worthless", label: "Worthless" },
          { id: "fearful.weak.insignificant", label: "Insignificant" },
        ],
      },
      {
        id: "fearful.rejected",
        label: "Rejected",
        children: [
          { id: "fearful.rejected.excluded", label: "Excluded" },
          { id: "fearful.rejected.persecuted", label: "Persecuted" },
        ],
      },
      {
        id: "fearful.threatened",
        label: "Threatened",
        children: [
          { id: "fearful.threatened.nervous", label: "Nervous" },
          { id: "fearful.threatened.exposed", label: "Exposed" },
        ],
      },
    ],
  },
  {
    id: "disgusted",
    label: "Disgusted",
    color: "#7BAB7E",
    children: [
      {
        id: "disgusted.disapproving",
        label: "Disapproving",
        children: [
          { id: "disgusted.disapproving.judgmental", label: "Judgmental" },
          { id: "disgusted.disapproving.embarrassed", label: "Embarrassed" },
        ],
      },
      {
        id: "disgusted.disappointed",
        label: "Disappointed",
        children: [
          { id: "disgusted.disappointed.appalled", label: "Appalled" },
          { id: "disgusted.disappointed.revolted", label: "Revolted" },
        ],
      },
      {
        id: "disgusted.awful",
        label: "Awful",
        children: [
          { id: "disgusted.awful.nauseated", label: "Nauseated" },
          { id: "disgusted.awful.detestable", label: "Detestable" },
        ],
      },
      {
        id: "disgusted.repelled",
        label: "Repelled",
        children: [
          { id: "disgusted.repelled.hesitant", label: "Hesitant" },
          { id: "disgusted.repelled.horrified", label: "Horrified" },
        ],
      },
    ],
  },
  {
    id: "surprised",
    label: "Surprised",
    color: "#E8B960",
    children: [
      {
        id: "surprised.startled",
        label: "Startled",
        children: [
          { id: "surprised.startled.shocked", label: "Shocked" },
          { id: "surprised.startled.dismayed", label: "Dismayed" },
        ],
      },
      {
        id: "surprised.confused",
        label: "Confused",
        children: [
          { id: "surprised.confused.disillusioned", label: "Disillusioned" },
          { id: "surprised.confused.perplexed", label: "Perplexed" },
        ],
      },
      {
        id: "surprised.amazed",
        label: "Amazed",
        children: [
          { id: "surprised.amazed.astonished", label: "Astonished" },
          { id: "surprised.amazed.awe", label: "Awe" },
        ],
      },
      {
        id: "surprised.excited",
        label: "Excited",
        children: [
          { id: "surprised.excited.eager", label: "Eager" },
          { id: "surprised.excited.energetic", label: "Energetic" },
        ],
      },
    ],
  },
  {
    id: "bad",
    label: "Bad",
    color: "#8B8B8B",
    children: [
      {
        id: "bad.bored",
        label: "Bored",
        children: [
          { id: "bad.bored.indifferent", label: "Indifferent" },
          { id: "bad.bored.apathetic", label: "Apathetic" },
        ],
      },
      {
        id: "bad.busy",
        label: "Busy",
        children: [
          { id: "bad.busy.pressured", label: "Pressured" },
          { id: "bad.busy.rushed", label: "Rushed" },
        ],
      },
      {
        id: "bad.stressed",
        label: "Stressed",
        children: [
          { id: "bad.stressed.overwhelmed", label: "Overwhelmed" },
          { id: "bad.stressed.outofcontrol", label: "Out of Control" },
        ],
      },
      {
        id: "bad.tired",
        label: "Tired",
        children: [
          { id: "bad.tired.sleepy", label: "Sleepy" },
          { id: "bad.tired.unfocused", label: "Unfocused" },
        ],
      },
    ],
  },
];

// ── Derived Data Structures ────────────────────────

function buildEmotionMap(): Map<string, Emotion> {
  const map = new Map<string, Emotion>();
  for (const primary of FEELINGS_WHEEL) {
    map.set(primary.id, {
      id: primary.id,
      label: primary.label,
      color: primary.color,
      primaryId: primary.id,
    });
    for (const secondary of primary.children) {
      map.set(secondary.id, {
        id: secondary.id,
        label: secondary.label,
        color: primary.color,
        primaryId: primary.id,
      });
      for (const tertiary of secondary.children) {
        map.set(tertiary.id, {
          id: tertiary.id,
          label: tertiary.label,
          color: primary.color,
          primaryId: primary.id,
        });
      }
    }
  }
  return map;
}

/** Flat lookup map: emotionId -> Emotion. Built once at import time. */
export const EMOTION_MAP: Map<string, Emotion> = buildEmotionMap();

/** All valid emotion IDs as a Set for whitelist validation. */
export const VALID_EMOTION_IDS: Set<string> = new Set(EMOTION_MAP.keys());

// ── Helper Functions ───────────────────────────────

/** Validate that all IDs in an array exist in the taxonomy. */
export function validateEmotionIds(ids: string[]): boolean {
  return ids.every((id) => VALID_EMOTION_IDS.has(id));
}

/** Get the primary (tier-1) category for any emotion ID. */
export function getPrimaryEmotion(emotionId: string): string {
  return emotionId.split(".")[0];
}

/** Get the display label for an emotion ID. */
export function getEmotionLabel(emotionId: string): string | undefined {
  return EMOTION_MAP.get(emotionId)?.label;
}

/** Get the color for an emotion ID (inherits from primary). */
export function getEmotionColor(emotionId: string): string {
  return EMOTION_MAP.get(emotionId)?.color ?? "";
}
