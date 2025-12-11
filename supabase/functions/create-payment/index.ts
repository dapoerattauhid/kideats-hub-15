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
    const { orderId, orderIds } = await req.json()

    // Support both single orderId and multiple orderIds
    const idsToProcess = orderIds || (orderId ? [orderId] : [])

    if (idsToProcess.length === 0) {
      throw new Error('Order ID(s) required')
    }

    console.log('Processing payment for orders:', idsToProcess)

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

    // Fetch all orders
    const { data: orders, error: orderError } = await supabaseClient
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
      .in('id', idsToProcess)
      .eq('status', 'pending')

    if (orderError || !orders || orders.length === 0) {
      console.error('Order fetch error:', orderError)
      throw new Error('Orders not found or not pending')
    }

    console.log('Found orders:', orders.length)

    // Calculate total amount and combine items
    let totalAmount = 0
    const allItemDetails: any[] = []
    const orderIdsStr = orders.map(o => o.id.slice(0, 8)).join('-')

    orders.forEach((order: any) => {
      totalAmount += order.total_amount
      order.order_items.forEach((item: any) => {
        allItemDetails.push({
          id: item.menu_item_id,
          price: item.unit_price,
          quantity: item.quantity,
          name: `${item.menu_item?.name || 'Menu Item'} (${order.recipient?.name || 'Customer'})`,
        })
      })
    })

    // Create combined order ID for Midtrans
    const combinedOrderId = orders.length > 1 
      ? `BULK-${Date.now()}-${orderIdsStr}`
      : orders[0].id

    const transactionDetails = {
      order_id: combinedOrderId,
      gross_amount: totalAmount,
    }

    const customerDetails = {
      first_name: orders[0].recipient?.name || 'Customer',
      email: 'customer@kideats.com',
    }

    const midtransPayload = {
      transaction_details: transactionDetails,
      item_details: allItemDetails,
      customer_details: customerDetails,
      custom_field1: JSON.stringify(idsToProcess), // Store original order IDs
    }

    console.log('Midtrans payload:', JSON.stringify(midtransPayload))

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
      console.error('Midtrans error:', errorText)
      throw new Error(`Midtrans API error: ${errorText}`)
    }

    const midtransData = await midtransResponse.json()
    console.log('Midtrans response:', midtransData)

    // Update all orders with snap token and payment URL
    for (const order of orders) {
      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({
          snap_token: midtransData.token,
          payment_url: midtransData.redirect_url,
          transaction_id: combinedOrderId,
        })
        .eq('id', order.id)

      if (updateError) {
        console.error('Failed to update order:', order.id, updateError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        snapToken: midtransData.token,
        redirectUrl: midtransData.redirect_url,
        orderIds: idsToProcess,
        totalAmount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Payment error:', errorMessage)
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
