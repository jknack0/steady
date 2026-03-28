import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";

const INVITE_PREFIX = "STEADY-";

function formatInviteCode(raw: string): string {
  const upper = raw.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  // If user typed or pasted a full code with prefix, keep it
  if (upper.startsWith(INVITE_PREFIX)) {
    return upper;
  }
  // Strip any partial "STEADY" prefix the user may have typed manually
  const stripped = upper.replace(/^S?T?E?A?D?Y?-?/, "");
  if (stripped.length === 0) return "";
  return `${INVITE_PREFIX}${stripped}`;
}

function mapErrorMessage(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes("invalid") && lower.includes("code")) {
    return "Invalid invite code. Please check and try again.";
  }
  if (lower.includes("expired")) {
    return "This invite code has expired. Please contact your clinician for a new one.";
  }
  if (lower.includes("already been used") || lower.includes("already used") || lower.includes("redeemed")) {
    return "This invite code has already been used.";
  }
  if (lower.includes("email") && (lower.includes("taken") || lower.includes("already") || lower.includes("exists") || lower.includes("registered"))) {
    return "This email is already registered. Try logging in instead.";
  }
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("connection")) {
    return "Something went wrong. Check your connection and try again.";
  }
  return error;
}

export default function RegisterScreen() {
  const { register } = useAuth();
  const [inviteCode, setInviteCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isFormComplete =
    inviteCode.length > INVITE_PREFIX.length &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0;

  const handleInviteCodeChange = useCallback((text: string) => {
    // Allow clearing the field
    if (text.length === 0) {
      setInviteCode("");
      return;
    }
    setInviteCode(formatInviteCode(text));
  }, []);

  const handleRegister = async () => {
    if (!isFormComplete) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await register({
        inviteCode: inviteCode.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      setLoading(false);

      if (result.success) {
        router.replace("/(app)/(tabs)/programs");
      } else {
        setError(mapErrorMessage(result.error || "Registration failed"));
      }
    } catch {
      setLoading(false);
      setError("Something went wrong. Check your connection and try again.");
    }
  };

  const inputStyle = {
    flex: 1,
    paddingVertical: 14,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#2D2D2D",
  };

  const inputContainerStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: "#D4D0CB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#F7F5F2" }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        style={{ paddingHorizontal: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View style={{ alignItems: "center", marginBottom: 32, marginTop: 32 }}>
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: "#5B8A8A", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Ionicons name="pulse" size={28} color="white" />
          </View>
          <Text style={{ fontSize: 24, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D", letterSpacing: -0.3 }}>
            Join Steady
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", marginTop: 4 }}>
            Enter your invite code to get started
          </Text>
        </View>

        {error ? (
          <View
            accessible
            accessibilityRole="alert"
            style={{ backgroundColor: "#F5E6E6", borderWidth: 1, borderColor: "#E0BABA", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20, flexDirection: "row", alignItems: "center" }}
          >
            <Ionicons name="alert-circle" size={18} color="#D4A0A0" />
            <Text style={{ color: "#C08585", fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", marginLeft: 8, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        {/* Invite Code */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5A5A5A", marginBottom: 8, marginLeft: 4 }}>Invite Code</Text>
          <View style={inputContainerStyle}>
            <Ionicons name="ticket-outline" size={18} color="#8A8A8A" />
            <TextInput
              style={{
                ...inputStyle,
                fontFamily: "PlusJakartaSans_600SemiBold",
                letterSpacing: 1,
              }}
              placeholder="STEADY-"
              placeholderTextColor="#D4D0CB"
              value={inviteCode}
              onChangeText={handleInviteCodeChange}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5A5A5A", marginBottom: 8, marginLeft: 4 }}>First Name</Text>
            <View style={inputContainerStyle}>
              <Ionicons name="person-outline" size={18} color="#8A8A8A" />
              <TextInput
                style={inputStyle}
                placeholder="First"
                placeholderTextColor="#D4D0CB"
                value={firstName}
                onChangeText={setFirstName}
                autoComplete="given-name"
                editable={!loading}
              />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5A5A5A", marginBottom: 8, marginLeft: 4 }}>Last Name</Text>
            <View style={inputContainerStyle}>
              <TextInput
                style={{ ...inputStyle, marginLeft: 0 }}
                placeholder="Last"
                placeholderTextColor="#D4D0CB"
                value={lastName}
                onChangeText={setLastName}
                autoComplete="family-name"
                editable={!loading}
              />
            </View>
          </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5A5A5A", marginBottom: 8, marginLeft: 4 }}>Email</Text>
          <View style={inputContainerStyle}>
            <Ionicons name="mail-outline" size={18} color="#8A8A8A" />
            <TextInput
              style={inputStyle}
              placeholder="you@example.com"
              placeholderTextColor="#D4D0CB"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
          </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5A5A5A", marginBottom: 8, marginLeft: 4 }}>Password</Text>
          <View style={inputContainerStyle}>
            <Ionicons name="lock-closed-outline" size={18} color="#8A8A8A" />
            <TextInput
              style={inputStyle}
              placeholder="At least 8 characters"
              placeholderTextColor="#D4D0CB"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#8A8A8A"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5A5A5A", marginBottom: 8, marginLeft: 4 }}>Confirm Password</Text>
          <View style={inputContainerStyle}>
            <Ionicons name="lock-closed-outline" size={18} color="#8A8A8A" />
            <TextInput
              style={inputStyle}
              placeholder="Confirm your password"
              placeholderTextColor="#D4D0CB"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
          </View>
        </View>

        <TouchableOpacity
          style={{
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            backgroundColor: !isFormComplete || loading ? "#7BA3A3" : "#5B8A8A",
            shadowColor: "#5B8A8A",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 4,
            opacity: !isFormComplete ? 0.6 : 1,
          }}
          onPress={handleRegister}
          disabled={!isFormComplete || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <>
              <ActivityIndicator color="white" style={{ marginRight: 8 }} />
              <Text style={{ color: "white", fontFamily: "PlusJakartaSans_700Bold", fontSize: 16 }}>Creating account...</Text>
            </>
          ) : (
            <Text style={{ color: "white", fontFamily: "PlusJakartaSans_700Bold", fontSize: 16 }}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 24, marginBottom: 32 }}>
          <Text style={{ color: "#8A8A8A", fontFamily: "PlusJakartaSans_400Regular" }}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={{ color: "#5B8A8A", fontFamily: "PlusJakartaSans_700Bold" }}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
