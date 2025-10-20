# 📤 Como Usar: Upload e Integração com APIs

## 🎯 Guia Prático de Uso

### 📂 **CENÁRIO 1: Importar Extrato Bancário (OFX/CSV)**

#### Passo a Passo

1. **Baixe o extrato do seu banco**
   - Entre no site/app do banco
   - Vá em "Extratos" ou "Movimentações"
   - Selecione o período desejado
   - Baixe no formato **OFX** ou **CSV** (recomendado)

2. **Acesse a página de Contas no sistema**
   ```
   Menu lateral → Contas Bancárias
   ```

3. **Localize a conta que deseja importar**
   ```
   Ex: Banco do Brasil - Conta Corrente
   ```

4. **Clique no botão "Importar"**
   ```
   [Importar] ← Clique aqui
   ```

5. **Selecione o arquivo**
   ```
   - Arraste o arquivo para a área indicada
   - OU clique para selecionar do computador
   ```

6. **Aguarde o processamento**
   ```
   ⏳ Processando arquivo...
   ✅ 150 transações encontradas
   ✅ 145 novas | 5 duplicadas
   ```

7. **Revise o preview**
   ```
   📋 Preview mostra todas as transações
   - Data
   - Descrição
   - Tipo (Receita/Despesa)
   - Valor
   ```

8. **Confirme a importação**
   ```
   [Confirmar Importação] ← Clique aqui
   ```

9. **Pronto!**
   ```
   ✅ 145 transações importadas com sucesso!
   ```

---

### 🔗 **CENÁRIO 2: Conectar API Bancária (Pluggy)**

#### Passo a Passo

1. **Criar conta no Pluggy**
   - Acesse: https://pluggy.ai
   - Clique em "Começar Grátis"
   - Complete o cadastro
   - Acesse o Dashboard

2. **Obter credenciais**
   - No dashboard do Pluggy
   - Vá em "Settings" → "API Keys"
   - Copie seu **API Key** e **Client ID**
   ```
   API Key: pk_test_abc123def456...
   Client ID: your-client-id
   ```

3. **No sistema, acesse Contas**
   ```
   Menu lateral → Contas Bancárias
   ```

4. **Clique no botão "API"**
   ```
   [API] ← Clique aqui
   ```

5. **Selecione o provedor "Pluggy"**
   ```
   [Pluggy] [Belvo] [Celcoin] [Open Finance]
     ↑
   Clique aqui
   ```

6. **Cole as credenciais**
   ```
   API Key: [cole aqui]
   Client ID: [cole aqui]
   ```

7. **Clique em "Conectar"**
   ```
   [Conectar] ← Clique aqui
   ```

8. **Aguarde o teste de conexão**
   ```
   ⏳ Testando conexão...
   ✅ Conexão estabelecida!
   ```

9. **Primeira sincronização automática**
   ```
   ⏳ Sincronizando últimos 90 dias...
   ✅ 347 transações importadas!
   ```

10. **Pronto! Sincronização automática ativa**
    ```
    ✅ Conectado
    🔄 Sincronização automática a cada 6 horas
    ```

---

### 🎨 **CENÁRIO 3: Sincronizar Manualmente**

#### Quando usar?
- Quer atualizar agora (não esperar 6 horas)
- Acabou de fazer compras e quer ver no sistema
- Verificar novos lançamentos

#### Como fazer?

1. **Localize a conta conectada**
   ```
   ✅ Badge "Conectado" no card da conta
   ```

2. **Clique em "Sincronizar"**
   ```
   [🔄 Sincronizar] ← Clique aqui
   ```

3. **Aguarde**
   ```
   ⏳ Sincronizando...
   ✅ 12 novas transações importadas!
   ```

---

## 🏦 **Formatos de Arquivo Suportados**

### 1. **OFX (Recomendado)**

**O que é?**
- Open Financial Exchange
- Formato padrão bancário
- Mais preciso e confiável

**Como baixar?**
```
Site do Banco → Extratos → Exportar → OFX
```

**Bancos que suportam:**
- ✅ Banco do Brasil
- ✅ Bradesco
- ✅ Itaú
- ✅ Santander
- ✅ Caixa
- ✅ Nubank
- ✅ Inter
- ✅ C6 Bank
- ✅ Todos os bancos digitais

**Exemplo de arquivo:**
```
extrato_bb_outubro.ofx
extrato_nubank_2025.ofx
```

### 2. **CSV**

**O que é?**
- Comma-Separated Values
- Arquivo de texto com vírgulas
- Pode abrir no Excel

**Como baixar?**
```
Site do Banco → Extratos → Exportar → CSV ou Excel
```

**Formato esperado:**
```csv
Data,Descrição,Valor,Tipo
20/10/2025,Salário,5000.00,Crédito
21/10/2025,Aluguel,-1500.00,Débito
```

**Dica:** Se seu CSV tiver colunas diferentes, o sistema tenta detectar automaticamente!

### 3. **PDF (Limitado)**

**O que é?**
- Extrato em PDF do banco
- Requer OCR (não implementado totalmente)

**Status:**
- ⚠️ Suporte básico
- Recomendamos converter para OFX ou CSV

**Como converter:**
- Use ferramentas online do próprio banco
- Ou baixe diretamente em OFX/CSV

---

## 🔑 **APIs Bancárias Disponíveis**

### 1. **Pluggy** ⭐ (Recomendado)

**Por que usar?**
- ✅ Suporte a 100+ bancos brasileiros
- ✅ Atualização em tempo real
- ✅ Fácil configuração
- ✅ Gratuito para testes

**Onde conseguir:**
- Site: https://pluggy.ai
- Plano grátis: Até 100 conexões

**Bancos suportados:**
- Todos os bancos brasileiros (BB, Bradesco, Itaú, Santander, etc.)
- Bancos digitais (Nubank, Inter, C6, etc.)
- Fintechs (PicPay, Mercado Pago, etc.)

### 2. **Belvo**

**Por que usar?**
- ✅ Suporte América Latina
- ✅ Bom para empresas internacionais
- ✅ Documentação completa

**Onde conseguir:**
- Site: https://belvo.com
- Plano grátis: Sandbox ilimitado

### 3. **Celcoin**

**Por que usar?**
- ✅ Foco em pagamentos
- ✅ PIX integrado
- ✅ Boletos DDA

**Onde conseguir:**
- Site: https://celcoin.com.br

### 4. **Open Finance Brasil**

**Por que usar?**
- ✅ Padrão oficial brasileiro
- ✅ Regulamentado pelo Banco Central
- ✅ Seguro e confiável

**Onde conseguir:**
- Site: https://openbankingbrasil.org.br

---

## 💡 **Dicas e Boas Práticas**

### ✅ **FAÇA**

1. **Use OFX sempre que possível**
   - Mais preciso
   - Menos erros
   - Automático

2. **Configure API para contas principais**
   - Sincronização automática
   - Sempre atualizado
   - Menos trabalho manual

3. **Use upload para contas antigas**
   - Importar histórico
   - Dados de anos anteriores
   - Migração de outros sistemas

4. **Revise o preview antes de confirmar**
   - Verifique duplicatas
   - Confira valores
   - Valide datas

5. **Mantenha extratos organizados**
   - Uma pasta por banco
   - Nomeie com data: `bb_2025_10.ofx`
   - Backup dos originais

### ❌ **NÃO FAÇA**

1. **Não importe o mesmo arquivo duas vezes**
   - Sistema detecta duplicatas
   - Mas evite retrabalho

2. **Não compartilhe suas API Keys**
   - São confidenciais
   - Use variáveis de ambiente
   - Revogue se exposta

3. **Não confie 100% em PDFs**
   - Podem ter erros de OCR
   - Prefira OFX ou CSV
   - Revise manualmente

4. **Não ignore erros de validação**
   - Corrija antes de importar
   - Dados inválidos não entram
   - Verifique formato

---

## 🐛 **Resolução de Problemas**

### Problema 1: "Formato não suportado"

**Causa:**
- Arquivo não é OFX, CSV ou PDF

**Solução:**
```
✅ Baixe novamente do banco
✅ Verifique a extensão (.ofx, .csv, .pdf)
✅ Tente outro formato
```

### Problema 2: "Nenhuma transação encontrada"

**Causa:**
- Arquivo vazio
- Formato incorreto
- Período sem movimentações

**Solução:**
```
✅ Abra o arquivo e verifique o conteúdo
✅ Confirme que há transações no período
✅ Tente baixar novamente
```

### Problema 3: "Todas as transações já foram importadas"

**Causa:**
- Importação duplicada
- Mesmo período já importado

**Solução:**
```
✅ Normal! Sistema detectou duplicatas
✅ Tente outro período
✅ Ou sincronize para pegar novos lançamentos
```

### Problema 4: "Erro ao conectar API"

**Causa:**
- Credenciais inválidas
- API Key incorreta
- Sem internet

**Solução:**
```
✅ Verifique as credenciais no dashboard do provedor
✅ Copie e cole novamente (sem espaços)
✅ Verifique sua conexão com internet
✅ Tente outro provedor
```

### Problema 5: "Timeout na sincronização"

**Causa:**
- Muitas transações
- API lenta
- Conexão instável

**Solução:**
```
✅ Aguarde alguns minutos e tente novamente
✅ Use períodos menores (30 dias)
✅ Importe em partes
```

---

## 📞 **Precisa de Ajuda?**

### Documentação Técnica
- [UPLOAD_INTEGRATION_GUIDE.md](./UPLOAD_INTEGRATION_GUIDE.md) - Guia completo técnico

### Código de Exemplo
- `src/services/fileParser.ts` - Parser de arquivos
- `src/services/bankingAPI.ts` - Integração com APIs
- `src/components/banking/` - Componentes visuais

### APIs Externas
- Pluggy: https://docs.pluggy.ai/
- Belvo: https://developers.belvo.com/

---

## 🎉 **Pronto para Começar!**

Agora você sabe:
- ✅ Como importar extratos (OFX, CSV, PDF)
- ✅ Como conectar APIs bancárias (Pluggy, Belvo, etc.)
- ✅ Como sincronizar manualmente
- ✅ Resolver problemas comuns

**Comece agora mesmo! Sua primeira importação está a um clique de distância!** 🚀
