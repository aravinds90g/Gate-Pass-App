import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "@/app/global.css";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen
          name="index"
          options={{ title: "Index", headerShown: false }}
        />
        <Stack.Screen
          name="auth/login"
          options={{ title: "Login", headerShown: false }}
        />
        <Stack.Screen
          name="auth/register"
          options={{ title: "Register", headerShown: false }}
        />
        <Stack.Screen
          name="screens/profile"
          options={{ title: "Profile", headerShown: false }}
        />
        <Stack.Screen
          name="screens/profile/gatepass"
          options={{ title: "GatePass", headerShown: false }}
        />
        <Stack.Screen
          name="screens/appInfo/privacyPolicy"
          options={{ title: "privacyPolicy", headerShown: false }}
        />
        <Stack.Screen
          name="screens/appInfo/aboutApp"
          options={{ title: "privacyPolicy", headerShown: false }}
        />
        <Stack.Screen
          name="screens/profile/passStatus"
          options={{ title: "privacyPolicy", headerShown: false }}
        />
        <Stack.Screen
          name="screens/profile/gatePassDetails/[id]"
          options={{ title: "Gate Pass Details" }}
        />
        <Stack.Screen
          name="screens/profile/qrScanner"
          options={{
            title: "QRScannerScreen",
            headerShown: false,
            freezeOnBlur: true,
          }}
        />
        <Stack.Screen
          name="screens/profile/qrCode"
          options={{
            title: "QRScannerScreen",
            headerShown: false,
            freezeOnBlur: true,
          }}
        />
        <Stack.Screen
          name="screens/securityProfile"
          options={{ title: "Security Profile", headerShown: false }}
        />
        <Stack.Screen
          name="screens/mentorProfile"
          options={{ title: "Security Profile", headerShown: false }}
        />
        <Stack.Screen
          name="screens/adminProfile"
          options={{ title: "Admin Profile", headerShown: false }}
        />
        <Stack.Screen
          name="screens/wardenProfile"
          options={{ title: "Warden Profile", headerShown: false }}
        />
        <Stack.Screen
          name="screens/profile/approvedGatepass"
          options={{ title: "ApprovedGatePass", headerShown: false }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
