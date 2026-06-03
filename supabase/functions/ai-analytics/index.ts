// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
// @ts-ignore
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.11.0";

// Declare Deno to prevent TypeScript from complaining about it missing
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, timezoneOffset, localTime } = await req.json();

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

    // 3. Fetch Context (Store, Products, All Orders)
    const { data: store } = await supabaseClient.from('stores').select('*').eq('owner_id', user.id).single();
    if (!store) throw new Error('Store not found');

    const { data: products } = await supabaseClient.from('products').select('name, price, category, unit, is_available').eq('store_id', store.id);
    const { data: allOrders } = await supabaseClient.from('orders').select('total_amount, status, created_at, items').eq('store_id', store.id);

    const ordersList = allOrders || [];

    // Calculate exact, ground-truth metrics
    let totalRevenue = 0;
    let revenueToday = 0;
    let revenueThisWeek = 0;
    let revenueThisMonth = 0;
    
    let totalOrdersCount = 0; // only delivered orders count for total/completed orders
    let pendingOrdersCount = 0;
    let packedOrdersCount = 0;
    let outOfStockCount = 0;
    
    if (products) {
      outOfStockCount = products.filter((p: any) => !p.is_available).length;
    }
    
    const isOrderPacked = (order: any) => {
      return order?.items && Array.isArray(order.items) && order.items.length > 0 && order.items.every((i: any) => i.is_packed);
    };
    
    // Timezone normalization using client's local coordinates
    const clientDate = localTime ? new Date(localTime) : new Date();
    const offsetMin = typeof timezoneOffset === 'number' ? timezoneOffset : -330; // Default to India (-330) if not sent
    
    const getClientLocalTime = (utcDate: Date) => {
      return new Date(utcDate.getTime() - (offsetMin * 60 * 1000));
    };
    
    const clientLocalNow = getClientLocalTime(clientDate);
    
    const startOfToday = new Date(clientLocalNow.getFullYear(), clientLocalNow.getMonth(), clientLocalNow.getDate());
    const startOfWeek = new Date(clientLocalNow);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(clientLocalNow.getFullYear(), clientLocalNow.getMonth(), 1);
    
    ordersList.forEach((order: any) => {
      const orderUtcDate = new Date(order.created_at);
      if (isNaN(orderUtcDate.getTime())) return;
      
      const orderLocalDate = getClientLocalTime(orderUtcDate);
      const amt = Number(order.total_amount) || 0;
      
      if (order.status === 'delivered') {
        totalRevenue += amt;
        totalOrdersCount++;
        
        if (orderLocalDate >= startOfToday) {
          revenueToday += amt;
        }
        if (orderLocalDate >= startOfWeek) {
          revenueThisWeek += amt;
        }
        if (orderLocalDate >= startOfMonth) {
          revenueThisMonth += amt;
        }
      } else if (order.status === 'pending') {
        if (isOrderPacked(order)) {
          packedOrdersCount++;
        } else {
          pendingOrdersCount++;
        }
      }
    });
    
    // Select the 10 most recent orders for LLM specific details queries
    const recentOrdersForLlm = [...ordersList]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    const storeStats = {
      totalRevenue: totalRevenue.toFixed(2),
      revenueToday: revenueToday.toFixed(2),
      revenueThisWeek: revenueThisWeek.toFixed(2),
      revenueThisMonth: revenueThisMonth.toFixed(2),
      deliveredOrdersCount: totalOrdersCount,
      pendingOrdersCount: pendingOrdersCount,
      packedOrdersCount: packedOrdersCount,
      activeProductsCount: products?.length || 0,
      outOfStockCount: outOfStockCount
    };

    // 4. Initialize Gemini
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) throw new Error('GEMINI_API_KEY is not set. Please set it via Supabase Secrets.');
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // 5. Construct Prompt
    const systemPrompt = `You are Organica AI, an expert business analyst assistant for a farm store owner.
Store Name: ${store.name}
Category: ${store.category}

Here are the EXACT ground-truth store metrics calculated from the database:
- Total Revenue (Delivered Orders): ₹${storeStats.totalRevenue}
- Revenue Today: ₹${storeStats.revenueToday}
- Revenue This Week (Last 7 Days): ₹${storeStats.revenueThisWeek}
- Revenue This Month: ₹${storeStats.revenueThisMonth}
- Completed/Delivered Orders: ${storeStats.deliveredOrdersCount}
- Pending Orders (Need Packing): ${storeStats.pendingOrdersCount}
- Packed Orders (Ready for Delivery): ${storeStats.packedOrdersCount}
- Active Products: ${storeStats.activeProductsCount}
- Out of Stock Products: ${storeStats.outOfStockCount}

Order Status & Fulfillment Rules:
1. Completed orders have status === 'delivered' and contribute to revenue.
2. Orders with status === 'pending' that have NOT yet been packed have pending status and NOT all items marked as packed in their items array.
3. Orders with status === 'pending' where EVERY item has 'is_packed: true' are considered "Packed" and are ready to be marked as delivered.
4. Setting order status to 'packed' in the database is NOT supported due to schema constraints; we use the implicit checklist method described above instead.

Products details: ${JSON.stringify(products)}
10 Most Recent Orders details: ${JSON.stringify(recentOrdersForLlm)}

Use these exact metrics to answer the owner's questions. Do NOT perform your own math or calculations on the orders list for the high-level metrics since the metrics above are the absolute source of truth.
You MUST respond with a valid JSON object matching this exact schema:
{
  "insight": "A brief, friendly, actionable paragraph analyzing the data. Speak directly to the owner, citing their exact revenue, pending orders, or stock counts where appropriate.",
  "chart": {
    "type": "bar",
    "data": [ { "label": "String", "value": 123, "color": "#HexCode" } ]
  }
}
If the prompt doesn't naturally fit a chart, construct a relevant chart anyway (e.g. products by category, recent order totals, or revenue breakdown). 
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
