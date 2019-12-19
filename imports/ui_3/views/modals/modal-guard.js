import { Template } from 'meteor/templating';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { modalZIndexHandler } from '/imports/startup/client/modal-patches.js';
import './modal-guard.html';

Template.Modal_guard.onCreated(function () {
  const dataId = this.parent().data.id;
  ModalStack.push(dataId);
});

Template.Modal_guard.onRendered(function () {
  modalZIndexHandler();
});

Template.Modal_guard.onDestroyed(function () {
  const dataId = this.parent().data.id;
  ModalStack.pop(dataId);
});
