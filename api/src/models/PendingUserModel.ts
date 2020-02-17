import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

const PendingUserSchema = new Schema({
    date: Date,
    phone: String,
    codeHashed: String,
});

export = mongoose.model('PendingUser', PendingUserSchema);
