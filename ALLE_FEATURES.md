
# 🚀 AMAZON ADS OPTIMIZER - ALLE FEATURES

## ✨ VOLLAUTOMATISCHES SYSTEM FÜR BLUMENZWIEBELN & PFLANZEN

---

## 📋 **FEATURE-ÜBERSICHT**

### ✅ BASIS-FEATURES (bereits vorhanden)
1. **Keyword-Optimierung** - Automatische Bid-Anpassungen
2. **Negative Keywords** - Automatisches Hinzufügen unrentabler Begriffe
3. **Positive Keywords** - Profitable Keywords werden gefördert
4. **Budget-Management** - Monatliche Budget-Überwachung
5. **Kampagnen-Management** - 3 Kampagnentypen (SP, SB, SD)

### 🌟 **NEUE PROFI-FEATURES (frisch implementiert)**

---

## 1. 🔔 **SMART ALERT SYSTEM**

### Was es macht:
- **E-Mail-Benachrichtigungen** bei kritischen Ereignissen
- **Budget-Warnungen** (80% erreicht)
- **Performance-Alerts** (schlechte Kampagnen)
- **Kosten-Spike-Erkennung**
- **Wöchentliche/Monatliche Reports**

### API-Endpunkte:
```
GET  /alerts              - Alle Alerts abrufen
GET  /alerts/test         - Test-Alert senden
GET  /alerts/check-budget - Budget-Checks ausführen
GET  /alerts/check-performance - Performance-Checks
```

### Konfiguration (.env):
```env
EMAIL_USER=deine@email.com
EMAIL_PASSWORD=dein-app-passwort
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
ALERT_EMAIL=deine@empfaenger-email.com
```

### Beispiel Alert-E-Mail:
```
⚠️ Budget-Warnung
Kampagne "Tulpenzwiebeln Premium" hat 80% des Tagesbudgets erreicht (40€ von 50€)
```

---

## 2. ⏰ **DAYPARTING (Zeitbasierte Gebote)**

### Was es macht:
- **Stündliche Gebot-Anpassungen** basierend auf Tageszeit
- **Höhere Gebote** zu verkaufsstarken Zeiten
- **Niedrigere Gebote** nachts
- **Wochentag vs. Wochenende** Differenzierung

### Standard-Regeln:
```
Wochentage 9-17 Uhr:  +15% Gebot
Wochentage 18-22 Uhr: +30% Gebot (Prime Time!)
Wochenende 10-20 Uhr: +25% Gebot
Nachts 23-6 Uhr:      -30% Gebot
```

### Automatischer Zeitplan:
- **Jede Stunde**: Dayparting-Anpassungen

### API-Endpunkte:
```
POST /dayparting/apply    - Manuell anwenden
GET  /dayparting/analysis - Beste Zeiten analysieren
```

### Beispiel:
```
Keyword "Blumenzwiebeln kaufen"
Base Bid: 0.80€
Montag 20 Uhr → 1.04€ (+30%)
Dienstag 3 Uhr → 0.56€ (-30%)
```

---

## 3. 🎯 **PLACEMENT-OPTIMIERUNG**

### Was es macht:
- **Separate Gebote** für verschiedene Amazon-Platzierungen
- **Top of Search** (erste Seite oben)
- **Rest of Search** (andere Suchergebnisse)
- **Product Pages** (auf Produktdetailseiten)
- **Automatische Anpassung** basierend auf Performance

### Optimierungs-Logik:
```
ACoS < 15% → +40% Gebot (sehr profitabel!)
ACoS 15-22% → +20% Gebot (gut)
ACoS 22-40% → -10% Gebot (ok)
ACoS > 40% → -30% Gebot (schlecht)
```

### Automatischer Zeitplan:
- **Täglich um 4 Uhr**: Placement-Optimierung

### API-Endpunkte:
```
POST /placement/optimize            - Manuell optimieren
GET  /placement/analysis/:campaignId - Analyse
GET  /placement/settings/:campaignId - Einstellungen
```

---

## 4. 📊 **AUTOMATISCHE REPORTS**

### Wöchentlicher Report (Montags 8 Uhr):
- **Gesamt-Performance** (Sales, ACoS, ROAS)
- **Vergleich** mit Vorwoche
- **Top 5 Kampagnen** & Keywords
- **Problem-Kampagnen**
- **Optimierungs-Zusammenfassung**

### Monatlicher Report (1. des Monats 9 Uhr):
- **Monats-Performance**
- **Budget-Prognose** für restlichen Monat
- **Top 10 Kampagnen** & Top 20 Keywords
- **Ausgaben-Trend**
- **Empfehlungen**

### API-Endpunkte:
```
POST /reports/weekly  - Wöchentlichen Report senden
POST /reports/monthly - Monatlichen Report senden
GET  /reports/custom?startDate=...&endDate=... - Custom Report
```

### Report-E-Mail Beispiel:
```html
📊 Wöchentlicher Report

Gesamtperformance:
✅ Umsatz: 1.234€ (+15% vs. Vorwoche)
💰 Ausgaben: 185€ (+5%)
📈 ACoS: 15.0% (-2%)
🎯 ROAS: 6.67 (+0.8)

Top 3 Kampagnen:
1. Tulpenzwiebeln Premium - 450€ Umsatz
2. Frühjahrsblüher Set - 320€ Umsatz
3. Narzissen Mix - 280€ Umsatz
```

---

## 5. 🤖 **INTELLIGENTE BUDGET-UMVERTEILUNG**

### Was es macht:
- **Budget automatisch verschieben** von schlechten zu guten Kampagnen
- **Performance-basierte Kategorisierung**
- **Dynamische Anpassungen**

### Budget-Strategie:
```
Exzellent (ACoS <10%):  Budget +50% (max 200€)
Gut (ACoS 10-20%):      Budget +25% (max 150€)
Durchschnitt (20-35%):  Budget unverändert
Schlecht (ACoS >35%):   Budget -50% (min 10€)
```

### Automatischer Zeitplan:
- **Täglich um 3 Uhr**: Budget-Umverteilung

### Beispiel:
```
Kampagne A: ACoS 8% → Budget 40€ → 60€ (+50%)
Kampagne B: ACoS 35% → Budget 30€ → 15€ (-50%)
Kampagne C: ACoS 5% → Budget 20€ → 40€ (+100%)
```

---

## 6. 🌡️ **SAISONALE ANPASSUNGEN**

### Saisonale Konfiguration:
```
🌸 FRÜHLING (März-Mai): +50% Budget
   Keywords: frühjahrsblüher, tulpen pflanzen

🍂 HERBST (Sep-Nov): +80% Budget ⭐ HAUPTSAISON!
   Keywords: blumenzwiebeln herbst, herbstpflanzung

☀️ SOMMER (Jun-Aug): -30% Budget
   Keywords: sommerblumen, topfpflanzen

❄️ WINTER (Dez-Feb): -40% Budget
   Keywords: zimmerpflanzen, weihnachtsgeschenke
```

### Automatischer Zeitplan:
- **Täglich um 2 Uhr**: Saisonale Anpassungen prüfen

### API-Endpunkte:
```
GET  /seasonal/stats - Saisonale Statistiken
POST /seasonal/apply - Manuell anwenden
```

---

## 7. 🆕 **AUTOMATISCHE KAMPAGNEN-ERSTELLUNG**

### Was es macht:
- **Neue Produkte** automatisch erkennen
- **Test-Kampagnen** mit konservativem Budget erstellen
- **Auto-Targeting** zunächst
- **Erfolgreiche Kampagnen** automatisch skalieren

### Prozess:
1. **Neues Produkt erkannt** → Test-Kampagne erstellen (15€ Budget)
2. **7 Tage Performance-Check**:
   - ACoS <25% + Sales >100€ → Budget +50%
   - ACoS >60% + Spend >30€ → Kampagne pausieren

### Automatischer Zeitplan:
- **Täglich um 5 Uhr**: Neue Produkte prüfen
- **Täglich um 6 Uhr**: Erfolgreiche Kampagnen skalieren

### API-Endpunkte:
```
POST /auto-campaigns/create-for-new-products - Kampagnen erstellen
POST /auto-campaigns/scale                   - Skalierung
```

---

## 8. 📱 **DASHBOARD & ERWEITERTE API**

### Dashboard-Übersicht:
- **Echtzeit-Performance** (30 Tage)
- **Kampagnen-Status**
- **Keyword-Performance**
- **System-Status**

### API-Endpunkte:
```
GET /dashboard/overview  - Haupt-Dashboard
GET /dashboard/campaigns - Kampagnen-Performance
GET /dashboard/keywords?limit=50 - Top Keywords
GET /dashboard/status    - System-Status
```

### Beispiel-Response:
```json
{
  "overview": {
    "totalCampaigns": 12,
    "activeCampaigns": 10,
    "totalKeywords": 245,
    "activeKeywords": 198
  },
  "performance": {
    "impressions": 125430,
    "clicks": 2345,
    "spend": 1234.56,
    "sales": 7890.12,
    "acos": 15.64,
    "roas": 6.39
  }
}
```

---

## 9. 🔍 **KEYWORD RESEARCH AUTOMATION**

### Was es macht:
- **Automatische Keyword-Recherche** wöchentlich
- **Von Best-Performern lernen**
- **Keyword-Variationen generieren**
- **Test-Keywords** automatisch hinzufügen

### Keyword-Quellen:
1. **Top-Performing Keywords** analysieren
2. **Seed-Keywords** erweitern (12 Basis-Keywords für Blumenzwiebeln)
3. **Amazon Suggested Keywords**
4. **Long-tail Kombinationen**

### Automatischer Zeitplan:
- **Montags um 10 Uhr**: Wöchentliche Keyword-Recherche

### API-Endpunkte:
```
POST /keyword-research/research      - Recherche starten
GET  /keyword-research/opportunities - Opportunities analysieren
```

### Beispiel-Variationen:
```
Base: "blumenzwiebeln"
→ blumenzwiebeln kaufen
→ blumenzwiebeln herbst
→ blumenzwiebeln winterhart mehrjährig
→ hochwertige blumenzwiebeln
→ blumenzwiebeln set
```

---

## 10. 🛡️ **ADVANCED BUDGET PROTECTION**

### Schutz-Mechanismen:
- **Tagesbudget-Limit** (max 100€/Tag)
- **Keyword-Bid-Limit** (max 5€/Klick)
- **Kosten-Spike-Erkennung** (2.5x normal)
- **Automatisches Pausieren**

### Schutz-Aktionen:
```
Tagesbudget erreicht → Kampagne pausieren
Kosten-Spike erkannt → Gebote -30%
Bid > 5€ → Auf 5€ reduzieren
```

### Automatischer Zeitplan:
- **Stündlich**: Budget-Schutz-Prüfungen

### API-Endpunkte:
```
GET  /protection/settings - Einstellungen
POST /protection/check    - Manuell prüfen
```

---

## 🔄 **KOMPLETTER AUTOMATISIERUNGS-ZEITPLAN**

```
Stündlich:
 • Dayparting-Anpassungen
 • Budget-Schutz-Prüfungen

02:00 Uhr - Saisonale Anpassungen
03:00 Uhr - Intelligente Budget-Umverteilung
04:00 Uhr - Placement-Optimierung
05:00 Uhr - Neue Produkt-Kampagnen
06:00 Uhr - Kampagnen-Skalierung

Montags 08:00 Uhr - Wöchentlicher Report
Montags 10:00 Uhr - Keyword-Recherche

Monatlich 1. 09:00 Uhr - Monatlicher Report
```

---

## 🎯 **GESCHÄFTSZIELE**

### Konfigurierte Ziele:
- **Monatliches Budget**: 1.000€ - 2.000€
- **Ziel-ACoS**: 5-15%
- **Pause-ACoS**: 40-60%
- **Fokus**: Blumenzwiebeln, Pflanzen, Floristik

---

## 📧 **E-MAIL-KONFIGURATION**

### Gmail Setup (empfohlen):
1. Gmail-Konto verwenden
2. **App-Passwort** erstellen (nicht normales Passwort!)
   - Google-Konto → Sicherheit → App-Passwörter
3. In `.env` eintragen:

```env
EMAIL_USER=deine@gmail.com
EMAIL_PASSWORD=dein-16-zeichen-app-passwort
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
ALERT_EMAIL=empfaenger@email.com
```

---

## 🚀 **ALLE API-ENDPUNKTE AUF EINEN BLICK**

### Alerts & Benachrichtigungen
```
GET  /alerts
GET  /alerts/test
GET  /alerts/check-budget
GET  /alerts/check-performance
```

### Dayparting
```
POST /dayparting/apply
GET  /dayparting/analysis
```

### Placement-Optimierung
```
POST /placement/optimize
GET  /placement/analysis/:campaignId
GET  /placement/settings/:campaignId
```

### Reports
```
POST /reports/weekly
POST /reports/monthly
GET  /reports/custom?startDate=...&endDate=...
```

### Saisonale Anpassungen
```
GET  /seasonal/stats
POST /seasonal/apply
```

### Automatische Kampagnen
```
POST /auto-campaigns/create-for-new-products
POST /auto-campaigns/scale
```

### Budget-Schutz
```
GET  /protection/settings
POST /protection/check
```

### Keyword-Recherche
```
POST /keyword-research/research
GET  /keyword-research/opportunities
```

### Dashboard
```
GET /dashboard/overview
GET /dashboard/campaigns
GET /dashboard/keywords?limit=50
GET /dashboard/status
```

### Budget (bestehend)
```
GET /budget/current
GET /budget/history
```

### Kampagnen (bestehend)
```
GET /campaigns
POST /campaigns/sync
```

### Keywords (bestehend)
```
GET /keywords/campaign/:campaignId
```

### Optimierung (bestehend)
```
POST /optimization/run
POST /optimization/bid-optimization
POST /optimization/keyword-optimization
GET  /optimization/history
```

---

## 💡 **VORTEILE DES SYSTEMS**

✅ **100% Automatisch** - Keine manuelle Arbeit mehr
✅ **24/7 Optimierung** - Rund um die Uhr aktiv
✅ **Intelligente Entscheidungen** - Basierend auf echten Daten
✅ **Budget-Schutz** - Keine unerwarteten Kosten
✅ **Zeitbasierte Gebote** - Spare Geld nachts, maximiere Sales tagsüber
✅ **Saisonale Anpassungen** - Perfekt für Blumenzwiebel-Business
✅ **E-Mail-Benachrichtigungen** - Bleibe informiert
✅ **Detaillierte Reports** - Wöchentlich & Monatlich
✅ **Automatische Skalierung** - Erfolgreiche Kampagnen wachsen automatisch

---

## 📚 **NÄCHSTE SCHRITTE**

1. **Amazon API-Credentials** eingeben
2. **E-Mail-Einstellungen** konfigurieren
3. **System laufen lassen** - Rest läuft automatisch!
4. **Wöchentliche Reports** per E-Mail erhalten
5. **Optional**: Dashboard aufrufen für Echtzeit-Statistiken

---

## 🎉 **FERTIG!**

Dein Amazon Ads System ist jetzt mit **ALLEN PROFI-FEATURES** ausgestattet und bereit für den Einsatz!

**Viel Erfolg mit deinen Blumenzwiebeln! 🌷🌸🌺**
