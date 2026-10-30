# Leitura de documentos do Telegram pela OpenAI

A extração de texto, imagem, comprovante, cupom e boleto usa a API OpenAI Responses como provedor principal. Os resultados são validados com o schema Zod já usado pelo aplicativo; não há fallback automático para Gemini.

A chave deve existir como segredo de servidor OPENAI_API_KEY no ambiente de produção do Lovable. Não use VITE_OPENAI_API_KEY e não grave a chave no repositório. OPENAI_MODEL é opcional; o padrão é gpt-6.1-terra. A integração usa entrada inline para PDF/imagens e store:false, sem enviar arquivos pela Files API nem guardar respostas na OpenAI.

## Fluxo

1. O webhook do Telegram valida o segredo e guarda a mensagem/documento na fila privada do Supabase.
2. O endpoint de processamento baixa e armazena o arquivo, chama OpenAI e salva os campos extraídos na revisão.
3. O Telegram recebe uma notificação com o resultado.
4. A pessoa confere os dados na Pocket e aprova ou descarta. A extração nunca cria um lançamento financeiro por conta própria.

Erros da OpenAI ficam registrados naquela revisão para conferência manual; a fila continua processando outros documentos. A rota de processamento continua protegida por LOVABLE_CRON_SECRET e depende de um agendador configurado no ambiente.

## Limites e dados

- A leitura tem limite de 60 segundos, inclui a resposta completa e aborta a chamada ao expirar.
- Imagens JPG/PNG e PDFs de até 20 MB são enviados inline para a OpenAI.
- O conteúdo do documento é enviado à OpenAI para extração. Os campos validados são armazenados no Supabase e apresentados para conferência.
- Não há nova tentativa automática de uma revisão que já ficou com estado de erro. Ela continua disponível para preenchimento manual.
- O gateway Lovable continua sendo usado para o transporte das mensagens e arquivos do Telegram. Esta alteração substitui apenas o provedor de IA; TELEGRAM_API_KEY, LOVABLE_API_KEY, segredos do webhook, credenciais Supabase e o agendamento continuam necessários nos respectivos ambientes.
