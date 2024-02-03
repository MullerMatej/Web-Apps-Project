import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import mongo from 'mongodb';
import auth from './auth.js';
import connect from './db.js';
import connectToDatabase from './db.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import mongoose from 'mongoose';

mongoose.connect('mongodb+srv://admin:admin@clusternovi.oayb4ih.mongodb.net/walk_it', {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

// const connection = mongoose.connection;
// connection.on('error', console.log);

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.use(express.static('public'));
app.use(express.static('uploads'));

// Handle the root path and serve the 'index.html' file
app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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

	let doc = await db.collection('rute').findOne({ _id: new mongo.ObjectId(id) });
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

app.get('/lokalniStorage', [auth.verify], async (req, res) => {
	let username = req.jwt.username;

	res.json(username);
});

app.get('/avatars', async (req, res) => {
	let db = await connect();

	try {
		let cursor = await db.collection('avatars').find();
		let results = await cursor.toArray();

		res.json(results);
	} catch (error) {
		res.status(500).json({ error: 'Unable to get avatars' });
	}
});

app.patch('/korisnici', [auth.verify], async (req, res) => {
	let changes = req.body;

	let username = req.jtw.username;

	if (changes.new_password && changes.old_password) {
		let result = await auth.changeUserPassword(username, changes.old_password, changes.new_password);
		if (result) {
			res.status(201).send();
		} else {
			res.status(500).json({ error: 'cannot change password' });
		}
	} else {
		res.status(400).json({ error: 'Krivi upit' });
	}
});

app.patch('/korisnici/:username', async (req, res) => {
	const updates = req.body;
	const db = await connect();

	try {
		await db
			.collection('korisnici')
			.updateOne({ username: req.params.username }, { $set: updates })
			.then((result) => {
				res.status(200).json(result);
			})
			.catch((err) => {
				res.status(500).json({ error: 'Cannot update the document' });
			});
	} catch (error) {
		res.status(500).json({ error: 'Not a valid user id' });
	}
});

app.patch('/updateImage/:username', async (req, res) => {
	const updates = req.body;
	const db = await connect();

	try {
		await db
			.collection('korisnici')
			.updateOne({ username: req.params.username }, { $set: updates })
			.then((result) => {
				res.status(200).json(result);
			})
			.catch((error) => {
				res.status(500).json({ error: 'Cannot update user image' });
			});
	} catch (error) {
		res.status(500).json({ error: 'Invalid user id while changing image' });
	}
});

app.get('/korisnici', async (req, res) => {
	let db = await connect();
	let kolekcija = db.collection('korisnici');
	let cursor = await kolekcija.find();
	let korisnici = await cursor.toArray();

	res.json(korisnici);
});

app.post('/korisnici', async (req, res) => {
	let korisnik = req.body;
	let id;
	let result = 'User registration successfull';
	try {
		id = await auth.registerUser(korisnik);
	} catch (e) {
		res.status(500).json({ error: e.message });
	}
	res.json({ result });
});

app.get('/:username', async (req, res) => {
	const username = req.params.username;
	const db = await connect();

	try {
		const korisnik = await db.collection('korisnici').findOne({ username: username });
		if (korisnik) {
			const { username, email, imageUrl } = korisnik;
			res.json({ username, email, imageUrl });
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
