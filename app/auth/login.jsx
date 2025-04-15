import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link, useRouter } from "expo-router";
import axios from "axios";
import { useState } from "react";

export default function LoginScreen() {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onLogin = async (data) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await axios.post(
        "https://gate-pass-backend-2ccd.onrender.com/api/auth/login",
        data,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      const { token, user } = response.data;

      // Store user details in AsyncStorage
      await AsyncStorage.setItem("userToken", token);
      await AsyncStorage.setItem("userData", JSON.stringify(user));

      // Redirect based on user role
      switch (user.role) {
        case "security":
          router.replace("/screens/securityProfile");
          break;
        case "mentor":
          router.replace("/screens/mentorProfile");
          break;
        case "admin":
          router.replace("/screens/adminProfile");
          break;
        case "warden":
          router.replace("/screens/wardenProfile");
          break;
        case "student":
          router.replace("/screens/profile");
          break;
        default:
          router.replace("/screens/profile"); // Default fallback
      }
    } catch (error) {
      console.error("Login Failed:", error.response?.data || error.message);
      setErrorMessage(
        error.response?.data?.message || "Invalid email or password"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-gray-100 p-6">
      <Text className="text-2xl font-bold mb-6">Login</Text>

      {errorMessage ? (
        <Text className="text-red-500 mb-4">{errorMessage}</Text>
      ) : null}

      <View className="w-full">
        <Text className="text-gray-600">Email</Text>
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
              onChangeText={onChange}
              value={value}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}
        />
        {errors.email && (
          <Text className="text-red-500 text-sm">{errors.email.message}</Text>
        )}
      </View>

      <View className="w-full mt-4">
        <Text className="text-gray-600">Password</Text>
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
              secureTextEntry
              onChangeText={onChange}
              value={value}
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
        className="bg-blue-500 w-full py-3 rounded-lg mt-6 items-center justify-center"
        onPress={handleSubmit(onLogin)}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold">Login</Text>
        )}
      </TouchableOpacity>

      <View className="flex-row mt-4">
        <Text className="text-gray-600">Don't have an account? </Text>
        <Link href="/auth/register" className="text-blue-500">
          Sign Up
        </Link>
      </View>
    </View>
  );
}
