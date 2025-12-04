// requestManager.js (Simple RPM + RPD limiter)

// Default limits
const DEFAULT_RPM = 10;    // 10 requests per minute
const DEFAULT_RPD = 250;   // 250 requests per day

let LIMIT_RPM = DEFAULT_RPM;
let LIMIT_RPD = DEFAULT_RPD;

// Load history from localStorage
function loadState() {
    const raw = localStorage.getItem("requestManagerState");
    if (!raw) return {
        minute: [],
        daily: { date: null, count: 0 }
    };

    try {
        return JSON.parse(raw);
    } catch {
        return {
            minute: [],
            daily: { date: null, count: 0 }
        };
    }
}

// Save state
function saveState(state) {
    localStorage.setItem("requestManagerState", JSON.stringify(state));
}

// Remove entries older than 60s
function trimMinute(arr) {
    const now = Date.now();
    return arr.filter(ts => now - ts < 60 * 1000);
}

export function initRequestManager(options = {}) {
    LIMIT_RPM = options.rpm || DEFAULT_RPM;
    LIMIT_RPD = options.rpd || DEFAULT_RPD;

    // initialize state if needed
    const s = loadState();
    saveState(s);

    return {
        rpm: LIMIT_RPM,
        rpd: LIMIT_RPD
    };
}

// Main check
export function canSendRequest() {
    const now = Date.now();
    const today = new Date().toDateString();

    const state = loadState();

    // Trim minute history
    state.minute = trimMinute(state.minute);
    const minuteCount = state.minute.length;

    // Daily
    let dailyCount = (state.daily.date === today) ? state.daily.count : 0;

    // Check RPM
    if (minuteCount >= LIMIT_RPM) {
        // Calculate when user can send again
        const oldestTs = state.minute[0];
        const retryAfterSec = Math.ceil((60 * 1000 - (now - oldestTs)) / 1000);
        return { ok: false, reason: "rpm", retryAfterSec };
    }

    // Check RPD
    if (dailyCount >= LIMIT_RPD) {
        return { ok: false, reason: "rpd" };
    }

    return { ok: true, minuteCount, dailyCount };
}

// Record successful request
export function recordRequest() {
    const now = Date.now();
    const today = new Date().toDateString();

    const state = loadState();

    // Update minute
    state.minute = trimMinute(state.minute);
    state.minute.push(now);

    // Update daily
    if (state.daily.date !== today) {
        state.daily = { date: today, count: 0 };
    }
    state.daily.count += 1;

    // Save
    saveState(state);
}
