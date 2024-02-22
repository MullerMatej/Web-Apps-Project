import mongo from 'mongodb';
import connect from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

(async () => {
	let db = await connect();
	await db.collection('korisnici').createIndex({ username: 1 }, { unique: true });
})();

export default {
	async registerUser(userData) {
		let db = await connect();
		let doc = {
			username: userData.username,
			email: userData.email,
			password: await bcrypt.hash(userData.password, 8),
			imageUrl: userData.imageUrl,
			favourites: userData.favourites,
			createdWalks: userData.createdWalks,
			createdTags: userData.createdTags,
			createdPoints: userData.createdPoints,
		};
		try {
			let result = await db.collection('korisnici').insertOne(doc);
			if (result && result.insertedId) {
				return result.insertedId;
			}
		} catch (e) {
			if (e.code == 11000) {
				throw new Error('User already exists');
			}
		}
	},
	async authenticateUser(username, password) {
		let db = await connect();
		let user = await db.collection('korisnici').findOne({ username: username });
		if (user && user.password && (await bcrypt.compare(password, user.password))) {
			delete user.password;
			let token = jwt.sign(user, process.env.JWT_SECRET, {
				algorithm: 'HS512',
				expiresIn: '1 week',
			});
			return {
				token,
				username: user.username,
			};
		} else {
			throw new Error('Cannot authenticate');
		}
	},
	async changeUserPassword(username, old_Password, new_Password) {
		let db = await connect();
		let user = await db.collection('korisnici').findOne({ username: username });

		if (user && user.password && (await bcrypt.compare(old_Password, user.password))) {
			let new_password_hashed = await bcrypt.hash(new_Password, 8);

			let result = await db.collection('korisnici').updateOne(
				{ _id: user._id },
				{
					$set: {
						password: new_password_hashed,
					},
				}
			);
			return result.modifiedCount == 1;
		}
	},
	verify(req, res, next) {
		try {
			let authorization = req.headers.authorization.split(' ');
			let type = authorization[0];
			let token = authorization[1];

			if (type !== 'Bearer') {
				return res.status(401).send();
			} else {
				req.jtw = jwt.verify(token, process.env.JWT_SECRET);
				return next();
			}
		} catch (e) {
			return res.status(401).send();
		}
	},
};
