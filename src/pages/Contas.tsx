import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, RefreshCw, Building2, Pencil, Trash2, CheckCircle2, Clock, AlertCircle, Upload, FileText, Wallet, Zap, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { ConnectBankButton } from "@/components/accounts/ConnectBankButton";
import { openFinanceService } from "@/services/openFinance";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Declare Pluggy global type
declare global {
  interface Window {
    PluggyConnect: any;
  }
}

interface ContaBancaria {
  id: string;
  nome_banco: string;
  banco: string | null;
  tipo_conta: string | null;
  agencia: string | null;
  conta: string | null;
  digito: string | null;
  numero_conta: string | null;
  saldo_atual: number | null;
  saldo_inicial: number | null;
  data_abertura: string | null;
  ultima_sincronizacao: string | null;
  ativo: boolean | null;
  pluggy_item_id: string | null;
  pluggy_connector_id: string | null;
  pluggy_account_id: string | null;
  auto_sync: boolean | null;
  is_credit_card: boolean | null;
  closing_day: number | null;
  due_day: number | null;
}

interface DDABoleto {
  id: string;
  bankId: string;
  beneficiary: string;
  value: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  barcode?: string;
}

// Mock data removed - using real data from database

export default function Contas() {
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDDADialog, setShowDDADialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contaToDelete, setContaToDelete] = useState<string | null>(null);
  const [ddaBoletos, setDDABoletos] = useState<DDABoleto[]>([]);
  const [addStep, setAddStep] = useState(1);
  const [editingConta, setEditingConta] = useState<ContaBancaria | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [loadingPluggy, setLoadingPluggy] = useState(false);
  const [newAccount, setNewAccount] = useState({
    nome_banco: '',
    banco: '',
    tipo_conta: '',
    agencia: '',
    conta: '',
    digito: '',
    numero_conta: '',
    saldo_inicial: '',
    integrationType: 'manual' as 'api' | 'manual' | 'file',
    provider: '',
    closing_day: '',
    due_day: ''
  });
  const [selectedDDAAccount, setSelectedDDAAccount] = useState<string>('');
  const [loadingDDA, setLoadingDDA] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncingAccount, setSyncingAccount] = useState<ContaBancaria | null>(null);
  const [syncDateFrom, setSyncDateFrom] = useState('');
  const [syncDateTo, setSyncDateTo] = useState('');

  useEffect(() => {
    loadContas();
    loadDDABoletos();

    // Setup realtime subscription
    const channel = supabase
      .channel('contas_bancarias_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contas_bancarias'
        },
        () => {
          loadContas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadContas = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContas((data as any[]) || []);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as contas bancárias.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('contas_bancarias')
        .insert({
          user_id: user.id,
          nome_banco: newAccount.nome_banco,
          banco: newAccount.banco,
          tipo_conta: newAccount.tipo_conta,
          agencia: newAccount.agencia,
          conta: newAccount.conta,
          digito: newAccount.digito,
          numero_conta: newAccount.numero_conta,
          saldo_inicial: parseFloat(newAccount.saldo_inicial) || 0,
          saldo_atual: parseFloat(newAccount.saldo_inicial) || 0,
          data_abertura: new Date().toISOString(),
          ativo: true
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conta adicionada com sucesso!",
      });

      setShowAddDialog(false);
      setAddStep(1);
      setNewAccount({
        nome_banco: '',
        banco: '',
        tipo_conta: '',
        agencia: '',
        conta: '',
        digito: '',
        numero_conta: '',
        saldo_inicial: '',
        integrationType: 'manual',
        provider: '',
        closing_day: ''
      });
      loadContas();
    } catch (error) {
      console.error('Erro ao adicionar conta:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a conta.",
        variant: "destructive"
      });
    }
  };

  const handlePluggySuccess = async (itemData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log("=== PLUGGY CONNECTION SUCCESS ===");
      console.log("Item ID:", itemData.item?.id);
      console.log("Connector:", itemData.item?.connector?.name);

      const itemId = itemData.item?.id;
      if (!itemId) {
        throw new Error('No item ID received from Pluggy');
      }

      toast({
        title: "Conexão estabelecida!",
        description: "Buscando contas bancárias...",
      });

      // Fetch accounts from Pluggy API using the itemId
      console.log(`Fetching accounts for item ${itemId} via sync function...`);

      // Call sync-transactions which will now create accounts AND fetch transactions
      toast({
        title: "Finalizando configuração...",
        description: "Importando contas e transações. Isso pode levar alguns instantes.",
      });

      const syncResult = await openFinanceService.syncItem(itemId);
      console.log("Sync result:", syncResult);

      // Refresh accounts list
      await loadContas();

      toast({
        title: "Importação concluída!",
        description: `${syncResult.imported || 0} transação(ões) importada(s).`,
      });

      setShowAddDialog(false);
      setAddStep(1);
      setNewAccount({
        nome_banco: '',
        banco: '',
        tipo_conta: '',
        agencia: '',
        conta: '',
        digito: '',
        numero_conta: '',
        saldo_inicial: '',
        integrationType: 'manual',
        provider: '',
        closing_day: ''
      });

    } catch (error: any) {
      console.error('=== ERROR IN handlePluggySuccess ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      toast({
        title: "Erro ao processar conexão",
        description: error.message || "Houve um erro ao salvar os dados da conta.",
        variant: "destructive"
      });
    }
  };

  const handleSyncAccount = async (conta: ContaBancaria) => {
    if (!conta.pluggy_item_id) {
      toast({
        title: "Conta não conectada",
        description: "Por favor, conecte a conta novamente para sincronizar.",
        variant: "destructive"
      });
      return;
    }

    // Open sync dialog for date selection
    setSyncingAccount(conta);
    // Set default dates: last 90 days to today
    const today = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(today.getDate() - 90);
    setSyncDateFrom(ninetyDaysAgo.toISOString().split('T')[0]);
    setSyncDateTo(today.toISOString().split('T')[0]);
    setShowSyncDialog(true);
  };

  const executeSyncWithDates = async () => {
    if (!syncingAccount?.pluggy_item_id) return;

    setSyncing(syncingAccount.id);
    setShowSyncDialog(false);

    try {
      const options: { from?: string, to?: string } = {};
      if (syncDateFrom) options.from = syncDateFrom;
      if (syncDateTo) options.to = syncDateTo;

      const data = await openFinanceService.syncItem(syncingAccount.pluggy_item_id, options);

      toast({
        title: "Sincronização concluída",
        description: `${data.imported} transações importadas, ${data.skipped} ignoradas (duplicadas)`,
      });

      loadContas();
    } catch (error: any) {
      console.error('Erro ao sincronizar:', error);

      const errorMessage = error.message || '';

      if (errorMessage.includes('ITEM_NEEDS_MFA') || errorMessage.includes('ITEM_LOGIN_ERROR')) {
        toast({
          title: "Ação Necessária",
          description: "O banco solicitou uma atualização de segurança (MFA).",
          action: (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const token = await openFinanceService.createConnectToken(syncingAccount.pluggy_item_id);
                  const pluggyConnect = new (window as any).PluggyConnect({
                    connectToken: token,
                    includeSandbox: true,
                    onSuccess: () => {
                      toast({ title: "Conexão atualizada com sucesso!" });
                      loadContas();
                    },
                    onError: (error: any) => {
                      console.error("Pluggy Connect Error", error);
                      toast({
                        title: "Erro na conexão",
                        description: "Não foi possível atualizar a conexão.",
                        variant: "destructive"
                      });
                    },
                  });
                  pluggyConnect.init();
                } catch (err) {
                  console.error("Error initializing Pluggy Connect", err);
                }
              }}
            >
              Atualizar Conexão
            </Button>
          ),
          duration: 10000,
        });
      } else {
        toast({
          title: "Erro na sincronização",
          description: "Não foi possível sincronizar a conta. Tente novamente mais tarde.",
          variant: "destructive"
        });
      }
    } finally {
      setSyncing(null);
      setSyncingAccount(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncing('all');

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      // Get all accounts with Pluggy integration
      const pluggyAccounts = contas.filter(c => c.pluggy_item_id && c.auto_sync);

      if (pluggyAccounts.length === 0) {
        toast({
          title: "Nenhuma conta para sincronizar",
          description: "Conecte contas via Pluggy para usar sincronização automática",
          variant: "destructive"
        });
        setSyncing(null);
        return;
      }

      // Sync each account
      for (const conta of pluggyAccounts) {
        try {
          console.log(`Syncing account: ${conta.nome_banco} (item: ${conta.pluggy_item_id})`);

          const result = await openFinanceService.syncItem(conta.pluggy_item_id);

          console.log(`Sync result for ${conta.nome_banco}:`, result);
          successCount++;
        } catch (error: any) {
          console.error(`Error syncing ${conta.nome_banco}:`, error);
          errorCount++;
          errors.push(`${conta.nome_banco}: ${error.message}`);
        }
      }

      // Show results
      if (errorCount === 0) {
        toast({
          title: "✅ Sincronização concluída",
          description: `${successCount} conta(s) atualizada(s) com sucesso`,
        });
      } else if (successCount > 0) {
        toast({
          title: "⚠️ Sincronização parcial",
          description: `${successCount} sucesso, ${errorCount} erro(s). Veja o console para detalhes.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "❌ Erro na sincronização",
          description: `Falha ao sincronizar ${errorCount} conta(s). Verifique as conexões.`,
          variant: "destructive",
        });
      }

      // Reload accounts to refresh balances
      await loadContas();
    } catch (error: any) {
      console.error('Error in handleSyncAll:', error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!contaToDelete) return;

    try {
      const { error } = await supabase
        .from('contas_bancarias')
        .delete()
        .eq('id', contaToDelete);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conta excluída com sucesso",
      });

      setDeleteDialogOpen(false);
      setContaToDelete(null);
      loadContas();
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a conta",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (conta: ContaBancaria) => {
    const daysSinceSync = conta.ultima_sincronizacao
      ? Math.floor((Date.now() - new Date(conta.ultima_sincronizacao).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceSync < 1) {
      return <Badge className="bg-emerald-500 hover:bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" />Conectado</Badge>;
    } else if (daysSinceSync < 7) {
      return <Badge className="bg-amber-400 hover:bg-amber-500"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
    } else {
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Erro</Badge>;
    }
  };

  const getStatusBadgeBoleto = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-400 hover:bg-amber-500">Pendente</Badge>;
      case 'paid':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Pago</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Vencido</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelado</Badge>;
      default:
        return null;
    }
  };

  const loadDDABoletos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('dda_boletos')
        .select('*')
        .eq('user_id', user.id)
        .order('vencimento', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Map DB boletos to UI format
        const mappedBoletos: DDABoleto[] = (data as any[]).map(b => ({
          id: b.id,
          bankId: b.conta_bancaria_id || '',
          beneficiary: b.beneficiario || 'Desconhecido',
          value: Number(b.valor),
          dueDate: new Date(b.vencimento),
          status: b.status as any,
          barcode: b.codigo_barras
        }));
        setDDABoletos(mappedBoletos);
      } else {
        // Keep mock data if no real data (or clear it if you prefer)
        // For now, let's clear mock data if we are in production mode, but keep it for demo if empty?
        // Let's just set to empty if no data found to avoid confusion.
        setDDABoletos([]);
      }
    } catch (error) {
      console.error('Erro ao carregar boletos DDA:', error);
    }
  };

  const handleEnableDDA = async () => {
    if (!selectedDDAAccount) return;

    setLoadingDDA(true);
    try {
      await openFinanceService.enableDDA(selectedDDAAccount);
      toast({
        title: "DDA Habilitado!",
        description: "A solicitação foi enviada. A sincronização de boletos ocorrerá em breve.",
      });
      setShowDDADialog(false);

      // Trigger sync immediately
      await openFinanceService.syncItem(selectedDDAAccount);
      loadDDABoletos();

    } catch (error: any) {
      console.error('Erro ao habilitar DDA:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível habilitar o DDA.",
        variant: "destructive"
      });
    } finally {
      setLoadingDDA(false);
    }
  };

  const handleDeleteBoleto = async (boletoId: string) => {
    try {
      const { error } = await supabase
        .from('dda_boletos')
        .delete()
        .eq('id', boletoId);

      if (error) throw error;

      toast({
        title: "Boleto excluído",
        description: "O boleto foi removido com sucesso.",
      });

      loadDDABoletos();
    } catch (error) {
      console.error('Erro ao excluir boleto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o boleto.",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (value: number | null) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return 'Nunca';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contas Bancárias</h1>
          <p className="text-muted-foreground">Gerencie suas contas e sincronize transações</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSyncAll}
            disabled={syncing === 'all'}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing === 'all' ? 'animate-spin' : ''}`} />
            Atualizar Todas
          </Button>
          <ConnectBankButton onConnect={loadContas} onItemConnected={handlePluggySuccess} />
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600">
                <Plus className="w-4 h-4 mr-2" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Adicionar Conta Bancária</DialogTitle>
                <DialogDescription>
                  Etapa {addStep} de 2
                </DialogDescription>
              </DialogHeader>

              {addStep === 1 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome_banco">Nome/Apelido da Conta</Label>
                    <Input
                      id="nome_banco"
                      placeholder="Ex: Conta Principal BB"
                      value={newAccount.nome_banco}
                      onChange={(e) => setNewAccount({ ...newAccount, nome_banco: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="banco">Banco</Label>
                      <Input
                        id="banco"
                        placeholder="Ex: Banco do Brasil"
                        value={newAccount.banco}
                        onChange={(e) => setNewAccount({ ...newAccount, banco: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipo_conta">Tipo de Conta</Label>
                      <Select
                        value={newAccount.tipo_conta}
                        onValueChange={(value) => setNewAccount({ ...newAccount, tipo_conta: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="corrente">Conta Corrente</SelectItem>
                          <SelectItem value="poupanca">Conta Poupança</SelectItem>
                          <SelectItem value="carteira">Carteira Digital</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="agencia">Agência</Label>
                      <Input
                        id="agencia"
                        placeholder="1234"
                        value={newAccount.agencia}
                        onChange={(e) => setNewAccount({ ...newAccount, agencia: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="conta">Conta</Label>
                      <Input
                        id="conta"
                        placeholder="123456"
                        value={newAccount.conta}
                        onChange={(e) => setNewAccount({ ...newAccount, conta: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="digito">Dígito</Label>
                      <Input
                        id="digito"
                        placeholder="7"
                        maxLength={2}
                        value={newAccount.digito}
                        onChange={(e) => setNewAccount({ ...newAccount, digito: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="saldo_inicial">Saldo Inicial (opcional)</Label>
                    <Input
                      id="saldo_inicial"
                      type="number"
                      step="0.01"
                      placeholder="R$ 0,00"
                      value={newAccount.saldo_inicial}
                      onChange={(e) => setNewAccount({ ...newAccount, saldo_inicial: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => setAddStep(2)}
                      disabled={!newAccount.nome_banco || !newAccount.tipo_conta}
                    >
                      Próximo
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Tabs defaultValue="manual" onValueChange={(v) => setNewAccount({ ...newAccount, integrationType: v as any })}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="api">API Bancária</TabsTrigger>
                      <TabsTrigger value="file">Importar Extrato</TabsTrigger>
                      <TabsTrigger value="manual">Manual</TabsTrigger>
                    </TabsList>

                    <TabsContent value="api" className="space-y-4">
                      <div className="space-y-4">
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <Wallet className="w-5 h-5 text-primary mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm mb-1">Conexão via Pluggy</h4>
                              <p className="text-xs text-muted-foreground">
                                Conecte sua conta bancária de forma segura através da Pluggy.
                                Suas transações serão importadas automaticamente.
                              </p>
                            </div>
                          </div>
                        </div>
                        <ConnectBankButton onItemConnected={handlePluggySuccess} />
                      </div>
                    </TabsContent>

                    <TabsContent value="file" className="space-y-4">
                      <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Arraste arquivos OFX, CSV ou PDF aqui ou clique para selecionar
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="manual" className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        A conta será criada apenas com o saldo inicial. Você poderá adicionar transações manualmente depois.
                      </p>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAddStep(1)}>
                      Voltar
                    </Button>
                    <Button onClick={handleAddAccount}>
                      Finalizar
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Sync Date Range Dialog */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sincronizar Transações</DialogTitle>
            <DialogDescription>
              Selecione o intervalo de datas para importar transações
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sync_date_from">Data Inicial</Label>
              <Input
                id="sync_date_from"
                type="date"
                value={syncDateFrom}
                onChange={(e) => setSyncDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sync_date_to">Data Final</Label>
              <Input
                id="sync_date_to"
                type="date"
                value={syncDateTo}
                onChange={(e) => setSyncDateTo(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSyncDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={executeSyncWithDates}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sincronizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Conta Bancária</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_nome_banco">Nome/Apelido da Conta</Label>
              <Input
                id="edit_nome_banco"
                value={newAccount.nome_banco}
                onChange={(e) => setNewAccount({ ...newAccount, nome_banco: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_banco">Banco</Label>
                <Input
                  id="edit_banco"
                  value={newAccount.banco}
                  onChange={(e) => setNewAccount({ ...newAccount, banco: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_tipo_conta">Tipo de Conta</Label>
                {editingConta?.is_credit_card ? (
                  <Input
                    id="edit_tipo_conta"
                    value="Cartão de Crédito"
                    disabled
                    className="bg-muted"
                  />
                ) : (
                  <Select
                    value={newAccount.tipo_conta}
                    onValueChange={(value) => setNewAccount({ ...newAccount, tipo_conta: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrente">Conta Corrente</SelectItem>
                      <SelectItem value="poupanca">Conta Poupança</SelectItem>
                      <SelectItem value="carteira">Carteira Digital</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {!editingConta?.is_credit_card && (
                <div className="space-y-2">
                  <Label htmlFor="edit_agencia">Agência</Label>
                  <Input
                    id="edit_agencia"
                    value={newAccount.agencia}
                    onChange={(e) => setNewAccount({ ...newAccount, agencia: e.target.value })}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit_conta">
                  {editingConta?.is_credit_card ? 'Final do Cartão' : 'Conta'}
                </Label>
                <Input
                  id="edit_conta"
                  value={newAccount.conta}
                  onChange={(e) => setNewAccount({ ...newAccount, conta: e.target.value })}
                />
              </div>
              {!editingConta?.is_credit_card && (
                <div className="space-y-2">
                  <Label htmlFor="edit_digito">Dígito</Label>
                  <Input
                    id="edit_digito"
                    maxLength={2}
                    value={newAccount.digito}
                    onChange={(e) => setNewAccount({ ...newAccount, digito: e.target.value })}
                  />
                </div>
              )}
            </div>

            {/* Closing Day for Credit Cards */}
            {editingConta?.is_credit_card && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_closing_day">Dia de Fechamento (1-31)</Label>
                    <Input
                      id="edit_closing_day"
                      type="number"
                      min="1"
                      max="31"
                      placeholder="Ex: 10"
                      value={newAccount.closing_day}
                      onChange={(e) => setNewAccount({ ...newAccount, closing_day: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_due_day">Dia de Vencimento (1-31)</Label>
                    <Input
                      id="edit_due_day"
                      type="number"
                      min="1"
                      max="31"
                      placeholder="Ex: 15"
                      value={newAccount.due_day}
                      onChange={(e) => setNewAccount({ ...newAccount, due_day: e.target.value })}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Define até qual dia do mês as transações do cartão serão importadas
                </p>
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={async () => {
                if (!editingConta) return;
                try {
                  const { error } = await supabase
                    .from('contas_bancarias')
                    .update({
                      nome_banco: newAccount.nome_banco,
                      banco: newAccount.banco,
                      tipo_conta: newAccount.tipo_conta,
                      agencia: newAccount.agencia,
                      conta: newAccount.conta,
                      digito: newAccount.digito,
                      closing_day: newAccount.closing_day ? parseInt(newAccount.closing_day) : null,
                      due_day: newAccount.due_day ? parseInt(newAccount.due_day) : null,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', editingConta.id);

                  if (error) throw error;

                  toast({
                    title: "Sucesso",
                    description: "Conta atualizada com sucesso!",
                  });

                  setShowEditDialog(false);
                  setEditingConta(null);
                  loadContas();
                } catch (error) {
                  console.error('Erro ao atualizar conta:', error);
                  toast({
                    title: "Erro",
                    description: "Não foi possível atualizar a conta.",
                    variant: "destructive"
                  });
                }
              }}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contas Grid */}
      {
        contas.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">Contas Bancárias</h1>
                <p className="text-muted-foreground">
                  Gerencie suas contas e integrações bancárias
                </p>
              </div>
              <div className="flex gap-2">
                <ConnectBankButton onConnect={loadContas} onItemConnected={handlePluggySuccess} />
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Conta Manual
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Bank Accounts Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Contas Bancárias
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {contas.filter(c => !c.is_credit_card).map((conta) => (
                  <Card key={conta.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-base font-semibold truncate" title={conta.nome_banco}>
                              {conta.nome_banco}
                            </CardTitle>
                            <CardDescription className="capitalize text-xs truncate">
                              {conta.banco || conta.tipo_conta?.replace('_', ' ')}
                            </CardDescription>
                            {conta.agencia && conta.conta && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Ag: {conta.agencia} • Cc: {conta.conta}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getStatusBadge(conta)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Saldo Atual</p>
                          <p className={`text-lg font-bold ${conta.saldo_atual && conta.saldo_atual < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                            {formatCurrency(conta.saldo_atual)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-[10px] text-muted-foreground">
                            {conta.ultima_sincronizacao ? `Atualizado: ${formatDateTime(conta.ultima_sincronizacao)}` : 'Nunca sincronizado'}
                          </span>
                          <div className="flex gap-1">
                            {conta.pluggy_item_id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleSyncAccount(conta)}
                                disabled={syncing === conta.id}
                                title="Sincronizar"
                              >
                                <RefreshCw className={`h-3 w-3 ${syncing === conta.id ? 'animate-spin' : ''}`} />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                setEditingConta(conta);
                                setNewAccount({
                                  ...newAccount,
                                  nome_banco: conta.nome_banco,
                                  banco: conta.banco || '',
                                  tipo_conta: conta.tipo_conta || '',
                                  agencia: conta.agencia || '',
                                  conta: conta.conta || '',
                                  digito: conta.digito || '',
                                  numero_conta: conta.numero_conta || '',
                                  saldo_inicial: conta.saldo_inicial?.toString() || '',
                                });
                                setShowEditDialog(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => {
                                setContaToDelete(conta.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Credit Cards Section */}
            {contas.some(c => c.is_credit_card) && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 mt-8">
                  <Wallet className="h-5 w-5" />
                  Cartões de Crédito
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {contas.filter(c => c.is_credit_card).map((conta) => (
                    <Card key={conta.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                              <Wallet className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="text-base font-semibold truncate" title={conta.nome_banco}>
                                {conta.nome_banco}
                              </CardTitle>
                              <CardDescription className="capitalize text-xs truncate">
                                {conta.banco || 'Cartão de Crédito'}
                              </CardDescription>
                              {conta.numero_conta && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Final: {conta.numero_conta.slice(-4)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {getStatusBadge(conta)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Fatura Atual</p>
                            <p className="text-lg font-bold text-destructive">
                              {formatCurrency(Math.abs(conta.saldo_atual || 0))}
                            </p>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-[10px] text-muted-foreground">
                              {conta.ultima_sincronizacao ? `Atualizado: ${formatDateTime(conta.ultima_sincronizacao)}` : 'Nunca sincronizado'}
                            </span>
                            <div className="flex gap-1">
                              {conta.pluggy_item_id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleSyncAccount(conta)}
                                  disabled={syncing === conta.id}
                                  title="Sincronizar"
                                >
                                  <RefreshCw className={`h-3 w-3 ${syncing === conta.id ? 'animate-spin' : ''}`} />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  setEditingConta(conta);
                                  setNewAccount({
                                    ...newAccount,
                                    nome_banco: conta.nome_banco,
                                    banco: conta.banco || '',
                                    tipo_conta: conta.tipo_conta || '',
                                    agencia: conta.agencia || '',
                                    conta: conta.conta || '',
                                    digito: conta.digito || '',
                                    numero_conta: conta.numero_conta || '',
                                    saldo_inicial: conta.saldo_inicial?.toString() || '',
                                    closing_day: conta.closing_day?.toString() || '',
                                    due_day: conta.due_day?.toString() || '',
                                  });
                                  setShowEditDialog(true);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setContaToDelete(conta.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      }

      {/* DDA Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Boletos DDA</CardTitle>
                <CardDescription>Gerencie seus boletos automaticamente</CardDescription>
              </div>
            </div>
            <Dialog open={showDDADialog} onOpenChange={setShowDDADialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Conectar DDA
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Conectar DDA</DialogTitle>
                  <DialogDescription>
                    Conecte-se ao sistema DDA do seu banco para receber boletos automaticamente
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Selecione o Banco</Label>
                    <Select value={selectedDDAAccount} onValueChange={setSelectedDDAAccount}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha a conta" />
                      </SelectTrigger>
                      <SelectContent>
                        {contas.filter(c => c.pluggy_item_id).map((conta) => (
                          <SelectItem key={conta.id} value={conta.pluggy_item_id || ''}>
                            {conta.nome_banco} - {conta.numero_conta}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleEnableDDA}
                    disabled={loadingDDA || !selectedDDAAccount}
                  >
                    {loadingDDA ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Autorizar Conexão
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beneficiário</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ddaBoletos.map((boleto) => (
                <TableRow key={boleto.id}>
                  <TableCell className="font-medium">{boleto.beneficiary}</TableCell>
                  <TableCell>{formatCurrency(boleto.value)}</TableCell>
                  <TableCell>{formatDate(boleto.dueDate)}</TableCell>
                  <TableCell>{getStatusBadgeBoleto(boleto.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" title="Ver detalhes">
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteBoleto(boleto.id)}
                        className="text-destructive hover:text-destructive"
                        title="Excluir boleto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá todas as transações vinculadas a esta conta. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
