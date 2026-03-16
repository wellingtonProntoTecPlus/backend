/**
 * Utilitário de upload de imagem para S3 via API do servidor.
 * Converte a URI local em base64 e envia para o endpoint especificado.
 */
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";
import { getSessionToken } from "@/lib/_core/auth";

/**
 * Faz upload de uma imagem local para o S3 via endpoint REST.
 * @param localUri URI local da imagem (file:// ou content://)
 * @param endpoint Endpoint do servidor (ex: "/api/technician/photo")
 * @returns URL pública S3 da imagem ou null em caso de erro
 */
export async function uploadImageToS3(
  localUri: string,
  endpoint: string
): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      // No web, a URI já é uma URL válida (blob: ou data:)
      return localUri;
    }

    // Converter imagem para base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Determinar mimeType pela extensão
    const ext = localUri.split(".").pop()?.toLowerCase() || "jpg";
    const mimeType = ext === "png" ? "image/png" : "image/jpeg";

    // Obter token de sessão
    const token = await getSessionToken();
    if (!token) {
      console.warn("[UploadImage] Token de sessão não encontrado");
      return null;
    }

    const apiBase = getApiBaseUrl();
    const url = `${apiBase}${endpoint}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ base64, mimeType }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "");
      console.error(`[UploadImage] Falha no upload (${response.status}):`, error);
      return null;
    }

    const data = await response.json();
    return data.url || null;
  } catch (error) {
    console.error("[UploadImage] Erro ao fazer upload:", error);
    return null;
  }
}
