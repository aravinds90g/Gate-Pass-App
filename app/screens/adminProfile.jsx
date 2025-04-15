import React, { useEffect, useState } from "react";
import { useRef } from "react";
import { Animated, Easing } from "react-native";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import axios from "axios";
import {
  CheckCircle,
  XCircle,
  Forward,
  LogOut,
  User,
  Clock,
  Calendar,
  MapPin,
  ChevronRight,
  ClipboardList,
} from "lucide-react-native";

const AdminProfile = () => {
  const router = useRouter();
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Pass statistics
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    active: 0,
    forwarded: 0,
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPasses(response.data);

      // Calculate statistics
      const stats = {
        total: response.data.filter((p) => p.reason === "Home").length,
        approved: response.data.filter((p) => p.status === "approved").length,
        pending: response.data.filter((p) => p.status === "pending").length,
        active: response.data.filter((p) => p.status === "active").length,
        forwarded: response.data.filter((p) => p.forwarded).length,
        rejected: response.data.filter((p) => p.status === "rejected").length,
      };

      setStats(stats);
      setError(null);
    } catch (err) {
      console.error("Error fetching passes:", err);
      setError(err.message);
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
    setTimeout(() => {
      setActionFeedback(null);
    }, 2000);
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
            approvedBy: "Principal",
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
            rejectedBy: "Principal",
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
    try {
      await AsyncStorage.clear();
      router.replace("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const FeedbackMessage = ({ actionFeedback }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
      if (actionFeedback) {
        // Reset animations
        fadeAnim.setValue(0);
        scaleAnim.setValue(0.9);

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
            friction: 5,
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
              toValue: 0.9,
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
        className={`absolute left-5 right-5 py-3 rounded-lg z-10 ${
          actionFeedback.isSuccess ? "bg-green-500" : "bg-red-500"
        }`}
        style={{
          top: "50%",
          transform: [
            { translateY: -50 }, // Centers vertically
            { scale: scaleAnim },
          ],
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

  const renderPass = ({ item }) => (
    <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-slate-900 mb-1">
            {item.name}
          </Text>
          <Text className="text-sm text-slate-500">{item.rollNo}</Text>
        </View>
        <View
          className={`px-3 py-1.5 rounded-full ${
            item.status === "rejected"
              ? "bg-red-50"
              : item.status === "approved"
              ? "bg-green-50"
              : item.forwarded
              ? "bg-blue-50"
              : "bg-yellow-50"
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              item.status === "rejected"
                ? "text-red-600"
                : item.status === "approved"
                ? "text-green-600"
                : item.forwarded
                ? "text-blue-600"
                : "text-yellow-600"
            }`}
          >
            {item.status === "rejected"
              ? "Rejected"
              : item.status === "approved"
              ? "Approved"
              : item.forwarded
              ? "Forwarded"
              : "Pending"}
          </Text>
        </View>
      </View>

      <View className="gap-3">
        <View className="flex-row items-center">
          <Calendar size={25} color="#6366f1" className="mx-4" />
          <View>
            <Text className="text-xs text-slate-500 mx-4">Dates</Text>
            <Text className="text-sm text-slate-700 mx-4">
              {new Date(item.date).toLocaleDateString()} -{" "}
              {item.comingDate
                ? new Date(item.comingDate).toLocaleDateString()
                : "N/A"}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <Clock size={25} color="#6366f1" className="mr-3" />
          <View>
            <Text className="text-xs text-slate-500 mx-4">Duration</Text>
            <Text className="text-sm text-slate-700 mx-4">
              {item.comingDate && item.date
                ? Math.ceil(
                    (new Date(item.comingDate) - new Date(item.date)) /
                      (1000 * 60 * 60 * 24)
                  ) + " days"
                : "N/A"}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <MapPin size={25} color="#6366f1" className="mr-3" />
          <View>
            <Text className="text-xs text-slate-500 mx-4">Destination</Text>
            <Text className="text-sm text-slate-700 mx-4">
              {item.destination}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <ClipboardList size={25} color="#6366f1" className="mr-3" />
          <View>
            <Text className="text-xs text-slate-500 mx-4">Reason</Text>
            <Text className="text-sm text-slate-700 mx-4">
              {item.reasonForGoingHome + `  ( ${item.reason} )`}
            </Text>
          </View>
        </View>
      </View>

      {item.forwarded && item.status === "pending" && (
        <View className="flex-row justify-between mt-4 gap-3">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center py-2.5 rounded-lg border border-red-100 bg-red-50"
            onPress={() => handlePassAction(item._id, "reject")}
            activeOpacity={0.7}
          >
            <XCircle size={18} color="#ef4444" className="mr-2" />
            <Text className="text-sm font-medium text-red-600 mx-2">
              Reject
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center py-2.5 rounded-lg border border-green-100 bg-green-50"
            onPress={() => handlePassAction(item._id, "approve")}
            activeOpacity={0.7}
          >
            <CheckCircle size={18} color="#10b981" className="mr-2" />
            <Text className="text-sm font-medium text-green-600 mx-2">
              Approve
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* Action feedback */}
      {actionFeedback && <FeedbackMessage actionFeedback={actionFeedback} />}

      <FlatList
        data={passes.filter((p) => p.forwarded && p.status === "pending")}
        renderItem={renderPass}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchPasses}
            colors={["#6366f1"]}
            tintColor="#6366f1"
          />
        }
        ListHeaderComponent={
          <>
            {/* Header */}
            <View className="flex-row justify-between items-center px-5 pt-12 pb-5 bg-white border-b border-slate-200">
              <View className="flex-row items-center">
                <View className="bg-indigo-100 p-2 rounded-full mr-3">
                  <User size={24} color="#6366f1" />
                </View>
                <View>
                  <Text className="text-xl font-bold text-slate-900">
                    Admin Dashboard
                  </Text>
                  <Text className="text-sm text-slate-500 mt-1">
                    Manage All Passes
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleLogout}
                className="p-2 rounded-xl bg-red-50"
                activeOpacity={0.7}
              >
                <LogOut size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>

            {/* Statistics Cards */}
            <View className="flex-row flex-wrap justify-between px-4 py-3">
              <View className="w-[48%] bg-white rounded-lg p-4 mb-3 shadow-sm">
                <Text className="text-sm text-slate-500">Total Passes</Text>
                <Text className="text-2xl font-bold text-indigo-600">
                  {stats.total}
                </Text>
              </View>
              <View className="w-[48%] bg-white rounded-lg p-4 mb-3 shadow-sm">
                <Text className="text-sm text-slate-500">Approved</Text>
                <Text className="text-2xl font-bold text-green-800">
                  {stats.approved}
                </Text>
              </View>
              <View className="w-[48%] bg-white rounded-lg p-4 mb-3 shadow-sm">
                <Text className="text-sm text-slate-500">Active Pass</Text>
                <Text className="text-2xl font-bold text-emerald-400">
                  {stats.active}
                </Text>
              </View>
              <View className="w-[48%] bg-white rounded-lg p-4 mb-3 shadow-sm">
                <Text className="text-sm text-slate-500">Forwarded</Text>
                <Text className="text-2xl font-bold text-blue-600">
                  {stats.forwarded}
                </Text>
              </View>
            </View>

            {/* Forwarded Passes Header */}
            <Text className="text-base font-semibold text-slate-700 px-5 py-3 bg-white border-b border-slate-200">
              Forwarded Passes (
              {
                passes.filter((p) => p.forwarded && p.status === "pending")
                  .length
              }
              )
            </Text>
          </>
        }
        ListEmptyComponent={
          <View className="bg-white p-6 rounded-xl items-center mt-4 mx-5">
            <Text className="text-base font-semibold text-slate-700 mb-1">
              No forwarded passes pending approval
            </Text>
            <Text className="text-sm text-slate-500">
              All forwarded passes have been processed
            </Text>
          </View>
        }
      />

      {/* Error handling remains fixed at bottom */}
      {error && (
        <View className="absolute bottom-0 left-0 right-0 p-5 bg-white">
          <Text className="text-base text-red-600 mb-5 text-center">
            {error}
          </Text>
          <TouchableOpacity
            className="bg-indigo-500 px-6 py-3 rounded-lg"
            onPress={fetchPasses}
            activeOpacity={0.7}
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default AdminProfile;
