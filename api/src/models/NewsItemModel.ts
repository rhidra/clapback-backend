import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

const NewsItemSchema = new Schema({
    a_date: Date,
    a_string: String,
});

export = mongoose.model('NewsItem', NewsItemSchema);
