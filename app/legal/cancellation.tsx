import React from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { LegalScreen } from "@/components/segtec/LegalScreen";

export default function CancellationScreen() {
  return (
    <LegalScreen
      title="Política de Cancelamento"
      subtitle="de Serviços"
      icon="cancel"
      iconColor="#EF4444"
      lastUpdated="Março de 2026"
      intro="Esta política estabelece regras básicas para cancelamento de solicitações de serviço realizadas através da plataforma ProntoTEC+."
      sections={[
        {
          title: "Cancelamento pelo Cliente",
          content:
            "O cliente poderá cancelar uma solicitação de serviço a qualquer momento antes do início do atendimento.\n\nRecomenda-se que o cancelamento seja realizado com antecedência para evitar transtornos ao profissional que aceitou o serviço.",
        },
        {
          title: "Cancelamento pelo Profissional",
          content:
            "O profissional poderá cancelar um atendimento caso exista impossibilidade de realizar o serviço no horário combinado.\n\nSempre que possível, o cancelamento deve ser comunicado com antecedência ao cliente.\n\nCancelamentos frequentes por parte do profissional podem impactar sua reputação na plataforma.",
        },
        {
          title: "Serviços Já Iniciados",
          content:
            "Após o início da execução do serviço, o cancelamento deverá ser tratado diretamente entre cliente e profissional, conforme as condições previamente acordadas entre as partes.\n\nO ProntoTEC+ não interfere em negociações ou acordos realizados entre cliente e profissional.",
        },
        {
          title: "Impacto nas Avaliações",
          content:
            "Cancelamentos frequentes ou injustificados podem afetar a reputação do usuário ou profissional dentro da plataforma.\n\nO histórico de cancelamentos poderá ser considerado no sistema de avaliação do ProntoTEC+.",
        },
        {
          title: "Responsabilidade da Plataforma",
          content:
            "O ProntoTEC+ atua apenas como intermediador entre clientes e profissionais, não sendo responsável por cancelamentos ou acordos realizados entre as partes.",
        },
      ]}
      showAcceptButton
      onAccept={() =>
        Alert.alert(
          "Confirmado",
          "Você confirmou que leu e concorda com a Política de Cancelamento do ProntoTEC+.",
          [{ text: "OK", onPress: () => router.back() }]
        )
      }
    />
  );
}
