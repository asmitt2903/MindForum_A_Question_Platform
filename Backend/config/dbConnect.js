import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

const dbConnect = async()=>{
    try
    {
        await mongoose.connect(process.env.DATABASEURL)
        console.log("DataBase Connected Successfully")
    }
    catch(err)
    {
        console.log("Database connection failed")
        process.exit(1)
    }
}

export default dbConnect