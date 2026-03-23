import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Animated,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface PendingRtmConsent {
  id: string;
  monitoringType: string;
  startDate: string;
  clinician: {
    user: { firstName: string; lastName: string };
    practiceName: string | null;
  };
}

export function RtmConsentModal() {
  const queryClient = useQueryClient();
  const [signatureName, setSignatureName] = useState("");
  const [accepted, setAccepted] = useState([false, false, false]);
  const contentScale = useRef(new Animated.Value(0)).current;

  const { data: pending } = useQuery<PendingRtmConsent | null>({
    queryKey: ["rtm-pending-consent"],
    queryFn: async () => {
      const res = await api.getPendingRtmConsent();
      return res.data ?? null;
    },
    refetchInterval: 60000,
  });

  const submitConsent = useMutation({
    mutationFn: async () => {
      if (!pending) return;
      return api.submitRtmConsent({
        rtmEnrollmentId: pending.id,
        consentGiven: true,
        signatureName: signatureName.trim(),
      });
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["rtm-pending-consent"] });
    },
  });

  const visible = !!pending;
  const allAccepted = accepted.every(Boolean);
  const canSubmit = allAccepted && signatureName.trim().length > 0 && !submitConsent.isPending;

  useEffect(() => {
    if (visible) {
      contentScale.setValue(0);
      Animated.spring(contentScale, {
        toValue: 1,
        damping: 12,
        stiffness: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const toggleCheckbox = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAccepted((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  if (!pending) return null;

  const clinicianName = `${pending.clinician.user.firstName} ${pending.clinician.user.lastName}`.trim();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(45, 45, 45, 0.85)",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <Animated.View
          style={{
            transform: [{ scale: contentScale }],
            width: Math.min(SCREEN_WIDTH - 48, 400),
            maxHeight: "85%",
          }}
        >
          <ScrollView
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
            }}
            contentContainerStyle={{ padding: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: "#E8F4F4",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons name="shield-checkmark" size={28} color="#5B8A8A" />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontFamily: "PlusJakartaSans_700Bold",
                  color: "#2D2D2D",
                  textAlign: "center",
                }}
              >
                Care Monitoring Update
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "PlusJakartaSans_400Regular",
                  color: "#6B7280",
                  textAlign: "center",
                  marginTop: 8,
                  lineHeight: 20,
                }}
              >
                {clinicianName} wants to monitor your progress between sessions
                to provide better care.
              </Text>
            </View>

            {/* Explanation */}
            <View
              style={{
                backgroundColor: "#F9FAFB",
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "PlusJakartaSans_400Regular",
                  color: "#374151",
                  lineHeight: 22,
                }}
              >
                Your therapist will review your app activity between sessions —
                things like check-ins, homework, and trackers — to help guide
                your treatment. You'll continue using the app as usual. This
                monitoring may be covered by your insurance.
              </Text>
            </View>

            {/* Checkboxes */}
            <View style={{ marginBottom: 20, gap: 12 }}>
              {[
                "I understand my therapist will review my app data between sessions",
                "I understand my insurance may be billed for this monitoring service",
                "I understand I may have a copay or coinsurance for this service",
              ].map((label, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => toggleCheckbox(i)}
                  style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: accepted[i] ? "#5B8A8A" : "#D1D5DB",
                      backgroundColor: accepted[i] ? "#5B8A8A" : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 1,
                    }}
                  >
                    {accepted[i] && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontFamily: "PlusJakartaSans_400Regular",
                      color: "#374151",
                      lineHeight: 19,
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Signature */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                  color: "#374151",
                  marginBottom: 6,
                }}
              >
                Your full name (digital signature)
              </Text>
              <TextInput
                value={signatureName}
                onChangeText={setSignatureName}
                placeholder="Type your full name"
                placeholderTextColor="#9CA3AF"
                style={{
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  fontFamily: "PlusJakartaSans_400Regular",
                  color: "#2D2D2D",
                }}
                autoCapitalize="words"
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={() => submitConsent.mutate()}
              disabled={!canSubmit}
              style={{
                backgroundColor: canSubmit ? "#5B8A8A" : "#D1D5DB",
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
              activeOpacity={0.8}
            >
              {submitConsent.isPending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="white" />
                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: "PlusJakartaSans_700Bold",
                      color: "white",
                    }}
                  >
                    I Consent
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Skip for now */}
            <TouchableOpacity
              onPress={() => {
                queryClient.setQueryData(["rtm-pending-consent"], null);
              }}
              style={{
                alignItems: "center",
                paddingVertical: 12,
                marginTop: 4,
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "PlusJakartaSans_500Medium",
                  color: "#9CA3AF",
                }}
              >
                Not right now
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
