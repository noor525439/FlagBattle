import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json' with { type: 'json' };

countries.registerLocale(enLocale);
dotenv.config();
const app = express();
// CORS update: Add your netlify link here
app.use(cors({
    origin: ["http://localhost:5173", "https://snake-flag-battle.netlify.app"],
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// --- Global Variables ---
const API_KEY = process.env.YOUTUBE_API_KEY;
let activeChatId = null;
let processedMessageIds = new Set();
let gameState = {
    isRoundActive: false,
    dangerZoneCountry: null,
    candidates: [], 
    votes: {},
    timer: 30,
};

// --- Helper: Country Code ---
const getCountryCode = (name) => {
    if (!name) return 'pk';
    let code = countries.getAlpha2Code(name, 'en');
    if (!code) {
        const titleCaseName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        code = countries.getAlpha2Code(titleCaseName, 'en');
    }
    return code ? code.toLowerCase() : 'pk'; 
};

// --- YouTube Logic ---
const getActiveChatId = async (videoId) => {
    try {
        const res = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${API_KEY}`);
        if (res.data.items[0]) {
            activeChatId = res.data.items[0].liveStreamingDetails.activeLiveChatId;
            console.log("SYSTEM: Connected to Live Chat ID:", activeChatId);
            return true;
        }
        return false;
    } catch (err) {
        console.error("ERROR: YouTube API connection failed.");
        return false;
    }
};

// API Route to manually set Video ID without redeploying
app.post('/set-video', async (req, res) => {
    const { videoId } = req.body;
    if (!videoId) return res.status(400).json({ error: "Video ID is required" });
    
    const success = await getActiveChatId(videoId);
    if (success) {
        processedMessageIds.clear(); // Clear old messages
        res.json({ message: "Chat ID updated successfully", chatId: activeChatId });
    } else {
        res.status(500).json({ error: "Failed to fetch Chat ID" });
    }
});

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("SYSTEM: Connected to MongoDB"))
    .catch(err => console.error("ERROR: Database Connection Failed", err));

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "https://flags-battle.netlify.app"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// --- Core Logic: Syncing Chat ---
const syncChatVotes = async () => {
    if (!activeChatId) return; 
    
    try {
        const res = await axios.get(`https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${activeChatId}&part=snippet,authorDetails&key=${API_KEY}`);
        const messages = res.data.items || [];

        messages.forEach(item => {
            if (processedMessageIds.has(item.id)) return;

            const username = item.authorDetails.displayName;
            const profilePic = item.authorDetails.profileImageUrl;
            const channelId = item.authorDetails.channelId;
            const text = item.snippet.displayMessage.toLowerCase();

            // Step 1: Detect country (Don't use a default string like "null;")
            let detectedCountry = null;
            
            // Check against candidates or use a common list
            // Agar candidates khali hain, toh aap common countries check kar sakte hain
            const countryList = gameState.candidates.length > 0 ? gameState.candidates : ["Pakistan", "India", "USA", "Brazil", "Argentina", "Morocco"];

            countryList.forEach(c => {
                if (text.includes(c.toLowerCase())) {
                    detectedCountry = c;
                }
            });

            // Step 2: Only emit if a country was actually found
            if (detectedCountry) {
                io.emit('newComment', {
                    userId: channelId,
                    username: username,
                    profilePic: profilePic,
                    countryCode: getCountryCode(detectedCountry),
                    count: 1
                });
            }

            // Step 3: Handle Voting Logic (Existing)
            if (gameState.isRoundActive && detectedCountry) {
                 gameState.votes[detectedCountry] = (gameState.votes[detectedCountry] || 0) + 1;
            }

            processedMessageIds.add(item.id);
        });

        if (processedMessageIds.size > 500) {
            processedMessageIds = new Set(Array.from(processedMessageIds).slice(-200));
        }

        if (gameState.isRoundActive) io.emit('voteUpdate', gameState.votes);

    } catch (err) {
        console.error("YOUTUBE_POLL_ERROR: Likely quota limit or invalid Chat ID");
    }
};

// --- Socket Events ---
io.on('connection', (socket) => {
    console.log("Client Connected:", socket.id);

    socket.on("testSnake", (data) => {
        const testData = {
            username: data.username || "GuestPlayer",
            countryCode: getCountryCode(data.country || "Pakistan"), 
            profilePic: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username || 'default'}`,
            count: 1
        };
        io.emit("newComment", testData);
    });

    socket.on('disconnect', () => console.log("Client Disconnected"));
});

// --- Intervals ---
setInterval(syncChatVotes, 5000); // 5 seconds polling
setInterval(() => {
    if (gameState.isRoundActive && gameState.timer > 0) {
        gameState.timer--;
        io.emit('timerUpdate', gameState.timer);
        if (gameState.timer === 0) {
            gameState.isRoundActive = false;
            const winner = Object.keys(gameState.votes).reduce((a, b) => 
                (gameState.votes[a] > gameState.votes[b]) ? a : b, gameState.candidates[0]);
            io.emit('roundEnded', { winner, absorbed: gameState.dangerZoneCountry });
        }
    }
}, 1000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 SERVER RUNNING AT ${PORT}`));