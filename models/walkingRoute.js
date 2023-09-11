import mongoose from 'mongoose';
const { Schema } = mongoose;

const walkingRouteSchema = new Schema({
    name: String,
    description: String,
    distance: Number,
    duration: Number,
    difficulty: String,
});

const walkingRouteModel = mongoose.model('walkingRoute', walkingRouteSchema);

export default walkingRouteModel;
