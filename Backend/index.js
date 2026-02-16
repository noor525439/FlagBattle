import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Country } from './models/Country.js';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json' with { type: 'json' };

countries.registerLocale(enLocale);
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const getCountryCode = (name) => {
    if (!name) return 'pk';


    let code = countries.getAlpha2Code(name, 'en');

    
    if (!code) {
        const titleCaseName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        code = countries.getAlpha2Code(titleCaseName, 'en');
    }

  
    if (!code) {
        code = countries.getAlpha2Code(name.trim(), 'en');
    }

    console.log(`DEBUG: Country Name: ${name} -> Code Found: ${code}`); 
    return code ? code.toLowerCase() : 'pk'; 
};


mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("SYSTEM: Connected to MongoDB"))
    .catch(err => console.error("ERROR: Database Connection Failed", err));

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:5174"], 
        methods: ["GET", "POST"],
        credentials: true
    }
});


let gameState = {
    isRoundActive: false,
    dangerZoneCountry: null,
    candidates: [], 
    votes: {},
    timer: 30,
    countryDataMap: {} 
};

let processedMessageIds = new Set();
const API_KEY = process.env.YOUTUBE_API_KEY;
let activeChatId = null;


const syncChatVotes = async () => {
    if (!activeChatId || !gameState.isRoundActive) return;
    try {
        const res = await axios.get(`https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${activeChatId}&part=snippet,authorDetails&key=${API_KEY}`);
        const messages = res.data.items || [];

        messages.forEach(item => {
            if (processedMessageIds.has(item.id)) return;

            const text = item.snippet.displayMessage.toLowerCase();
            const username = item.authorDetails.displayName;
            const profilePic = item.authorDetails.profileImageUrl; 

            gameState.candidates.forEach(countryName => {
                if (text.includes(countryName.toLowerCase())) {
                    gameState.votes[countryName] = (gameState.votes[countryName] || 0) + 1;

           
                    io.emit('newComment', {
                        username: username,
                        country: countryName,
                        countryCode: getCountryCode(countryName),
                        profilePic: profilePic, 
                        count: 1
                    });
                }
            });
            processedMessageIds.add(item.id);
        });

        if (processedMessageIds.size > 500) {
            processedMessageIds = new Set([...processedMessageIds].slice(-200));
        }
        io.emit('voteUpdate', gameState.votes);
    } catch (err) {
        console.error("ERROR: Syncing Votes Failed");
    }
};


io.on('connection', (socket) => {
    console.log("Client Connected:", socket.id);

    socket.on('startDangerZone', async (countryName) => {
      
    });

   
    socket.on("testSnake", (data) => {
        console.log("🧪 Testing snake for:", data.username);

        const testData = {
            username: data.username || "GuestPlayer",
            country: data.country || "Pakistan",
            countryCode: getCountryCode(data.country || "Pakistan"), 
            flag: data.flag || "🏳️",
       
            profilePic: data.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username || 'default'}`,
            count: 1
        };

        io.emit("newComment", testData);
    });

    socket.on('disconnect', () => {
        console.log(" Client Disconnected");
    });
});

setInterval(syncChatVotes, 5000); 
setInterval(async () => {
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