let form = document.getElementById("signupForm")

form.addEventListener("submit", async function(e){

    e.preventDefault()

    let name = document.getElementById("name").value
    let email = document.getElementById("email").value
    let password = document.getElementById("password").value
    let confirmPassword = document.getElementById("confirmPassword").value

    if(password !== confirmPassword){
        alert("Passwords do not match")
        return
    }

    let response = await fetch("/signup",{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({
            name:name,
            email:email,
            password:password
        })
    })

    let result = await response.text()

    alert(result)

})