import express from "express"
import dbConnect from './config/dbConnect.js'
import path from "path"
import session from "express-session"
import { fileURLToPath } from "url"


const app = express()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const frontendPath = path.join(__dirname,"..","Frontend")

app.use(express.json())
app.use(express.urlencoded({extended:true}))

// dbConnect()

app.use(session({
    secret:"secretkey",
    resave:false,
    saveUninitialized:false
}))


app.use(express.static(frontendPath))


function auth(req,res,next){
    if(req.session.user){
        next()
    }else{
        res.redirect("/login")
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


app.get("/home",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"home.html"))
})



app.post("/login",(req,res)=>{

    const {email,password} = req.body

    if(email === "admin@gmail.com" && password === "1234"){
        req.session.user = email
        res.send("Login Successful")
    }else{
        res.send("Invalid Email or Password")
    }

})


app.get("/logout",(req,res)=>{
    req.session.destroy(()=>{
        res.redirect("/login")
    })
})


app.listen(3000,()=>{
    console.log("Server running on port 3000")
})