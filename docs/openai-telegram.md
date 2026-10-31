# Leitura de documentos do Telegram pela OpenAI

A extração de texto, imagem, comprovante, cupom e boleto usa a API OpenAI Responses como provedor principal e único. Os resultados são validados pelo schema Zod usado no aplicativo; não há fallback automático para Gemini.

Configure OPENAI_API_KEY como segredo de servidor no ambiente do Lovable. Não use VITE_OPENAI_API_KEY nem grave a chave no repositório. OPENAI_MODEL é opcional; o padrão é gpt-6-luna. A integração envia PDFs e imagens inline, usa store:false e não faz upload pela Files API. store:false desativa o armazenamento da resposta pela API; aplicam-se as políticas de retenção e monitoramento do provedor.

## Fluxo

1. O webhook do Telegram valida o segredo e guarda a mensagem/documento na fila privada do Supabase.
2. O endpoint de processamento baixa e armazena o arquivo, chama OpenAI e salva os campos extraídos na revisão.
3. O Telegram recebe uma notificação com o resultado.
4. A pessoa confere os dados na Pocket e aprova ou descarta. A extração nunca cria um lançamento financeiro por conta própria.

Erros da OpenAI ficam registrados naquela revisão para conferência manual; a fila continua processando outros documentos. A rota de processamento continua protegida por LOVABLE_CRON_SECRET e depende de um agendador configurado no ambiente.

## Limites e dados

- A leitura tem limite de 60 segundos, incluindo a resposta completa, e aborta a chamada ao expirar.
- Imagens JPG/PNG e PDFs de até 20 MB são enviados inline à OpenAI.
- O conteúdo do documento é enviado à OpenAI para extração. Os campos validados são armazenados no Supabase e apresentados para conferência.
- Não há nova tentativa automática de uma revisão que já ficou com estado de erro. Ela continua disponível para preenchimento manual.
- O gateway Lovable continua sendo usado para o transporte das mensagens e arquivos do Telegram. Esta alteração substitui apenas o provedor de IA; TELEGRAM_API_KEY, LOVABLE_API_KEY, segredos do webhook, credenciais Supabase e o agendamento continuam necessários nos respectivos ambientes.
