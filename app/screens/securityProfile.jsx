import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { MaterialIcons, Ionicons, FontAwesome } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

const SecurityHome = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem("userData");
        if (userData) setUser(JSON.parse(userData));
      } catch (error) {
        console.error("Failed to fetch user data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("userData");
      router.replace("/auth/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Background Image with Header */}
      <ImageBackground
        source={{
          uri: "https://media.gettyimages.com/id/1433485090/video/dots-makes-global-world-map-global-wireframe-polygonal-lines.jpg?s=640x640&k=20&c=6TpfX8QHt9IPnF0s5HkwOaNoqcNbtYP99Ceh7-iR8MI=",
        }}
        className="w-full h-52"
        resizeMode="cover"
      >
        <View className="flex-1 justify-between px-6 pb-4 bg-black/30 flex-row items-end">
          <View>
            <Text className="text-3xl font-bold text-white">
              Security Portal
            </Text>
            <Text className="text-gray-200 mt-1">Welcome back, officer</Text>
          </View>
        </View>
      </ImageBackground>

      <View className="p-6">
        {/* Profile Card */}
        <Animated.View
          entering={FadeInDown.duration(700).springify()}
          className="bg-white p-6 rounded-2xl shadow-sm mb-8"
        >
          <View className="flex-row items-center">
            <View className="w-16 h-16 rounded-full mr-4 bg-indigo-100 items-center justify-center">
              <FontAwesome name="user-secret" size={32} color="#4f46e5" />
            </View>
            <View>
              <Text className="text-xl font-semibold text-gray-900">
                {user?.name || "Security Officer"}
              </Text>
              <Text className="text-gray-500">Campus Security Division</Text>
            </View>
          </View>
        </Animated.View>

        {/* Scan Card */}
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          className="bg-indigo-600 p-6 rounded-2xl mt-4 shadow-sm"
        >
          <Text className="text-white text-xl font-semibold mb-4">
            QR Code Scanner
          </Text>
          <Text className="text-indigo-100 mb-6">
            Scan student gate passes to verify access permissions
          </Text>

          <TouchableOpacity
            className="flex-row items-center justify-center bg-white py-4 rounded-xl"
            onPress={() => router.push("screens/profile/qrScanner")}
          >
            <MaterialIcons name="qr-code-scanner" size={24} color="#4f46e5" />
            <Text className="text-indigo-600 font-semibold ml-2">
              Launch Scanner
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Logout Button at Bottom */}
        <Animated.View
          entering={FadeInDown.delay(600).springify()}
          className="mt-8"
        >
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center justify-center p-4 rounded-xl border border-red-500"
          >
            <Ionicons name="log-out-outline" size={24} color="red" />
            <Text className="text-red-500 font-semibold ml-2">Logout</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

export default SecurityHome;
