import { useState } from "react";
import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Types ────────────────────────────────────────────

export interface Part {
  id: string;
  type: string;
  title: string;
  isRequired: boolean;
  content: any;
  sortOrder: number;
  progressStatus: string;
  completedAt: string | null;
}

export interface Module {
  id: string;
  title: string;
  sortOrder: number;
  status: "LOCKED" | "UNLOCKED" | "COMPLETED";
  unlockedAt: string | null;
  completedAt: string | null;
  parts: Part[];
}

export interface ProgramData {
  enrollmentId: string;
  status: string;
  currentModuleId: string | null;
  program: {
    id: string;
    title: string;
    description: string | null;
    cadence: string;
  };
  modules: Module[];
}

// ── Helpers ──────────────────────────────────────────

export function partTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    TEXT: "Reading",
    VIDEO: "Video",
    STRATEGY_CARDS: "Strategy Cards",
    JOURNAL_PROMPT: "Journal",
    CHECKLIST: "Checklist",
    RESOURCE_LINK: "Resource",
    DIVIDER: "Section Break",
  };
  return labels[type] || type;
}

// ── Components ───────────────────────────────────────

export function ModuleStatusIcon({ status }: { status: string }) {
  if (status === "COMPLETED") {
    return (
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#E8F0E7", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="checkmark" size={16} color="#8FAE8B" />
      </View>
    );
  }
  if (status === "UNLOCKED") {
    return (
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#E3EDED", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="play" size={14} color="#5B8A8A" />
      </View>
    );
  }
  return (
    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F0EDE8", alignItems: "center", justifyContent: "center" }}>
      <Ionicons name="lock-closed" size={14} color="#8A8A8A" />
    </View>
  );
}

export function PartRow({
  part,
  enrollmentId,
  moduleStatus,
}: {
  part: Part;
  enrollmentId: string;
  moduleStatus: string;
}) {
  const isAccessible = moduleStatus !== "LOCKED";
  const isCompleted = part.progressStatus === "COMPLETED";

  return (
    <TouchableOpacity
      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#F0EDE8", opacity: isAccessible ? 1 : 0.4 }}
      onPress={() => {
        if (isAccessible) {
          router.push({
            pathname: "/(app)/part/[partId]",
            params: { partId: part.id, enrollmentId },
          });
        }
      }}
      disabled={!isAccessible}
      activeOpacity={0.7}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          borderWidth: 2,
          marginRight: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isCompleted ? "#8FAE8B" : "transparent",
          borderColor: isCompleted ? "#8FAE8B" : "#D4D0CB",
        }}
      >
        {isCompleted ? <Ionicons name="checkmark" size={12} color="white" /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 14,
          fontFamily: isCompleted ? "PlusJakartaSans_400Regular" : "PlusJakartaSans_500Medium",
          color: isCompleted ? "#8A8A8A" : "#2D2D2D",
          textDecorationLine: isCompleted ? "line-through" : "none",
        }}>
          {part.title || partTypeLabel(part.type)}
        </Text>
      </View>
      {part.isRequired ? (
        <View style={{ backgroundColor: "#F5E6E6", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_500Medium", color: "#D4A0A0" }}>Required</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export function ModuleCard({
  mod,
  enrollmentId,
  isCurrent,
}: {
  mod: Module;
  enrollmentId: string;
  isCurrent: boolean;
}) {
  const [expanded, setExpanded] = useState(isCurrent);
  const completedCount = mod.parts.filter((p) => p.progressStatus === "COMPLETED").length;
  const totalParts = mod.parts.length;
  const progress = totalParts > 0 ? completedCount / totalParts : 0;
  const isLocked = mod.status === "LOCKED";
  const canExpand = !isLocked;

  const toggleExpanded = () => {
    if (!canExpand) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        marginBottom: 16,
        overflow: "hidden",
        borderWidth: isCurrent ? 1.5 : 1,
        borderColor: isCurrent ? "#89B4C8" : "#F0EDE8",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <TouchableOpacity
        style={{ flexDirection: "row", alignItems: "center", padding: 16 }}
        onPress={toggleExpanded}
        disabled={!canExpand}
        activeOpacity={0.7}
      >
        <ModuleStatusIcon status={mod.status} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D" }}>{mod.title}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            {isLocked ? (
              <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", color: "#8A8A8A" }}>Locked</Text>
            ) : (
              <>
                <View style={{ flex: 1, height: 6, backgroundColor: "#F0EDE8", borderRadius: 3, marginRight: 8, maxWidth: 100 }}>
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      width: `${progress * 100}%`,
                      backgroundColor: progress === 1 ? "#8FAE8B" : "#5B8A8A",
                    }}
                  />
                </View>
                <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", color: "#8A8A8A" }}>
                  {completedCount}/{totalParts}
                </Text>
              </>
            )}
          </View>
        </View>
        {isCurrent && (
          <View style={{ backgroundColor: "#E3EDED", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginRight: 8 }}>
            <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_700Bold", color: "#5B8A8A" }}>Current</Text>
          </View>
        )}
        {canExpand && (
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color="#8A8A8A"
          />
        )}
      </TouchableOpacity>

      {expanded && canExpand && (
        <View style={{ borderTopWidth: 1, borderTopColor: "#F0EDE8" }}>
          {mod.parts.map((part) => (
            <PartRow
              key={part.id}
              part={part}
              enrollmentId={enrollmentId}
              moduleStatus={mod.status}
            />
          ))}
        </View>
      )}
    </View>
  );
}
