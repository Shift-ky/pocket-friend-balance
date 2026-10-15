import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const CATEGORIAS = ["Alimentação", "Mercado", "Transporte", "Moradia", "Saúde", "Educação", "Lazer", "Serviços", "Compras", "Outros"];

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["data", "fornecedor", "categoria", "descricao", "valor"],
  properties: {
    data: { type: ["string", "null"], description: "Data no formato AAAA-MM-DD" },
    fornecedor: { type: "string" },
    categoria: { type: "string", enum: CATEGORIAS },
    descricao: { type: "string", description: "Resumo curto do que foi comprado" },
    valor: { type: "number", description: "Valor total pago em reais" },
  },
};

export const lerRecibo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { grupoId: string; nome: string; dataUrl: string }) => {
    if (d.dataUrl.length > 8_000_000) throw new Error("Arquivo muito grande (máx. ~5 MB).");
    return d;
  })
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("IA não configurada.");
    const pdf = data.dataUrl.startsWith("data:application/pdf");
    const arquivo = pdf
      ? { type: "input_file", filename: data.nome || "recibo.pdf", file_data: data.dataUrl }
      : { type: "input_image", image_url: data.dataUrl };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        text: { format: { type: "json_schema", name: "despesa", strict: true, schema } },
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: "Leia esta nota fiscal ou recibo brasileiro e extraia a despesa. Escolha a categoria mais adequada." },
            arquivo,
          ],
        }],
      }),
    });
    if (!res.ok || !res.body) {
      if (res.status === 402) throw new Error("Créditos de IA esgotados.");
      if (res.status === 429) throw new Error("Muitas leituras seguidas, tente em instantes.");
      throw new Error(`Não foi possível ler o arquivo (${res.status}).`);
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", texto = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const partes = buf.split("\n");
      buf = partes.pop() ?? "";
      for (const l of partes) {
        if (!l.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(l.slice(5).trim());
          if (ev.type === "response.output_text.delta") texto += ev.delta;
          if (ev.type === "response.failed" || ev.type === "error") throw new Error("A IA não conseguiu ler o arquivo.");
        } catch (e) { if (e instanceof Error && e.message.startsWith("A IA")) throw e; }
      }
    }
    let d: { data: string | null; fornecedor: string; categoria: string; descricao: string; valor: number };
    try { d = JSON.parse(texto); } catch { throw new Error("A IA não conseguiu ler o arquivo."); }

    const valida = d.data && /^\d{4}-\d{2}-\d{2}$/.test(d.data) ? d.data : undefined;
    const { error } = await context.supabase.from("despesas").insert({
      grupo_id: data.grupoId, fornecedor: d.fornecedor, categoria: d.categoria,
      descricao: d.descricao, valor: d.valor || 0, ...(valida ? { data: valida } : {}),
    });
    if (error) throw new Error(error.message);
    return d;
  });
