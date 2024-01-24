import mongoose from 'mongoose';
const { Schema } = mongoose;

const ImageSchema = new Schema(
    {
        filePath: String,
        // name: String,
        // description: String,
        // image: String,
    },
    {
        timestamps: true,
    },
    {
        collection: 'images',
    }
);

const Image = mongoose.model('Image', ImageSchema);

export default Image;
