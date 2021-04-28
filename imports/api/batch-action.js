import { _ } from 'meteor/underscore';
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

  run(docs) {
    const self = this;
    Modal.confirmAndCall(self.method, {
      args: _.map(docs, doc => {
        let newDoc = _.clone(doc);
        if (self.transform) self.transform(newDoc);
        newDoc = { _id: newDoc._id, ...self.options };
        return newDoc;
      }),
    }, {
      action: this.sampleAction.name,
      entity: docs[0]?.entityName?.() || 'document',
      message: __('This operation will be performed on many documents', docs.length),
    });
  }
}
