# 🚀 Configuração Rápida do Neon Database

## O que é o Neon?
O Neon é um PostgreSQL serverless na nuvem, gratuito para projetos pequenos e perfeito para desenvolvimento.

## Passo a Passo para Configurar:

### 1️⃣ Criar Conta no Neon
1. Acesse: https://neon.tech
2. Clique em "Sign Up" 
3. Use GitHub, Google ou email
4. É **100% gratuito** para começar

### 2️⃣ Criar Projeto
1. Após login, clique em **"Create Project"**
2. Escolha um nome: `riviera-ticket`
3. Selecione região (recomendado: US East para melhor performance)
4. Clique em "Create"

### 3️⃣ Obter Connection String
1. Na tela do projeto, procure por **"Connection string"**
2. Copie a URL completa (algo como):
   ```
   postgresql://username:password@ep-cool-name-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

### 4️⃣ Configurar no Projeto
1. Abra o arquivo `.env.local`
2. Substitua a linha `DATABASE_URL=` pela sua connection string:
   ```bash
   DATABASE_URL="postgresql://username:password@ep-cool-name-123456.us-east-1.aws.neon.tech/neondb?sslmode=require"
   ```

### 5️⃣ Testar Conexão
```bash
# Executar migrações
npm run db:push

# Abrir interface do banco
npm run db:studio
```

## ✅ Pronto!
Seu banco PostgreSQL na nuvem está configurado e rodando!

## 🔧 Comandos Úteis

```bash
# Setup completo (push + seed)
npm run db:setup

# Visualizar banco de dados
npm run db:studio

# Reset completo do banco
npm run db:reset

# Só popular com dados
npm run db:seed
```

## 🆘 Problemas Comuns

### "url: undefined"
- Verifique se a `DATABASE_URL` está no `.env.local`
- Certifique-se que não há espaços extras

### "Connection failed"
- Confirme se a URL do Neon está correta
- Verifique se o projeto Neon está ativo

### "Permission denied"
- Use a connection string exata do Neon
- Não modifique username/password

## 💡 Dicas

- **Grátis**: 512MB storage, 3GB data transfer
- **Performance**: Muito rápido para desenvolvimento
- **Backup**: Automático no Neon
- **Escalabilidade**: Fácil upgrade quando necessário

---

**Agora é só seguir os passos e ter seu banco funcionando em 2 minutos! 🚀**