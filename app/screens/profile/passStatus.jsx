import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import {
  Clock,
  XCircle,
  ChevronRight,
  CalendarDays,
  MapPin,
  ChevronLeft,
} from "lucide-react-native";

// Status configuration for rejected, pending, and expired
const statusConfig = {
  pending: {
    text: "Pending",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
    icon: <Clock size={16} color="#d97706" />,
  },
  rejected: {
    text: "Rejected",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-100",
    icon: <XCircle size={16} color="#dc2626" />,
  },
  expired: {
    text: "Expired",
    color: "text-gray-500",
    bg: "bg-gray-50",
    border: "border-gray-200",
    icon: <Clock size={16} color="#6b7280" />,
  },
};

export default function PassStatus() {
  const router = useRouter();
  const [passes, setPasses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPasses = async () => {
    try {
      const userData = await AsyncStorage.getItem("userData");
      if (!userData) {
        router.replace("/auth/login");
        return;
      }

      const { email } = JSON.parse(userData);
      const response = await axios.get(
        "https://gate-pass-backend-2ccd.onrender.com/api/gatepass/email",
        { params: { email } }
      );

      // Process passes with expiration status
      const processedPasses = response.data
        .map((pass) => {
          const now = new Date();
          const returnDate = new Date(pass.comingDate || pass.date);
          const isExpired = pass.status === "approved" && now > returnDate;
          return {
            ...pass,
            isExpired,
            displayStatus: isExpired ? "expired" : pass.status,
          };
        })
        // Filter to only show rejected, pending, and expired passes
        .filter((pass) =>
          ["rejected", "pending", "expired"].includes(pass.displayStatus)
        );

      // Sort passes by date (newest first)
      const sortedPasses = processedPasses.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      setPasses(sortedPasses);
    } catch (error) {
      console.error("Error fetching passes:", error);
      Alert.alert("Error", "Failed to fetch pass data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPasses();
  };

  useEffect(() => {
    fetchPasses();
  }, []);

  const getStatusDetails = (pass) => {
    return statusConfig[pass.displayStatus] || statusConfig.pending;
  };

  const formatDate = (dateString) => {
    const options = { month: "short", day: "numeric", year: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatTime = (timeString) => {
    return timeString?.substring(0, 5) || "";
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className="mt-2 text-gray-600">Loading your passes...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-5 py-4 flex-row items-center border-b border-gray-200 shadow-sm">
        <TouchableOpacity
          onPress={async () => {
            await router.back(); // Wait for navigation to complete
            onRefresh();
          }}
          className="mr-4"
        >
          <ChevronLeft size={24} color="#4B5563" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800">Pass Status</Text>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View className="p-4">
          <Text className="text-2xl font-bold mb-6">My Passes</Text>

          {passes.length === 0 ? (
            <View className="flex-1 justify-center items-center py-16">
              <View className="bg-indigo-100 p-6 rounded-full mb-4">
                <Clock size={24} color="#4f46e5" />
              </View>
              <Text className="text-lg font-medium text-gray-700 mb-1">
                No passes found
              </Text>
              <Text className="text-gray-500 text-center mb-6">
                You don't have any pending, rejected, or expired passes
              </Text>
              <TouchableOpacity
                onPress={() => {
                  router.back();
                  onRefresh();
                }}
                className="mr-4"
              >
                <Text className="text-white font-medium mr-2">
                  Create New Pass
                </Text>
                <ChevronRight size={18} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {passes.map((pass) => {
                const status = getStatusDetails(pass);
                const isRejected = pass.displayStatus === "rejected";

                return (
                  <TouchableOpacity
                    key={pass._id}
                    className={`${status.bg} p-5 rounded-xl mb-4 border ${status.border} shadow-sm`}
                    onPress={() =>
                      router.push(
                        `/screens/profile/gatePassDetails/${pass._id}`
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1">
                        <View className="flex-row items-center justify-between mb-3">
                          <View
                            className={`flex-row items-center px-3 py-1 rounded-full ${status.bg}`}
                          >
                            {status.icon}
                            <Text
                              className={`ml-2 text-sm font-medium ${status.color}`}
                            >
                              {status.text}
                            </Text>
                          </View>
                          <View className="bg-indigo-100 px-2 py-1 rounded">
                            <Text className="text-indigo-800 text-xs font-medium">
                              #{pass._id.slice(-6).toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        <Text className="text-lg font-semibold text-gray-800 mb-3">
                          {pass.reason === "Others"
                            ? pass.customReason
                            : pass.reason}
                        </Text>

                        <View className="space-y-3">
                          <View className="flex-row items-center">
                            <View className="bg-indigo-100 p-2 rounded-full mr-3">
                              <CalendarDays size={16} color="#4f46e5" />
                            </View>
                            <View>
                              <Text className="text-xs text-gray-500">
                                Departure
                              </Text>
                              <Text className="text-gray-800">
                                {formatDate(pass.date)} •{" "}
                                {formatTime(pass.time)}
                              </Text>
                            </View>
                          </View>

                          <View className="flex-row items-center">
                            <View className="bg-indigo-100 p-2 rounded-full mr-3">
                              <MapPin size={16} color="#4f46e5" />
                            </View>
                            <View>
                              <Text className="text-xs text-gray-500">
                                Destination
                              </Text>
                              <Text className="text-gray-800">
                                {pass.destination}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                      <ChevronRight size={20} color="#9ca3af" />
                    </View>

                    {(isRejected || pass.displayStatus === "expired") && (
                      <View className="mt-3 pt-3 border-t border-gray-100">
                        <Text className="text-gray-500 text-sm">
                          {isRejected
                            ? `Reason: ${
                                pass.rejectionReason || "Not specified"
                              }`
                            : `Expired on ${formatDate(
                                pass.comingDate || pass.date
                              )}`}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
