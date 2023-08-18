import mongo from "mongodb";
import connect from "./db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

(async () => {
    let db = await connect();
    await db
        .collection("korisnici")
        .createIndex({ username: 1 }, { unique: true });
})();

export default {
    async registerUser(userData) {
        let db = await connect(); // Potreban await! Profesor se spaja lokalno pa je moguce da mu zato ne treba await

        let doc = {
            username: userData.username,
            password: await bcrypt.hash(userData.password, 8),
            grad: userData.grad,
        };
        try {
            let result = await db.collection("korisnici").insertOne(doc);
            if (result && result.insertedId) {
                return result.insertedId;
            }
        } catch (e) {
            if (e.code == 11000) {
                throw new Error("Korisnik vec postoji!");
            }
        }
    },
    async authenticateUser(username, password) {
        let db = await connect();
        let user = await db
            .collection("korisnici")
            .findOne({ username: username });

        // Bcrypt compare vraca true ako je lozinka ista, a false ako nije
        // Provjerava lozinku bez da je sprema u bazu
        // Ako je provjera ok onda se radi token
        if (
            user &&
            user.password &&
            (await bcrypt.compare(password, user.password))
        ) {
            delete user.password;
            let token = jwt.sign(user, process.env.JWT_SECRET, {
                algorithm: "HS512",
                expiresIn: "1 week",
            });
            return {
                token,
                username: user.username,
            };
        } else {
            throw new Error("Cannot authenticate");
        }
    },
    verify(req, res, next) {
        // next poziva sljedecu middleware funkciju, mora biti pozvan
        try {
            let authorization = req.headers.authorization.split(" ");
            let type = authorization[0]; // bearer tip tokena
            let token = authorization[1]; // token

            if (type !== "Bearer") {
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
