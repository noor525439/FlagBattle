import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Country } from './models/Country.js';
import { countriesData } from './data/countries.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log(" SEEDER: Connected to MongoDB"))
    .catch(err => console.log(" ERROR:", err));

const importData = async () => {
    try {
        await Country.deleteMany();
        console.log(" SEEDER: Database Cleared!");

        await Country.insertMany(countriesData, { ordered: false });
        console.log(" SEEDER: Countries Loaded Successfully!");
        
        process.exit();
    } catch (error) {
        console.error(" SEEDER ERROR:", error);
        process.exit(1);
    }
};

importData();