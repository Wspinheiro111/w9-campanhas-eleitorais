export type ComplianceAction =
  | "contact.import"
  | "communication.log_electoral"
  | "communication.export_contacts"
  | "content.publish"
  | "survey.publish"
  | "financial.register";

export type ComplianceDecision = "approved" | "blocked" | "needs_human_review" | "not_applicable";
export type ComplianceReviewStatus = "not_required" | "pending" | "approved" | "blocked" | "cancelled";

export type ComplianceRules = {
  ruleVersion: string;
  blockBusinessDonation: boolean;
  requireExpenseDocument: boolean;
  blockElectoralPhoneContact: boolean;
  requireConsentEvidence: boolean;
  requireHumanReviewForSyntheticContent: boolean;
  blockSyntheticPublicationWindow: boolean;
  requireResearchRegistrationForPublication: boolean;
  requireFinancialEvidence: boolean;
};

export type ComplianceEvaluationInput = {
  action: ComplianceAction;
  rules: ComplianceRules;
  channel?: "email" | "whatsapp" | "phone";
  purpose?: string;
  voter?: {
    doNotContact: boolean;
    isSuppressed: boolean;
    channelAllowed: boolean;
    hasActiveEvidence: boolean;
  };
  content?: {
    isSynthetic: boolean;
    disclosureProvided: boolean;
    reviewStatus: ComplianceReviewStatus;
    withinRestrictedSyntheticWindow?: boolean;
  };
  survey?: {
    classification: "internal" | "public_disclosure";
    registrationCode?: string | null;
    methodologyProvided: boolean;
    reviewStatus: ComplianceReviewStatus;
  };
  financial?: {
    entryType: "income" | "expense";
    counterpartyDocumentDigits?: number;
    evidenceProvided: boolean;
  };
  export?: {
    purposeConfirmed: boolean;
    reviewStatus: ComplianceReviewStatus;
  };
};

export type ComplianceEvaluation = {
  decision: ComplianceDecision;
  reviewStatus: ComplianceReviewStatus;
  reasons: string[];
};

function uniqueReasons(reasons: string[]) {
  return Array.from(new Set(reasons));
}

function blocked(reasons: string[]): ComplianceEvaluation {
  return { decision: "blocked", reviewStatus: "blocked", reasons: uniqueReasons(reasons) };
}

function needsReview(reasons: string[]): ComplianceEvaluation {
  return { decision: "needs_human_review", reviewStatus: "pending", reasons: uniqueReasons(reasons) };
}

/**
 * Avalia somente regras objetivas do produto. Não representa decisão jurídica,
 * contábil ou homologação de autoridade pública.
 */
export function evaluateCompliance(input: ComplianceEvaluationInput): ComplianceEvaluation {
  const reasons: string[] = [];

  if (input.action === "contact.import") {
    return needsReview([
      "Contato importado sem concessão automática de autorização de comunicação.",
      "A origem, a finalidade e a evidência devem ser registradas antes do uso em canal externo.",
    ]);
  }

  if (input.action === "communication.log_electoral") {
    const voter = input.voter;
    if (!voter) return blocked(["Não foi possível verificar o contato antes da comunicação."]);
    if (input.rules.blockElectoralPhoneContact && input.channel === "phone") {
      return blocked(["Contato eleitoral por telefone está bloqueado pela política da campanha."]);
    }
    if (voter.doNotContact || voter.isSuppressed) {
      return blocked(["O contato possui solicitação ativa de não contato ou supressão."]);
    }
    if (!voter.channelAllowed) reasons.push("O canal não está autorizado nas preferências do contato.");
    if (input.rules.requireConsentEvidence && !voter.hasActiveEvidence) {
      reasons.push("Não há evidência ativa de autorização para esta finalidade e canal.");
    }
    return reasons.length ? blocked(reasons) : { decision: "approved", reviewStatus: "not_required", reasons: ["Canal, preferência e evidência ativa verificados."] };
  }

  if (input.action === "communication.export_contacts") {
    const exported = input.export;
    if (!exported?.purposeConfirmed) return blocked(["A exportação exige finalidade operacional declarada e confirmação do responsável."]);
    if (exported.reviewStatus !== "approved") return needsReview(["Exportação de contatos requer aprovação humana registrada antes da liberação."]);
    return { decision: "approved", reviewStatus: "approved", reasons: ["Finalidade e revisão humana da exportação registradas."] };
  }

  if (input.action === "content.publish") {
    const content = input.content;
    if (!content?.isSynthetic) return { decision: "not_applicable", reviewStatus: "not_required", reasons: ["O conteúdo não foi marcado como sintético."] };
    if (!content.disclosureProvided) return blocked(["Conteúdo sintético exige identificação explícita e acessível antes de publicação."]);
    if (input.rules.blockSyntheticPublicationWindow && content.withinRestrictedSyntheticWindow === true) {
      return blocked(["A regra temporal da campanha bloqueia publicação ou impulsionamento de conteúdo sintético neste período."]);
    }
    if (input.rules.requireHumanReviewForSyntheticContent && content.reviewStatus !== "approved") {
      return needsReview(["Conteúdo sintético exige revisão humana identificada antes de publicação."]);
    }
    return { decision: "approved", reviewStatus: "approved", reasons: ["Identificação e revisão humana de conteúdo sintético verificadas."] };
  }

  if (input.action === "survey.publish") {
    const survey = input.survey;
    if (!survey || survey.classification === "internal") {
      return { decision: "not_applicable", reviewStatus: "not_required", reasons: ["Levantamento classificado para uso interno, sem liberação de divulgação pública."] };
    }
    if (input.rules.requireResearchRegistrationForPublication && !survey.registrationCode?.trim()) {
      return blocked(["Pesquisa destinada à divulgação exige referência de registro antes da liberação."]);
    }
    if (!survey.methodologyProvided) return needsReview(["Pesquisa destinada à divulgação exige metodologia e documentos conferidos por responsável."]);
    if (survey.reviewStatus !== "approved") return needsReview(["Pesquisa destinada à divulgação exige aprovação humana antes da publicação."]);
    return { decision: "approved", reviewStatus: "approved", reasons: ["Registro, metodologia e revisão humana verificados."] };
  }

  if (input.action === "financial.register") {
    const financial = input.financial;
    if (!financial) return blocked(["Dados financeiros insuficientes para validação preparatória."]);
    if (input.rules.blockBusinessDonation && financial.entryType === "income" && financial.counterpartyDocumentDigits === 14) {
      return blocked(["A política da campanha bloqueia receita identificada por CNPJ."]);
    }
    if (input.rules.requireExpenseDocument && financial.entryType === "expense" && !financial.evidenceProvided) {
      return blocked(["Despesa exige documento ou recibo anexado pela política da campanha."]);
    }
    if (input.rules.requireFinancialEvidence && !financial.evidenceProvided) {
      return needsReview(["Lançamento financeiro sem evidência mínima anexada; requer conferência humana antes de prosseguir."]);
    }
    return { decision: "approved", reviewStatus: "not_required", reasons: ["Validação financeira preparatória concluída; não substitui revisão contábil ou transmissão oficial."] };
  }

  return { decision: "not_applicable", reviewStatus: "not_required", reasons: ["Ação fora do escopo de regras do motor."] };
}
