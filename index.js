import express from "express";
import bodyParser from "body-parser";
import ejs from "ejs";
import pg from "pg";
import { config } from "dotenv";

config();
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

let currentUserId;
let users = [];
let items = [];
app.get("/favicon.ico", (req, res) => res.status(204));
async function getCurrentUser() {
  const result = await pool.query("select * from users");
  if (result.rows.length > 0) {
    users = result.rows;
    return users.find((user) => user.id == currentUserId);
  } else {
    users = [];
    return users;
  }
}
async function getFirstUser() {
  const result = await pool.query("select id from users");
  if (result.rows.length > 0) {
    return result.rows[0].id;
  } else {
    users = [];
    return users;
  }
}
app.get("/", async (req, res) => {
  try {
    const currentUser = await getCurrentUser();
    if (users.length > 0) {
      const result = await pool.query(
        "SELECT * FROM items where user_id = $1",
        [currentUserId]
      );
      res.render("index.ejs", {
        listTitle: currentUser.name + "'s list",
        users: users,
        listItems: result.rows,
        color: currentUser.color,
      });
    } else {
      res.render("index.ejs", {
        message: "There are no members, become one 😊",
      });
    }
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/add", async (req, res) => {
  const item = req.body.newItem;
  try {
    await pool.query("INSERT INTO items (title, user_id) VALUES ($1, $2)", [
      item,
      currentUserId,
    ]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.post("/edit", async (req, res) => {
  try {
    await pool.query("UPDATE items SET title = $1 WHERE id = $2", [
      req.body.updatedItemTitle,
      req.body.updatedItemId,
    ]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.post("/delete", async (req, res) => {
  try {
    await pool.query("DELETE FROM items WHERE id = $1", [
      req.body.deleteItemId,
    ]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});
app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;
  try {
    const result = await pool.query(
      "INSERT INTO users (name, color) VALUES ($1, $2) RETURNING id",
      [name, color]
    );
    currentUserId = result.rows[0].id;
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.post("/deleteMember", async (req, res) => {
  try {
    await pool.query("DELETE FROM items WHERE user_id = $1", [currentUserId]);
    await pool.query("DELETE FROM users WHERE id = $1", [currentUserId]);

    currentUserId = await getFirstUser();
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
