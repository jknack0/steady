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
