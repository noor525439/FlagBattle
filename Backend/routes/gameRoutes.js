import express from 'express';
import { Country } from '../models/Country.js';
import path from 'path'; 
import { fileURLToPath } from 'url';

const router = express.Router();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


router.get('/controller-panel', (req, res) => {
    // __dirname is inside /routes, so we use '..' to go to project root, then /public
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