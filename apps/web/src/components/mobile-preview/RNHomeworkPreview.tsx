"use client";

/**
 * Renders homework content using actual React Native components via react-native-web.
 * This imports the mobile app's HomeworkItemRenderer directly so the preview
 * is pixel-accurate to what participants see.
 */

import { useState, useCallback, useRef } from "react";
import { View, Text, ScrollView } from "react-native";
import { HomeworkItemRenderer } from "./homework-item-renderers";

interface RNHomeworkPreviewProps {
  content: {
    items: Array<any>;
    completionRule?: string;
    completionMinimum?: number | null;
  };
  readOnly?: boolean;
}

export function RNHomeworkPreview({ content, readOnly = false }: RNHomeworkPreviewProps) {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const items = content.items || [];

  const handleResponseChange = useCallback((key: string, value: any) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
  }, []);

  const completedCount = getCompletedCount(responses, items);

  return (
    <View style={{ flex: 1 }}>
      {/* Interactive badge */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#E3EDED",
          marginHorizontal: 16,
          marginTop: 12,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontFamily: "PlusJakartaSans_600SemiBold",
            color: "#5B8A8A",
          }}
        >
          Complete this homework in the app
        </Text>
      </View>

      {/* Progress */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", color: "#8A8A8A" }}>
          {completedCount}/{items.length} items completed
        </Text>
        <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_400Regular", color: "#5B8A8A" }}>
          Auto-saving
        </Text>
      </View>

      {/* Progress bar */}
      <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
        <View style={{ height: 4, backgroundColor: "#F0EDE8", borderRadius: 2 }}>
          <View
            style={{
              height: 4,
              backgroundColor: "#5B8A8A",
              borderRadius: 2,
              width: items.length > 0 ? `${(completedCount / items.length) * 100}%` : "0%",
            }}
          />
        </View>
      </View>

      {/* Homework items */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        {items.map((item: any, index: number) => {
          const key = String(item.sortOrder ?? index);
          const itemResponse = responses[key] || null;

          return (
            <View
              key={index}
              style={{
                marginBottom: 16,
                backgroundColor: "#F5ECD7",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <View
                  style={{
                    backgroundColor: "#E8DCC2",
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: "PlusJakartaSans_600SemiBold",
                      color: "#8A7A5A",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {item.type.replace(/_/g, " ")}
                  </Text>
                </View>
              </View>
              <HomeworkItemRenderer
                item={item}
                response={itemResponse}
                onResponseChange={(resp: any) => handleResponseChange(key, resp)}
                readOnly={readOnly}
              />
            </View>
          );
        })}
      </View>

      {/* Complete button */}
      {!readOnly && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <View
            style={{
              backgroundColor: "#5B8A8A",
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontFamily: "PlusJakartaSans_600SemiBold",
                color: "#FFFFFF",
              }}
            >
              Mark Complete
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function getCompletedCount(responses: Record<string, any>, items: any[]): number {
  let count = 0;
  for (const item of items) {
    const key = String(item.sortOrder ?? items.indexOf(item));
    const r = responses[key];
    if (!r) continue;
    switch (r.type) {
      case "ACTION": if (r.completed) count++; break;
      case "JOURNAL_PROMPT": if (r.entries?.some((e: string) => e?.trim())) count++; break;
      case "WORKSHEET": if (r.rows?.some((row: any) => Object.values(row).some((v: any) => (v as string)?.trim?.()))) count++; break;
      case "CHOICE": if (r.selectedIndex >= 0) count++; break;
      case "RESOURCE_REVIEW": if (r.reviewed) count++; break;
      case "RATING_SCALE": if (r.value >= 0) count++; break;
      case "TIMER": if (r.completed || r.elapsedSeconds > 0) count++; break;
      case "MOOD_CHECK": if (r.mood) count++; break;
      case "HABIT_TRACKER": if (r.done !== undefined) count++; break;
      case "BRING_TO_SESSION": if (r.acknowledged) count++; break;
      case "FREE_TEXT_NOTE": if (r.acknowledged) count++; break;
    }
  }
  return count;
}
