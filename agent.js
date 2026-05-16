// agent.js
const fs = require('fs');

async function scrapeMunicipality() {
    console.log("🤖 Το ρομπότ ξεκίνησε να διαβάζει το site του Δήμου...");
    
    // Αυτό είναι το Link που μου έδωσες
    const targetUrl = 'https://www.voreiatzoumerka.gr/index.php/touristikos-proorismos';
    
    try {
        // 1. Το ρομπότ επισκέπτεται τη σελίδα
        const response = await fetch(targetUrl);
        const html = await response.text();

        // 2. Ψάχνει να βρει όλα τα links που υπάρχουν μέσα στην ιστοσελίδα
        const linkRegex = /href="(\/index\.php\/touristikos-proorismos\/[^"]+)"/g;
        const foundLinks = new Set(); // Το Set δεν επιτρέπει διπλότυπα
        let match;

        while ((match = linkRegex.exec(html)) !== null) {
            // Φτιάχνουμε το πλήρες link (προσθέτουμε το voreiatzoumerka.gr μπροστά)
            const fullLink = 'https://www.voreiatzoumerka.gr' + match[1];
            foundLinks.add(fullLink);
        }

        // 3. Μετατρέπουμε τη λίστα σε κανονικό πίνακα για να την αποθηκεύσουμε
        const finalLinksList = Array.from(foundLinks);

        // 4. Φτιάχνουμε το πακέτο δεδομένων που θα σώσουμε
        const dataToSave = {
            description: "Λίστα με όλες τις υποσελίδες του Τουριστικού Προορισμού",
            totalLinksFound: finalLinksList.length,
            lastUpdated: new Date().toLocaleString('el-GR', { timeZone: 'Europe/Athens' }),
            links: finalLinksList
        };

        // 5. Γράφουμε το αρχείο voreia_tzoumerka.json
        fs.writeFileSync('voreia_tzoumerka.json', JSON.stringify(dataToSave, null, 2));
        console.log("✅ Επιτυχία! Το αρχείο voreia_tzoumerka.json δημιουργήθηκε!");

    } catch (error) {
        console.error("❌ Ώπα! Κάτι πήγε στραβά:", error.message);
    }
}

// Λέμε στο ρομπότ να ξεκινήσει τη δουλειά
scrapeMunicipality();