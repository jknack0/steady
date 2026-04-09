import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useMyReviewForAppointment,
  useSubmitReview,
} from "../../../hooks/use-session-review";

export default function ReviewScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useMyReviewForAppointment(appointmentId);
  const submitReview = useSubmitReview(appointmentId);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedBarriers, setSelectedBarriers] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const isAlreadySubmitted = !!data?.review;
  const template = data?.template;

  const enabledQuestions = template?.questions?.filter((q) => q.enabled) ?? [];
  const enabledBarriers = template?.barriers?.filter((b) => b.enabled) ?? [];

  const toggleBarrier = useCallback((label: string) => {
    setSelectedBarriers((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (!template) return;

    const responses = enabledQuestions.map((q) => ({
      questionId: q.id,
      question: q.text,
      answer: answers[q.id] || "",
    }));

    const hasAtLeastOneAnswer = responses.some((r) => r.answer.trim().length > 0);
    if (!hasAtLeastOneAnswer) {
      Alert.alert("Please answer at least one question before submitting.");
      return;
    }

    submitReview.mutate(
      {
        responses,
        barriers: Array.from(selectedBarriers),
      },
      {
        onSuccess: () => setSubmitted(true),
        onError: (err) => Alert.alert("Error", err.message),
      },
    );
  }, [template, enabledQuestions, answers, selectedBarriers, submitReview]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F5F2" }}>
        <ActivityIndicator size="large" color="#5B8A8A" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F5F2", padding: 24 }}>
        <Ionicons name="alert-circle-outline" size={48} color="#C75A5A" />
        <Text style={{ fontSize: 16, color: "#666", marginTop: 12, textAlign: "center" }}>
          Unable to load review. Make sure you have an upcoming appointment.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: "#5B8A8A", fontSize: 16 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isAlreadySubmitted || submitted) {
    const review = data.review;
    return (
      <ScrollView style={{ flex: 1, backgroundColor: "#F7F5F2" }} contentContainerStyle={{ padding: 20 }}>
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#8FAE8B", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Ionicons name="checkmark" size={28} color="white" />
          </View>
          <Text style={{ fontSize: 18, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D" }}>
            Review Submitted
          </Text>
          <Text style={{ fontSize: 14, color: "#666", marginTop: 4, textAlign: "center" }}>
            Your clinician will see this before your session.
          </Text>
        </View>

        {review && (
          <View style={{ backgroundColor: "white", borderRadius: 12, padding: 16 }}>
            {review.responses.map((r, i) => (
              <View key={i} style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, color: "#999", fontFamily: "PlusJakartaSans_500Medium" }}>
                  {r.question}
                </Text>
                <Text style={{ fontSize: 15, color: "#2D2D2D", marginTop: 4 }}>
                  {r.answer || "No answer provided"}
                </Text>
              </View>
            ))}
            {review.barriers.length > 0 && (
              <View>
                <Text style={{ fontSize: 13, color: "#999", fontFamily: "PlusJakartaSans_500Medium", marginBottom: 8 }}>
                  Barriers
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {review.barriers.map((b, i) => (
                    <View key={i} style={{ backgroundColor: "#F0EDE8", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 12, color: "#666" }}>{b}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ alignSelf: "center", marginTop: 24 }}
        >
          <Text style={{ color: "#5B8A8A", fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold" }}>
            Back to Appointments
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F7F5F2" }} contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D", marginBottom: 4 }}>
        Steady Work Review
      </Text>
      <Text style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>
        Take 5 minutes to reflect on your progress before your session.
      </Text>

      {enabledQuestions.map((q) => (
        <View key={q.id} style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D", marginBottom: 6 }}>
            {q.text}
          </Text>
          <TextInput
            style={{
              backgroundColor: "white",
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#E0DDD8",
              padding: 12,
              fontSize: 15,
              minHeight: 80,
              textAlignVertical: "top",
              color: "#2D2D2D",
            }}
            multiline
            placeholder="Type your answer..."
            placeholderTextColor="#B0ACA5"
            value={answers[q.id] || ""}
            onChangeText={(text) => setAnswers((prev) => ({ ...prev, [q.id]: text }))}
            maxLength={2000}
            accessibilityLabel={q.text}
          />
        </View>
      ))}

      {enabledBarriers.length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D", marginBottom: 8 }}>
            Did anything get in the way?
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {enabledBarriers.map((b) => {
              const isSelected = selectedBarriers.has(b.label);
              return (
                <TouchableOpacity
                  key={b.id}
                  onPress={() => toggleBarrier(b.label)}
                  style={{
                    backgroundColor: isSelected ? "#5B8A8A" : "white",
                    borderWidth: 1,
                    borderColor: isSelected ? "#5B8A8A" : "#E0DDD8",
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                  }}
                  accessibilityLabel={b.label}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                >
                  <Text style={{ fontSize: 13, color: isSelected ? "white" : "#2D2D2D" }}>
                    {b.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitReview.isPending}
        style={{
          backgroundColor: "#5B8A8A",
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: "center",
          opacity: submitReview.isPending ? 0.6 : 1,
          marginBottom: 40,
        }}
      >
        {submitReview.isPending ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: "white", fontSize: 16, fontFamily: "PlusJakartaSans_700Bold" }}>
            Submit Review
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
