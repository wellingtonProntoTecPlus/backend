import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Notifications from "expo-notifications";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/lib/app-context";
import { trpc } from "@/lib/trpc";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { useActiveChatId } from "@/lib/active-chat-context";

interface ChatMsg {
  id: number;
  requestId: number;
  senderId: number;
  senderName: string;
  content: string;
  isRead: boolean;
  createdAt: string | Date;
}

// URL do som de notificação de mensagem recebida (hospedado em CDN)
const NOTIFICATION_SOUND_URL =
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663035703454/MPjjEWZvJxxNMlQq.mp3";

export default function ChatScreen() {
  const colors = useColors();
  const { id, technicianName, technicianAvatar } = useLocalSearchParams<{
    id: string;
    technicianName?: string;
    technicianAvatar?: string;
  }>();

  const { user, technicians, requests } = useAppContext();
  const { setActiveChatId } = useActiveChatId();
  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // Ref para o player de som de notificação
  const notifPlayerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  // Referência para rastrear a quantidade anterior de mensagens
  const prevMsgCountRef = useRef<number>(0);
  // Flag para evitar tocar som na carga inicial
  const initialLoadRef = useRef<boolean>(true);
  // Ref para saber o ID do usuário atual (evita closure stale)
  // Usa serverId (ID numérico do banco) pois senderId nas mensagens é sempre numérico
  const userIdRef = useRef<number | string | undefined>(user?.serverId ?? user?.id);
  useEffect(() => {
    userIdRef.current = user?.serverId ?? user?.id;
  }, [user?.serverId, user?.id]);

  // Configurar modo de áudio e criar player ao montar a tela
  useEffect(() => {
    if (Platform.OS !== "web") {
      // playsInSilentMode garante que o som toca mesmo com iPhone no modo silencioso
      setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
      try {
        notifPlayerRef.current = createAudioPlayer({ uri: NOTIFICATION_SOUND_URL });
      } catch (e) {
        console.warn("[Chat] Erro ao criar player de áudio:", e);
      }
    }
    return () => {
      if (notifPlayerRef.current) {
        notifPlayerRef.current.remove();
        notifPlayerRef.current = null;
      }
    };
  }, []);

  // Encontrar o técnico relacionado a este chat
  const request = requests.find((r) => r.id === id);
  const technician =
    request?.technician ||
    technicians.find((t) => t.id === id || t.id === request?.technicianId);

  const displayName =
    technicianName ||
    technician?.companyName ||
    technician?.name ||
    "Técnico";
  const displayAvatar = technicianAvatar || technician?.avatar || "";

  // Converter ID para número (o banco usa INT)
  const numericId = parseInt(id?.toString().replace("server_", "") || "0", 10);

  // Registrar chat ativo para suprimir notificações do GlobalChatMonitor enquanto o chat está aberto
  useEffect(() => {
    if (numericId > 0) {
      setActiveChatId(numericId);
    }
    return () => {
      setActiveChatId(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericId]);

  // Buscar mensagens do servidor com polling a cada 3 segundos
  const {
    data: messages = [],
    isLoading,
    refetch,
  } = trpc.chat.getMessages.useQuery(
    { requestId: numericId },
    {
      enabled: numericId > 0,
      refetchInterval: 3000,
      refetchIntervalInBackground: false,
    }
  );

  // Mutation para enviar mensagem
  const sendMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      refetch();
      flatListRef.current?.scrollToEnd({ animated: true });
    },
  });

  // Mutation para marcar como lidas
  const markReadMutation = trpc.chat.markRead.useMutation();

  // Marcar mensagens como lidas ao abrir o chat
  useEffect(() => {
    if (numericId > 0 && messages.length > 0) {
      markReadMutation.mutate({ requestId: numericId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericId, messages.length]);

  // Detectar novas mensagens recebidas e tocar som + notificação local
  useEffect(() => {
    const currentCount = messages.length;

    if (initialLoadRef.current) {
      prevMsgCountRef.current = currentCount;
      if (currentCount > 0) {
        initialLoadRef.current = false;
      }
      return;
    }

    if (currentCount > prevMsgCountRef.current) {
      // Verificar se há mensagens de outra pessoa (não do usuário atual)
      const newMessages = (messages as ChatMsg[]).slice(prevMsgCountRef.current);
      const myId = userIdRef.current;

      // Mensagem recebida = qualquer mensagem onde senderId != meu ID
      const incomingMessages = newMessages.filter(
        (msg) => String(msg.senderId) !== String(myId)
      );

      if (incomingMessages.length > 0 && Platform.OS !== "web") {
        // 1. Tocar som de notificação
        try {
          if (notifPlayerRef.current) {
            notifPlayerRef.current.seekTo(0);
            notifPlayerRef.current.play();
          }
        } catch (e) {
          console.warn("[Chat] Erro ao tocar som:", e);
        }
      }

      prevMsgCountRef.current = currentCount;
    }
  }, [messages.length]);

  // Rolar para o fim quando chegam novas mensagens
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || sending || numericId <= 0) return;
    setSending(true);
    const text = inputText.trim();
    setInputText("");
    try {
      await sendMutation.mutateAsync({ requestId: numericId, content: text });
    } catch (err) {
      console.error("[Chat] Erro ao enviar mensagem:", err);
      setInputText(text);
    } finally {
      setSending(false);
    }
  }, [inputText, sending, numericId]);

  const handleMenuOption = (option: "details" | "clear") => {
    setMenuVisible(false);
    if (option === "details") {
      // Navegar para os detalhes do chamado
      if (numericId > 0) {
        router.push(`/request/${id}` as any);
      } else {
        Alert.alert("Detalhes", "Chamado não encontrado.");
      }
    } else if (option === "clear") {
      Alert.alert(
        "Limpar conversa",
        "Isso vai limpar apenas a visualização local. As mensagens continuarão salvas no servidor.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Limpar",
            style: "destructive",
            onPress: () => {
              prevMsgCountRef.current = 0;
              initialLoadRef.current = true;
              refetch();
            },
          },
        ]
      );
    }
  };

  const formatTime = (ts: string | Date) => {
    const date = typeof ts === "string" ? new Date(ts) : ts;
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  // Usa serverId (ID numérico do banco) para comparar corretamente com senderId
  const isFromMe = (msg: ChatMsg) => {
    const myId = user?.serverId ?? user?.id;
    return String(msg.senderId) === String(myId);
  };

  const renderMessage = ({ item }: { item: ChatMsg }) => {
    const fromMe = isFromMe(item);
    return (
      <View style={[styles.messageRow, fromMe && styles.messageRowRight]}>
        {!fromMe && (
          <View style={styles.avatarSmall}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={{ width: 28, height: 28, borderRadius: 14 }} />
            ) : (
              <MaterialIcons name="person" size={14} color={colors.muted} />
            )}
          </View>
        )}
        <View
          style={[
            styles.bubble,
            fromMe
              ? { backgroundColor: "#1A3A5C" }
              : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
          ]}
        >
          {!fromMe && (
            <Text style={[styles.senderName, { color: colors.primary }]}>
              {item.senderName}
            </Text>
          )}
          <Text style={[styles.bubbleText, { color: fromMe ? "#fff" : colors.foreground }]}>
            {item.content}
          </Text>
          <Text style={[styles.bubbleTime, { color: fromMe ? "rgba(255,255,255,0.6)" : colors.muted }]}>
            {formatTime(item.createdAt)}
            {fromMe && (
              <MaterialIcons
                name={item.isRead ? "done-all" : "done"}
                size={12}
                color={item.isRead ? "#60A5FA" : "rgba(255,255,255,0.6)"}
              />
            )}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#1A3A5C" }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>

        {displayAvatar ? (
          <Image source={{ uri: displayAvatar }} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatar, { backgroundColor: "#2D5A8E", alignItems: "center", justifyContent: "center" }]}>
            <MaterialIcons name="person" size={20} color="#fff" />
          </View>
        )}

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.headerStatus}>
            {numericId > 0 ? "Conversa ativa" : "Chat"}
          </Text>
        </View>

        {/* Menu 3 pontinhos — funcional */}
        <Pressable
          onPress={() => setMenuVisible(true)}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, padding: 4 })}
        >
          <MaterialIcons name="more-vert" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Modal do menu */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuOption("details")}
              activeOpacity={0.7}
            >
              <MaterialIcons name="assignment" size={20} color={colors.foreground} />
              <Text style={[styles.menuItemText, { color: colors.foreground }]}>Ver detalhes do chamado</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuOption("clear")}
              activeOpacity={0.7}
            >
              <MaterialIcons name="delete-outline" size={20} color={colors.error ?? "#EF4444"} />
              <Text style={[styles.menuItemText, { color: colors.error ?? "#EF4444" }]}>Limpar conversa</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Mensagens */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A3A5C" />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            Carregando mensagens...
          </Text>
        </View>
      ) : numericId <= 0 ? (
        <View style={styles.emptyChat}>
          <MaterialIcons name="error-outline" size={48} color={colors.muted} />
          <Text style={[styles.emptyChatText, { color: colors.muted }]}>
            Chat não disponível para este chamado
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages as ChatMsg[]}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <MaterialIcons name="chat-bubble-outline" size={48} color={colors.muted} />
              <Text style={[styles.emptyChatText, { color: colors.muted }]}>
                Inicie a conversa
              </Text>
              <Text style={[styles.emptyChatSub, { color: colors.muted }]}>
                As mensagens ficam salvas e sincronizadas
              </Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
          ]}
          placeholder="Digite uma mensagem..."
          placeholderTextColor={colors.muted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          editable={numericId > 0}
        />
        <Pressable
          onPress={handleSend}
          disabled={!inputText.trim() || sending || numericId <= 0}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor:
                inputText.trim() && !sending && numericId > 0 ? "#1A3A5C" : colors.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialIcons
              name="send"
              size={20}
              color={inputText.trim() && numericId > 0 ? "#fff" : colors.muted}
            />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: "#F5A623",
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  headerStatus: {
    color: "#10B981",
    fontSize: 12,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 80,
    paddingRight: 12,
  },
  menuContainer: {
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 220,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "500",
  },
  menuDivider: {
    height: 1,
    marginHorizontal: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  messagesList: {
    padding: 16,
    gap: 8,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 8,
    maxWidth: "80%",
  },
  messageRowRight: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    maxWidth: "100%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    gap: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTime: {
    fontSize: 11,
    alignSelf: "flex-end",
  },
  emptyChat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 10,
  },
  emptyChatText: {
    fontSize: 15,
  },
  emptyChatSub: {
    fontSize: 12,
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    gap: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
    lineHeight: 21,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
