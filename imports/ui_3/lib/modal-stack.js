import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { debugAssert } from '/imports/utils/assert.js';
import { Log } from '/imports/utils/log.js';

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
    contextForTheNext: {},
    get() {
      let modalStack = Session.get('modalStack');
      if (!modalStack) {
        modalStack = [{ id: 'root', context: {} }];
        Session.set('modalStack', modalStack);
        Session.set('modalStackResults_root', {});
      }
      return modalStack;
    },
    push(dataId) { // called upon Modal.show();
      const modalStack = ModalStack.get();
      // Log.debug('before push:', modalStack);
      modalStack.push({ id: dataId, context: ModalStack.contextForTheNext });
      const resultsKey = 'modalStackResults_' + dataId;
      // Log.debug('after push:', modalStack);
      Session.set('modalStack', modalStack);
      Session.set(resultsKey, {});
      ModalStack.contextForTheNext = {};
    },
    pop(dataId) { // called upon Modal.hide();
      const modalStack = ModalStack.get();
      // Log.debug('before pop:', modalStack);
      let topModal = modalStack.pop();
      // at changing modals eg. in import, push may happen before pop
      if (topModal.id !== dataId) {
        const nextModal = modalStack.pop();
        debugAssert((!nextModal.id && !dataId) || nextModal.id === dataId, 'No modal to pop on ModalStack');
        modalStack.push(topModal);
        topModal = nextModal;
      }
      const resultsKey = 'modalStackResults_' + topModal.id;
      if (ModalStack.computation && modalStack.length <= 1) {
        ModalStack.computation.stop();
        delete ModalStack.computation;
      }
      // Log.debug('after pop:', modalStack);
      Session.set('modalStack', modalStack);
      Session.set(resultsKey, undefined);
      if (modalStack.length > 1) $('body').addClass('modal-open');
    },
    active() {
      const modalStack = ModalStack.get();
      return (modalStack.length > 1) && _.last(modalStack);
    },
    height() {
      const modalStack = ModalStack.get();
      return modalStack.length - 1;
    },
    recordResult(afId, result) {
      let modalStack;
      Tracker.nonreactive(() => { modalStack = ModalStack.get(); });
      if (modalStack.length <= 1) return; // If there is no modal, no need to pass on the result
      const currentLevel = modalStack.length - 1;
      const lowerModalId = modalStack[currentLevel - 1].id;
      const resultsKey = 'modalStackResults_' + lowerModalId;
      let results;
      Tracker.nonreactive(() => { results = Session.get(resultsKey); });
      results[afId] = result;
      Session.set(resultsKey, results);
    },
    readResult(ownId, afId) {
      const resultsKey = 'modalStackResults_' + ownId;
      const results = Session.get(resultsKey);
      const result = results?.[afId];
      return result;
    },
    setVar(key, value, keep = false) { // Should not call this within an autorun - would cause infinite loop
      if (key === 'communityId') {
        Session.set('communityId', value);   // temporary solution, for efficiency (communityId is used in subscription parameters)
        return;
      }
      const modalStack = ModalStack.get();
      // Log.debug('before set', modalStack);
      // Log.debug('set value', value);
      if (keep) { // keep sets it for this level
        _.last(modalStack).context[key] = value;
        Session.set('modalStack', modalStack);
      } else { // no keep sets it only for the next level
        ModalStack.contextForTheNext[key] = value;
      }
      // Log.debug('after set', modalStack);
    },
    getVar(key) {
      if (key === 'communityId') {
        return Session.get('communityId'); // temporary solution, for efficiency (communityId is used in subscription parameters)
      }
      let modalStack;
      Tracker.nonreactive(() => { modalStack = ModalStack.get(); });
      // Log.debug('before get', modalStack);
      const currentLevel = modalStack.length - 1;
      for (let i = currentLevel; i >= 0; i--) {
        const value = modalStack[i].context[key];
        if (value !== undefined) return value;
      }
      return undefined;
    },
    autorun(func) {
      ModalStack.computation = Tracker.autorun(func);
    },
/*    setCallback(callback) {
      const modalStack = ModalStack.get();
      _.last(modalStack).callback = callback;
      Session.set('modalStack', modalStack);
    },
    getCallback() {
      const modalStack = ModalStack.get();
      return _.last(modalStack).callback;
    },*/
  };
}
