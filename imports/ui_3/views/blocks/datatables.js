import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { getBillsActionsSmall } from '/imports/api/transactions/bills/actions.js';
import { Bills } from '/imports/api/transactions/bills/bills';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

export const DatatablesExportButtons = {
  // coming from the theme:
  dom: '<"html5buttons"B>lTfgitp',
  buttons: [
    { extend: 'copy' },
    { extend: 'csv' },
    { extend: 'excel', title: 'honline' },
    { extend: 'pdf', title: 'honline' },
    { extend: 'print',
      customize(win) {
        $(win.document.body).addClass('white-bg');
        $(win.document.body).css('font-size', '10px');
        $(win.document.body).find('table')
            .addClass('compact')
            .css('font-size', 'inherit');
      },
    },
  ],
};

function getMultiActionsByCollection(collection) {
  if (collection === 'Bills') return { collection: Bills, actions: getBillsActionsSmall().filter(action => action.multi === true) };
  return { collection: '', actions: [] };
}

function singleButton(collection, action) {
  const button = {
    extend: 'selected',
    text: () => __(action.name),
    action(e, dt, node, config) {
      const selectedDocs = dt.rows({ selected: true }).data();
      const selectedIds = _.pluck(selectedDocs, '_id');
      Modal.confirmAndCall(collection.methods.batch[action.name], { args: selectedIds.map(_id => ({ _id })) }, {
        action: collection.methods.batch[action.name].name,
        message: __('This operation will be performed on many documents', selectedDocs.length),
      });
      dt.rows().deselect();
    },
    init(dt, node, config) {
      if (dt.rows({ selected: true }).indexes().length === 0) dt.button('.buttons-collection').disable();
      dt.on('select.dt.DT deselect.dt.DT', function () {
        // only the code inside this scope will rerun
        const rows = dt.rows({ selected: true }).data();
        const ids = [];
        rows.each((doc) => { ids.push(doc._id); });
        const visible = _.every(ids, function (id) { return action.visible(id); });
        if (visible) {
          dt.button('.buttons-collection').enable();
          node.show();
        }
        if (!visible || ids.length === 0) {
          dt.button('.buttons-collection').disable();
          node.hide();
        }
      });
    },
  };
  return button;
}

function multipleButtons(collection, actions) {
  const buttons = [];
  if (collection && actions.length > 0) {
    actions.forEach((action) => {
      const button = singleButton(collection, action);
      if (button) buttons.push(button);
    });
  } else {
    buttons.push({ text: 'There is no actions' });
  }
  return buttons;
}

export function DatatablesSelectButtons(collection) {
  const multiActionsByCollection = getMultiActionsByCollection(collection);
  const dropDownItems = multipleButtons(multiActionsByCollection.collection, multiActionsByCollection.actions);
  const buttons = {
    dom: '<"html5buttons"B>lTfgitp',
    select: {
      style: 'multi',
    },
    buttons: [
      { extend: 'selectAll',
        text: () => __('Select all'),
      },
      { extend: 'selectNone',
        text: () => __('Select none'),
      },
      { extend: 'collection',
        text: () => __('Action with selected'),
        autoClose: true,
        buttons: dropDownItems,
      },
    ],
  };
  return buttons;
}

