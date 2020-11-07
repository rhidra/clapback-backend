import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

/**
 * PendingMedia
 * Small utility model to temporarily save media file names before they get processed and saved
 */
const PendingMediaSchema = new Schema({
  date: { type: Date, default: Date.now, required: true },
  filename: { type: String, required: true },
});

export = mongoose.model('PendingMedia', PendingMediaSchema);
