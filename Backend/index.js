import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json' with { type: 'json' };
import path from 'path';
import { fileURLToPath } from 'url';
import gameRoutes from './routes/gameRoutes.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

countries.registerLocale(enLocale);
dotenv.config();

const app = express();
const API_KEY = process.env.YOUTUBE_API_KEY;

// --- Global Variables & Optimization Caches ---
let activeChatId = null;
let nextPageToken = null;
let processedMessageIds = new Set();
let countryCache = {}; // Fast lookup for country codes
let countryRegex = null; // Optimized regex for name matching

// Poori duniya ki countries ke saare possible names (Short, Official, Aliases)
const allCountryData = countries.getNames("en"); 
const worldCandidates = Object.values(allCountryData);

let gameState = {
    isRoundActive: true,
    candidates: worldCandidates, 
    votes: {},
    timer: 30,
};
app.use(cors({
    origin: ["http://localhost:5173", "https://flag-battle-38g6.vercel.app"],
    credentials: true
}));
app.use(express.json());
app.use('/', gameRoutes); 
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'controller.html'));
});

const updateCountryRegex = () => {
    // Saare mulkon ke names ko sort karein (lambe naam pehle) taaki sahi matching ho
    const sortedCandidates = [...gameState.candidates].sort((a, b) => b.length - a.length);
    
    const pattern = sortedCandidates
        .map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) 
        .map(c => `\\b${c}\\b`)
        .join('|');
    
    // Isme "US", "UK", "PK" bhi add kar dete hain automatically
    const extraPattern = `|\\bPK\\b|\\bUS\\b|\\bUK\\b|\\bIN\\b|\\bUAE\\b`;
    
    countryRegex = new RegExp(`(${pattern}${extraPattern})`, 'i');
};
updateCountryRegex(); 

const getCountryCodeFromFlag = (emoji) => {
    const codePoints = [...emoji].map(char => char.codePointAt(0));

    if (
        codePoints.length === 2 &&
        codePoints.every(cp => cp >= 127462 && cp <= 127487)
    ) {
        return String.fromCharCode(
            codePoints[0] - 127397,
            codePoints[1] - 127397
        ).toLowerCase();
    }

    return null;
};


const getCountryCodeFast = (name) => {
    const lowName = name.toLowerCase().trim();
    if (countryCache[lowName]) return countryCache[lowName];


    let code = countries.getAlpha2Code(name, 'en');

    // 2. Automatic Fix: Agar direct na mile, to saari countries mein dhoondein
    if (!code) {
        const allNames = countries.getNames("en");
        code = Object.keys(allNames).find(key => 
            allNames[key].toLowerCase() === lowName || 
            key.toLowerCase() === lowName // Ye "US", "PK" jaise codes ko bhi handle kar lega
        );
    }

    const finalCode = code ? code.toLowerCase() : null;

    countryCache[lowName] = finalCode;
    return finalCode;
};
// --- YouTube Logic ---
const getActiveChatId = async (videoId) => {
    try {
        const res = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${API_KEY}`);
        if (res.data.items?.[0]) {
            activeChatId = res.data.items[0].liveStreamingDetails.activeLiveChatId;
            nextPageToken = null;
            processedMessageIds.clear();
            console.log("SYSTEM: Live Chat Connected:", activeChatId);
            return true;
        }
        return false;
    } catch (err) {
        console.error("ERROR: YouTube connection failed.");
        return false;
    }
};

app.post('/set-video', async (req, res) => {
    const { videoId } = req.body;
    if (!videoId) return res.status(400).json({ error: "Video ID missing" });
    const success = await getActiveChatId(videoId);
    success ? res.json({ message: "Updated", chatId: activeChatId }) : res.status(500).json({ error: "Failed" });
});


const syncChatVotes = async () => {
    if (!activeChatId) return;

    try {
        let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${activeChatId}&part=snippet,authorDetails&key=${API_KEY}&maxResults=200`;
        if (nextPageToken) url += `&pageToken=${nextPageToken}`;

        const res = await axios.get(url);
        nextPageToken = res.data.nextPageToken;
        const messages = res.data.items || [];

        if (messages.length === 0) return;

        let commentBatch = [];

        messages.forEach(item => {
            if (processedMessageIds.has(item.id)) return;

            const text = item.snippet.displayMessage;
            let countryCode = null;
            let detectedName = null;

            // 1. Detect Flag Emoji
            const flagMatch = text.match(/[\u{1F1E6}-\u{1F1FF}]{2}/gu);
            if (flagMatch) {
                countryCode = getCountryCodeFromFlag(flagMatch[0]);
                if (countryCode) {
                    detectedName = countries.getName(countryCode.toUpperCase(), "en");
                }
            }

            // 2. Detect Country Name/Code from Text
            if (!countryCode) {
                const match = text.match(countryRegex);
                if (match) {
                    detectedName = match[0];
                    countryCode = getCountryCodeFast(detectedName);
                }
            }

            // 3. Logic for Game & UI
            if (countryCode) {
                // Game logic: Vote tabhi count hoga jab round active ho aur candidate list mein ho
                if (gameState.isRoundActive && detectedName) {
                    const originalName = gameState.candidates.find(
                        c => c.toLowerCase() === detectedName.toLowerCase()
                    );
                    if (originalName) {
                        gameState.votes[originalName] = (gameState.votes[originalName] || 0) + 1;
                    }
                }

                // Batch for Frontend (Flags popping)
                commentBatch.push({
                    userId: item.authorDetails.channelId,
                    username: item.authorDetails.displayName,
                    profilePic: item.authorDetails.profileImageUrl,
                    countryCode: countryCode,
                    message: text
                });
            } else {
                // Optional: Agar koi country match nahi hui, phir bhi animation dikhani hai
                commentBatch.push({
                    username: item.authorDetails.displayName,
                    countryCode: 'un', // Globe icon fallback
                    message: text
                });
            }

            processedMessageIds.add(item.id);
        });

        // Instant Updates to Frontend
        if (commentBatch.length > 0) {
            io.emit('newCommentsBatch', commentBatch); 
        }

        if (gameState.isRoundActive && Object.keys(gameState.votes).length > 0) {
            io.emit('voteUpdate', gameState.votes);
        }

        // Memory Management
        if (processedMessageIds.size > 1000) {
            processedMessageIds = new Set(Array.from(processedMessageIds).slice(-500));
        }

    } catch (err) {
        console.error("YOUTUBE_POLL_ERROR:", err.message);
    }
};

// --- Server Setup ---
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

setInterval(syncChatVotes, 3000); // Token ke saath 3s is safe

setInterval(() => {
    if (gameState.isRoundActive && gameState.timer > 0) {
        gameState.timer--;
        io.emit('timerUpdate', gameState.timer);
        if (gameState.timer === 0) {
            gameState.isRoundActive = false;
            const winner = Object.keys(gameState.votes).reduce((a, b) => 
                (gameState.votes[a] > gameState.votes[b]) ? a : b, gameState.candidates[0]);
            io.emit('roundEnded', { winner });
            gameState.votes = {};
        }
    }
}, 1000);

mongoose.connect(process.env.MONGO_URI).then(() => {
    server.listen(process.env.PORT || 5000, () => console.log(`🚀 FAST SERVER RUNNING`));
});