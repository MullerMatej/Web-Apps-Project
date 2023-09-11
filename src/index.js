import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongo from 'mongodb';
import auth from './auth.js';
import connect from './db.js';
import walkingRoute from '../models/walkingRoute.js';

import multer from 'multer';

const upload = multer({ dest: 'uploads/' });

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.get('/tajna', [auth.verify], (req, res) => {
    res.json({ message: `Ovo je tajna ${req.jtw.username}` }); // Mora bit razmak izmedu req i jwt iz nekog razloga
});

app.get('/rute', async (req, res) => {
    let db = await connect();

    let cursor = await db.collection('rute').find();
    let results = await cursor.toArray(); // Prodi kroz sve rezultate i stavi ih u array

    res.json(results);
});

app.get('/rute/:id', async (req, res) => {
    let id = req.params.id;
    let db = await connect();

    let doc = await db
        .collection('rute')
        .findOne({ _id: new mongo.ObjectId(id) });
    // console.log(doc);
    res.json(doc);
});

app.post('/auth', async (req, res) => {
    let user = req.body;

    try {
        let result = await auth.authenticateUser(user.username, user.password);
        res.json(result);
    } catch (e) {
        res.status(401).json({ error: e.message });
    }
});

app.patch('/korisnici', [auth.verify], async (req, res) => {
    let changes = req.body;

    let username = req.jtw.username;

    if (changes.new_password && changes.old_password) {
        let result = await auth.changeUserPassword(
            username,
            changes.old_password,
            changes.new_password
        );
        if (result) {
            res.status(201).send();
        } else {
            res.status(500).json({ error: 'cannot change password' });
        }
    } else {
        res.status(400).json({ error: 'Krivi upit' });
    }
});

app.get('/korisnici', async (req, res) => {
    let db = await connect();
    let kolekcija = db.collection('korisnici');
    let cursor = await kolekcija.find();
    let korisnici = await cursor.toArray();

    res.json(korisnici);
});

// Ne znam zasto ne treba connect na bazu, mozda jer je vec spojen na bazu u db.js
app.post('/korisnici', async (req, res) => {
    let korisnik = req.body;
    let id;
    let result = 'Uspjesno registriran korisnik!';

    // Varijable unutar try catch nisu dostupne izvan try catch bloka
    try {
        id = await auth.registerUser(korisnik);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
    res.json({ result });
});

app.get('/korisnici/:id', async (req, res) => {
    const korisnikId = req.params.id;
    const db = await connect();

    try {
        const korisnik = await db
            .collection('korisnici')
            .findOne({ _id: new mongo.ObjectId(korisnikId) });
        if (korisnik) {
            const { firstName, lastName } = korisnik;
            res.json({ firstName, lastName });
        } else {
            res.status(404).json({ error: 'Korisnik not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Slusam na portu ${port}`);
});
