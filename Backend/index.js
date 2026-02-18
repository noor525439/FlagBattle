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
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://flag-battle-38g6.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["polling", "websocket"], 
  pingTimeout: 60000, 
  pingInterval: 25000
});

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
  
    const sortedCandidates = [...gameState.candidates].sort((a, b) => b.length - a.length);
    
    const pattern = sortedCandidates
        .map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) 
        .map(c => `\\b${c}\\b`)
        .join('|');
    

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

  
    if (!code) {
        const allNames = countries.getNames("en");
        code = Object.keys(allNames).find(key => 
            allNames[key].toLowerCase() === lowName || 
            key.toLowerCase() === lowName 
        );
    }

    const finalCode = code ? code.toLowerCase() : null;

    countryCache[lowName] = finalCode;
    return finalCode;
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
                    detectedName = match[0];
                    countryCode = getCountryCodeFast(detectedName);
                }
            }

            if (countryCode) {
           
                if (gameState.isRoundActive && detectedName) {
                    const originalName = gameState.candidates.find(
                        c => c.toLowerCase() === detectedName.toLowerCase()
                    );
                    if (originalName) {
                        gameState.votes[originalName] = (gameState.votes[originalName] || 0) + 1;
                    }
                }

              
                commentBatch.push({
                    userId: item.authorDetails.channelId,
                    username: item.authorDetails.displayName,
                    profilePic: item.authorDetails.profileImageUrl,
                    countryCode: countryCode,
                    message: text
                });
            } else {
               
                commentBatch.push({
                    username: item.authorDetails.displayName,
                    countryCode: 'un', 
                    message: text
                });
            }

            processedMessageIds.add(item.id);
        });

        if (commentBatch.length > 0) {
            io.emit('newCommentsBatch', commentBatch); 
        }

        if (gameState.isRoundActive && Object.keys(gameState.votes).length > 0) {
            io.emit('voteUpdate', gameState.votes);
        }

       
        if (processedMessageIds.size > 1000) {
            processedMessageIds = new Set(Array.from(processedMessageIds).slice(-500));
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