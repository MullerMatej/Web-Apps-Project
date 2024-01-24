import mongoose from 'mongoose';

const routeSchema = new mongoose.Schema({
    name: String,
    description: String,
    distance: Number,
    duration: Number,
    difficulty: String,
    location: String,
    visited: Number,
    image: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Image',
    },
});

const Route = mongoose.model('Route', routeSchema);

export default Route;
