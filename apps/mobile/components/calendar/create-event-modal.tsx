import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MODAL_HOURS, TEAL, TEXT_PRIMARY, TEXT_SECONDARY } from "./constants";
import { formatHour } from "./helpers";

interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; startHour: number; durationMinutes: number }) => void;
}

export function CreateEventModal({ visible, onClose, onSubmit }: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [startHour, setStartHour] = useState(9);
  const [durationMinutes, setDurationMinutes] = useState(60);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), startHour, durationMinutes });
    setTitle("");
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, justifyContent: "flex-end" }}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.25)" }}
          onPress={onClose}
          activeOpacity={1}
        />
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingBottom: 32,
            paddingTop: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 10,
          }}
        >
          {/* Handle bar */}
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#D4D0CB",
              alignSelf: "center",
              marginBottom: 20,
            }}
          />

          <Text
            style={{
              fontSize: 20,
              fontFamily: "PlusJakartaSans_700Bold",
              color: TEXT_PRIMARY,
              marginBottom: 20,
            }}
          >
            New Time Block
          </Text>

          <TextInput
            style={{
              borderWidth: 1,
              borderColor: "#D4D0CB",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              fontFamily: "PlusJakartaSans_400Regular",
              color: TEXT_PRIMARY,
              marginBottom: 16,
              backgroundColor: "#F7F5F2",
            }}
            placeholder="What are you working on?"
            placeholderTextColor="#D4D0CB"
            value={title}
            onChangeText={setTitle}
            autoFocus
          />

          <Text
            style={{
              fontSize: 14,
              fontFamily: "PlusJakartaSans_600SemiBold",
              color: TEXT_SECONDARY,
              marginBottom: 8,
            }}
          >
            Start Time
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {MODAL_HOURS.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 12,
                    backgroundColor: startHour === h ? TEAL : "#F0EDE8",
                  }}
                  onPress={() => setStartHour(h)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "PlusJakartaSans_500Medium",
                      color: startHour === h ? "#FFFFFF" : "#5A5A5A",
                    }}
                  >
                    {formatHour(h)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text
            style={{
              fontSize: 14,
              fontFamily: "PlusJakartaSans_600SemiBold",
              color: TEXT_SECONDARY,
              marginBottom: 8,
            }}
          >
            Duration
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
            {[30, 60, 90, 120].map((d) => (
              <TouchableOpacity
                key={d}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: durationMinutes === d ? TEAL : "#F0EDE8",
                }}
                onPress={() => setDurationMinutes(d)}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "PlusJakartaSans_600SemiBold",
                    color: durationMinutes === d ? "#FFFFFF" : "#5A5A5A",
                  }}
                >
                  {d < 60 ? `${d}m` : `${d / 60}h`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={{
              backgroundColor: TEAL,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              shadowColor: TEAL,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <Text
              style={{
                color: "white",
                fontFamily: "PlusJakartaSans_700Bold",
                fontSize: 16,
              }}
            >
              Add Event
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
