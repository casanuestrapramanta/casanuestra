// ΝΕΟ: Εισαγωγή του module καιρού
import { fetchAndRenderWeather } from './weather.js';

// Περιμένουμε μέχρι να φορτωθεί πλήρως το DOM πριν εκτελέσουμε το script
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Αναφορά στα DOM Elements (Στοιχεία του HTML) ---
    const categoryView = document.getElementById('category-view');
    const chatView = document.getElementById('chat-view');
    const categoryButtons = document.querySelectorAll('.category-button');
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const loadingSpinner = document.getElementById('loading-spinner');
    const backButton = document.getElementById('back-button');
    const headerSubtitle = document.getElementById('header-subtitle');

    // --- 2. State (Κατάσταση Εφαρμογής) ---
    let currentCategory = null; 
    let currentCategoryTitle = null;
    let isSending = false; // Μεταβλητή για αποφυγή πολλαπλών αιτημάτων (Debounce)

    // --- 3. API Config (Διαμόρφωση Σύνδεσης) ---
    const ourServerUrl = 'https://casanuestra.onrender.com/chat';
    //const ourServerUrl = 'http://localhost:3000/chat'; // Uncomment for local development

    // --- 4. Βοηθητικές Συναρτήσεις ---

    /**
     * Εμφανίζει την αρχική οθόνη επιλογής κατηγορίας
     */
    function showCategoryView() {
        chatView.classList.add('hidden');
        categoryView.classList.remove('hidden');
        currentCategory = null;
        currentCategoryTitle = null;
        
        // Καθαρισμός του ιστορικού chat
        chatMessages.innerHTML = '';
        headerSubtitle.textContent = 'Επιλέξτε μια κατηγορία για να ξεκινήσετε...';
    }

    /**
     * Εμφανίζει την οθόνη συνομιλίας
     * @param {string} category - Η επιλεγμένη κατηγορία
     * @param {string} title - Ο τίτλος της κατηγορίας για την επικεφαλίδα
     */
    function showChatView(category, title) {
        currentCategory = category;
        currentCategoryTitle = title;
        categoryView.classList.add('hidden');
        chatView.classList.remove('hidden');
        headerSubtitle.textContent = `Μιλάτε για: ${title}`;
        
        // --- ΔΙΟΡΘΩΣΗ: Αφαίρεση αυτόματου μηνύματος (για να μην χαθεί το AI context - ❗1) ---
        // Αντί να στέλνουμε query, εμφανίζουμε ένα μήνυμα καλωσορίσματος:
        addMessage(`Καλώς ήρθατε! Είμαι ο Ψηφιακός Βοηθός της Casa Nuestra. Τι θα θέλατε να σας προτείνω σχετικά με: **${title}**;`, 'system');
    }

    /**
     * Διορθώνει (unescapes) βασικές HTML entities που μπορεί να στείλει το AI (π.χ. &lt; -> <).
     * Αυτό εξασφαλίζει ότι το HTML της κάρτας θα αναγνωριστεί σωστά (❗2).
     * @param {string} str - Η συμβολοσειρά προς διόρθωση
     * @returns {string} Η διορθωμένη συμβολοσειρά
     */
    function unescapeHtml(str) {
        if (!str || typeof str !== 'string') return str;
        // Χρησιμοποιούμε regex για να αντικαταστήσουμε τα βασικά escape sequences
        return str
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&'); // Πρέπει να είναι το τελευταίο
    }
    
    /**
     * Διαχειρίζεται την αποστολή του μηνύματος
     * @param {string} query - Το κείμενο ερωτήματος του χρήστη
     */
    async function sendMessage(query) {
        if (!query.trim() || isSending) return;

        const userQueryText = query.trim();

        // 1. Εμφάνιση μηνύματος χρήστη
        addMessage(userQueryText, 'user');
        
        // 2. Ετοιμασία και εμφάνιση loading
        isSending = true;
        messageInput.disabled = true;
        sendButton.disabled = true;
        loadingSpinner.classList.remove('hidden');

        try {
            // 3. Κατασκευή του payload. Χρησιμοποιούμε τα ονόματα που περιμένει το server.js.
            const payload = {
                userQuery: userQueryText, // Ευθυγράμμιση με το server.js
                category: currentCategory
            };

            // 4. Κλήση του Back-End (server.js)
            const response = await fetch(ourServerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            
            // 5. Εμφάνιση της απάντησης του AI
            processAIResponse(data.text);
            
            // 6. Καθαρισμός input και focus μόνο μετά από επιτυχή αποστολή
            messageInput.value = ''; 
            messageInput.focus();


        } catch (error) {
            console.error('Error sending message:', error);
            // Εμφάνιση μηνύματος σφάλματος στον χρήστη
            addMessage(`Λυπάμαι, αντιμετωπίσαμε ένα πρόβλημα κατά την επεξεργασία του αιτήματός σας: ${error.message}. Παρακαλώ δοκιμάστε ξανά.`, 'system');
        } finally {
            // 7. Τερματισμός loading state
            isSending = false;
            messageInput.disabled = false;
            sendButton.disabled = false;
            loadingSpinner.classList.add('hidden');
        }
    }

    /**
     * Αναλύει την απάντηση του AI, διαχωρίζει τις Magic Cards από το κείμενο
     * και τις εμφανίζει.
     * @param {string} aiText - Η raw απάντηση από το AI
     */
    function processAIResponse(aiText) {
        // Χρησιμοποιούμε regex για να βρούμε τα tags [MAGIC_CARDS]...[/MAGIC_CARDS]
        const cardRegex = /\[MAGIC_CARDS\]([\s\S]*?)\[\/MAGIC_CARDS\]/g;
        let cardMatch;
        let lastIndex = 0;
        
        // Διορθώνουμε πιθανό escape-αρισμένο HTML στην αρχή
        const unescapedText = unescapeHtml(aiText);

        while ((cardMatch = cardRegex.exec(unescapedText)) !== null) {
            const cardBlock = cardMatch[0]; // Όλο το μπλοκ [MAGIC_CARDS]...[/MAGIC_CARDS]
            const jsonString = cardMatch[1].trim(); // Το JSON string

            // 1. Εμφάνιση προηγούμενου κειμένου (αν υπάρχει)
            const precedingText = unescapedText.substring(lastIndex, cardMatch.index).trim();
            if (precedingText) {
                addMessage(precedingText, 'system');
            }

            // 2. Επεξεργασία και εμφάνιση Magic Cards
            try {
                // To JSON.parse() διαχειρίζεται σωστά το array ή το μονό object
                const cardsData = JSON.parse(jsonString); 
                
                if (Array.isArray(cardsData)) {
                    // Αν είναι πίνακας (2 ή περισσότερες κάρτες)
                    addMessage(renderMultipleCards(cardsData), 'system');
                } else if (typeof cardsData === 'object' && cardsData !== null) {
                    // Αν είναι μονό object
                    addMessage(renderMagicCard(cardsData), 'system');
                }
            } catch (e) {
                console.error('Error parsing Magic Card JSON:', e, jsonString);
                // Αν αποτύχει το parsing, εμφανίζουμε το μπλοκ ως απλό κείμενο
                addMessage(cardBlock, 'system');
            }

            lastIndex = cardMatch.index + cardMatch[0].length;
        }

        // 3. Εμφάνιση τυχόν υπολειπόμενου κειμένου μετά τις κάρτες
        const remainingText = unescapedText.substring(lastIndex).trim();
        if (remainingText) {
            addMessage(remainingText, 'system');
        }
    }


    /**
     * Προσθέτει ένα νέο μήνυμα στον χώρο συνομιλίας
     * @param {string} message - Το κείμενο (ή HTML) του μηνύματος
     * @param {string} sender - 'user' ή 'system'
     */
    function addMessage(message, sender, sources = []) {
        const messageWrapper = document.createElement('div');
        messageWrapper.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`;

        const messageBubble = document.createElement('div');
        messageBubble.className = `rounded-2xl p-4 max-w-xs lg:max-w-md shadow-sm ${
            sender === 'user' 
                ? 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 rounded-br-none' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'
        }`;

        // Χρησιμοποιούμε Regular Expression για να αγνοήσουμε τα κενά/αλλαγές γραμμής.
        const isMagicCard = /restaurant-card/.test(message);

        let formattedMessage;

        if (isMagicCard) {
            // Αν είναι κάρτα, το αφήνουμε ως raw HTML
            formattedMessage = message;
        } else {
            // Αν είναι απλό κείμενο, εφαρμόζουμε Markdown formatting
            formattedMessage = message
                // Bold: **text**
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                // Italic: *text*
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                // Links: [text](url)
                .replace(/\[(.*?)\]\((.*?)\)/g,
                    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-green-700 dark:text-green-400 hover:underline">$1</a>'
                )
                // Auto-detect Images: Μετατροπή URL εικόνων σε <img> tags
                .replace(/(?<!href=")((https?:\/\/)[^\s]+(\.png|\.jpg|\.jpeg|\.gif|\.webp))/gi,
                    '<img src="$1" alt="Chat Image" class="max-w-xs rounded-lg shadow-sm mt-2" style="max-height: 200px;">'
                )
                // Λίστες: - item (Μετατροπή σε <ul>/<li>)
                .replace(/\n- (.*)/g, '<ul class="list-disc list-inside ml-4"><li>$1</li></ul>')
                // Καθαρισμός διπλών <ul> tags
                .replace(/<\/ul>\n<ul class="list-disc list-inside ml-4">/g, '');
        }

        messageBubble.innerHTML = formattedMessage;
        messageWrapper.appendChild(messageBubble);
        chatMessages.appendChild(messageWrapper);
        
        // --- ΒΕΛΤΙΩΣΗ: requestAnimationFrame για ομαλό scroll (❗5) ---
        window.requestAnimationFrame(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }


    /**
     * Δημιουργεί το HTML για μία μονή Magic Card (με Tailwind CSS)
     * @param {object} data - Τα δεδομένα του εστιατορίου από το JSON
     * @returns {string} Το HTML string της κάρτας
     */
    function renderMagicCard(data) {
        // ... (Ο κώδικας renderMagicCard παραμένει ο ίδιος, αφού είναι ήδη διορθωμένος με z-index και σωστό src)
        const cleanedPhone = data.phone ? data.phone.replace(/[\s\(\)]/g, '') : null;
        const photoUrl = data.photo && data.photo.trim() !== "" ? data.photo : null;
        
        const cardHtml = `
            <div class="restaurant-card my-6 rounded-2xl shadow-2xl overflow-hidden relative">

                ${photoUrl 
                    ? `<img src="${photoUrl}" alt="${data.name}" class="absolute inset-0 w-full h-full object-cover object-center z-0">`
                    : `<div class="absolute inset-0 bg-gradient-to-br from-green-700 via-green-900 to-gray-900 z-0"></div>`
                }
                
                <div class="absolute inset-0 bg-black opacity-60 z-10"></div>

                <div class="relative z-20 p-6 text-white">
                    <h2 class="text-3xl font-bold mb-1">${data.name || 'Άγνωστο'}</h2>
                    <p class="text-xl opacity-90 mb-5">${data.location || ''}</p>
                    <p class="text-sm leading-relaxed opacity-95 mb-5">${data.description || ''}</p>

                    <div class="flex items-center gap-4 mb-6">
                        ${data.rating ? `<span class="text-yellow-400 text-lg">⭐ ${data.rating}</span>` : ''}
                        ${data.price ? `<span class="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">${data.price}</span>` : ''}
                    </div>

                    ${data.specialties ? `<p class="text-sm opacity-90 mb-7">Διάσημο για: ${data.specialties}</p>` : ''}

                    <div class="grid grid-cols-2 gap-4">
                        ${data.maps ? 
                            `<a href="${data.maps}" target="_blank" rel="noopener noreferrer" class="bg-white text-green-800 text-center py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition">
                                Πλοήγηση τώρα
                            </a>` : ''}
                        ${cleanedPhone ? 
                            `<a href="tel:${cleanedPhone}" class="bg-white text-green-800 text-center py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition">
                                Καλέστε
                            </a>` : ''}
                    </div>
                </div>
            </div>`;
        return cardHtml;
    }


    /**
     * Δημιουργεί το HTML για πολλαπλές κάρτες, καλώντας την renderMagicCard
     */
    function renderMultipleCards(cardsArray) {
        let html = '';
        cardsArray.forEach(card => {
            html += renderMagicCard(card);
        });
        return html;
    }


    // --- 5. Event Listeners (Ακροατές Γεγονότων) ---
    
    // Έναρξη συνομιλίας όταν επιλέγεται κατηγορία
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.dataset.category;
            const title = button.textContent.trim();
            showChatView(category, title);
        });
    });

    // Αποστολή μηνύματος με το κουμπί
    sendButton.addEventListener('click', () => {
        sendMessage(messageInput.value);
    });

    // --- ΔΙΟΡΘΩΣΗ: Χρήση keydown αντί για keypress (Deprecated - ❗4) ---
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Αποφυγή νέας γραμμής
            sendMessage(messageInput.value);
        }
    });
    
    // Κουμπί επιστροφής στην αρχική οθόνη
    backButton.addEventListener('click', showCategoryView);


    // --- 6. Αρχική Εκκίνηση ---
    showCategoryView(); // Ξεκινάμε με την οθόνη επιλογής κατηγορίας
    // ΝΕΟ: Κλήση για φόρτωση του καιρού
    fetchAndRenderWeather('weather-badges-container');
});