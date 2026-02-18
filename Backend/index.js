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

let gameState = {
    isRoundActive: false,
    candidates: ["Pakistan", "India", "USA", "Brazil", "Argentina", "Morocco"],
    votes: {},
    timer: 30,
};

// --- Middleware ---
app.use(cors({
    origin: ["http://localhost:5173", "https://snake-flag-battle.netlify.app"],
    credentials: true
}));
app.use(express.json());
app.use('/', gameRoutes); 
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'controller.html'));
});

const updateCountryRegex = () => {
    const pattern = gameState.candidates.map(c => `\\b${c}\\b`).join('|');
    countryRegex = new RegExp(pattern, 'i');
};
updateCountryRegex(); 

const getCountryCodeFast = (name) => {
    const lowName = name.toLowerCase();
    if (countryCache[lowName]) return countryCache[lowName];

    let code = countries.getAlpha2Code(name, 'en');
    if (!code) {
        const titleCase = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        code = countries.getAlpha2Code(titleCase, 'en');
    }
    const finalCode = code ? code.toLowerCase() : 'pk';
    countryCache[lowName] = finalCode; // Cache it!
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

// --- CORE LOGIC: Batch Processing Sync ---
const syncChatVotes = async () => {
    if (!activeChatId) return;

    try {
        let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${activeChatId}&part=snippet,authorDetails&key=${API_KEY}&maxResults=200`;
        if (nextPageToken) url += `&pageToken=${nextPageToken}`;

        const res = await axios.get(url);
        nextPageToken = res.data.nextPageToken;
        const messages = res.data.items || [];

        if (messages.length === 0) return;

        let commentBatch = []; // Saray comments ek saath bhejne ke liye

        messages.forEach(item => {
            if (processedMessageIds.has(item.id)) return;

            const text = item.snippet.displayMessage;
            const match = text.match(countryRegex); // Super fast matching

            if (match) {
                const detectedCountry = match[0];
                const countryCode = getCountryCodeFast(detectedCountry);

                const commentData = {
                    userId: item.authorDetails.channelId,
                    username: item.authorDetails.displayName,
                    profilePic: item.authorDetails.profileImageUrl,
                    countryCode: countryCode,
                    count: 1
                };

                commentBatch.push(commentData);

                if (gameState.isRoundActive) {
                    // Proper casing ke liye lookup
                    const originalName = gameState.candidates.find(c => c.toLowerCase() === detectedCountry.toLowerCase());
                    gameState.votes[originalName] = (gameState.votes[originalName] || 0) + 1;
                }
            }
            processedMessageIds.add(item.id);
        });

        // Optimization: Ek hi baar batch emit karein
        if (commentBatch.length > 0) {
            io.emit('newCommentsBatch', commentBatch); 
        }

        if (gameState.isRoundActive && Object.keys(gameState.votes).length > 0) {
            io.emit('voteUpdate', gameState.votes);
        }

        // Keep memory clean
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