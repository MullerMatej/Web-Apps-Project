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
		let db = await connect(); // Potreban await! Profesor se spaja lokalno pa je moguce da mu zato ne treba await

		let doc = {
			username: userData.username,
			email: userData.email,
			password: await bcrypt.hash(userData.password, 8),
		};
		try {
			let result = await db.collection('korisnici').insertOne(doc);
			if (result && result.insertedId) {
				return result.insertedId;
			}
		} catch (e) {
			if (e.code == 11000) {
				throw new Error('Korisnik vec postoji!');
			}
		}
	},
	async authenticateUser(username, password) {
		let db = await connect();
		let user = await db.collection('korisnici').findOne({ username: username });

		// Bcrypt compare vraca true ako je lozinka ista, a false ako nije
		// Provjerava lozinku bez da je sprema u bazu
		// Ako je provjera ok onda se radi token
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
			// Provjeri da li je stara lozinka koju je poslao ista kao ona u bazi
			let new_password_hashed = await bcrypt.hash(new_Password, 8); // Hashiraj novu lozinku

			let result = await db.collection('korisnici').updateOne(
				{ _id: user._id }, // imamo ga spremljenog u user varijabli, dosao je iz jwt tokena
				{
					$set: {
						password: new_password_hashed, // Spremamo novu hashiranu lozinku, ne smije biti plain text lozinka u bazi
					},
				}
			);

			return result.modifiedCount == 1; // Ako je promijenjen tocno jedan zapis onda ce vratiti true
		}
	},
	verify(req, res, next) {
		// next poziva sljedecu middleware funkciju, mora biti pozvan
		try {
			let authorization = req.headers.authorization.split(' ');
			let type = authorization[0]; // bearer tip tokena
			let token = authorization[1]; // token

			if (type !== 'Bearer') {
				return res.status(401).send();
			} else {
				req.jtw = jwt.verify(token, process.env.JWT_SECRET);
				return next();
			}
		} catch (e) {
			return res.status(401).send(); // 401 Unauthorized
		}
	},
};
