import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import mongo from 'mongodb';
import auth from './auth.js';
import connect from './db.js';
import mongoose from 'mongoose';

mongoose.connect('mongodb+srv://admin:admin@clusternovi.oayb4ih.mongodb.net/walk_it', {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.use(function (req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content Type, Accept, Authorization');
	next();
});

app.get('/users', async (req, res) => {
	let db = await connect();
	let kolekcija = db.collection('korisnici');
	let cursor = await kolekcija.find();
	let korisnici = await cursor.toArray();

	res.json(korisnici);
});

app.post('/users', async (req, res) => {
	let user = req.body;
	let result = 'User registration successfull';
	try {
		await auth.registerUser(user);
	} catch (e) {
		res.status(500).json({ error: e.message });
	}
	res.json({ result });
});

app.get('/users/:username', async (req, res) => {
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

app.patch('/users/:username', async (req, res) => {
	const db = await connect();
	const newUsername = req.body.newUsername;
	const username = req.params.username;
	try {
		await db
			.collection('korisnici')
			.updateOne({ username: username }, { $set: { username: newUsername } })
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

app.patch('/users/:username/passwords', [auth.verify], async (req, res) => {
	const updates = req.body;
	const username = req.params.username;

	if (updates.new_password && updates.old_password) {
		let result = await auth.changeUserPassword(username, updates.old_password, updates.new_password);
		if (result) {
			res.status(201).send();
		} else {
			res.status(500).json({ error: 'Cannot change password' });
		}
	} else {
		res.status(400).json({ error: 'Krivi upit' });
	}
});

app.patch('/users/:username/images', async (req, res) => {
	const db = await connect();
	const newUrl = req.body.imageUrl;
	const username = req.params.username;

	try {
		await db
			.collection('korisnici')
			.updateOne({ username: username }, { $set: { imageUrl: newUrl } })
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

app.get('/users/:username/favourites', async (req, res) => {
	const db = await connect();
	const username = req.params.username;

	try {
		const user = await db.collection('korisnici').findOne({ username: username });
		if (user) {
			const { favourites } = user;
			res.json({ favourites });
		} else {
			res.status(404).json({ error: 'User not found' });
		}
	} catch (error) {
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.post('/users/:username/favourites/:walkId', async (req, res) => {
	const db = await connect();
	const walkId = req.params.walkId;
	const username = req.params.username;

	try {
		await db
			.collection('korisnici')
			.updateOne({ username: username }, { $addToSet: { favourites: walkId } })
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

app.delete('/users/:username/favourites/:walkId', async (req, res) => {
	const db = await connect();
	const walkId = req.params.walkId;
	const username = req.params.username;

	try {
		await db
			.collection('korisnici')
			.updateOne({ username: username }, { $pull: { favourites: walkId } })
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

app.get('/users/:userId/walks', async (req, res) => {
	let db = await connect();
	const userId = req.params.userId;
	try {
		const user = await db.collection('korisnici').findOne({ _id: new mongo.ObjectId(userId) });

		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		const createdWalks = user.createdWalks;

		res.json({ createdWalks });
	} catch (error) {
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.post('/users/:username/walks', async (req, res) => {
	let db = await connect();
	const newWalk = req.body;
	const username = req.params.username;
	try {
		await db.collection('korisnici').updateOne({ username: username }, { $push: { createdWalks: newWalk } });
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

app.get('/users/:userId/tags', async (req, res) => {
	let db = await connect();
	const userId = req.params.userId;
	try {
		const user = await db.collection('korisnici').findOne({ _id: new mongo.ObjectId(userId) });
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}
		const createdTags = user.createdTags;
		res.json({ createdTags });
	} catch (error) {
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.post('/users/:username/tags', async (req, res) => {
	let db = await connect();
	const newTag = req.body;
	const username = req.params.username;
	try {
		await db.collection('korisnici').updateOne({ username: username }, { $push: { createdTags: newTag } });
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

app.get('/users/:userId/pointsOfInterest', async (req, res) => {
	let db = await connect();
	const userId = req.params.userId;
	try {
		const user = await db.collection('korisnici').findOne({ _id: new mongo.ObjectId(userId) });
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}
		const createdPoints = user.createdPoints;

		res.json({ createdPoints });
	} catch (error) {
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.post('/users/:username/pointsOfInterest', async (req, res) => {
	let db = await connect();
	const newPoint = req.body;
	const username = req.params.username;
	try {
		await db.collection('korisnici').updateOne({ username: username }, { $push: { createdPoints: newPoint } });
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

app.delete('/users/:username/walks/:walkId', async (req, res) => {
	let db = await connect();
	const username = req.params.username;
	const walkId = req.params.walkId;
	try {
		await db
			.collection('korisnici')
			.updateOne({ username: username }, { $pull: { createdWalks: { routeId: walkId } } });

		res.status(200).json({ message: 'Walk deleted successfully' });
	} catch (error) {
		console.error('Error deleting walk:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.delete('/users/:username/tags/:tagValue', async (req, res) => {
	let db = await connect();
	const username = req.params.username;
	const tagValue = req.params.tagValue;
	try {
		await db
			.collection('korisnici')
			.updateOne({ username: username }, { $pull: { createdTags: { value: tagValue } } });

		res.status(200).json({ message: 'Tag deleted successfully' });
	} catch (error) {
		console.error('Error deleting tag:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.delete('/users/:username/pointsOfInterest/:pointName', async (req, res) => {
	let db = await connect();
	const username = req.params.username;
	const pointName = req.params.pointName;
	try {
		await db
			.collection('korisnici')
			.updateOne({ username: username }, { $pull: { createdPoints: { name: pointName } } });

		res.status(200).json({ message: 'Point deleted successfully' });
	} catch (error) {
		console.error('Error deleting point:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.get('/walks', async (req, res) => {
	let db = await connect();
	let cursor = await db.collection('rute').find();
	let results = await cursor.toArray();
	res.json(results);
});

app.post('/walks', async (req, res) => {
	let walk = req.body;
	let db = await connect();

	try {
		await db.collection('rute').insertOne(walk);
		const addedWalk = await db.collection('rute').findOne({ name: walk.name });

		res.json({ addedWalk: addedWalk });
	} catch (e) {
		res.json({ error: e.message });
	}
});

app.get('/walks/:walkId', async (req, res) => {
	const walkId = req.params.walkId;
	let db = await connect();
	let doc = await db.collection('rute').findOne({ _id: new mongo.ObjectId(walkId) });
	res.json(doc);
});

app.delete('/walks/:walkId', async (req, res) => {
	let db = await connect();
	const walkId = req.params.walkId;
	try {
		await db.collection('rute').deleteOne({ _id: new mongo.ObjectId(walkId) });
		res.status(200).json({ message: 'Walk deleted successfully' });
	} catch (error) {
		console.error('Error deleting walk:', error);
	}
});

app.get('/walks/:walkId/pointsOfInterest', async (req, res) => {
	const db = await connect();
	const walkId = req.params.walkId;
	try {
		const walk = await db.collection('rute').findOne({ _id: new mongo.ObjectId(walkId) });
		if (walk) {
			const { pointsOfInterest } = walk;
			res.json({ pointsOfInterest });
		} else {
			res.status(404).json({ error: 'Walk not found' });
		}
	} catch (error) {
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.post('/walks/:walkId/pointsOfInterest', async (req, res) => {
	let db = await connect();
	let newPointOfInterest = req.body;
	const walkId = req.params.walkId;
	try {
		const result = await db
			.collection('rute')
			.updateOne({ _id: new mongo.ObjectId(walkId) }, { $push: { pointsOfInterest: newPointOfInterest } });

		if (result.modifiedCount === 0) {
			return res.status(404).json({ error: 'Walk not found' });
		}

		res.status(201).json(newPointOfInterest);
	} catch (error) {
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.delete('/walks/:walkId/pointsOfInterest/:pointName', async (req, res) => {
	let db = await connect();
	const pointName = req.params.pointName;
	const walkId = req.params.walkId;
	try {
		const result = await db
			.collection('rute')
			.updateOne({ _id: new mongo.ObjectId(walkId) }, { $pull: { pointsOfInterest: { name: pointName } } });
		if (result.modifiedCount === 0) {
			return res.status(404).json({ error: 'Walk or point of interest not found' });
		}
		res.status(200).json({ message: 'Point deleted successfully' });
	} catch (error) {
		console.error('Error deleting point:', error);
	}
});

app.post('/walks/:walkId/tags', async (req, res) => {
	const db = await connect();
	const newTagValue = req.body.tagName;
	const walkId = req.params.walkId;

	try {
		const result = await db
			.collection('rute')
			.updateOne({ _id: new mongo.ObjectId(walkId) }, { $push: { communityTags: newTagValue } });

		if (result.matchedCount === 0) {
			res.status(404).json({ error: 'Walk not found' });
		} else if (result.modifiedCount === 1) {
			res.status(201).json({ message: 'Tag added successfully' });
		} else {
			res.status(500).json({ error: 'Error while adding tag' });
		}
	} catch (e) {
		res.status(500).json({ error: e.message });
	}
});

app.delete('/walks/:walkId/tags/:tagValue', async (req, res) => {
	let db = await connect();
	let walkId = req.params.walkId;
	let tagValue = req.params.tagValue;
	try {
		await db
			.collection('rute')
			.updateOne({ _id: new mongo.ObjectId(walkId) }, { $pull: { communityTags: tagValue } });
		res.status(200).json({ message: 'Tag deleted successfully' });
	} catch (error) {
		console.error('Error deleting tag:', error);
	}
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

app.get('/tajna', [auth.verify], (req, res) => {
	res.json({ message: `Ovo je tajna ${req.jtw.username}` });
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

app.listen(process.env.PORT || port, () => {
	console.log(`Slušam na portu ${port}`);
});
