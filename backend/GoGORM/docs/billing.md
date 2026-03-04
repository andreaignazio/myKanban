Plan: Stripe subscriptions per workspace (seat-based)
Integrazione pagamenti Stripe per i workspace con approccio dependency inversion: il dominio subscription dipende da porte astratte, Stripe resta un adapter infrastrutturale.
Decisioni confermate: seat-based billing, custom UI frontend, stato abbonamento autorevole via webhook Stripe, migrazioni ibride (AutoMigrate dev, SQL migration-first prod).

Riferimenti chiave del codice attuale

Composition root DI: main.go:45-293
Router + gruppi auth/public: router.go:31-350
Servizio/repo subscription: service.go:10-29, repo.go:11-95
Modello workspace subscription: workspace.go:39-47
Event registry/audit: registry.go:63-372
Frontend API/store baseline: api.ts:4-27, workspaceStore.ts:35-88, userWatchStore.ts:10-224
Sequenza implementativa

Definire porte e DTO billing nel dominio subscription (provider-agnostic).
Estendere schema/repo per campi provider e stato lifecycle.
Aggiungere inbox idempotenza webhook.
Implementare adapter Stripe dietro interfacce.
Aggiungere route webhook pubblica e route billing autenticate.
Emettere eventi audit/domain billing su event registry.
Integrare frontend custom UI + store billing.
Verificare end-to-end (unit test + Stripe CLI webhook replay).
