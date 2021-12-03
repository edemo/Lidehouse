import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';
import { moment } from 'meteor/momentjs:moment';
import { Session } from 'meteor/session';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { parcelFinancesColumns } from '/imports/api/parcels/tables.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/actions.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import '/imports/ui_3/views/components/account-history.js';
import '/imports/ui_3/views/components/partner-history.js';
import '/imports/ui_3/views/common/ibox-tools.js';
import '/imports/ui_3/views/components/balance-widget.js';
import '/imports/ui_3/views/components/meters-widget.js';
import '/imports/ui_3/views/components/balance-report.js';
import '/imports/ui_3/views/components/disclaimer.js';

import './parcels-finances.html';

Template.Parcels_finances.viewmodel({
  showAllParcels: false,
  onCreated(instance) {
    ModalStack.setVar('relation', 'member', true);
    const self = this;
    instance.autorun(() => {
      const communityId = ModalStack.getVar('communityId');
      instance.subscribe('accounts.inCommunity', { communityId });
      instance.subscribe('parcels.ofSelf', { communityId });
      if (Meteor.userOrNull().hasPermission('transactions.inCommunity', { communityId })) {
        if (self.showAllParcels()) {
          instance.subscribe('parcels.outstanding', { communityId, selector: 'partner' });
        } else {
          instance.subscribe('parcels.outstanding', { communityId, selector: 'partner', debtorsOnly: true });
        }
      }
    });
  },
  onDestroyed() {
    Session.set('contractToView');
  },
  contractToView() {
    return Session.get('contractToView');
  },
  myParcels() {
    const communityId = ModalStack.getVar('communityId');
    const user = Meteor.user();
    if (!user || !communityId) return [];
    return user.ownedParcels(communityId);
  },
  contractChoices() {
    const communityId = ModalStack.getVar('communityId');
    const parcels = Meteor.userOrNull().hasPermission('balances.ofLocalizers', { communityId }) ?
      Parcels.find({ communityId, category: '@property', approved: true }) : this.myParcels();
    let contracts = parcels.map(parcel => parcel.payerContract()).filter(c => c);
    contracts = _.uniq(contracts, false, c => c._id);
    return contracts.map(c => ({ label: c.toString(), value: c._id }));
  },
  parcelFinancesTableDataFn() {
    const communityId = ModalStack.getVar('communityId');
    return () => Parcels.find({ communityId, category: '@property' }).fetch().filter(p => !p.isLed() && p.payerContract());
  },
  parcelFinancesOptionsFn() {
    return () => ({
      columns: parcelFinancesColumns(),
      order: [[4, 'desc']],
      language: datatables_i18n[TAPi18n.getLanguage()],
    });
  },
  beginDate() {
    return moment().startOf('year').format('YYYY-MM-DD');
  },
/*  parcelsTableDataFn() {
    const self = this;
    return () => {
      const communityId = self.communityId();
      let parcels = Tracker.nonreactive(() => Parcels.find({ communityId, category: '@property', approved: true }).fetch());
      if (!self.showAllParcels()) {
        const myParcelIds = Memberships.find({ communityId, !!!: Meteor.userId() }).map(m => m.parcelId);
        parcels = parcels.filter(p => _.contains(myParcelIds, p._id));
      }
      return parcels;
    };
  },
  parcelsOptionsFn() {
    const self = this;
    return () => {
      const communityId = self.communityId();
      const permissions = {
        view: Meteor.userOrNull().hasPermission('parcels.inCommunity', { communityId }),
        edit: Meteor.userOrNull().hasPermission('parcels.update', { communityId }),
        delete: Meteor.userOrNull().hasPermission('parcels.remove', { communityId }),
        assign: Meteor.userOrNull().hasPermission('memberships.inCommunity', { communityId }),
      };
      return {
        columns: parcelColumns(permissions),
        createdRow: highlightMyRow,
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
        pageLength: 25,
        // coming from the theme:
        dom: '<"html5buttons"B>lTfgitp',
        buttons: [
            { extend: 'copy' },
            { extend: 'csv' },
            { extend: 'excel', title: 'ExampleFile' },
            { extend: 'pdf', title: 'ExampleFile' },
            { extend: 'print',
                customize: function (win) {
                    $(win.document.body).addClass('white-bg');
                    $(win.document.body).css('font-size', '10px');

                    $(win.document.body).find('table')
                        .addClass('compact')
                        .css('font-size', 'inherit');
                },
            },
        ],
      };
    };
  }, */
});

Template.Parcels_finances.events({
  'click .parcels .js-show-all'(event, instance) {
    const oldVal = instance.viewmodel.showAllParcels();
    instance.viewmodel.showAllParcels(!oldVal);
  },
});
