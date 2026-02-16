import mongoose from 'mongoose';

const leaderboardSchema = new mongoose.Schema({
    username: String,
    countriesCaptured: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now }
});

export const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);