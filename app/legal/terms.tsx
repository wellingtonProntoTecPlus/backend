import React from "react";
import { router } from "expo-router";
import { LegalScreen } from "@/components/segtec/LegalScreen";

export default function TermsScreen() {
  return (
    <LegalScreen
      title="Termos de Uso"
      subtitle="ProntoTEC+"
      icon="gavel"
      lastUpdated="Março de 2026"
      intro="Bem-vindo ao ProntoTEC+. Estes Termos de Uso estabelecem as regras para utilização da plataforma ProntoTEC+, que conecta clientes a profissionais e empresas especializados em serviços de segurança eletrônica.\n\nAo acessar ou utilizar o aplicativo ou site do ProntoTEC+, o usuário declara que leu, compreendeu e concorda com estes Termos de Uso."
      sections={[
        {
          title: "Sobre o ProntoTEC+",
          content:
            "O ProntoTEC+ é uma plataforma digital que conecta clientes a profissionais e empresas que oferecem serviços relacionados à segurança eletrônica, incluindo instalação, manutenção e suporte de sistemas como:",
          bullets: [
            "Alarmes de segurança",
            "Câmeras de monitoramento",
            "Portões eletrônicos",
            "Interfones",
            "Fechaduras eletrônicas e digitais",
            "Redes de comunicação e Wi-Fi",
            "Outros serviços relacionados à segurança eletrônica",
          ],
        },
        {
          title: "Cadastro de Usuários",
          content:
            "Para utilizar determinadas funcionalidades da plataforma, o usuário deverá realizar um cadastro fornecendo informações verdadeiras, completas e atualizadas.\n\nO usuário é responsável por:",
          bullets: [
            "Manter a confidencialidade de sua conta e senha",
            "Atualizar suas informações quando necessário",
            "Todas as atividades realizadas através de sua conta",
          ],
        },
        {
          title: "Cadastro de Profissionais",
          content:
            "Profissionais e empresas que desejarem oferecer serviços através da plataforma deverão fornecer informações sobre:",
          bullets: [
            "Especialidades técnicas",
            "Experiência profissional",
            "Cidade de atuação",
            "Empresa ou atividade profissional",
          ],
        },
        {
          title: "Solicitação de Serviços",
          content:
            "Clientes podem utilizar o ProntoTEC+ para solicitar serviços de profissionais cadastrados na plataforma.\n\nA negociação de valores, prazos e condições do serviço pode ocorrer diretamente entre cliente e profissional.\n\nO ProntoTEC+ não participa da execução do serviço e não garante a disponibilidade imediata de profissionais.",
        },
        {
          title: "Avaliações e Reputação",
          content:
            "Após a realização de um serviço, clientes podem avaliar os profissionais com base em sua experiência.\n\nAs avaliações ajudam a manter a qualidade da plataforma e ficam visíveis para outros usuários.\n\nO ProntoTEC+ poderá remover avaliações que contenham conteúdo ofensivo, falso ou inadequado.",
        },
        {
          title: "Responsabilidade pelos Serviços",
          content:
            "O ProntoTEC+ atua apenas como intermediador de contato entre clientes e profissionais. Dessa forma, o ProntoTEC+ não se responsabiliza por:",
          bullets: [
            "Qualidade ou resultado dos serviços prestados",
            "Negociações realizadas entre clientes e profissionais",
            "Atrasos ou cancelamentos de serviços",
            "Danos ou prejuízos decorrentes da prestação dos serviços",
          ],
        },
        {
          title: "Uso Adequado da Plataforma",
          content: "É proibido utilizar o ProntoTEC+ para:",
          bullets: [
            "Atividades ilegais ou fraudulentas",
            "Divulgação de informações falsas",
            "Assédio, ameaças ou comportamento abusivo",
            "Práticas que prejudiquem outros usuários ou a integridade da plataforma",
          ],
        },
        {
          title: "Alterações nos Termos de Uso",
          content:
            "Estes Termos de Uso podem ser atualizados periodicamente. Quando isso ocorrer, a nova versão será publicada na plataforma com a data de atualização.\n\nO uso contínuo do aplicativo após alterações representa concordância com os novos termos.",
        },
        {
          title: "Contato",
          content:
            "Em caso de dúvidas sobre estes Termos de Uso ou sobre o funcionamento da plataforma, o usuário poderá entrar em contato com a equipe do ProntoTEC+ pelo e-mail: contato@prontotecplus.app",
        },
      ]}
      showAcceptButton
      onAccept={() => router.back()}
    />
  );
}
