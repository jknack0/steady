import { View, Text } from "react-native";
import { APP_NAME } from "@steady/shared";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-3xl font-bold text-gray-900">{APP_NAME}</Text>
      <Text className="mt-2 text-lg text-gray-500">Participant App</Text>
    </View>
  );
}
