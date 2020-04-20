import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { __ } from '/imports/localization/i18n.js';

export class BatchAction {
  constructor(action, method, options = {}, sampleDoc = {}) {
    this.action = action;
    this.method = method;
    this.options = options; // _.extend({ batch: true }, options);
    this.sampleDoc = sampleDoc;   // sampleDoc will be used to determine icon, etc...
    this.sampleAction = action(options, sampleDoc);
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
    Modal.confirmAndCall(this.method, { args: _.map(docs, doc => ({ _id: doc._id, ...this.options })) }, {
      action: this.sampleAction.name,
      message: __('This operation will be performed on many documents', docs.length),
    });
  }
}
