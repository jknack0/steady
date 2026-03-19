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
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center px-8">
        {/* Brand Header */}
        <View className="items-center mb-10">
          <View className="w-16 h-16 rounded-2xl bg-indigo-600 items-center justify-center mb-4">
            <Ionicons name="pulse" size={32} color="white" />
          </View>
          <Text className="text-3xl font-bold text-gray-900 tracking-tight">
            STEADY
          </Text>
          <Text className="text-sm text-gray-400 mt-1 tracking-wide">
            with ADHD
          </Text>
        </View>

        {error ? (
          <View className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5 flex-row items-center">
            <Ionicons name="alert-circle" size={18} color="#dc2626" />
            <Text className="text-red-600 text-sm ml-2 flex-1">{error}</Text>
          </View>
        ) : null}

        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-600 mb-2 ml-1">Email</Text>
          <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50 px-4">
            <Ionicons name="mail-outline" size={18} color="#9ca3af" />
            <TextInput
              className="flex-1 py-3.5 ml-3 text-base text-gray-900"
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-600 mb-2 ml-1">Password</Text>
          <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50 px-4">
            <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
            <TextInput
              className="flex-1 py-3.5 ml-3 text-base text-gray-900"
              placeholder="Enter your password"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#9ca3af"
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          className={`rounded-xl py-4 items-center ${loading ? "bg-indigo-400" : "bg-indigo-600"}`}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
          style={{
            shadowColor: "#6366f1",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">Sign In</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-8">
          <Text className="text-gray-400">New here? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text className="text-indigo-600 font-bold">Create Account</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
