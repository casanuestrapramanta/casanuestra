// agent.js
const fs = require('fs');

async function scrapeMunicipality() {
    console.log("🤖 Το ρομπότ ξεκίνησε με το νέο, διορθωμένο φίλτρο...");
    
    const targetUrl = 'https://www.voreiatzoumerka.gr/index.php/touristikos-proorismos';
    
    try {
        const response = await fetch(targetUrl);
        const html = await response.text();

        // ΝΕΟ ΕΞΥΠΝΟ ΦΙΛΤΡΑΡΙΣΜΑ: Ψάχνει όλα τα links (href) μέσα στη σελίδα
        const linkRegex = /href="([^"]+)"/g;
        const foundLinks = new Set();
        let match;

        while ((match = linkRegex.exec(html)) !== null) {
            const urlPath = match[1];
            
            // Κρατάμε μόνο τα links που σχετίζονται με τον τουρισμό ή την περιοχή
            if (urlPath.includes('proorismos') || urlPath.includes('touristikos') || urlPath.includes('xoria')) {
                // Αν το link είναι σχετικό (π.χ. ξεκινάει με /index.php), του βάζουμε το domain μπροστά
                if (urlPath.startsWith('/')) {
                    foundLinks.add('https://www.voreiatzoumerka.gr' + urlPath);
                } else if (urlPath.startsWith('http')) {
                    foundLinks.add(urlPath);
                }
            }
        }

        const finalLinksList = Array.from(foundLinks);

        const dataToSave = {
            description: "Λίστα με όλες τις υποσελίδες του Τουριστικού Προορισμού",
            totalLinksFound: finalLinksList.length,
            lastUpdated: new Date().toLocaleString('el-GR', { timeZone: 'Europe/Athens' }),
            links: finalLinksList
        };

        fs.writeFileSync('voreia_tzoumerka.json', JSON.stringify(dataToSave, null, 2));
        console.log(`✅ Επιτυχία! Βρέθηκαν ${finalLinksList.length} σύνδεσμοι!`);

    } catch (error) {
        console.error("❌ Σφάλμα:", error.message);
    }
}

scrapeMunicipality();