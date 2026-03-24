// Web-side copy of mobile homework-item-renderers.
// Uses react-native-web and our Ionicons shim.
// Keep in sync with apps/mobile/components/homework-item-renderers.tsx
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { useState, useEffect, useRef, useCallback } from "react";
import { Ionicons } from "./ionicons-shim";

// ── Types ────────────────────────────────────────────

interface HomeworkItemBase {
  type: string;
  sortOrder: number;
  description?: string;
}

interface ActionItemData extends HomeworkItemBase {
  type: "ACTION";
  subSteps?: string[];
}

interface JournalPromptItemData extends HomeworkItemBase {
  type: "JOURNAL_PROMPT";
  prompts: string[];
  spaceSizeHint?: "small" | "medium" | "large";
}

interface WorksheetItemData extends HomeworkItemBase {
  type: "WORKSHEET";
  instructions?: string;
  columns: Array<{ label: string; description?: string }>;
  rowCount: number;
  tips?: string;
}

interface ChoiceItemData extends HomeworkItemBase {
  type: "CHOICE";
  options: Array<{ label: string; detail?: string }>;
}

interface ResourceReviewItemData extends HomeworkItemBase {
  type: "RESOURCE_REVIEW";
  resourceTitle: string;
  resourceType: string;
  resourceUrl?: string;
  resourceKey?: string;
}

interface RatingScaleItemData extends HomeworkItemBase {
  type: "RATING_SCALE";
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
}

interface TimerItemData extends HomeworkItemBase {
  type: "TIMER";
  durationSeconds: number;
}

interface MoodCheckItemData extends HomeworkItemBase {
  type: "MOOD_CHECK";
  moods: Array<{ emoji: string; label: string }>;
  includeNote?: boolean;
}

interface HabitTrackerItemData extends HomeworkItemBase {
  type: "HABIT_TRACKER";
  habitLabel: string;
}

interface BringToSessionItemData extends HomeworkItemBase {
  type: "BRING_TO_SESSION";
  reminderText: string;
}

interface FreeTextNoteItemData extends HomeworkItemBase {
  type: "FREE_TEXT_NOTE";
  content?: string;
}

type HomeworkItemData =
  | ActionItemData
  | JournalPromptItemData
  | WorksheetItemData
  | ChoiceItemData
  | ResourceReviewItemData
  | RatingScaleItemData
  | TimerItemData
  | MoodCheckItemData
  | HabitTrackerItemData
  | BringToSessionItemData
  | FreeTextNoteItemData;

interface ItemRendererProps {
  item: HomeworkItemData;
  response: any;
  onResponseChange: (response: any) => void;
  readOnly: boolean;
}

// ── Shared Styles ────────────────────────────────────

const cardBg = "#F5ECD7";
const labelColor = "#8A7A5A";
const textColor = "#2D2D2D";
const mutedColor = "#8A8A8A";
const tealColor = "#5B8A8A";
const borderColor = "#E8DCC2";

// ── Action Item ──────────────────────────────────────

function ActionItemRenderer({ item, response, onResponseChange, readOnly }: ItemRendererProps & { item: ActionItemData }) {
  const data = response || { type: "ACTION", completed: false, subStepsDone: [] };

  return (
    <View>
      <TouchableOpacity
        disabled={readOnly}
        onPress={() => onResponseChange({ ...data, type: "ACTION", completed: !data.completed })}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
      >
        <Ionicons
          name={data.completed ? "checkbox" : "square-outline"}
          size={22}
          color={data.completed ? tealColor : mutedColor}
        />
        <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_500Medium", color: textColor, marginLeft: 10, flex: 1 }}>
          {item.description}
        </Text>
      </TouchableOpacity>
      {(item.subSteps || []).map((step, i) => {
        const done = data.subStepsDone?.[i] || false;
        return (
          <TouchableOpacity
            key={i}
            disabled={readOnly}
            onPress={() => {
              const subStepsDone = [...(data.subStepsDone || [])];
              while (subStepsDone.length <= i) subStepsDone.push(false);
              subStepsDone[i] = !subStepsDone[i];
              onResponseChange({ ...data, type: "ACTION", subStepsDone });
            }}
            style={{ flexDirection: "row", alignItems: "center", marginLeft: 28, marginBottom: 6 }}
          >
            <Ionicons name={done ? "checkbox" : "square-outline"} size={18} color={done ? tealColor : mutedColor} />
            <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#5A5A5A", marginLeft: 8, flex: 1 }}>{step}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Journal Prompt ───────────────────────────────────

function JournalPromptItemRenderer({ item, response, onResponseChange, readOnly }: ItemRendererProps & { item: JournalPromptItemData }) {
  const data = response || { type: "JOURNAL_PROMPT", entries: [] };
  const entries: string[] = data.entries || [];
  const heightMap: Record<string, number> = { small: 60, medium: 100, large: 160 };
  const minH = heightMap[item.spaceSizeHint || "medium"] || 100;

  return (
    <View>
      {(item.prompts || []).map((prompt, i) => (
        <View key={i} style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_500Medium", color: textColor, marginBottom: 6 }}>{prompt}</Text>
          <TextInput
            editable={!readOnly}
            multiline
            value={entries[i] || ""}
            onChangeText={(text) => {
              const updated = [...entries];
              while (updated.length <= i) updated.push("");
              updated[i] = text;
              onResponseChange({ ...data, type: "JOURNAL_PROMPT", entries: updated });
            }}
            placeholder="Write your response..."
            placeholderTextColor="#D4D0CB"
            style={{
              borderWidth: 1,
              borderColor: borderColor,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 14,
              fontFamily: "PlusJakartaSans_400Regular",
              color: textColor,
              backgroundColor: "#FFFFFF",
              minHeight: minH,
              textAlignVertical: "top",
            }}
          />
        </View>
      ))}
    </View>
  );
}

// ── Worksheet ────────────────────────────────────────

function WorksheetItemRenderer({ item, response, onResponseChange, readOnly }: ItemRendererProps & { item: WorksheetItemData }) {
  const data = response || { type: "WORKSHEET", rows: [] };
  const rows: Record<string, string>[] = data.rows || [];

  const updateCell = (rowIdx: number, colLabel: string, value: string) => {
    const updated = [...rows];
    while (updated.length <= rowIdx) updated.push({});
    updated[rowIdx] = { ...updated[rowIdx], [colLabel]: value };
    onResponseChange({ ...data, type: "WORKSHEET", rows: updated });
  };

  return (
    <View>
      {item.instructions && (
        <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#5A5A5A", marginBottom: 10 }}>{item.instructions}</Text>
      )}
      {Array.from({ length: item.rowCount }).map((_, ri) => (
        <View key={ri} style={{ marginBottom: 12, backgroundColor: "#FAF6ED", borderRadius: 8, padding: 12, borderWidth: 1, borderColor }}>
          <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_600SemiBold", color: labelColor, marginBottom: 6 }}>Row {ri + 1}</Text>
          {item.columns.map((col, ci) => (
            <View key={ci} style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5A5A5A", marginBottom: 4 }}>{col.label}</Text>
              <TextInput
                editable={!readOnly}
                value={rows[ri]?.[col.label] || ""}
                onChangeText={(text) => updateCell(ri, col.label, text)}
                placeholder={`Enter ${col.label.toLowerCase()}...`}
                placeholderTextColor="#D4D0CB"
                style={{ borderWidth: 1, borderColor: "#D4D0CB", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: textColor, backgroundColor: "#FFFFFF" }}
              />
            </View>
          ))}
        </View>
      ))}
      {item.tips && (
        <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_400Regular", color: mutedColor, fontStyle: "italic", marginTop: 4 }}>{item.tips}</Text>
      )}
    </View>
  );
}

// ── Choice ───────────────────────────────────────────

function ChoiceItemRenderer({ item, response, onResponseChange, readOnly }: ItemRendererProps & { item: ChoiceItemData }) {
  const data = response || { type: "CHOICE", selectedIndex: -1 };

  return (
    <View>
      {item.description && (
        <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_500Medium", color: textColor, marginBottom: 8 }}>{item.description}</Text>
      )}
      {(item.options || []).map((opt, i) => {
        const selected = data.selectedIndex === i;
        return (
          <TouchableOpacity
            key={i}
            disabled={readOnly}
            onPress={() => onResponseChange({ ...data, type: "CHOICE", selectedIndex: i })}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? tealColor : borderColor,
              backgroundColor: selected ? "#EDF5F5" : "#FAF6ED",
              borderRadius: 8,
              marginBottom: 6,
            }}
          >
            <View style={{
              width: 20, height: 20, borderRadius: 10,
              borderWidth: 2, borderColor: selected ? tealColor : "#D4D0CB",
              backgroundColor: selected ? tealColor : "transparent",
              alignItems: "center", justifyContent: "center", marginRight: 10,
            }}>
              {selected && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" }} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_500Medium", color: textColor }}>{opt.label}</Text>
              {opt.detail && <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", color: mutedColor, marginTop: 1 }}>{opt.detail}</Text>}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Resource Review ──────────────────────────────────

function ResourceReviewItemRenderer({ item, response, onResponseChange, readOnly }: ItemRendererProps & { item: ResourceReviewItemData }) {
  const data = response || { type: "RESOURCE_REVIEW", reviewed: false };

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <Ionicons name={item.resourceType === "video" ? "videocam-outline" : item.resourceType === "audio" ? "musical-notes-outline" : "document-text-outline"} size={16} color={tealColor} />
        <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_500Medium", color: tealColor, marginLeft: 6 }}>{item.resourceTitle}</Text>
      </View>
      <TouchableOpacity
        disabled={readOnly}
        onPress={() => onResponseChange({ ...data, type: "RESOURCE_REVIEW", reviewed: !data.reviewed })}
        style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}
      >
        <Ionicons name={data.reviewed ? "checkbox" : "square-outline"} size={20} color={data.reviewed ? tealColor : mutedColor} />
        <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", color: data.reviewed ? tealColor : mutedColor, marginLeft: 8 }}>
          {data.reviewed ? "Reviewed" : "Mark as reviewed"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Rating Scale ─────────────────────────────────────

function RatingScaleItemRenderer({ item, response, onResponseChange, readOnly }: ItemRendererProps & { item: RatingScaleItemData }) {
  const data = response || { type: "RATING_SCALE", value: -1 };
  const min = item.min ?? 1;
  const max = item.max ?? 10;
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <View>
      {item.description && (
        <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_500Medium", color: textColor, marginBottom: 10 }}>{item.description}</Text>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 }}>
        {values.map((v) => {
          const selected = data.value === v;
          return (
            <TouchableOpacity
              key={v}
              disabled={readOnly}
              onPress={() => onResponseChange({ ...data, type: "RATING_SCALE", value: v })}
              style={{
                width: 40, height: 40, borderRadius: 20,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? tealColor : "#D4D0CB",
                backgroundColor: selected ? tealColor : "#FFFFFF",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold", color: selected ? "#FFFFFF" : "#5A5A5A" }}>{v}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {(item.minLabel || item.maxLabel) && (
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_400Regular", color: mutedColor }}>{item.minLabel || ""}</Text>
          <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_400Regular", color: mutedColor }}>{item.maxLabel || ""}</Text>
        </View>
      )}
    </View>
  );
}

// ── Timer ────────────────────────────────────────────

function formatTimer(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function TimerItemRenderer({ item, response, onResponseChange, readOnly }: ItemRendererProps & { item: TimerItemData }) {
  const data = response || { type: "TIMER", elapsedSeconds: 0, completed: false };
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(data.elapsedSeconds || 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const remaining = Math.max(0, item.durationSeconds - elapsed);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev: number) => {
          const next = prev + 1;
          if (next >= item.durationSeconds) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setRunning(false);
            onResponseChange({ type: "TIMER", elapsedSeconds: item.durationSeconds, completed: true });
            return item.durationSeconds;
          }
          return next;
        });
      }, 1000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [running, remaining]);

  const handleToggle = () => {
    if (readOnly) return;
    if (running) {
      setRunning(false);
      onResponseChange({ type: "TIMER", elapsedSeconds: elapsed, completed: elapsed >= item.durationSeconds });
    } else {
      setRunning(true);
    }
  };

  const handleReset = () => {
    if (readOnly) return;
    setRunning(false);
    setElapsed(0);
    onResponseChange({ type: "TIMER", elapsedSeconds: 0, completed: false });
  };

  return (
    <View style={{ alignItems: "center" }}>
      {item.description && (
        <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_500Medium", color: textColor, marginBottom: 12, textAlign: "center" }}>{item.description}</Text>
      )}
      <Text style={{ fontSize: 48, fontFamily: "PlusJakartaSans_700Bold", color: remaining === 0 ? tealColor : textColor, marginBottom: 16 }}>
        {formatTimer(remaining)}
      </Text>
      {!readOnly && (
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={handleToggle}
            style={{
              backgroundColor: running ? "#E8783A" : tealColor,
              borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24,
            }}
          >
            <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold", color: "#FFFFFF" }}>
              {remaining === 0 ? "Done!" : running ? "Pause" : "Start"}
            </Text>
          </TouchableOpacity>
          {elapsed > 0 && !running && remaining > 0 && (
            <TouchableOpacity
              onPress={handleReset}
              style={{ borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: "#D4D0CB" }}
            >
              <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_500Medium", color: mutedColor }}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ── Mood Check ───────────────────────────────────────

function MoodCheckItemRenderer({ item, response, onResponseChange, readOnly }: ItemRendererProps & { item: MoodCheckItemData }) {
  const data = response || { type: "MOOD_CHECK", mood: "" };
  const moods = item.moods || [];

  return (
    <View>
      {item.description && (
        <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_500Medium", color: textColor, marginBottom: 10 }}>{item.description}</Text>
      )}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
        {moods.map((mood, i) => {
          const selected = data.mood === mood.label;
          return (
            <TouchableOpacity
              key={i}
              disabled={readOnly}
              onPress={() => onResponseChange({ ...data, type: "MOOD_CHECK", mood: mood.label })}
              style={{
                alignItems: "center", paddingVertical: 10, paddingHorizontal: 12,
                borderRadius: 12, borderWidth: selected ? 2 : 1,
                borderColor: selected ? tealColor : borderColor,
                backgroundColor: selected ? "#EDF5F5" : "#FAF6ED",
                minWidth: 60,
              }}
            >
              <Text style={{ fontSize: 28 }}>{mood.emoji}</Text>
              <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_500Medium", color: selected ? tealColor : mutedColor, marginTop: 4 }}>{mood.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {item.includeNote && (
        <TextInput
          editable={!readOnly}
          multiline
          value={data.note || ""}
          onChangeText={(text) => onResponseChange({ ...data, type: "MOOD_CHECK", note: text })}
          placeholder="Add a note (optional)..."
          placeholderTextColor="#D4D0CB"
          style={{
            marginTop: 12, borderWidth: 1, borderColor, borderRadius: 8,
            paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
            fontFamily: "PlusJakartaSans_400Regular", color: textColor,
            backgroundColor: "#FFFFFF", minHeight: 60, textAlignVertical: "top",
          }}
        />
      )}
    </View>
  );
}

// ── Habit Tracker ────────────────────────────────────

function HabitTrackerItemRenderer({ item, response, onResponseChange, readOnly }: ItemRendererProps & { item: HabitTrackerItemData }) {
  const data = response || { type: "HABIT_TRACKER", done: false };

  return (
    <View>
      <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold", color: textColor, marginBottom: 4 }}>{item.habitLabel}</Text>
      {item.description && (
        <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_400Regular", color: "#5A5A5A", marginBottom: 10 }}>{item.description}</Text>
      )}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[true, false].map((val) => {
          const selected = data.done === val && response != null;
          return (
            <TouchableOpacity
              key={String(val)}
              disabled={readOnly}
              onPress={() => onResponseChange({ type: "HABIT_TRACKER", done: val })}
              style={{
                flex: 1, paddingVertical: 12, borderRadius: 10,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? (val ? tealColor : "#E53935") : "#D4D0CB",
                backgroundColor: selected ? (val ? "#EDF5F5" : "#FFEBEE") : "#FFFFFF",
                alignItems: "center",
              }}
            >
              <Text style={{
                fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold",
                color: selected ? (val ? tealColor : "#E53935") : mutedColor,
              }}>
                {val ? "Yes" : "No"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Bring-to-Session (acknowledgement) ───────────────

function BringToSessionItemRenderer({ item, response, onResponseChange, readOnly }: ItemRendererProps & { item: BringToSessionItemData }) {
  const data = response || { type: "BRING_TO_SESSION", acknowledged: false };

  return (
    <TouchableOpacity
      disabled={readOnly}
      onPress={() => onResponseChange({ type: "BRING_TO_SESSION", acknowledged: !data.acknowledged })}
      style={{ flexDirection: "row", alignItems: "center" }}
    >
      <Ionicons name={data.acknowledged ? "checkbox" : "square-outline"} size={20} color={data.acknowledged ? tealColor : mutedColor} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Ionicons name="alert-circle-outline" size={14} color="#D4A0A0" style={{ position: "absolute", left: -18, top: 2 }} />
        <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", color: "#5A5A5A" }}>{item.reminderText}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Free Text Note (acknowledgement) ─────────────────

function FreeTextNoteItemRenderer({ item, response, onResponseChange, readOnly }: ItemRendererProps & { item: FreeTextNoteItemData }) {
  const data = response || { type: "FREE_TEXT_NOTE", acknowledged: false };

  return (
    <View>
      <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: textColor }}>{item.content}</Text>
      <TouchableOpacity
        disabled={readOnly}
        onPress={() => onResponseChange({ type: "FREE_TEXT_NOTE", acknowledged: !data.acknowledged })}
        style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}
      >
        <Ionicons name={data.acknowledged ? "checkbox" : "square-outline"} size={18} color={data.acknowledged ? tealColor : mutedColor} />
        <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", color: data.acknowledged ? tealColor : mutedColor, marginLeft: 6 }}>
          Got it
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Router ───────────────────────────────────────────

export function HomeworkItemRenderer({
  item,
  response,
  onResponseChange,
  readOnly,
}: {
  item: any;
  response: any;
  onResponseChange: (response: any) => void;
  readOnly: boolean;
}) {
  const props = { item, response, onResponseChange, readOnly };

  switch (item.type) {
    case "ACTION":
      return <ActionItemRenderer {...props} item={item} />;
    case "JOURNAL_PROMPT":
      return <JournalPromptItemRenderer {...props} item={item} />;
    case "WORKSHEET":
      return <WorksheetItemRenderer {...props} item={item} />;
    case "CHOICE":
      return <ChoiceItemRenderer {...props} item={item} />;
    case "RESOURCE_REVIEW":
      return <ResourceReviewItemRenderer {...props} item={item} />;
    case "RATING_SCALE":
      return <RatingScaleItemRenderer {...props} item={item} />;
    case "TIMER":
      return <TimerItemRenderer {...props} item={item} />;
    case "MOOD_CHECK":
      return <MoodCheckItemRenderer {...props} item={item} />;
    case "HABIT_TRACKER":
      return <HabitTrackerItemRenderer {...props} item={item} />;
    case "BRING_TO_SESSION":
      return <BringToSessionItemRenderer {...props} item={item} />;
    case "FREE_TEXT_NOTE":
      return <FreeTextNoteItemRenderer {...props} item={item} />;
    default:
      return (
        <Text style={{ fontSize: 14, color: mutedColor }}>Unknown item type: {item.type}</Text>
      );
  }
}
