import { Template } from 'meteor/templating';
import { debugAssert } from '/imports/utils/assert.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { $ } from 'meteor/jquery';
import './print-action.html';

Template.registerHelper('print', function print() {
  return {
    visible: true,
    href: '',
    color: 'white',
    name: 'print',
    icon: 'fa fa-print',
    label: 'print',
    run() {
      if (ModalStack.active()) {
        $('#wrapper').addClass('no-height');
        window.print();
        $('#wrapper').removeClass('no-height');
      } else window.print();
    },
  };
});
