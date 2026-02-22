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

const server = createServer(app); 
// const io = new Server(server, {
//   cors: {
//     origin: ["http://localhost:5173", "https://flag-battle-38g6.vercel.app"],
//     methods: ["GET", "POST"],
//     credentials: true
//   },
//   transports: ["websocket", "polling"], 
//   pingTimeout: 60000, 
//   pingInterval: 25000
// });
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://flag-battle-38g6.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"], 
  allowEIO3: true 
});

// Render production proxy ke liye
app.set('trust proxy', 1);
const API_KEY = process.env.YOUTUBE_API_KEY;


let activeChatId = null;
let nextPageToken = null;
let processedMessageIds = new Set();
let countryCache = {}; 
let countryRegex = null; 

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
    const allNames = Object.values(countries.getNames("en"));
    const allCodes2 = Object.keys(countries.getAlpha2Codes());
    const allCodes3 = Object.keys(countries.getAlpha3Codes());

    
    const allPatterns = [...allNames, ...allCodes2, ...allCodes3]
        .sort((a, b) => b.length - a.length) 
        .map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) 
        .map(c => `\\b${c}\\b`)
        .join('|');

    const flagPattern = '[\\u{1F1E6}-\u{1F1FF}]{2}';

    countryRegex = new RegExp(`(${allPatterns}|${flagPattern})`, 'iu');
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


const getCountryCodeFast = (input) => {
    if (!input) return null;
    const cleanInput = input.trim().toUpperCase();


    if (cleanInput.length === 2 && countries.isValid(cleanInput)) {
        return cleanInput.toLowerCase();
    }

    if (cleanInput.length === 3) {
        const alpha2 = countries.alpha3ToAlpha2(cleanInput);
        if (alpha2) return alpha2.toLowerCase();
    }

    
    const codeByName = countries.getAlpha2Code(input, 'en');
    if (codeByName) return codeByName.toLowerCase();

    return null;
};

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
        console.log("⚠️ SYSTEM: Video ID mil gayi par Live Chat ID nahi mili. Kya stream live hai?");
        return false;
    } catch (err) {
        console.error("🔥 ERROR: YouTube API detail:", err.response?.data || err.message);
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

    
            const flagMatch = text.match(/[\u{1F1E6}-\u{1F1FF}]{2}/gu);
            if (flagMatch) {
                countryCode = getCountryCodeFromFlag(flagMatch[0]);
                if (countryCode) {
                    detectedName = countries.getName(countryCode.toUpperCase(), "en");
                }
            }

        
            if (!countryCode) {
                const match = text.match(countryRegex);
                if (match) {
                    const matchedText = match[0];
                    countryCode = getCountryCodeFast(matchedText);
                    
                    detectedName = countries.getName(countryCode?.toUpperCase(), "en");
                }
            }

            
            if (gameState.isRoundActive && detectedName) {
            
                const originalName = gameState.candidates.find(
                    c => c.toLowerCase() === detectedName.toLowerCase()
                );
                if (originalName) {
                    gameState.votes[originalName] = (gameState.votes[originalName] || 0) + 1;
                }
            }


            const response = {
                userId: item.authorDetails.channelId,
                username: item.authorDetails.displayName,
                profilePic: item.authorDetails.profileImageUrl,
                message: text,
                countryCode: countryCode ? countryCode : 'snake'
            };

            commentBatch.push(response);
            processedMessageIds.add(item.id);
        });

        if (commentBatch.length > 0) {
            io.emit('newCommentsBatch', commentBatch); 
        }

        if (gameState.isRoundActive && Object.keys(gameState.votes).length > 0) {
            io.emit('voteUpdate', gameState.votes);
        }

      if (processedMessageIds.size > 2000) {
    const idsArray = Array.from(processedMessageIds);
    processedMessageIds = new Set(idsArray.slice(-1000));

        }

    } catch (err) {
        console.error("YOUTUBE_POLL_ERROR:", err.message);
    }
};




setInterval(syncChatVotes, 3000);

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

io.on("connection", (socket) => {
    console.log("New Client Connected! ID:", socket.id);

    socket.on("restartGame", () => {
        console.log("SYSTEM: Restarting Game...");
        gameState.timer = 30;
        gameState.votes = {};
        gameState.isRoundActive = true;
        
    
        io.emit('timerUpdate', gameState.timer);
        io.emit('voteUpdate', gameState.votes); 
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

mongoose.connect(process.env.MONGO_URI).then(() => {
    server.listen(process.env.PORT || 5000, () => console.log(`🚀 FAST SERVER RUNNING`));
});