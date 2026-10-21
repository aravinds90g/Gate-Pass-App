import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { api, apiErrorMessage } from "../../lib/api";
import { routeForRole, saveSession } from "../../lib/session";

export default function LoginScreen() {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();
  const [errorMessage, setErrorMessage] = useState("");

  const onLogin = async (data) => {
    setErrorMessage("");

    try {
      const response = await api.post("/auth/login", {
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      const { token, user } = response.data || {};
      if (!token || !user) {
        setErrorMessage("Unexpected response from the server. Please try again.");
        return;
      }

      await saveSession(token, user);
      router.replace(routeForRole(user.role));
    } catch (error) {
      console.error("Login failed:", error.response?.data || error.message);
      setErrorMessage(
        apiErrorMessage(error, "Invalid email or password")
      );
    }
  };

  const busy = isSubmitting;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-100"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View className="flex-1 justify-center px-6 py-10">
          <Text className="text-2xl font-bold mb-6 text-center">Login</Text>

          {errorMessage ? (
            <View
              className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4"
              accessibilityLiveRegion="polite"
            >
              <Text className="text-red-600 text-center">{errorMessage}</Text>
            </View>
          ) : null}

          <View className="w-full">
            <Text className="text-gray-600 mb-1">Email</Text>
            <Controller
              control={control}
              name="email"
              rules={{
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
                },
              }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-2 bg-white mb-1"
                  placeholder="Enter email"
                  accessibilityLabel="Email"
                  autoComplete="email"
                  textContentType="emailAddress"
                  onChangeText={onChange}
                  value={value}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!busy}
                />
              )}
            />
            {errors.email && (
              <Text className="text-red-500 text-sm">
                {errors.email.message}
              </Text>
            )}
          </View>

          <View className="w-full mt-4">
            <Text className="text-gray-600 mb-1">Password</Text>
            <Controller
              control={control}
              name="password"
              rules={{
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
              }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-2 bg-white mb-1"
                  placeholder="Enter password"
                  accessibilityLabel="Password"
                  autoComplete="current-password"
                  textContentType="password"
                  secureTextEntry
                  onChangeText={onChange}
                  value={value}
                  editable={!busy}
                  onSubmitEditing={handleSubmit(onLogin)}
                  returnKeyType="go"
                />
              )}
            />
            {errors.password && (
              <Text className="text-red-500 text-sm">
                {errors.password.message}
              </Text>
            )}
          </View>

          <TouchableOpacity
            className={`w-full py-3 rounded-lg mt-6 items-center justify-center ${
              busy ? "bg-blue-400" : "bg-blue-500"
            }`}
            onPress={handleSubmit(onLogin)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Log in"
            accessibilityState={{ busy }}
          >
            {busy ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold">Login</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mt-4">
            <Text className="text-gray-600">{"Don't have an account? "}</Text>
            <Link
              href="/auth/register"
              className="text-blue-500"
              accessibilityRole="link"
            >
              Sign Up
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
