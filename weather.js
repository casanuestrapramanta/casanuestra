// weather.js

/**
 * Weather Module Configuration (Pramanta, Tzoumerka)
 */
const PRAMANTA_LAT = 39.5237; 
const PRAMANTA_LON = 21.1037;

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

    } catch (error) {
        console.error('Error fetching weather:', error);
        weatherContainer.innerHTML = `<p class="text-red-500">Αποτυχία φόρτωσης καιρού.</p>`;
    }
}