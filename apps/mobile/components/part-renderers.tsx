import { View, Text, ScrollView, TouchableOpacity, Linking, TextInput } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

// ── TEXT ──────────────────────────────────────────────
export function TextRenderer({ content }: { content: { body: string; sections?: string[] } }) {
  // Strip basic HTML tags for display
  const plainText = content.body
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .trim();

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_400Regular", color: "#2D2D2D", lineHeight: 24 }}>{plainText}</Text>
    </View>
  );
}

// ── VIDEO ────────────────────────────────────────────
export function VideoRenderer({
  content,
}: {
  content: { url: string; provider: string; transcriptUrl?: string };
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      <View style={{ backgroundColor: "#2D2D2D", borderRadius: 12, height: 192, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        <Ionicons name="play-circle-outline" size={48} color="rgba(255,255,255,0.6)" />
        <Text style={{ color: "#8A8A8A", fontSize: 12, fontFamily: "PlusJakartaSans_400Regular", marginTop: 8 }}>{content.provider}</Text>
      </View>
      {content.url ? (
        <TouchableOpacity
          style={{ backgroundColor: "#5B8A8A", borderRadius: 10, paddingVertical: 12, alignItems: "center" }}
          onPress={() => Linking.openURL(content.url)}
        >
          <Text style={{ color: "white", fontFamily: "PlusJakartaSans_600SemiBold" }}>Open Video</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── STRATEGY CARDS ───────────────────────────────────
export function StrategyCardsRenderer({
  content,
}: {
  content: { deckName: string; cards: Array<{ title: string; body: string; emoji?: string }> };
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const cards = content.cards || [];

  if (cards.length === 0) {
    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 24, alignItems: "center" }}>
        <Text style={{ color: "#8A8A8A", fontFamily: "PlusJakartaSans_400Regular" }}>No cards in this deck</Text>
      </View>
    );
  }

  const card = cards[currentIndex];

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {content.deckName ? (
        <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", color: "#5A5A5A", marginBottom: 12 }}>{content.deckName}</Text>
      ) : null}
      <View style={{ backgroundColor: "#E3EDED", borderRadius: 12, padding: 24, minHeight: 200 }}>
        {card.emoji ? (
          <Text style={{ fontSize: 30, marginBottom: 8 }}>{card.emoji}</Text>
        ) : null}
        <Text style={{ fontSize: 18, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D", marginBottom: 8 }}>{card.title}</Text>
        <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_400Regular", color: "#5A5A5A" }}>{card.body}</Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <TouchableOpacity
          onPress={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          style={{ opacity: currentIndex === 0 ? 0.3 : 1 }}
        >
          <Text style={{ color: "#5B8A8A", fontFamily: "PlusJakartaSans_600SemiBold" }}>Previous</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", color: "#8A8A8A" }}>
          {currentIndex + 1} / {cards.length}
        </Text>
        <TouchableOpacity
          onPress={() => setCurrentIndex(Math.min(cards.length - 1, currentIndex + 1))}
          disabled={currentIndex === cards.length - 1}
          style={{ opacity: currentIndex === cards.length - 1 ? 0.3 : 1 }}
        >
          <Text style={{ color: "#5B8A8A", fontFamily: "PlusJakartaSans_600SemiBold" }}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── JOURNAL PROMPT ───────────────────────────────────
export function JournalPromptRenderer({
  content,
  responses,
  onResponseChange,
}: {
  content: { prompts: string[]; spaceSizeHint?: string };
  responses: Record<number, string>;
  onResponseChange: (index: number, text: string) => void;
}) {
  const lineCount = content.spaceSizeHint === "large" ? 8 : content.spaceSizeHint === "small" ? 3 : 5;

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {(content.prompts || []).map((prompt, index) => (
        <View key={index} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_500Medium", color: "#2D2D2D", marginBottom: 8 }}>{prompt}</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: "#D4D0CB", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontFamily: "PlusJakartaSans_400Regular", color: "#2D2D2D", backgroundColor: "#FFFFFF", minHeight: lineCount * 24 }}
            multiline
            numberOfLines={lineCount}
            textAlignVertical="top"
            placeholder="Write your thoughts..."
            placeholderTextColor="#D4D0CB"
            value={responses[index] || ""}
            onChangeText={(text) => onResponseChange(index, text)}
          />
        </View>
      ))}
    </View>
  );
}

// ── CHECKLIST ────────────────────────────────────────
export function ChecklistRenderer({
  content,
  checked,
  onToggle,
}: {
  content: { items: Array<{ text: string; sortOrder: number }> };
  checked: Record<number, boolean>;
  onToggle: (index: number) => void;
}) {
  const items = [...(content.items || [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {items.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F0EDE8" }}
          onPress={() => onToggle(index)}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              borderWidth: 2,
              marginRight: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: checked[index] ? "#5B8A8A" : "transparent",
              borderColor: checked[index] ? "#5B8A8A" : "#D4D0CB",
            }}
          >
            {checked[index] ? <Ionicons name="checkmark" size={14} color="white" /> : null}
          </View>
          <Text
            style={{
              flex: 1,
              fontSize: 16,
              fontFamily: "PlusJakartaSans_400Regular",
              color: checked[index] ? "#8A8A8A" : "#2D2D2D",
              textDecorationLine: checked[index] ? "line-through" : "none",
            }}
          >
            {item.text}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── RESOURCE LINK ────────────────────────────────────
export function ResourceLinkRenderer({
  content,
}: {
  content: { url: string; description?: string };
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {content.description ? (
        <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_400Regular", color: "#5A5A5A", marginBottom: 12 }}>{content.description}</Text>
      ) : null}
      {content.url ? (
        <TouchableOpacity
          style={{ backgroundColor: "#E3EDED", borderRadius: 10, padding: 16, flexDirection: "row", alignItems: "center" }}
          onPress={() => Linking.openURL(content.url)}
        >
          <Ionicons name="link-outline" size={16} color="#5B8A8A" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={{ color: "#5B8A8A", fontFamily: "PlusJakartaSans_500Medium" }} numberOfLines={1}>
              {content.url}
            </Text>
          </View>
          <Text style={{ color: "#5B8A8A", fontFamily: "PlusJakartaSans_600SemiBold", marginLeft: 8 }}>Open</Text>
        </TouchableOpacity>
      ) : (
        <Text style={{ color: "#8A8A8A", fontFamily: "PlusJakartaSans_400Regular" }}>No link provided</Text>
      )}
    </View>
  );
}

// ── DIVIDER ──────────────────────────────────────────
export function DividerRenderer({ content }: { content: { label: string } }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 24, flexDirection: "row", alignItems: "center" }}>
      <View style={{ flex: 1, height: 1, backgroundColor: "#D4D0CB" }} />
      {content.label ? (
        <>
          <Text style={{ marginHorizontal: 12, fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", color: "#8A8A8A" }}>{content.label}</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: "#D4D0CB" }} />
        </>
      ) : null}
    </View>
  );
}

// ── HOMEWORK ─────────────────────────────────────────
export function HomeworkRenderer({
  content,
}: {
  content: { items: Array<{ type: string; description?: string; prompts?: string[]; reminderText?: string; content?: string; options?: Array<{ label: string }> }> };
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {(content.items || []).map((item, index) => (
        <View key={index} style={{ marginBottom: 16, backgroundColor: "#F5ECD7", borderRadius: 10, padding: 16 }}>
          <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_600SemiBold", color: "#C4A84D", textTransform: "uppercase", marginBottom: 4 }}>{item.type.replace(/_/g, " ")}</Text>
          {item.description ? (
            <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_400Regular", color: "#2D2D2D" }}>{item.description}</Text>
          ) : null}
          {item.prompts?.map((p, i) => (
            <Text key={i} style={{ fontSize: 16, fontFamily: "PlusJakartaSans_400Regular", color: "#2D2D2D", marginTop: 4 }}>{p}</Text>
          ))}
          {item.reminderText ? (
            <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_400Regular", color: "#2D2D2D" }}>{item.reminderText}</Text>
          ) : null}
          {item.content ? (
            <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_400Regular", color: "#2D2D2D" }}>{item.content}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// ── ASSESSMENT ──────────────────────────────────────
interface AssessmentQuestion {
  question: string;
  type: "LIKERT" | "MULTIPLE_CHOICE" | "FREE_TEXT" | "YES_NO";
  options?: string[];
  likertMin?: number;
  likertMax?: number;
  likertMinLabel?: string;
  likertMaxLabel?: string;
  required: boolean;
  sortOrder: number;
}

interface AssessmentContent {
  title?: string;
  instructions?: string;
  scoringEnabled?: boolean;
  questions: AssessmentQuestion[];
}

export function AssessmentRenderer({
  content,
  responses,
  onResponseChange,
}: {
  content: AssessmentContent;
  responses: Record<number, any>;
  onResponseChange: (index: number, value: any) => void;
}) {
  const questions = [...(content.questions || [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {content.title ? (
        <Text style={{ fontSize: 18, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D", marginBottom: 4 }}>{content.title}</Text>
      ) : null}
      {content.instructions ? (
        <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#5A5A5A", marginBottom: 16 }}>{content.instructions}</Text>
      ) : null}

      {questions.map((q, index) => (
        <View key={index} style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_500Medium", color: "#2D2D2D", marginBottom: 8 }}>
            {q.question}
            {q.required ? <Text style={{ color: "#D4A0A0" }}> *</Text> : null}
          </Text>

          {q.type === "LIKERT" && (
            <LikertScale
              min={q.likertMin ?? 1}
              max={q.likertMax ?? 5}
              minLabel={q.likertMinLabel ?? "Strongly Disagree"}
              maxLabel={q.likertMaxLabel ?? "Strongly Agree"}
              value={responses[index]}
              onChange={(val) => onResponseChange(index, val)}
            />
          )}

          {q.type === "MULTIPLE_CHOICE" && (
            <View>
              {(q.options || []).map((option, oi) => {
                const selected = responses[index] === option;
                return (
                  <TouchableOpacity
                    key={oi}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: selected ? "#5B8A8A" : "#D4D0CB",
                      backgroundColor: selected ? "#E3EDED" : "#FFFFFF",
                      borderRadius: 10,
                      marginBottom: 8,
                    }}
                    onPress={() => onResponseChange(index, option)}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: selected ? "#5B8A8A" : "#D4D0CB",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 10,
                      }}
                    >
                      {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#5B8A8A" }} /> : null}
                    </View>
                    <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_400Regular", color: "#2D2D2D" }}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {q.type === "YES_NO" && (
            <View style={{ flexDirection: "row", gap: 12 }}>
              {["Yes", "No"].map((option) => {
                const selected = responses[index] === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: selected ? "#5B8A8A" : "#D4D0CB",
                      backgroundColor: selected ? "#5B8A8A" : "#FFFFFF",
                      alignItems: "center",
                    }}
                    onPress={() => onResponseChange(index, option)}
                  >
                    <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold", color: selected ? "white" : "#2D2D2D" }}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {q.type === "FREE_TEXT" && (
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#D4D0CB",
                borderRadius: 10,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                fontFamily: "PlusJakartaSans_400Regular",
                color: "#2D2D2D",
                backgroundColor: "#FFFFFF",
                minHeight: 96,
              }}
              multiline
              textAlignVertical="top"
              placeholder="Your answer..."
              placeholderTextColor="#D4D0CB"
              value={responses[index] || ""}
              onChangeText={(text) => onResponseChange(index, text)}
            />
          )}
        </View>
      ))}
    </View>
  );
}

function LikertScale({
  min,
  max,
  minLabel,
  maxLabel,
  value,
  onChange,
}: {
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  value: number | undefined;
  onChange: (val: number) => void;
}) {
  const points = [];
  for (let i = min; i <= max; i++) {
    points.push(i);
  }

  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        {points.map((point) => {
          const selected = value === point;
          return (
            <TouchableOpacity
              key={point}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                borderWidth: 2,
                borderColor: selected ? "#5B8A8A" : "#D4D0CB",
                backgroundColor: selected ? "#5B8A8A" : "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => onChange(point)}
            >
              <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold", color: selected ? "white" : "#5A5A5A" }}>{point}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
        <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", maxWidth: "40%" }}>{minLabel}</Text>
        <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", maxWidth: "40%", textAlign: "right" }}>{maxLabel}</Text>
      </View>
    </View>
  );
}

// ── INTAKE FORM ─────────────────────────────────────
interface IntakeField {
  label: string;
  type: "TEXT" | "TEXTAREA" | "SELECT" | "MULTI_SELECT" | "DATE" | "NUMBER" | "CHECKBOX";
  placeholder?: string;
  options?: string[];
  required: boolean;
  section: string;
  sortOrder: number;
}

interface IntakeFormContent {
  title?: string;
  instructions?: string;
  sections?: string[];
  fields: IntakeField[];
}

export function IntakeFormRenderer({
  content,
  responses,
  onResponseChange,
}: {
  content: IntakeFormContent;
  responses: Record<string, any>;
  onResponseChange: (fieldKey: string, value: any) => void;
}) {
  const sections = content.sections || ["General"];
  const fields = [...(content.fields || [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {content.title ? (
        <Text style={{ fontSize: 18, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D", marginBottom: 4 }}>{content.title}</Text>
      ) : null}
      {content.instructions ? (
        <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#5A5A5A", marginBottom: 16 }}>{content.instructions}</Text>
      ) : null}

      {sections.map((section) => {
        const sectionFields = fields.filter((f) => f.section === section);
        if (sectionFields.length === 0) return null;

        return (
          <View key={section} style={{ marginBottom: 20 }}>
            {sections.length > 1 ? (
              <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_700Bold", color: "#5B8A8A", marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#F0EDE8" }}>
                {section}
              </Text>
            ) : null}

            {sectionFields.map((field, fi) => {
              const key = `${field.section}_${field.sortOrder}`;
              return (
                <View key={fi} style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5A5A5A", marginBottom: 8, marginLeft: 4 }}>
                    {field.label}
                    {field.required ? <Text style={{ color: "#D4A0A0" }}> *</Text> : null}
                  </Text>

                  {(field.type === "TEXT" || field.type === "DATE") && (
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: "#D4D0CB",
                        borderRadius: 10,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        fontSize: 16,
                        fontFamily: "PlusJakartaSans_400Regular",
                        color: "#2D2D2D",
                        backgroundColor: "#FFFFFF",
                      }}
                      placeholder={field.placeholder || (field.type === "DATE" ? "YYYY-MM-DD" : "")}
                      placeholderTextColor="#D4D0CB"
                      value={responses[key] || ""}
                      onChangeText={(text) => onResponseChange(key, text)}
                    />
                  )}

                  {field.type === "NUMBER" && (
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: "#D4D0CB",
                        borderRadius: 10,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        fontSize: 16,
                        fontFamily: "PlusJakartaSans_400Regular",
                        color: "#2D2D2D",
                        backgroundColor: "#FFFFFF",
                      }}
                      placeholder={field.placeholder || ""}
                      placeholderTextColor="#D4D0CB"
                      value={responses[key]?.toString() || ""}
                      onChangeText={(text) => onResponseChange(key, text)}
                      keyboardType="numeric"
                    />
                  )}

                  {field.type === "TEXTAREA" && (
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: "#D4D0CB",
                        borderRadius: 10,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        fontSize: 16,
                        fontFamily: "PlusJakartaSans_400Regular",
                        color: "#2D2D2D",
                        backgroundColor: "#FFFFFF",
                        minHeight: 96,
                      }}
                      multiline
                      textAlignVertical="top"
                      placeholder={field.placeholder || ""}
                      placeholderTextColor="#D4D0CB"
                      value={responses[key] || ""}
                      onChangeText={(text) => onResponseChange(key, text)}
                    />
                  )}

                  {field.type === "SELECT" && (
                    <View>
                      {(field.options || []).map((option, oi) => {
                        const selected = responses[key] === option;
                        return (
                          <TouchableOpacity
                            key={oi}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              paddingVertical: 10,
                              paddingHorizontal: 12,
                              borderWidth: 1,
                              borderColor: selected ? "#5B8A8A" : "#D4D0CB",
                              backgroundColor: selected ? "#E3EDED" : "#FFFFFF",
                              borderRadius: 10,
                              marginBottom: 6,
                            }}
                            onPress={() => onResponseChange(key, option)}
                          >
                            <View
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                borderWidth: 2,
                                borderColor: selected ? "#5B8A8A" : "#D4D0CB",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 10,
                              }}
                            >
                              {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#5B8A8A" }} /> : null}
                            </View>
                            <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_400Regular", color: "#2D2D2D" }}>{option}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {field.type === "MULTI_SELECT" && (
                    <View>
                      {(field.options || []).map((option, oi) => {
                        const currentSelections: string[] = responses[key] || [];
                        const selected = currentSelections.includes(option);
                        return (
                          <TouchableOpacity
                            key={oi}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              paddingVertical: 10,
                              paddingHorizontal: 12,
                              borderWidth: 1,
                              borderColor: selected ? "#5B8A8A" : "#D4D0CB",
                              backgroundColor: selected ? "#E3EDED" : "#FFFFFF",
                              borderRadius: 10,
                              marginBottom: 6,
                            }}
                            onPress={() => {
                              const updated = selected
                                ? currentSelections.filter((s) => s !== option)
                                : [...currentSelections, option];
                              onResponseChange(key, updated);
                            }}
                          >
                            <View
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 4,
                                borderWidth: 2,
                                borderColor: selected ? "#5B8A8A" : "#D4D0CB",
                                backgroundColor: selected ? "#5B8A8A" : "transparent",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 10,
                              }}
                            >
                              {selected ? <Ionicons name="checkmark" size={12} color="white" /> : null}
                            </View>
                            <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_400Regular", color: "#2D2D2D" }}>{option}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {field.type === "CHECKBOX" && (
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center" }}
                      onPress={() => onResponseChange(key, !responses[key])}
                    >
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          borderWidth: 2,
                          borderColor: responses[key] ? "#5B8A8A" : "#D4D0CB",
                          backgroundColor: responses[key] ? "#5B8A8A" : "transparent",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 10,
                        }}
                      >
                        {responses[key] ? <Ionicons name="checkmark" size={14} color="white" /> : null}
                      </View>
                      <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_400Regular", color: "#2D2D2D" }}>Yes</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

// ── SMART GOALS ─────────────────────────────────────
interface SmartGoal {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
  category: string;
  sortOrder: number;
}

interface SmartGoalsContent {
  instructions?: string;
  maxGoals?: number;
  categories?: string[];
  goals?: SmartGoal[];
}

const CATEGORY_LABELS: Record<string, string> = {
  DAILY_ROUTINE: "Daily Routine",
  WORK: "Work / School",
  RELATIONSHIPS: "Relationships",
  HEALTH: "Health",
  SELF_CARE: "Self-Care",
  OTHER: "Other",
};

const SMART_FIELDS = [
  { key: "specific", label: "Specific", placeholder: "What exactly do you want to accomplish?" },
  { key: "measurable", label: "Measurable", placeholder: "How will you know when it's achieved?" },
  { key: "achievable", label: "Achievable", placeholder: "Is this realistic given your resources?" },
  { key: "relevant", label: "Relevant", placeholder: "Why does this matter to you right now?" },
  { key: "timeBound", label: "Time-Bound", placeholder: "By when will you accomplish this?" },
] as const;

export function SmartGoalsRenderer({
  content,
  responses,
  onResponseChange,
}: {
  content: SmartGoalsContent;
  responses: Record<string, any>;
  onResponseChange: (key: string, value: any) => void;
}) {
  const maxGoals = content.maxGoals || 3;
  const categories = content.categories || Object.keys(CATEGORY_LABELS);

  // Determine how many goals are currently being edited
  const goalCount = Math.max(
    1,
    Math.min(
      maxGoals,
      responses._goalCount || (content.goals?.length || 1)
    )
  );

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {content.instructions ? (
        <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#5A5A5A", marginBottom: 16 }}>{content.instructions}</Text>
      ) : null}

      {Array.from({ length: goalCount }).map((_, gi) => {
        const prefix = `goal_${gi}`;
        const prefilledGoal = content.goals?.[gi];

        return (
          <View key={gi} style={{ marginBottom: 24, backgroundColor: "#F7F5F2", borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D", marginBottom: 12 }}>
              Goal {gi + 1}
            </Text>

            {/* Category selector */}
            <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5A5A5A", marginBottom: 8, marginLeft: 4 }}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {categories.map((cat) => {
                  const selected = (responses[`${prefix}_category`] || prefilledGoal?.category || "OTHER") === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: selected ? "#5B8A8A" : "#FFFFFF",
                        borderWidth: 1,
                        borderColor: selected ? "#5B8A8A" : "#D4D0CB",
                      }}
                      onPress={() => onResponseChange(`${prefix}_category`, cat)}
                    >
                      <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", color: selected ? "white" : "#5A5A5A" }}>
                        {CATEGORY_LABELS[cat] || cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* SMART fields */}
            {SMART_FIELDS.map((field) => (
              <View key={field.key} style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5B8A8A", marginBottom: 6, marginLeft: 4 }}>
                  {field.label}
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: "#D4D0CB",
                    borderRadius: 10,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    fontFamily: "PlusJakartaSans_400Regular",
                    color: "#2D2D2D",
                    backgroundColor: "#FFFFFF",
                    minHeight: 60,
                  }}
                  multiline
                  textAlignVertical="top"
                  placeholder={field.placeholder}
                  placeholderTextColor="#D4D0CB"
                  value={responses[`${prefix}_${field.key}`] || prefilledGoal?.[field.key] || ""}
                  onChangeText={(text) => onResponseChange(`${prefix}_${field.key}`, text)}
                />
              </View>
            ))}
          </View>
        );
      })}

      {/* Add goal button */}
      {goalCount < maxGoals ? (
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderWidth: 1, borderColor: "#D4D0CB", borderRadius: 10, borderStyle: "dashed" }}
          onPress={() => onResponseChange("_goalCount", goalCount + 1)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#5B8A8A" />
          <Text style={{ marginLeft: 8, fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5B8A8A" }}>Add Another Goal</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
