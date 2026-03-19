import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setError("");
    setLoading(true);

    const result = await login(email.trim().toLowerCase(), password);
    setLoading(false);

    if (result.success) {
      router.replace("/(app)/(tabs)/programs");
    } else {
      setError(result.error || "Login failed");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#F7F5F2" }}
    >
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 32 }}>
        {/* Brand Header */}
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: "#5B8A8A", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Ionicons name="pulse" size={32} color="white" />
          </View>
          <Text style={{ fontSize: 30, fontFamily: "PlusJakartaSans_700Bold", color: "#2D2D2D", letterSpacing: -0.5 }}>
            STEADY
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", color: "#8A8A8A", marginTop: 4, letterSpacing: 1 }}>
            with ADHD
          </Text>
        </View>

        {error ? (
          <View style={{ backgroundColor: "#F5E6E6", borderWidth: 1, borderColor: "#E0BABA", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20, flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="alert-circle" size={18} color="#D4A0A0" />
            <Text style={{ color: "#C08585", fontSize: 14, fontFamily: "PlusJakartaSans_400Regular", marginLeft: 8, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5A5A5A", marginBottom: 8, marginLeft: 4 }}>Email</Text>
          <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#D4D0CB", borderRadius: 12, backgroundColor: "#FFFFFF", paddingHorizontal: 16 }}>
            <Ionicons name="mail-outline" size={18} color="#8A8A8A" />
            <TextInput
              style={{ flex: 1, paddingVertical: 14, marginLeft: 12, fontSize: 16, fontFamily: "PlusJakartaSans_400Regular", color: "#2D2D2D" }}
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

        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", color: "#5A5A5A", marginBottom: 8, marginLeft: 4 }}>Password</Text>
          <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#D4D0CB", borderRadius: 12, backgroundColor: "#FFFFFF", paddingHorizontal: 16 }}>
            <Ionicons name="lock-closed-outline" size={18} color="#8A8A8A" />
            <TextInput
              style={{ flex: 1, paddingVertical: 14, marginLeft: 12, fontSize: 16, fontFamily: "PlusJakartaSans_400Regular", color: "#2D2D2D" }}
              placeholder="Enter your password"
              placeholderTextColor="#D4D0CB"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
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
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white", fontFamily: "PlusJakartaSans_700Bold", fontSize: 16 }}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 32 }}>
          <Text style={{ color: "#8A8A8A", fontFamily: "PlusJakartaSans_400Regular" }}>New here? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={{ color: "#5B8A8A", fontFamily: "PlusJakartaSans_700Bold" }}>Create Account</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
