import { _ } from 'meteor/underscore';
import { Mongo } from 'meteor/mongo';

export class RevisionedCollection extends Mongo.Collection {
  constructor(name, revisionedFields) {
    super(name);
    this._revisonedFields = revisionedFields;
  }
  insert(topic, callback) {
    return super.insert(topic, callback);
  }
  update(selector, modifier, options, callback) {
    const changes = [];
    for (let i = 0; i < this._revisonedFields.length; i++) {
      const field = this._revisonedFields[i];
      if (modifier.$set && modifier.$set[field]) {
        const doc = super.findOne(selector);
        if (!_.isEqual(Object.byString(doc, field), modifier.$set[field])) {
          changes.push({ replaceTime: new Date(), replacedField: field, oldValue: doc[field] });
        }
      }
    }
    if (changes.length > 0) {
      modifier.$push = modifier.$push || {};
      modifier.$push.revision = { $each: changes, $position: 0 };
    }
    return super.update(selector, modifier, options, callback);
  }
  remove(selector, callback) {
    return super.remove(selector, callback);
  }
}
