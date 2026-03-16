/**
 * Dados de configuração do app.
 * ATENÇÃO: Não adicionar técnicos, clientes ou mensagens falsos aqui.
 * Todos os dados de usuários vêm do servidor via tRPC.
 */
import { ServiceRequest, Message } from "./types";

// Mantido vazio — pedidos vêm do servidor
export const MOCK_REQUESTS: ServiceRequest[] = [];

// Mantido vazio — mensagens vêm do servidor via chat.getMessages
export const MOCK_MESSAGES: Message[] = [];

export const SERVICE_CATEGORIES = [
  { id: "alarmes", label: "Alarmes", icon: "security", color: "#EF4444", priceRange: { min: 250, max: 800, unit: "por serviço" } },
  { id: "cftv", label: "Câmeras CFTV", icon: "videocam", color: "#3B82F6", priceRange: { min: 150, max: 350, unit: "por câmera" } },
  { id: "portao", label: "Portão Eletrônico", icon: "garage", color: "#10B981", priceRange: { min: 200, max: 600, unit: "por serviço" } },
  { id: "interfone", label: "Interfone", icon: "phone-in-talk", color: "#8B5CF6", priceRange: { min: 180, max: 450, unit: "por serviço" } },
  { id: "fechadura", label: "Fechadura Digital", icon: "lock", color: "#F59E0B", priceRange: { min: 120, max: 380, unit: "por serviço" } },
  { id: "cerca", label: "Cerca Elétrica", icon: "electric-bolt", color: "#F97316", priceRange: { min: 300, max: 900, unit: "por serviço" } },
  { id: "wifi", label: "Rede WiFi", icon: "wifi", color: "#06B6D4", priceRange: { min: 100, max: 300, unit: "por serviço" } },
  { id: "acesso", label: "Controle de Acesso", icon: "badge", color: "#6366F1", priceRange: { min: 350, max: 1200, unit: "por serviço" } },
  { id: "monitoramento", label: "Monitoramento", icon: "monitor-heart", color: "#DC2626", priceRange: { min: 80, max: 250, unit: "mensal" } },
  { id: "portaria_remota", label: "Portaria Remota", icon: "door-front", color: "#0891B2", priceRange: { min: 150, max: 400, unit: "mensal" } },
] as const;

export const PROFESSIONAL_LEVELS = {
  autonomo: {
    label: "Autônomo",
    description: "Cadastro básico verificado",
    color: "#6B7280",
    icon: "person",
  },
  empresa_verificada: {
    label: "Empresa Verificada",
    description: "CNPJ e documentação confirmados",
    color: "#2563EB",
    icon: "verified",
  },
  parceiro_prontotec: {
    label: "Parceiro ProntoTEC+",
    description: "Certificado e auditado pela plataforma",
    color: "#D97706",
    icon: "workspace-premium",
  },
};
