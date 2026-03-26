import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import ConfettiCannon from "react-native-confetti-cannon";
import { api } from "../../../../lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ENCOURAGEMENTS = [
  { emoji: "🎯", message: "Showing up is the hardest part — and you just did it." },
  { emoji: "💪", message: "Every check-in is a step forward. Keep building momentum." },
  { emoji: "🌟", message: "Self-awareness is a superpower. You're getting stronger." },
  { emoji: "🧠", message: "Tracking builds insight. You're learning more about yourself." },
  { emoji: "🌊", message: "Consistency over perfection. You're doing great." },
];

interface TrackerField {
  id: string;
  label: string;
  fieldType: "SCALE" | "NUMBER" | "YES_NO" | "MULTI_CHECK" | "FREE_TEXT" | "TIME";
  options: any;
  sortOrder: number;
  isRequired: boolean;
}

// ── Field Renderers ──────────────────────────────────

function ScaleField({
  field,
  value,
  onChange,
}: {
  field: TrackerField;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  const opts = field.options || { min: 0, max: 10 };
  const points: number[] = [];
  for (let i = opts.min; i <= opts.max; i++) points.push(i);

  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
        {points.map((point) => {
          const selected = value === point;
          return (
            <TouchableOpacity
              key={point}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
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
                  fontSize: 15,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                  color: selected ? "white" : "#5A5A5A",
                }}
              >
                {point}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {(opts.minLabel || opts.maxLabel) && (
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
          <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", maxWidth: "40%" }}>
            {opts.minLabel || ""}
          </Text>
          <Text style={{ fontSize: 11, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", maxWidth: "40%", textAlign: "right" }}>
            {opts.maxLabel || ""}
          </Text>
        </View>
      )}
    </View>
  );
}

function NumberField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
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
      keyboardType="numeric"
      value={value}
      onChangeText={onChange}
      placeholder="0"
      placeholderTextColor="#D4D0CB"
    />
  );
}

function YesNoField({ value, onChange }: { value: boolean | undefined; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      {[true, false].map((option) => {
        const selected = value === option;
        return (
          <TouchableOpacity
            key={String(option)}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: selected ? "#5B8A8A" : "#D4D0CB",
              backgroundColor: selected ? "#5B8A8A" : "#FFFFFF",
              alignItems: "center",
            }}
            onPress={() => onChange(option)}
          >
            <Text
              style={{
                fontSize: 16,
                fontFamily: "PlusJakartaSans_600SemiBold",
                color: selected ? "white" : "#2D2D2D",
              }}
            >
              {option ? "Yes" : "No"}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MultiCheckField({
  field,
  value,
  onChange,
}: {
  field: TrackerField;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const choices: string[] = field.options?.choices || [];
  return (
    <View>
      {choices.map((choice) => {
        const selected = value.includes(choice);
        return (
          <TouchableOpacity
            key={choice}
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
                ? value.filter((v) => v !== choice)
                : [...value, choice];
              onChange(updated);
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
              {selected && <Ionicons name="checkmark" size={12} color="white" />}
            </View>
            <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_400Regular", color: "#2D2D2D" }}>
              {choice}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function FreeTextField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
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
        minHeight: 80,
      }}
      multiline
      textAlignVertical="top"
      value={value}
      onChangeText={onChange}
      placeholder="Type here..."
      placeholderTextColor="#D4D0CB"
    />
  );
}

function TimeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
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
      value={value}
      onChangeText={onChange}
      placeholder="HH:MM"
      placeholderTextColor="#D4D0CB"
      keyboardType="numbers-and-punctuation"
    />
  );
}

// ── Check-in Celebration ─────────────────────────────

function CheckInCelebration({ trackerName, streak }: { trackerName: string; streak: number }) {
  const confettiRef = useRef<any>(null);
  const cardScale = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const streakSlide = useRef(new Animated.Value(30)).current;
  const streakOpacity = useRef(new Animated.Value(0)).current;

  const encouragement = useRef(
    ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]
  ).current;

  useEffect(() => {
    // Haptic burst
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Fire confetti
    setTimeout(() => confettiRef.current?.start(), 100);

    // Card springs in
    Animated.spring(cardScale, {
      toValue: 1,
      damping: 12,
      stiffness: 130,
      delay: 200,
      useNativeDriver: true,
    }).start();

    // Checkmark bounces
    Animated.sequence([
      Animated.delay(400),
      Animated.spring(checkScale, {
        toValue: 1.2,
        damping: 6,
        stiffness: 200,
        useNativeDriver: true,
      }),
      Animated.spring(checkScale, {
        toValue: 1,
        damping: 10,
        stiffness: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Streak slides up
    Animated.parallel([
      Animated.timing(streakSlide, {
        toValue: 0,
        duration: 500,
        delay: 700,
        useNativeDriver: true,
      }),
      Animated.timing(streakOpacity, {
        toValue: 1,
        duration: 400,
        delay: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F5F2", justifyContent: "center", alignItems: "center" }}>
      <ConfettiCannon
        ref={confettiRef}
        count={80}
        origin={{ x: SCREEN_WIDTH / 2, y: -20 }}
        autoStart={false}
        fadeOut
        fallSpeed={2500}
        explosionSpeed={400}
        colors={["#5B8A8A", "#8FAE8B", "#C4A84D", "#D4A0A0", "#89B4C8", "#F5ECD7"]}
      />

      <Animated.View
        style={{
          transform: [{ scale: cardScale }],
          opacity: cardScale,
          width: SCREEN_WIDTH - 48,
          backgroundColor: "#FFFFFF",
          borderRadius: 28,
          padding: 36,
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.12,
          shadowRadius: 32,
          elevation: 16,
        }}
      >
        {/* Animated checkmark */}
        <Animated.View
          style={{
            transform: [{ scale: checkScale }],
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "#8FAE8B",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
            shadowColor: "#8FAE8B",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
          }}
        >
          <Text style={{ fontSize: 36, color: "white" }}>✓</Text>
        </Animated.View>

        <Text
          style={{
            fontSize: 14,
            fontFamily: "PlusJakartaSans_600SemiBold",
            color: "#8FAE8B",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          Check-in Complete
        </Text>

        <Text
          style={{
            fontSize: 22,
            fontFamily: "PlusJakartaSans_700Bold",
            color: "#2D2D2D",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          {trackerName}
        </Text>

        {/* Streak badge */}
        <Animated.View
          style={{
            transform: [{ translateY: streakSlide }],
            opacity: streakOpacity,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: streak >= 7 ? "#C4A84D15" : "#5B8A8A15",
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 10,
            marginBottom: 16,
          }}
        >
          <Ionicons
            name="flame"
            size={20}
            color={streak >= 7 ? "#C4A84D" : "#5B8A8A"}
          />
          <Text
            style={{
              fontSize: 17,
              fontFamily: "PlusJakartaSans_700Bold",
              color: streak >= 7 ? "#C4A84D" : "#5B8A8A",
              marginLeft: 6,
            }}
          >
            {streak} day{streak !== 1 ? "s" : ""} in a row
          </Text>
        </Animated.View>

        {/* Encouragement */}
        <Text style={{ fontSize: 28, marginBottom: 8 }}>{encouragement.emoji}</Text>
        <Text
          style={{
            fontSize: 15,
            fontFamily: "PlusJakartaSans_400Regular",
            color: "#5A5A5A",
            textAlign: "center",
            lineHeight: 22,
            marginBottom: 28,
            paddingHorizontal: 8,
          }}
        >
          {encouragement.message}
        </Text>

        <TouchableOpacity
          style={{
            backgroundColor: "#5B8A8A",
            borderRadius: 14,
            paddingVertical: 14,
            paddingHorizontal: 48,
            width: "100%",
            alignItems: "center",
          }}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text
            style={{
              color: "white",
              fontFamily: "PlusJakartaSans_700Bold",
              fontSize: 16,
            }}
          >
            Done
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Main Form ────────────────────────────────────────

export default function TrackerFormScreen() {
  const { trackerId } = useLocalSearchParams<{ trackerId: string }>();
  const queryClient = useQueryClient();
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const { data, isLoading } = useQuery({
    queryKey: ["tracker-today", trackerId],
    queryFn: async () => {
      const res = await api.getTrackerToday(trackerId!);
      if (!res.success) throw new Error(res.error);
      return res.data as { tracker: { id: string; name: string; description: string | null; fields: TrackerField[] }; entry: any };
    },
    enabled: !!trackerId,
  });

  // Pre-fill responses from existing entry
  useState(() => {
    if (data?.entry) {
      setResponses(data.entry.responses || {});
      setSubmitted(true);
    }
  });

  const streakQuery = useQuery({
    queryKey: ["tracker-streak", trackerId],
    queryFn: async () => {
      const res = await api.getTrackerStreak(trackerId!);
      if (!res.success) throw new Error(res.error);
      return res.data as { currentStreak: number; longestStreak: number };
    },
    enabled: submitted,
  });

  const submitMutation = useMutation({
    mutationFn: () => api.submitTrackerEntry(trackerId!, today, responses),
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["participant-daily-trackers"] });
      queryClient.invalidateQueries({ queryKey: ["tracker-streak", trackerId] });
      queryClient.invalidateQueries({ queryKey: ["tracker-today", trackerId] });
    },
  });

  const updateResponse = (fieldId: string, value: any) => {
    setResponses((prev) => ({ ...prev, [fieldId]: value }));
  };

  if (isLoading || !data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F5F2" }}>
        <ActivityIndicator size="large" color="#5B8A8A" />
      </View>
    );
  }

  const { tracker } = data;
  const fields = [...tracker.fields].sort((a, b) => a.sortOrder - b.sortOrder);

  if (submitted) {
    return <CheckInCelebration trackerName={tracker.name} streak={streakQuery.data?.currentStreak ?? 1} />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F7F5F2" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={{ backgroundColor: "#5B8A8A", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
        <Text style={{ fontSize: 22, fontFamily: "PlusJakartaSans_700Bold", color: "white" }}>
          {tracker.name}
        </Text>
        {tracker.description && (
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
            {tracker.description}
          </Text>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {fields.map((field, index) => (
          <View
            key={field.id}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "#F0EDE8",
            }}
          >
            <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5A5A5A", marginBottom: 10 }}>
              {field.label}
              {field.isRequired && <Text style={{ color: "#D4A0A0" }}> *</Text>}
            </Text>

            {field.fieldType === "SCALE" && (
              <ScaleField
                field={field}
                value={responses[field.id]}
                onChange={(v) => updateResponse(field.id, v)}
              />
            )}
            {field.fieldType === "NUMBER" && (
              <NumberField
                value={responses[field.id]?.toString() || ""}
                onChange={(v) => updateResponse(field.id, parseFloat(v) || 0)}
              />
            )}
            {field.fieldType === "YES_NO" && (
              <YesNoField
                value={responses[field.id]}
                onChange={(v) => updateResponse(field.id, v)}
              />
            )}
            {field.fieldType === "MULTI_CHECK" && (
              <MultiCheckField
                field={field}
                value={responses[field.id] || []}
                onChange={(v) => updateResponse(field.id, v)}
              />
            )}
            {field.fieldType === "FREE_TEXT" && (
              <FreeTextField
                value={responses[field.id] || ""}
                onChange={(v) => updateResponse(field.id, v)}
              />
            )}
            {field.fieldType === "TIME" && (
              <TimeField
                value={responses[field.id] || ""}
                onChange={(v) => updateResponse(field.id, v)}
              />
            )}
          </View>
        ))}
      </ScrollView>

      {/* Submit button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingVertical: 16,
          paddingBottom: 32,
          backgroundColor: "#F7F5F2",
          borderTopWidth: 1,
          borderTopColor: "#F0EDE8",
        }}
      >
        <TouchableOpacity
          style={{
            backgroundColor: "#5B8A8A",
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
          }}
          onPress={() => submitMutation.mutate()}
          disabled={submitMutation.isPending}
          activeOpacity={0.8}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={{ fontSize: 17, fontFamily: "PlusJakartaSans_700Bold", color: "white" }}>
              Submit Check-in
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
