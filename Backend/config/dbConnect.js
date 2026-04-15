import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

const dbConnect = async () => {
    try {
        await mongoose.connect(process.env.DATABASEURL)
        console.log("Database Connected Successfully")
    } catch (err) {
        console.error("Database connection failed:", err.message)
    }
}

export default dbConnect
