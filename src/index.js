import express from "express";
import cors from "cors";
import { ObjectId } from "mongodb";
import auth from "./auth.js";
import connect from "./db.js";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.post("/auth", async (req, res) => {
    let user = req.body;

    try {
        let result = await auth.authenticateUser(user.username, user.password);
        res.json(result);
    } catch (e) {
        res.status(403).json({ error: e.message });
    }
});

app.get("/korisnici", async (req, res) => {
    let db = await connect();
    let kolekcija = db.collection("korisnici");
    let cursor = await kolekcija.find();
    let korisnici = await cursor.toArray();

    res.json(korisnici);
});

// Ne znam zasto ne treba connect na bazu, mozda jer je vec spojen na bazu u db.js ?
app.post("/korisnici", async (req, res) => {
    let korisnik = req.body;
    let id;

    // Varijable unutar try catch nisu dostupne izvan try catch bloka
    try {
        id = await auth.registerUser(korisnik);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
    res.json({ id: id });
});

// Dohvacanje korisnikovih informacija po njegovom MongoDB ID-u
app.get("/users/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const db = await connect();
        const kolekcija = db.collection("users");

        const user = await kolekcija.findOne({ _id: new ObjectId(id) });

        if (!user) {
            res.status(404).json({ error: "User not found" });
        } else {
            res.json({ name: user.email }); // Assuming user's name is stored in the 'name' field
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred" });
    }
});

app.get("/users", async (req, res) => {
    const db = await connect();
    const kolekcija = db.collection("users");
    const cursor = await kolekcija.find();
    const users = await cursor.toArray();

    res.json({
        status: "OK",
        data: users,
    });
});

app.post("/users", async (req, res) => {
    let doc = req.body;
    console.log(doc);

    let db = await connect();
    let kolekcija = db.collection("users");

    // Provjeriti, ne slati cijeli dokument nego samo ono sto treba !!!
    let result = kolekcija.insertOne(doc);

    res.status(200);
    res.json({ _id: result.insertedId });
});

app.get("/orders", async (req, res) => {
    const page = Number(req.query.page);
    const limit = 3;

    // NOVO
    const db = await connect();
    const kolekcija = db.collection("orders");
    const total_count = await kolekcija.count();
    const cursor = await kolekcija
        .find()
        .limit(limit)
        .skip(page * limit);
    const orders = await cursor.toArray();

    res.json({
        status: "OK",
        total_count: total_count, // total_count: total_count => total_count
        page, // page: page => page
        count: limit,
        data: orders,
    });
});

app.post("/orders", async (req, res) => {
    let doc = req.body;
    console.log(doc);

    let db = await connect();
    let kolekcija = db.collection("orders");

    // Provjeriti, ne slati cijeli dokument nego samo ono sto treba !!!
    let result = kolekcija.insertOne(doc);

    res.status(200);
    res.json({ _id: result.insertedId });
});

app.listen(port, () => {
    console.log(`Slusam na portu ${port}`);
});
