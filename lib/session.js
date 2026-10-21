import AsyncStorage from "@react-native-async-storage/async-storage";

export const LOGIN_ROUTE = "/auth/login";

/** Single source of truth for role -> landing screen. */
export const ROLE_ROUTES = {
  security: "/screens/securityProfile",
  mentor: "/screens/mentorProfile",
  admin: "/screens/adminProfile",
  warden: "/screens/wardenProfile",
  student: "/screens/profile",
};

export function routeForRole(role) {
  return ROLE_ROUTES[role] ?? LOGIN_ROUTE;
}

/** Read the persisted session. `user` is null when absent or corrupt. */
export async function getSession() {
  const [token, rawUser] = await Promise.all([
    AsyncStorage.getItem("userToken"),
    AsyncStorage.getItem("userData"),
  ]);

  if (!rawUser) return { token, user: null };

  try {
    return { token, user: JSON.parse(rawUser) };
  } catch (error) {
    console.warn("Corrupt userData in storage, clearing session", error);
    await clearSession();
    return { token: null, user: null };
  }
}

export async function saveSession(token, user) {
  await AsyncStorage.multiSet([
    ["userToken", token],
    ["userData", JSON.stringify(user)],
  ]);
}

export async function clearSession() {
  await AsyncStorage.multiRemove(["userToken", "userData"]);
}
