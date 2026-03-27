import { View, Text, ScrollView, TouchableOpacity, Linking, TextInput } from "react-native";
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@steady/shared";
import { AudioPlayer } from "./audio-player";
import { api } from "../lib/api";

// ── Rich Text Parser ─────────────────────────────────
// Converts HTML from Tiptap editor into React Native Text elements
// with proper bold, italic, headings, lists, and links.

interface TextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  link?: string;
}

interface RichBlock {
  type: "paragraph" | "heading" | "list-item" | "bullet-list" | "ordered-list" | "blockquote" | "hr";
  level?: number; // for headings
  segments: TextSegment[];
  children?: RichBlock[];
  index?: number; // for ordered lists
}

function parseHTML(html: string): RichBlock[] {
  const blocks: RichBlock[] = [];

  // Normalize: replace <br> with newlines, clean up whitespace
  let cleaned = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\r\n/g, "\n");

  // Split into block-level elements
  // Match: <p>, <h1>-<h6>, <ul>, <ol>, <blockquote>, <li>, <hr>
  const blockRegex = /<(p|h[1-6]|ul|ol|blockquote|li|hr)(?: [^>]*)?\s*\/?>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;

  let match;
  let lastIndex = 0;

  // If no block tags found, treat entire content as paragraphs split by double newlines
  if (!/<(p|h[1-6]|ul|ol|blockquote|li|hr)/i.test(cleaned)) {
    // Plain text or markdown-ish content
    const paragraphs = cleaned.split(/\n\n+/);
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (trimmed) {
        blocks.push({ type: "paragraph", segments: parseInline(trimmed) });
      }
    }
    return blocks;
  }

  // Process list containers: extract <li> items from <ul>/<ol>
  cleaned = cleaned.replace(/<(ul|ol)(?: [^>]*)?\s*>([\s\S]*?)<\/\1>/gi, (_, tag, inner) => {
    const listType = tag.toLowerCase() === "ul" ? "bullet-list" : "ordered-list";
    const liRegex = /<li(?: [^>]*)?\s*>([\s\S]*?)<\/li>/gi;
    let liMatch;
    let liIndex = 1;
    let replacement = "";
    while ((liMatch = liRegex.exec(inner)) !== null) {
      // Use a custom marker so we can identify list items
      replacement += `<__${listType}_item__ data-index="${liIndex}">${liMatch[1]}</__${listType}_item__>`;
      liIndex++;
    }
    return replacement;
  });

  // Now parse all blocks
  const generalBlockRegex = /<(p|h[1-6]|blockquote|__[a-z-]+_item__)(?: [^>]*?)?\s*>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;

  while ((match = generalBlockRegex.exec(cleaned)) !== null) {
    if (match[0].match(/^<hr/i)) {
      blocks.push({ type: "hr", segments: [] });
      continue;
    }

    const tag = match[1].toLowerCase();
    const inner = match[2];

    if (tag.match(/^h[1-6]$/)) {
      const level = parseInt(tag[1]);
      blocks.push({ type: "heading", level, segments: parseInline(inner) });
    } else if (tag === "blockquote") {
      blocks.push({ type: "blockquote", segments: parseInline(inner.replace(/<\/?p[^>]*>/gi, "")) });
    } else if (tag.includes("bullet-list_item")) {
      blocks.push({ type: "list-item", segments: parseInline(inner.replace(/<\/?p[^>]*>/gi, "")) });
    } else if (tag.includes("ordered-list_item")) {
      const idxMatch = match[0].match(/data-index="(\d+)"/);
      blocks.push({ type: "list-item", index: idxMatch ? parseInt(idxMatch[1]) : undefined, segments: parseInline(inner.replace(/<\/?p[^>]*>/gi, "")) });
    } else {
      // paragraph
      blocks.push({ type: "paragraph", segments: parseInline(inner) });
    }
  }

  // If we didn't extract any blocks, fall back to plain text
  if (blocks.length === 0) {
    const stripped = cleaned.replace(/<[^>]*>/g, "").trim();
    if (stripped) {
      blocks.push({ type: "paragraph", segments: parseInline(stripped) });
    }
  }

  return blocks;
}

function parseInline(html: string): TextSegment[] {
  const segments: TextSegment[] = [];

  // Handle nested inline tags: <strong>, <b>, <em>, <i>, <a>
  // We'll use a simple recursive approach
  let remaining = html;

  // Process inline tags iteratively
  const inlineRegex = /<(strong|b|em|i|a)(?: [^>]*)?\s*>([\s\S]*?)<\/\1>/i;

  while (remaining.length > 0) {
    const match = inlineRegex.exec(remaining);

    if (!match) {
      // No more inline tags — push remaining as plain text
      const text = decodeEntities(remaining.replace(/<[^>]*>/g, ""));
      if (text) segments.push({ text });
      break;
    }

    // Push text before the match
    const before = remaining.slice(0, match.index);
    const beforeText = decodeEntities(before.replace(/<[^>]*>/g, ""));
    if (beforeText) segments.push({ text: beforeText });

    const tag = match[1].toLowerCase();
    const inner = match[2];

    // Extract href for links
    let href: string | undefined;
    if (tag === "a") {
      const hrefMatch = match[0].match(/href="([^"]*?)"/i);
      href = hrefMatch ? hrefMatch[1] : undefined;
    }

    // Recursively parse inner content for nested tags
    const innerSegments = parseInline(inner);

    for (const seg of innerSegments) {
      segments.push({
        ...seg,
        bold: seg.bold || tag === "strong" || tag === "b",
        italic: seg.italic || tag === "em" || tag === "i",
        link: seg.link || href,
      });
    }

    remaining = remaining.slice(match.index + match[0].length);
  }

  // Handle markdown-style bold (**text**) and italic (*text*) in segments
  const processed: TextSegment[] = [];
  for (const seg of segments) {
    if (seg.bold || seg.italic || seg.link) {
      processed.push(seg);
      continue;
    }
    // Parse markdown bold/italic in plain text
    const mdParsed = parseMarkdownInline(seg.text);
    processed.push(...mdParsed);
  }

  return processed;
}

function parseMarkdownInline(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  // Match **bold** and *italic* (but not ** inside a word)
  const mdRegex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIdx = 0;
  let match;

  while ((match = mdRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      segments.push({ text: text.slice(lastIdx, match.index) });
    }
    if (match[1]) {
      // Bold
      segments.push({ text: match[1], bold: true });
    } else if (match[2]) {
      // Italic
      segments.push({ text: match[2], italic: true });
    }
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) {
    segments.push({ text: text.slice(lastIdx) });
  }

  return segments.length > 0 ? segments : [{ text }];
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function RichTextBlock({ block }: { block: RichBlock }) {
  if (block.type === "hr") {
    return <View style={{ height: 1, backgroundColor: "#D4D0CB", marginVertical: 12 }} />;
  }

  const isHeading = block.type === "heading";
  const isListItem = block.type === "list-item";
  const isBlockquote = block.type === "blockquote";

  const fontSize = isHeading
    ? block.level === 1 ? 22 : block.level === 2 ? 18 : 16
    : 16;

  const fontFamily = isHeading
    ? "PlusJakartaSans_700Bold"
    : "PlusJakartaSans_400Regular";

  const marginBottom = isHeading ? 8 : isListItem ? 4 : 10;

  return (
    <View
      style={{
        flexDirection: "row",
        marginBottom,
        ...(isBlockquote ? { borderLeftWidth: 3, borderLeftColor: "#5B8A8A", paddingLeft: 12 } : {}),
      }}
    >
      {isListItem && (
        <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_400Regular", color: "#5A5A5A", marginRight: 8, minWidth: 16 }}>
          {block.index ? `${block.index}.` : "•"}
        </Text>
      )}
      <Text style={{ flex: 1, fontSize, fontFamily, color: "#2D2D2D", lineHeight: fontSize * 1.5 }}>
        {block.segments.map((seg, i) => (
          <Text
            key={i}
            style={{
              fontFamily: seg.bold && seg.italic
                ? "PlusJakartaSans_700Bold"
                : seg.bold
                ? "PlusJakartaSans_700Bold"
                : seg.italic
                ? "PlusJakartaSans_400Regular"
                : fontFamily,
              fontStyle: seg.italic ? "italic" : "normal",
              color: seg.link ? "#5B8A8A" : undefined,
              textDecorationLine: seg.link ? "underline" : "none",
            }}
            onPress={seg.link ? () => Linking.openURL(seg.link!) : undefined}
          >
            {seg.text}
          </Text>
        ))}
      </Text>
    </View>
  );
}

// ── TEXT ──────────────────────────────────────────────
export function TextRenderer({ content }: { content: { body: string; sections?: string[] } }) {
  const blocks = parseHTML(content.body || "");

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {blocks.map((block, i) => (
        <RichTextBlock key={i} block={block} />
      ))}
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
      <View style={{ backgroundColor: "#2D2D2D", borderRadius: 16, height: 200, alignItems: "center", justifyContent: "center", marginBottom: 12, overflow: "hidden" }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#5B8A8A", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="play" size={24} color="white" style={{ marginLeft: 3 }} />
        </View>
        <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "PlusJakartaSans_500Medium", marginTop: 10, textTransform: "uppercase", letterSpacing: 1 }}>{content.provider}</Text>
      </View>
      {content.url ? (
        <TouchableOpacity
          style={{ backgroundColor: "#5B8A8A", borderRadius: 12, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center" }}
          onPress={() => Linking.openURL(content.url)}
        >
          <Ionicons name="play-circle-outline" size={18} color="white" />
          <Text style={{ color: "white", fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 15, marginLeft: 8 }}>Watch Video</Text>
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
        <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5B8A8A", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>{content.deckName}</Text>
      ) : null}
      <View style={{ backgroundColor: "#E3EDED", borderRadius: 16, padding: 24, minHeight: 200 }}>
        {card.emoji ? (
          <Text style={{ fontSize: 36, marginBottom: 12 }}>{card.emoji}</Text>
        ) : null}
        <Text style={{ fontSize: 20, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D", marginBottom: 8 }}>{card.title}</Text>
        <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_400Regular", color: "#5A5A5A", lineHeight: 24 }}>{card.body}</Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
        <TouchableOpacity
          onPress={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          style={{ opacity: currentIndex === 0 ? 0.3 : 1, flexDirection: "row", alignItems: "center" }}
        >
          <Ionicons name="chevron-back" size={16} color="#5B8A8A" />
          <Text style={{ color: "#5B8A8A", fontFamily: "PlusJakartaSans_600SemiBold", marginLeft: 4 }}>Previous</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {cards.map((_, i) => (
            <View key={i} style={{ width: i === currentIndex ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === currentIndex ? "#5B8A8A" : "#D4D0CB" }} />
          ))}
        </View>
        <TouchableOpacity
          onPress={() => setCurrentIndex(Math.min(cards.length - 1, currentIndex + 1))}
          disabled={currentIndex === cards.length - 1}
          style={{ opacity: currentIndex === cards.length - 1 ? 0.3 : 1, flexDirection: "row", alignItems: "center" }}
        >
          <Text style={{ color: "#5B8A8A", fontFamily: "PlusJakartaSans_600SemiBold", marginRight: 4 }}>Next</Text>
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

  const completedCount = Object.values(checked).filter(Boolean).length;

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {/* Progress summary */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: "#F0EDE8" }}>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: completedCount === items.length ? "#8FAE8B" : "#5B8A8A", width: items.length > 0 ? `${(completedCount / items.length) * 100}%` : "0%" }} />
        </View>
        <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", color: "#8A8A8A", marginLeft: 10 }}>{completedCount}/{items.length}</Text>
      </View>

      {items.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: index < items.length - 1 ? 1 : 0, borderBottomColor: "#F0EDE8" }}
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
              fontFamily: checked[index] ? "PlusJakartaSans_400Regular" : "PlusJakartaSans_500Medium",
              color: checked[index] ? "#8A8A8A" : "#2D2D2D",
              textDecorationLine: checked[index] ? "line-through" : "none",
            }}
          >
            {item.text}
          </Text>
          {checked[index] ? <Ionicons name="checkmark-circle" size={18} color="#8FAE8B" style={{ marginLeft: 8 }} /> : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── RESOURCE LINK ────────────────────────────────────
export function ResourceLinkRenderer({
  content,
}: {
  content: { url: string; fileKey?: string; description?: string; resourceType?: string; audioDurationSecs?: number };
}) {
  // Audio resource — render inline player
  if (content.resourceType === "audio" && content.fileKey) {
    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        {content.description ? (
          <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_500Medium", color: "#2D2D2D", marginBottom: 8 }}>{content.description}</Text>
        ) : null}
        <AudioPlayer audioKey={content.fileKey} durationSecs={content.audioDurationSecs} />
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {content.url ? (
        <TouchableOpacity
          style={{ backgroundColor: "#F7F5F2", borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center" }}
          onPress={() => Linking.openURL(content.url)}
        >
          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#E3EDED", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="link-outline" size={18} color="#5B8A8A" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            {content.description ? (
              <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_500Medium", color: "#2D2D2D", marginBottom: 2 }} numberOfLines={2}>{content.description}</Text>
            ) : null}
            <Text style={{ fontSize: 13, color: "#5B8A8A", fontFamily: "PlusJakartaSans_400Regular" }} numberOfLines={1}>
              {content.url}
            </Text>
          </View>
          <View style={{ backgroundColor: "#5B8A8A", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 }}>
            <Text style={{ color: "white", fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 13 }}>Open</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <Text style={{ color: "#8A8A8A", fontFamily: "PlusJakartaSans_400Regular" }}>No link provided</Text>
      )}
    </View>
  );
}

// ── PDF ─────────────────────────────────────────────
export function PdfRenderer({
  content,
}: {
  content: { fileKey: string; url: string; fileName: string; description?: string; pageCount?: number };
}) {
  const WebView = require("react-native-webview").default;
  const googleViewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(content.url)}`;

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {content.url ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#FDEAEA", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="document-text-outline" size={16} color="#C0392B" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D" }} numberOfLines={1}>
                {content.fileName || "PDF Document"}
              </Text>
              {content.description ? (
                <Text style={{ fontSize: 13, color: "#8A8A8A", fontFamily: "PlusJakartaSans_400Regular" }} numberOfLines={1}>
                  {content.description}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={() => Linking.openURL(content.url)}>
              <View style={{ backgroundColor: "#C0392B", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ color: "white", fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 12 }}>Open</Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={{ height: 500, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#E0E0E0" }}>
            <WebView
              source={{ uri: googleViewerUrl }}
              style={{ flex: 1 }}
              startInLoadingState
              scalesPageToFit
            />
          </View>
        </>
      ) : (
        <Text style={{ color: "#8A8A8A", fontFamily: "PlusJakartaSans_400Regular" }}>No PDF uploaded</Text>
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

// ── PDF Open Button ──────────────────────────────────
function PdfOpenButton({ resourceKey }: { resourceKey: string }) {
  const [loading, setLoading] = useState(false);
  const handlePress = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPresignedDownloadUrl(resourceKey);
      await Linking.openURL(res.downloadUrl);
    } catch {
      // silently fail — user can retry
    } finally {
      setLoading(false);
    }
  }, [resourceKey]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={loading}
      style={{ flexDirection: "row", alignItems: "center", marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#F0EDE6", borderRadius: 8 }}
    >
      <Ionicons name="document-attach-outline" size={16} color="#5B8A8A" />
      <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", color: "#5B8A8A", marginLeft: 6 }}>
        {loading ? "Opening..." : "View PDF"}
      </Text>
    </TouchableOpacity>
  );
}

// ── HOMEWORK ─────────────────────────────────────────
export function HomeworkRenderer({
  content,
  responses,
  onResponseChange,
  readOnly = true,
  displayLabels,
}: {
  content: { items: Array<any> };
  responses?: Record<string, any>;
  onResponseChange?: (key: string, response: any) => void;
  readOnly?: boolean;
  displayLabels?: Record<string, string>;
}) {
  const { HomeworkItemRenderer } = require("./homework-item-renderers");

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {(content.items || []).map((item: any, index: number) => {
        const key = String(item.sortOrder ?? index);
        const itemResponse = responses?.[key] || null;

        return (
          <View key={index} style={{ marginBottom: 16, backgroundColor: "#F5ECD7", borderRadius: 12, padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <View style={{ backgroundColor: "#E8DCC2", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, fontFamily: "PlusJakartaSans_600SemiBold", color: "#8A7A5A", textTransform: "uppercase", letterSpacing: 0.5 }}>{displayLabels?.[String(item.sortOrder ?? index)] || item.type.replace(/_/g, " ")}</Text>
              </View>
            </View>
            <HomeworkItemRenderer
              item={item}
              response={itemResponse}
              onResponseChange={(resp: any) => onResponseChange?.(key, resp)}
              readOnly={readOnly}
            />
          </View>
        );
      })}
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
        <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#5A5A5A", marginBottom: 16, lineHeight: 20 }}>{content.instructions}</Text>
      ) : null}

      {questions.map((q, index) => (
        <View key={index} style={{ marginBottom: 16, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#F0EDE8" }}>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", color: "#8A8A8A", marginBottom: 4 }}>
            Question {index + 1}{questions.length > 1 ? ` of ${questions.length}` : ""}
          </Text>
          <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D", marginBottom: 12 }}>
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
        <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#5A5A5A", marginBottom: 16, lineHeight: 20 }}>{content.instructions}</Text>
      ) : null}

      {sections.map((section) => {
        const sectionFields = fields.filter((f) => f.section === section);
        if (sectionFields.length === 0) return null;

        return (
          <View key={section} style={{ marginBottom: 20 }}>
            {sections.length > 1 ? (
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: "rgba(91,138,138,0.3)" }} />
                <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5B8A8A", textTransform: "uppercase", letterSpacing: 1, marginHorizontal: 12 }}>
                  {section}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: "rgba(91,138,138,0.3)" }} />
              </View>
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

// ── STYLED CONTENT ──────────────────────────────────

/**
 * Resolve CSS var(--steady-*) references to actual hex values for React Native.
 */
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

interface StyledBlock {
  type: "callout" | "rich";
  bgColor?: string;
  borderColor?: string;
  html: string;
}

/**
 * Extract styled <div> blocks (callout boxes, step boxes) from the AI HTML output,
 * then render them as themed native views. Everything else goes through the regular parser.
 */
function parseStyledBlocks(html: string): StyledBlock[] {
  const resolved = resolveCssVars(html);
  const blocks: StyledBlock[] = [];

  // Match top-level <div style="...">...</div> blocks and non-div content
  const divRegex = /<div\s+style="([^"]*)">([\s\S]*?)<\/div>/gi;
  let lastIndex = 0;
  let match;

  while ((match = divRegex.exec(resolved)) !== null) {
    // Capture any content before this div
    if (match.index > lastIndex) {
      const before = resolved.slice(lastIndex, match.index).trim();
      if (before) blocks.push({ type: "rich", html: before });
    }

    const style = match[1];
    const inner = match[2];

    // Extract background and border-left color
    const bgMatch = style.match(/background:\s*([^;]+)/);
    const borderMatch = style.match(/border-left:\s*\d+px\s+solid\s+([^;]+)/);

    blocks.push({
      type: "callout",
      bgColor: bgMatch ? bgMatch[1].trim() : undefined,
      borderColor: borderMatch ? borderMatch[1].trim() : undefined,
      html: inner,
    });

    lastIndex = match.index + match[0].length;
  }

  // Remaining content after last div
  if (lastIndex < resolved.length) {
    const remaining = resolved.slice(lastIndex).trim();
    if (remaining) blocks.push({ type: "rich", html: remaining });
  }

  // If no divs found, treat whole thing as rich text
  if (blocks.length === 0 && resolved.trim()) {
    blocks.push({ type: "rich", html: resolved });
  }

  return blocks;
}

export function StyledContentRenderer({ content }: { content: { styledHtml: string } }) {
  const styledBlocks = parseStyledBlocks(content.styledHtml || "");

  if (styledBlocks.length === 0) {
    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 24, alignItems: "center" }}>
        <Text style={{ color: theme.warm300, fontFamily: "PlusJakartaSans_400Regular" }}>No styled content yet</Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {styledBlocks.map((block, i) => {
        if (block.type === "callout") {
          return (
            <View
              key={i}
              style={{
                backgroundColor: block.bgColor || theme.tealBg,
                borderLeftWidth: block.borderColor ? 3 : 0,
                borderLeftColor: block.borderColor || theme.teal,
                borderRadius: 8,
                padding: 12,
                marginVertical: 6,
              }}
            >
              {parseHTML(block.html).map((richBlock, j) => (
                <RichTextBlock key={j} block={richBlock} />
              ))}
            </View>
          );
        }
        // Regular rich text
        return parseHTML(block.html).map((richBlock, j) => (
          <RichTextBlock key={`${i}-${j}`} block={richBlock} />
        ));
      })}
    </View>
  );
}
