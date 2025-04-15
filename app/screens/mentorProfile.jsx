import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Easing,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Dimensions } from "react-native";
import axios from "axios";
import {
  XCircle,
  Forward,
  LogOut,
  User,
  Clock,
  Calendar,
  MapPin,
  ChevronRight,
  ClipboardList,
  CheckCircle,
} from "lucide-react-native";

const FeedbackMessage = ({ actionFeedback }) => {
  const slideAnim = useRef(new Animated.Value(0)).current; // Start from 0 for center
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current; // Added scale animation

  useEffect(() => {
    if (actionFeedback) {
      // Reset animations
      slideAnim.setValue(0);
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.8);

      // Combined animation - fade in, scale up, and slight vertical movement
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 400,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 400,
            easing: Easing.in(Easing.quad),
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
      className={`absolute left-0 right-0 mx-5 py-3 rounded-lg z-10 ${
        actionFeedback.isSuccess ? "bg-green-500" : "bg-red-500"
      }`}
      style={{
        top: "50%",
        left: "50%", // Add this for horizontal centering
        transform: [
          {
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0],
            }),
          },
          { translateX: -Dimensions.get("window").width / 2 + 20 }, // Adjust for half width and margin
          { scale: scaleAnim },
        ],
        opacity: opacityAnim,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: Dimensions.get("window").width - 40, // Account for mx-5 (5*2*4=40)
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

const MentorProfile = () => {
  const router = useRouter();
  const [studentPasses, setStudentPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  const fetchPasses = async () => {
    setRefreshing(true);
    try {
      const userDataString = await AsyncStorage.getItem("userData");
      if (!userDataString) throw new Error("User data not found");

      const userData = JSON.parse(userDataString);
      const { dept, year } = userData;

      if (!dept || !year) throw new Error("Department or year not found");

      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("Authentication token not found");

      const response = await axios.get(
        `https://gate-pass-backend-2ccd.onrender.com/api/mentor/deptyear?dept=${dept}&year=${year}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setStudentPasses(response.data);
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
  };

  const handleAction = async (passId, action) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("Authentication token not found");

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };

      if (action === "rejected") {
        await axios.put(
          `https://gate-pass-backend-2ccd.onrender.com/api/gatepass/update/${passId}`,
          { status: "rejected", rejectedAt: new Date(), rejectedBy: "Mentor" },
          config
        );
        showActionFeedback("Pass Rejected Successfully", true);
      } else if (action === "forward") {
        await axios.put(
          `https://gate-pass-backend-2ccd.onrender.com/api/gatepass/update/${passId}`,
          { forwarded: true, forwardedAt: new Date() },
          config
        );
        showActionFeedback("Pass Forwarded Successfully", true);
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
              : item.forwarded
              ? "bg-blue-50"
              : "bg-emerald-50"
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              item.status === "rejected"
                ? "text-red-600"
                : item.forwarded
                ? "text-blue-600"
                : "text-emerald-600"
            }`}
          >
            {item.status === "rejected"
              ? "Rejected"
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
              {`(${item.reasonForGoingHome})  ${item.reason}`}
            </Text>
          </View>
        </View>
      </View>

      {item.status === "pending" && (
        <View className="flex-row justify-between mt-4 gap-3">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center py-2.5 rounded-lg border border-red-100 bg-red-50"
            onPress={() => handleAction(item._id, "rejected")}
            activeOpacity={0.7}
          >
            <XCircle size={18} color="#ef4444" className="mr-2" />
            <Text className="text-sm font-medium text-red-600 mx-2">
              Reject
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center py-2.5 rounded-lg border border-blue-100 bg-blue-50"
            onPress={() => handleAction(item._id, "forward")}
            activeOpacity={0.7}
          >
            <Forward size={18} color="#3b82f6" className="mr-2" />
            <Text className="text-sm font-medium text-blue-600 mx-2">
              Forward
            </Text>
            <ChevronRight size={16} color="#3b82f6" />
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
      {/* Animated feedback message */}
      <FeedbackMessage actionFeedback={actionFeedback} />

      {/* Combined scrollable content */}
      <FlatList
        data={studentPasses}
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
                    Mentor Dashboard
                  </Text>
                  <Text className="text-sm text-slate-500 mt-1">
                    Manage Student Passes
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

            {/* Passes count */}
            <View className="px-5 py-3 bg-white border-b border-slate-200">
              <Text className="text-base font-semibold text-slate-700">
                Number of Passes: {studentPasses.length}
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View className="bg-white p-6 rounded-xl items-center mt-4 mx-5">
            <Text className="text-base font-semibold text-slate-700 mb-1">
              No active passes found
            </Text>
            <Text className="text-sm text-slate-500">
              All student passes are processed
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default MentorProfile;
