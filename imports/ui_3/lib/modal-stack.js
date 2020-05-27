import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';
import { $ } from 'meteor/jquery';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

// This is how we did it, before multi modals
export function runInNewModal(toRun) {
  Meteor.setTimeout(toRun, 1000);
  Modal.hide();
}

export let ModalStack = {};

if (Meteor.isClient) {
  import { Session } from 'meteor/session';

  // Set up peppelg:bootstrap-3-modal to allow multiple modals
  Modal.allowMultiple = true;

  // ModalStack data structure:
  // [{ id:'af.object.action', result: { id1: result1, id2: result2 } }]

  ModalStack = {
    push(dataId) {
      const modalStack = Session.get('modalStack');
      // console.log('before push:', modalStack);
      modalStack.push({ id: dataId, result: {}, context: {} });
      // console.log('after push:', modalStack);
      Session.set('modalStack', modalStack);
    },
    pop(dataId) {
      const modalStack = Session.get('modalStack');
      // console.log('before pop:', modalStack);
      const topModal = modalStack.pop();
      debugAssert((!topModal.id && !dataId) || topModal.id === dataId);
      // console.log('after pop:', modalStack);
      Session.set('modalStack', modalStack);
      if (modalStack.length > 1) $('body').addClass('modal-open');
      else modalStack[0] = { result: {}, context: {} }; // clean context up after last modal
      // Modal.hide();  // not necessary
    },
    active() {
      const modalStack = Session.get('modalStack');
      return (modalStack.length > 1) && _.last(modalStack);
    },
    height() {
      const modalStack = Session.get('modalStack');
      return modalStack.length - 1;
    },
    recordResult(afId, result) {
      const modalStack = Session.get('modalStack');
      if (modalStack.length <= 1) return; // If there is no modal, no need to pass on the result
      modalStack[modalStack.length - 2].result[afId] = result;
      Session.set('modalStack', modalStack);
    },
    readResult(ownId, afId) {
      const modalStack = Session.get('modalStack');
      // console.log('before read', modalStack);
      let ownModal = {};
      ownModal = _.find(modalStack, modal => (modal.id === ownId));
      // console.log('ownModal:', ownModal);
      // console.log('returns:', ownModal?.result[afId]);
      return ownModal?.result[afId];
    },
    setVar(key, value) { // Should not call this within an autorun - would cause infinite loop
      const modalStack = Session.get('modalStack');
      // console.log('before set', modalStack);
      // console.log('set value', value);
      _.last(modalStack).context[key] = value;
      // console.log('after set', modalStack);
      Session.set('modalStack', modalStack);
    },
    getVar(key) {
      const modalStack = Session.get('modalStack');
      // console.log('before get', modalStack);
      for (let i = modalStack.length - 1; i >= 0; i--) {
        const value = modalStack[i].context[key];
        if (value) return value;
      }
      return undefined;
    },
  };
}
