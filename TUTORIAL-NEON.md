# 🚀 CONFIGURAÇÃO NEON - TUTORIAL RÁPIDO

Você está aqui porque precisa configurar o banco de dados. Vamos fazer isso em 3 minutos!

## 🎯 PASSO 1: Criar Conta no Neon (1 minuto)

1. **Acesse**: https://neon.tech
2. **Clique em**: "Sign Up"
3. **Use**: GitHub, Google ou Email
4. **É grátis**: 512MB de storage gratuito

## 🎯 PASSO 2: Criar Projeto (1 minuto)

1. **Após login**, clique em "Create Project"
2. **Nome do projeto**: `riviera-ticket`
3. **Região**: US East (recomendado)
4. **Clique**: "Create"

## 🎯 PASSO 3: Copiar Connection String (1 minuto)

1. **Na tela do projeto**, procure "Connection string"
2. **Copie a URL completa** (algo como):
   ```
   postgresql://riviera_ticket_owner:ABC123def456@ep-cool-name-123456.us-east-1.aws.neon.tech/riviera_ticket?sslmode=require
   ```

## 🎯 PASSO 4: Configurar no Projeto (30 segundos)

1. **Abra**: `.env.local` (no VS Code)
2. **Encontre a linha**: `DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@..."`
3. **Substitua por**: sua URL do Neon
4. **Salve o arquivo**

### Exemplo:
```bash
# ANTES:
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-cool-name-123456.us-east-1.aws.neon.tech/neondb?sslmode=require"

# DEPOIS (com sua URL real):
DATABASE_URL="postgresql://riviera_ticket_owner:ABC123def456@ep-cool-name-123456.us-east-1.aws.neon.tech/riviera_ticket?sslmode=require"
```

## 🎯 PASSO 5: Testar (30 segundos)

```bash
npm run db:push      # ← Criar tabelas
npm run db:studio    # ← Abrir interface do banco
```

## ✅ Pronto!

Se tudo der certo, você verá:
- ✅ Tabelas criadas com sucesso
- ✅ Interface do banco funcionando
- ✅ Projeto rodando com `npm run dev`

## 🆘 Problemas?

### "Connection failed"
- ✅ Verifique se copiou a URL completa
- ✅ Certifique-se que não há espaços extras
- ✅ Confirme se o projeto Neon está ativo

### "Permission denied"
- ✅ Use a connection string exata do Neon
- ✅ Não modifique username/password

---

**🚀 Agora vá para o Neon e configure em 3 minutos!**
**📖 Depois execute: `npm run db:push`**