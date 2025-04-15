import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  MaterialIcons,
  FontAwesome,
  Ionicons,
  Feather,
} from "@expo/vector-icons";
import axios from "axios";
import dayjs from "dayjs";

const statusConfig = {
  pending: {
    bg: "bg-amber-100",
    text: "text-amber-800",
    icon: { name: "hourglass-empty", color: "#f59e0b" },
    border: "border-amber-300",
    headerBg: "bg-amber-100",
    cardBg: "bg-amber-50",
    accent: "amber",
  },
  approved: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    icon: { name: "check-circle", color: "#3b82f6" },
    border: "border-blue-300",
    headerBg: "bg-blue-100",
    cardBg: "bg-blue-50",
    accent: "blue",
  },
  active: {
    bg: "bg-green-100",
    text: "text-green-800",
    icon: { name: "check-circle", color: "#10b981" },
    border: "border-green-300",
    headerBg: "bg-green-100",
    cardBg: "bg-green-50",
    accent: "green",
  },
  rejected: {
    bg: "bg-red-100",
    text: "text-red-800",
    icon: { name: "cancel", color: "#f43f5e" },
    border: "border-red-300",
    headerBg: "bg-red-100",
    cardBg: "bg-red-50",
    accent: "red",
  },
  expired: {
    bg: "bg-gray-200",
    text: "text-gray-800",
    icon: { name: "timer-off", color: "#64748b" },
    border: "border-gray-300",
    headerBg: "bg-gray-100",
    cardBg: "bg-gray-50",
    accent: "gray",
  },
};

const GatePassDetails = () => {
  const { id } = useLocalSearchParams();
  const [pass, setPass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPass = async () => {
    try {
      const res = await axios.get(
        `https://gate-pass-backend-2ccd.onrender.com/api/gatepass/passdata/${id}`
      );
      setPass(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch pass details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPass();
  }, [id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPass();
  }, []);

  if (loading && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-4">
        <MaterialIcons name="error-outline" size={32} color="#ef4444" />
        <Text className="mt-4 text-red-500 text-center">{error}</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 px-6 py-2 bg-indigo-500 rounded-lg"
        >
          <Text className="text-white font-medium">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!pass) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500">No pass data found</Text>
      </View>
    );
  }

  const status = statusConfig[pass.status] || statusConfig.default;
  const accentColor = status.accent;

  const showQRButton = pass.status === "active" || pass.status === "approved";
  // const isExpired =
  //   pass.status === "expired" ||
  //   (pass.comingDate && dayjs(pass.comingDate).isBefore(dayjs()));

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1 pb-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Status Header */}
        <View className={`p-6 ${status.headerBg} items-center justify-center`}>
          <View
            className={`w-20 h-20 rounded-full ${status.bg} items-center justify-center mb-4`}
          >
            <MaterialIcons
              name={status.icon.name}
              size={36}
              color={status.icon.color}
            />
          </View>
          <Text className={`text-2xl font-bold ${status.text} mb-1`}>
            {pass.status.toUpperCase()}
          </Text>
          <Text className="text-gray-600 mb-5">
            Gate Pass #{pass._id.slice(-6).toUpperCase()}
          </Text>
        </View>

        {/* Main Card */}
        <View
          className={`mx-4 -mt-8 rounded-2xl overflow-hidden shadow-lg ${status.border}`}
        >
          {/* Student Information */}
          <View className="p-6 bg-white">
            <View className="flex-row items-center">
              <View
                className={`w-16 h-16 ${status.bg} rounded-full items-center justify-center`}
              >
                <FontAwesome name="user" size={24} color={status.icon.color} />
              </View>
              <View className="ml-4">
                <Text className="text-xl font-bold text-gray-800">
                  {pass.name}
                </Text>
                <View className="flex-row flex-wrap mt-2">
                  <View
                    className={`px-2 py-1 rounded-md bg-${accentColor}-100 mr-2 mb-2`}
                  >
                    <Text
                      className={`text-xs font-medium text-${accentColor}-800`}
                    >
                      Roll: {pass.rollNo}
                    </Text>
                  </View>
                  <View
                    className={`px-2 py-1 rounded-md bg-${accentColor}-100`}
                  >
                    <Text
                      className={`text-xs font-medium text-${accentColor}-800`}
                    >
                      Dept: {pass.dept}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Pass Details */}
          <View className="p-6 bg-white border-t border-gray-100">
            <View
              className={`flex-row items-center mb-4 px-3 py-2 rounded-lg bg-${accentColor}-100`}
            >
              <Ionicons
                name="document-text-outline"
                size={20}
                color={status.icon.color}
              />
              <Text className={`ml-2 font-bold text-${accentColor}-800`}>
                PASS DETAILS
              </Text>
            </View>

            <View className="space-y-4">
              <View className="flex-row justify-between items-center bg-gray-50 p-3 rounded-lg">
                <View className="flex-row items-center">
                  <Feather name="calendar" size={18} color="#64748b" />
                  <Text className="ml-2 text-gray-500">Departure Date</Text>
                </View>
                <Text className="font-bold text-gray-800">
                  {dayjs(pass.date).format("DD MMM YYYY")}
                </Text>
              </View>

              <View className="flex-row justify-between items-center bg-gray-50 p-3 rounded-lg">
                <View className="flex-row items-center">
                  <Feather name="clock" size={18} color="#64748b" />
                  <Text className="ml-2 text-gray-500">Departure Time</Text>
                </View>
                <Text className="font-bold text-gray-800">{pass.time}</Text>
              </View>

              <View className="flex-row justify-between items-center bg-gray-50 p-3 rounded-lg">
                <View className="flex-row items-center">
                  <Feather name="map-pin" size={18} color="#64748b" />
                  <Text className="ml-2 text-gray-500">Destination</Text>
                </View>
                <Text className="font-bold text-gray-800">
                  {pass.destination}
                </Text>
              </View>

              {pass.comingDate && (
                <View className="flex-row justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <View className="flex-row items-center">
                    <Feather name="home" size={18} color="#64748b" />
                    <Text className="ml-2 text-gray-500">Return Date</Text>
                  </View>
                  <Text className="font-bold text-gray-800">
                    {dayjs(pass.comingDate).format("DD MMM YYYY")}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Reason Section */}
          <View className="p-6 bg-white border-t border-gray-100">
            <View
              className={`flex-row items-center mb-4 px-3 py-2 rounded-lg bg-${accentColor}-100`}
            >
              <Ionicons
                name="help-circle-outline"
                size={20}
                color={status.icon.color}
              />
              <Text className={`ml-2 font-bold text-${accentColor}-800`}>
                REASON
              </Text>
            </View>
            <View className={`p-4 rounded-lg bg-${accentColor}-100`}>
              <Text className={`font-medium text-${accentColor}-800`}>
                {pass.reason === "Others" ? pass.customReason : pass.reason}
                {pass.reason === "Home"
                  ? `  ( ${pass.reasonForGoingHome} )`
                  : ""}
              </Text>
            </View>
          </View>

          {pass.status === "expired" ? (
            <View className="p-6 bg-white border-t border-gray-100">
              <View
                className={`flex-row items-center mb-4 px-3 py-2 rounded-lg bg-${accentColor}-100`}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={status.icon.color}
                />
                <Text className={`ml-2 font-bold text-${accentColor}-800`}>
                  Pass Status Details
                </Text>
              </View>
              <View className={`p-4 rounded-lg bg-${accentColor}-100`}>
                {pass.activedAt && (
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={status.icon.color}
                    />
                    <Text
                      className={`ml-2 text-sm font-medium text-${accentColor}-800`}
                    >
                      {`Activated: ${new Date(pass.activedAt).toLocaleString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}`}
                    </Text>
                  </View>
                )}
                {pass.expiredAt && (
                  <View className="flex-row items-center">
                    <Ionicons
                      name="timer-outline"
                      size={16}
                      color={status.icon.color}
                    />
                    <Text
                      className={`ml-2 text-sm font-medium text-${accentColor}-800`}
                    >
                      {`Expired At: ${new Date(pass.expiredAt).toLocaleString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}`}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            ""
          )}

          {/* Parent Contact (if applicable) */}
          {(pass.reason === "Home" || pass.parentContact) && (
            <View className="p-6 bg-white border-t border-gray-100">
              <View
                className={`flex-row items-center mb-4 px-3 py-2 rounded-lg bg-${accentColor}-100`}
              >
                <Ionicons
                  name="people-outline"
                  size={20}
                  color={status.icon.color}
                />
                <Text className={`ml-2 font-bold text-${accentColor}-800`}>
                  PARENT CONTACT
                </Text>
              </View>
              <View className={`p-4 rounded-lg bg-${accentColor}-100`}>
                <Text className={`font-bold text-${accentColor}-800`}>
                  {pass.parentName}
                </Text>
                <View className="flex-row items-center mt-2">
                  <MaterialIcons
                    name="phone"
                    size={20}
                    color={status.icon.color}
                  />
                  <Text className={`ml-2 font-medium text-${accentColor}-800`}>
                    {pass.parentContact}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Approval/Rejection Info */}
          {(pass.status === "approved" ||
            pass.status === "rejected" ||
            pass.status === "active") && (
            <View className="p-6 bg-white border-t border-gray-100">
              <View
                className={`flex-row items-center mb-4 px-3 py-2 rounded-lg bg-${accentColor}-100`}
              >
                <Ionicons
                  name={
                    pass.status === "rejected"
                      ? "close-circle-outline"
                      : "checkmark-circle-outline"
                  }
                  size={20}
                  color={status.icon.color}
                />
                <Text className={`ml-2 font-bold text-${accentColor}-800`}>
                  {pass.status === "rejected" ? "REJECTION" : "APPROVAL"}{" "}
                  DETAILS
                </Text>
              </View>
              <View className="flex-row items-center p-4 rounded-lg bg-gray-50">
                <View
                  className={`w-12 h-12 ${status.bg} rounded-full items-center justify-center`}
                >
                  <FontAwesome
                    name={
                      pass.status === "rejected"
                        ? "times-circle"
                        : "check-circle"
                    }
                    size={20}
                    color={status.icon.color}
                  />
                </View>
                <View className="ml-4">
                  <Text className="font-bold text-gray-800">
                    {"By "}
                    {pass.approvedBy || pass.rejectedBy || "System"}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    {dayjs(
                      pass.approvedAt || pass.rejectedAt || pass.activedAt
                    ).format("DD MMM YYYY, hh:mm A")}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View
          className={`mx-4 mt-6 bg-white rounded-2xl ${
            showQRButton ? "mb-20" : "mb-9"
          } p-6 shadow-sm`}
        >
          <View
            className={`flex-row items-center mb-4 px-3 py-2 rounded-lg bg-${accentColor}-100`}
          >
            <Ionicons name="time-outline" size={20} color={status.icon.color} />
            <Text className={`ml-2 font-bold text-${accentColor}-800`}>
              APPLICATION TIME
            </Text>
          </View>
          <View className="flex-row justify-between items-center bg-gray-50 p-4 rounded-lg">
            <View className="flex-row items-center">
              <Feather name="clock" size={18} color="#64748b" />
              <Text className="ml-2 text-gray-500">Applied on</Text>
            </View>
            <Text className="font-bold text-gray-800">
              {dayjs(pass.appliedAt).format("DD MMM YYYY, hh:mm A")}
            </Text>
          </View>
        </View>

        {/* Floating QR Button */}
        {showQRButton && (
          <View className="absolute bottom-6 right-0 left-0 items-center">
            <TouchableOpacity
              className={`w-11/12 py-4 ${
                pass.status === "approved" ? "bg-blue-500" : "bg-green-500"
              } rounded-full flex-row items-center justify-center shadow-xl`}
              onPress={() =>
                router.push({
                  pathname: "/screens/profile/qrCode",
                  params: {
                    id: pass._id,
                  },
                })
              }
              activeOpacity={0.8}
            >
              <MaterialIcons name="qr-code-scanner" size={24} color="white" />
              <Text className="text-white font-bold text-lg ml-2">
                {pass.status === "approved"
                  ? "Generate QR Code"
                  : "Generate QR Code"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default GatePassDetails;
