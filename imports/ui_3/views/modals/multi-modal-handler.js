import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { _ } from 'meteor/underscore';
import { Template } from 'meteor/templating';
import { debugAssert } from '/imports/utils/assert.js';

import './multi-modal-handler.html';

// This is how we did it, before multi modals
export function runInNewModal(toRun) {
  Meteor.setTimeout(toRun, 1000);
  Modal.hide();
}

Modal.allowMultiple = true;

Template.Multi_modal_handler.onCreated(function () {
  if (!Session.get('openedModals')) Session.set('openedModals', []);
  const openedModals = Session.get('openedModals');
  const dataId = this.parent().data.id;
  openedModals.push(dataId);
  Session.set('openedModals', openedModals);
});

Template.Multi_modal_handler.onDestroyed(function () {
  const dataId = this.parent().data.id;
  const openedModals = Session.get('openedModals');
  //  openedModals.forEach((modalId) => {
  //    if (modalId === dataId) openedModals = _.without(openedModals, modalId);
  //  });
  // Should be enough to pop
  const topModal = openedModals.pop();
  debugAssert((!topModal && !dataId) || topModal === dataId);
  if (openedModals.length > 0) $('body').addClass('modal-open');
  Session.set('openedModals', openedModals);
  Modal.hide();
});
