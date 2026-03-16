# SEGTEC - Design do Aplicativo Móvel

## Conceito Visual

O SEGTEC é uma plataforma que conecta clientes com técnicos especializados em segurança eletrônica. O design deve transmitir **confiança, tecnologia e profissionalismo**, seguindo as diretrizes Apple HIG para uma experiência nativa e intuitiva.

---

## Paleta de Cores

| Token | Cor | Uso |
|-------|-----|-----|
| `primary` | `#1A3A5C` (Azul Marinho) | Ações principais, botões, destaques |
| `secondary` | `#F5A623` (Amarelo Âmbar) | Badges, selos, avaliações |
| `background` | `#F8F9FA` / `#0D1117` | Fundo das telas |
| `surface` | `#FFFFFF` / `#1C2128` | Cards, modais |
| `foreground` | `#1A1A2E` / `#E8EAF0` | Texto principal |
| `muted` | `#6B7280` / `#9CA3AF` | Texto secundário |
| `success` | `#10B981` | Técnico verificado |
| `warning` | `#F5A623` | Profissional autônomo |
| `error` | `#EF4444` | Erros, alertas |

---

## Lista de Telas

### 1. Onboarding / Splash
- Tela de boas-vindas com logo SEGTEC
- Botões: "Sou Cliente" e "Sou Técnico"

### 2. Home do Cliente (Tab: Início)
- Header com localização atual e busca rápida
- Banner de destaque com CTA "Solicitar Serviço"
- Categorias de serviço em grid (Alarmes, CFTV, Portão, etc.)
- Seção "Técnicos em Destaque" (cards horizontais)
- Seção "Serviços Recentes"

### 3. Busca / Explorar (Tab: Buscar)
- Barra de busca com filtros
- Filtros por: categoria, distância, avaliação, tipo (empresa/autônomo)
- Lista de técnicos com cards compactos
- Mapa com pins dos técnicos próximos

### 4. Perfil do Técnico (Tela modal/stack)
- Foto, nome, empresa, cidade
- Selos de verificação (Verificado, Autônomo, Empresa Certificada)
- Especialidades com ícones
- Avaliação geral (estrelas) e número de serviços
- Galeria de trabalhos realizados
- Botões: "Solicitar Serviço" e "Enviar Mensagem"
- Lista de avaliações de clientes

### 5. Solicitar Serviço (Tela modal)
- Seleção de categoria do serviço
- Campo de descrição do problema
- Upload de foto do problema
- Confirmação de localização
- Botão de envio

### 6. Minhas Solicitações (Tab: Pedidos)
- Lista de solicitações ativas e históricas
- Status: Aguardando, Em andamento, Concluído
- Acesso rápido ao chat de cada solicitação

### 7. Chat (Tela stack)
- Interface de mensagens estilo iMessage
- Envio de fotos
- Status de leitura
- Header com info do técnico/cliente

### 8. Avaliação (Tela modal pós-serviço)
- Seleção de estrelas (1-5)
- Campo de comentário
- Botão de envio

### 9. Cadastro de Técnico (Tela stack)
- Formulário multi-etapas:
  - Etapa 1: Dados pessoais (Nome, CPF/CNPJ, cidade, tipo)
  - Etapa 2: Serviços oferecidos (checkboxes)
  - Etapa 3: Contato (telefone, WhatsApp)
  - Etapa 4: Foto de perfil e fotos de trabalhos

### 10. Perfil do Usuário (Tab: Perfil)
- Foto e nome do usuário
- Opção de alternar entre modo Cliente e modo Técnico
- Configurações
- Histórico de serviços

---

## Fluxos Principais

### Fluxo do Cliente
1. Abre o app → Tela Home
2. Toca em categoria ou usa busca → Tela de Busca com filtros
3. Seleciona técnico → Perfil do Técnico
4. Toca "Solicitar Serviço" → Modal de Solicitação
5. Preenche detalhes → Confirmação enviada
6. Acompanha pelo Chat → Serviço concluído
7. Avalia o técnico → Avaliação enviada

### Fluxo do Técnico
1. Abre o app → Tela Home (modo técnico)
2. Recebe notificação de solicitação
3. Visualiza detalhes da solicitação
4. Aceita ou recusa
5. Comunica pelo Chat
6. Conclui o serviço
7. Recebe avaliação

---

## Componentes Reutilizáveis

- `TechnicianCard` - Card compacto do técnico (lista e destaque)
- `ServiceCategoryButton` - Botão de categoria com ícone
- `StarRating` - Componente de avaliação por estrelas
- `VerificationBadge` - Selo de verificação (Verificado/Autônomo/Certificado)
- `ServiceRequestCard` - Card de solicitação com status
- `ChatBubble` - Balão de mensagem
- `SectionHeader` - Cabeçalho de seção com "Ver todos"

---

## Navegação

```
Root Stack
├── Onboarding (sem tabs)
├── (tabs)
│   ├── index (Home)
│   ├── search (Buscar)
│   ├── requests (Pedidos)
│   └── profile (Perfil)
├── technician/[id] (Perfil do Técnico)
├── request/new (Nova Solicitação)
├── chat/[id] (Chat)
├── review/[id] (Avaliação)
└── register-technician (Cadastro de Técnico)
```

---

## Tipografia

- **Títulos**: SF Pro Display Bold (nativo iOS) / Roboto Bold (Android)
- **Corpo**: SF Pro Text Regular / Roboto Regular
- **Tamanhos**: 28px (h1), 22px (h2), 17px (body), 15px (secondary), 13px (caption)

---

## Ícones de Categorias

| Categoria | Ícone Material |
|-----------|---------------|
| Alarmes | `security` |
| CFTV / Câmeras | `videocam` |
| Portão Eletrônico | `garage` |
| Interfone | `intercom` |
| Fechadura Digital | `lock` |
| Cerca Elétrica | `electric-bolt` |
| Rede WiFi | `wifi` |
| Controle de Acesso | `badge` |
