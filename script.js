// Wait for the DOM to be fully loaded before running our script
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    // (Same as before)
    const categoryView = document.getElementById('category-view');
    const chatView = document.getElementById('chat-view');
    const categoryButtons = document.querySelectorAll('.category-button');
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const loadingSpinner = document.getElementById('loading-spinner');
    const backButton = document.getElementById('back-button');
    const headerSubtitle = document.getElementById('header-subtitle');



    // --- State ---
    // (Same as before)
    let currentCategory = null; 
    let currentCategoryTitle = null;

    // --- NEW API Config ---
    // We NO LONGER call Google directly. We call our OWN server.
    //const ourServerUrl = 'https://casanuestra.onrender.com/chat';
    const ourServerUrl = 'http://localhost:3000/chat'
    // --- Functions ---

    /**
     * Shows the main category selection view
     */
    function showCategoryView() {
        // (This function is unchanged)
        chatView.classList.add('hidden');
        categoryView.classList.remove('hidden');
        currentCategory = null;
        currentCategoryTitle = null;
        chatMessages.innerHTML = ''; 
        headerSubtitle.textContent = "Your guide to Pramanta & Tzoumerka"; 
    }

    /**
     * Shows the chat view for a specific category
     * @param {string} categoryKey - The category key (e.g., 'food')
     * @param {string} categoryTitle - The display title (e.g., 'Φαγητό')
     */
    function showChatView(categoryKey, categoryTitle) {
        // (This function is unchanged)
        currentCategory = categoryKey;
        currentCategoryTitle = categoryTitle;
        
        
        categoryView.classList.add('hidden');
        chatView.classList.remove('hidden');
        
        chatMessages.innerHTML = '';
        headerSubtitle.textContent = `Topic: ${categoryTitle}`; 
        messageInput.placeholder = `Ask about ${categoryTitle}...`; 

        let welcomeMsg = `Έχεις επιλέξει '${categoryTitle}'. Πώς μπορώ να σε βοηθήσω να βρεις τo καλύτερo ${categoryTitle} στην περιοχή των Πραμάντων;`;
        addMessage(welcomeMsg, 'assistant');
    }

    /**
     * Adds a message to the chat interface.
     * @param {string} message - The text content of the message.
     * @param {'user' | 'assistant'} sender - The sender of the message.
     * @param {Array<Object>} sources - Array of source objects from grounding.
     */
    function addMessage(message, sender, sources = []) {
        // (This function is unchanged)
        const messageWrapper = document.createElement('div');
        messageWrapper.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`;
        
        const messageBubble = document.createElement('div');
        messageBubble.className = `rounded-2xl p-4 max-w-xs lg:max-w-md shadow-sm ${
            sender === 'user' 
            ? 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 rounded-br-none' 
            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'
        }`;

        let formattedMessage = message
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // --- ADD THIS NEW LINE ---
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-green-700 dark:text-green-400 hover:underline">$1</a>') // This finds [text](url) links
            // --- END OF NEW LINE ---
            // --- NEW RULE ADDED ---
            // 4. Standalone Image Links: https://.../image.png -> <img src="...">
            //    This runs *after* the link replacer so it doesn't break links.
            //    It looks for URLs ending in image extensions that are NOT inside href="...".
            .replace(/(?<!href=")(https?:\/\/[^\s]+(\.png|\.jpg|\.jpeg|\.gif|\.webp))/gi, '<img src="$1" alt="Chat Image" class="max-w-xs rounded-lg shadow-sm mt-2" style="max-height: 200px;">')
            // --- END OF NEW RULE ---
            .replace(/\n- (.*)/g, '<ul class="list-disc list-inside ml-4"><li>$1</li></ul>')
            .replace(/<\/ul>\n<ul class="list-disc list-inside ml-4">/g, '');

        messageBubble.innerHTML = formattedMessage;

        if (sources.length > 0) {
            const sourcesContainer = document.createElement('div');
            sourcesContainer.className = 'mt-3 pt-3 border-t border-gray-300 dark:border-gray-600';
            
            const sourcesTitle = document.createElement('h4');
            sourcesTitle.className = 'text-xs font-semibold mb-1 opacity-80';
            sourcesTitle.textContent = 'For more info:';
            sourcesContainer.appendChild(sourcesTitle);

            const sourcesList = document.createElement('ul');
            sourcesList.className = 'list-none space-y-1';
            
            sources.forEach((source, index) => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = source.uri;
                a.textContent = `${index + 1}. ${source.title}`;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.className = 'text-xs text-green-700 dark:text-green-400 hover:underline truncate block';
                li.appendChild(a);
                sourcesList.appendChild(li);
            });
            sourcesContainer.appendChild(sourcesList);
            messageBubble.appendChild(sourcesContainer);
        }

        messageWrapper.appendChild(messageBubble);
        chatMessages.appendChild(messageWrapper);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Gets a response from our NEW backend server.
     * @param {string} query - The user's query.
     */
    async function getBotResponse(query) {
        loadingSpinner.classList.remove('hidden');

        // This is the data we will send to our server as JSON
        const payload = {
            query: query,
            category: currentCategory // We also send the selected category
        };

        try {
            // --- THIS IS THE MAIN CHANGE ---
            // We now 'fetch' from our OWN server, not Google's
            const response = await fetch(ourServerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload) // Send the user's query and category
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Get the JSON response from our server
            // This will be our "dummy" message for now
            //const result = await response.json(); 
            
            // Add the server's test message to the chat
            //addMessage(result.text, 'assistant', result.sources);
            //------------------------------------------------------------------------------------
            // Get the JSON response from our server
            const result = await response.json(); 
            let botMessageHtml = result.text; // Start with the raw text from the AI

            // --- 1. CHECK FOR [MAGIC_CARD] (Single Recommendation) ---
            if (botMessageHtml.includes('[MAGIC_CARD]') && botMessageHtml.includes('[/MAGIC_CARD]')) {
                // Use regex to safely capture the JSON string between the tags
                const match = botMessageHtml.match(/\[MAGIC_CARD\]\s*(\{[\s\S]*?\})\s*\[\/MAGIC_CARD\]/);
                if (match && match[1]) {
                    const jsonStr = match[1];
                    try {
                        const data = JSON.parse(jsonStr);
                        // Replace the entire tag block with the rendered HTML card
                        botMessageHtml = botMessageHtml.replace(match[0], renderMagicCard(data));
                    } catch(e) { 
                        console.error("JSON parse error in MAGIC_CARD:", e); 
                    }
                }
            }
            // --- 2. CHECK FOR [MAGIC_CARDS] (Multiple Recommendations) ---
            else if (botMessageHtml.includes('[MAGIC_CARDS]') && botMessageHtml.includes('[/MAGIC_CARDS]')) {
                // Use regex to safely capture the JSON array string between the tags
                const match = botMessageHtml.match(/\[MAGIC_CARDS\]\s*(\[[\s\S]*?\])\s*\[\/MAGIC_CARDS\]/);
                if (match && match[1]) {
                    const jsonStr = match[1];
                    try {
                        const cards = JSON.parse(jsonStr);
                        if (Array.isArray(cards) && cards.length > 0) {
                            // Replace the entire tag block with the rendered HTML cards
                            botMessageHtml = botMessageHtml.replace(match[0], renderMultipleCards(cards));
                        }
                    } catch(e) { 
                        console.error("JSON parse error in MAGIC_CARDS:", e); 
                    }
                }
            }

            // Add the final processed message (which now contains the card HTML) to the chat
            addMessage(botMessageHtml, 'assistant', result.sources);
//------------------------------------------------------------------------------------------------------------------------
        } catch (error) {
            console.error('Error fetching bot response from our server:', error);
            addMessage("I'm having trouble connecting to my server. Please make sure it's running.", 'assistant');
        } finally {
            loadingSpinner.classList.add('hidden');
        }
    }

    /**
     * Handles sending a message (from button click or Enter key).
     */
    function sendMessage() {
        // (This function is unchanged)
        const query = messageInput.value.trim();
        if (query === "") return;

        addMessage(query, 'user');
        messageInput.value = "";
        
        getBotResponse(query);
    }

    // --- Event Listeners ---
    // (All unchanged)
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            const categoryKey = button.dataset.category;
            const categoryTitle = button.dataset.title;
            showChatView(categoryKey, categoryTitle);
        });
    });
    backButton.addEventListener('click', showCategoryView);
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // --- Initial State ---
    showCategoryView();

    // —— MAGIC CARD RENDERER (για φαγητό, αξιοθέατα, κλπ) ——
    function renderMagicCard(data) {
        // data = { name, location, description, rating, price, specialties, photo, maps, phone }
        const photoUrl = data.photo && data.photo.trim() !== "" 
            ? data.photo 
            : null;
        
        // Clean up phone number for 'tel:' link
        const cleanedPhone = data.phone ? data.phone.replace(/[^0-9+]/g, '') : null;
        
        const cardHtml = `
        <div class="restaurant-card my-6 rounded-2xl shadow-2xl overflow-hidden relative">
            ${photoUrl 
                ? `<div class="absolute inset-0 bg-cover bg-center" style="background-image:url('${photoUrl}')"></div>`
                : `<div class="absolute inset-0 bg-gradient-to-br from-green-700 via-green-900 to-gray-900"></div>`
            }
            <div class="absolute inset-0 bg-black ${photoUrl ? 'opacity-50' : 'opacity-70'}"></div>
                    
            <div class="relative z-10 p-6 text-white">
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
                        </a>` : ''
                    }
                    ${cleanedPhone ? 
                        `<a href="tel:${cleanedPhone}" class="bg-white text-green-800 text-center py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition">
                            Καλέστε
                        </a>` : ''
                    }
                </div>
            </div>
        </div>`;
        return cardHtml;
    }

    // — Πολλαπλές προτάσεις (2+): κάνει render όλες κάτω-κάτω —
    function renderMultipleCards(cardsArray) {
        let html = '';
        cardsArray.forEach(card => {
            html += renderMagicCard(card);
        });
        return html;
    }

});