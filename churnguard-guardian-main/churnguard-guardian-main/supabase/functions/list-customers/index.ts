const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("N8N_GETCUSTOMERS_URL");
    if (!url) {
      return new Response(
        JSON.stringify({ customers: [], source: "config_error", error: "N8N_GETCUSTOMERS_URL not configured", fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "lovable" }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("n8n getcustomers failed", res.status, errText);
      return new Response(
        JSON.stringify({
          customers: [],
          source: "n8n_error",
          error: `n8n ${res.status}`,
          detail: errText,
          fallback: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rawText = await res.text();
    const trimmed = rawText.trim();
    const data = trimmed ? JSON.parse(trimmed) : [];
    console.log("n8n raw response:", (trimmed || "<empty>").slice(0, 2000));
    const record = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
    let customers: unknown[] = [];
    if (Array.isArray(data)) customers = data;
    else if (Array.isArray(record?.customers)) customers = record.customers;
    else if (Array.isArray(record?.data)) customers = record.data;
    else if (Array.isArray(record?.results)) customers = record.results;
    else if (Array.isArray(record?.rows)) customers = record.rows;
    else if (Array.isArray(record?.items)) customers = record.items;
    else if (data && typeof data === "object") customers = [data as Record<string, unknown>];

    return new Response(JSON.stringify({ customers, source: "n8n", fallback: false, raw: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("list-customers error", e);
    return new Response(
      JSON.stringify({
        customers: [],
        source: "runtime_error",
        error: e instanceof Error ? e.message : String(e),
        fallback: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
