Deno.serve(() => Response.json({ error: "Integração Telegram cancelada." }, { status: 410 }));
