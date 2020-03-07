import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { __ } from '/imports/localization/i18n.js';

export class BatchAction {
  constructor(action, method, options) {
    this.action = action;
    this.method = method;
    this.options = options; // _.extend({ batch: true }, options);
  }
  name() {
    return this.action.name;
  }
  icon() {
    return this.action.icon(this.options, undefined);
  }
  visible(docs) {
    return _.every(docs, doc => this.action.visible(this.options, doc));
  }
  run(docs) {
    Modal.confirmAndCall(this.method, { args: _.map(docs, doc => ({ _id: doc._id, ...this.options })) }, {
      action: this.action.name,
      message: __('This operation will be performed on many documents', docs.length),
    });
  }
}
