import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import QRCode from "react-native-qrcode-svg";
import { ChevronLeft, ShieldAlert } from "lucide-react-native";
import { api, apiErrorMessage } from "../../../lib/api";
import { formatDate, getPassDisplayStatus } from "../../../lib/dates";

const QRPage = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [pass, setPass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPass = async () => {
      if (!id) {
        setError("Missing gate pass id");
        setLoading(false);
        return;
      }
      try {
        const response = await api.get(`/gatepass/passdata/${id}`);
        if (!cancelled) setPass(response.data);
      } catch (err) {
        if (!cancelled) {
          setError(apiErrorMessage(err, "Could not load this gate pass."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPass();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const displayStatus = getPassDisplayStatus(pass);
  const isUsable = displayStatus === "approved" || displayStatus === "active";

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center px-5 py-4 border-b border-gray-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color="#4B5563" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800">Gate Pass QR</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <ShieldAlert size={48} color="#ef4444" />
          <Text className="mt-4 text-red-500 text-center">{error}</Text>
        </View>
      ) : !isUsable ? (
        <View className="flex-1 items-center justify-center px-8">
          <ShieldAlert size={56} color="#f59e0b" />
          <Text className="text-xl font-bold text-gray-800 mt-4 text-center">
            This gate pass is no longer valid
          </Text>
          <Text className="text-gray-500 mt-2 text-center">
            {displayStatus === "expired"
              ? `The travel window ended on ${formatDate(
                  pass?.comingDate || pass?.date
                )}.`
              : `Its current status is ${displayStatus ?? "unknown"}.`}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-6 px-6 py-3 bg-indigo-600 rounded-lg"
            accessibilityRole="button"
          >
            <Text className="text-white font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 24 }}>
          <View className="items-center">
            <View className="bg-white p-4 rounded-2xl border border-gray-200">
              <QRCode value={String(id)} size={240} />
            </View>

            <Text className="mt-5 text-lg font-bold text-gray-900">
              {pass?.name}
            </Text>
            <Text className="text-gray-500">
              {pass?.rollNo} • {pass?.dept}
            </Text>

            <View className="mt-4 px-3 py-1 rounded-full bg-green-100">
              <Text className="text-green-700 text-xs font-semibold uppercase">
                {displayStatus}
              </Text>
            </View>

            <Text className="mt-6 text-slate-500 text-center">
              Show this code to the security officer at the gate.
            </Text>
            <Text className="mt-2 text-slate-400 text-xs text-center">
              Gate Pass #{String(id).slice(-6).toUpperCase()}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default QRPage;
