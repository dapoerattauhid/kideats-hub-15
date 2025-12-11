import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId } = await req.json()

    if (!orderId) {
      throw new Error('Order ID is required')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Fetch order details
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        *,
        recipient:recipients(name, class),
        order_items(
          id,
          menu_item_id,
          quantity,
          unit_price,
          subtotal,
          menu_item:menu_items(name)
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found')
    }

    // Prepare Midtrans transaction data
    const transactionDetails = {
      order_id: order.id,
      gross_amount: order.total_amount,
    }

    const itemDetails = order.order_items.map((item: any) => ({
      id: item.menu_item_id,
      price: item.unit_price,
      quantity: item.quantity,
      name: item.menu_item?.name || 'Menu Item',
    }))

    const customerDetails = {
      first_name: order.recipient?.name || 'Customer',
      email: 'customer@kideats.com', // You might want to get this from user profile
    }

    const midtransPayload = {
      transaction_details: transactionDetails,
      item_details: itemDetails,
      customer_details: customerDetails,
    }

    // Call Midtrans Snap API
    const midtransServerKey = Deno.env.get('MIDTRANS_SERVER_KEY')
    const isProduction = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true'
    const midtransUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

    const midtransAuth = btoa(midtransServerKey + ':')

    const midtransResponse = await fetch(midtransUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${midtransAuth}`,
      },
      body: JSON.stringify(midtransPayload),
    })

    if (!midtransResponse.ok) {
      const errorText = await midtransResponse.text()
      throw new Error(`Midtrans API error: ${errorText}`)
    }

    const midtransData = await midtransResponse.json()

    // Update order with snap token and payment URL
    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({
        snap_token: midtransData.token,
        payment_url: midtransData.redirect_url,
        transaction_id: order.id,
      })
      .eq('id', orderId)

    if (updateError) {
      throw new Error('Failed to update order with payment data')
    }

    return new Response(
      JSON.stringify({
        success: true,
        snapToken: midtransData.token,
        redirectUrl: midtransData.redirect_url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
