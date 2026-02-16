import express from 'express';
import { Country } from '../models/Country.js';
import path from 'path'; 
import { fileURLToPath } from 'url';

const router = express.Router();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


router.get('/controller-panel', (req, res) => {
    // path.resolve use karne se path zyada accurate nikalta hai
    const filePath = path.resolve(__dirname, '..', 'public', 'controller.html');
    
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error("File error path:", filePath); // Render logs mein check karein ye path kya dikha raha hai
            res.status(404).send("Controller file nahi mil rahi. Path check karein.");
        }
    });
});
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