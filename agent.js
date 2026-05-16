// agent.js
const fs = require('fs');

async function scrapeMunicipality() {
    console.log("🤖 Ο Agent ξεκινάει με την premium ταυτότητα browser...");
    
    const targetUrl = 'https://www.voreiatzoumerka.gr/index.php/touristikos-proorismos';
    
    try {
        // Στέλνουμε "ταυτότητα" κανονικού browser για να μη μας μπλοκάρει το site
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const html = await response.text();
        
        // Έλεγχος αν πήραμε άδεια σελίδα
        if (!html || html.length < 100) {
            console.log("⚠️ Το site επέστρεψε άδεια σελίδα ή μας μπλόκαρε.");
        }

        const foundLinks = new Set();
        // Αυτό το Regex πιάνει ΟΛΑ τα links ανεξάρτητα από το τι γράφουν
        const linkRegex = /href="([^"]+)"/g;
        let match;

        while ((match = linkRegex.exec(html)) !== null) {
            const urlPath = match[1];
            
            // Φιλτράρουμε να κρατήσουμε μόνο όσα πάνε σε υποσελίδες του τουρισμού
            if (urlPath.includes('proorismos') || urlPath.includes('fysi-mnhmeia') || urlPath.includes('drastiriotites')) {
                if (urlPath.startsWith('/')) {
                    foundLinks.add('https://www.voreiatzoumerka.gr' + urlPath);
                } else if (urlPath.startsWith('http')) {
                    foundLinks.add(urlPath);
                }
            }
        }

        const finalLinksList = Array.from(foundLinks);
        console.log(`📊 Βρέθηκαν συνολικά στο φιλτράρισμα: ${finalLinksList.length} links.`);

        const dataToSave = {
            description: "Λίστα με όλες τις υποσελίδες του Τουριστικού Προορισμού",
            totalLinksFound: finalLinksList.length,
            lastUpdated: new Date().toLocaleString('el-GR', { timeZone: 'Europe/Athens' }),
            links: finalLinksList
        };

        fs.writeFileSync('voreia_tzoumerka.json', JSON.stringify(dataToSave, null, 2));
        console.log("✅ Το αρχείο voreia_tzoumerka.json γράφτηκε στο δίσκο.");

    } catch (error) {
        console.error("❌ Κάτι έσπασε στον Agent:", error.message);
    }
}

scrapeMunicipality();