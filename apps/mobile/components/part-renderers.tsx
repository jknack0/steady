import { View, Text, ScrollView, TouchableOpacity, Linking, TextInput } from "react-native";
import { useState } from "react";

// ── TEXT ──────────────────────────────────────────────
export function TextRenderer({ content }: { content: { body: string; sections?: string[] } }) {
  // Strip basic HTML tags for display
  const plainText = content.body
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .trim();

  return (
    <View className="px-4 py-3">
      <Text className="text-base text-gray-800 leading-6">{plainText}</Text>
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
    <View className="px-4 py-3">
      <View className="bg-gray-900 rounded-xl h-48 items-center justify-center mb-3">
        <Text className="text-white text-lg font-medium mb-2">Video</Text>
        <Text className="text-gray-400 text-xs">{content.provider}</Text>
      </View>
      {content.url ? (
        <TouchableOpacity
          className="bg-indigo-600 rounded-lg py-3 items-center"
          onPress={() => Linking.openURL(content.url)}
        >
          <Text className="text-white font-medium">Open Video</Text>
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
      <View className="px-4 py-6 items-center">
        <Text className="text-gray-400">No cards in this deck</Text>
      </View>
    );
  }

  const card = cards[currentIndex];

  return (
    <View className="px-4 py-3">
      {content.deckName ? (
        <Text className="text-sm text-gray-500 mb-3">{content.deckName}</Text>
      ) : null}
      <View className="bg-indigo-50 rounded-xl p-6 min-h-[200px]">
        {card.emoji ? (
          <Text className="text-3xl mb-2">{card.emoji}</Text>
        ) : null}
        <Text className="text-lg font-semibold text-gray-900 mb-2">{card.title}</Text>
        <Text className="text-base text-gray-700">{card.body}</Text>
      </View>
      <View className="flex-row justify-between items-center mt-3">
        <TouchableOpacity
          onPress={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className={currentIndex === 0 ? "opacity-30" : ""}
        >
          <Text className="text-indigo-600 font-medium">Previous</Text>
        </TouchableOpacity>
        <Text className="text-sm text-gray-400">
          {currentIndex + 1} / {cards.length}
        </Text>
        <TouchableOpacity
          onPress={() => setCurrentIndex(Math.min(cards.length - 1, currentIndex + 1))}
          disabled={currentIndex === cards.length - 1}
          className={currentIndex === cards.length - 1 ? "opacity-30" : ""}
        >
          <Text className="text-indigo-600 font-medium">Next</Text>
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
    <View className="px-4 py-3">
      {(content.prompts || []).map((prompt, index) => (
        <View key={index} className="mb-4">
          <Text className="text-base font-medium text-gray-900 mb-2">{prompt}</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
            multiline
            numberOfLines={lineCount}
            textAlignVertical="top"
            placeholder="Write your thoughts..."
            value={responses[index] || ""}
            onChangeText={(text) => onResponseChange(index, text)}
            style={{ minHeight: lineCount * 24 }}
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
    <View className="px-4 py-3">
      {items.map((item, index) => (
        <TouchableOpacity
          key={index}
          className="flex-row items-center py-3 border-b border-gray-100"
          onPress={() => onToggle(index)}
        >
          <View
            className={`w-6 h-6 rounded border-2 mr-3 items-center justify-center ${
              checked[index] ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
            }`}
          >
            {checked[index] ? <Text className="text-white text-xs font-bold">+</Text> : null}
          </View>
          <Text
            className={`flex-1 text-base ${checked[index] ? "text-gray-400 line-through" : "text-gray-800"}`}
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
    <View className="px-4 py-3">
      {content.description ? (
        <Text className="text-base text-gray-700 mb-3">{content.description}</Text>
      ) : null}
      {content.url ? (
        <TouchableOpacity
          className="bg-indigo-50 rounded-lg p-4 flex-row items-center"
          onPress={() => Linking.openURL(content.url)}
        >
          <View className="flex-1">
            <Text className="text-indigo-600 font-medium" numberOfLines={1}>
              {content.url}
            </Text>
          </View>
          <Text className="text-indigo-600 ml-2">Open</Text>
        </TouchableOpacity>
      ) : (
        <Text className="text-gray-400">No link provided</Text>
      )}
    </View>
  );
}

// ── DIVIDER ──────────────────────────────────────────
export function DividerRenderer({ content }: { content: { label: string } }) {
  return (
    <View className="px-4 py-6 flex-row items-center">
      <View className="flex-1 h-px bg-gray-200" />
      {content.label ? (
        <>
          <Text className="mx-3 text-sm text-gray-400 font-medium">{content.label}</Text>
          <View className="flex-1 h-px bg-gray-200" />
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
    <View className="px-4 py-3">
      {(content.items || []).map((item, index) => (
        <View key={index} className="mb-4 bg-amber-50 rounded-lg p-4">
          <Text className="text-xs text-amber-600 font-medium uppercase mb-1">{item.type.replace(/_/g, " ")}</Text>
          {item.description ? (
            <Text className="text-base text-gray-800">{item.description}</Text>
          ) : null}
          {item.prompts?.map((p, i) => (
            <Text key={i} className="text-base text-gray-800 mt-1">{p}</Text>
          ))}
          {item.reminderText ? (
            <Text className="text-base text-gray-800">{item.reminderText}</Text>
          ) : null}
          {item.content ? (
            <Text className="text-base text-gray-800">{item.content}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
