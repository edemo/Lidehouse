import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { __ } from '/imports/localization/i18n.js';

export class BatchAction {
  constructor(action, method) {
    this.action = action;
    this.method = method;
  }
  name() {
    return this.action.name;
  }
  icon() {
    return this.action.icon;
  }
  visible(ids) {
    const self = this;
    return _.every(ids, function (id) { return self.action.visible(id); });
  }
  run(ids) {
    Modal.confirmAndCall(this.method, { args: ids.map(_id => ({ _id })) }, {
      action: this.action.name,
      message: __('This operation will be performed on many documents', ids.length),
    });
  }
}
