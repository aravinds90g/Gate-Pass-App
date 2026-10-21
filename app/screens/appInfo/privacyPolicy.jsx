import { View, ScrollView, Text, Linking } from "react-native";
import { ChevronLeft, Shield } from "lucide-react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useRouter } from "expo-router";

// Shown verbatim rather than as today's date: "Last Updated" must reflect
// an actual policy revision, not the time the screen was opened.
const POLICY_LAST_UPDATED = "21 October 2026";

export default function PrivacyPolicy() {
  const router = useRouter();

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
        <Text className="text-xl font-bold text-gray-800">Privacy Policy</Text>
      </View>

      <ScrollView className="flex-1 px-5 py-4">
        <View className="bg-white rounded-xl p-6 mb-6 border border-gray-200">
          <View className="items-center mb-6">
            <Shield size={40} color="#4F46E5" className="mb-3" />
            <Text className="text-2xl font-bold text-gray-900 text-center">
              How your data is handled
            </Text>
          </View>

          <Text className="text-gray-500 mb-4">
            Last Updated: {POLICY_LAST_UPDATED}
          </Text>

          <Section title="1. Information We Collect">
            Your name, email address, phone number, roll number, department and
            year of study, and the details you enter on a gate pass (dates,
            destination, reason and parent contact).
          </Section>

          <Section title="2. How We Use Your Data">
            Only to process and approve gate pass requests, show pass status to
            you, and let campus staff verify a pass at the gate. We do not sell
            your data or use it for advertising.
          </Section>

          <Section title="3. Who Can See It">
            Your pass details are visible to you, your mentor, the warden, the
            administrator who approves passes, and security staff who scan your
            QR code. Pass data is transmitted over HTTPS.
          </Section>

          <Section title="4. Retention">
            Pass records are kept by the campus administration for their audit
            trail. Contact the privacy team below to ask about, correct or
            delete your data.
          </Section>

          <TouchableOpacity
            onPress={() => Linking.openURL("mailto:aravinds90g@gmail.com")}
            className="mt-6 p-3 bg-indigo-50 rounded-lg items-center"
            accessibilityRole="link"
            accessibilityLabel="Contact the privacy team by email"
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
