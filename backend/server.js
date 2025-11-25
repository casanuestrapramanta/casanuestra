/* --- Step 1: Import necessary tools --- */
// 'dotenv' MUST be at the very top. It loads your secret API key.
require('dotenv').config();



const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/* --- Step 2: Initialize AI --- */
const apiKey = process.env.GEMINI_API_KEY;

// ---------------------------------------------------------
// STEP 1: BASIC INPUT VALIDATION FUNCTION
// This function checks that the inputs coming from the client
// are safe and reasonable. This prevents errors or attacks.
// ---------------------------------------------------------
function validateBasicInput(category, userQuery) {

    // Check if category exists and is a string
    if (!category || typeof category !== "string") {
        return false;
    }

    // Allow only letters, numbers, hyphens, and underscores
    // This prevents path traversal (e.g., "../etc/passwd")
    if (!/^[a-zA-Z0-9_\-]+$/.test(category)) {
        return false;
    }

    // Check if userQuery exists and is a string
    if (!userQuery || typeof userQuery !== "string") {
        return false;
    }

    // Reject empty messages
    if (userQuery.trim().length === 0) {
        return false;
    }

    // Limit the message length (prevents huge payloads)
    if (userQuery.length > 1500) {
        return false;
    }

    // If everything is OK, return true
    return true;
}


if (!apiKey) {
    console.error('FATAL ERROR: GEMINI_API_KEY is not defined in your .env file.');
    console.log('Please create a backend/.env file and add your key.');
    process.exit(1); // Stops the server
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-09-2025"
});
console.log("Gemini AI model initialized successfully.");


/* --- Step 3: Setup your server --- */
const app = express();
const port = 3000;

const csvCache = {};         // storage for cached CSV per category
const CSV_CACHE_TTL = 1000 * 60 * 5; // 5 minutes lifetime

app.use(express.json());
app.use(cors());

/* --- Step 4: Helper Functions (AI and Utilities) --- */

/**
 * A simple "sleep" function to wait for a number of milliseconds.
 * We use this for our retry logic.
 * @param {number} ms - Milliseconds to wait
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Smart function to call the AI with automatic retries.
 * This will try 3 times if the server is busy (503 error).
 * @param {string} promptText - The full prompt to send to the AI
 */
async function generateContentWithRetry(promptText) {
    const maxRetries = 3;
    let attempt = 0;
    let delay = 1000; // Start with a 1 second delay

    while (attempt < maxRetries) {
        try {
            // This is the normal call to the AI
            const result = await model.generateContent(promptText);
            return result; // Success! Return the result immediately.

        } catch (error) {
            // Check if this is a "503 Server Overloaded" error
            if (error.message && error.message.includes('503')) {
                attempt++;
                if (attempt >= maxRetries) {
                    // We've tried 3 times and failed. Give up.
                    console.error("AI model is still overloaded after 3 attempts. Throwing error.");
                    throw error; // Throw the error to be caught by the '/chat' endpoint
                }

                console.warn(`Warning: AI model is overloaded (503). Retrying in ${delay / 1000}s... (Attempt ${attempt}/${maxRetries})`);
                await sleep(delay);
                delay *= 2; // Double the delay for next time (exponential backoff)
            } else {
                // This is a different error (like a 400 or 500).
                // Don't retry, just throw it immediately.
                throw error;
            }
        }
    }
}

/* --- Step 5: Helper Functions (RAG Pipeline) --- */

/**
 * PROPOSAL 4: Loads AND cleans CSV data for a specific category.
 * This function now handles the data sanitization *once* on load.
 * @param {string} csvFilePath - The path to the CSV file to read.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of data rows.
 */
async function loadAndCleanCsvData(csvFilePath) {
    

    // ---------------------------------------------------------
    // STEP 2B: CHECK CACHE BEFORE READING FILE
    // If CSV is already stored in csvCache and not expired,
    // return it instantly (much faster than reading from disk).
    // ---------------------------------------------------------
    const now = Date.now();
    const cached = csvCache[csvFilePath];

    if (cached && (now - cached.timestamp < CSV_CACHE_TTL)) {
        console.log("✔ Loaded CSV from cache:", csvFilePath);
        return cached.data; // return the cached CSV
    }

    // If not cached OR cache expired, read file from disk:
    console.log("⏳ Reading CSV from disk:", csvFilePath);

    const csvData = [];

    const stream = fs.createReadStream(csvFilePath).pipe(csv({ separator: ';' }));

    for await (const row of stream) {

        csvData.push(row);
    }
        // ---------------------------------------------------------
    // SAVE RESULT INTO CACHE FOR NEXT TIME
    // ---------------------------------------------------------
    csvCache[csvFilePath] = {
        timestamp: now,
        data: csvData
    };

    return csvData;
}

/**
 * PROPOSAL 3: Builds the final prompt string.
 * This function handles the "Augmentation" step.
 * @param {string} promptFilePath - Path to the prompt template file.
 * @param {Array<Object>} csvData - The cleaned CSV data.
 * @param {string} userQuery - The user's question.
 * @returns {string} The complete prompt text to be sent to the AI.
 */
function buildPrompt(promptFilePath, csvData, userQuery) {
    let promptText = fs.readFileSync(promptFilePath, 'utf8');

    // Augment the prompt with data and user query
    const csvDataString = JSON.stringify(csvData, null, 2);
    promptText = promptText.replace('{CSV_DATA_GOES_HERE}', csvDataString);
    promptText = promptText.replace('{USER_QUERY_GOES_HERE}', userQuery);

    return promptText;
}

/**
 * PROPOSAL 3: Finds relevant source links from the AI's response.
 * This function handles the "post-processing" step.
 * @param {string} aiText - The text generated by the AI.
 * @param {Array<Object>} csvData - The data used to generate the response.
 * @returns {Array<Object>} An array of source objects (e.g., { title, uri }).
 */
function findSources(aiText, csvData) {
    console.log("Searching for backlinks...");
    const sources = [];
    const foundNames = new Set(); // To avoid adding the same link twice

    for (const row of csvData) {
        // Check if the AI's text mentions this row's 'Name'
        if (row.Name && aiText.toLowerCase().includes(row.Name.toLowerCase())) {

            // Check for Website link
            if (row.Website && row.Website.startsWith('http') && !foundNames.has(row.Name)) {
                sources.push({
                    title: `${row.Name} - Website`,
                    uri: row.Website
                });
                foundNames.add(row.Name); // Mark this name as found
            }
            // Check for Social_Media link
            if (row.Social_Media && row.Social_Media.startsWith('http') && !foundNames.has(row.Name)) {
                sources.push({
                    title: `${row.Name} - Social Media`,
                    uri: row.Social_Media
                });
                foundNames.add(row.Name); // Mark this name as found
            }
        }
    }
    console.log(`Found ${sources.length} relevant links.`);
    return sources;
}
 

/* --- Step 6: Create your "/chat" Endpoint (Refactored) --- */

/**
 * PROPOSAL 3: The main /chat endpoint is now a clean pipeline
 * that calls the helper functions.
 */
app.post('/chat', async (req, res) => {

    try {
        const userQuery = req.body.userQuery;
        const category = req.body.category;
        console.log(`Received message about '${category}': ${userQuery}`);
        // ---------------------------------------------------------
        // STEP 1: VALIDATE INPUTS BEFORE DOING ANY PROCESSING
        // If validation fails, return an error message safely.
        // ---------------------------------------------------------
        if (!validateBasicInput(category, userQuery)) {
            return res.status(400).json({
                text: "Invalid input. Please refine your request.",
                sources: [] // keep the structure so frontend is safe
            });
        }


        // --- 1. RETRIEVE (and Clean) ---
        // (Note: This still reads from disk on every request, per your choice)
        const csvFilePath = path.join(__dirname, 'data', `${category}.csv`);
        const csvData = await loadAndCleanCsvData(csvFilePath); // Now uses Proposal 4's logic
        console.log(`Read and cleaned ${csvData.length} rows from ${category}.csv`);

        // --- 2. AUGMENT ---
        const promptFilePath = path.join(__dirname, 'data', `${category}.txt`);
        const promptText = buildPrompt(promptFilePath, csvData, userQuery);

        console.log("--- FINAL PROMPT SENT TO AI ---");
        // console.log(promptText); // Uncomment this if you want to see the giant prompt
        console.log("-------------------------------");

        // --- 3. GENERATE (with Retry) ---
        const result = await generateContentWithRetry(promptText);
        const aiResponse = result.response;
        const aiText = aiResponse.text();

        console.log("--- AI RESPONSE RECEIVED ---");
        console.log(aiText);
        console.log("----------------------------");

        // --- 4. POST-PROCESS (Find Links) ---
        const sources = findSources(aiText, csvData);

        // --- 5. RESPOND ---
        const botResponse = {
            text: aiText,
            sources: sources
        };
        res.json(botResponse);

    } catch (error) {
        // 4. If any file is missing OR the AI fails
        console.error("Error in /chat endpoint:", error.message);
        const botResponse = {
            text: `I'm sorry, I had a problem processing that request. (Error: ${error.message})`,
            sources: []
        };
        res.status(500).json(botResponse);
    }
});

/* --- Step 7: Start the server --- */
app.listen(port, () => {
    console.log(`Server is running successfully on http://localhost:${port}`);
    console.log('You can now open your index.html (with Live Server) in the browser.');
});