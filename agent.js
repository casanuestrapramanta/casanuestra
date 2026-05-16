// agent.js
const fs = require('fs');

async function scrapeOfficialGuide() {
    console.log("🤖 Ο Agent ξεκινάει το διάβασμα των επίσημων σελίδων του Δήμου...");

    // Του δίνουμε απευθείας τις πιο σημαντικές σελίδες του «Τουριστικού Προορισμού»
    const targets = {
        "Ιστορία": "https://www.voreiatzoumerka.gr/index.php/touristikos-proorismos/fysi-mnimeia/fysi-mnimeia",
        "Χωριά": "https://www.voreiatzoumerka.gr/index.php/touristikos-proorismos/fysi-mnimeia/monastiria-ekklisies"
    };

    const finalResult = {
        description: "Επίσημος Τουριστικός Οδηγός Βορείων Τζουμέρκων",
        lastUpdated: new Date().toLocaleString('el-GR', { timeZone: 'Europe/Athens' }),
        data: []
    };

    // Μπαίνουμε σε κάθε σελίδα ξεχωριστά
    for (const [title, url] of Object.entries(targets)) {
        try {
            console.log(`📥 Διαβάζω την ενότητα: ${title}...`);
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const html = await response.text();

            // Μαζεύουμε τις πρώτες παραγράφους κειμένου από τη σελίδα
            const paragraphs = [];
            const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
            let match;

            while ((match = pRegex.exec(html)) !== null) {
                const cleanText = match[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                // Κρατάμε μόνο παραγράφους που έχουν πραγματικό κείμενο (πάνω από 40 χαρακτήρες)
                if (cleanText.length > 40 && !cleanText.includes('Copyright') && !cleanText.includes('javascript')) {
                    paragraphs.push(cleanText);
                }
            }

            // Προσθέτουμε την ενότητα στο τελικό μας αρχείο
            finalResult.data.push({
                section: title,
                sourceUrl: url,
                info: paragraphs.slice(0, 5) // Κρατάμε τις 5 πρώτες καθαρές παραγράφους
            });

            // Μικρή στάση 1 δευτερολέπτου για ασφάλεια
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.error(`❌ Αποτυχία στην ενότητα ${title}:`, error.message);
        }
    }

    // Σώζουμε το τελικό JSON
    fs.writeFileSync('voreia_tzoumerka.json', JSON.stringify(finalResult, null, 2));
    console.log("✅ Το αρχείο voreia_tzoumerka.json γράφτηκε με επιτυχία!");
}

scrapeOfficialGuide();