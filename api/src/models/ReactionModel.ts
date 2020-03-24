import * as mongoose from 'mongoose';
import Topic from './TopicModel';
import {handleError} from '../middleware/utils';

const Schema = mongoose.Schema;

/**
 * A reaction or a clapback of a user to a news topic.
 */
const ReactionSchema = new Schema({
  topic: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true, default: Date.now },

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
});

ReactionSchema.post('remove', (doc: any) => {
  if (doc.topic) {
    Topic.findByIdAndUpdate(doc.topic, {$inc: {clapbacksCounter: -1}}, err => handleError(err));
  }
});

ReactionSchema.methods.addHasLiked = function(userId: string): Promise<any> {
  const doc: any = this.toJSON();
  return mongoose
    .model('Like')
    .findOne({reaction: this._id, user: userId}).exec()
    .then((like: any) => {
      if (like) {
        doc.hasLiked = true;
        return Promise.resolve(doc);
      }
      return Promise.resolve(this);
    })
    .catch(err => console.log('erreur', err));
};

export = mongoose.model('Reaction', ReactionSchema);
