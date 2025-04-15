import { View, ScrollView, Text, Linking, Image } from "react-native";
import { ChevronLeft, Info, Mail, Globe, Github } from "lucide-react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useRouter } from "expo-router";

export default function AboutApp() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  return (
    <View className="flex-1 bg-gray-50 ">
      {/* Header */}
      <View className="bg-white px-5 py-4 flex-row items-center border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ChevronLeft size={24} color="#4B5563" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800">
          About CampusPass
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 py-4 top-10">
        <View className="bg-white rounded-xl p-6 mb-6 border border-gray-200">
          {/* App Logo */}
          <View className="items-center mb-6">
            {/* <Image
              source={require("@/assets/logo.png")}
              className="w-24 h-24 mb-4"
            /> */}
            <Text className="text-2xl font-bold text-gray-900">CampusPass</Text>
            <Text className="text-gray-500">v2.1.0</Text>
          </View>

          <Text className="text-gray-600 mb-6 leading-6">
            CampusPass modernizes student gate pass management by replacing
            paper slips with a digital approval system. Students request,
            faculty approve, and security verifies - all through a secure mobile
            platform with digital audit trails.
          </Text>

          <View className="space-y-4 mb-6">
            <FeatureItem
              icon={<Info size={18} color="#4F46E5" />}
              title="Developed By"
              value="Student"
            />
            <FeatureItem
              icon={<Globe size={18} color="#4F46E5" />}
              title="Website"
              value="campuspass.edu"
              onPress={() => Linking.openURL("https://campuspass.edu")}
            />
            <FeatureItem
              icon={<Mail size={18} color="#4F46E5" />}
              title="Support"
              value="Aravind S"
              onPress={() => Linking.openURL("mailto:aravinds90g@gmail.com")}
            />
            <FeatureItem
              icon={<Github size={18} color="#4F46E5" />}
              title="Open Source"
              value="View on GitHub"
              onPress={() =>
                Linking.openURL("https://github.com/uni/campuspass")
              }
            />
          </View>

          <View className="border-t border-gray-200 pt-4">
            <Text className="text-gray-500 text-center">
              © {currentYear} CampusPass. All rights reserved.
            </Text>
          </View>
        </View>

        {/* Team Section */}
        {/* <View className="bg-white rounded-xl p-6 border border-gray-200">
          <Text className="text-lg font-bold text-gray-800 mb-4">Our Team</Text>
          <View className="flex-row justify-around">
            <TeamMember
              name="Dr. Smith"
              role="Faculty Advisor"
              // image={require("@/assets/team/dr-smith.jpg")}
            />
            <TeamMember
              name="Alex Johnson"
              role="Lead Developer"
              // image={require("@/assets/team/alex.jpg")}
            />
          </View>
        </View> */}
      </ScrollView>
    </View>
  );
}

function FeatureItem({ icon, title, value, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
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

function TeamMember({ name, role, image }) {
  return (
    <View className="items-center">
      <Image source={image} className="w-16 h-16 rounded-full mb-2" />
      <Text className="font-medium text-gray-800">{name}</Text>
      <Text className="text-gray-500 text-xs">{role}</Text>
    </View>
  );
}
