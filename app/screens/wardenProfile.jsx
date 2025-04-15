import React, { useState, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import {
  CheckCircle,
  XCircle,
  Calendar,
  ClipboardList,
  MapPin,
  User,
  LogOut,
  Clock,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import axios from "axios";

const FeedbackMessage = ({ actionFeedback }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (actionFeedback) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);

      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);

  if (!actionFeedback) return null;

  return (
    <Animated.View
      className={`absolute mx-5 py-3 px-4 rounded-lg z-10 ${
        actionFeedback.isSuccess ? "bg-green-500" : "bg-red-500"
      }`}
      style={{
        top: 100,
        left: 0,
        right: 0,
        transform: [{ scale: scaleAnim }],
        opacity: fadeAnim,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
      }}
    >
      <View className="flex-row items-center justify-center">
        {actionFeedback.isSuccess ? (
          <CheckCircle size={20} color="white" className="mr-2" />
        ) : (
          <XCircle size={20} color="white" className="mr-2" />
        )}
        <Text className="text-white text-center font-medium">
          {actionFeedback.message}
        </Text>
      </View>
    </Animated.View>
  );
};

const WardenProfile = () => {
  const router = useRouter();
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    active: 0,
    rejected: 0,
  });

  const fetchPasses = async () => {
    setRefreshing(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("Authentication token not found");

      const response = await axios.get(
        "https://gate-pass-backend-2ccd.onrender.com/api/gatepass/",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Filter for pending passes that aren't home requests
      const filteredPasses = response.data.filter((pass) => {
        if (pass.reason === "Home") return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const passDate = new Date(pass.date);
        passDate.setHours(0, 0, 0, 0);

        return today.getTime() === passDate.getTime();
      });

      // Calculate statistics
      const total = filteredPasses.length;
      const approved = filteredPasses.filter(
        (p) => p.status === "approved"
      ).length;
      const active = filteredPasses.filter((p) => p.status === "active").length;
      const rejected = filteredPasses.filter(
        (p) => p.status === "rejected" && p.reason !== "Home"
      ).length;

      setPasses(filteredPasses);
      setStats({ total, approved, active, rejected });
    } catch (error) {
      console.error("Error fetching passes:", error);
      showActionFeedback("Failed to fetch passes", false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPasses();
  }, []);

  const showActionFeedback = (message, isSuccess) => {
    setActionFeedback({ message, isSuccess });
  };

  const handlePassAction = async (passId, action) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("Authentication token not found");

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };

      if (action === "approve") {
        await axios.put(
          `https://gate-pass-backend-2ccd.onrender.com/api/gatepass/update/${passId}`,
          {
            status: "approved",
            approvedAt: new Date(),
            approvedBy: "Warden",
            forwarded: false,
          },
          config
        );
        showActionFeedback("Pass Approved Successfully", true);
      } else if (action === "reject") {
        await axios.put(
          `https://gate-pass-backend-2ccd.onrender.com/api/gatepass/update/${passId}`,
          {
            status: "rejected",
            rejectedAt: new Date(),
            rejectedBy: "Warden",
            forwarded: false,
          },
          config
        );
        showActionFeedback("Pass Rejected Successfully", true);
      }

      fetchPasses();
    } catch (error) {
      console.error("Error in handleAction:", error);
      showActionFeedback(
        error.response?.data?.message || `Failed to ${action} pass`,
        false
      );
      if (error.response?.status === 401) {
        await AsyncStorage.clear();
        router.replace("/auth/login");
      }
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace("/auth/login");
  };

  const renderPassItem = ({ item }) => (
    <View className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-center mb-3">
        <View>
          <Text className="text-lg font-semibold text-gray-900">
            {item.name}
          </Text>
          <Text className="text-sm text-gray-500">{item.rollNo}</Text>
        </View>
        <View
          className={`px-2 py-1 rounded-full ${
            item.status === "rejected"
              ? "bg-red-50"
              : item.status === "approved" || item.status === "active"
              ? "bg-green-50"
              : item.status === "expired"
              ? "bg-gray-100"
              : "bg-yellow-50"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              item.status === "rejected"
                ? "text-red-600"
                : item.status === "approved" || item.status === "active"
                ? "text-green-600"
                : item.status === "expired"
                ? "text-gray-600"
                : "text-yellow-600"
            }`}
          >
            {item.status === "approved"
              ? "Approved"
              : item.status === "rejected"
              ? "Rejected"
              : item.status === "active"
              ? "Active"
              : item.status === "pending"
              ? "Pending"
              : "Expired"}
          </Text>
        </View>
      </View>

      <View className="space-y-3">
        <View className="flex-row items-start">
          <Calendar size={20} color="#6366f1" className="mr-3 " />
          <View className="flex-1 mb-3">
            <Text className="text-xs text-gray-500 mx-4">Date Range</Text>
            <Text className="text-sm text-gray-800 mx-4">
              {new Date(item.date).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View className="flex-row items-start">
          <Clock size={18} color="#6366f1" className="mr-3 mt-0.5" />
          <View className="flex-1 mb-3">
            <Text className="text-xs text-gray-500 mx-4">Duration</Text>
            <Text className="text-sm text-gray-800 mx-4">{item.time}</Text>
          </View>
        </View>

        <View className="flex-row items-start">
          <MapPin size={18} color="#6366f1" className="mr-3 mt-0.5" />
          <View className="flex-1 mb-3">
            <Text className="text-xs text-gray-500 mx-4">Destination</Text>
            <Text className="text-sm text-gray-800 mx-4">
              {item.destination}
            </Text>
          </View>
        </View>

        <View className="flex-row items-start">
          <ClipboardList size={18} color="#6366f1" className="mr-3 mt-0.5" />
          <View>
            <Text className="text-xs text-gray-500 mx-4">Reason</Text>
            <Text className="text-sm text-gray-800 mx-4">
              {item.customReason}
            </Text>
          </View>
        </View>
      </View>

      {item.status === "pending" && (
        <View className="flex-row justify-between mt-4 gap-2">
          <TouchableOpacity
            className="flex-1 bg-red-50 py-2.5 rounded-lg flex-row items-center justify-center border border-red-100"
            onPress={() => handlePassAction(item._id, "reject")}
          >
            <XCircle size={18} color="#ef4444" className="mr-2" />
            <Text className="text-red-600 font-medium mx-3">Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-green-50 py-2.5 rounded-lg flex-row items-center justify-center border border-green-100"
            onPress={() => handlePassAction(item._id, "approve")}
          >
            <CheckCircle size={18} color="#16a34a" className="mr-2" />
            <Text className="text-green-600 font-medium mx-3">Approve</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={fetchPasses}
          colors={["#6366f1"]}
          tintColor="#6366f1"
        />
      }
    >
      {/* Header */}
      <View className="bg-white px-5 pt-12 pb-4 border-b border-gray-200">
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center">
            <View className="bg-indigo-100 p-2 rounded-full mr-3">
              <User size={24} color="#6366f1" />
            </View>
            <View>
              <Text className="text-xl font-bold text-gray-900">
                Warden Dashboard
              </Text>
              <Text className="text-sm text-gray-500">
                Manage Student Passes
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            className="p-2 rounded-lg bg-red-50"
          >
            <LogOut size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Statistics Cards */}
      <View className="px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row flex-wrap justify-between">
          <View className="w-[48%] bg-gray-50 rounded-lg p-3 mb-3 border border-gray-200">
            <Text className="text-xs text-gray-500 font-medium">
              Total Passes
            </Text>
            <Text className="text-xl font-bold text-indigo-600 mt-1">
              {stats.total}
            </Text>
          </View>
          <View className="w-[48%] bg-gray-50 rounded-lg p-3 mb-3 border border-gray-200">
            <Text className="text-xs text-gray-500 font-medium">Approved</Text>
            <Text className="text-xl font-bold text-green-600 mt-1">
              {stats.approved}
            </Text>
          </View>
          <View className="w-[48%] bg-gray-50 rounded-lg p-3 mb-3 border border-gray-200">
            <Text className="text-xs text-gray-500 font-medium">Active</Text>
            <Text className="text-xl font-bold text-yellow-600 mt-1">
              {stats.active}
            </Text>
          </View>
          <View className="w-[48%] bg-gray-50 rounded-lg p-3 mb-3 border border-gray-200">
            <Text className="text-xs text-gray-500 font-medium">Rejected</Text>
            <Text className="text-xl font-bold text-red-600 mt-1">
              {stats.rejected}
            </Text>
          </View>
        </View>
      </View>

      {/* Feedback Message */}
      <FeedbackMessage actionFeedback={actionFeedback} />

      {/* Passes List */}
      <View className="px-4 pb-4 pt-4 ">
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          Pending Approval ({passes.length})
        </Text>

        {passes.length > 0 ? (
          <FlatList
            data={passes}
            renderItem={renderPassItem}
            keyExtractor={(item) => item._id}
            scrollEnabled={false} // Disable scrolling since we're in a ScrollView
            ListFooterComponent={<View className="pb-20" />} // Add some bottom padding
          />
        ) : (
          <View className="bg-white p-6 rounded-xl items-center mt-4 border border-gray-200">
            <Text className="text-lg font-semibold text-gray-900 mb-1">
              No pending passes
            </Text>
            <Text className="text-sm text-gray-500">
              All passes have been processed
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default WardenProfile;
