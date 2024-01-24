import express from 'express';

const app = express();
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');

require('dotenv').config();

const mongouri =
    'mongodb+srv://User1:' +
    process.env.MONGO_PASS +
    '@cluster0.wakey.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
try {
    mongoose.connect(mongouri, {
        useUnifiedTopology: true,
        useNewUrlParser: true,
    });
} catch (error) {
    handleError(error);
}
process.on('unhandledRejection', (error) => {
    console.log('unhandledRejection', error.message);
});

//creating bucket
let bucket;
mongoose.connection.on('connected', () => {
    var db = mongoose.connections[0].db;
    bucket = new mongoose.mongo.GridFSBucket(db, {
        bucketName: 'newBucket',
    });
    console.log(bucket);
});

//to parse json content
app.use(express.json());
//to parse body from url
app.use(
    express.urlencoded({
        extended: false,
    })
);

app.listen(process.env.PORT, function () {
    console.log(`Application live on localhost:{process.env.PORT}`);
});
