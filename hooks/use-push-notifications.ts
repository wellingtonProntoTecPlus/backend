/**
 * Hook para registrar o token Expo Push no servidor.
 *
 * Deve ser chamado uma vez no root do app (_layout.tsx) após o usuário fazer login.
 * O token é registrado no servidor para que push notifications remotas funcionem.
 *
 * NOTA: O setNotificationHandler está centralizado em lib/notifications.ts (setupNotificationHandler).
 * Não duplicar aqui para evitar conflitos.
 */
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "@/constants/oauth";
import { getSessionToken } from "@/lib/_core/auth";

const PUSH_TOKEN_KEY = "@prontotec:push_token";

/**
 * Registra o token Expo Push no servidor.
 * Retorna o token registrado ou null em caso de falha.
 */
async function registerPushToken(): Promise<string | null> {
  try {
    // Push notifications não funcionam no web
    if (Platform.OS === "web") return null;

    // Verificar se tem permissão
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[Push] Permissão de notificação negada");
      return null;
    }

    // Obter o token Expo Push — usa projectId do EAS se disponível
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const pushToken = tokenData.data;

    if (!pushToken) return null;

    // Verificar se já registramos este token
    const savedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (savedToken === pushToken) {
      console.log("[Push] Token já registrado:", pushToken.substring(0, 30) + "...");
      return pushToken;
    }

    // Registrar no servidor
    const sessionToken = await getSessionToken();
    if (!sessionToken) {
      console.log("[Push] Sem sessão ativa, token não registrado no servidor");
      return pushToken;
    }

    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/api/push/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        pushToken,
        platform: Platform.OS,
      }),
    });

    if (response.ok) {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, pushToken);
      console.log("[Push] Token registrado com sucesso:", pushToken.substring(0, 30) + "...");
    } else {
      const text = await response.text().catch(() => "");
      console.error("[Push] Falha ao registrar token:", response.status, text);
    }

    return pushToken;
  } catch (err) {
    console.error("[Push] Erro ao registrar token:", err);
    return null;
  }
}

/**
 * Remove o token do servidor ao fazer logout.
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    if (Platform.OS === "web") return;

    const pushToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!pushToken) return;

    const sessionToken = await getSessionToken();
    if (!sessionToken) return;

    const apiUrl = getApiBaseUrl();
    await fetch(`${apiUrl}/api/push/unregister`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ pushToken }),
    });

    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    console.log("[Push] Token removido do servidor");
  } catch (err) {
    console.error("[Push] Erro ao remover token:", err);
  }
}

/**
 * Hook que registra o token Expo Push no servidor quando o usuário está logado.
 * Deve ser usado no root do app.
 */
export function usePushNotifications(isLoggedIn: boolean): void {
  const registered = useRef(false);

  useEffect(() => {
    if (!isLoggedIn) {
      // Resetar ao fazer logout para re-registrar no próximo login
      registered.current = false;
      return;
    }

    if (registered.current) return;

    // Registrar com um pequeno delay para garantir que a sessão está ativa
    const timer = setTimeout(async () => {
      const token = await registerPushToken().catch((err) => {
        console.error("[Push] Falha no registro:", err);
        return null;
      });
      // Só marcar como registrado se o token foi obtido com sucesso
      if (token) {
        registered.current = true;
      }
      // Se falhou, tentar novamente na próxima vez que isLoggedIn mudar
    }, 2000);

    return () => clearTimeout(timer);
  }, [isLoggedIn]);
}
