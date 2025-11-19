# 🌷 Amazon Ads Optimizer - Vollautomatisches Kampagnen-Management

## ✅ System Status: **FERTIG!**

Dein vollautomatisches Amazon Advertising Management System für **Sponsored Products** auf **Amazon.de** ist einsatzbereit!

---

## 🎯 Was das System macht

### Automatische Optimierung (stündlich)
- ✅ **Kampagnen synchronisieren** von Amazon Advertising API
- ✅ **ACoS analysieren** und Performance bewerten
- ✅ **Unprofitable Kampagnen pausieren** (ACoS 40-60%)
- ✅ **Profitable Kampagnen skalieren** (ACoS 5-15%)
- ✅ **Budget intelligent verteilen** (1000-2000€/Monat)
- ✅ **Nur profitables Budget ausgeben**

### Für deine Nische optimiert
- 🌷 **Blumenzwiebeln**
- 🌱 **Pflanzen**
- 💐 **Floristik**

---

## 🚀 Schnellstart

### 1. API Credentials eintragen

⚠️ **WICHTIG:** Das System braucht deine Amazon API Credentials!

Siehe **CREDENTIALS_ANLEITUNG.md** für detaillierte Hilfe.

Öffne `.env` und ersetze:
```env
AMAZON_CLIENT_ID=deine_echte_client_id
AMAZON_CLIENT_SECRET=dein_echtes_client_secret
AMAZON_REFRESH_TOKEN=dein_echter_refresh_token
```

### 2. System starten

```bash
# Installation (falls nötig)
yarn install

# Datenbank Setup (einmalig)
npx prisma generate
npx prisma db push

# Entwicklungsmodus
yarn start:dev

# Produktionsmodus
yarn build
yarn start:prod
```

### 3. API Dokumentation öffnen

👉 **http://localhost:3000/api-docs**

Dort findest du alle verfügbaren Endpoints und kannst sie direkt testen!

---

## 📊 API Endpoints

### System Status
- `GET /api/status` - System-Status und Credentials-Check
- `GET /` - Willkommensnachricht

### Kampagnen
- `GET /api/campaigns` - Alle Kampagnen auflisten
- `GET /api/campaigns/:id` - Einzelne Kampagne Details
- `GET /api/campaigns/:id/performance` - Performance-Metriken (letzte 30 Tage)
- `POST /api/campaigns/sync` - Kampagnen von Amazon synchronisieren

### Optimierung
- `POST /api/optimization/run` - Manuelle Optimierung starten
- `GET /api/optimization/history` - Optimierungs-Historie anzeigen

### Budget
- `GET /api/budget` - Aktuellen Monats-Budget anzeigen
- `GET /api/budget/history` - Budget-Historie

### Konfiguration
- `POST /api/config/update` - Einstellungen aktualisieren (ACoS-Ziele, Budget-Limits)

---

## ⚙️ Konfiguration

Deine aktuelle Konfiguration (in `.env`):

```env
# Amazon Account
AMAZON_ADVERTISING_ACCOUNT_ID=amzn1.ads-account.g.6skv2i330h47re30qvb6ph44l
AMAZON_MARKETPLACE=EU
AMAZON_SELLER_ID=A33U8OEMGACMNK

# Budget (in Euro)
MONTHLY_BUDGET_MIN=1000
MONTHLY_BUDGET_MAX=2000

# ACoS Targets (in Prozent)
TARGET_ACOS_MIN=5        # Perfekt - skalieren!
TARGET_ACOS_MAX=15       # Gut - beibehalten
PAUSE_ACOS_MIN=40        # Schlecht - pausieren
PAUSE_ACOS_MAX=60        # Sehr schlecht - pausieren
```

---

## 🤖 Automatisierung

Das System läuft **vollautomatisch** mit Cron-Jobs:

| Zeitplan | Aktion | Was passiert |
|----------|--------|--------------|
| **Jede Stunde um :00** | Optimierung | Kampagnen analysieren und optimieren |
| **Jede Stunde um :30** | Sync | Kampagnen von Amazon holen |

Keine manuellen Eingriffe nötig! 🎉

---

## 📈 Optimierungs-Logik

### 1. **Pausierung** (ACoS 40-60%)
Kampagne wird **pausiert**, um Budget zu sparen:
```
❌ PAUSED - ACoS zu hoch (45%)
```

### 2. **Archivierung** (ACoS >60%)
Kampagne wird **archiviert** (kritisch unrentabel):
```
🗑️ ARCHIVED - ACoS kritisch (75%)
```

### 3. **Skalierung** (ACoS 5-15%)
Budget wird **erhöht** (+10-20%):
```
📈 Budget: 20€ → 22€ - Profitable Kampagne
```

### 4. **Reduzierung** (ACoS 15-40%)
Budget wird **gesenkt** (-15%):
```
📉 Budget: 30€ → 25.50€ - Moderate Performance
```

### 5. **Re-Aktivierung** (pausierte Kampagne verbessert sich)
Kampagne wird wieder **aktiviert**:
```
✅ ENABLED - ACoS verbessert (12%)
```

---

## 🔍 System Überwachen

### Status prüfen
```bash
curl http://localhost:3000/api/status
```

Antwort:
```json
{
  "status": "ok",
  "timestamp": "2024-11-12T10:30:00.000Z",
  "credentials": {
    "configured": true,
    "hasValidToken": true
  },
  "account": {
    "advertisingAccountId": "amzn1.ads-account.g.6skv2i330h47re30qvb6ph44l",
    "marketplace": "EU",
    "sellerId": "A33U8OEMGACMNK"
  }
}
```

### Kampagnen anzeigen
```bash
curl http://localhost:3000/api/campaigns
```

### Optimierungs-Historie
```bash
curl http://localhost:3000/api/optimization/history
```

---

## 🆘 Hilfe

### Problem: "Credentials not configured"

✅ **Lösung:** Trage deine Amazon API Credentials in `.env` ein  
📖 Siehe: `CREDENTIALS_ANLEITUNG.md`

### Problem: "Failed to refresh access token"

✅ **Lösung:** REFRESH_TOKEN ist abgelaufen oder ungültig  
🔄 Generiere einen neuen REFRESH_TOKEN

### Problem: "Rate limit exceeded"

✅ **Lösung:** Das System wartet automatisch - kein Eingriff nötig  
⏰ Rate Limiting ist bereits implementiert

---

## 📚 Dokumentation

- **CREDENTIALS_ANLEITUNG.md** - Wie du API Credentials bekommst
- **DEPLOYMENT_INFO.md** - Deployment und Architektur
- **Swagger API Docs** - http://localhost:3000/api-docs

---

## 🏗️ Technologie-Stack

- **Framework:** NestJS (TypeScript)
- **Datenbank:** PostgreSQL (via Prisma ORM)
- **API Integration:** Amazon Advertising API (EU Region)
- **Scheduling:** @nestjs/schedule (Cron Jobs)
- **Dokumentation:** Swagger/OpenAPI
- **HTTP Client:** Axios mit Rate Limiting

---

## 🌟 Features

✅ OAuth 2.0 Token Management (automatisches Refresh)  
✅ Rate Limiting (60 Requests/Minute)  
✅ Error Handling & Retry-Logik  
✅ Datenbank-Tracking (Kampagnen, Performance, Optimierungen)  
✅ Swagger API Dokumentation  
✅ Budget-Management & Limits  
✅ Vollautomatische Optimierung  
✅ Logging & History  

---

## 🚀 Deployment

Das System ist deployment-fertig! 

Nach dem Deployment läuft es automatisch und optimiert deine Kampagnen 24/7.

**Siehe:** `DEPLOYMENT_INFO.md` für Details.

---

## 🌷 Viel Erfolg mit deinen Blumenzwiebel-Kampagnen!

Bei Fragen oder Problemen:
- Prüfe die Logs
- Schaue in die API-Dokumentation
- Kontaktiere Amazon Advertising Support

**Das System ist bereit - trage deine Credentials ein und starte durch!** 🚀

# Force redeploy Wed Nov 19 20:42:15 UTC 2025
