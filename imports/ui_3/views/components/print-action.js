import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { debugAssert } from '/imports/utils/assert.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { afId2details } from '/imports/ui_3/views/modals/autoform-modal.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import { $ } from 'meteor/jquery';

Template.registerHelper('print', function print() {
  return {
    visible: true,
    href: '',
    color: 'primary btn-outline',
    name: 'print',
    icon: 'fa fa-print',
    label: 'print',
    run(event, instance) {
      instance.viewmodel.parent().children()[1].showAccounting?.(false);  // Print button is now outside the bill view, on the header of the Autoform_modal.
      Meteor.defer(() => {                                                // And we would like to turn off the accounting tags on the bill view.
        if (ModalStack.active()) {
          $('#wrapper').addClass('no-height');
          $('.modal:not(:last)').hide();
          window.print();
          $('.modal:not(:last)').show();
          $('#wrapper').removeClass('no-height');
        } else window.print();
      });
    },
  };
});

Template.registerHelper('pageIsPrintable', function pageIsPrintable() {
  const routeName = FlowRouter.getRouteName();
  if (routeName === 'Transaction show') return true;
  return false;
});

Template.registerHelper('modalIsPrintable', function modalIsPrintable(id) {
  const details = afId2details(id);
  if (details.action === 'view') return true;
  return false;
});
