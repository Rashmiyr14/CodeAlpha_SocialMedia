let currentUser = null;

// Register
async function register() {
    const name = document.getElementById("registerName").value;
    const username = document.getElementById("registerUsername").value;
    const password = document.getElementById("registerPassword").value;

    const response = await fetch("/api/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name,
            username,
            password
        })
    });

    const data = await response.json();

    document.getElementById("registerMessage").textContent = data.message;

    if (response.ok) {
        document.getElementById("registerName").value = "";
        document.getElementById("registerUsername").value = "";
        document.getElementById("registerPassword").value = "";
    }
}


// Login
async function login() {
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;

    const response = await fetch("/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username,
            password
        })
    });

    const data = await response.json();

    document.getElementById("loginMessage").textContent = data.message;

    if (response.ok) {
        currentUser = data.user;

        document.getElementById("authSection").style.display = "none";
        document.getElementById("socialSection").style.display = "block";
        document.getElementById("logoutBtn").style.display = "block";

        loadProfile();
        loadPosts();
    }
}


// Load profile
async function loadProfile() {
    const response = await fetch(`/api/users/${currentUser.id}`);
    const user = await response.json();

    document.getElementById("profileName").textContent = user.name;
    document.getElementById("profileUsername").textContent = user.username;
    document.getElementById("profileBio").textContent = user.bio || "No bio";

    document.getElementById("profilePosts").textContent = user.posts_count;
    document.getElementById("profileFollowers").textContent = user.followers_count;
    document.getElementById("profileFollowing").textContent = user.following_count;
}


// Create post
async function createPost() {
    const content = document.getElementById("postContent").value.trim();

    if (!content) {
        document.getElementById("postMessage").textContent =
            "Please write something before posting.";

        return;
    }

    const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            user_id: currentUser.id,
            content: content
        })
    });

    const data = await response.json();

    document.getElementById("postMessage").textContent = data.message;

    if (response.ok) {
        document.getElementById("postContent").value = "";
        loadPosts();
        loadProfile();
    }
}


// Load posts
async function loadPosts() {
    const response = await fetch("/api/posts");
    const posts = await response.json();

    const feed = document.getElementById("feed");

    feed.innerHTML = "";

    if (posts.length === 0) {
        feed.innerHTML = "<p>No posts yet. Create the first post!</p>";
        return;
    }

    posts.forEach(post => {
        const postElement = document.createElement("div");

        postElement.className = "post-card";

        postElement.innerHTML = `
            <h3>${escapeHTML(post.name)} (@${escapeHTML(post.username)})</h3>

            <p>${escapeHTML(post.content)}</p>

            <p class="post-date">
                ${new Date(post.created_at).toLocaleString()}
            </p>

            <div class="post-actions">
                <button onclick="likePost(${post.id})">
                    ❤️ Like
                </button>

                <span>
                    ${post.likes_count} Likes
                </span>

                <span>
                    ${post.comments_count} Comments
                </span>
            </div>

            <div class="comment-box">
                <input
                    type="text"
                    id="comment-${post.id}"
                    placeholder="Write a comment..."
                >

                <button onclick="addComment(${post.id})">
                    Comment
                </button>

                <div id="comments-${post.id}"></div>
            </div>

            ${
                post.user_id !== currentUser.id
                    ? `
                        <button
                            class="follow-btn"
                            onclick="followUser(${post.user_id})"
                        >
                            Follow
                        </button>
                    `
                    : ""
            }
        `;

        feed.appendChild(postElement);

        loadComments(post.id);
    });
}


// Like post
async function likePost(postId) {
    const response = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            user_id: currentUser.id
        })
    });

    const data = await response.json();

    alert(data.message);

    if (response.ok) {
        loadPosts();
    }
}


// Add comment
async function addComment(postId) {
    const input = document.getElementById(`comment-${postId}`);
    const comment = input.value.trim();

    if (!comment) {
        alert("Please enter a comment.");
        return;
    }

    const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            user_id: currentUser.id,
            comment: comment
        })
    });

    const data = await response.json();

    alert(data.message);

    if (response.ok) {
        input.value = "";
        loadPosts();
    }
}


// Load comments
async function loadComments(postId) {
    const response = await fetch(`/api/posts/${postId}/comments`);
    const comments = await response.json();

    const container = document.getElementById(`comments-${postId}`);

    if (!container) {
        return;
    }

    container.innerHTML = "";

    comments.forEach(comment => {
        const commentElement = document.createElement("div");

        commentElement.className = "comment";

        commentElement.innerHTML = `
            <strong>
                ${escapeHTML(comment.name)}
            </strong>

            <span>
                ${escapeHTML(comment.comment)}
            </span>
        `;

        container.appendChild(commentElement);
    });
}


// Follow user
async function followUser(userId) {
    const response = await fetch(`/api/users/${userId}/follow`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            follower_id: currentUser.id
        })
    });

    const data = await response.json();

    alert(data.message);

    if (response.ok) {
        loadProfile();
    }
}


// Logout
function logout() {
    currentUser = null;

    document.getElementById("authSection").style.display = "grid";
    document.getElementById("socialSection").style.display = "none";
    document.getElementById("logoutBtn").style.display = "none";

    document.getElementById("loginUsername").value = "";
    document.getElementById("loginPassword").value = "";

    document.getElementById("loginMessage").textContent = "";
}


// Prevent HTML injection in posts/comments
function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}