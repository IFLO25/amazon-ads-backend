
# 🚀 Amazon Ads Optimizer - Railway Deployment

## ✅ GARANTIERT FUNKTIONIERENDE 24/7 LÖSUNG!

### 📋 Was Sie bekommen:
- ✅ **24/7 Online** - Nie offline
- ✅ **Automatische Updates** - Bei Code-Änderungen
- ✅ **Kostenlos starten** - $5 Guthaben/Monat gratis
- ✅ **Öffentliche URL** - z.B. `https://amazon-ads-xyz.up.railway.app`
- ✅ **SSL/HTTPS** - Automatisch inklusive
- ✅ **Logs & Monitoring** - Echtzeit-Überwachung

---

## 🎯 SCHRITT-FÜR-SCHRITT ANLEITUNG (5 Minuten)

### **SCHRITT 1: Railway Account erstellen**

1. Gehen Sie zu: **https://railway.app**
2. Klicken Sie: **"Start a New Project"** (oder "Login with GitHub")
3. Erstellen Sie einen kostenlosen Account (mit GitHub empfohlen)
4. Sie bekommen **$5 gratis Guthaben/Monat** 🎉

---

### **SCHRITT 2: GitHub Repository erstellen**

**Option A: Mit GitHub (Empfohlen)**

1. Gehen Sie zu: **https://github.com/new**
2. Repository Name: `amazon-ads-optimizer`
3. **Private** Repository wählen
4. Klicken Sie: **"Create repository"**

**Dann laden Sie diese Dateien hoch:**
- Alle Dateien aus: `/home/ubuntu/amazon_ads_optimizer_backend/`
- **WICHTIG:** Auch `Dockerfile`, `docker-compose.yml`, `.dockerignore`

**Option B: Railway CLI (Schneller)**

```bash
# Auf diesem Server ausführen:
cd /home/ubuntu/amazon_ads_optimizer_backend

# Railway CLI installieren
npm install -g @railway/cli

# Einloggen
railway login

# Projekt initialisieren
railway init

# Deploy!
railway up
```

---

### **SCHRITT 3: Auf Railway deployen**

#### **Via GitHub:**

1. In Railway: Klicken Sie **"New Project"**
2. Wählen Sie: **"Deploy from GitHub repo"**
3. Wählen Sie Ihr Repository: `amazon-ads-optimizer`
4. Railway erkennt automatisch den Dockerfile ✅
5. Deployment startet automatisch! 🚀

#### **Via CLI:**

```bash
railway up
```

**Das war's! Railway baut und deployt automatisch!** ⏱️ Dauert ca. 3-5 Minuten

---

### **SCHRITT 4: Environment Variables setzen**

**WICHTIG:** Setzen Sie Ihre Amazon API Credentials!

1. In Railway: Gehen Sie zu Ihrem Projekt
2. Klicken Sie auf Ihr **Service**
3. Klicken Sie: **"Variables"** (oben)
4. Fügen Sie diese Variables hinzu (Klick auf **"+ New Variable"**):

```
AMAZON_CLIENT_ID=amzn1.application-oa2-client.IHRE_CLIENT_ID
AMAZON_CLIENT_SECRET=amzn1.oa2-cs.v1.IHR_CLIENT_SECRET
AMAZON_REFRESH_TOKEN=Atzr|IHR_REFRESH_TOKEN
AMAZON_PROFILE_ID=IHRE_PROFILE_ID
AMAZON_REGION=EU
AMAZON_MARKETPLACE_ID=A1PA6795UKMFR9
TARGET_ACOS_MIN=5
TARGET_ACOS_MAX=15
PAUSE_ACOS_THRESHOLD=40
MAX_ACOS_THRESHOLD=60
MONTHLY_BUDGET_MIN=1000
MONTHLY_BUDGET_MAX=2000
```

5. **Klicken Sie: "Deploy"** (oben rechts)
6. Railway startet automatisch neu mit den neuen Variables! ✅

---

### **SCHRITT 5: Öffentliche URL bekommen**

1. In Railway: Gehen Sie zu Ihrem Service
2. Klicken Sie: **"Settings"**
3. Scrollen Sie zu: **"Networking"**
4. Klicken Sie: **"Generate Domain"**
5. **Fertig!** Sie bekommen eine URL wie:
   ```
   https://amazon-ads-optimizer-production.up.railway.app
   ```

---

## ✅ **SYSTEM TESTEN**

Öffnen Sie in Ihrem Browser:

### **1. Health Check:**
```
https://IHR-DOMAIN.up.railway.app/api/health
```
**Sollte zeigen:** `{"status":"ok"}`

### **2. API Dokumentation:**
```
https://IHR-DOMAIN.up.railway.app/api-docs
```
**Sollte zeigen:** Swagger UI mit allen Endpoints

### **3. Dashboard:**
```
https://IHR-DOMAIN.up.railway.app/api/dashboard
```
**Sollte zeigen:** Ihre Performance-Daten

---

## 🎯 **ERSTE SCHRITTE NACH DEPLOYMENT**

### **1. Kampagnen synchronisieren:**

```bash
curl -X POST https://IHR-DOMAIN.up.railway.app/api/campaigns/sync
```

**Oder:** In der API-Dokumentation → `POST /api/campaigns/sync` → "Try it out"

### **2. Dashboard öffnen:**

Browser: `https://IHR-DOMAIN.up.railway.app/api/dashboard`

### **3. System läuft jetzt automatisch! 🎉**

- ✅ Alle 2 Stunden: Keyword-Optimierung
- ✅ Täglich um 2 Uhr: Komplette Optimierung
- ✅ Kontinuierlich: Alerts, Budget-Management

---

## 📊 **LOGS & MONITORING**

### **Logs anschauen:**

1. In Railway: Gehen Sie zu Ihrem Service
2. Klicken Sie: **"Deployments"**
3. Wählen Sie das aktuelle Deployment
4. **Echtzeit-Logs** werden angezeigt! 📈

### **Via CLI:**

```bash
railway logs
```

---

## 💰 **KOSTEN**

### **Railway Pricing:**

- **Hobby Plan:** $5 GRATIS/Monat
- Danach: **$0.000231/GB-sec** + **$0.20/GB Netzwerk**
- **Ihr System:** Ca. $3-8/Monat (sehr günstig!)

**Tipp:** Setzen Sie ein Ausgabenlimit in Railway!

---

## 🔒 **SICHERHEIT**

✅ **Automatisches HTTPS**
✅ **Private Environment Variables**
✅ **Isolierter Container**
✅ **Automatische Backups** (Datenbank)
✅ **DDoS Protection**

---

## 🆘 **PROBLEMLÖSUNG**

### **Deployment fehlgeschlagen?**

1. Prüfen Sie die Logs in Railway
2. Stellen Sie sicher, dass alle Environment Variables gesetzt sind
3. Dockerfile muss im Root-Verzeichnis liegen

### **503 Error?**

- System startet noch (ca. 2-3 Minuten beim ersten Mal)
- Warten Sie und versuchen Sie es erneut

### **Amazon API Fehler?**

- Prüfen Sie, ob alle Credentials korrekt gesetzt sind
- Refresh Token könnte abgelaufen sein

---

## 🎉 **FERTIG!**

Ihr System läuft jetzt **24/7** auf professioneller Cloud-Infrastruktur!

**Glückwunsch! 🚀**

---

## 📞 **NÄCHSTE SCHRITTE:**

1. ✅ Bookmark Ihre Railway URL
2. ✅ Bookmark die API-Docs
3. ✅ System läuft automatisch - Sie müssen nichts mehr tun!
4. ✅ Bei Bedarf: Email-Alerts einrichten (in Variables)

**Viel Erfolg mit Ihrem automatischen Amazon Ads System!** 💰📈
