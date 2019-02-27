import { _ } from 'meteor/underscore';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Clock } from '/imports/utils/clock.js';
import '/imports/startup/both/utils.js';

const revisionSchema = new SimpleSchema({
  revision: { type: Array, optional: true, autoform: { omit: true } },
  'revision.$': { type: Object, blackbox: true, optional: true },
});
export class RevisionedCollection extends Mongo.Collection {
  constructor(name, revisionedFields) {
    super(name);
    this._revisonedFields = revisionedFields;
    this.attachSchema(revisionSchema);
  }
  addRevisionedField(field) {
    this._revisonedFields.push(field);
  }
  // overriding Mongo.Collection methods
  insert(doc, callback) {
    return super.insert(doc, callback);
  }
  update(selector, modifier, options, callback) {
    this._revision(selector, modifier);   // modifier is modified!
    return super.update(selector, modifier, options, callback);
  }
  remove(selector, callback) {
    return super.remove(selector, callback);
  }
  // implementation
  _revision(selector, modifier) {
    const changes = [];
    for (let i = 0; i < this._revisonedFields.length; i++) {
      const field = this._revisonedFields[i];
      if (modifier.$set && modifier.$set[field]) {
        const doc = super.findOne(selector);
        if (!_.isEqual(Object.byString(doc, field), modifier.$set[field])) {
          changes.push({ time: Clock.currentTime(), field, oldValue: Object.byString(doc, field) });
        }
      }
    }
    if (changes.length > 0) {
      modifier.$push = modifier.$push || {};
      modifier.$push.revision = { $each: changes, $position: 0 };
    }
  }
}
