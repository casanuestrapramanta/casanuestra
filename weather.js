// weather.js

/**
 * Weather & Environment Module Configuration (Pramanta, Tzoumerka)
 */
const PRAMANTA_LAT = 39.5237; 
const PRAMANTA_LON = 21.1037;

export function generateWeatherHint(code) {
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
        return "Σήμερα έχει χιόνι· οι ορεινές διαδρομές μπορεί να είναι επικίνδυνες.";
    }

    return "";
}

function getWeatherIcon(code) {
    if (code === 0) return '☀️'; // Καθαρός ουρανός
    if (code <= 3) return '⛅'; // Λίγα σύννεφα
    if (code <= 48) return '🌫️'; // Ομίχλη
    if (code <= 67) return '🌧️'; // Βροχή
    if (code <= 77) return '❄️'; // Χιόνι
    if (code <= 82) return '🌧️'; // Μπόρες
    if (code <= 86) return '❄️'; // Χιονόπτωση
    return '⛈️'; // Καταιγίδα
}

function renderWeatherBadge(title, max, min, code) {
    const icon = getWeatherIcon(code);
    return `
        <div class="weather-badge bg-gray-100 dark:bg-gray-700 p-2 rounded-xl flex flex-col items-center min-w-[75px] shadow-sm">
            <span class="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold">${title}</span>
            <span class="text-lg my-0.5">${icon}</span>
            <span class="text-xs font-semibold text-gray-800 dark:text-gray-200">${Math.round(max)}° / ${Math.round(min)}°</span>
        </div>
    `;
}

// Μετατρέπει την ώρα ISO (π.χ. "2026-05-16T06:12") σε απλή μορφή "06:12"
function formatTime(isoString) {
    if (!isoString) return "--:--";
    try {
        return isoString.split('T')[1];
    } catch {
        return "--:--";
    }
}

// ⭐️ ΔΙΟΡΘΩΣΗ: Προσθήκη κενού μετά το emoji για να δουλεύει σωστά το split(' ')
function getAirQualityLabel(aqi) {
    if (aqi <= 20) return "🍃 Άριστος";
    if (aqi <= 40) return "👍 Καλός";
    if (aqi <= 60) return "😐 Μέτριος";
    return "😷 Επιβαρυμένος";
}

/**
 * Κεντρική συνάρτηση που καλείται από το script.js
 */
export async function fetchAndRenderWeather(containerId) {
    const weatherContainer = document.getElementById(containerId);
    if (!weatherContainer) return "";

    // URL 1: Καιρός + Live UV Index + Ανατολή & Δύση ηλίου
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${PRAMANTA_LAT}&longitude=${PRAMANTA_LON}&daily=weathercode,temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset&timezone=Europe/Athens&forecast_days=2`;
    
    // URL 2: Live Ποιότητα Αέρα (Air Quality AQI) για τα Πράμαντα
    const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${PRAMANTA_LAT}&longitude=${PRAMANTA_LON}&current=european_aqi&timezone=Europe/Athens`;

    try {
        // Εκτελούμε και τα δύο requests ταυτόχρονα για μέγιστη ταχύτητα
        const [weatherResponse, airResponse] = await Promise.all([
            fetch(weatherUrl),
            fetch(airQualityUrl)
        ]);
        
        if (!weatherResponse.ok) throw new Error("Weather API Error");
        
        const weatherData = await weatherResponse.json();
        
        let airLabel = "🍃 Καθαρός"; // default τιμή με κενό αν αποτύχει το air quality API
        if (airResponse.ok) {
            const airData = await airResponse.json();
            if (airData && airData.current && airData.current.european_aqi !== undefined) {
                airLabel = getAirQualityLabel(airData.current.european_aqi);
            }
        }

        if (!weatherData.daily || !weatherData.daily.time || weatherData.daily.time.length < 2) {
            weatherContainer.innerHTML = `<p class="text-red-500">Δεν βρέθηκαν δεδομένα καιρού.</p>`;
            return "";
        }

        // Σήμερα (Δείκτης 0) & Αύριο (Δείκτης 1)
        const today = {
            max: weatherData.daily.temperature_2m_max[0],
            min: weatherData.daily.temperature_2m_min[0],
            code: weatherData.daily.weathercode[0],
            uv: weatherData.daily.uv_index_max[0],
            sunrise: formatTime(weatherData.daily.sunrise[0]),
            sunset: formatTime(weatherData.daily.sunset[0])
        };

        const tomorrow = {
            max: weatherData.daily.temperature_2m_max[1],
            min: weatherData.daily.temperature_2m_min[1],
            code: weatherData.daily.weathercode[1]
        };

        // Δημιουργία των 3 νέων fancy badges με Tailwind CSS στυλ
        const uvBadge = `
            <div class="weather-badge bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl flex flex-col items-center min-w-[70px] shadow-sm border border-amber-200/50 dark:border-amber-900/50">
                <span class="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold">Δείκτης UV</span>
                <span class="text-sm mt-0.5">☀️</span>
                <span class="text-xs font-bold text-amber-700 dark:text-amber-300">${Math.round(today.uv)} / 10</span>
            </div>
        `;

        const sunBadge = `
            <div class="weather-badge bg-orange-50 dark:bg-orange-950/40 p-2 rounded-xl flex flex-col items-center min-w-[75px] shadow-sm border border-orange-200/50 dark:border-orange-900/50">
                <span class="text-[10px] uppercase tracking-wider text-orange-600 dark:text-orange-400 font-bold">Ηλιοβασίλεμα</span>
                <span class="text-sm mt-0.5">🌅</span>
                <span class="text-xs font-bold text-orange-700 dark:text-orange-300">${today.sunset}</span>
            </div>
        `;

        const airBadge = `
            <div class="weather-badge bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl flex flex-col items-center min-w-[85px] shadow-sm border border-emerald-200/50 dark:border-emerald-900/50">
                <span class="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">Αέρας Βουνού</span>
                <span class="text-sm mt-0.5">🍃</span>
                <span class="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">${airLabel.split(' ')[1]}</span>
            </div>
        `;

        // Καθαρισμός του container και σχεδίαση όλων των badges μαζί στην ίδια σειρά
        weatherContainer.innerHTML = 
            renderWeatherBadge('ΣΗΜΕΡΑ', today.max, today.min, today.code) +
            renderWeatherBadge('ΑΥΡΙΟ', tomorrow.max, tomorrow.min, tomorrow.code) +
            uvBadge +
            sunBadge +
            airBadge;

        // Επιστροφή του hint για το AI
        return generateWeatherHint(today.code);

    } catch (error) {
        console.error("Error loading weather/environment details:", error);
        weatherContainer.innerHTML = `<p class="text-xs text-gray-400">Live δεδομένα περιβάλλοντος προσωρινά μη διαθέσιμα</p>`;
        return "";
    }
}