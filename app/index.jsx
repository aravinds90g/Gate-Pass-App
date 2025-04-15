import { View, Text, Button, ActivityIndicator } from "react-native";
import { Link, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Index() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);


  const ROLE_ROUTES = {
    security: "/screens/securityProfile",
    mentor: "/screens/mentorProfile",
    admin: "/screens/adminProfile",
    warden: "/screens/wardenProfile",
    student: "/screens/profile",
  };

   useEffect(() => {
     const checkAuthAndRedirect = async () => {
       try {
         const userDataString = await AsyncStorage.getItem("userData");

         if (!userDataString) {
           return router.replace("/auth/login");
         }

         const userData = JSON.parse(userDataString);
         const targetRoute = ROLE_ROUTES[userData?.role] || "/auth/login";

         router.replace(targetRoute);
       } catch (error) {
         console.error("Auth check error:", error);
         router.replace("/auth/login");
       } finally {
         setLoading(false);
       }
     };

     // Small delay to prevent flash of loading screen when redirect is fast
     const timer = setTimeout(checkAuthAndRedirect, 300);
     return () => clearTimeout(timer);
   }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <StatusBar backgroundColor="black" barStyle="light-content" />
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <StatusBar backgroundColor="black" barStyle="light-content" />

      <Text className="text-2xl font-bold mb-4">Welcome to Gate Pass App</Text>

      {/* For demonstration only - these won't show when auto-redirect works */}
      <Link href="/auth/login" className="text-blue-500 mb-2">
        Go to Login
      </Link>

      <Button title="Go to Login" onPress={() => router.push("/auth/login")} />
    </View>
  );
}
