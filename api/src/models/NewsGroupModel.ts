import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

const NewsGroupSchema = new Schema({
    content: String,
    date: Date,
    image: {
        type: String,
        required: false,
    }
});

export = mongoose.model('NewsGroup', NewsGroupSchema);
