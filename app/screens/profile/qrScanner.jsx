import React, { useState, useEffect } from "react";
import { Alert, ActivityIndicator, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { View, Text, TouchableOpacity } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
} from "react-native-reanimated";
import { api, apiErrorMessage } from "../../../lib/api";
import { clearSession, getSession } from "../../../lib/session";
import { formatDate, getPassDisplayStatus } from "../../../lib/dates";

export default function SecurityQRScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passData, setPassData] = useState(null);
  const [success, setSuccess] = useState(false);
  const [updatedTo, setUpdatedTo] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
      const { token: userToken } = await getSession();
      if (cancelled) return;
      if (!userToken) {
        router.replace("/auth/login");
        return;
      }
      setToken(userToken);
    };

    initialize();
    return () => {
      cancelled = true;
    };
  }, [permission?.granted, requestPermission]);

  const handleUnauthorized = async () => {
    await clearSession();
    router.replace("/auth/login");
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || !token) return;
    setScanned(true);
    setLoading(true);

    try {
      // The QR now carries a short-lived server-signed token, not a raw id.
      const response = await api.post("/gatepass/verify", {
        token: String(data).trim(),
      });
      setPassData(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        Alert.alert("Session Expired", "Please login again", [
          { text: "OK", onPress: handleUnauthorized },
        ]);
        return;
      }
      const status = error.response?.status;
      const message =
        status === 410
          ? "This QR code has expired. Ask the student to refresh it."
          : status === 409
            ? error.response?.data?.message || "This pass is not valid."
            : "Invalid QR code";
      Alert.alert("Cannot verify pass", message);
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const updatePassStatus = async (nextStatus) => {
    if (!passData || !token) return;
    setLoading(true);

    try {
      // Actor and timestamps are set by the server from the token, so the
      // only thing the client may choose is the requested transition.
      await api.put(`/gatepass/update/${passData._id}`, {
        status: nextStatus,
      });

      setUpdatedTo(nextStatus);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setScanned(false);
        setPassData(null);
        setUpdatedTo(null);
        router.replace("/screens/securityProfile");
      }, 2000);
    } catch (error) {
      if (error.response?.status === 401) {
        Alert.alert("Session Expired", "Please login again", [
          { text: "OK", onPress: handleUnauthorized },
        ]);
        return;
      }
      Alert.alert(
        "Error",
        apiErrorMessage(error, "Failed to update the pass status.")
      );
    } finally {
      setLoading(false);
    }
  };

  const displayStatus = getPassDisplayStatus(passData);
  const canActivate = displayStatus === "approved";
  const canExpire = displayStatus === "active";
  const expired = displayStatus === "expired";

  const confirmExpire = () => {
    Alert.alert(
      "Mark pass as expired?",
      "The student will no longer be able to use this pass.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark expired",
          style: "destructive",
          onPress: () => updatePassStatus("expired"),
        },
      ]
    );
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
              Pass marked as {updatedTo ? updatedTo.toUpperCase() : "UPDATED"}
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
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>QR Code Scanner</Text>
            <Text style={styles.headerSubtitle}>Scan student gate passes</Text>
          </View>
        </View>
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
                  displayStatus === "approved" && styles.statusApproved,
                  displayStatus === "active" && styles.statusActive,
                  expired && styles.statusExpired,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    displayStatus === "approved" &&
                      styles.statusTextApproved,
                    displayStatus === "active" && styles.statusTextActive,
                    expired && styles.statusTextExpired,
                  ]}
                >
                  {(displayStatus ?? "unknown").toUpperCase()}
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

              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={18} color="#6b7280" />
                <Text style={styles.infoText}>
                  {formatDate(passData.date)}
                  {passData.comingDate
                    ? `  →  ${formatDate(passData.comingDate)}`
                    : ""}
                </Text>
              </View>
            </View>

            <View style={styles.actionsContainer}>
              {loading ? (
                <ActivityIndicator size="large" color="#6366f1" />
              ) : (
                <>
                  {canActivate && (
                    <TouchableOpacity
                      onPress={() => updatePassStatus("active")}
                      disabled={loading}
                      style={[styles.actionButton, styles.activateButton]}
                      accessibilityRole="button"
                      accessibilityState={{ busy: loading }}
                    >
                      <Text style={styles.actionButtonText}>Activate Pass</Text>
                    </TouchableOpacity>
                  )}

                  {canExpire && (
                    <TouchableOpacity
                      onPress={confirmExpire}
                      disabled={loading}
                      style={[styles.actionButton, styles.expireButton]}
                      accessibilityRole="button"
                    >
                      <Text style={styles.actionButtonText}>
                        Mark as Expired
                      </Text>
                    </TouchableOpacity>
                  )}

                  {!canActivate && !canExpire && (
                    <View style={styles.noticeBox}>
                      <Ionicons
                        name={expired ? "time-outline" : "alert-circle-outline"}
                        size={20}
                        color="#92400e"
                      />
                      <Text style={styles.noticeText}>
                        {expired
                          ? `This pass expired on ${formatDate(
                              passData.comingDate || passData.date
                            )}. Entry must be refused.`
                          : `No action available for a "${displayStatus}" pass.`}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={() => {
                      setScanned(false);
                      setPassData(null);
                    }}
                    style={styles.scanAnotherButton}
                    accessibilityRole="button"
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    padding: 16,
  },
  noticeText: {
    flex: 1,
    marginLeft: 10,
    color: "#92400e",
    fontSize: 14,
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
