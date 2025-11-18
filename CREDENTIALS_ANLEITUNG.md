
# 🔑 Amazon API Credentials Einrichten

## ✅ Status

Dein **Amazon Ads Optimizer System ist fertig**! 🎉

Es wartet nur noch auf deine **Amazon Advertising API Credentials**.

---

## 📝 Was du jetzt tun musst:

### Schritt 1: Besorge die API Credentials

Du hast bereits angefangen, ein **Security Profile** bei Amazon zu erstellen. 
Vervollständige die **Developer-Registrierung** auf:

👉 https://developer.amazon.com/loginwithamazon/console/site/lwa/overview.html

Dort bekommst du:
- **CLIENT_ID** (beginnt mit `amzn1.application-oa2-client...`)
- **CLIENT_SECRET** (ein langer geheimer Schlüssel)
- **REFRESH_TOKEN** (beginnt mit `Atzr|...`)

### Schritt 2: Trage die Credentials ein

Öffne die Datei:
```
/home/ubuntu/amazon_ads_optimizer/nodejs_space/.env
```

Suche nach diesen Zeilen:
```env
AMAZON_CLIENT_ID=your_client_id_here
AMAZON_CLIENT_SECRET=your_client_secret_here
AMAZON_REFRESH_TOKEN=your_refresh_token_here
```

Ersetze sie mit deinen echten Werten:
```env
AMAZON_CLIENT_ID=amzn1.application-oa2-client.XXXXXXXX
AMAZON_CLIENT_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
AMAZON_REFRESH_TOKEN=Atzr|XXXXXXXXXXXXXXXX
```

### Schritt 3: System starten

```bash
cd /home/ubuntu/amazon_ads_optimizer/nodejs_space
yarn start:prod
```

Das System läuft dann auf: **http://localhost:3000**

---

## 📊 Was passiert automatisch?

✅ **Stündliche Synchronisation:** Kampagnen werden von Amazon abgerufen  
✅ **Stündliche Optimierung:** ACoS wird analysiert und Kampagnen optimiert  
✅ **Automatische Pausierung:** Kampagnen mit ACoS 40-60% werden pausiert  
✅ **Automatische Skalierung:** Profitable Kampagnen (ACoS 5-15%) werden hochskaliert  
✅ **Budget-Management:** Monatliches Budget 1000-2000€ wird eingehalten  

---

## 🔍 System überprüfen

Öffne im Browser: **http://localhost:3000/api-docs**

Dort siehst du alle verfügbaren API-Endpunkte und kannst das System testen!

### Wichtige Endpoints:

- `GET /api/status` - System-Status prüfen
- `GET /api/campaigns` - Alle Kampagnen anzeigen
- `GET /api/optimization/history` - Optimierungs-Historie
- `GET /api/budget` - Budget-Übersicht
- `POST /api/optimization/run` - Manuelle Optimierung starten

---

## 🆘 Hilfe bei Credentials

Falls du Hilfe beim Erstellen der Credentials brauchst:

1. **Amazon Support kontaktieren:** https://advertising.amazon.com/contact-us
2. **Amazon Advertising API Dokumentation:** https://advertising.amazon.com/API/docs/
3. **Oder:** Jemand Technisches um Hilfe bitten

---

## ✅ Deine Konfiguration

Das System ist bereits für dich konfiguriert:

- **Account ID:** `amzn1.ads-account.g.6skv2i330h47re30qvb6ph44l`
- **Marketplace:** Amazon.de (EU)
- **Seller ID:** A33U8OEMGACMNK
- **Budget:** 1000-2000€/Monat
- **ACoS-Ziel:** 5-15%
- **Pausierung:** 40-60% ACoS

Alles ist bereit! Du musst nur noch die 3 Credentials eintragen! 🚀

---

## 🌷 Viel Erfolg mit deinen Blumenzwiebel-Kampagnen!
