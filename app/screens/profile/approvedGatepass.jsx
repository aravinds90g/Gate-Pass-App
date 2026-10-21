import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import {
  CheckCircle2,
  Clock,
  ChevronRight,
  CalendarDays,
  MapPin,
  ChevronLeft,
  Home,
  ArrowRight,
} from "lucide-react-native";
import { api, apiErrorMessage } from "../../../lib/api";
import { getSession } from "../../../lib/session";
import {
  formatDate,
  formatTime,
  getPassDisplayStatus,
} from "../../../lib/dates";

export default function ApprovedGatePass() {
  const router = useRouter();
  const [passes, setPasses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPasses = useCallback(async () => {
    try {
      const { user } = await getSession();
      if (!user?.email) {
        router.replace("/auth/login");
        return;
      }

      const response = await api.get("/gatepass/email", {
        params: { email: user.email },
      });
      const data = Array.isArray(response.data) ? response.data : [];

      // Keep only passes that are still usable *today*. The old code only
      // looked at `status`, so activated passes stayed "Active" forever.
      const activePasses = data.filter((pass) => {
        const status = getPassDisplayStatus(pass);
        return status === "approved" || status === "active";
      });

      setPasses(activePasses);
    } catch (error) {
      console.error("Error fetching passes:", error);
      Alert.alert("Error", apiErrorMessage(error, "Failed to load your passes."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPasses();
  };

  useEffect(() => {
    fetchPasses();
  }, [fetchPasses]);

  const getStatusDetails = (pass) => {
    if (pass.status === "active") {
      return {
        text: "Active",
        color: "text-green-600",
        bg: "bg-green-50",
        icon: <CheckCircle2 size={16} color="#16a34a" />,
        cardBorder: "border-green-200",
        cardBg: "bg-green-50",
      };
    }

    if (pass.status === "approved") {
      return {
        text: "Approved",
        color: "text-blue-600",
        bg: "bg-blue-50",
        icon: <CheckCircle2 size={16} color="#3b82f6" />,
        cardBorder: "border-blue-200",
        cardBg: "bg-blue-50",
      };
    }

    return {
      text: "Unknown",
      color: "text-gray-600",
      bg: "bg-gray-100",
      icon: <Clock size={16} color="#6b7280" />,
      cardBorder: "border-gray-200",
      cardBg: "bg-white",
    };
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
      {/* Header */}
      <View className="bg-white px-5 py-4 flex-row items-center border-b border-gray-200 shadow-sm">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color="#4B5563" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800">
          Active Gate Passes
        </Text>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View className="p-4">
          {passes.length === 0 ? (
            <View className="flex-1 justify-center items-center py-16">
              <View className="bg-indigo-100 p-6 rounded-full mb-4">
                <CheckCircle2 size={36} color="#4f46e5" />
              </View>
              <Text className="text-lg font-medium text-gray-700 mb-1">
                No active gate passes
              </Text>
              <Text className="text-gray-500 text-center mb-6">
                You don't have any approved or active gate passes at the moment.
              </Text>
              <TouchableOpacity
                className="bg-indigo-600 px-6 py-3 rounded-lg flex-row items-center"
                onPress={() => router.push("/screens/profile/gatepass")}
                accessibilityRole="button"
                accessibilityLabel="Create a new gate pass"
              >
                <Text className="text-white font-medium mr-2">
                  Create New Pass
                </Text>
                <ArrowRight size={18} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View className="mb-6">
                <Text className="text-2xl font-bold text-gray-800">
                  Your Active Passes
                </Text>
                <Text className="text-gray-500 mt-1">
                  {passes.length} pass{passes.length !== 1 ? "es" : ""} available
                </Text>
              </View>

              {passes.map((pass) => {
                const status = getStatusDetails(pass);
                // Was `pass.destination`, always truthy: every card showed
                // the home icon regardless of destination.
                const isHome = pass.reason === "Home";

                return (
                  <TouchableOpacity
                    key={pass._id}
                    className={`${status.cardBg} p-5 rounded-xl mb-4 border ${status.cardBorder} shadow-sm`}
                    onPress={() =>
                      router.push(`/screens/profile/gatePassDetails/${pass._id}`)
                    }
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`Pass ${pass._id.slice(-6)}, ${status.text}`}
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

                        <View>
                          <View className="flex-row items-center mb-3">
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

                          {pass.comingDate && (
                            <View className="flex-row items-center mb-3">
                              <View className="bg-indigo-100 p-2 rounded-full mr-3">
                                <Clock size={16} color="#4f46e5" />
                              </View>
                              <View>
                                <Text className="text-xs text-gray-500">
                                  Return Date
                                </Text>
                                <Text className="text-gray-800">
                                  {formatDate(pass.comingDate)}
                                </Text>
                              </View>
                            </View>
                          )}

                          <View className="flex-row items-center">
                            <View className="bg-indigo-100 p-2 rounded-full mr-3">
                              {isHome ? (
                                <Home size={16} color="#4f46e5" />
                              ) : (
                                <MapPin size={16} color="#4f46e5" />
                              )}
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
