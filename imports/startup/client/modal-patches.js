import { $ } from 'meteor/jquery';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

Modal.hideAll = function hideAll() {
  $('.modal').modal('hide');
};
