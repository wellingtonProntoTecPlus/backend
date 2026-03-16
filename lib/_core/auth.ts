/**
 * Auth token management.
 *
 * IMPORTANTE: Usa AsyncStorage em vez de SecureStore para garantir
 * compatibilidade com APK Android. O SecureStore pode falhar silenciosamente
 * em alguns dispositivos Android, impedindo que o token seja recuperado.
 *
 * O token de sessão é um JWT assinado pelo servidor — não contém dados
 * sensíveis além do openId, portanto AsyncStorage é suficientemente seguro.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: Date;
};

// Chave unificada para o token de sessão
const SESSION_TOKEN_KEY = "@prontotec:session_token";
const USER_INFO_KEY = "@prontotec:user_info";

export async function getSessionToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      // Web usa cookie automático — não precisa de token manual
      return null;
    }
    const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    console.log(
      "[Auth] Token recuperado:",
      token ? `presente (${token.substring(0, 20)}...)` : "ausente"
    );
    return token;
  } catch (error) {
    console.error("[Auth] Falha ao recuperar token:", error);
    return null;
  }
}

export async function setSessionToken(token: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      return;
    }
    await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
    console.log("[Auth] Token salvo com sucesso");
  } catch (error) {
    console.error("[Auth] Falha ao salvar token:", error);
    throw error;
  }
}

export async function removeSessionToken(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      return;
    }
    await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
    console.log("[Auth] Token removido com sucesso");
  } catch (error) {
    console.error("[Auth] Falha ao remover token:", error);
  }
}

export async function getUserInfo(): Promise<User | null> {
  try {
    let info: string | null = null;
    if (Platform.OS === "web") {
      info = typeof window !== "undefined" ? window.localStorage.getItem(USER_INFO_KEY) : null;
    } else {
      info = await AsyncStorage.getItem(USER_INFO_KEY);
    }
    if (!info) return null;
    return JSON.parse(info);
  } catch (error) {
    console.error("[Auth] Falha ao recuperar user info:", error);
    return null;
  }
}

export async function setUserInfo(user: User): Promise<void> {
  try {
    const serialized = JSON.stringify(user);
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(USER_INFO_KEY, serialized);
      }
      return;
    }
    await AsyncStorage.setItem(USER_INFO_KEY, serialized);
  } catch (error) {
    console.error("[Auth] Falha ao salvar user info:", error);
  }
}

export async function clearUserInfo(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(USER_INFO_KEY);
      }
      return;
    }
    await AsyncStorage.removeItem(USER_INFO_KEY);
  } catch (error) {
    console.error("[Auth] Falha ao limpar user info:", error);
  }
}
