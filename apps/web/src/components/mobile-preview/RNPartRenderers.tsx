"use client";

/**
 * React Native Web versions of all mobile part renderers.
 * Used in the web app's phone preview modal to show exactly how content looks on mobile.
 *
 * Rules:
 * - Imports react-native (aliased to react-native-web by the bundler)
 * - Uses ionicons-shim instead of @expo/vector-icons
 * - No AudioPlayer, api, Linking, WebView, or expo/native modules
 */

import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { Ionicons } from "./ionicons-shim";
import { theme } from "@steady/shared";

// ── TEXT ──────────────────────────────────────────────
// For web preview, we render HTML with dangerouslySetInnerHTML since we have a browser.
export function TextRenderer({ content }: { content: { body: string; sections?: string[] } }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      <div
        style={{ fontFamily: "inherit", fontSize: 16, color: "#2D2D2D", lineHeight: 1.5 }}
        dangerouslySetInnerHTML={{ __html: content.body || "" }}
      />
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
      <View
        style={{
          backgroundColor: "#2D2D2D",
          borderRadius: 16,
          height: 200,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: "#5B8A8A",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="play" size={24} color="white" style={{ marginLeft: 3 }} />
        </View>
        <Text
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 11,
            fontWeight: "500",
            marginTop: 10,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {content.provider}
        </Text>
      </View>
      {content.url ? (
        <TouchableOpacity
          style={{
            backgroundColor: "#5B8A8A",
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
          }}
          onPress={() => window.open(content.url, "_blank")}
        >
          <Ionicons name="play-circle-outline" size={18} color="white" />
          <Text style={{ color: "white", fontWeight: "600", fontSize: 15, marginLeft: 8 }}>
            Watch Video
          </Text>
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
        <Text style={{ color: "#8A8A8A" }}>No cards in this deck</Text>
      </View>
    );
  }

  const card = cards[currentIndex];

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {content.deckName ? (
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: "#5B8A8A",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 12,
          }}
        >
          {content.deckName}
        </Text>
      ) : null}
      <View
        style={{
          backgroundColor: "#E3EDED",
          borderRadius: 16,
          padding: 24,
          minHeight: 200,
        }}
      >
        {card.emoji ? <Text style={{ fontSize: 36, marginBottom: 12 }}>{card.emoji}</Text> : null}
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#2D2D2D", marginBottom: 8 }}>
          {card.title}
        </Text>
        <Text style={{ fontSize: 16, color: "#5A5A5A", lineHeight: 24 }}>{card.body}</Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 16,
        }}
      >
        <TouchableOpacity
          onPress={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          style={{
            opacity: currentIndex === 0 ? 0.3 : 1,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Ionicons name="chevron-back" size={16} color="#5B8A8A" />
          <Text style={{ color: "#5B8A8A", fontWeight: "600", marginLeft: 4 }}>Previous</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {cards.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === currentIndex ? 16 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === currentIndex ? "#5B8A8A" : "#D4D0CB",
              }}
            />
          ))}
        </View>
        <TouchableOpacity
          onPress={() => setCurrentIndex(Math.min(cards.length - 1, currentIndex + 1))}
          disabled={currentIndex === cards.length - 1}
          style={{
            opacity: currentIndex === cards.length - 1 ? 0.3 : 1,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#5B8A8A", fontWeight: "600", marginRight: 4 }}>Next</Text>
          <Ionicons name="chevron-forward" size={16} color="#5B8A8A" />
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
          <Text style={{ fontSize: 16, fontWeight: "500", color: "#2D2D2D", marginBottom: 8 }}>
            {prompt}
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: "#D4D0CB",
              borderRadius: 10,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              color: "#2D2D2D",
              backgroundColor: "#FFFFFF",
              minHeight: lineCount * 24,
            }}
            multiline
            numberOfLines={lineCount}
            placeholder="Write your thoughts..."
            placeholderTextColor="#D4D0CB"
            value={responses[index] || ""}
            onChangeText={(text: string) => onResponseChange(index, text)}
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
  const completedCount = Object.values(checked).filter(Boolean).length;

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {/* Progress summary */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: "#F0EDE8" }}>
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: completedCount === items.length ? "#8FAE8B" : "#5B8A8A",
              width:
                items.length > 0 ? `${(completedCount / items.length) * 100}%` : ("0%" as any),
            }}
          />
        </View>
        <Text style={{ fontSize: 12, fontWeight: "500", color: "#8A8A8A", marginLeft: 10 }}>
          {completedCount}/{items.length}
        </Text>
      </View>

      {items.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            paddingHorizontal: 4,
            borderBottomWidth: index < items.length - 1 ? 1 : 0,
            borderBottomColor: "#F0EDE8",
          }}
          onPress={() => onToggle(index)}
          activeOpacity={0.7}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
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
              fontWeight: checked[index] ? "400" : "500",
              color: checked[index] ? "#8A8A8A" : "#2D2D2D",
              textDecorationLine: checked[index] ? "line-through" : "none",
            }}
          >
            {item.text}
          </Text>
          {checked[index] ? (
            <Ionicons name="checkmark-circle" size={18} color="#8FAE8B" style={{ marginLeft: 8 }} />
          ) : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── RESOURCE LINK ────────────────────────────────────
export function ResourceLinkRenderer({
  content,
}: {
  content: {
    url: string;
    fileKey?: string;
    description?: string;
    resourceType?: string;
    audioDurationSecs?: number;
  };
}) {
  // Audio resource — render a placeholder since AudioPlayer is not available
  if (content.resourceType === "audio" && content.fileKey) {
    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        {content.description ? (
          <Text style={{ fontSize: 15, fontWeight: "500", color: "#2D2D2D", marginBottom: 8 }}>
            {content.description}
          </Text>
        ) : null}
        <View
          style={{
            backgroundColor: "#F7F5F2",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#5B8A8A",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="play" size={18} color="white" style={{ marginLeft: 2 }} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: "#2D2D2D" }}>
              Audio Resource
            </Text>
            {content.audioDurationSecs ? (
              <Text style={{ fontSize: 12, color: "#8A8A8A", marginTop: 2 }}>
                {Math.floor(content.audioDurationSecs / 60)}:
                {String(content.audioDurationSecs % 60).padStart(2, "0")}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {content.url ? (
        <TouchableOpacity
          style={{
            backgroundColor: "#F7F5F2",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
          }}
          onPress={() => window.open(content.url, "_blank")}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: "#E3EDED",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="link-outline" size={18} color="#5B8A8A" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            {content.description ? (
              <Text
                style={{ fontSize: 16, fontWeight: "500", color: "#2D2D2D", marginBottom: 2 }}
                numberOfLines={2}
              >
                {content.description}
              </Text>
            ) : null}
            <Text style={{ fontSize: 13, color: "#5B8A8A" }} numberOfLines={1}>
              {content.url}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: "#5B8A8A",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 6,
              marginLeft: 8,
            }}
          >
            <Text style={{ color: "white", fontWeight: "600", fontSize: 13 }}>Open</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <Text style={{ color: "#8A8A8A" }}>No link provided</Text>
      )}
    </View>
  );
}

// ── PDF ─────────────────────────────────────────────
export function PdfRenderer({
  content,
}: {
  content: {
    fileKey: string;
    url: string;
    fileName: string;
    description?: string;
    pageCount?: number;
  };
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {content.url ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: "#FDEAEA",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="document-text-outline" size={16} color="#C0392B" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#2D2D2D" }} numberOfLines={1}>
                {content.fileName || "PDF Document"}
              </Text>
              {content.description ? (
                <Text style={{ fontSize: 13, color: "#8A8A8A" }} numberOfLines={1}>
                  {content.description}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={() => window.open(content.url, "_blank")}>
              <View
                style={{
                  backgroundColor: "#C0392B",
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: "white", fontWeight: "600", fontSize: 12 }}>Open</Text>
              </View>
            </TouchableOpacity>
          </View>
          <View
            style={{
              height: 500,
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "#E0E0E0",
            }}
          >
            <iframe
              src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(content.url)}`}
              style={{ width: "100%", height: "100%", border: "none" }}
              title={content.fileName || "PDF Document"}
            />
          </View>
        </>
      ) : (
        <Text style={{ color: "#8A8A8A" }}>No PDF uploaded</Text>
      )}
    </View>
  );
}

// ── DIVIDER ──────────────────────────────────────────
export function DividerRenderer({ content }: { content: { label: string } }) {
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 24,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: "#D4D0CB" }} />
      {content.label ? (
        <>
          <Text
            style={{
              marginHorizontal: 12,
              fontSize: 14,
              fontWeight: "500",
              color: "#8A8A8A",
            }}
          >
            {content.label}
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: "#D4D0CB" }} />
        </>
      ) : null}
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
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: selected ? "white" : "#5A5A5A",
                }}
              >
                {point}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
        <Text style={{ fontSize: 11, color: "#8A8A8A", maxWidth: "40%" as any }}>{minLabel}</Text>
        <Text
          style={{ fontSize: 11, color: "#8A8A8A", maxWidth: "40%" as any, textAlign: "right" }}
        >
          {maxLabel}
        </Text>
      </View>
    </View>
  );
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
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#2D2D2D", marginBottom: 4 }}>
          {content.title}
        </Text>
      ) : null}
      {content.instructions ? (
        <Text style={{ fontSize: 14, color: "#5A5A5A", marginBottom: 16, lineHeight: 20 }}>
          {content.instructions}
        </Text>
      ) : null}

      {questions.map((q, index) => (
        <View
          key={index}
          style={{
            marginBottom: 16,
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: "#F0EDE8",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#8A8A8A", marginBottom: 4 }}>
            Question {index + 1}
            {questions.length > 1 ? ` of ${questions.length}` : ""}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#2D2D2D", marginBottom: 12 }}>
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
                      {selected ? (
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: "#5B8A8A",
                          }}
                        />
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 16, color: "#2D2D2D" }}>{option}</Text>
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
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: selected ? "white" : "#2D2D2D",
                      }}
                    >
                      {option}
                    </Text>
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
                color: "#2D2D2D",
                backgroundColor: "#FFFFFF",
                minHeight: 96,
              }}
              multiline
              placeholder="Your answer..."
              placeholderTextColor="#D4D0CB"
              value={responses[index] || ""}
              onChangeText={(text: string) => onResponseChange(index, text)}
            />
          )}
        </View>
      ))}
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
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#2D2D2D", marginBottom: 4 }}>
          {content.title}
        </Text>
      ) : null}
      {content.instructions ? (
        <Text style={{ fontSize: 14, color: "#5A5A5A", marginBottom: 16, lineHeight: 20 }}>
          {content.instructions}
        </Text>
      ) : null}

      {sections.map((section) => {
        const sectionFields = fields.filter((f) => f.section === section);
        if (sectionFields.length === 0) return null;

        return (
          <View key={section} style={{ marginBottom: 20 }}>
            {sections.length > 1 ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}
              >
                <View
                  style={{ flex: 1, height: 1, backgroundColor: "rgba(91,138,138,0.3)" }}
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: "#5B8A8A",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginHorizontal: 12,
                  }}
                >
                  {section}
                </Text>
                <View
                  style={{ flex: 1, height: 1, backgroundColor: "rgba(91,138,138,0.3)" }}
                />
              </View>
            ) : null}

            {sectionFields.map((field, fi) => {
              const key = `${field.section}_${field.sortOrder}`;
              return (
                <View key={fi} style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#5A5A5A",
                      marginBottom: 8,
                      marginLeft: 4,
                    }}
                  >
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
                        color: "#2D2D2D",
                        backgroundColor: "#FFFFFF",
                      }}
                      placeholder={
                        field.placeholder || (field.type === "DATE" ? "YYYY-MM-DD" : "")
                      }
                      placeholderTextColor="#D4D0CB"
                      value={responses[key] || ""}
                      onChangeText={(text: string) => onResponseChange(key, text)}
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
                        color: "#2D2D2D",
                        backgroundColor: "#FFFFFF",
                      }}
                      placeholder={field.placeholder || ""}
                      placeholderTextColor="#D4D0CB"
                      value={responses[key]?.toString() || ""}
                      onChangeText={(text: string) => onResponseChange(key, text)}
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
                        color: "#2D2D2D",
                        backgroundColor: "#FFFFFF",
                        minHeight: 96,
                      }}
                      multiline
                      placeholder={field.placeholder || ""}
                      placeholderTextColor="#D4D0CB"
                      value={responses[key] || ""}
                      onChangeText={(text: string) => onResponseChange(key, text)}
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
                              {selected ? (
                                <View
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 5,
                                    backgroundColor: "#5B8A8A",
                                  }}
                                />
                              ) : null}
                            </View>
                            <Text style={{ fontSize: 16, color: "#2D2D2D" }}>{option}</Text>
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
                              {selected ? (
                                <Ionicons name="checkmark" size={12} color="white" />
                              ) : null}
                            </View>
                            <Text style={{ fontSize: 16, color: "#2D2D2D" }}>{option}</Text>
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
                        {responses[key] ? (
                          <Ionicons name="checkmark" size={14} color="white" />
                        ) : null}
                      </View>
                      <Text style={{ fontSize: 16, color: "#2D2D2D" }}>Yes</Text>
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
  {
    key: "measurable",
    label: "Measurable",
    placeholder: "How will you know when it's achieved?",
  },
  {
    key: "achievable",
    label: "Achievable",
    placeholder: "Is this realistic given your resources?",
  },
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

  const goalCount = Math.max(
    1,
    Math.min(maxGoals, responses._goalCount || (content.goals?.length || 1))
  );

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {content.instructions ? (
        <Text style={{ fontSize: 14, color: "#5A5A5A", marginBottom: 16 }}>
          {content.instructions}
        </Text>
      ) : null}

      {Array.from({ length: goalCount }).map((_, gi) => {
        const prefix = `goal_${gi}`;
        const prefilledGoal = content.goals?.[gi];

        return (
          <View
            key={gi}
            style={{
              marginBottom: 24,
              backgroundColor: "#F7F5F2",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text
              style={{ fontSize: 16, fontWeight: "700", color: "#2D2D2D", marginBottom: 12 }}
            >
              Goal {gi + 1}
            </Text>

            {/* Category selector */}
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#5A5A5A",
                marginBottom: 8,
                marginLeft: 4,
              }}
            >
              Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                {categories.map((cat) => {
                  const selected =
                    (responses[`${prefix}_category`] ||
                      prefilledGoal?.category ||
                      "OTHER") === cat;
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
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "500",
                          color: selected ? "white" : "#5A5A5A",
                        }}
                      >
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
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#5B8A8A",
                    marginBottom: 6,
                    marginLeft: 4,
                  }}
                >
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
                    color: "#2D2D2D",
                    backgroundColor: "#FFFFFF",
                    minHeight: 60,
                  }}
                  multiline
                  placeholder={field.placeholder}
                  placeholderTextColor="#D4D0CB"
                  value={
                    responses[`${prefix}_${field.key}`] || prefilledGoal?.[field.key] || ""
                  }
                  onChangeText={(text: string) =>
                    onResponseChange(`${prefix}_${field.key}`, text)
                  }
                />
              </View>
            ))}
          </View>
        );
      })}

      {/* Add goal button */}
      {goalCount < maxGoals ? (
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: "#D4D0CB",
            borderRadius: 10,
            borderStyle: "dashed" as any,
          }}
          onPress={() => onResponseChange("_goalCount", goalCount + 1)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#5B8A8A" />
          <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: "600", color: "#5B8A8A" }}>
            Add Another Goal
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── STYLED CONTENT ──────────────────────────────────
// For web preview, render the raw HTML with CSS variables resolved
const CSS_VAR_MAP: Record<string, string> = {
  "--steady-teal": theme.teal,
  "--steady-teal-light": theme.tealLight,
  "--steady-teal-dark": theme.tealDark,
  "--steady-teal-bg": theme.tealBg,
  "--steady-sky": theme.sky,
  "--steady-sky-light": theme.skyLight,
  "--steady-sage": theme.sage,
  "--steady-sage-light": theme.sageLight,
  "--steady-sage-dark": theme.sageDark,
  "--steady-sage-bg": theme.sageBg,
  "--steady-rose": theme.rose,
  "--steady-rose-light": theme.roseLight,
  "--steady-rose-bg": theme.roseBg,
  "--steady-cream": theme.cream,
  "--steady-cream-light": theme.creamLight,
  "--steady-cream-dark": theme.creamDark,
  "--steady-warm-50": theme.warm50,
  "--steady-warm-100": theme.warm100,
  "--steady-warm-200": theme.warm200,
  "--steady-warm-300": theme.warm300,
  "--steady-warm-400": theme.warm400,
  "--steady-warm-500": theme.warm500,
};

function resolveCssVars(html: string): string {
  return html.replace(/var\(([^)]+)\)/g, (_, varName) => {
    const trimmed = varName.trim();
    return CSS_VAR_MAP[trimmed] || trimmed;
  });
}

export function StyledContentRenderer({ content }: { content: { styledHtml: string } }) {
  const resolved = resolveCssVars(content.styledHtml || "");

  if (!resolved.trim()) {
    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 24, alignItems: "center" }}>
        <Text style={{ color: theme.warm300 }}>No styled content yet</Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      <div
        style={{ fontFamily: "inherit", fontSize: 16, color: "#2D2D2D", lineHeight: 1.5 }}
        dangerouslySetInnerHTML={{ __html: resolved }}
      />
    </View>
  );
}

// ── ROUTER COMPONENT ────────────────────────────────
export function RNPartContentRenderer({ part }: { part: { type: string; content: any } }) {
  // Local state for interactive renderers
  const [journalResponses, setJournalResponses] = useState<Record<number, string>>({});
  const [checklistChecked, setChecklistChecked] = useState<Record<number, boolean>>({});
  const [assessmentResponses, setAssessmentResponses] = useState<Record<number, any>>({});
  const [intakeResponses, setIntakeResponses] = useState<Record<string, any>>({});
  const [smartGoalResponses, setSmartGoalResponses] = useState<Record<string, any>>({});

  switch (part.type) {
    case "TEXT":
      return <TextRenderer content={part.content} />;

    case "VIDEO":
      return <VideoRenderer content={part.content} />;

    case "STRATEGY_CARDS":
      return <StrategyCardsRenderer content={part.content} />;

    case "JOURNAL_PROMPT":
      return (
        <JournalPromptRenderer
          content={part.content}
          responses={journalResponses}
          onResponseChange={(index, text) =>
            setJournalResponses((prev) => ({ ...prev, [index]: text }))
          }
        />
      );

    case "CHECKLIST":
      return (
        <ChecklistRenderer
          content={part.content}
          checked={checklistChecked}
          onToggle={(index) =>
            setChecklistChecked((prev) => ({ ...prev, [index]: !prev[index] }))
          }
        />
      );

    case "DIVIDER":
      return <DividerRenderer content={part.content} />;

    case "HOMEWORK":
      // Homework is handled separately by RNHomeworkPreview
      return null;

    case "ASSESSMENT":
      return (
        <AssessmentRenderer
          content={part.content}
          responses={assessmentResponses}
          onResponseChange={(index, value) =>
            setAssessmentResponses((prev) => ({ ...prev, [index]: value }))
          }
        />
      );

    case "INTAKE_FORM":
      return (
        <IntakeFormRenderer
          content={part.content}
          responses={intakeResponses}
          onResponseChange={(key, value) =>
            setIntakeResponses((prev) => ({ ...prev, [key]: value }))
          }
        />
      );

    case "SMART_GOALS":
      return (
        <SmartGoalsRenderer
          content={part.content}
          responses={smartGoalResponses}
          onResponseChange={(key, value) =>
            setSmartGoalResponses((prev) => ({ ...prev, [key]: value }))
          }
        />
      );

    case "STYLED_CONTENT":
      return <StyledContentRenderer content={part.content} />;

    case "RESOURCE_LINK":
      return <ResourceLinkRenderer content={part.content} />;

    case "PDF":
      return <PdfRenderer content={part.content} />;

    default:
      return (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: "#8A8A8A", fontStyle: "italic" }}>
            Unknown part type: {part.type}
          </Text>
        </View>
      );
  }
}
