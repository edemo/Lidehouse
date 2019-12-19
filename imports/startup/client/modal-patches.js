import { $ } from 'meteor/jquery';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

Modal.hideAll = function hideAll() {
  $('.modal').modal('hide');
};

export function modalZIndexHandler() {
  const zIndexPlus = $('.modal').length * 20;
  const firstModalZIndex = Number($('.modal').first().css('z-index'));
  const firstModalBackDropZIndex = Number($('.modal-backdrop.in').first().css('z-index'));
  $('.modal').last().css('z-index', firstModalZIndex + zIndexPlus);
  $('.modal-backdrop.in').last().css('z-index', firstModalBackDropZIndex + zIndexPlus);
}
