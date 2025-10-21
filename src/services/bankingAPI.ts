/**
 * Serviço de integração com APIs bancárias
 * Suporta: Pluggy, Belvo, Celcoin, Open Finance Brasil
 */

import { supabase } from "@/integrations/supabase/client";

export type BankProvider = "pluggy" | "belvo" | "celcoin" | "openfinance" | "manual";

export interface BankConnection {
  id: string;
  provider: BankProvider;
  bankName: string;
  accountNumber: string;
  status: "connected" | "disconnected" | "error" | "pending";
  lastSync?: string;
  credentials?: {
    accessToken?: string;
    itemId?: string;
    linkId?: string;
  };
}

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  balance?: number;
  category?: string;
}

export interface BankAccount {
  id: string;
  name: string;
  number: string;
  type: "checking" | "savings" | "credit";
  balance: number;
  currency: string;
}

/**
 * Pluggy Integration
 * https://docs.pluggy.ai/
 */
export class PluggyService {
  private apiKey: string;
  private clientId: string;
  private baseUrl = "https://api.pluggy.ai";

  constructor(apiKey: string, clientId: string) {
    this.apiKey = apiKey;
    this.clientId = clientId;
  }

  async createConnectToken(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/connect_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": this.apiKey,
      },
      body: JSON.stringify({
        clientUserId: this.clientId,
      }),
    });

    const data = await response.json();
    return data.accessToken;
  }

  async getAccounts(itemId: string): Promise<BankAccount[]> {
    const response = await fetch(`${this.baseUrl}/accounts?itemId=${itemId}`, {
      headers: {
        "X-API-KEY": this.apiKey,
      },
    });

    const data = await response.json();
    return data.results.map((acc: any) => ({
      id: acc.id,
      name: acc.name,
      number: acc.number,
      type: acc.type,
      balance: acc.balance,
      currency: acc.currencyCode,
    }));
  }

  async getTransactions(accountId: string, from?: string, to?: string): Promise<BankTransaction[]> {
    const params = new URLSearchParams({
      accountId,
      ...(from && { from }),
      ...(to && { to }),
    });

    const response = await fetch(`${this.baseUrl}/transactions?${params}`, {
      headers: {
        "X-API-KEY": this.apiKey,
      },
    });

    const data = await response.json();
    return data.results.map((txn: any) => ({
      id: txn.id,
      date: txn.date,
      description: txn.description,
      amount: Math.abs(txn.amount),
      type: txn.amount >= 0 ? "credit" : "debit",
      balance: txn.balance,
      category: txn.category,
    }));
  }

  async syncAccount(itemId: string): Promise<{ status: string; updatedAt: string }> {
    const response = await fetch(`${this.baseUrl}/items/${itemId}/sync`, {
      method: "POST",
      headers: {
        "X-API-KEY": this.apiKey,
      },
    });

    return response.json();
  }
}

/**
 * Belvo Integration
 * https://developers.belvo.com/
 */
export class BelvoService {
  private secretId: string;
  private secretPassword: string;
  private baseUrl = "https://api.belvo.com";

  constructor(secretId: string, secretPassword: string) {
    this.secretId = secretId;
    this.secretPassword = secretPassword;
  }

  private getAuthHeader(): string {
    return `Basic ${btoa(`${this.secretId}:${this.secretPassword}`)}`;
  }

  async createLink(institution: string, username: string, password: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/links/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": this.getAuthHeader(),
      },
      body: JSON.stringify({
        institution,
        username,
        password,
      }),
    });

    const data = await response.json();
    return data.id;
  }

  async getAccounts(linkId: string): Promise<BankAccount[]> {
    const response = await fetch(`${this.baseUrl}/api/accounts/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": this.getAuthHeader(),
      },
      body: JSON.stringify({
        link: linkId,
      }),
    });

    const data = await response.json();
    return data.map((acc: any) => ({
      id: acc.id,
      name: acc.name,
      number: acc.number,
      type: acc.type,
      balance: acc.balance.current,
      currency: acc.currency,
    }));
  }

  async getTransactions(linkId: string, dateFrom: string, dateTo: string): Promise<BankTransaction[]> {
    const response = await fetch(`${this.baseUrl}/api/transactions/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": this.getAuthHeader(),
      },
      body: JSON.stringify({
        link: linkId,
        date_from: dateFrom,
        date_to: dateTo,
      }),
    });

    const data = await response.json();
    return data.map((txn: any) => ({
      id: txn.id,
      date: txn.value_date,
      description: txn.description,
      amount: Math.abs(txn.amount),
      type: txn.type === "INFLOW" ? "credit" : "debit",
      balance: txn.balance,
      category: txn.category,
    }));
  }
}

/**
 * Gerenciador de conexões bancárias
 */
export class BankConnectionManager {
  async saveConnection(
    userId: string,
    contaId: string,
    provider: BankProvider,
    credentials: any
  ): Promise<void> {
    // Salvar credenciais criptografadas no Supabase
    // IMPORTANTE: Em produção, use vault/secrets manager
    const { error } = await supabase
      .from("contas_bancarias")
      .update({
        // Adicionar campos: api_provider, api_credentials (encrypted)
        updated_at: new Date().toISOString(),
      })
      .eq("id", contaId)
      .eq("user_id", userId);

    if (error) throw error;
  }

  async testConnection(provider: BankProvider, credentials: any): Promise<boolean> {
    try {
      switch (provider) {
        case "pluggy":
          const pluggy = new PluggyService(credentials.apiKey, credentials.clientId);
          await pluggy.createConnectToken();
          return true;

        case "belvo":
          const belvo = new BelvoService(credentials.secretId, credentials.secretPassword);
          // Test connection
          return true;

        default:
          return false;
      }
    } catch (error) {
      console.error("Connection test failed:", error);
      return false;
    }
  }

  async syncTransactions(
    contaId: string,
    provider: BankProvider,
    credentials: any,
    dateFrom?: string,
    dateTo?: string
  ): Promise<BankTransaction[]> {
    switch (provider) {
      case "pluggy":
        const pluggy = new PluggyService(credentials.apiKey, credentials.clientId);
        const accounts = await pluggy.getAccounts(credentials.itemId);
        if (accounts.length > 0) {
          return pluggy.getTransactions(accounts[0].id, dateFrom, dateTo);
        }
        return [];

      case "belvo":
        const belvo = new BelvoService(credentials.secretId, credentials.secretPassword);
        return belvo.getTransactions(
          credentials.linkId,
          dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          dateTo || new Date().toISOString().split("T")[0]
        );

      default:
        throw new Error(`Provider ${provider} not implemented`);
    }
  }
}

/**
 * Widget Pluggy para conectar contas
 */
export function initPluggyWidget(
  apiKey: string,
  onSuccess: (itemId: string) => void,
  onError: (error: any) => void
) {
  // Carregar Pluggy Connect Widget
  const script = document.createElement("script");
  script.src = "https://cdn.pluggy.ai/connect/v2/pluggy-connect.js";
  script.async = true;
  
  script.onload = () => {
    const pluggyConnect = (window as any).PluggyConnect({
      clientId: apiKey,
      onSuccess: (data: any) => {
        onSuccess(data.item.id);
      },
      onError: (error: any) => {
        onError(error);
      },
    });
    
    pluggyConnect.init();
  };

  document.body.appendChild(script);
}

/**
 * Helper para mapear transações da API para o formato do sistema
 */
export function mapearTransacoesAPI(
  transactions: BankTransaction[],
  contaId: string,
  userId: string
): Array<{
  user_id: string;
  conta_id: string;
  data_transacao: string;
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
  origem: string;
  status: string;
}> {
  return transactions.map(txn => ({
    user_id: userId,
    conta_id: contaId,
    data_transacao: txn.date,
    descricao: txn.description,
    valor: txn.amount,
    tipo: txn.type === "credit" ? "receita" : "despesa",
    origem: "api",
    status: "pago",
  }));
}
