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
        setIsProcessing(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                throw new Error('User not authenticated');
            }

            const { data, error } = await supabase.functions.invoke('create-payment', {
                body: { orderId },
            });

            if (error) throw error;

            if (!data.success) {
                throw new Error(data.error || 'Failed to create payment');
            }

            return {
                snapToken: data.snapToken,
                redirectUrl: data.redirectUrl,
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

    const initiateMultiplePayment = async (orderIds: string[]) => {
        setIsProcessing(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                throw new Error('User not authenticated');
            }

            console.log('Initiating bulk payment for orders:', orderIds);

            const { data, error } = await supabase.functions.invoke('create-payment', {
                body: { orderIds },
            });

            console.log('Bulk payment response:', data, error);

            if (error) throw error;

            if (!data.success) {
                throw new Error(data.error || 'Failed to create bulk payment');
            }

            return {
                snapToken: data.snapToken,
                redirectUrl: data.redirectUrl,
            };
        } catch (error: any) {
            console.error('Bulk payment initiation error:', error);
            toast({
                title: 'Error',
                description: error.message || 'Gagal membuat pembayaran bulk',
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
