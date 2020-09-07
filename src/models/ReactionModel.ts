import * as mongoose from 'mongoose';
import Topic from './TopicModel';
import {addHasLiked, handleError, isVideoProcessed} from '../middleware/utils';
import User from './UserModel';

const Schema = mongoose.Schema;

/**
 * A reaction or a clapback of a user to a news topic.
 */
const ReactionSchema = new Schema({
  topic: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true, default: Date.now },
  hashtags: { type: [String], required: true },
  isPublic: { type: Boolean, default: true },
  isProcessing: { type: Boolean, default: false },

  video: String,
  text: String,

  likesCounter: { type: Number, default: 0 },
  commentsCounter: { type: Number, default: 0 },
  viewsCounter: { type: Number, default: 0 },
});

ReactionSchema.post('save', (doc: any) => {
  if (doc.topic) {
    Topic.findByIdAndUpdate(doc.topic, {$inc: {clapbacksCounter: 1}}, err => handleError(err));
  }
  User.findByIdAndUpdate(doc.user, {$inc: {clapbacksCounter: 1}}, err => handleError(err));
});

ReactionSchema.post('remove', (doc: any) => {
  if (doc.topic) {
    Topic.findByIdAndUpdate(doc.topic, {$inc: {clapbacksCounter: -1}}, err => handleError(err));
  }
  User.findByIdAndUpdate(doc.user, {$inc: {clapbacksCounter: -1}}, err => handleError(err));
});

ReactionSchema.methods.addHasLiked = function(userId: string): Promise<any> {
  return addHasLiked(this, 'reaction', userId);
};

ReactionSchema.methods.isProcessed = async function(): Promise<boolean> {
  return await isVideoProcessed(this.video);
};

export = mongoose.model('Reaction', ReactionSchema);
