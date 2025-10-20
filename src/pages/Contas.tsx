import { useState } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { Plus, RefreshCw, Building2, Pencil, Trash2, CheckCircle2, Clock, AlertCircle, Upload, FileText, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ContaBancaria {
  id: string;
  nome_banco: string;
  tipo_conta: string | null;
  numero_conta: string | null;
  saldo_atual: number | null;
  saldo_inicial: number | null;
  data_abertura: string | null;
  ultima_sincronizacao: string | null;
  ativo: boolean | null;
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

const mockDDABoletos: DDABoleto[] = [
  { id: '1', bankId: '1', beneficiary: 'Energia SA', value: 250.00, dueDate: new Date('2025-10-20'), status: 'pending' },
  { id: '2', bankId: '1', beneficiary: 'Internet Ltda', value: 120.50, dueDate: new Date('2025-10-25'), status: 'pending' },
  { id: '3', bankId: '2', beneficiary: 'Água Municipal', value: 85.30, dueDate: new Date('2025-10-05'), status: 'paid' },
  { id: '4', bankId: '2', beneficiary: 'Telefone Corp', value: 95.00, dueDate: new Date('2025-09-30'), status: 'overdue' },
  { id: '5', bankId: '3', beneficiary: 'Condomínio Res', value: 450.00, dueDate: new Date('2025-10-15'), status: 'paid' },
];

export default function Contas() {
  const { toast } = useToast();
  const { 
    contas, 
    isLoading, 
    createAccount, 
    updateAccount, 
    deleteAccount, 
    syncAccount, 
    updateSaldo,
    isCreating,
    isUpdating,
    isDeleting,
    isSyncing,
    isUpdatingSaldo
  } = useAccounts();
  
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDDADialog, setShowDDADialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contaToDelete, setContaToDelete] = useState<string | null>(null);
  const [ddaBoletos, setDDABoletos] = useState<DDABoleto[]>(mockDDABoletos);
  const [addStep, setAddStep] = useState(1);
  const [newAccount, setNewAccount] = useState({
    nome_banco: '',
    tipo_conta: '',
    numero_conta: '',
    saldo_inicial: '',
    integrationType: 'manual' as 'api' | 'manual' | 'file',
    provider: ''
  });


  const handleAddAccount = async () => {
    const dadosConta = {
      nome_banco: newAccount.nome_banco,
      tipo_conta: newAccount.tipo_conta,
      numero_conta: newAccount.numero_conta,
      saldo_inicial: parseFloat(newAccount.saldo_inicial) || 0,
      saldo_atual: parseFloat(newAccount.saldo_inicial) || 0,
      data_abertura: new Date().toISOString(),
    };

    createAccount(dadosConta);
    
    setShowAddDialog(false);
    setAddStep(1);
    setNewAccount({
      nome_banco: '',
      tipo_conta: '',
      numero_conta: '',
      saldo_inicial: '',
      integrationType: 'manual',
      provider: ''
    });
  };

  const handleSyncAccount = async (id: string) => {
    setSyncing(id);
    syncAccount(id);
    setTimeout(() => setSyncing(null), 2000);
  };

  const handleSyncAll = () => {
    setSyncing('all');
    setTimeout(() => {
      toast({
        title: "Sincronização concluída",
        description: "Todas as contas foram atualizadas",
      });
      setSyncing(null);
      loadContas();
    }, 2000);
  };

  const handleDeleteAccount = async () => {
    if (!contaToDelete) return;
    deleteAccount(contaToDelete);
    setDeleteDialogOpen(false);
    setContaToDelete(null);
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

  if (isLoading) {
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
                    <Label htmlFor="nome_banco">Nome do Banco</Label>
                    <Input
                      id="nome_banco"
                      placeholder="Ex: Banco do Brasil"
                      value={newAccount.nome_banco}
                      onChange={(e) => setNewAccount({ ...newAccount, nome_banco: e.target.value })}
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
                  <div className="space-y-2">
                    <Label htmlFor="numero_conta">Número da Conta</Label>
                    <Input
                      id="numero_conta"
                      placeholder="Ex: 12345-6"
                      value={newAccount.numero_conta}
                      onChange={(e) => setNewAccount({ ...newAccount, numero_conta: e.target.value })}
                    />
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
                      <div className="space-y-2">
                        <Label>Provedor de Integração</Label>
                        <Select
                          value={newAccount.provider}
                          onValueChange={(value) => setNewAccount({ ...newAccount, provider: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o provedor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pluggy">Pluggy</SelectItem>
                            <SelectItem value="belvo">Belvo</SelectItem>
                            <SelectItem value="celcoin">Celcoin</SelectItem>
                            <SelectItem value="openfinance">Open Finance Brasil</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button className="w-full" disabled={!newAccount.provider}>
                        Conectar ao Banco
                      </Button>
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

      {/* Contas Grid */}
      {contas.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">Nenhuma conta cadastrada ainda</h3>
          <p className="text-muted-foreground mb-6">
            Conecte sua primeira conta bancária para começar!
          </p>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Conta
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contas.map((conta) => (
            <Card key={conta.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{conta.nome_banco}</CardTitle>
                      <CardDescription className="capitalize">
                        {conta.tipo_conta?.replace('_', ' ')}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(conta)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(conta.saldo_atual)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Última sincronização: {formatDateTime(conta.ultima_sincronizacao)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleSyncAccount(conta.id)}
                    disabled={syncing === conta.id}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${syncing === conta.id ? 'animate-spin' : ''}`} />
                    Sincronizar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setContaToDelete(conta.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha a conta" />
                      </SelectTrigger>
                      <SelectContent>
                        {contas.map((conta) => (
                          <SelectItem key={conta.id} value={conta.id}>
                            {conta.nome_banco} - {conta.numero_conta}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full">Autorizar Conexão</Button>
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
                      <Button variant="outline" size="sm">
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
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
    </div>
  );
}
