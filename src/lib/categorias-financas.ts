export const GRUPOS_CATEGORIAS_SAIDA = [
  { nome: "Alimentação", categorias: ["Mercado", "Feira", "Padaria", "Açougue", "Restaurante", "Lanches", "Delivery", "Café"] },
  { nome: "Moradia e contas", categorias: ["Aluguel ou financiamento", "Condomínio", "Água", "Energia elétrica", "Gás", "Internet e telefone", "Limpeza doméstica", "Reparos e manutenção", "Móveis e decoração"] },
  { nome: "Transporte", categorias: ["Moto", "Combustível", "Transporte público", "Aplicativo de transporte", "Manutenção de veículo", "Estacionamento e pedágio", "Seguro e documentação do veículo"] },
  { nome: "Saúde", categorias: ["Consultas", "Exames", "Medicamentos e farmácia", "Plano de saúde", "Dentista", "Terapia", "Óculos e aparelhos"] },
  { nome: "Educação", categorias: ["Escola ou faculdade", "Cursos", "Material escolar", "Livros"] },
  { nome: "Lazer e entretenimento", categorias: ["Cinema", "Shows e eventos", "Streaming", "Jogos", "Passeios", "Hobbies", "Esportes", "Viagens"] },
  { nome: "Compras pessoais", categorias: ["Roupas", "Calçados", "Eletrônicos", "Higiene pessoal", "Beleza e cosméticos", "Presentes"] },
  { nome: "Casa", categorias: ["Compras para casa", "Eletrodomésticos", "Utensílios domésticos", "Móveis", "Manutenção da casa", "Produtos de limpeza"] },
  { nome: "Família", categorias: ["Filhos e dependentes", "Creche", "Mesada", "Ajuda a familiares"] },
  { nome: "Pets", categorias: ["Alimentação para pets", "Veterinário", "Higiene para pets", "Acessórios para pets"] },
  { nome: "Trabalho", categorias: ["Ferramentas e equipamentos", "Refeições de trabalho", "Transporte a trabalho"] },
  { nome: "Financeiro e obrigações", categorias: ["Empréstimos e parcelas", "Juros e taxas bancárias", "Seguros", "Impostos", "Multas", "Doações e ajuda"] },
  { nome: "Outros", categorias: ["Outros"] },
] as const;

export const CATEGORIAS_SAIDA = GRUPOS_CATEGORIAS_SAIDA.flatMap(grupo => grupo.categorias);
