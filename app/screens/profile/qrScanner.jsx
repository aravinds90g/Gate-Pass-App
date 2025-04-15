import React, { useState, useEffect } from "react";
import { Alert, ActivityIndicator, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import axios from "axios";
import { router } from "expo-router";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Text, TouchableOpacity } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
} from "react-native-reanimated";

export default function SecurityQRScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passData, setPassData] = useState(null);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      if (!permission?.granted) await requestPermission();
      const userToken = await AsyncStorage.getItem("userToken");
      if (!userToken) router.replace("/login");
      setToken(userToken);
    };
    initialize();
  }, [permission]);

  const handleUnauthorized = async () => {
    await AsyncStorage.removeItem("userToken");
    router.replace("/login");
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || !token) return;
    setScanned(true);
    setLoading(true);

    try {
      const passId = data.split("/").pop() || data;
      const response = await axios.get(
        `https://gate-pass-backend-2ccd.onrender.com/api/gatepass/passdata/${passId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status !== 200) {
        Alert.alert("Error", "Invalid QR code");
        setScanned(false);
        return;
      }
      setPassData(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        Alert.alert("Session Expired", "Please login again", [
          { text: "OK", onPress: handleUnauthorized },
        ]);
        return;
      }
      Alert.alert("Error", "Invalid QR code");
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const updatePassStatus = async () => {
    if (!passData || !token) return;
    setLoading(true);

    try {
      const newStatus = passData.status === "approved" ? "active" : "expired";

      await axios.put(
        `https://gate-pass-backend-2ccd.onrender.com/api/gatepass/update/${passData._id}`,
        {
          status: newStatus,
          ...(newStatus === "active"
            ? { activedAt: new Date().toISOString() }
            : { expiredAt: new Date().toISOString() }),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setScanned(false);
        setPassData(null);
        router.replace("screens/securityProfile");
      }, 2000);
    } catch (error) {
      if (error.response?.status === 401) {
        Alert.alert("Session Expired", "Please login again", [
          { text: "OK", onPress: handleUnauthorized },
        ]);
        return;
      }
      Alert.alert("Error", "Failed to update pass status");
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons
          name="camera-off"
          size={48}
          color="#6b7280"
          style={styles.cameraIcon}
        />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          We need camera permission to scan QR codes. Please grant access in
          settings.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={styles.permissionButton}
        >
          <Text style={styles.permissionButtonText}>Allow Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (success) {
    return (
      <Animated.View
        entering={FadeIn.duration(500)}
        exiting={FadeOut.duration(500)}
        style={styles.successContainer}
      >
        <Animated.View entering={SlideInDown.springify()}>
          <View style={styles.successCard}>
            <MaterialIcons name="check-circle" size={80} color="#16a34a" />
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successText}>
              Pass marked as{" "}
              {passData?.status === "approved" ? "ACTIVE" : "EXPIRED"}
            </Text>
            <View style={styles.successDivider}>
              <Text style={styles.successName}>{passData?.name}</Text>
              <Text style={styles.successDetails}>
                {passData?.rollNo} • {passData?.dept}
              </Text>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>QR Code Scanner</Text>
        <Text style={styles.headerSubtitle}>Scan student gate passes</Text>
      </View>

      {!passData ? (
        <View style={styles.cameraContainer}>
          {/* Camera View */}
          <View style={styles.cameraWrapper}>
            <CameraView
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              style={styles.camera}
            />

            {loading && (
              <View style={styles.cameraOverlay}>
                <ActivityIndicator size="large" color="#ffffff" />
              </View>
            )}

            {/* Scanner Frame */}
            <View style={styles.scannerFrame}>
              <View style={styles.scannerBorder} />
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>
              Align the QR code within the frame to scan
            </Text>
          </View>
        </View>
      ) : (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.passContainer}
        >
          {/* Pass Card */}
          <View style={styles.passCard}>
            <View style={styles.passHeader}>
              <View>
                <Text style={styles.passName}>{passData.name}</Text>
                <Text style={styles.passDetails}>
                  {passData.rollNo} • {passData.dept}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  passData.status === "approved" && styles.statusApproved,
                  passData.status === "active" && styles.statusActive,
                  passData.status === "expired" && styles.statusExpired,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    passData.status === "approved" && styles.statusTextApproved,
                    passData.status === "active" && styles.statusTextActive,
                    passData.status === "expired" && styles.statusTextExpired,
                  ]}
                >
                  {passData.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.passInfo}>
              <View style={styles.infoRow}>
                <Ionicons name="location" size={18} color="#6b7280" />
                <Text style={styles.infoText}>{passData.destination}</Text>
              </View>

              {passData.reason && (
                <View style={styles.infoRow}>
                  <Ionicons name="document-text" size={18} color="#6b7280" />
                  <Text style={styles.infoText}>{passData.reason}</Text>
                </View>
              )}
            </View>

            <View style={styles.actionsContainer}>
              {loading ? (
                <ActivityIndicator size="large" color="#6366f1" />
              ) : (
                <>
                  <TouchableOpacity
                    onPress={updatePassStatus}
                    disabled={loading}
                    style={[
                      styles.actionButton,
                      passData.status === "approved"
                        ? styles.activateButton
                        : styles.expireButton,
                    ]}
                  >
                    <Text style={styles.actionButtonText}>
                      {passData.status === "approved"
                        ? "Activate Pass"
                        : "Mark as Expired"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setScanned(false);
                      setPassData(null);
                    }}
                    style={styles.scanAnotherButton}
                  >
                    <Text style={styles.scanAnotherText}>Scan Another</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: {
    fontSize: 18,
    color: "#374151",
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
    padding: 24,
  },
  cameraIcon: {
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: "#4f46e5",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: "white",
    fontWeight: "500",
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
    padding: 24,
  },
  successCard: {
    backgroundColor: "white",
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 16,
  },
  successText: {
    fontSize: 16,
    color: "#4b5563",
    marginTop: 8,
  },
  successDivider: {
    marginTop: 24,
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 24,
    alignItems: "center",
  },
  successName: {
    fontSize: 16,
    color: "#4b5563",
  },
  successDetails: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    backgroundColor: "#4f46e5",
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#a5b4fc",
    marginTop: 4,
  },
  cameraContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  cameraWrapper: {
    width: "100%",
    aspectRatio: 1,
    marginTop: 24,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#c7d2fe",
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  scannerFrame: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  scannerBorder: {
    width: 256,
    height: 256,
    borderWidth: 4,
    borderColor: "#818cf8",
    borderRadius: 12,
    opacity: 0.8,
  },
  instructionsContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  instructionsText: {
    fontSize: 16,
    color: "#4b5563",
    textAlign: "center",
  },
  passContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  passCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  passHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  passName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  passDetails: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusApproved: {
    backgroundColor: "#bfdbfe",
  },
  statusActive: {
    backgroundColor: "#bbf7d0",
  },
  statusExpired: {
    backgroundColor: "#fecaca",
  },
  statusText: {
    fontWeight: "500",
  },
  statusTextApproved: {
    color: "#1e40af",
  },
  statusTextActive: {
    color: "#166534",
  },
  statusTextExpired: {
    color: "#991b1b",
  },
  passInfo: {
    marginTop: 24,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: "#4b5563",
    marginLeft: 8,
  },
  actionsContainer: {
    marginTop: 32,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  activateButton: {
    backgroundColor: "#16a34a",
  },
  expireButton: {
    backgroundColor: "#dc2626",
  },
  actionButtonText: {
    color: "white",
    fontWeight: "500",
  },
  scanAnotherButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  scanAnotherText: {
    color: "#374151",
    fontWeight: "500",
  },
});
