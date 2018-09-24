import { Meteor } from 'meteor/meteor'; 
import { _ } from 'meteor/underscore'; 

import { Topics } from '/imports/api/topics/topics.js'; 

export function revision(selector, modifier, fields) {
  let replacedData = null;
  const toBePushed = [];
  for (let i = 2; i < arguments.length; i++) {
    const field = arguments[i];
    if (modifier.$set && modifier.$set[field]) {
      const selectorId = selector._id || selector;
      const doc = Topics.findOne(selectorId);
      if (!_.isEqual(Object.byString(doc, field), modifier.$set[field])) {
        modifier.$push = modifier.$push || {};
        replacedData = doc[field];
        toBePushed.push({ 'replaceDate': new Date(), 'replacedField': field, 'oldData': replacedData });   
      }
    }
  }
  if (replacedData) {
    modifier.$push.revision = { $each: toBePushed, $position: 0 };
  }
}
