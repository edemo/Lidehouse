import { _ } from 'meteor/underscore'; 

import { Topics } from '/imports/api/topics/topics.js'; 

export function revision(selector, modifier, fields) {
  const changes = [];
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (modifier.$set && modifier.$set[field]) {
      const doc = Topics.findOne(selector);
      if (!_.isEqual(Object.byString(doc, field), modifier.$set[field])) {
        modifier.$push = modifier.$push || {};
        changes.push({ replaceTime: new Date(), replacedField: field, oldValue: doc[field] });
      }
    }
  }
  if (changes.length > 0) {
    modifier.$push.revision = { $each: changes, $position: 0 };
  }
}
