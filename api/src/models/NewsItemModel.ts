import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

const NewsItemSchema = new Schema({
    title: String,
    content: String,
    videoLeft: {
        type: String,
        required: false,
    },
    videoRight: {
        type: String,
        required: false,
    },
    group: {
        type: Schema.Types.ObjectId,
        ref: 'NewsGroup',
    }
});

export = mongoose.model('NewsItem', NewsItemSchema);
