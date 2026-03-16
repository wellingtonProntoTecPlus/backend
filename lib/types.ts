export type ServiceCategory =
  | "alarmes"
  | "cftv"
  | "portao"
  | "interfone"
  | "fechadura"
  | "cerca"
  | "wifi"
  | "acesso"
  | "monitoramento"
  | "portaria_remota";

export type TechnicianType = "empresa" | "autonomo" | "certificada";

export type VerificationBadge = "verificado" | "autonomo" | "certificada";

export type AvailabilityStatus = "disponivel" | "agenda_cheia" | "indisponivel";

// Níveis de profissional
export type ProfessionalLevel = "autonomo" | "empresa_verificada" | "parceiro_prontotec";

export interface PriceRange {
  min: number;
  max: number;
  unit: string; // "por serviço", "por câmera", "mensal", etc.
}

export interface Review {
  id: string;
  clientId?: string;
  clientName: string;
  clientAvatar?: string;
  rating: number;
  comment?: string;
  tags?: string[];
  date?: string;
  createdAt?: string;
  serviceCategory?: ServiceCategory;
}

export interface Address {
  street?: string;    // Rua/Avenida
  number?: string;    // Número
  complement?: string; // Complemento (apto, sala, etc.)
  neighborhood?: string; // Bairro
  city: string;
  state: string;
  zipCode?: string;   // CEP
  lat?: number;       // Latitude (preenchida via geocodificação)
  lng?: number;       // Longitude (preenchida via geocodificação)
}

export interface Technician {
  id: string;
  name: string;
  companyName?: string;
  companyLogoUrl?: string; // URL do logo da empresa
  document: string; // CPF ou CNPJ
  city: string;
  state: string;
  address?: Address; // Endereço completo para posicionamento no mapa
  type: TechnicianType;
  badge: VerificationBadge;
  level: ProfessionalLevel;
  availability: AvailabilityStatus;
  avatar: string;
  photoUri?: string; // URI local da foto tirada/selecionada pelo usuário
  coverPhoto?: string;
  specialties: ServiceCategory[];
  rating: number;
  totalReviews: number;
  totalServices: number;
  yearsExperience: number;
  phone: string;
  whatsapp: string;
  description: string;
  workPhotos: string[];
  reviews: Review[];
  planType: "basico" | "destaque" | "gratuito";
  distance?: number; // km
  // Técnico Destaque: calculado automaticamente
  isDestaque?: boolean;
  complaints?: number; // número de reclamações formais
}

// Critérios para Técnico Destaque
export const DESTAQUE_CRITERIA = {
  minRating: 4.8,
  minServices: 50,
  maxComplaints: 0,
} as const;

// Função utilitária para verificar se um técnico é destaque
export function isTechnicianDestaque(tech: Technician): boolean {
  return (
    tech.rating >= DESTAQUE_CRITERIA.minRating &&
    tech.totalServices >= DESTAQUE_CRITERIA.minServices &&
    (tech.complaints ?? 0) <= DESTAQUE_CRITERIA.maxComplaints
  );
}

// Estados completos do fluxo de chamado
export type RequestStatus =
  | "solicitado"          // Cliente criou o chamado
  | "em_analise"          // Técnico visualizou e está analisando
  | "orcamento_enviado"   // Técnico enviou orçamento
  | "servico_aprovado"    // Cliente aceitou o orçamento
  | "tecnico_a_caminho"   // Técnico confirmou deslocamento
  | "em_andamento"        // Serviço em execução (legado)
  | "aguardando_confirmacao" // Técnico marcou como concluído, aguarda cliente
  | "finalizado_cliente"  // Cliente confirmou conclusão
  | "encerrado"           // Avaliação feita, chamado encerrado
  | "cancelado";          // Cancelado por qualquer parte
export type RequestUrgency = "normal" | "urgente";

export interface Quote {
  id: string;
  requestId: string;
  technicianId: string;
  technician?: Technician;
  price: number;
  description: string;
  estimatedTime: string; // ex: "2 horas", "1 dia"
  createdAt: string;
  status: "pendente" | "aceito" | "recusado";
}

export interface ServiceRequest {
  id: string;
  clientId: string;
  clientName?: string;       // Nome/apelido do cliente
  clientPhone?: string;      // Revelado apenas após aceite do orçamento
  clientAddress?: string;    // Revelado apenas após aceite do orçamento
  technicianId?: string;
  technician?: Technician;
  category: ServiceCategory;
  description: string;
  photoUrl?: string;
  location: string;          // Cidade/bairro (público)
  status: RequestStatus;
  urgency?: RequestUrgency;
  quotes?: Quote[];
  review?: Review;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  requestId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  isFromMe: boolean;
}

export interface User {
  id: string;
  /** ID numérico do servidor (banco de dados). Usado para comparar senderId nas mensagens de chat. */
  serverId?: number;
  name: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  address?: Address; // Endereço completo do usuário
  avatar?: string;
  mode: "cliente" | "tecnico";
  technicianProfile?: Technician;
}
