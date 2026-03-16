import React from "react";
import { router } from "expo-router";
import { LegalScreen } from "@/components/segtec/LegalScreen";

export default function TechnicianGuidelinesScreen() {
  return (
    <LegalScreen
      title="Diretrizes para Técnicos"
      subtitle="ProntoTEC+"
      icon="engineering"
      iconColor="#10B981"
      lastUpdated="Março de 2026"
      intro="As Diretrizes para Técnicos do ProntoTEC+ estabelecem as boas práticas e regras de conduta para profissionais e empresas que utilizam a plataforma para oferecer serviços de segurança eletrônica.\n\nAo se cadastrar como profissional no ProntoTEC+, o técnico concorda em seguir as diretrizes abaixo."
      sections={[
        {
          title: "Qualidade do Serviço",
          content:
            "Os profissionais cadastrados devem prestar seus serviços com responsabilidade, profissionalismo e respeito aos clientes.\n\nEspera-se que o técnico:",
          bullets: [
            "Execute os serviços conforme combinado com o cliente",
            "Utilize equipamentos e materiais adequados",
            "Mantenha um padrão técnico adequado ao serviço prestado",
            "Cumpra prazos acordados sempre que possível",
          ],
        },
        {
          title: "Informações do Perfil",
          content:
            "O profissional deve manter seu perfil atualizado com informações verdadeiras, incluindo:",
          bullets: [
            "Especialidades técnicas",
            "Cidade ou região de atuação",
            "Experiência profissional",
            "Empresa ou atividade autônoma",
          ],
        },
        {
          title: "Atendimento ao Cliente",
          content:
            "Os técnicos devem manter um atendimento respeitoso e profissional durante todas as interações com clientes.\n\nNão é permitido:",
          bullets: [
            "Comportamento ofensivo ou desrespeitoso",
            "Práticas enganosas",
            "Pressão indevida para contratação de serviços",
          ],
        },
        {
          title: "Avaliações dos Clientes",
          content:
            "Após a realização de um serviço, os clientes poderão avaliar o atendimento recebido.\n\nAvaliações ajudam a manter a qualidade da plataforma e influenciam a reputação do profissional dentro do ProntoTEC+.\n\nPerfis com avaliações consistentemente negativas poderão ser analisados pela plataforma.",
        },
        {
          title: "Segurança e Confiança",
          content:
            "O profissional deve respeitar a privacidade e segurança dos clientes.\n\nInformações obtidas durante a prestação do serviço não devem ser utilizadas para outros fins.",
        },
        {
          title: "Cumprimento das Leis",
          content:
            "O técnico é responsável por cumprir as normas e legislações aplicáveis à sua atividade profissional, incluindo obrigações fiscais e regulatórias.\n\nO ProntoTEC+ não se responsabiliza por irregularidades relacionadas à atuação profissional do técnico.",
        },
        {
          title: "Suspensão ou Remoção da Conta",
          content:
            "O ProntoTEC+ poderá suspender ou remover contas de profissionais que:",
          bullets: [
            "Violem estas diretrizes",
            "Recebam avaliações extremamente negativas de forma recorrente",
            "Pratiquem atividades ilegais ou fraudulentas",
            "Prejudiquem a integridade da plataforma ou de seus usuários",
          ],
        },
      ]}
      showAcceptButton
      onAccept={() => router.back()}
    />
  );
}
