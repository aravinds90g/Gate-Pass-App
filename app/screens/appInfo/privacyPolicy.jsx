import { View, ScrollView, Text, Linking } from "react-native";
import { ChevronLeft, Shield } from "lucide-react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useRouter } from "expo-router";

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 py-4 flex-row items-center border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ChevronLeft size={24} color="#4B5563" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800">Privacy Policy</Text>
      </View>

      <ScrollView className="flex-1 px-5 py-4">
        <View className="bg-white rounded-xl p-6 mb-6 border border-gray-200">
          <View className="items-center mb-6">
            <Shield size={40} color="#4F46E5" className="mb-3" />
            <Text className="text-2xl font-bold text-gray-900 text-center">
              Your Data is Secure
            </Text>
          </View>

          <Text className="text-gray-500 mb-4">
            Last Updated: {new Date().toLocaleDateString()}
          </Text>

          <Section title="1. Information We Collect">
            We collect only necessary information to provide our gate pass
            services: - Contact details (email, phone) - Student identification
            - Device information for notifications
          </Section>

          <Section title="2. How We Use Your Data">
            Your information is used exclusively for: - Processing gate pass
            requests - Sending status notifications - Account authentication -
            Service improvements
          </Section>

          <Section title="3. Data Protection">
            We implement: - End-to-end encryption - Regular security audits -
            Strict access controls - Compliance with educational data
            regulations
          </Section>

          <TouchableOpacity
            onPress={() => Linking.openURL("mailto:aravinds90g@gmail.com")}
            className="mt-6 p-3 bg-indigo-50 rounded-lg items-center"
          >
            <Text className="text-indigo-600 font-medium">
              Contact Privacy Team
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View className="mb-6">
      <Text className="text-lg font-bold text-gray-800 mb-2">{title}</Text>
      <Text className="text-gray-600 leading-6">{children}</Text>
    </View>
  );
}
