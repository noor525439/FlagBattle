import mongoose from 'mongoose';

const countrySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true }, 
    flagEmoji: String,
    status: { type: String, enum: ['active', 'eliminated'], default: 'active' },
    owner: { type: String, default: "Original" }, 
    neighbors: [String] 
});

export const Country = mongoose.model('Country', countrySchema);