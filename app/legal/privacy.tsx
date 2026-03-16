import React from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { LegalScreen } from "@/components/segtec/LegalScreen";

export default function PrivacyScreen() {
  return (
    <LegalScreen
      title="Política de Privacidade"
      subtitle="e Segurança"
      icon="security"
      iconColor="#2563EB"
      lastUpdated="Março de 2026"
      intro="O ProntoTEC+ valoriza a privacidade e a segurança das informações de seus usuários. Esta Política de Privacidade explica como coletamos, utilizamos e protegemos os dados de clientes e profissionais que utilizam nossa plataforma."
      sections={[
        {
          title: "Informações que coletamos",
          content:
            "Para oferecer nossos serviços, podemos coletar as seguintes informações:",
          bullets: [
            "Dados de cadastro: nome, e-mail, telefone e cidade",
            "Informações de perfil profissional (para técnicos): especialidades, experiência, empresa, fotos de trabalhos e avaliações",
            "Localização aproximada para conectar clientes a técnicos próximos",
            "Informações sobre solicitações de serviço realizadas dentro da plataforma",
            "Dados de uso do aplicativo para melhorar a experiência do usuário",
          ],
        },
        {
          title: "Como utilizamos as informações",
          content: "As informações coletadas são utilizadas para:",
          bullets: [
            "Conectar clientes a técnicos de segurança eletrônica próximos",
            "Permitir a solicitação e acompanhamento de serviços",
            "Melhorar a experiência e funcionamento do aplicativo",
            "Garantir segurança e confiabilidade entre usuários",
            "Cumprir obrigações legais e regulatórias",
          ],
        },
        {
          title: "Compartilhamento de informações",
          content:
            "O ProntoTEC+ não vende dados pessoais.\n\nAlgumas informações podem ser compartilhadas apenas quando necessário para o funcionamento do serviço, como:",
          bullets: [
            "Entre clientes e profissionais durante uma solicitação de serviço",
            "Com prestadores de serviços tecnológicos que auxiliam na operação do aplicativo",
            "Quando exigido por lei ou autoridade competente",
          ],
        },
        {
          title: "Segurança das informações",
          content:
            "Adotamos medidas técnicas e administrativas para proteger os dados dos usuários contra acesso não autorizado, perda ou uso indevido.\n\nEntre essas medidas estão:",
          bullets: [
            "Criptografia de dados",
            "Controle de acesso aos sistemas",
            "Monitoramento de segurança da plataforma",
          ],
        },
        {
          title: "Avaliações e reputação",
          content:
            "Clientes podem avaliar profissionais após a conclusão de um serviço. Essas avaliações ajudam a manter a qualidade da plataforma e ficam visíveis para outros usuários.",
        },
        {
          title: "Responsabilidade dos usuários",
          content:
            "Os usuários são responsáveis por manter a segurança de suas contas e por fornecer informações verdadeiras no cadastro.\n\nO ProntoTEC+ pode suspender ou remover contas que violem os termos de uso da plataforma.",
        },
        {
          title: "Direitos do usuário (LGPD)",
          content:
            "De acordo com a Lei Geral de Proteção de Dados (LGPD), os usuários podem:",
          bullets: [
            "Solicitar acesso aos seus dados",
            "Solicitar correção de informações",
            "Solicitar exclusão de dados quando aplicável",
          ],
        },
        {
          title: "Alterações nesta política",
          content:
            "Esta Política de Privacidade pode ser atualizada periodicamente para refletir melhorias na plataforma ou mudanças legais. A data da última atualização estará sempre indicada no início deste documento.",
        },
        {
          title: "Contato",
          content:
            "Em caso de dúvidas sobre privacidade ou segurança, o usuário pode entrar em contato com a equipe do ProntoTEC+ pelo e-mail: contato@prontotecplus.app",
         }
      ]}
      showAcceptButton
      onAccept={() =>
        Alert.alert(
          "Confirmado",
          "Você confirmou que leu e concorda com a Política de Privacidade e Segurança do ProntoTEC+.",
          [{ text: "OK", onPress: () => router.back() }]
        )
      }
    />
  );
}
