import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import './modal-guard.html';

function modalZIndexHandler() {
  const zIndexPlus = $('.modal').length * 20;
  const firstModalZIndex = Number($('.modal').first().css('z-index'));
  const firstModalBackDropZIndex = Number($('.modal-backdrop.in').first().css('z-index'));
  $('.modal').last().css('z-index', firstModalZIndex + zIndexPlus);
  $('.modal-backdrop.in').last().css('z-index', firstModalBackDropZIndex + zIndexPlus);
}

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
