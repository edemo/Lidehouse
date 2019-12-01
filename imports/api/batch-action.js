import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { __ } from '/imports/localization/i18n.js';

export class BatchAction {
  constructor(action, method, options) {
    this.action = action;
    this.method = method;
    this.options = options;
  }
  name() {
    return this.action.name;
  }
  icon() {
    return this.action.icon(this.options, {});
  }
  visible(docs) {
    const self = this;
    return _.every(docs, function (doc) { return self.action.visible(this.options, doc); });
  }
  run(docs) {
    Modal.confirmAndCall(this.method, { args: docs.map(doc => ({ _id: doc._id, ...this.options })) }, {
      action: this.action.name,
      message: __('This operation will be performed on many documents', docs.length),
    });
  }
}
