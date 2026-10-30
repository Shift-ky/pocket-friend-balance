# Leitura de documentos do Telegram pela Gemini

A extração de texto, imagem, comprovante, cupom e boleto usa a API Gemini diretamente. O servidor chama `extractWithGemini` como único provedor de leitura; não tenta primeiro o gateway de IA do Lovable nem muda de provedor em caso de erro.

A chave deve existir como segredo de servidor `GEMINI_API_KEY` no ambiente de produção do Lovable. Não use `VITE_GEMINI_API_KEY` e não grave a chave no repositório. `GEMINI_MODEL` é opcional; o padrão é `gemini-3.8-flash`. A integração usa a API REST do Google e saída estruturada validada pelo schema Zod já usado pelo aplicativo.

## Fluxo

1. O webhook do Telegram valida o segredo e guarda a mensagem/documento na fila privada do Supabase.
2. O endpoint de processamento baixa e armazena o arquivo, chama Gemini e salva os campos extraídos na revisão.
3. O Telegram recebe uma notificação com o resultado.
4. A pessoa confere os dados na Pocket e aprova ou descarta. A extração nunca cria um lançamento financeiro por conta própria.

Erros da Gemini ficam registrados naquela revisão para conferência manual; a fila continua processando outros documentos. Pausas antigas do provedor de IA do Lovable não bloqueiam mais a leitura. A rota de processamento continua protegida por `LOVABLE_CRON_SECRET` e depende de um agendador configurado no ambiente.

## Limites e dados

- A leitura tem limite de 25 segundos, inclui a resposta completa e aborta a chamada ao expirar.
- Imagens JPG/PNG e PDFs de até 20 MB são enviados em linha para a API Gemini. Não é usada a Files API do Google.
- O conteúdo do documento é enviado ao Google para extração. Os campos validados são armazenados no Supabase e apresentados para conferência.
- Não há nova tentativa automática de uma revisão que já ficou com estado de erro. Ela continua disponível para preenchimento manual.
- O gateway Lovable continua sendo usado para o transporte das mensagens e arquivos do Telegram. Esta alteração substitui apenas o provedor de IA da extração; `TELEGRAM_API_KEY`, `LOVABLE_API_KEY`, segredos do webhook, credenciais Supabase e o agendamento continuam necessários nos respectivos ambientes.

