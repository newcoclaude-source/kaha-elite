// Render dos templates da Julia. Os TEXTOS vêm de kaha_templates (0011); aqui só
// substituímos os placeholders {nome} {treino_do_dia} {ultima_carga} {professor}
// {dia} {hora} {link_q} {horarios_livres} {dias_para_vencer}.

export type FilaTipo =
  | "confirmacao"
  | "pre_treino"
  | "pos_treino"
  | "resgate"
  | "renovacao"
  | "presenca"
  | "aviso_professor";

export const ROTULO_TIPO: Record<FilaTipo, string> = {
  confirmacao: "Confirmação",
  pre_treino: "Pré-treino",
  pos_treino: "Pós-treino",
  resgate: "Resgate",
  renovacao: "Renovação",
  presenca: "Presença",
  aviso_professor: "Aviso ao professor",
};

// Para quem vai a mensagem (o número usado no wa.me).
export type Destinatario = "aluno" | "professor";

// Substitui {chave} pelos valores. Var AUSENTE (null/undefined) deixa {placeholder}
// cru — salvaguarda contra var esquecida. String vazia ("") é intencional (frase
// opcional, ex.: {ultima_sessao}) e renderiza NADA. O motor sempre passa fallback
// não-vazio para as vars obrigatórias.
export function renderTemplate(
  conteudo: string,
  vars: Record<string, string | null | undefined>,
): string {
  return conteudo.replace(/\{(\w+)\}/g, (_m, chave) => {
    const v = vars[chave];
    return v == null ? `{${chave}}` : String(v);
  });
}
