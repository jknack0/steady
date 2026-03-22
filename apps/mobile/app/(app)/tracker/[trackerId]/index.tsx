import { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../../lib/api";

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
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F5F2", paddingHorizontal: 32 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#E8F5E9", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
        </View>
        <Text style={{ fontSize: 22, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D", marginBottom: 8 }}>
          All Done!
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", textAlign: "center", marginBottom: 24 }}>
          Your {tracker.name} for today has been saved.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: "#5B8A8A", borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 }}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={{ color: "white", fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 16 }}>
            Back to Home
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F7F5F2" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={{ backgroundColor: "#5B8A8A", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
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
