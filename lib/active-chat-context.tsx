import { createContext, useContext, useRef } from "react";

/**
 * Contexto para rastrear qual chat está atualmente aberto.
 * Usado pelo GlobalChatMonitor para suprimir notificações quando o usuário
 * já está visualizando o chat correspondente.
 *
 * Usa uma ref (não state) para evitar re-renders desnecessários.
 */
const ActiveChatContext = createContext<React.MutableRefObject<number | null>>({ current: null });

export function ActiveChatProvider({ children }: { children: React.ReactNode }) {
  const activeChatIdRef = useRef<number | null>(null);
  return (
    <ActiveChatContext.Provider value={activeChatIdRef}>
      {children}
    </ActiveChatContext.Provider>
  );
}

/**
 * Hook para obter e definir o ID do chat atualmente ativo.
 * Chame `setActiveChatId(id)` ao abrir o chat e `setActiveChatId(null)` ao fechar.
 */
export function useActiveChatId() {
  const ref = useContext(ActiveChatContext);
  return {
    getActiveChatId: () => ref.current,
    setActiveChatId: (id: number | null) => {
      ref.current = id;
    },
  };
}
