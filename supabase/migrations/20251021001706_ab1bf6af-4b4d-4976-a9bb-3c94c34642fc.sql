-- Adicionar coluna centro_custo_id na tabela categorias
ALTER TABLE public.categorias 
ADD COLUMN centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE RESTRICT;

-- Atualizar categorias existentes para ter um centro de custo padrão
-- Primeiro, vamos criar um centro de custo "Geral" para cada usuário que tenha categorias
-- Usando um tipo válido (assumindo 'receita' ou 'despesa' ou NULL)
INSERT INTO public.centros_custo (user_id, codigo, nome, ativo)
SELECT DISTINCT c.user_id, 'GERAL', 'Centro de Custo Geral', true
FROM public.categorias c
WHERE NOT EXISTS (
  SELECT 1 FROM public.centros_custo cc WHERE cc.user_id = c.user_id
);

-- Atualizar todas as categorias existentes para vincular ao centro de custo "Geral"
UPDATE public.categorias cat
SET centro_custo_id = (
  SELECT id 
  FROM public.centros_custo cc 
  WHERE cc.user_id = cat.user_id 
  AND cc.codigo = 'GERAL'
  LIMIT 1
)
WHERE centro_custo_id IS NULL;

-- Tornar a coluna NOT NULL após garantir que todos os registros têm valor
ALTER TABLE public.categorias 
ALTER COLUMN centro_custo_id SET NOT NULL;

-- Criar índice para melhor performance nas consultas
CREATE INDEX idx_categorias_centro_custo ON public.categorias(centro_custo_id);

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.categorias.centro_custo_id IS 'Centro de custo ao qual a categoria pertence (obrigatório)';