# Guia de Testes — Notificações ProntoTEC+

## Por que as notificações não funcionam no Expo Go (QR Code)?

**Resposta direta:** O Expo Go **não suporta push notifications remotas** desde o SDK 53 (2024). Isso é uma limitação do Expo Go, não um bug do app. Para testar notificações, você **precisa obrigatoriamente do APK publicado**.

---

## Passo 1 — Publicar o APK

1. Clique no botão **Publish** no canto superior direito da interface do Manus
2. Aguarde o build terminar (pode levar 10–20 minutos)
3. Quando terminar, você receberá um link para baixar o APK

---

## Passo 2 — Instalar o APK nos celulares de teste

**No Android:**
1. Abra o link do APK no celular
2. Se aparecer "Instalar de fontes desconhecidas", vá em:
   - **Configurações → Segurança → Instalar apps desconhecidos**
   - Ative para o navegador que você está usando
3. Toque em **Instalar**
4. Se já tiver uma versão antiga instalada, desinstale primeiro

**Importante:** Instale o APK nos **3 celulares** (2 clientes + 1 técnico)

---

## Passo 3 — Configurar as contas nos celulares

**Celular 1 — Técnico:**
1. Abra o app → Cadastrar → "Sou técnico / empresa"
2. Escolha **Autônomo** → preencha os dados → confirme o e-mail
3. Na tela inicial do técnico, **ative o modo disponível** (toggle verde)

**Celular 2 — Cliente A:**
1. Abra o app → Cadastrar → "Sou cliente"
2. Preencha os dados → confirme o e-mail

**Celular 3 — Cliente B (opcional):**
1. Mesmo processo do Cliente A com outro e-mail

---

## Passo 4 — Testar notificações

### Teste 1: Novo chamado (técnico recebe notificação)

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 1 | No celular do técnico, **feche completamente o app** (deslize para cima e remova) | — |
| 2 | No celular do cliente, crie um novo chamado (botão "Chamar Técnico Agora" ou "Novo Pedido") | — |
| 3 | Aguarde até 10 segundos | No celular do técnico deve aparecer uma **notificação push** na barra de status: "🔔 Novo Pedido de Serviço" |
| 4 | Toque na notificação | O app deve abrir diretamente na tela do chamado |

### Teste 2: Mensagem de chat (notificação quando app está fechado)

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 1 | No celular do técnico, **feche completamente o app** | — |
| 2 | No celular do cliente, abra o chamado → aba Chat → envie uma mensagem | — |
| 3 | Aguarde até 10 segundos | No celular do técnico deve aparecer notificação: "💬 [Nome do cliente]: [mensagem]" |
| 4 | Toque na notificação | O app deve abrir diretamente no chat |

### Teste 3: Mensagem de chat (notificação quando app está em outra tela)

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 1 | No celular do técnico, abra o app mas fique na **tela inicial** (não no chat) | — |
| 2 | No celular do cliente, envie uma mensagem no chat | — |
| 3 | Aguarde até **5 segundos** (polling) | No celular do técnico deve aparecer notificação local: "💬 [Nome do cliente]: [mensagem]" |

### Teste 4: Resposta do técnico (cliente recebe som)

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 1 | No celular do cliente, abra o chat com o técnico | — |
| 2 | No celular do técnico, responda a mensagem | — |
| 3 | Imediatamente | No celular do cliente deve tocar um **som de notificação** (mesmo com o chat aberto) |

---

## O que fazer se a notificação não aparecer

### Verificar permissões no Android:
1. Vá em **Configurações → Apps → ProntoTEC+**
2. Toque em **Notificações**
3. Certifique-se que **todas as notificações estão ativadas**
4. Verifique se os canais **"ProntoTEC+ Chat"** e **"ProntoTEC+ Urgente"** estão ativos

### Verificar modo "Não Perturbe":
- Se o celular estiver no modo **Não Perturbe** (lua), notificações normais são bloqueadas
- Apenas chamados **urgentes** ignoram o modo Não Perturbe (bypassDnd)
- Para testes, **desative o modo Não Perturbe**

### Verificar otimização de bateria:
1. Vá em **Configurações → Bateria → Otimização de bateria**
2. Encontre **ProntoTEC+** e selecione **"Não otimizar"**
3. Isso evita que o Android mate o app em background

### Verificar conexão com a internet:
- O push remoto precisa de internet no celular do destinatário
- Teste com Wi-Fi e também com dados móveis

---

## Diferença entre notificação local e push remoto

| Tipo | Quando funciona | Quando NÃO funciona |
|------|-----------------|---------------------|
| **Push remoto** (servidor → celular) | App fechado, app em background | Expo Go, sem internet, sem token registrado |
| **Notificação local** (polling 5s) | App aberto em qualquer tela | App completamente fechado |
| **Som no chat** | Chat aberto, mensagem recebida | — |

**Resumo:** Para o técnico ser alertado com o app **fechado**, precisa do push remoto (APK publicado). Para ser alertado com o app **aberto em outra tela**, funciona com o polling local.

---

## Diagnóstico rápido

Se após instalar o APK as notificações ainda não funcionarem:

1. **Faça logout e login novamente** — isso força o registro do token push
2. **Verifique os logs** — acesse o painel do Manus e veja os logs do servidor. Procure por linhas como:
   - `[Push] Token registrado para userId X` — token registrado com sucesso
   - `[Push] Push enviado com sucesso` — push foi enviado
   - `[Push] Técnicos disponíveis no banco: 0` — técnico não está como "disponível"
   - `[Push] Nenhum técnico com availability=disponivel` — ativar o toggle de disponibilidade

3. **Certifique-se que o técnico está "Disponível"** — o toggle na tela inicial do técnico precisa estar **verde/ativo** para receber notificações de novos chamados

---

*Guia gerado em 09/03/2026 — ProntoTEC+ v57.6*
