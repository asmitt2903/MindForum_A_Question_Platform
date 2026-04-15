import express from "express"
import dbConnect from './config/dbConnect.js'
import path from "path"
import jwt from "jsonwebtoken"
import cookieParser from "cookie-parser"
import User from "./models/userModel.js"
import Question from "./models/questionModel.js"
import Answer from "./models/answerModel.js"
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

app.patch("/api/user/profile", auth, async (req, res) => {
    try {
        const { bio, interests, title } = req.body;
        
        // Convert comma-separated string to array if necessary
        const interestsArray = Array.isArray(interests) 
            ? interests 
            : (interests ? interests.split(",").map(i => i.trim()) : []);

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { bio, interests: interestsArray, title },
            { new: true }
        ).select("-password");

        res.json(updatedUser);
    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ message: "Update failed" });
    }
});

// GET Public Profile
app.get("/api/user/public/:id", auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select("-password -email")
            .populate("followers", "name profilePic")
            .populate("following", "name profilePic");
            
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Error fetching profile" });
    }
});

// Follow/Unfollow Toggle
app.post("/api/user/follow/:id", auth, async (req, res) => {
    try {
        const userToFollow = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user.id);

        if (!userToFollow) return res.status(404).json({ message: "User not found" });
        if (req.params.id === req.user.id) return res.status(400).json({ message: "You cannot follow yourself" });

        const isFollowing = currentUser.following.includes(req.params.id);

        if (isFollowing) {
            // Unfollow
            currentUser.following = currentUser.following.filter(id => id.toString() !== req.params.id);
            userToFollow.followers = userToFollow.followers.filter(id => id.toString() !== req.user.id);
        } else {
            // Follow
            currentUser.following.push(req.params.id);
            userToFollow.followers.push(req.user.id);
        }

        await currentUser.save();
        await userToFollow.save();

        res.json({ isFollowing: !isFollowing, followersCount: userToFollow.followers.length });
    } catch (error) {
        res.status(500).json({ message: "Follow action failed" });
    }
});

// User Stats (Questions & Answers count + Reach)
app.get("/api/user/stats/:id", auth, async (req, res) => {
    try {
        const qCount = await Question.countDocuments({ user: req.params.id });
        const aCount = await Answer.countDocuments({ user: req.params.id });
        
        // Sum of all views for user's questions
        const questions = await Question.find({ user: req.params.id });
        const totalReach = questions.reduce((acc, q) => acc + (q.views || 0), 0);

        res.json({ questions: qCount, answers: aCount, totalReach });
    } catch (error) {
        res.status(500).json({ message: "Error fetching stats" });
    }
});

// --- Question API ---

app.post("/api/questions", auth, upload.single("media"), async (req, res) => {
    try {
        const { content, spaces } = req.body;
        let mediaUrl = "";
        let mediaType = "text";

        if (req.file) {
            mediaUrl = `/uploads/${req.file.filename}`;
            const ext = path.extname(req.file.originalname).toLowerCase();
            if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
                mediaType = "image";
            } else if ([".mp4", ".mov", ".avi", ".mkv"].includes(ext)) {
                mediaType = "video";
            }
        }

        const newQuestion = new Question({
            user: req.user.id,
            content,
            mediaUrl,
            mediaType,
            spaces: spaces || "General"
        });

        await newQuestion.save();
        res.status(201).json(newQuestion);
    } catch (error) {
        console.error("Question error:", error);
        res.status(500).json({ message: "Failed to post question" });
    }
});

app.get("/api/questions", auth, async (req, res) => {
    try {
        const questions = await Question.find()
            .populate("user", "name profilePic")
            .sort({ createdAt: -1 });

        // Increment views for each question (informal tracking)
        // We'll increment only if the current user is not the author
        const questionIds = questions.map(q => q._id);
        await Question.updateMany(
            { _id: { $in: questionIds }, user: { $ne: req.user.id } },
            { $inc: { views: 1 } }
        );

        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: "Error fetching questions" });
    }
});

// --- Answer API ---

app.post("/api/questions/:id/answers", auth, upload.single("media"), async (req, res) => {
    try {
        const { content } = req.body;
        const questionId = req.params.id;
        let mediaUrl = "";
        let mediaType = "text";

        if (req.file) {
            mediaUrl = `/uploads/${req.file.filename}`;
            const ext = path.extname(req.file.originalname).toLowerCase();
            if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
                mediaType = "image";
            } else if ([".mp4", ".mov", ".avi", ".mkv"].includes(ext)) {
                mediaType = "video";
            }
        }

        const newAnswer = new Answer({
            user: req.user.id,
            question: questionId,
            content,
            mediaUrl,
            mediaType
        });

        await newAnswer.save();
        res.status(201).json(newAnswer);
    } catch (error) {
        console.error("Answer error:", error);
        res.status(500).json({ message: "Failed to post answer" });
    }
});

app.get("/api/questions/:id/answers", auth, async (req, res) => {
    try {
        const answers = await Answer.find({ question: req.params.id })
            .populate("user", "name profilePic")
            .sort({ createdAt: 1 });
        res.json(answers);
    } catch (error) {
        res.status(500).json({ message: "Error fetching answers" });
    }
});

// ✅ Correct for Render
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
