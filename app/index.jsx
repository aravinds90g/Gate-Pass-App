import { View, Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  getSession,
  routeForRole,
  clearSession,
  LOGIN_ROUTE,
} from "../lib/session";

export default function Index() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAuthAndRedirect = async () => {
      try {
        const { token, user } = await getSession();

        // A stored user with no token is a dead session: sending them to a
        // dashboard only produces silent 401s on every request.
        if (!token || !user?.role) {
          await clearSession();
          if (!cancelled) router.replace(LOGIN_ROUTE);
          return;
        }

        if (!cancelled) router.replace(routeForRole(user.role));
      } catch (error) {
        console.error("Auth check error:", error);
        if (!cancelled) router.replace(LOGIN_ROUTE);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    checkAuthAndRedirect();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <StatusBar style="dark" />
      <ActivityIndicator size="large" color="#4f46e5" />
      <Text className="mt-4 text-gray-500">
        {loading ? "Checking your session..." : "Redirecting..."}
      </Text>
    </View>
  );
}
