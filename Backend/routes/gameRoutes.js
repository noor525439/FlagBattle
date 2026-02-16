import express from 'express';
import { Country } from '../models/Country.js';

const router = express.Router();

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