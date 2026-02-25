
import mongoose from 'mongoose';

const winnerSchema = new mongoose.Schema({
    countryName: String,
    countryCode: String,
    winDate: { type: Date, default: Date.now },
    totalParticipants: Number
});

export const Winner = mongoose.model('Winner', winnerSchema);