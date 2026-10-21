import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import QRCode from "react-native-qrcode-svg";
import { ChevronLeft, RefreshCw, ShieldAlert } from "lucide-react-native";
import { api, apiErrorMessage } from "../../../lib/api";
import {
  formatDate,
  formatDateTime,
  getPassDisplayStatus,
} from "../../../lib/dates";

const QRPage = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [pass, setPass] = useState(null);
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchQr = useCallback(async () => {
    if (!id) return;
    setRefreshing(true);
    try {
      const response = await api.get(`/gatepass/${id}/qr`);
      setQr(response.data);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not generate a QR code."));
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!id) {
        setError("Missing gate pass id");
        setLoading(false);
        return;
      }
      try {
        const response = await api.get(`/gatepass/passdata/${id}`);
        if (!cancelled) setPass(response.data);
        await fetchQr();
      } catch (err) {
        if (!cancelled) {
          setError(apiErrorMessage(err, "Could not load this gate pass."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, fetchQr]);

  // The server-issued token is short-lived; refresh it just before expiry
  // so the code on screen never becomes stale while the student is at the gate.
  useEffect(() => {
    if (!qr?.expiresAt) return undefined;
    const remaining = new Date(qr.expiresAt).getTime() - Date.now();
    if (remaining <= 0) {
      fetchQr();
      return undefined;
    }
    const timer = setTimeout(fetchQr, remaining + 1000);
    return () => clearTimeout(timer);
  }, [qr?.expiresAt, fetchQr]);

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
      ) : !isUsable || !qr?.token ? (
        <View className="flex-1 items-center justify-center px-8">
          <ShieldAlert size={56} color="#f59e0b" />
          <Text className="text-xl font-bold text-gray-800 mt-4 text-center">
            {isUsable
              ? "Could not generate a QR code"
              : "This gate pass is no longer valid"}
          </Text>
          <Text className="text-gray-500 mt-2 text-center">
            {isUsable
              ? error || "Please check your connection and try again."
              : displayStatus === "expired"
                ? `The travel window ended on ${formatDate(
                    pass?.comingDate || pass?.date
                  )}.`
                : `Its current status is ${displayStatus ?? "unknown"}.`}
          </Text>
          <View className="flex-row mt-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="px-6 py-3 bg-gray-100 rounded-lg mr-3"
              accessibilityRole="button"
            >
              <Text className="text-gray-700 font-medium">Go Back</Text>
            </TouchableOpacity>
            {isUsable && (
              <TouchableOpacity
                onPress={fetchQr}
                className="px-6 py-3 bg-indigo-600 rounded-lg"
                accessibilityRole="button"
                accessibilityLabel="Retry generating the QR code"
              >
                <Text className="text-white font-medium">Try Again</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 24 }}>
          <View className="items-center">
            <View className="bg-white p-4 rounded-2xl border border-gray-200">
              <QRCode value={qr.token} size={240} />
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

            <View className="mt-5 flex-row items-center">
              <Text className="text-gray-400 text-xs">
                {`Valid until ${formatDateTime(qr.expiresAt)}`}
              </Text>
              <TouchableOpacity
                onPress={fetchQr}
                disabled={refreshing}
                className="ml-3 p-2"
                accessibilityRole="button"
                accessibilityLabel="Refresh QR code"
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color="#4f46e5" />
                ) : (
                  <RefreshCw size={16} color="#4f46e5" />
                )}
              </TouchableOpacity>
            </View>

            {error ? (
              <Text className="text-red-500 text-xs mt-2 text-center">
                {`Could not refresh: ${error}`}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default QRPage;
