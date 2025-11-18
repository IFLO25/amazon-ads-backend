
# 🎯 Vollautomatische Keyword-Optimierung

## ✅ NEUE FEATURES

Ihr Amazon Ads Optimizer hat jetzt **VOLLAUTOMATISCHE** Keyword-Optimierung!

---

## 🚀 WAS DAS SYSTEM AUTOMATISCH MACHT:

### 1. 🚫 **Negative Keywords hinzufügen**
**Kriterien:**
- ACoS > 60% UND mindestens 5 Klicks
- 20+ Klicks OHNE Sales
- 1000+ Impressionen mit CTR < 0.1%

**Beispiel:**
```
Suchbegriff: "billige plastikblumen"
→ ACoS: 85%, 15 Klicks, 0 Sales
→ AUTOMATISCH als negatives Keyword hinzugefügt!
```

---

### 2. ✅ **Positive Keywords erstellen**
**Kriterien:**
- ACoS < 15%
- Mindestens 3 Sales
- CTR > 0.5%
- Conversion Rate > 5%

**Beispiel:**
```
Suchbegriff: "tulpenzwiebeln holland"
→ ACoS: 8%, 25 Sales, CTR: 1.2%
→ AUTOMATISCH als Exact Match Keyword erstellt!
→ Optimales Gebot: €0.85
```

---

### 3. ⏸️ **Schlecht performende Keywords pausieren**
**Kriterien:**
- ACoS > 60% UND 10+ Klicks
- 30+ Klicks OHNE Sales

**Beispiel:**
```
Keyword: "blumen"
→ ACoS: 75%, 35 Klicks, 2 Sales
→ AUTOMATISCH pausiert!
```

---

### 4. 💰 **Gebote automatisch anpassen**
**Intelligente Gebots-Optimierung:**

| ACoS | Conversion Rate | Anpassung | Beispiel |
|------|----------------|-----------|----------|
| < 10% | > 10% | **+30%** | €0.50 → €0.65 |
| 10-15% | > 5% | **+15%** | €0.50 → €0.58 |
| 15-25% | - | **Unverändert** | €0.50 → €0.50 |
| 25-40% | - | **-15%** | €0.50 → €0.43 |
| > 40% | - | **-30%** | €0.50 → €0.35 |

---

## ⏰ ZEITPLAN DER OPTIMIERUNGEN

### **Stündlich (jede Stunde):**
- 🔄 Kampagnen-Sync
- 📊 Budget-Optimierung

### **Alle 2 Stunden:**
- 🎯 **Keyword-Optimierung**
  - Negative Keywords hinzufügen
  - Positive Keywords erstellen
  - Gebote anpassen
  - Keywords pausieren

### **Täglich (06:00 Uhr morgens):**
- 🌅 Komplette Optimierung
- 📈 Performance-Reports
- 💾 Backup der Daten

---

## 📊 API-ENDPUNKTE

### **Manuelle Keyword-Optimierung auslösen:**
```http
POST /keywords/optimize
```

**Response:**
```json
{
  "negative_keywords_added": 15,
  "positive_keywords_added": 8,
  "keywords_paused": 5,
  "bids_adjusted": 23
}
```

---

### **Optimierungs-Historie abrufen:**
```http
GET /keywords/history?days=30
```

**Response:**
```json
[
  {
    "id": "uuid",
    "campaign_id": "123456",
    "keyword": "tulpenzwiebeln",
    "action": "POSITIVE_ADDED",
    "reason": "ACoS: 8.5%, Sales: 25, CTR: 1.2%",
    "previous_acos": 8.5,
    "new_bid": 0.85,
    "optimized_at": "2025-11-12T21:00:00Z"
  },
  {
    "id": "uuid",
    "campaign_id": "123456",
    "keyword": "billige blumen",
    "action": "NEGATIVE_ADDED",
    "reason": "ACoS: 85%, Clicks: 15, Sales: 0",
    "previous_acos": 85,
    "optimized_at": "2025-11-12T20:00:00Z"
  }
]
```

---

## 🎯 INTELLIGENTE ALGORITHMEN

### **Optimales Gebot berechnen:**
```typescript
ACoS-Bereich → Gebot-Multiplikator → Neues Gebot

Beispiel:
Keyword: "narzissen zwiebeln"
Aktueller CPC: €0.50
ACoS: 12%
Conversion Rate: 8%

→ Multiplikator: 1.15 (da ACoS 10-15% und CR > 5%)
→ Neues Gebot: €0.50 × 1.15 = €0.58
```

### **Sicherheitsgrenzen:**
- **Minimum-Gebot:** €0.15
- **Maximum-Gebot:** €5.00
- **Mindest-Änderung:** 10% (kleinere Änderungen werden ignoriert)

---

## 📈 ERWARTETE ERGEBNISSE

### **Nach 7 Tagen:**
- ✅ 20-30 negative Keywords hinzugefügt
- ✅ 10-15 neue positive Keywords
- ✅ 5-10 Keywords pausiert
- ✅ 30-50 Gebots-Anpassungen

### **Nach 30 Tagen:**
- 📉 **ACoS-Reduktion:** 15-25%
- 📈 **ROI-Steigerung:** 20-30%
- 💰 **Budget-Effizienz:** +25%
- 🎯 **Conversion Rate:** +10-15%

---

## 🔧 KONFIGURATION

### **In .env anpassen:**
```env
# Keyword-Optimierungs-Schwellwerte
ACOS_THRESHOLD_NEGATIVE=60
ACOS_THRESHOLD_POSITIVE=15
MIN_CLICKS_FOR_PAUSE=30
MIN_SALES_FOR_POSITIVE=3
```

---

## 📊 DATENBANK

### **Neue Tabellen:**

#### **keyword_optimization**
Speichert alle Keyword-Optimierungen:
- `campaign_id` - Kampagnen-ID
- `keyword` - Keyword-Text
- `action` - NEGATIVE_ADDED | POSITIVE_ADDED | PAUSED | BID_ADJUSTED
- `reason` - Grund für die Optimierung
- `previous_bid` - Altes Gebot
- `new_bid` - Neues Gebot
- `previous_acos` - Vorheriger ACoS
- `optimized_at` - Zeitstempel

#### **optimization_run**
Speichert Optimierungs-Durchläufe:
- `type` - KEYWORD_OPTIMIZATION | BUDGET | CAMPAIGN
- `negative_keywords_added` - Anzahl hinzugefügter negativer Keywords
- `positive_keywords_added` - Anzahl hinzugefügter positiver Keywords
- `keywords_paused` - Anzahl pausierter Keywords
- `bids_adjusted` - Anzahl angepasster Gebote
- `executed_at` - Ausführungs-Zeitstempel

---

## 🎉 ZUSAMMENFASSUNG

**Ihr System optimiert jetzt VOLLAUTOMATISCH:**

✅ Entfernt verschwenderische Suchbegriffe  
✅ Findet profitable neue Keywords  
✅ Pausiert schlecht performende Keywords  
✅ Optimiert Gebote für maximalen ROI  
✅ Läuft 24/7 im Hintergrund  
✅ Spart Ihnen Stunden manueller Arbeit  

**Sie müssen NICHTS mehr tun - das System arbeitet für Sie!** 🚀
