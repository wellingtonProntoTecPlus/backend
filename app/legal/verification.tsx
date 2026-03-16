import React from "react";
import { LegalScreen } from "@/components/segtec/LegalScreen";

export default function VerificationScreen() {
  return (
    <LegalScreen
      title="Verificação de Profissionais"
      subtitle="Política ProntoTEC+"
      icon="verified"
      iconColor="#2563EB"
      lastUpdated="Março de 2026"
      intro="A Política de Verificação de Profissionais do ProntoTEC+ tem como objetivo aumentar a confiança, segurança e qualidade dos serviços oferecidos na plataforma. O processo de verificação busca identificar profissionais que forneçam informações completas e confiáveis em seus perfis."
      sections={[
        {
          title: "Objetivo da Verificação",
          content:
            "A verificação de profissionais permite que os usuários identifiquem perfis que passaram por um processo adicional de validação dentro da plataforma.\n\nProfissionais verificados podem receber um selo visual de identificação, indicando que determinadas informações foram confirmadas.",
        },
        {
          title: "Informações que podem ser verificadas",
          content:
            "Durante o processo de verificação, o ProntoTEC+ poderá solicitar ou analisar informações como:",
          bullets: [
            "Documento de identificação do profissional",
            "CNPJ da empresa (quando aplicável)",
            "Dados de contato",
            "Área de atuação",
            "Especialidades técnicas",
            "Localização ou cidade de atendimento",
          ],
        },
        {
          title: "Selo de Profissional Verificado",
          content:
            "Após a validação das informações enviadas, o profissional poderá receber o selo:\n\n\"Profissional Verificado pelo ProntoTEC+\"\n\nEsse selo indica que o perfil passou por um processo básico de verificação de dados.\n\nA presença do selo não representa garantia de qualidade do serviço, mas indica que as informações do perfil foram analisadas pela plataforma.",
        },
        {
          title: "Manutenção da Verificação",
          content:
            "Para manter o selo de verificação ativo, o profissional deverá:",
          bullets: [
            "Manter suas informações atualizadas",
            "Manter boas avaliações na plataforma",
            "Seguir as Diretrizes para Técnicos do ProntoTEC+",
          ],
        },
        {
          title: "Limitação da Verificação",
          content:
            "A verificação realizada pelo ProntoTEC+ tem caráter informativo e não substitui a responsabilidade do cliente em avaliar o profissional antes da contratação.\n\nO ProntoTEC+ não garante a execução do serviço, atuando apenas como plataforma de conexão entre clientes e profissionais.",
        },
        {
          title: "Suspensão ou Revogação da Verificação",
          content:
            "O ProntoTEC+ poderá suspender ou remover o selo de verificação caso:",
          bullets: [
            "Sejam identificadas informações falsas",
            "Ocorram violações das diretrizes da plataforma",
            "O profissional receba avaliações negativas recorrentes",
            "O perfil apresente comportamento inadequado com usuários",
          ],
        },
        {
          title: "Atualizações desta Política",
          content:
            "Esta política poderá ser atualizada periodicamente para aprimorar os processos de verificação e segurança da plataforma.",
        },
      ]}
    />
  );
}
