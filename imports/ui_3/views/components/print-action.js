import { Template } from 'meteor/templating';
import { debugAssert } from '/imports/utils/assert.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { $ } from 'meteor/jquery';
import './print-action.html';

export function print() {
  if (ModalStack.active()) {
    $('#wrapper').addClass('no-height');
    window.print();
    $('#wrapper').removeClass('no-height');
  } else window.print();
}

Template.Print_Button.helpers({
  btnSize() {
    switch (this.templateInstance.data.size) {  // TODO: This is not just size, but the "kind" of the button
      case 'xl': return 'md';   // This is the large, palced on the bill footer buttons
      case 'lg': return 'xs';   // This is the long, thin version
      case 'md': return 'sm';   // This is the 'new' buttons
      case 'sm': return 'xs';   // this is the table cell buttons
      default: debugAssert(false, 'No such btn size'); return undefined;
    }
  },
});

Template.Print_Button.events({
  'click .js-print'() {
    print();
  },
});
