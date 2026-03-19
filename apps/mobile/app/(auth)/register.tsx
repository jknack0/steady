import { useState } from "react";
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

export default function RegisterScreen() {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password) {
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

    const result = await register({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);

    if (result.success) {
      router.replace("/(app)/(tabs)/programs");
    } else {
      setError(result.error || "Registration failed");
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
            Create Account
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", color: "#8A8A8A", marginTop: 4 }}>
            Join STEADY with ADHD
          </Text>
        </View>

        {error ? (
          <View style={{ backgroundColor: "#F5E6E6", borderWidth: 1, borderColor: "#E0BABA", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20, flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="alert-circle" size={18} color="#D4A0A0" />
            <Text style={{ color: "#C08585", fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", marginLeft: 8, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

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
            />
          </View>
        </View>

        <TouchableOpacity
          style={{
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: "center",
            backgroundColor: loading ? "#7BA3A3" : "#5B8A8A",
            shadowColor: "#5B8A8A",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 4,
          }}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="white" />
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
