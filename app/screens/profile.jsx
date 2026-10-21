import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { ChevronRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { FontAwesome } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { clearSession, getSession } from "../../lib/session";
import { getPassDisplayStatus } from "../../lib/dates";

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState({
    name: "",
    email: "",
    dept: "",
    year: "",
    rollNo: "",
    phoneNo: "",
    role: "",
  });
  const [passStats, setPassStats] = useState({ active: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  // The interval needs the current email; keeping it in a ref avoids the
  // stale-closure bug where polling always called with the initial "".
  const emailRef = useRef("");

  const fetchPassStats = useCallback(async (email) => {
    if (!email) return;
    try {
      const response = await api.get("/gatepass/email", { params: { email } });
      const data = Array.isArray(response.data) ? response.data : [];
      // Match the Approved Passes screen: an approved pass is usable before
      // security scans it, so it counts as active too.
      const active = data.filter((pass) =>
        ["approved", "active"].includes(getPassDisplayStatus(pass))
      ).length;
      setPassStats({ active, total: data.length });
    } catch (error) {
      console.error("Error fetching gate pass stats:", error);
      setPassStats({ active: 0, total: 0 });
    }
  }, []);

  const getUserData = useCallback(async () => {
    try {
      const { user: parsedData } = await getSession();
      if (!parsedData) {
        router.replace("/auth/login");
        return;
      }
      setUser(parsedData);
      emailRef.current = parsedData.email ?? "";
      await fetchPassStats(emailRef.current);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchPassStats, router]);

  useEffect(() => {
    getUserData();

    const intervalId = setInterval(() => {
      fetchPassStats(emailRef.current);
    }, 10_000);

    return () => clearInterval(intervalId);
  }, [getUserData, fetchPassStats]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    getUserData().finally(() => setRefreshing(false));
  }, [getUserData]);

  const handleLogout = async () => {
    try {
      await clearSession();
      router.replace("/auth/login");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-gray-600">Loading your profile...</Text>
      </View>
    );
  }

  return (
    <Animated.View
      style={{ flex: 1, opacity: fadeAnim }}
      className="bg-gray-50"
    >
      <ScrollView
        className="px-4 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="bg-indigo-600 rounded-2xl p-6 mb-6 shadow-lg">
          <View className="flex-row items-center">
            <View className="w-20 h-20 rounded-full border-4 border-white bg-indigo-500 items-center justify-center shadow-md">
              <FontAwesome name="user" size={36} color="white" />
            </View>
            <View className="ml-5 flex-1">
              <Text className="text-white text-2xl font-bold" numberOfLines={1}>
                {user.name}
              </Text>
              <Text className="text-indigo-100 text-sm mt-1" numberOfLines={1}>
                {user.email}
              </Text>
              <View className="bg-white/20 rounded-full px-3 py-1 mt-2 self-start">
                <Text className="text-white text-xs font-medium">
                  {user.role}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View className="flex-row justify-between mb-6" style={{ gap: 12 }}>
          <View className="bg-white flex-1 p-4 rounded-xl shadow-sm items-center border border-gray-100">
            <Text className="text-indigo-600 font-bold text-2xl">
              {passStats.active}
            </Text>
            <Text className="text-gray-500 text-xs font-medium mt-1 text-center">
              Active Passes
            </Text>
          </View>
          <View className="bg-white flex-1 p-4 rounded-xl shadow-sm items-center border border-gray-100">
            <Text className="text-gray-600 font-bold text-2xl">
              {passStats.total}
            </Text>
            <Text className="text-gray-500 text-xs font-medium mt-1">
              Total Passes
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ gap: 12 }} className="mb-6">
          <TouchableOpacity
            className="bg-white p-4 rounded-xl flex-row justify-between items-center border border-gray-100 shadow-sm"
            onPress={() => router.push("/screens/profile/passStatus")}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className="bg-indigo-100 p-2 rounded-lg mr-3">
                <Text className="text-indigo-600">📋</Text>
              </View>
              <View>
                <Text className="text-gray-800 font-medium">
                  My Pass Status
                </Text>
                <Text className="text-gray-400 text-xs">
                  View pending pass status
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-white p-4 rounded-xl flex-row justify-between items-center border border-gray-100 shadow-sm"
            onPress={() => router.push("/screens/profile/approvedGatepass")}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className="bg-indigo-100 p-2 rounded-lg mr-3">
                <View className="relative">
                  <Text className="text-indigo-600">🚪</Text>
                  {passStats.active > 0 && (
                    <View className="absolute -top-1 -right-1 bg-indigo-600 rounded-full w-4 h-4 items-center justify-center">
                      <Text className="text-white text-[10px] font-bold">
                        {passStats.active}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View>
                <Text className="text-gray-800 font-medium">
                  Approved Passes
                </Text>
                <Text className="text-gray-400 text-xs">
                  {passStats.active > 0
                    ? `View your active passes`
                    : "No active passes"}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-white p-4 rounded-xl flex-row justify-between items-center border border-gray-100 shadow-sm"
            onPress={() => router.push("/screens/profile/gatepass")}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className="bg-green-100 p-2 rounded-lg mr-3">
                <Text className="text-green-600">✏️</Text>
              </View>
              <View>
                <Text className="text-gray-800 font-medium">New Gate Pass</Text>
                <Text className="text-gray-400 text-xs">
                  Apply for a new pass
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Profile Details */}
        <View className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <Text className="text-gray-800 font-bold text-lg mb-4">
            Profile Details
          </Text>
          {[
            ["Department", user.dept || "Not set"],
            ["Year", user.year ? `Year ${user.year}` : "Not set"],
            // Staff accounts have no roll number; don't render a phantom row.
            ...(user.role === "student"
              ? [
                  ["Student ID", user.rollNo || "Not set"],
                  [
                    "Contact",
                    user.phoneNo ? `+91 ${user.phoneNo}` : "Not set",
                  ],
                ]
              : []),
          ].map(([label, value], idx, rows) => (
            <View
              key={label}
              className={`flex-row justify-between items-center py-3 ${
                idx < rows.length - 1 ? "border-b border-gray-100" : ""
              }`}
            >
              <Text className="text-gray-500 text-sm">{label}</Text>
              <Text className="font-medium text-gray-800">{value}</Text>
            </View>
          ))}
        </View>

        {/* App Info */}
        <View className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <Text className="text-gray-800 font-bold text-lg mb-4">App Info</Text>
          {[
            ["Privacy Policy", "/screens/appInfo/privacyPolicy"],
            ["About App", "/screens/appInfo/aboutApp"],
          ].map(([label, path], idx) => (
            <TouchableOpacity
              key={idx}
              className={`flex-row justify-between items-center py-3 ${
                idx === 0 ? "border-b border-gray-100" : ""
              }`}
              onPress={() => router.push(path)}
              activeOpacity={0.7}
            >
              <Text className="text-gray-700">{label}</Text>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-50 p-4 rounded-xl items-center border border-red-100 mb-8"
          activeOpacity={0.7}
        >
          <Text className="text-red-600 text-base font-semibold">Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}
