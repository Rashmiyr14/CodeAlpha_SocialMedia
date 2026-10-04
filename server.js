const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Database
const db = new sqlite3.Database("./database/social_media.db", (err) => {
    if (err) {
        console.error("Database connection error:", err.message);
    } else {
        console.log("Connected to SQLite database.");

        db.serialize(() => {

            // Users table
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    bio TEXT DEFAULT '',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Posts table
            db.run(`
                CREATE TABLE IF NOT EXISTS posts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `);

            // Comments table
            db.run(`
                CREATE TABLE IF NOT EXISTS comments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    post_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    comment TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (post_id) REFERENCES posts(id),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `);

            // Likes table
            db.run(`
                CREATE TABLE IF NOT EXISTS likes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    post_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    UNIQUE(post_id, user_id),
                    FOREIGN KEY (post_id) REFERENCES posts(id),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `);

            // Follows table
            db.run(`
                CREATE TABLE IF NOT EXISTS follows (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    follower_id INTEGER NOT NULL,
                    following_id INTEGER NOT NULL,
                    UNIQUE(follower_id, following_id),
                    FOREIGN KEY (follower_id) REFERENCES users(id),
                    FOREIGN KEY (following_id) REFERENCES users(id)
                )
            `);

            console.log("Database tables are ready.");
        });
    }
});

// Test route
app.get("/api/test", (req, res) => {
    res.json({
        message: "Social Media backend is working!"
    });
});

// Register user
app.post("/api/register", (req, res) => {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
        return res.status(400).json({
            message: "Name, username and password are required."
        });
    }

    const sql = `
        INSERT INTO users (name, username, password)
        VALUES (?, ?, ?)
    `;

    db.run(sql, [name, username, password], function (err) {
        if (err) {
            if (err.message.includes("UNIQUE")) {
                return res.status(400).json({
                    message: "Username already exists."
                });
            }

            return res.status(500).json({
                message: "Registration failed."
            });
        }

        res.json({
            message: "Registration successful!",
            userId: this.lastID
        });
    });
});

// Login user
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            message: "Username and password are required."
        });
    }

    const sql = `
        SELECT id, name, username, bio
        FROM users
        WHERE username = ? AND password = ?
    `;

    db.get(sql, [username, password], (err, user) => {
        if (err) {
            return res.status(500).json({
                message: "Login failed."
            });
        }

        if (!user) {
            return res.status(401).json({
                message: "Invalid username or password."
            });
        }

        res.json({
            message: "Login successful!",
            user: user
        });
    });
});

// Create a post
app.post("/api/posts", (req, res) => {
    const { user_id, content } = req.body;

    if (!user_id || !content) {
        return res.status(400).json({
            message: "User ID and post content are required."
        });
    }

    const sql = `
        INSERT INTO posts (user_id, content)
        VALUES (?, ?)
    `;

    db.run(sql, [user_id, content], function (err) {
        if (err) {
            return res.status(500).json({
                message: "Failed to create post."
            });
        }

        res.json({
            message: "Post created successfully!",
            postId: this.lastID
        });
    });
});

// Get all posts
app.get("/api/posts", (req, res) => {
    const sql = `
        SELECT 
            posts.id,
            posts.content,
            posts.created_at,
            users.id AS user_id,
            users.name,
            users.username,
            (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS likes_count,
            (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) AS comments_count
        FROM posts
        JOIN users ON posts.user_id = users.id
        ORDER BY posts.created_at DESC
    `;

    db.all(sql, [], (err, posts) => {
        if (err) {
            return res.status(500).json({
                message: "Failed to load posts."
            });
        }

        res.json(posts);
    });
});

// Like a post
app.post("/api/posts/:id/like", (req, res) => {
    const postId = req.params.id;
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({
            message: "User ID is required."
        });
    }

    const sql = `
        INSERT INTO likes (post_id, user_id)
        VALUES (?, ?)
    `;

    db.run(sql, [postId, user_id], function (err) {
        if (err) {
            if (err.message.includes("UNIQUE")) {
                return res.status(400).json({
                    message: "You already liked this post."
                });
            }

            return res.status(500).json({
                message: "Failed to like post."
            });
        }

        res.json({
            message: "Post liked successfully!"
        });
    });
});

// Add a comment to a post
app.post("/api/posts/:id/comments", (req, res) => {
    const postId = req.params.id;
    const { user_id, comment } = req.body;

    if (!user_id || !comment) {
        return res.status(400).json({
            message: "User ID and comment are required."
        });
    }

    const sql = `
        INSERT INTO comments (post_id, user_id, comment)
        VALUES (?, ?, ?)
    `;

    db.run(sql, [postId, user_id, comment], function (err) {
        if (err) {
            return res.status(500).json({
                message: "Failed to add comment."
            });
        }

        res.json({
            message: "Comment added successfully!",
            commentId: this.lastID
        });
    });
});

// Follow a user
app.post("/api/users/:id/follow", (req, res) => {
    const followingId = req.params.id;
    const { follower_id } = req.body;

    if (!follower_id) {
        return res.status(400).json({
            message: "Follower ID is required."
        });
    }

    if (Number(follower_id) === Number(followingId)) {
        return res.status(400).json({
            message: "You cannot follow yourself."
        });
    }

    const sql = `
        INSERT INTO follows (follower_id, following_id)
        VALUES (?, ?)
    `;

    db.run(sql, [follower_id, followingId], function (err) {
        if (err) {
            if (err.message.includes("UNIQUE")) {
                return res.status(400).json({
                    message: "You already follow this user."
                });
            }

            return res.status(500).json({
                message: "Failed to follow user."
            });
        }

        res.json({
            message: "User followed successfully!"
        });
    });
});

// Get user profile
app.get("/api/users/:id", (req, res) => {
    const userId = req.params.id;

    const sql = `
        SELECT
            users.id,
            users.name,
            users.username,
            users.bio,
            (SELECT COUNT(*) FROM posts WHERE posts.user_id = users.id) AS posts_count,
            (SELECT COUNT(*) FROM follows WHERE follows.following_id = users.id) AS followers_count,
            (SELECT COUNT(*) FROM follows WHERE follows.follower_id = users.id) AS following_count
        FROM users
        WHERE users.id = ?
    `;

    db.get(sql, [userId], (err, user) => {
        if (err) {
            return res.status(500).json({
                message: "Failed to load profile."
            });
        }

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        res.json(user);
    });
});

// Get comments for a post
app.get("/api/posts/:id/comments", (req, res) => {
    const postId = req.params.id;

    const sql = `
        SELECT
            comments.id,
            comments.comment,
            comments.created_at,
            users.id AS user_id,
            users.name,
            users.username
        FROM comments
        JOIN users ON comments.user_id = users.id
        WHERE comments.post_id = ?
        ORDER BY comments.created_at ASC
    `;

    db.all(sql, [postId], (err, comments) => {
        if (err) {
            return res.status(500).json({
                message: "Failed to load comments."
            });
        }

        res.json(comments);
    });
});

// Unfollow a user
app.delete("/api/users/:id/follow", (req, res) => {
    const followingId = req.params.id;
    const { follower_id } = req.body;

    if (!follower_id) {
        return res.status(400).json({
            message: "Follower ID is required."
        });
    }

    const sql = `
        DELETE FROM follows
        WHERE follower_id = ? AND following_id = ?
    `;

    db.run(sql, [follower_id, followingId], function (err) {
        if (err) {
            return res.status(500).json({
                message: "Failed to unfollow user."
            });
        }

        res.json({
            message: "User unfollowed successfully!"
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Social Media server running at http://localhost:${PORT}`);
});