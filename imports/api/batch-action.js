import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { __ } from '/imports/localization/i18n.js';

export class BatchAction {
  constructor(action, method, options = {}, sampleDoc = {}, transform) {
    this.action = action;
    this.method = method;
    this.options = options; // _.extend({ batch: true }, options);
    this.sampleDoc = sampleDoc; // sampleDoc will be used to determine icon, etc...
    this.sampleAction = action(options, sampleDoc);
    this.transform = transform;
  }

  name() {
    return this.sampleAction.name;
  }

  icon() {
    return this.sampleAction.icon;
  }

  visible(docs) {
    return _.every(docs, doc => this.action(this.options, doc).visible);
  }

  mapIds(docs) {
    const self = this;
    const result = [];
    _.each(docs, doc => {
      let tDoc = doc;
      if (self.transform) {
        tDoc = _.clone(doc);
        self.transform(tDoc);
      }
      let ids;
      if (typeof tDoc._id === 'string') ids = [tDoc._id];
      else if (typeof tDoc._id === 'object' && Array.isArray(tDoc._id)) ids = tDoc._id;
      else debugAssert(false);
      _.each(ids, id => {
        const newDoc = { _id: id, ...self.options };
        result.push(newDoc);
      });
    });
    return result;
  }

  run(docs) {
    const self = this;
    Modal.confirmAndCall(self.method, { args: self.mapIds(docs) }, {
      action: this.sampleAction.name,
      entity: docs[0]?.entityName?.() || 'document',
      message: __('This operation will be performed on many documents', docs.length),
    });
  }
}
