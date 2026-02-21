import express from 'express';
import { Country } from '../models/Country.js';
import path from 'path'; 
import { fileURLToPath } from 'url';

const router = express.Router();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global variable to store current video ID (Temporary storage)
let currentVideoId = "";

router.post('/set-video', async (req, res) => {
    try {
        const { videoId } = req.body;

        if (!videoId) {
            return res.status(400).json({ error: "Video ID is required" });
        }

    
        currentVideoId = videoId; 
        
        console.log("🚀 New Video ID Set:", currentVideoId);

        res.json({ 
            success: true, 
            message: "Video ID updated successfully", 
            videoId: currentVideoId 
        });
    } catch (err) {
        console.error("❌ Backend Error:", err);
        res.status(500).json({ error: "Internal Server Error: " + err.message });
    }
});

router.get('/get-video', (req, res) => {
    res.json({ videoId: currentVideoId });
});
router.get('/controller-panel', (req, res) => {

    const filePath = path.join(__dirname, '..', 'public', 'controller.html');
    
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error("❌ ERROR: Could not find file at:", filePath);
            res.status(404).send("File not found on server.");
        }
    });
})
router.get('/countries', async (req, res) => {
    try {
        const countries = await Country.find({ status: 'active' });
        res.json(countries);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/absorb', async (req, res) => {
    const { winnerName, loserName } = req.body;
    try {
        await Country.findOneAndUpdate({ name: loserName }, { status: 'eliminated', owner: winnerName });
        res.json({ message: `${loserName} absorbed by ${winnerName}` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;