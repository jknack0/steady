import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  AccessibilityInfo,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ConfettiCannon from "react-native-confetti-cannon";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ── Module Completion Overlay ────────────

interface ModuleCompletionOverlayProps {
  visible: boolean;
  onDismiss: () => void;
}

export function ModuleCompletionOverlay({ visible, onDismiss }: ModuleCompletionOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 150, useNativeDriver: true }),
      ]).start();

      // Auto-dismiss after 3 seconds
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    } else {
      opacity.setValue(0);
      scale.setValue(0.8);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}
        onPress={onDismiss}
        activeOpacity={1}
        accessibilityLabel="Module complete! Tap to dismiss"
        accessibilityRole="button"
      >
        <Animated.View
          style={{
            opacity,
            transform: [{ scale }],
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            padding: 32,
            alignItems: "center",
            width: SCREEN_WIDTH - 64,
          }}
        >
          <View style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: "#E8F5E9", alignItems: "center", justifyContent: "center",
            marginBottom: 16,
          }}>
            <Ionicons name="trophy" size={32} color="#8FAE8B" />
          </View>
          <Text style={{ fontSize: 22, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D", marginBottom: 8 }}>
            Module Complete!
          </Text>
          <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", textAlign: "center" }}>
            Great work! You're making real progress.
          </Text>
        </Animated.View>

        {!reducedMotion && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none" }}>
            <ConfettiCannon
              count={80}
              origin={{ x: SCREEN_WIDTH / 2, y: -20 }}
              fadeOut
              autoStart
              fallSpeed={3000}
              explosionSpeed={300}
            />
          </View>
        )}
      </TouchableOpacity>
    </Modal>
  );
}

// ── Milestone Celebration Bottom Sheet ────────────

interface MilestoneCelebrationProps {
  milestone: 7 | 14 | 21 | 30;
  category: string;
  visible: boolean;
  onDismiss: () => void;
}

const MILESTONE_MESSAGES: Record<number, string> = {
  7: "One week strong! Your consistency is paying off.",
  14: "Two weeks! You're building a real habit.",
  21: "Three weeks of dedication. You're unstoppable!",
  30: "30 days! This is a major milestone. Be proud.",
};

const CATEGORY_LABELS: Record<string, string> = {
  JOURNAL: "journaling",
  CHECKIN: "checking in",
  HOMEWORK: "homework",
};

export function MilestoneCelebration({ milestone, category, visible, onDismiss }: MilestoneCelebrationProps) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 15,
        stiffness: 150,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [visible]);

  if (!visible) return null;

  const categoryLabel = CATEGORY_LABELS[category] || category.toLowerCase();

  return (
    <Modal transparent visible={visible} animationType="none">
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" }}
        onPress={onDismiss}
        activeOpacity={1}
      >
        <Animated.View
          style={{
            transform: [{ translateY: slideAnim }],
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 40,
          }}
        >
          {/* Handle bar */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#D4D0CB", alignSelf: "center", marginBottom: 20 }} />

          <View style={{ alignItems: "center" }}>
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: "#C4A84D18", alignItems: "center", justifyContent: "center",
              marginBottom: 16,
            }}>
              <Ionicons name="flame" size={28} color="#C4A84D" />
            </View>

            <Text style={{ fontSize: 40, fontFamily: "PlusJakartaSans_700Bold", color: "#C4A84D", marginBottom: 4 }}>
              {milestone}
            </Text>
            <Text style={{ fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold", color: "#2D2D2D", marginBottom: 8 }}>
              day {categoryLabel} streak!
            </Text>
            <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", textAlign: "center", marginBottom: 24 }}>
              {MILESTONE_MESSAGES[milestone]}
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: "#5B8A8A",
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 48,
              }}
              onPress={onDismiss}
              activeOpacity={0.8}
              accessibilityLabel="Keep going! Dismiss milestone celebration"
              accessibilityRole="button"
            >
              <Text style={{ color: "white", fontFamily: "PlusJakartaSans_700Bold", fontSize: 16 }}>
                Keep going!
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}
