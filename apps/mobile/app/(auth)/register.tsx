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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        className="px-8"
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View className="items-center mb-8 mt-8">
          <View className="w-14 h-14 rounded-2xl bg-indigo-600 items-center justify-center mb-3">
            <Ionicons name="pulse" size={28} color="white" />
          </View>
          <Text className="text-2xl font-bold text-gray-900 tracking-tight">
            Create Account
          </Text>
          <Text className="text-sm text-gray-400 mt-1">
            Join STEADY with ADHD
          </Text>
        </View>

        {error ? (
          <View className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5 flex-row items-center">
            <Ionicons name="alert-circle" size={18} color="#dc2626" />
            <Text className="text-red-600 text-sm ml-2 flex-1">{error}</Text>
          </View>
        ) : null}

        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-600 mb-2 ml-1">First Name</Text>
            <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50 px-4">
              <Ionicons name="person-outline" size={18} color="#9ca3af" />
              <TextInput
                className="flex-1 py-3.5 ml-3 text-base text-gray-900"
                placeholder="First"
                placeholderTextColor="#9ca3af"
                value={firstName}
                onChangeText={setFirstName}
                autoComplete="given-name"
              />
            </View>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-600 mb-2 ml-1">Last Name</Text>
            <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50 px-4">
              <TextInput
                className="flex-1 py-3.5 text-base text-gray-900"
                placeholder="Last"
                placeholderTextColor="#9ca3af"
                value={lastName}
                onChangeText={setLastName}
                autoComplete="family-name"
              />
            </View>
          </View>
        </View>

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

        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-600 mb-2 ml-1">Password</Text>
          <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50 px-4">
            <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
            <TextInput
              className="flex-1 py-3.5 ml-3 text-base text-gray-900"
              placeholder="At least 8 characters"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
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

        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-600 mb-2 ml-1">Confirm Password</Text>
          <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50 px-4">
            <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
            <TextInput
              className="flex-1 py-3.5 ml-3 text-base text-gray-900"
              placeholder="Confirm your password"
              placeholderTextColor="#9ca3af"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />
          </View>
        </View>

        <TouchableOpacity
          className={`rounded-xl py-4 items-center ${loading ? "bg-indigo-400" : "bg-indigo-600"}`}
          onPress={handleRegister}
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
            <Text className="text-white font-bold text-base">Create Account</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6 mb-8">
          <Text className="text-gray-400">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text className="text-indigo-600 font-bold">Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
