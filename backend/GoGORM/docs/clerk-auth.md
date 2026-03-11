# Clerk auth backend

Il backend supporta Clerk come source of truth per l'autenticazione mantenendo l'UUID locale come chiave interna per tutte le relazioni applicative.

## Flusso

1. Il client invia il session token Clerk nel bearer token `Authorization: Bearer <token>`, nel cookie `__session` oppure come query param `token` per la handshake WebSocket.
2. Il middleware backend valida il token con `CLERK_JWT_KEY`.
3. Il backend risolve o crea l'utente locale, collegandolo tramite `users.clerk_user_id`.
4. Da quel punto in poi l'app continua a usare l'UUID locale già esistente nel codice.

## Env richieste

- `CLERK_AUTH_ENABLED=true`
- `CLERK_JWT_KEY=-----BEGIN PUBLIC KEY-----...`

## Env consigliate

- `CLERK_SECRET_KEY=sk_live_...`
- `CLERK_ISSUER=https://<your-instance>.clerk.accounts.dev`
- `CLERK_AUDIENCE=<expected-audience>`
- `CLERK_AUTHORIZED_PARTIES=http://localhost:5173,https://app.example.com`

Con `CLERK_SECRET_KEY` il backend può leggere il profilo utente da Clerk e fare auto-provisioning/linking locale anche se il token non include email o username utili.

## Fallback sviluppo

- `AUTH_ALLOW_DEV_X_USER_ID=true`

Questo fallback riabilita il vecchio `x-userID` solo quando Clerk è attivo ma il frontend non è ancora stato migrato. Non abilitarlo in produzione.

## Note operative

- Gli utenti già presenti vengono collegati a Clerk via email al primo accesso valido.
- I nuovi utenti autenticati via Clerk vengono creati localmente con un nuovo UUID applicativo.
- L'endpoint `POST /auth/register` resta disponibile per compatibilità legacy, ma non fa parte del flusso Clerk.
