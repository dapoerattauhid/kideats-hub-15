// Version 4 - Bulk payment support with orderIds array - forced redeploy
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('[V4] Create payment function called')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('[V4] Received body:', JSON.stringify(body))

    // Support both single orderId and multiple orderIds
    let orderIds: string[] = []
    
    if (body.orderIds && Array.isArray(body.orderIds)) {
      orderIds = body.orderIds
      console.log('[V4] Using orderIds array:', orderIds)
    } else if (body.orderId) {
      orderIds = [body.orderId]
      console.log('[V4] Using single orderId:', body.orderId)
    }
    
    console.log('[V4] Final orderIds to process:', orderIds)

    if (orderIds.length === 0) {
      console.log('[V4] No order IDs provided')
      throw new Error('Order ID is required')
    }

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
    console.log('[V4] Fetching orders from database...')
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
      .in('id', orderIds)

    console.log('[V4] Fetched orders count:', orders?.length, 'Error:', orderError?.message)

    if (orderError || !orders || orders.length === 0) {
      throw new Error('Orders not found')
    }

    // Calculate combined total
    const totalAmount = orders.reduce((sum, order) => sum + order.total_amount, 0)
    console.log('[V4] Total amount:', totalAmount)
    
    // Create combined order ID for Midtrans
    const combinedOrderId = orderIds.length > 1 
      ? `BULK-${Date.now()}-${orderIds.length}` 
      : orders[0].id

    console.log('[V4] Combined order ID:', combinedOrderId)

    // Combine all items from all orders
    const allItems: any[] = []
    orders.forEach(order => {
      if (order.order_items) {
        order.order_items.forEach((item: any) => {
          allItems.push({
            id: item.menu_item_id,
            price: Math.round(item.unit_price),
            quantity: item.quantity,
            name: item.menu_item?.name || 'Menu Item',
          })
        })
      }
    })

    console.log('[V4] Total items:', allItems.length)

    const transactionDetails = {
      order_id: combinedOrderId,
      gross_amount: Math.round(totalAmount),
    }

    const customerDetails = {
      first_name: orders[0].recipient?.name || 'Customer',
      email: 'customer@kideats.com',
    }

    const midtransPayload = {
      transaction_details: transactionDetails,
      item_details: allItems,
      customer_details: customerDetails,
    }

    console.log('[V4] Midtrans payload:', JSON.stringify(midtransPayload))

    const midtransServerKey = Deno.env.get('MIDTRANS_SERVER_KEY')
    if (!midtransServerKey) {
      throw new Error('MIDTRANS_SERVER_KEY not configured')
    }

    const isProduction = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true'
    const midtransUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

    console.log('[V4] Calling Midtrans API:', midtransUrl)

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
      console.error('[V4] Midtrans error:', errorText)
      throw new Error(`Midtrans API error: ${errorText}`)
    }

    const midtransData = await midtransResponse.json()
    console.log('[V4] Midtrans success, token:', midtransData.token)

    // Update all orders with snap token and combined transaction ID
    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({
        snap_token: midtransData.token,
        payment_url: midtransData.redirect_url,
        transaction_id: combinedOrderId,
      })
      .in('id', orderIds)

    if (updateError) {
      console.error('[V4] Update error:', updateError)
      throw new Error('Failed to update orders with payment data')
    }

    console.log('[V4] Successfully updated', orderIds.length, 'orders')

    return new Response(
      JSON.stringify({
        success: true,
        snapToken: midtransData.token,
        redirectUrl: midtransData.redirect_url,
        orderIds: orderIds,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[V4] Error:', errorMessage)
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
