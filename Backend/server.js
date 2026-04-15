import express from "express"
import dbConnect from './config/dbConnect.js'
import path from "path"
import jwt from "jsonwebtoken"
import cookieParser from "cookie-parser"
import User from "./models/userModel.js"
import { fileURLToPath } from "url"
import multer from "multer"
import fs from "fs"

import dotenv from "dotenv"
dotenv.config()

const app = express()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const frontendPath = path.join(__dirname,"..","Frontend")

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())

dbConnect()


app.use(express.static(frontendPath))

// Create uploads directory if it doesn't exist
const uploadsPath = path.join(__dirname, "uploads")
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath)
}
app.use("/uploads", express.static(uploadsPath))

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsPath)
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname))
    }
})
const upload = multer({ storage })


async function auth(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect("/login");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.clearCookie("token");
        res.redirect("/login");
    }
}



app.get("/",(req,res)=>{
    res.redirect("/login")
})

app.get("/login",(req,res)=>{
    res.sendFile(path.join(frontendPath,"login.html"))
})

app.get("/signup",(req,res)=>{
    res.sendFile(path.join(frontendPath,"signup.html"))
})

app.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.send("User already exists");
        }

        // Create new user
        const newUser = new User({ name, email, password });
        await newUser.save();

        res.send("Signup Successful");
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).send("Registration failed: " + error.message);
    }
});


app.get("/home",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"home.html"))
})



app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.send("Invalid Email or Password");
        }

        // Validate password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.send("Invalid Email or Password");
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        // Send token in cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 3600000
        });

        res.send("Login Successful");
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).send("Login failed");
    }
});


app.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
});

<<<<<<< HEAD
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
=======
// User API Routes
app.get("/api/user/me", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user" });
    }
});

app.post("/api/user/upload-profile-pic", auth, upload.single("profilePic"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const profilePicUrl = `/uploads/${req.file.filename}`;
        await User.findByIdAndUpdate(req.user.id, { profilePic: profilePicUrl });

        res.json({ message: "Upload successful", profilePic: profilePicUrl });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ message: "Upload failed" });
    }
});

app.listen(3000,()=>{
    console.log("Server running on port 3000")
})
>>>>>>> 1053a75 (Updated Login/Signup Page UI)
