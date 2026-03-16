/**
 * Hook de sincronização de perfil do servidor.
 *
 * Ao iniciar o app com sessão ativa, busca o perfil completo do servidor
 * e atualiza o contexto local (AsyncStorage + estado React).
 *
 * ESTRATÉGIA DE FALLBACK:
 * 1. Busca perfil do usuário (tabela users) — fonte principal
 * 2. Se o usuário é técnico e não tem telefone/endereço, usa dados do perfil técnico
 *    (tabela technicians) como fallback — resolve casos de cadastros anteriores
 * 3. Replica os dados do técnico para a tabela users via updateProfile (sincronização única)
 *
 * Isso garante que nome, telefone, endereço, cidade e foto de perfil
 * sejam sempre restaurados corretamente ao reabrir o app ou após login.
 */
import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpc } from "@/lib/trpc";
import { useAppContext } from "@/lib/app-context";

export function useProfileSync() {
  const { isAuthenticated, authLoading, setAuthUser, setAddress, setProfilePhoto } = useAppContext();
  const [synced, setSynced] = useState(false);
  const migratedRef = useRef(false);

  // Reseta o estado de sincronização quando o usuário faz logout
  useEffect(() => {
    if (!isAuthenticated) {
      setSynced(false);
      migratedRef.current = false;
    }
  }, [isAuthenticated]);

  // Busca perfil do usuário (fonte principal)
  const profileQuery = trpc.user.getProfile.useQuery(undefined, {
    enabled: isAuthenticated && !authLoading && !synced,
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  // Busca perfil do técnico (fallback para dados de contato/endereço)
  const techQuery = trpc.technicians.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated && !authLoading && !synced,
    retry: 1,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  // Mutation para migrar dados do técnico para o perfil do usuário (executa uma vez)
  const updateProfileMutation = trpc.user.updateProfile.useMutation();

  useEffect(() => {
    if (!profileQuery.data || synced) return;
    // Aguarda também a query do técnico terminar (sucesso ou erro)
    if (techQuery.isLoading) return;

    const profile = profileQuery.data;
    const tech = techQuery.data;
    setSynced(true);

    // ─── Determinar os dados finais (usuário + fallback do técnico) ────────────
    const finalPhone = profile.phone || tech?.phone || undefined;
    const finalCity = profile.city || tech?.city || undefined;
    const finalState = profile.state || tech?.state || undefined;
    const finalStreet = profile.addressStreet || tech?.addressStreet || undefined;
    const finalNumber = profile.addressNumber || tech?.addressNumber || undefined;
    const finalNeighborhood = profile.addressNeighborhood || tech?.addressNeighborhood || undefined;
    const finalZipCode = profile.addressZipCode || tech?.addressZipCode || undefined;

    // ─── Atualiza contexto local imediatamente ─────────────────────────────────
    setAuthUser({
      email: profile.email ?? undefined,
      name: profile.name || undefined,
      phone: finalPhone,
      city: finalCity,
      state: finalState,
      avatarUrl: profile.avatarUrl || undefined,
      mode: (profile.mode === "tecnico" ? "tecnico" : "cliente") as "cliente" | "tecnico",
      addressStreet: finalStreet,
      addressNumber: finalNumber,
      addressComplement: profile.addressComplement || tech?.addressComplement || undefined,
      addressNeighborhood: finalNeighborhood,
      addressZipCode: finalZipCode,
    });

    // ─── Atualiza endereço se disponível ───────────────────────────────────────
    if (finalCity) {
      setAddress({
        street: finalStreet || "",
        number: finalNumber || "",
        complement: profile.addressComplement || tech?.addressComplement || "",
        neighborhood: finalNeighborhood || "",
        city: finalCity,
        state: finalState || "",
        zipCode: finalZipCode || "",
      });
    }

    // ─── Restaura foto do servidor ─────────────────────────────────────────────
    if (profile.avatarUrl) {
      setProfilePhoto(profile.avatarUrl);
    }

    // ─── Persiste no AsyncStorage para acesso offline ──────────────────────────
    const pairs: [string, string][] = [["@prontotec:authenticated", "true"]];
    if (profile.name) pairs.push(["@prontotec:user_name", profile.name]);
    if (profile.email) pairs.push(["@prontotec:user_email", profile.email]);
    if (finalPhone) pairs.push(["@prontotec:user_phone", finalPhone]);
    if (finalCity) pairs.push(["@prontotec:user_city", finalCity]);
    if (finalState) pairs.push(["@prontotec:user_state", finalState]);
    if (profile.mode) pairs.push(["@prontotec:user_mode", profile.mode]);
    if (profile.avatarUrl) pairs.push(["@prontotec:profile_photo", profile.avatarUrl]);
    if (pairs.length > 0) {
      AsyncStorage.multiSet(pairs).catch(() => {});
    }
    if (finalCity) {
      const address = {
        street: finalStreet || "",
        number: finalNumber || "",
        complement: profile.addressComplement || tech?.addressComplement || "",
        neighborhood: finalNeighborhood || "",
        city: finalCity,
        state: finalState || "",
        zipCode: finalZipCode || "",
      };
      AsyncStorage.setItem("@prontotec:user_address", JSON.stringify(address)).catch(() => {});
    }

    // ─── MIGRAÇÃO: Se o usuário é técnico e não tem dados na tabela users, migra ─
    // Isso corrige cadastros feitos antes da correção do register-technician.tsx
    const needsMigration =
      tech &&
      !migratedRef.current &&
      (!profile.phone || !profile.city) &&
      (tech.phone || tech.city);

    if (needsMigration) {
      migratedRef.current = true;
      console.log("[ProfileSync] Migrando dados do técnico para perfil do usuário...");
      updateProfileMutation
        .mutateAsync({
          phone: tech.phone || undefined,
          city: tech.city || undefined,
          state: tech.state || undefined,
          addressStreet: tech.addressStreet || undefined,
          addressNumber: tech.addressNumber || undefined,
          addressNeighborhood: tech.addressNeighborhood || undefined,
          addressZipCode: tech.addressZipCode || undefined,
        })
        .then(() => {
          console.log("[ProfileSync] Migração concluída com sucesso");
        })
        .catch((err) => {
          console.warn("[ProfileSync] Falha na migração:", err);
          migratedRef.current = false; // permite tentar novamente na próxima sessão
        });
    }
  }, [profileQuery.data, techQuery.data, techQuery.isLoading, synced, setAuthUser, setAddress, setProfilePhoto]);

  return { syncing: (profileQuery.isLoading || techQuery.isLoading) && !synced };
}
