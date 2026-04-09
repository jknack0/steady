import { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  AccessibilityInfo,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  FEELINGS_WHEEL,
  getEmotionLabel,
  getEmotionColor,
} from "@steady/shared";
import type { EmotionCategory, EmotionSecondary } from "@steady/shared";

interface FeelingWheelFieldProps {
  value: string[];
  onChange: (ids: string[]) => void;
  maxSelections: number;
  disabled?: boolean;
}

export function FeelingWheelField({
  value,
  onChange,
  maxSelections,
  disabled,
}: FeelingWheelFieldProps) {
  const [activePrimary, setActivePrimary] = useState<EmotionCategory | null>(null);
  const [activeSecondary, setActiveSecondary] = useState<EmotionSecondary | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const drillAnim = useRef(new Animated.Value(0)).current;
  const tertiaryAnim = useRef(new Animated.Value(0)).current;

  const addSelection = (emotionId: string) => {
    if (value.includes(emotionId)) return;

    // If at max, replace most-specific existing selection from same primary, or shake
    if (value.length >= maxSelections) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -2, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 2, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Remove any ancestor/descendant of this selection
    const filtered = value.filter(
      (id) => !emotionId.startsWith(id + ".") && !id.startsWith(emotionId + ".") && id !== emotionId
    );
    onChange([...filtered, emotionId]);
  };

  const removeSelection = (emotionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(value.filter((id) => id !== emotionId));
  };

  const openPrimary = (cat: EmotionCategory) => {
    if (disabled) return;
    setActiveSecondary(null);
    if (activePrimary?.id === cat.id) {
      // Collapse
      setActivePrimary(null);
      drillAnim.setValue(0);
      return;
    }
    setActivePrimary(cat);
    drillAnim.setValue(0);
    Animated.spring(drillAnim, {
      toValue: 1,
      damping: 18,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  };

  const openSecondary = (sec: EmotionSecondary) => {
    if (disabled) return;
    if (activeSecondary?.id === sec.id) {
      // Select the secondary itself
      addSelection(sec.id);
      return;
    }
    setActiveSecondary(sec);
    tertiaryAnim.setValue(0);
    Animated.spring(tertiaryAnim, {
      toValue: 1,
      damping: 18,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  };

  const selectTertiary = (tertiaryId: string) => {
    if (disabled) return;
    addSelection(tertiaryId);
  };

  const isSelected = (id: string) =>
    value.some((v) => v === id || v.startsWith(id + ".") || id.startsWith(v + "."));

  return (
    <View style={{ opacity: disabled ? 0.6 : 1 }}>
      {/* Selected Chips */}
      {value.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <Text
              style={{
                fontSize: 10,
                fontFamily: "PlusJakartaSans_400Regular",
                color: "#8A8A8A",
                textAlign: "right",
                marginBottom: 4,
              }}
              accessibilityLabel={`${value.length} of ${maxSelections} emotions selected`}
            >
              {value.length}/{maxSelections}
            </Text>
          </Animated.View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
          >
            {value.map((emotionId) => {
              const color = getEmotionColor(emotionId);
              const label = getEmotionLabel(emotionId) || emotionId;
              return (
                <View
                  key={emotionId}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: color,
                    borderRadius: 16,
                    height: 32,
                    paddingLeft: 12,
                    paddingRight: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "PlusJakartaSans_600SemiBold",
                      color: "white",
                      marginRight: 4,
                    }}
                  >
                    {label}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeSelection(emotionId)}
                    disabled={disabled}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                    accessibilityLabel={`Remove ${label}`}
                    accessibilityRole="button"
                  >
                    <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.8)" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Category Ring */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {FEELINGS_WHEEL.map((cat) => {
          const isActive = activePrimary?.id === cat.id;
          const isFaded = activePrimary !== null && !isActive;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => openPrimary(cat)}
              disabled={disabled}
              accessibilityLabel={`Select ${cat.label} category`}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive || isSelected(cat.id) }}
              style={{
                width: 80,
                height: 40,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: cat.color,
                backgroundColor: isActive ? cat.color : cat.color + "26",
                alignItems: "center",
                justifyContent: "center",
                opacity: isFaded ? 0.4 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                  color: isActive ? "white" : cat.color,
                }}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Secondary List */}
      {activePrimary && (
        <Animated.View
          style={{
            marginTop: 12,
            backgroundColor: activePrimary.color + "14",
            borderRadius: 12,
            padding: 12,
            opacity: drillAnim,
            transform: [
              {
                translateY: drillAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          }}
        >
          {/* Header */}
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: 8,
              borderBottomWidth: 1,
              borderBottomColor: activePrimary.color + "20",
              marginBottom: 4,
            }}
            onPress={() => {
              addSelection(activePrimary.id);
              setActivePrimary(null);
            }}
            accessibilityLabel={`Select ${activePrimary.label}`}
            accessibilityRole="button"
          >
            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "PlusJakartaSans_700Bold",
                  color: activePrimary.color,
                }}
              >
                {activePrimary.label}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "PlusJakartaSans_400Regular",
                  color: "#8A8A8A",
                  marginTop: 1,
                }}
              >
                Tap to select, or refine below
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={activePrimary.color} />
          </TouchableOpacity>

          {/* Secondary items */}
          {activePrimary.children.map((sec) => {
            const isSecActive = activeSecondary?.id === sec.id;
            return (
              <View key={sec.id}>
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    height: 44,
                    paddingHorizontal: 4,
                    backgroundColor: isSecActive ? activePrimary.color + "18" : "transparent",
                    borderRadius: 8,
                  }}
                  onPress={() => openSecondary(sec)}
                  accessibilityLabel={`Select ${sec.label}, subcategory of ${activePrimary.label}`}
                  accessibilityRole="button"
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: activePrimary.color,
                      marginRight: 10,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "PlusJakartaSans_500Medium",
                      color: "#2D2D2D",
                      flex: 1,
                    }}
                  >
                    {sec.label}
                  </Text>
                  {sec.children.length > 0 && (
                    <Ionicons
                      name={isSecActive ? "chevron-down" : "chevron-forward"}
                      size={14}
                      color="#8A8A8A"
                    />
                  )}
                </TouchableOpacity>

                {/* Tertiary chips */}
                {isSecActive && sec.children.length > 0 && (
                  <Animated.View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 6,
                      paddingLeft: 22,
                      paddingVertical: 8,
                      opacity: tertiaryAnim,
                      transform: [
                        {
                          translateY: tertiaryAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [12, 0],
                          }),
                        },
                      ],
                    }}
                  >
                    {/* Back chip */}
                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: "#F0EDE8",
                        paddingHorizontal: 10,
                      }}
                      onPress={() => setActiveSecondary(null)}
                      accessibilityLabel="Go back"
                      accessibilityRole="button"
                    >
                      <Ionicons name="arrow-back" size={12} color="#5A5A5A" />
                    </TouchableOpacity>

                    {sec.children.map((ter) => {
                      const selected = value.includes(ter.id);
                      return (
                        <TouchableOpacity
                          key={ter.id}
                          style={{
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: selected
                              ? activePrimary.color
                              : activePrimary.color + "1F",
                            paddingHorizontal: 12,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onPress={() => selectTertiary(ter.id)}
                          disabled={disabled}
                          accessibilityLabel={`Select ${ter.label}, subcategory of ${sec.label}, category ${activePrimary.label}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontFamily: "PlusJakartaSans_400Regular",
                              color: selected ? "white" : "#2D2D2D",
                            }}
                          >
                            {ter.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </Animated.View>
                )}
              </View>
            );
          })}
        </Animated.View>
      )}
    </View>
  );
}
