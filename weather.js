// weather.js

/**
 * Weather Module Configuration (Pramanta, Tzoumerka)
 */
const PRAMANTA_LAT = 39.5237; 
const PRAMANTA_LON = 21.1037;

function generateWeatherHint(code) {

    // ⚡ Καταιγίδες (WMO 95–99)
    if (code >= 95) {
        return "Σήμερα έχει καταιγίδες, δώσε προειδοποίηση και μην προτείνεις διαδρομές στο βουνό. Εναλλακτικά προτείνονται κοντινά αξιοθέατα, χωριά και κλειστοί χώροι που είναι προσβάσιμα με το αυτοκίνητο.";
    }

    // 🌧️ Ισχυρές ή μέτριες βροχές / μπόρες (WMO 80–94)
    if (code >= 80) {
        return "Σήμερα έχει βροχές, δώσε προειδοποίηση και προτίμησε ασφαλείς, εύκολες, κοντινές διαδρομές. Απόφυγε διαδρομές μακρινές ή ορεινές. Πρότεινε βόλτες με αυτοκίνητο για μεγαλύτερη ασφάλεια";
    }

    // ❄️ Χιόνι / Χιονόνερο (WMO 70–79)
    if (code >= 70) {
        return "Σήμερα έχει χιόνι· οι ορεινές διαδρομές μπορεί να είναι δύσβατες. Προτείνονται χαμηλότερα υψόμετρα και ασφαλή μονοπάτια και μόνο με ανάλογο εξοπλισμό και ρουχισμό.";
    }

    // ☔ Συνεχής βροχή (WMO 60–69)
    if (code >= 60) {
        return "Σήμερα έχει συνεχόμενη βροχή· καλύτερα να αποφύγεις βουνά και φαράγγια. Επέλεξε μικρά χωριά, μουσεία, καφέ ή σύντομους περιπάτους στο κέντρο.";
    }

    // 🌫️ Ομίχλη (WMO 45–49)
    if (code >= 45) {
        return "Σήμερα έχει ομίχλη· η ορατότητα είναι χαμηλή. Προτείνονται σύντομες διαδρομές, όχι απότομα μονοπάτια ή σημεία με απότομες πλαγιές.";
    }

    // ☁️ Συννεφιά / Overcast (WMO 3–44)
    if (code >= 3) {
        return "Σήμερα έχει συννεφιά· προτείνονται εύκολες έως μέτριες διαδρομές με καλή ορατότητα και όμορφη ορεινή θέα χωρίς έντονη ζέστη.";
    }

    // 🌤️ Λίγη συννεφιά (WMO 1–2)
    if (code >= 1) {
        return "Ο καιρός είναι ήπιος με λίγη συννεφιά· ιδανικός για κάθε έιδους διαδρομές, μονοπάτια και επισκέψεις σε χωριά με θέα.";
    }

    // ☀️ Αίθριος (WMO 0)
    return "Ο καιρός είναι εξαιρετικός· ιδανικός για όλες τις διαδρομές, viewpoints, βόλτες και φωτογραφίες στα Τζουμέρκα.";
}


/**
 * Βρίσκει τον κατάλληλο κωδικό Emoji (καιρού) βάσει του WMO code.
 * @param {number} code - WMO weather code
 * @returns {string} Το αντίστοιχο Emoji
 */
function getWeatherEmoji(code) {
    if (code >= 95) return '🌩️'; // Thunderstorm
    if (code >= 80) return '🌧️'; // Rain Showers
    if (code >= 71) return '🌨️'; // Snow
    if (code >= 61) return '☔'; // Rain
    if (code >= 45) return '🌫️'; // Fog
    if (code >= 3) return '☁️'; // Overcast
    if (code >= 1) return '🌤️'; // Partly Cloudy
    return '☀️'; // Clear Sky (Code 0)
}

/**
 * Δημιουργεί το HTML για ένα badge καιρού.
 * @param {string} dayLabel - 'ΣΗΜΕΡΑ' ή 'ΑΥΡΙΟ'
 * @param {number} maxTemp - Μέγιστη θερμοκρασία
 * @param {number} minTemp - Ελάχιστη θερμοκρασία
 * @param {number} mainWeatherCode - Ο επικρατέστερος WMO κωδικός
 * @returns {string} Το HTML string του badge
 */
function renderWeatherBadge(dayLabel, maxTemp, minTemp, mainWeatherCode) {
    const emoji = getWeatherEmoji(mainWeatherCode);

    return `
        <div class="weather-badge">
            <p class="day-label">${dayLabel}</p>
            <div class="weather-emoji">${emoji}</div>
            <p class="weather-temp">
                ${Math.round(maxTemp)}°C / ${Math.round(minTemp)}°C
            </p>
        </div>
    `;
}

/**
 * Καλεί το Open-Meteo API, επεξεργάζεται τα δεδομένα και εμφανίζει τα badges στον container.
 * * @param {string} containerId - Το ID του HTML element όπου θα μπουν τα badges.
 */
export async function fetchAndRenderWeather(containerId) {
    const weatherContainer = document.getElementById(containerId);
    if (!weatherContainer) {
        console.error(`Weather container with ID '${containerId}' not found.`);
        return;
    }

    // Μήνυμα φόρτωσης
    weatherContainer.innerHTML = `<p class="text-gray-500 dark:text-gray-400">Φόρτωση καιρού Πραμάντων...</p>`;
    
    // Το 'daily' endpoint είναι ιδανικό για σύνοψη 2 ημερών
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${PRAMANTA_LAT}&longitude=${PRAMANTA_LON}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe/Athens&forecast_days=2`;

    try {
        const response = await fetch(weatherUrl);
        
        if (!response.ok) throw new Error("HTTP Status not OK");
        
        const data = await response.json();

        if (!data.daily || !data.daily.time || data.daily.time.length < 2) {
            weatherContainer.innerHTML = `<p class="text-red-500">Δεν βρέθηκαν δεδομένα καιρού.</p>`;
            return;
        }

        // Σήμερα (Δείκτης 0) & Αύριο (Δείκτης 1)
        const today = {
            max: data.daily.temperature_2m_max[0],
            min: data.daily.temperature_2m_min[0],
            code: data.daily.weathercode[0]
        };
        const tomorrow = {
            max: data.daily.temperature_2m_max[1],
            min: data.daily.temperature_2m_min[1],
            code: data.daily.weathercode[1]
        };

        // Καθαρισμός και εμφάνιση των badges
        weatherContainer.innerHTML = 
            renderWeatherBadge('ΣΗΜΕΡΑ', today.max, today.min, today.code) +
            renderWeatherBadge('ΑΥΡΙΟ', tomorrow.max, tomorrow.min, tomorrow.code);
         return generateWeatherHint(today.code);

    } catch (error) {
        console.error('Error fetching weather:', error);
        weatherContainer.innerHTML = `<p class="text-red-500">Αποτυχία φόρτωσης καιρού.</p>`;
    }
}