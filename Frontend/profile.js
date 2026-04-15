let profileUser = null;
let currentTab = 'answers';

document.addEventListener('DOMContentLoaded', () => {
    initProfile();
});

async function initProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    if (!userId) {
        alert("User ID missing in URL");
        window.location.href = 'home.html';
        return;
    }

    await fetchProfileData(userId);
    await fetchActivityStats(userId);
    loadTabContent('answers');
}

async function fetchProfileData(userId) {
    try {
        const response = await fetch(`/api/user/public/${userId}`);
        if (!response.ok) throw new Error("User not found");
        
        profileUser = await response.json();
        renderProfileHeader(profileUser);
        renderCredentials(profileUser.credentials);
        renderActiveSpaces(profileUser.interests);
        
        // Impact Score is now handled by fetchActivityStats

    } catch (error) {
        console.error("Error:", error);
        document.querySelector(".profile-main-container").innerHTML = `<div class="loading-state"><p>User not found.</p></div>`;
    }
}

async function fetchActivityStats(userId) {
    try {
        const response = await fetch(`/api/user/stats/${userId}`);
        const stats = await response.json();
        
        document.getElementById("countAnswers").innerText = stats.answers;
        document.getElementById("countQuestions").innerText = stats.questions;
        document.getElementById("tabCountAnswers").innerText = stats.answers;
        document.getElementById("tabCountQuestions").innerText = stats.questions;

        // Display Real Impact Score (Reach)
        const reach = stats.totalReach || 0;
        document.getElementById("impactScore").innerText = reach > 1000 ? (reach/1000).toFixed(1) + "k" : reach;
        
        if (reach > 100) {
            document.getElementById("impactDescription").innerText = `Your contributions have reached ${reach} people this year!`;
        }
    } catch (error) {
        console.error("Stats fetch error:", error);
    }
}

function renderProfileHeader(user) {
    document.getElementById("profileLargeImg").src = user.profilePic || "/uploads/default-avatar.png";
    document.getElementById("profileName").innerText = user.name;
    document.getElementById("profileTitle").innerText = user.title || "Explorer";
    document.getElementById("profileBioText").innerText = user.bio || "No bio yet.";
    document.getElementById("countFollowers").innerText = user.followers.length;
    document.getElementById("countFollowing").innerText = user.following.length;

    if (user.isVerified) {
        document.getElementById("verifiedBadge").style.display = "flex";
    }

    // Check if it's the current user's own profile (assuming currentUser is global from home.js)
    // We'll need to wait for home.js to finish fetchUserData
    setTimeout(() => {
        if (typeof currentUser !== 'undefined' && currentUser._id === user._id) {
            document.getElementById("followBtn").style.display = "none";
            document.getElementById("editProfileBtn").style.display = "block";
        } else {
            updateFollowUI(user);
        }
    }, 500);
}

function updateFollowUI(user) {
    if (typeof currentUser === 'undefined') return;
    const isFollowing = user.followers.some(f => f._id === currentUser._id || f === currentUser._id);
    const btn = document.getElementById("followBtn");
    
    if (isFollowing) {
        btn.innerText = "Following";
        btn.classList.add("btn-secondary");
        btn.classList.remove("btn-primary");
    } else {
        btn.innerText = "Follow";
        btn.classList.add("btn-primary");
        btn.classList.remove("btn-secondary");
    }

    btn.onclick = () => toggleFollow(user._id);
}

async function toggleFollow(userId) {
    try {
        const btn = document.getElementById("followBtn");
        btn.disabled = true;

        const response = await fetch(`/api/user/follow/${userId}`, { method: 'POST' });
        const result = await response.json();

        if (response.ok) {
            document.getElementById("countFollowers").innerText = result.followersCount;
            // Update UI state
            if (result.isFollowing) {
                btn.innerText = "Following";
                btn.classList.add("btn-secondary");
                btn.classList.remove("btn-primary");
            } else {
                btn.innerText = "Follow";
                btn.classList.add("btn-primary");
                btn.classList.remove("btn-secondary");
            }
        }
        btn.disabled = false;
    } catch (error) {
        console.error("Follow error:", error);
    }
}

function switchTab(tab, event) {
    currentTab = tab;
    // Update UI
    document.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    loadTabContent(tab);
}

async function loadTabContent(tab) {
    const feed = document.getElementById("tabContentFeed");
    feed.innerHTML = `<div class="loading-state"><i class="fas fa-circle-notch fa-spin"></i></div>`;

    try {
        if (tab === 'answers') {
            // Need a way to fetch answers for a specific user. 
            // For now, let's mock or use a broader fetch and filter.
            const response = await fetch(`/api/questions`);
            const questions = await response.json();
            
            // This is a bit complex as answers are deep in questions in current architecture.
            // Simplified for now: show questions they answered if possible, or show "no content"
            feed.innerHTML = `<div class="loading-state"><p>No ${tab} to show yet.</p></div>`;
        } else if (tab === 'questions') {
            const response = await fetch(`/api/questions`);
            const questions = await response.json();
            const userQuestions = questions.filter(q => q.user?._id === profileUser._id);
            
            if (userQuestions.length === 0) {
                feed.innerHTML = `<div class="loading-state"><p>No questions posted yet.</p></div>`;
            } else {
                feed.innerHTML = "";
                userQuestions.forEach(q => {
                    const card = createQuestionCard(q); // Reused from home.js
                    feed.appendChild(card);
                });
            }
        } else {
            feed.innerHTML = `<div class="loading-state"><p>No ${tab} to show yet.</p></div>`;
        }
    } catch (error) {
        feed.innerHTML = `<div class="loading-state"><p>Error loading content.</p></div>`;
    }
}

function renderCredentials(creds) {
    const list = document.getElementById("credentialsList");
    if (!creds || creds.length === 0) return;

    list.innerHTML = "";
    creds.forEach(c => {
        const div = document.createElement("div");
        div.className = "credential-item";
        div.innerHTML = `
            <i class="${c.icon || 'fas fa-graduation-cap'}"></i>
            <div class="cred-text">
                <h4>${c.title}</h4>
                <p>${c.subtitle}</p>
            </div>
        `;
        list.appendChild(div);
    });
}

function renderActiveSpaces(interests) {
    const list = document.getElementById("activeSpacesList");
    if (!interests || interests.length === 0) return;

    list.innerHTML = "";
    interests.forEach(interest => {
        const span = document.createElement("span");
        span.className = "interest-tag";
        span.innerText = interest;
        list.appendChild(span);
    });
}
