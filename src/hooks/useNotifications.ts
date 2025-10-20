import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Notificacao {
  id: string;
  tipo: "info" | "warning" | "error" | "success";
  titulo: string;
  mensagem: string;
  lida: boolean;
  data_criacao: string;
  acao?: {
    url: string;
    texto: string;
  };
}

export const useNotifications = () => {
  const { toast } = useToast();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);

  useEffect(() => {
    // Configurar subscription para notificações em tempo real
    const channel = supabase
      .channel('notificacoes_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes'
        },
        (payload) => {
          const novaNotificacao = payload.new as Notificacao;
          setNotificacoes(prev => [novaNotificacao, ...prev]);
          setNaoLidas(prev => prev + 1);
          
          // Mostrar toast para notificação importante
          if (novaNotificacao.tipo === 'error' || novaNotificacao.tipo === 'warning') {
            toast({
              title: novaNotificacao.titulo,
              description: novaNotificacao.mensagem,
              variant: novaNotificacao.tipo === 'error' ? 'destructive' : 'default',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  // Marcar notificação como lida
  const marcarComoLida = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', id);

      if (error) throw error;

      setNotificacoes(prev => 
        prev.map(n => n.id === id ? { ...n, lida: true } : n)
      );
      setNaoLidas(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  // Marcar todas como lidas
  const marcarTodasComoLidas = async () => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('lida', false);

      if (error) throw error;

      setNotificacoes(prev => 
        prev.map(n => ({ ...n, lida: true }))
      );
      setNaoLidas(0);
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
    }
  };

  // Criar notificação personalizada
  const criarNotificacao = async (notificacao: Omit<Notificacao, 'id' | 'data_criacao' | 'lida'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from('notificacoes')
        .insert({
          ...notificacao,
          user_id: user.id,
          lida: false,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
    }
  };

  // Notificações específicas do sistema financeiro
  const notificarFluxoCaixaCritico = (diasReserva: number) => {
    criarNotificacao({
      tipo: 'warning',
      titulo: 'Fluxo de caixa crítico',
      mensagem: `Apenas ${diasReserva} dias de reserva. Atenção necessária para evitar problemas de liquidez.`,
      acao: {
        url: '/fluxo-caixa',
        texto: 'Ver Projeção'
      }
    });
  };

  const notificarMargemBaixa = (margem: number) => {
    criarNotificacao({
      tipo: 'warning',
      titulo: 'Margem operacional baixa',
      mensagem: `Margem de ${margem.toFixed(1)}% está abaixo do ideal (>30%). Revise seus custos.`,
      acao: {
        url: '/transacoes',
        texto: 'Ver Despesas'
      }
    });
  };

  const notificarTransacaoConciliada = (quantidade: number) => {
    criarNotificacao({
      tipo: 'success',
      titulo: 'Transações conciliadas',
      mensagem: `${quantidade} transação(ões) foram conciliadas com sucesso.`,
      acao: {
        url: '/transacoes',
        texto: 'Ver Transações'
      }
    });
  };

  const notificarCategorizacaoConcluida = (quantidade: number) => {
    criarNotificacao({
      tipo: 'info',
      titulo: 'Categorização concluída',
      mensagem: `${quantidade} transação(ões) foram categorizadas automaticamente.`,
      acao: {
        url: '/categorizacao',
        texto: 'Ver Categorização'
      }
    });
  };

  const notificarSincronizacaoConta = (nomeBanco: string, transacoesImportadas: number) => {
    criarNotificacao({
      tipo: 'success',
      titulo: 'Conta sincronizada',
      mensagem: `${nomeBanco}: ${transacoesImportadas} transações importadas.`,
      acao: {
        url: '/contas',
        texto: 'Ver Contas'
      }
    });
  };

  const notificarErroSincronizacao = (nomeBanco: string, erro: string) => {
    criarNotificacao({
      tipo: 'error',
      titulo: 'Erro na sincronização',
      mensagem: `Falha ao sincronizar ${nomeBanco}: ${erro}`,
      acao: {
        url: '/contas',
        texto: 'Ver Contas'
      }
    });
  };

  return {
    notificacoes,
    naoLidas,
    marcarComoLida,
    marcarTodasComoLidas,
    criarNotificacao,
    notificarFluxoCaixaCritico,
    notificarMargemBaixa,
    notificarTransacaoConciliada,
    notificarCategorizacaoConcluida,
    notificarSincronizacaoConta,
    notificarErroSincronizacao,
  };
};