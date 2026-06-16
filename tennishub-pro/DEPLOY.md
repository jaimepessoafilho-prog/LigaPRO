# Deploy na Vercel — LigaPRO

## 1. Importar o projeto
1. Acesse https://vercel.com → **Add New… → Project**
2. Conecte o GitHub e importe o repositório **LigaPRO**
3. Em **Root Directory**, selecione **`tennishub-pro`** (o app fica nessa subpasta)
4. Framework: **Next.js** (detectado automaticamente)

## 2. Variáveis de ambiente (Environment Variables)
Adicione todas em **Production** (e Preview, se quiser):

| Nome | Valor |
|------|-------|
| `DATABASE_URL` | A URL **POOLED** do Neon (host com `-pooler`) |
| `AUTH_SECRET` | O mesmo secret do `.env` local |
| `ZAPI_INSTANCE_ID` | (opcional) credenciais Z-API |
| `ZAPI_INSTANCE_TOKEN` | (opcional) |
| `ZAPI_CLIENT_TOKEN` | (opcional) |

> Não é preciso definir `AUTH_URL`: o app usa `trustHost: true`.
> Use a URL **pooled** do Neon em produção (serverless abre muitas conexões).

## 3. Deploy
- Clique em **Deploy**. O build roda `prisma generate` automaticamente (postinstall).
- As tabelas já existem no Neon (migração `init` aplicada localmente).

## 4. Após o deploy
- Acesse a URL gerada (ex: `https://ligapro.vercel.app`)
- Login admin: `jaime.pessoa.filho@gmail.com` / `j123456`
- Cada push para a branch dispara um novo deploy.

## Atualizar o schema no futuro
Rode localmente apontando para o Neon:
```
npx prisma migrate dev --name <mudanca>
```
e faça commit das migrações.
