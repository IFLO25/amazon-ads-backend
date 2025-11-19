
const http = require('http');
const url = require('url');

console.log('\n🔧 AMAZON ADVERTISING API - REFRESH TOKEN GENERATOR (KORRIGIERT)\n');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log('⚠️  WICHTIG: Melde dich mit dem Account an, der diese Kampagnen hat:');
console.log('   - Rose von Jericho');
console.log('   - Zwiebeln_Phrase_2025');
console.log('   - Amaryllis Kampagnen');
console.log('\n   Falls du mehrere Amazon Accounts hast, wähle den RICHTIGEN!\n');
console.log('═══════════════════════════════════════════════════════════════\n');

// Wichtige Informationen
const CLIENT_ID = 'amzn1.application-oa2-client.88f7f1ae0a364f79a8e7e97e40dfffd1';
const CLIENT_SECRET = 'amzn1.oa2-cs.v1.68f14f7374fc42edb45a93eafcab5a90e17f7f5c5e087fbbb7cccb30c8e2b4cbc1';
const REDIRECT_URI = 'http://localhost:3000/callback';

// WICHTIG: Dieser Scope ist KORREKT für Sponsored Products Kampagnen
const CORRECT_SCOPE = 'advertising::campaign_management';

// Schritt 1: Authorization URL erstellen
const authUrl = `https://www.amazon.com/ap/oa?` +
  `client_id=${CLIENT_ID}` +
  `&scope=${CORRECT_SCOPE}` +
  `&response_type=code` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

console.log('📋 SCHRITT 1: Öffne diese URL im Browser:\n');
console.log('─────────────────────────────────────────────────────────────');
console.log(authUrl);
console.log('─────────────────────────────────────────────────────────────\n');

console.log('⚠️  WICHTIG: Achte darauf, dass der Scope korrekt ist:');
console.log(`   Scope: ${CORRECT_SCOPE}\n`);

console.log('📌 HINWEISE:');
console.log('   - Melde dich mit deinem AMAZON ADVERTISING ACCOUNT an');
console.log('   - NICHT mit dem Seller Central Account!');
console.log('   - Der Account muss Zugriff auf Sponsored Products haben\n');

// Schritt 2: Lokalen Server starten
const server = http.createServer(async (req, res) => {
  const queryObject = url.parse(req.url, true).query;
  
  if (queryObject.code) {
    const authCode = queryObject.code;
    console.log('\n✅ Authorization Code empfangen:', authCode.substring(0, 30) + '...\n');
    
    // Exchange code for refresh token
    try {
      const axios = require('axios');
      
      const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
      
      const response = await axios.post(
        'https://api.amazon.com/auth/o2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: authCode,
          redirect_uri: REDIRECT_URI,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${basicAuth}`,
          },
        }
      );
      
      const refreshToken = response.data.refresh_token;
      const accessToken = response.data.access_token;
      
      console.log('🎉 TOKEN ERFOLGREICH GENERIERT!\n');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log('📝 NEUER REFRESH TOKEN (mit korrektem Scope):\n');
      console.log(refreshToken);
      console.log('\n═══════════════════════════════════════════════════════════════\n');
      
      console.log('✅ NÄCHSTE SCHRITTE:\n');
      console.log('1. Gehe zu Railway Dashboard');
      console.log('2. Öffne dein Backend-Projekt');
      console.log('3. Gehe zu "Variables"');
      console.log('4. Ändere AMAZON_REFRESH_TOKEN zu:');
      console.log(`   ${refreshToken}`);
      console.log('\n5. Speichern → Railway wird automatisch neu deployen');
      console.log('6. Warte 2-3 Minuten');
      console.log('7. Teste: https://amazon-ads-backend-production.up.railway.app/api/campaigns\n');
      
      // Test the new token
      console.log('🧪 Teste neuen Token...\n');
      
      try {
        const testResponse = await axios.get('https://advertising-api-eu.amazon.com/v2/profiles', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Amazon-Advertising-API-ClientId': CLIENT_ID,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`✅ Token ist gültig! ${testResponse.data.length} Profile gefunden\n`);
        
        // Test Sponsored Products access
        const profileId = testResponse.data[0].profileId;
        try {
          const campaignsResponse = await axios.get('https://advertising-api-eu.amazon.com/sp/campaigns', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Amazon-Advertising-API-ClientId': CLIENT_ID,
              'Amazon-Advertising-API-Scope': String(profileId),
              'Content-Type': 'application/json'
            }
          });
          
          console.log(`✅ SPONSORED PRODUCTS ZUGRIFF FUNKTIONIERT!`);
          console.log(`   Profile ID: ${profileId}`);
          console.log(`   Kampagnen: ${campaignsResponse.data.length}\n`);
          console.log('🎉 DER NEUE TOKEN SOLLTE JETZT FUNKTIONIEREN!\n');
        } catch (error) {
          console.log(`❌ Sponsored Products Test fehlgeschlagen für Profile ${profileId}`);
          console.log(`   Status: ${error.response?.status}`);
          console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
          console.log('⚠️  Möglicherweise hat dieser Account keine Sponsored Products Kampagnen\n');
        }
      } catch (error) {
        console.log('❌ Token-Test fehlgeschlagen:', error.message, '\n');
      }
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>Token Generiert!</title></head>
          <body style="font-family: Arial; padding: 50px; background: #f0f0f0;">
            <h1 style="color: green;">✅ Token erfolgreich generiert!</h1>
            <p>Schau in die Konsole für weitere Anweisungen.</p>
            <p><strong>Du kannst dieses Fenster jetzt schließen.</strong></p>
          </body>
        </html>
      `);
      
      setTimeout(() => {
        console.log('🛑 Server wird geschlossen...\n');
        server.close();
        process.exit(0);
      }, 2000);
      
    } catch (error) {
      console.error('❌ Fehler beim Token-Austausch:', error.response?.data || error.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Fehler beim Token-Austausch. Schau in die Konsole.');
    }
  } else {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Kein Authorization Code erhalten');
  }
});

server.listen(3000, () => {
  console.log('🚀 Lokaler Server läuft auf http://localhost:3000\n');
  console.log('📋 WARTE auf Authorization Code...\n');
  console.log('   (Öffne die URL oben im Browser und authorisiere die App)\n');
});
