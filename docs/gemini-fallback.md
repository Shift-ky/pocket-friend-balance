# Leitura alternativa de documentos pelo Gemini

Quando a extração no Lovable responde HTTP 402, o servidor registra a pausa desse provedor e tenta Gemini uma vez. A chave é lida de GEMINI_API_KEY no servidor. Não criar VITE_GEMINI_API_KEY nem incluir chaves no repositório.

O modelo padrão é gemini-3.8-flash; GEMINI_MODEL permite configurar outro modelo Gemini compatível com PDF e saída estruturada. Nenhuma dependência foi adicionada: a chamada usa a API REST oficial do Google. As instruções financeiras, validação Zod, normalização e parser de boleto permanecem compartilhados.

Compatibilidade de produção: o servidor usa Cloudflare Workers, que não aceita redirect: error. A chamada usa redirect: manual; respostas 3xx falham sem seguir Location, preservando a chave no destino Google original. A opção incompatível causava a mensagem genérica de indisponibilidade antes do envio. Não confundir esse caso com uma quota ou chave rejeitada pelo Google.

## Comportamento

- Leitura Lovable bem-sucedida: não chama Gemini.
- HTTP 402, inclusive encapsulado em erro de streaming: registra motivo estável lovable:402, tenta Gemini se configurado e usa Gemini nos próximos itens enquanto durar essa pausa.
- Pausas antigas com motivo explícito 402, Not enough credits ou créditos esgotados também permitem a alternativa. Uma pausa genérica ou de autorização não é ignorada: inspecionar o motivo antes de qualquer retomada.
- 401/403/404, pausa manual ou falha de autenticação no Lovable: preserva a pausa existente. Gemini não é usado para contornar esses bloqueios.
- Erro do Gemini: documento fica com extraction_status=erro, disponível para conferência manual; não há repetição automática ou alteração de lançamentos.
- Só consulta itens pendentes/aguardando. Não repete documentos que já falharam, nem reseta filas ou pausas globalmente.
- A aprovação financeira continua passando pelos RPC existentes. Nenhum débito é criado automaticamente pela extração.

Depois de repor créditos, a preferência permanece no Gemini enquanto o estado de crédito estiver pausado. Para voltar ao Lovable, uma pessoa autorizada deve revisar e retomar esse estado de forma explícita. Esta alteração não adiciona botão de administração nem faz essa mudança em produção.

## Teste antes de publicar

1. Configurar GEMINI_API_KEY como segredo de servidor no ambiente de teste/preview. A presença da chave no painel não prova que ela é válida ou tem quota.
2. Usar documento sintético e mock HTTP 402 nos testes. Não zerar saldo, não alterar webhook e não testar com documentos financeiros reais.
3. Confirmar que uma nova revisão é extraída pelo Gemini, que uma revisão marcada como erro não é repetida, e que a aprovação ainda exige ação explícita.
4. Validar a chave/modelo/quota com PDF sintético no ambiente isolado antes de promoção. Não divulgar a chave em prints, logs ou mensagens.
5. A interface do Lovable informa que segredos entram em vigor imediatamente no preview e exigem publicação para a aplicação live. Não publicar automaticamente.

Os testes automatizados usam respostas simuladas, sem acesso a chaves ou dados reais. A integração Telegram continua pelo gateway Lovable e pode ter indisponibilidades/limites próprios; esta alteração substitui apenas a extração de IA. Não elimina dependência do gateway Telegram.

Gemini tem quotas, condições de uso e possível cobrança conforme a conta. Não há promessa de uso gratuito ilimitado. O conteúdo do documento é enviado ao Google quando a alternativa é acionada: revisar os termos aplicáveis à conta antes de usar dados reais.

## Referências verificadas em 30/10/2026

- https://ai.google.dev/api/generate-content
- https://ai.google.dev/gemini-api/docs/structured-output
- https://ai.google.dev/gemini-api/docs/document-processing
- https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash
- https://developers.cloudflare.com/workers/runtime-apis/request/
