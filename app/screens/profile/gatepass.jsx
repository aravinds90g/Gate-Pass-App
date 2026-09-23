import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { useState, useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import RNPickerSelect from "react-native-picker-select";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { useRouter } from "expo-router";
import {
  Calendar,
  Clock,
  MapPin,
  ClipboardList,
  User,
  Phone,
  ChevronLeft,
} from "lucide-react-native";

export default function GatePass() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split("T")[0];
      setValue("date", formattedDate);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours();
      const minutes = selectedTime.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const formattedHours = hours % 12 || 12;
      const formattedTime = `${formattedHours}:${minutes
        .toString()
        .padStart(2, "0")} ${ampm}`;
      setValue("time", formattedTime);
    }
  };

  const handleReturnDateChange = (event, selectedDate) => {
    setShowReturnDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split("T")[0];
      setValue("comingDate", formattedDate);
    }
  };

  const getUserData = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem("userData");
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      console.error("Error reading user data from AsyncStorage:", e);
      return null;
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getUserData();
      setEmail(user.email);
      setValue("email", user.email);
    };
    fetchUser();
  }, []);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: email,
      date: "",
      time: "",
      destination: "",
      reason: "",
      customReason: "",
      comingDate: "",
      parentName: "",
      parentContact: "",
    },
  });

  const reasonType = watch("reason");

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    reset();
    setSubmitted(false);
    setTimeout(() => setRefreshing(false), 1000);
  }, [reset]);

  const onSubmit = async (data) => {
    try {
      const response = await axios.post(
        "https://gate-pass-backend-2ccd.onrender.com/api/gatepass/apply",
        data
      );
      setSubmitted(true);

      // Reset form while keeping the email and clearing other fields
      reset({
        email: email, // Keep the email
        date: "",
        time: "",
        destination: "",
        reason: "Others", // Set to null instead of empty string
        customReason: "",
        comingDate: "",
        parentName: "",
        parentContact: "",
        reasonForGoingHome: "",
      });

      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Something went wrong."
      );
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 py-4 flex-row items-center border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ChevronLeft size={24} color="#4B5563" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800">New Gate Pass</Text>
      </View>

      <ScrollView
        className="flex-1 bg-gray-50"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-6">
          {/* Header */}
          <View className="mb-5">
            <Text className="text-3xl font-bold text-gray-900">Gate Pass</Text>
            <Text className="text-gray-500 mt-1">
              Fill out the form to request permission
            </Text>
          </View>

          {submitted && (
            <View className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg">
              <Text className="text-green-800 font-medium">
                Gate pass submitted successfully!
              </Text>
            </View>
          )}

          {/* Form Fields */}
          <View className="space-y-5">
            {/* Leaving Date */}
            <View>
              <View className="flex-row items-center mb-1">
                <Calendar size={18} color="#6B7280" />
                <Text className="text-gray-700 mx-4">Leaving Date</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className={`bg-white border mb-3 ${
                  errors.date ? "border-red-300" : "border-gray-200"
                } rounded-lg px-4 py-3 shadow-sm`}
              >
                <Text className="text-gray-700">
                  {watch("date") || "Select a date..."}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date()}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}
              {errors.date && (
                <Text className="text-red-500 text-sm mt-1">
                  {errors.date.message}
                </Text>
              )}
            </View>

            {/* Leaving Time */}
            <View>
              <View className="flex-row items-center mb-1">
                <Clock size={18} color="#6B7280" className="mr-3" />
                <Text className="text-gray-700 mx-4 font-medium">
                  Leaving Time
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                className={`bg-white border mb-3 ${
                  errors.time ? "border-red-300" : "border-gray-200"
                } rounded-lg px-4 py-3 shadow-sm`}
              >
                <Text className="text-gray-700">
                  {watch("time") || "Select a time..."}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={new Date()}
                  mode="time"
                  display="default"
                  onChange={handleTimeChange}
                />
              )}
              {errors.time && (
                <Text className="text-red-500 text-sm mt-1">
                  {errors.time.message}
                </Text>
              )}
            </View>

            {/* Place */}
            <View>
              <View className="flex-row items-center mb-1">
                <MapPin size={18} color="#6B7280" className="mr-2" />
                <Text className="text-gray-700 mx-4 font-medium">Place</Text>
              </View>
              <Controller
                control={control}
                name="destination"
                rules={{ required: "Place is required" }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className={`bg-white border mb-3 ${
                      errors.destination ? "border-red-300" : "border-gray-200"
                    } rounded-lg px-4 py-3 shadow-sm`}
                    placeholder="Where are you going?"
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.destination && (
                <Text className="text-red-500 text-sm mt-1">
                  {errors.destination.message}
                </Text>
              )}
            </View>

            {/* Reason */}
            <View>
              <View className="flex-row items-center mb-1">
                <ClipboardList size={18} color="#6B7280" className="mr-2" />
                <Text className="text-gray-700 mx-4 font-medium">Reason</Text>
              </View>
              <Controller
                control={control}
                name="reason"
                rules={{ required: "Reason is required" }}
                render={({ field: { onChange, value } }) => (
                  <View
                    className={`bg-white border mb-3 ${
                      errors.reason ? "border-red-300" : "border-gray-200"
                    } rounded-lg px-2 py-1 shadow-sm`}
                  >
                    <RNPickerSelect
                      onValueChange={(selected) => {
                        onChange(selected);
                        if (selected !== "Others") setValue("customReason", "");
                      }}
                      value={value}
                      placeholder={{
                        label: "Select a reason...",
                        value: null, // Make sure placeholder value is null
                      }}
                      items={[
                        { label: "Going Home", value: "Home" },
                        { label: "Others", value: "Others" },
                      ]}
                      style={{
                        inputIOS: {
                          paddingVertical: 12,
                          paddingHorizontal: 10,
                          color: value ? "#374151" : "#9CA3AF", // Gray color when no value is selected
                        },
                        inputAndroid: {
                          paddingVertical: 12,
                          paddingHorizontal: 10,
                          color: value ? "#374151" : "#9CA3AF",
                        },
                      }}
                    />
                  </View>
                )}
              />
              {errors.reason && (
                <Text className="text-red-500 text-sm mt-1">
                  {errors.reason.message}
                </Text>
              )}
            </View>

            {/* Custom Reason */}
            {reasonType === "Others" && (
              <View>
                <Text className="text-gray-700 mx-4 font-medium mb-1">
                  Custom Reason
                </Text>
                <Controller
                  control={control}
                  name="customReason"
                  rules={{ required: "Custom reason is required" }}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      className={`bg-white border mb-3 ${
                        errors.customReason
                          ? "border-red-300"
                          : "border-gray-200"
                      } rounded-lg px-4 py-3 shadow-sm`}
                      placeholder="Please specify your reason"
                      onChangeText={onChange}
                      value={value}
                      multiline
                    />
                  )}
                />
              </View>
            )}

            {/* Home-Specific Fields */}
            {reasonType === "Home" && (
              <>
                <View>
                  <View className="flex-row items-center mb-1">
                    <Calendar size={18} color="#6B7280" />
                    <Text className="text-gray-700 mx-4">Return Date</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowReturnDatePicker(true)}
                    className={`bg-white border mb-3 ${
                      errors.comingDate ? "border-red-300" : "border-gray-200"
                    } rounded-lg px-4 py-3 shadow-sm`}
                  >
                    <Text className="text-gray-700">
                      {watch("comingDate") || "Select return date..."}
                    </Text>
                  </TouchableOpacity>
                  {showReturnDatePicker && (
                    <DateTimePicker
                      value={
                        watch("comingDate")
                          ? new Date(watch("comingDate"))
                          : // Default to the leaving date (never below
                            // minimumDate): a value below minimumDate
                            // prevents the native dialog from opening.
                            watch("date")
                            ? new Date(watch("date"))
                            : new Date()
                      }
                      mode="date"
                      display="default"
                      onChange={handleReturnDateChange}
                      minimumDate={
                        watch("date") ? new Date(watch("date")) : new Date()
                      }
                    />
                  )}
                  {errors.comingDate && (
                    <Text className="text-red-500 text-sm mt-1">
                      {errors.comingDate.message}
                    </Text>
                  )}
                </View>

                <View>
                  <View className="flex-row items-center mb-1">
                    {/* <User size={18} color="#6B7280" className="mr-2" /> */}
                    <Text className="text-gray-700 mx-4 font-medium">
                      Reason For Going Home
                    </Text>
                  </View>
                  <Controller
                    control={control}
                    name="reasonForGoingHome"
                    rules={{ required: "Reason is required" }}
                    render={({ field: { onChange, value } }) => (
                      <TextInput
                        className={`bg-white border mb-3 ${
                          errors.parentName
                            ? "border-red-300"
                            : "border-gray-200"
                        } rounded-lg px-4 py-3 shadow-sm`}
                        placeholder="Reason "
                        onChangeText={onChange}
                        value={value}
                      />
                    )}
                  />
                </View>

                <View>
                  <View className="flex-row items-center mb-1">
                    <User size={18} color="#6B7280" className="mr-2" />
                    <Text className="text-gray-700 mx-4 font-medium">
                      Parent's Name
                    </Text>
                  </View>
                  <Controller
                    control={control}
                    name="parentName"
                    rules={{ required: "Parent's name is required" }}
                    render={({ field: { onChange, value } }) => (
                      <TextInput
                        className={`bg-white border mb-3 ${
                          errors.parentName
                            ? "border-red-300"
                            : "border-gray-200"
                        } rounded-lg px-4 py-3 shadow-sm`}
                        placeholder="Parent's full name"
                        onChangeText={onChange}
                        value={value}
                      />
                    )}
                  />
                </View>

                <View>
                  <View className="flex-row items-center mb-1">
                    <Phone size={18} color="#6B7280" className="mr-2" />
                    <Text className="text-gray-700 mx-4 font-medium">
                      Parent's Contact
                    </Text>
                  </View>
                  <Controller
                    control={control}
                    name="parentContact"
                    rules={{
                      required: "Parent's contact is required",
                      pattern: {
                        value: /^[0-9]{10}$/,
                        message: "Enter a valid 10-digit phone number",
                      },
                    }}
                    render={({ field: { onChange, value } }) => (
                      <TextInput
                        className={`bg-white border mb-3 ${
                          errors.parentContact
                            ? "border-red-300"
                            : "border-gray-200"
                        } rounded-lg px-4 py-3 shadow-sm`}
                        placeholder="10-digit phone number"
                        keyboardType="numeric"
                        onChangeText={onChange}
                        value={value}
                      />
                    )}
                  />
                </View>
              </>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              className="bg-indigo-600 w-full py-4 rounded-lg mt-6 shadow-md"
              onPress={handleSubmit(onSubmit)}
            >
              <Text className="text-white text-center font-bold text-lg">
                Submit Request
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
