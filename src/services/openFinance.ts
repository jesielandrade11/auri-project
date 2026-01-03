import { supabase } from "@/integrations/supabase/client";

export const openFinanceService = {
    async syncItem(itemId: string, options?: { from?: string, to?: string }) {
        const { data, error } = await supabase.functions.invoke('sync-transactions', {
            body: { itemId, from: options?.from, to: options?.to },
        });

        if (error) throw error;
        return data;
    },

    async createConnectToken(itemId?: string) {
        const { data, error } = await supabase.functions.invoke('create-pluggy-connect-token', {
            body: { itemId }
        });
        if (error) throw error;
        if (!data || !data.accessToken) {
            throw new Error('Failed to obtain Pluggy access token');
        }
        return data.accessToken;
    },

    async enableDDA(itemId: string) {
        const { data, error } = await supabase.functions.invoke('enable-dda', {
            body: { itemId }
        });
        if (error) throw error;
        return data;
    }
};
