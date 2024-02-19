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
	res.json({ message: `Ovo je tajna ${req.jtw.username}` });
});

app.delete('/deleteCreatedWalk/:username/:walkId', async (req, res) => {
	let db = await connect();

	try {
		const user = await db.collection('korisnici').findOne({ username: req.params.username });
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}
		// Update the user document to remove the walk with the specified walkId
		await db
			.collection('korisnici')
			.updateOne({ username: req.params.username }, { $pull: { createdWalks: { routeId: req.params.walkId } } });

		res.status(200).json({ message: 'Walk deleted successfully' });
	} catch (error) {
		console.error('Error deleting walk:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.delete('/deleteWalk/:walkId', async (req, res) => {
	let db = await connect();
	try {
		await db.collection('rute').deleteOne({ _id: new mongo.ObjectId(req.params.walkId) });
		res.status(200).json({ message: 'Walk deleted successfully' });
	} catch (error) {
		console.error('Error deleting walk:', error);
	}
});

app.patch('/:username/addCreatedPoint', async (req, res) => {
	let db = await connect();
	let newPoint = req.body;
	try {
		await db
			.collection('korisnici')
			.updateOne({ username: req.params.username }, { $push: { createdPoints: newPoint } });
		res.status(200).json({ message: 'Point added successfully' });
	} catch (error) {
		console.error('Error adding point:', error);
		if (error instanceof mongo.MongoError) {
			res.status(500).json({ error: 'Database error: ' + error.message });
		} else {
			res.status(500).json({ error: 'Internal server error' });
		}
	}
});

app.patch('/:username/addCreatedTag', async (req, res) => {
	let db = await connect();
	let newTag = req.body;
	try {
		await db
			.collection('korisnici')
			.updateOne({ username: req.params.username }, { $push: { createdTags: newTag } });
		res.status(200).json({ message: 'Tag added successfully' });
	} catch (error) {
		console.error('Error adding tag:', error);
		if (error instanceof mongo.MongoError) {
			res.status(500).json({ error: 'Database error: ' + error.message });
		} else {
			res.status(500).json({ error: 'Internal server error' });
		}
	}
});

app.patch('/:username/addCreatedWalk', async (req, res) => {
	let db = await connect();
	let newRoute = req.body;
	// console.log('User id: ', req.params.userId, ' New route object: ', newRoute);
	// Kada se ruta kreira, uspješno imam novokreirani routeId od te rute, routeName i username korisnika
	// Nastaviti ovdje
	// Kreiraj request koji dodaje objekt { routeId: "23534fwefefrefe545", name: "Lungomare" } u korisnikov createdWalks ključ
	// Kada se doda automatski se prikazuje na /uploads kao novi v-row !
	// Posljednje, kad se klikne na ikonu smeća, uzima se routeId tog smeća, i radi se deleteOne za taj routeId u rute kolekciji !
	// Dalje napraviti istu stvar za tagove i points of interest (jednostavnije)
	try {
		await db
			.collection('korisnici')
			.updateOne({ username: req.params.username }, { $push: { createdWalks: newRoute } });
		res.status(200).json({ message: 'Walk added successfully' });
	} catch (error) {
		console.error('Error adding walk:', error);
		if (error instanceof mongo.MongoError) {
			res.status(500).json({ error: 'Database error: ' + error.message });
		} else {
			res.status(500).json({ error: 'Internal server error' });
		}
	}
});

app.get('/:userId/createdPoints', async (req, res) => {
	let db = await connect();
	try {
		const user = await db.collection('korisnici').findOne({ _id: new mongo.ObjectId(req.params.userId) });
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}
		const createdPoints = user.createdPoints;

		res.json({ createdPoints });
	} catch (error) {
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.get('/:userId/createdTags', async (req, res) => {
	let db = await connect();
	try {
		const user = await db.collection('korisnici').findOne({ _id: new mongo.ObjectId(req.params.userId) });
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}
		const createdTags = user.createdTags;
		res.json({ createdTags });
	} catch (error) {
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.get('/:userId/createdWalks', async (req, res) => {
	let db = await connect();
	try {
		const user = await db.collection('korisnici').findOne({ _id: new mongo.ObjectId(req.params.userId) });

		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		const createdWalks = user.createdWalks;

		res.json({ createdWalks });
	} catch (error) {
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.patch('/pointsOfInterest/:routeId', async (req, res) => {
	let db = await connect();
	let newPointOfInterest = req.body;
	try {
		const route = await db
			.collection('rute')
			.updateOne(
				{ _id: new mongo.ObjectId(req.params.routeId) },
				{ $push: { pointsOfInterest: newPointOfInterest } }
			);

		res.json({ msg: 'Added poi' });
	} catch (error) {
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.get('/pointsOfInterest/:routeId', async (req, res) => {
	let db = await connect();
	try {
		const route = await db.collection('rute').findOne({ _id: new mongo.ObjectId(req.params.routeId) });
		if (route) {
			const { pointsOfInterest } = route;
			res.json({ pointsOfInterest });
		} else {
			res.status(404).json({ error: 'Route not found' });
		}
	} catch (error) {
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.patch('/rute/:routeId/addTag', async (req, res) => {
	let updates = req.body;
	let db = await connect();

	try {
		const routeId = req.params.routeId;
		const newTag = updates.newTag;

		const result = await db
			.collection('rute')
			.updateOne({ _id: new mongo.ObjectId(routeId) }, { $push: { communityTags: newTag } });

		if (result.matchedCount === 0) {
			res.status(404).json({ error: 'Route not found' });
		} else if (result.modifiedCount === 1) {
			res.status(201).json({ message: 'Tag added successfully' });
		} else {
			res.status(500).json({ error: 'Error when adding tag' });
		}
	} catch (e) {
		res.status(500).json({ error: e.message });
	}
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

app.post('/addRoute', async (req, res) => {
	let route = req.body;
	let db = await connect();
	let addedRoute;

	try {
		await db.collection('rute').insertOne(route);
		addedRoute = await db.collection('rute').findOne({ name: route.name });
	} catch (e) {
		res.json({ error: e.message });
	}
	res.json({ newRoute: addedRoute });
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

app.get('/favourites/:username', async (req, res) => {
	const db = await connect();

	try {
		const korisnik = await db.collection('korisnici').findOne({ username: req.params.username });
		if (korisnik) {
			const { favourites } = korisnik;
			res.json({ favourites });
		} else {
			res.status(404).json({ error: 'Korisnik not found' });
		}
	} catch (error) {
		res.status(500).json({ error: 'Internal server error' });
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

app.patch('/favourite/:username', async (req, res) => {
	const routeId = req.body.routeId;
	const db = await connect();

	try {
		await db
			.collection('korisnici')
			.updateOne({ username: req.params.username }, { $addToSet: { favourites: routeId } })
			.then((result) => {
				res.status(200).json(result);
			})
			.catch((error) => {
				res.status(500).json({ error: 'Cannot add route to favourites' });
			});
	} catch (err) {
		res.status(500).json({ error: 'Invalid user id while adding route to favourites' });
	}
});

app.patch('/removeFavourite/:username', async (req, res) => {
	const routeId = req.body.routeId;
	const db = await connect();

	try {
		await db
			.collection('korisnici')
			.updateOne({ username: req.params.username }, { $pull: { favourites: routeId } })
			.then((result) => {
				res.status(200).json(result);
			})
			.catch((error) => {
				res.status(500).json({ error: 'Cannot remove route from favourites' });
			});
	} catch (err) {
		res.status(500).json({ error: 'Invalid user id while removing route from favourites' });
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
			res.json(korisnik);
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
