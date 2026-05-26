import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.11.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    // 1. Initialize Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 2. Authenticate User
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error(`Unauthorized: ${authError?.message || 'User not found'}`);
    }

    // 3. Fetch Context (Store, Products, Orders)
    const { data: store } = await supabaseClient.from('stores').select('*').eq('owner_id', user.id).single();
    if (!store) throw new Error('Store not found');

    const { data: products } = await supabaseClient.from('products').select('name, price, category, unit, is_available').eq('store_id', store.id);
    const { data: orders } = await supabaseClient.from('orders').select('total_amount, status, created_at, items').eq('store_id', store.id).order('created_at', { ascending: false }).limit(50);

    // 4. Initialize Gemini
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) throw new Error('GEMINI_API_KEY is not set. Please set it via Supabase Secrets.');
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    // 5. Construct Prompt
    const systemPrompt = `You are Organica AI, an expert business analyst assistant for a farm store owner.
Store Name: ${store.name}
Category: ${store.category}

Products: ${JSON.stringify(products)}
Recent Orders: ${JSON.stringify(orders)}

Analyze the user's prompt based on the provided database context.
You MUST respond with a valid JSON object matching this exact schema:
{
  "insight": "A brief, friendly, actionable paragraph analyzing the data. Speak directly to the owner.",
  "chart": {
    "type": "bar",
    "data": [ { "label": "String", "value": 123, "color": "#HexCode" } ]
  }
}
If the prompt doesn't naturally fit a chart, construct a relevant chart anyway (e.g. products by category, recent order totals). 
Ensure colors are hex codes (e.g., #4A6038 for green, #FF8C42 for orange).
Only output valid JSON, absolutely no markdown wrappers like \`\`\`json.`;

    const fullPrompt = `${systemPrompt}\n\nOwner's Request: ${prompt}`;

    // 6. Generate Content
    const result = await model.generateContent(fullPrompt);
    let text = result.response.text();
    
    // Clean up any markdown
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonResponse = JSON.parse(text);

    return new Response(JSON.stringify(jsonResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
