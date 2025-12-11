import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

declare global {
    interface Window {
        snap: any;
    }
}

export function usePayment() {
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const initiatePayment = async (orderId: string) => {
        return initiateMultiplePayment([orderId]);
    };

    const initiateMultiplePayment = async (orderIds: string[]) => {
        setIsProcessing(true);

        try {
            // Get current session
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                throw new Error('User not authenticated');
            }

            // Call Edge Function to create payment
            const { data, error } = await supabase.functions.invoke('create-payment', {
                body: { orderIds },
            });

            if (error) throw error;

            if (!data.success) {
                throw new Error(data.error || 'Failed to create payment');
            }

            return {
                snapToken: data.snapToken,
                redirectUrl: data.redirectUrl,
                orderIds: data.orderIds,
                totalAmount: data.totalAmount,
            };
        } catch (error: any) {
            console.error('Payment initiation error:', error);
            toast({
                title: 'Error',
                description: error.message || 'Gagal membuat pembayaran',
                variant: 'destructive',
            });
            return null;
        } finally {
            setIsProcessing(false);
        }
    };

    const openPaymentModal = (snapToken: string, onSuccess?: () => void, onPending?: () => void, onError?: () => void) => {
        if (!window.snap) {
            toast({
                title: 'Error',
                description: 'Midtrans Snap belum dimuat. Silakan refresh halaman.',
                variant: 'destructive',
            });
            return;
        }

        window.snap.pay(snapToken, {
            onSuccess: (result: any) => {
                console.log('Payment success:', result);
                toast({
                    title: 'Pembayaran Berhasil',
                    description: 'Pesanan Anda telah dibayar',
                });
                onSuccess?.();
            },
            onPending: (result: any) => {
                console.log('Payment pending:', result);
                toast({
                    title: 'Pembayaran Pending',
                    description: 'Menunggu konfirmasi pembayaran',
                });
                onPending?.();
            },
            onError: (result: any) => {
                console.log('Payment error:', result);
                toast({
                    title: 'Pembayaran Gagal',
                    description: 'Terjadi kesalahan saat memproses pembayaran',
                    variant: 'destructive',
                });
                onError?.();
            },
            onClose: () => {
                console.log('Payment modal closed');
            },
        });
    };

    return {
        initiatePayment,
        initiateMultiplePayment,
        openPaymentModal,
        isProcessing,
    };
}
