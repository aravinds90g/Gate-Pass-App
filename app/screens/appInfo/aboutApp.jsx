import { View, ScrollView, Text, Linking } from "react-native";
import { ChevronLeft, Info, Mail } from "lucide-react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import Constants from "expo-constants";

export default function AboutApp() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  // Single source of truth: app.json version, not a hardcoded string that
  // drifts from the actual build.
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 py-4 flex-row items-center border-b border-gray-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color="#4B5563" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800">
          About CampusPass
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 py-4">
        <View className="bg-white rounded-xl p-6 mb-6 border border-gray-200">
          {/* App Logo */}
          <View className="items-center mb-6">
            <Text className="text-2xl font-bold text-gray-900">CampusPass</Text>
            <Text className="text-gray-500">v{version}</Text>
          </View>

          <Text className="text-gray-600 mb-6 leading-6">
            CampusPass modernizes student gate pass management by replacing
            paper slips with a digital approval system. Students request,
            faculty approve, and security verifies - all through a secure mobile
            platform with digital audit trails.
          </Text>

          <View className="mb-6">
            <FeatureItem
              icon={<Info size={18} color="#4F46E5" />}
              title="Developed By"
              value="Student project"
            />
            <FeatureItem
              icon={<Mail size={18} color="#4F46E5" />}
              title="Support"
              value="aravinds90g@gmail.com"
              onPress={() => Linking.openURL("mailto:aravinds90g@gmail.com")}
            />
          </View>

          <View className="border-t border-gray-200 pt-4">
            <Text className="text-gray-500 text-center">
              © {currentYear} CampusPass. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function FeatureItem({ icon, title, value, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "link" : "text"}
    >
      <View className="flex-row items-center">
        <View className="mr-3">{icon}</View>
        <View className="flex-1 border-b border-gray-100 pb-3">
          <Text className="text-gray-500 text-sm">{title}</Text>
          <Text className="text-gray-800 font-medium">{value}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
