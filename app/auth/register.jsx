import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { Link, useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { useState, useEffect } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { api, apiErrorMessage } from "../../lib/api";

export default function Register() {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    unregister,
    formState: { errors },
  } = useForm();

  const [selectedRole, setSelectedRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedDept, setSelectedDept] = useState("ECE");
  const [selectedYear, setSelectedYear] = useState("1");

  const departments = ["ECE", "CSE", "MECH", "EEE", "CSE(CS)", "AIDS"];
  const years = ["1", "2", "3", "4"];

  // Student-only fields must not ride along when the role changes to mentor.
  useEffect(() => {
    if (selectedRole !== "student") {
      unregister(["rollNo", "phoneNo"]);
    }
  }, [selectedRole, unregister]);

  const onSignup = async (data) => {
    setLoading(true);
    setErrorMessage("");

    const requestData = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      role: selectedRole,
      dept: selectedDept,
      year: selectedYear,
      ...(selectedRole === "student"
        ? { rollNo: data.rollNo, phoneNo: data.phoneNo }
        : {}),
    };

    try {
      await api.post("/auth/register", requestData);
      router.replace("/auth/login");
    } catch (error) {
      setErrorMessage(apiErrorMessage(error, "Signup failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View className="items-center mt-10 mb-6">
            <Text className="text-3xl font-bold text-gray-800">
              Create Account
            </Text>
            <Text className="text-gray-500 mt-2">Join our community today</Text>
          </View>

          {errorMessage ? (
            <View className="bg-red-100 p-3 rounded-lg mb-4">
              <Text className="text-red-600 text-center">{errorMessage}</Text>
            </View>
          ) : null}

          {/* Role Selection — only student and mentor self-register.
              Admin, warden and security accounts are institutional roles and
              must be provisioned server-side; offering them here let anyone
              grant themselves approval/verification rights. */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">I am a</Text>
            <View className="border border-gray-200 rounded-xl bg-white overflow-hidden">
              <Picker
                selectedValue={selectedRole}
                onValueChange={(itemValue) => setSelectedRole(itemValue)}
                style={styles.picker}
                accessibilityLabel="Role"
              >
                <Picker.Item label="Student" value="student" />
                <Picker.Item label="Mentor" value="mentor" />
              </Picker>
            </View>
            <Text className="text-gray-400 text-xs mt-2">
              Staff accounts are created by the campus administration.
            </Text>
          </View>

          {/* Full Name */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Full Name</Text>
            <Controller
              control={control}
              name="name"
              rules={{ required: "Full Name is required" }}
              render={({ field: { onChange, value } }) => (
                <View className="relative">
                  <TextInput
                    className="border border-gray-200 rounded-xl py-3 px-12 bg-white text-gray-800"
                    placeholder="John Doe"
                    accessibilityLabel="Full name"
                    autoComplete="name"
                    onChangeText={onChange}
                    value={value}
                  />
                  <MaterialIcons
                    name="person"
                    size={20}
                    color="#9CA3AF"
                    style={styles.inputIcon}
                  />
                </View>
              )}
            />
            {errors.name && (
              <Text className="text-red-500 mt-1 text-sm">
                {errors.name.message}
              </Text>
            )}
          </View>

          {/* Email */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Email</Text>
            <Controller
              control={control}
              name="email"
              rules={{
                required: "Email is required",
                pattern: {
                  value: /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/,
                  message: "Invalid email format",
                },
              }}
              render={({ field: { onChange, value } }) => (
                <View className="relative">
                  <TextInput
                    className="border border-gray-200 rounded-xl px-12 py-3 bg-white text-gray-800"
                    placeholder="john@example.com"
                    accessibilityLabel="Email"
                    autoComplete="email"
                    textContentType="emailAddress"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onChangeText={onChange}
                    value={value}
                  />
                  <MaterialIcons
                    name="email"
                    size={20}
                    color="#9CA3AF"
                    style={styles.inputIcon}
                  />
                </View>
              )}
            />
            {errors.email && (
              <Text className="text-red-500 mt-1 text-sm">
                {errors.email.message}
              </Text>
            )}
          </View>

          {/* Password */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Password</Text>
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
                <View className="relative">
                  <TextInput
                    className="border border-gray-200 rounded-xl px-12 py-3 bg-white text-gray-800 pr-10"
                    placeholder="••••••••"
                    accessibilityLabel="Password"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    secureTextEntry={!showPassword}
                    onChangeText={onChange}
                    value={value}
                  />
                  <MaterialIcons
                    name="lock"
                    size={20}
                    color="#9CA3AF"
                    style={styles.inputIcon}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                  >
                    <MaterialIcons
                      name={showPassword ? "visibility" : "visibility-off"}
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.password && (
              <Text className="text-red-500 mt-1 text-sm">
                {errors.password.message}
              </Text>
            )}
          </View>

          {/* Conditional Fields Based on Role */}
          {(selectedRole === "student" || selectedRole === "mentor") && (
            <>
              {/* Roll No (Only for Students) */}
              {selectedRole === "student" && (
                <View className="mb-4">
                  <Text className="text-gray-700 font-medium mb-2">
                    Roll Number
                  </Text>
                  <Controller
                    control={control}
                    name="rollNo"
                    rules={{ required: "Roll No is required" }}
                    render={({ field: { onChange, value } }) => (
                      <View className="relative">
                        <TextInput
                          className="border border-gray-200 rounded-xl px-12 py-3 bg-white text-gray-800"
                          placeholder="412622106001"
                          accessibilityLabel="Roll number"
                          onChangeText={onChange}
                          value={value}
                        />
                        <MaterialIcons
                          name="badge"
                          size={20}
                          color="#9CA3AF"
                          style={styles.inputIcon}
                        />
                      </View>
                    )}
                  />
                  {errors.rollNo && (
                    <Text className="text-red-500 mt-1 text-sm">
                      {errors.rollNo.message}
                    </Text>
                  )}
                </View>
              )}

              {/* Phone Number (Only for Students) */}
              {selectedRole === "student" && (
                <View className="mb-4">
                  <Text className="text-gray-700 font-medium mb-2">
                    Phone Number
                  </Text>
                  <Controller
                    control={control}
                    name="phoneNo"
                    rules={{
                      required: "Phone number is required",
                      pattern: {
                        value: /^[0-9]{10}$/,
                        message: "Invalid phone number (10 digits)",
                      },
                    }}
                    render={({ field: { onChange, value } }) => (
                      <View className="relative">
                        <TextInput
                          className="border border-gray-200 rounded-xl px-12 py-3 bg-white text-gray-800"
                          placeholder="9876543210"
                          accessibilityLabel="Phone number"
                          autoComplete="tel"
                          textContentType="telephoneNumber"
                          keyboardType="phone-pad"
                          onChangeText={onChange}
                          value={value}
                          maxLength={10}
                        />
                        <MaterialIcons
                          name="phone"
                          size={20}
                          color="#9CA3AF"
                          style={styles.inputIcon}
                        />
                      </View>
                    )}
                  />
                  {errors.phoneNo && (
                    <Text className="text-red-500 mt-1 text-sm">
                      {errors.phoneNo.message}
                    </Text>
                  )}
                </View>
              )}

              {/* Department (For Students & Mentors) */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">
                  Department
                </Text>
                <View className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                  <Picker
                    selectedValue={selectedDept}
                    onValueChange={(itemValue) => setSelectedDept(itemValue)}
                    style={styles.picker}
                  >
                    {departments.map((dept) => (
                      <Picker.Item key={dept} label={dept} value={dept} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Year (For Students & Mentors) */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Year</Text>
                <View className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                  <Picker
                    selectedValue={selectedYear}
                    onValueChange={(itemValue) => setSelectedYear(itemValue)}
                    style={styles.picker}
                  >
                    {years.map((year) => (
                      <Picker.Item key={year} label={year} value={year} />
                    ))}
                  </Picker>
                </View>
              </View>
            </>
          )}

          {/* Register Button */}
          <TouchableOpacity
            className="bg-blue-600 py-4 rounded-xl mt-6 flex-row justify-center items-center"
            onPress={handleSubmit(onSignup)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text className="text-white font-bold text-lg">Register</Text>
                <MaterialIcons
                  name="arrow-forward"
                  size={20}
                  color="white"
                  style={{ marginLeft: 10 }}
                />
              </>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-600">Already have an account? </Text>
            <Link href="/auth/login" className="text-blue-500 font-medium">
              Login here
            </Link>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  picker: {
    height: 50,
    color: "#374151",
  },
  inputIcon: {
    position: "absolute",
    left: 12,
    top: 12,
  },
  passwordToggle: {
    position: "absolute",
    right: 12,
    top: 14,
  },
});
