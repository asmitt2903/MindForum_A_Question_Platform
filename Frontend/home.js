window.onload = async () => {
    try {
        const response = await fetch("/api/user/me");
        if (response.ok) {
            const user = await response.json();
            if (user.profilePic) {
                document.getElementById("profileDisplay").src = user.profilePic;
            }
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
};

async function uploadPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profilePic", file);

    try {
        const response = await fetch("/api/user/upload-profile-pic", {
            method: "POST",
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById("profileDisplay").src = data.profilePic;
            alert("Profile picture updated successfully!");
        } else {
            alert("Failed to upload profile picture.");
        }
    } catch (error) {
        console.error("Upload error:", error);
        alert("An error occurred during upload.");
    }
}

function logout(){
    window.location.href = "/logout"
}