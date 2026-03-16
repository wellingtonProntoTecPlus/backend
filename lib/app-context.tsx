import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Auth from "@/lib/_core/auth";
import { unregisterPushToken } from "@/hooks/use-push-notifications";
import { User, ServiceRequest, Technician, Quote, Review, Address, Message } from "./types";

interface AppState {
  user: User;
  profilePhoto: string | null;
  isAuthenticated: boolean;
  authLoading: boolean; // true enquanto verifica AsyncStorage
  requests: ServiceRequest[];
  technicians: Technician[];
  technicianActive: boolean;
  messages: Record<string, Message[]>; // requestId -> messages
  setMode: (mode: "cliente" | "tecnico") => void;
  setTechnicianActive: (active: boolean) => void;
  setProfilePhoto: (uri: string) => void;
  addRequest: (request: ServiceRequest) => void;
  updateRequest: (id: string, updates: Partial<ServiceRequest>) => void;
  acceptRequest: (requestId: string) => void;
  declineRequest: (requestId: string) => void;
  addQuote: (requestId: string, quote: Quote) => void;
  acceptQuote: (requestId: string, quoteId: string) => void;
  declineQuote: (requestId: string, quoteId: string) => void;
  addReview: (technicianId: string, review: Review) => void;
  setAuthUser: (data: {
    email?: string;
    name?: string;
    city?: string;
    state?: string;
    phone?: string;
    avatarUrl?: string | null;
    mode?: "cliente" | "tecnico";
    addressStreet?: string | null;
    addressNumber?: string | null;
    addressComplement?: string | null;
    addressNeighborhood?: string | null;
    addressZipCode?: string | null;
    /** ID numérico do servidor para comparar senderId nas mensagens de chat */
    serverId?: number | null;
  }) => void;
  setAddress: (address: Address) => void;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  sendMessage: (requestId: string, message: Message) => void;
  updateTechnicianProfile: (profile: Partial<Technician>) => void;
  technicianProfile: Technician | null;
}

const defaultUser: User = {
  id: "user1",
  name: "",
  email: "",
  phone: "",
  city: "",
  mode: "cliente",
};

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(defaultUser);
  const [profilePhoto, setProfilePhotoState] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  // Inicia sem pedidos — o usuário cria os seus próprios
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  // Técnicos carregados do servidor via tRPC — inicia vazio
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [technicianActive, setTechnicianActiveState] = useState(false);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});

  // Carrega estado persistido ao iniciar
  useEffect(() => {
    (async () => {
      try {
        const authenticated = await AsyncStorage.getItem("@prontotec:authenticated");
        if (authenticated === "true") {
          const [name, email, phone, city, state, addrStr, photo, reqStr, msgStr, techProfileStr, userMode, serverIdStr] = await Promise.all([
            AsyncStorage.getItem("@prontotec:user_name"),
            AsyncStorage.getItem("@prontotec:user_email"),
            AsyncStorage.getItem("@prontotec:user_phone"),
            AsyncStorage.getItem("@prontotec:user_city"),
            AsyncStorage.getItem("@prontotec:user_state"),
            AsyncStorage.getItem("@prontotec:user_address"),
            AsyncStorage.getItem("@prontotec:profile_photo"),
            AsyncStorage.getItem("@prontotec:requests"),
            AsyncStorage.getItem("@prontotec:messages"),
            AsyncStorage.getItem("@prontotec:technician_profile"),
            AsyncStorage.getItem("@prontotec:user_mode"),
            AsyncStorage.getItem("@prontotec:user_server_id"),
          ]);
          const address = addrStr ? (JSON.parse(addrStr) as Address) : undefined;
          const techProfile: Technician | undefined = techProfileStr ? JSON.parse(techProfileStr) : undefined;
          const mode = (userMode === "tecnico" ? "tecnico" : "cliente") as "cliente" | "tecnico";
          const serverId = serverIdStr ? parseInt(serverIdStr, 10) : undefined;
          // Ativa disponibilidade automaticamente ao carregar se o modo é técnico
          if (mode === "tecnico") setTechnicianActiveState(true);
          setUser((prev) => ({
            ...prev,
            name: name || prev.name,
            email: email || prev.email,
            phone: phone || prev.phone,
            city: city || prev.city,
            state: state || prev.state,
            address: address || prev.address,
            mode,
            // Restaurar o ID numérico do servidor para comparar senderId no chat
            serverId: serverId || prev.serverId,
            technicianProfile: techProfile || prev.technicianProfile,
          }));
          // Restaura o técnico na lista de busca se ele tiver se cadastrado
          if (techProfile) {
            setTechnicians((prev) => {
              const exists = prev.find((t) => t.id === techProfile.id);
              if (exists) return prev.map((t) => (t.id === techProfile.id ? techProfile : t));
              return [techProfile, ...prev];
            });
          }
          if (photo) setProfilePhotoState(photo);
          if (reqStr) setRequests(JSON.parse(reqStr) as ServiceRequest[]);
          if (msgStr) setMessages(JSON.parse(msgStr) as Record<string, Message[]>);
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.warn("[AppContext] Erro ao carregar estado:", e);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  // Persiste pedidos sempre que mudam
  useEffect(() => {
    if (!authLoading) {
      AsyncStorage.setItem("@prontotec:requests", JSON.stringify(requests));
    }
  }, [requests, authLoading]);

  // Persiste mensagens sempre que mudam
  useEffect(() => {
    if (!authLoading) {
      AsyncStorage.setItem("@prontotec:messages", JSON.stringify(messages));
    }
  }, [messages, authLoading]);

  const setProfilePhoto = (uri: string) => {
    setProfilePhotoState(uri);
    AsyncStorage.setItem("@prontotec:profile_photo", uri);
  };

  const setMode = (mode: "cliente" | "tecnico") => {
    setUser((prev) => ({ ...prev, mode }));
    // Ao mudar para modo técnico, ativa disponibilidade automaticamente
    if (mode === "tecnico") setTechnicianActiveState(true);
    if (mode === "cliente") setTechnicianActiveState(false);
    AsyncStorage.setItem("@prontotec:user_mode", mode);
  };

  const setTechnicianActive = (active: boolean) => {
    setTechnicianActiveState(active);
  };

  const addRequest = (request: ServiceRequest) => {
    setRequests((prev) => [request, ...prev]);
  };

  const updateRequest = (id: string, updates: Partial<ServiceRequest>) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r))
    );
  };

  const acceptRequest = (requestId: string) => {
    // Usa o ID do perfil do técnico logado, ou fallback para user.id
    const techId = user.technicianProfile?.id || user.id;
    updateRequest(requestId, { status: "em_analise", technicianId: techId });
  };

  const declineRequest = (requestId: string) => {
    updateRequest(requestId, { status: "cancelado" });
  };

  const addQuote = (requestId: string, quote: Quote) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              quotes: [...(r.quotes || []), quote],
              status: "orcamento_enviado" as any,
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    );
  };

  const acceptQuote = (requestId: string, quoteId: string) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== requestId) return r;
        const acceptedQuote = r.quotes?.find((q) => q.id === quoteId);
        return {
          ...r,
          status: "servico_aprovado" as any,
          technicianId: acceptedQuote?.technicianId,
          quotes: r.quotes?.map((q) => ({
            ...q,
            status: q.id === quoteId ? "aceito" : "recusado",
          })),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const declineQuote = (requestId: string, quoteId: string) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== requestId) return r;
        return {
          ...r,
          quotes: r.quotes?.map((q) => ({
            ...q,
            status: q.id === quoteId ? "recusado" : q.status,
          })),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const addReview = (technicianId: string, review: Review) => {
    setTechnicians((prev) =>
      prev.map((t) => {
        if (t.id !== technicianId) return t;
        const newReviews = [review, ...t.reviews];
        const newRating = newReviews.reduce((sum, r) => sum + r.rating, 0) / newReviews.length;
        return {
          ...t,
          reviews: newReviews,
          totalReviews: t.totalReviews + 1,
          rating: Math.round(newRating * 10) / 10,
        };
      })
    );
  };

  const setAuthUser = (data: {
    email?: string;
    name?: string;
    city?: string;
    state?: string;
    phone?: string;
    avatarUrl?: string | null;
    mode?: "cliente" | "tecnico";
    addressStreet?: string | null;
    addressNumber?: string | null;
    addressComplement?: string | null;
    addressNeighborhood?: string | null;
    addressZipCode?: string | null;
    /** ID numérico do servidor para comparar senderId nas mensagens de chat */
    serverId?: number | null;
  }) => {
    setIsAuthenticated(true);
    setUser((prev) => ({
      ...prev,
      email: data.email || prev.email,
      name: data.name !== undefined ? data.name : prev.name,
      city: data.city !== undefined ? data.city : prev.city,
      state: data.state !== undefined ? data.state : prev.state,
      phone: data.phone !== undefined ? data.phone : prev.phone,
      mode: data.mode !== undefined ? data.mode : prev.mode,
      // Salvar o ID numérico do servidor para comparar senderId no chat
      serverId: data.serverId != null ? data.serverId : prev.serverId,
      address: (data.addressStreet || data.city) ? {
        street: data.addressStreet || "",
        number: data.addressNumber || "",
        complement: data.addressComplement || "",
        neighborhood: data.addressNeighborhood || "",
        city: data.city || "",
        state: data.state || "",
        zipCode: data.addressZipCode || "",
      } : prev.address,
    }));
    // Atualiza foto de perfil se veio do servidor
    if (data.avatarUrl) {
      setProfilePhotoState(data.avatarUrl);
      AsyncStorage.setItem("@prontotec:profile_photo", data.avatarUrl);
    }
    // Persistir todos os dados para manter sessão após fechar o app
    const pairs: [string, string][] = [
      ["@prontotec:authenticated", "true"],
      ["@prontotec:user_email", data.email || ""],
    ];
    if (data.name) pairs.push(["@prontotec:user_name", data.name]);
    if (data.city) pairs.push(["@prontotec:user_city", data.city]);
    if (data.state) pairs.push(["@prontotec:user_state", data.state]);
    if (data.phone) pairs.push(["@prontotec:user_phone", data.phone]);
    if (data.mode) pairs.push(["@prontotec:user_mode", data.mode]);
    if (data.avatarUrl) pairs.push(["@prontotec:profile_photo", data.avatarUrl]);
    // Persiste o ID numérico do servidor para restaurar após reiniciar o app
    if (data.serverId != null) pairs.push(["@prontotec:user_server_id", String(data.serverId)]);
    // Persiste endereço completo se disponível
    if (data.addressStreet || data.city) {
      const address = {
        street: data.addressStreet || "",
        number: data.addressNumber || "",
        complement: data.addressComplement || "",
        neighborhood: data.addressNeighborhood || "",
        city: data.city || "",
        state: data.state || "",
        zipCode: data.addressZipCode || "",
      };
      pairs.push(["@prontotec:user_address", JSON.stringify(address)]);
    }
    AsyncStorage.multiSet(pairs);
  };

  const setAddress = (address: Address) => {
    setUser((prev) => ({ ...prev, address, city: address.city, state: address.state }));
    AsyncStorage.setItem("@prontotec:user_address", JSON.stringify(address));
    if (address.city) AsyncStorage.setItem("@prontotec:user_city", address.city);
    if (address.state) AsyncStorage.setItem("@prontotec:user_state", address.state);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([
      "@prontotec:authenticated",
      "@prontotec:user_email",
      "@prontotec:user_name",
      "@prontotec:user_phone",
      "@prontotec:user_city",
      "@prontotec:user_address",
      "@prontotec:profile_photo",
      "@prontotec:requests",
      "@prontotec:messages",
      "@prontotec:technician_profile",
      "@prontotec:user_mode",
      "@prontotec:user_state",
      "@prontotec:session_token",
      "@prontotec:user_server_id",
    ]);
    // Remove token push do servidor antes de limpar a sessão
    await unregisterPushToken().catch(() => {});
    // Limpa o token do SecureStore (usado pelo tRPC)
    await Auth.removeSessionToken();
    setIsAuthenticated(false);
    setUser(defaultUser);
    setProfilePhotoState(null);
    setTechnicianActiveState(false);
    setRequests([]);
    setMessages({});
  };

  const deleteAccount = async () => {
    try {
      // 1. Chamar o servidor para apagar TODOS os dados permanentemente (exigido pelo Google/Apple)
      const { getApiBaseUrl } = await import("@/constants/oauth");
      const token = await Auth.getSessionToken();
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/trpc/user.deleteAccount`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error("[deleteAccount] Erro no servidor:", text);
        // Mesmo com erro no servidor, continua limpando localmente
      } else {
        console.log("[deleteAccount] Conta excluída permanentemente no servidor");
      }
    } catch (err) {
      console.error("[deleteAccount] Erro ao chamar servidor:", err);
      // Continua limpando localmente mesmo se o servidor falhar
    }
    // 2. Limpar todos os dados locais
    const keys = await AsyncStorage.getAllKeys();
    const prontotecKeys = keys.filter((k) => k.startsWith("@prontotec:"));
    await AsyncStorage.multiRemove(prontotecKeys);
    await Auth.removeSessionToken();
    setIsAuthenticated(false);
    setUser(defaultUser);
    setProfilePhotoState(null);
    setTechnicianActiveState(false);
    setRequests([]);
    setMessages({});
  };

  const sendMessage = (requestId: string, message: Message) => {
    setMessages((prev) => ({
      ...prev,
      [requestId]: [...(prev[requestId] || []), message],
    }));
  };

  const updateTechnicianProfile = (profile: Partial<Technician>) => {
    setUser((prev) => {
      const merged = prev.technicianProfile
        ? { ...prev.technicianProfile, ...profile }
        : (profile as Technician);
      // Adiciona ou atualiza o técnico na lista de busca
      setTechnicians((prevTechs) => {
        const exists = prevTechs.find((t) => t.id === merged.id);
        if (exists) {
          return prevTechs.map((t) => (t.id === merged.id ? merged : t));
        }
        return [merged, ...prevTechs];
      });
      // Persiste o perfil completo (não parcial) para restaurar corretamente
      AsyncStorage.setItem("@prontotec:technician_profile", JSON.stringify(merged));
      return { ...prev, technicianProfile: merged };
    });
  };

  return (
    <AppContext.Provider
      value={{
        user,
        profilePhoto,
        isAuthenticated,
        authLoading,
        requests,
        technicians,
        technicianActive,
        messages,
        setMode,
        setTechnicianActive,
        setProfilePhoto,
        addRequest,
        updateRequest,
        acceptRequest,
        declineRequest,
        addQuote,
        acceptQuote,
        declineQuote,
        addReview,
        setAuthUser,
        setAddress,
        logout,
        deleteAccount,
        sendMessage,
        updateTechnicianProfile,
        technicianProfile: user.technicianProfile || null,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
}
