import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState, useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import RNPickerSelect from "react-native-picker-select";
import DateTimePicker from "@react-native-community/datetimepicker";
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
import { api, apiErrorMessage } from "../../../lib/api";
import { getSession } from "../../../lib/session";
import {
  parsePassDate,
  timeStringToDate,
  toLocalDateString,
} from "../../../lib/dates";

const emptyForm = (email = "") => ({
  email,
  date: "",
  time: "",
  destination: "",
  reason: "",
  customReason: "",
  comingDate: "",
  parentName: "",
  parentContact: "",
  reasonForGoingHome: "",
});

export default function GatePass() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    clearErrors,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: emptyForm() });

  const reasonType = watch("reason");
  const dateValue = watch("date");
  const timeValue = watch("time");
  const comingDateValue = watch("comingDate");

  useEffect(() => {
    const loadUser = async () => {
      const { user } = await getSession();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      setValue("email", user.email ?? "");
    };
    loadUser();
  }, [router, setValue]);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event?.type === "dismissed" || !selectedDate) return;
    clearErrors("date");
    setValue("date", toLocalDateString(selectedDate), {
      shouldValidate: true,
    });
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (event?.type === "dismissed" || !selectedTime) return;
    clearErrors("time");
    const hours = selectedTime.getHours();
    const minutes = selectedTime.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    const formattedTime = `${formattedHours}:${minutes
      .toString()
      .padStart(2, "0")} ${ampm}`;
    setValue("time", formattedTime, { shouldValidate: true });
  };

  const handleReturnDateChange = (event, selectedDate) => {
    setShowReturnDatePicker(false);
    if (event?.type === "dismissed" || !selectedDate) return;
    clearErrors("comingDate");
    setValue("comingDate", toLocalDateString(selectedDate), {
      shouldValidate: true,
    });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSubmitted(false);
    // Keep the signed-in student's email: resetting to the mount-time
    // defaults used to wipe it, producing passes nobody could find.
    reset(emptyForm(getValues("email")));
    setTimeout(() => setRefreshing(false), 500);
  }, [getValues, reset]);

  const onSubmit = async (data) => {
    let valid = true;
    if (!data.date) {
      setError("date", { type: "required", message: "Leaving date is required" });
      valid = false;
    }
    if (!data.time) {
      setError("time", { type: "required", message: "Leaving time is required" });
      valid = false;
    }
    if (data.reason === "Home" && !data.comingDate) {
      setError("comingDate", {
        type: "required",
        message: "Return date is required",
      });
      valid = false;
    }
    if (!valid) return;

    const payload = {
      ...data,
      email: data.email || getValues("email"),
      reason: data.reason === "Others" ? "Others" : data.reason,
    };

    if (!payload.email) {
      Alert.alert("Session expired", "Please log in again.");
      router.replace("/auth/login");
      return;
    }

    try {
      await api.post("/gatepass/apply", payload);
      setSubmitted(true);
      reset(emptyForm(payload.email));
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      Alert.alert(
        "Error",
        apiErrorMessage(error, "Could not submit your gate pass.")
      );
    }
  };

  const busy = isSubmitting;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View className="bg-white px-5 py-4 flex-row items-center border-b border-gray-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color="#4B5563" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800">New Gate Pass</Text>
      </View>

      <ScrollView
        className="flex-1 bg-gray-50"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
            <View
              className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg"
              accessibilityLiveRegion="polite"
            >
              <Text className="text-green-800 font-medium">
                Gate pass submitted successfully!
              </Text>
            </View>
          )}

          {/* Form Fields */}
          <View>
            {/* Leaving Date */}
            <View>
              <View className="flex-row items-center mb-1">
                <Calendar size={18} color="#6B7280" />
                <Text className="text-gray-700 mx-4">Leaving Date</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Select leaving date"
                className={`bg-white border mb-3 ${
                  errors.date ? "border-red-300" : "border-gray-200"
                } rounded-lg px-4 py-3 shadow-sm`}
              >
                <Text className="text-gray-700">
                  {dateValue || "Select a date..."}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={parsePassDate(dateValue)?.toDate() ?? new Date()}
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
                <Clock size={18} color="#6B7280" />
                <Text className="text-gray-700 mx-4 font-medium">
                  Leaving Time
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Select leaving time"
                className={`bg-white border mb-3 ${
                  errors.time ? "border-red-300" : "border-gray-200"
                } rounded-lg px-4 py-3 shadow-sm`}
              >
                <Text className="text-gray-700">
                  {timeValue || "Select a time..."}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={timeStringToDate(timeValue)}
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
                <MapPin size={18} color="#6B7280" />
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
                    accessibilityLabel="Destination"
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
                <ClipboardList size={18} color="#6B7280" />
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
                        // Clear fields that belong to the previous reason so
                        // a Home return date can't ride along with "Others".
                        if (selected !== "Others") {
                          setValue("customReason", "");
                        }
                        if (selected !== "Home") {
                          setValue("comingDate", "");
                          setValue("reasonForGoingHome", "");
                          setValue("parentName", "");
                          setValue("parentContact", "");
                        }
                      }}
                      value={value}
                      placeholder={{
                        label: "Select a reason...",
                        value: null,
                      }}
                      items={[
                        { label: "Going Home", value: "Home" },
                        { label: "Others", value: "Others" },
                      ]}
                      style={{
                        inputIOS: {
                          paddingVertical: 12,
                          paddingHorizontal: 10,
                          color: value ? "#374151" : "#9CA3AF",
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
                      accessibilityLabel="Custom reason"
                      onChangeText={onChange}
                      value={value}
                      multiline
                    />
                  )}
                />
                {errors.customReason && (
                  <Text className="text-red-500 text-sm mb-2">
                    {errors.customReason.message}
                  </Text>
                )}
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
                    accessibilityRole="button"
                    accessibilityLabel="Select return date"
                    className={`bg-white border mb-3 ${
                      errors.comingDate ? "border-red-300" : "border-gray-200"
                    } rounded-lg px-4 py-3 shadow-sm`}
                  >
                    <Text className="text-gray-700">
                      {comingDateValue || "Select return date..."}
                    </Text>
                  </TouchableOpacity>
                  {showReturnDatePicker && (
                    <DateTimePicker
                      value={
                        parsePassDate(comingDateValue || dateValue)?.toDate() ??
                        new Date()
                      }
                      mode="date"
                      display="default"
                      onChange={handleReturnDateChange}
                      minimumDate={
                        parsePassDate(dateValue)?.toDate() ?? new Date()
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
                    <Text className="text-gray-700 mx-4 font-medium">
                      Reason For Going Home
                    </Text>
                  </View>
                  <Controller
                    control={control}
                    name="reasonForGoingHome"
                    rules={{ required: "Reason for going home is required" }}
                    render={({ field: { onChange, value } }) => (
                      <TextInput
                        className={`bg-white border mb-3 ${
                          errors.reasonForGoingHome
                            ? "border-red-300"
                            : "border-gray-200"
                        } rounded-lg px-4 py-3 shadow-sm`}
                        placeholder="Reason"
                        accessibilityLabel="Reason for going home"
                        onChangeText={onChange}
                        value={value}
                      />
                    )}
                  />
                  {errors.reasonForGoingHome && (
                    <Text className="text-red-500 text-sm mb-2">
                      {errors.reasonForGoingHome.message}
                    </Text>
                  )}
                </View>

                <View>
                  <View className="flex-row items-center mb-1">
                    <User size={18} color="#6B7280" />
                    <Text className="text-gray-700 mx-4 font-medium">
                      {"Parent's Name"}
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
                        accessibilityLabel="Parent's name"
                        onChangeText={onChange}
                        value={value}
                      />
                    )}
                  />
                  {errors.parentName && (
                    <Text className="text-red-500 text-sm mb-2">
                      {errors.parentName.message}
                    </Text>
                  )}
                </View>

                <View>
                  <View className="flex-row items-center mb-1">
                    <Phone size={18} color="#6B7280" />
                    <Text className="text-gray-700 mx-4 font-medium">
                      {"Parent's Contact"}
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
                        accessibilityLabel="Parent's contact"
                        keyboardType="phone-pad"
                        maxLength={10}
                        onChangeText={onChange}
                        value={value}
                      />
                    )}
                  />
                  {errors.parentContact && (
                    <Text className="text-red-500 text-sm mb-2">
                      {errors.parentContact.message}
                    </Text>
                  )}
                </View>
              </>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              className={`w-full py-4 rounded-lg mt-6 shadow-md ${
                busy ? "bg-indigo-400" : "bg-indigo-600"
              }`}
              onPress={handleSubmit(onSubmit)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Submit gate pass request"
              accessibilityState={{ busy }}
            >
              {busy ? (
                <Text className="text-white text-center font-bold text-lg">
                  Submitting...
                </Text>
              ) : (
                <Text className="text-white text-center font-bold text-lg">
                  Submit Request
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
