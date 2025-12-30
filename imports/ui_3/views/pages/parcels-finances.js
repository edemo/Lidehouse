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
import { DatatablesExportButtons } from '/imports/ui_3/views/blocks/datatables.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import '/imports/api/accounting/actions.js';
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
      instance.subscribe('accountingPeriods.inCommunity', { communityId });
      instance.subscribe('contracts.ofEntitledOnes', { communityId });
      if (Meteor.userOrNull().hasPermission('transactions.inCommunity', { communityId })) {
        if (self.showAllParcels()) {
          instance.subscribe('contracts.inCommunity', { communityId, relation: 'member' });
          instance.subscribe('parcels.inCommunity', { communityId });
          instance.subscribe('memberships.inCommunity', { communityId });
          instance.subscribe('meters.inCommunity', { communityId });
          instance.subscribe('balances.inCommunity', { communityId, tag: 'T', partners: [] });
          instance.subscribe('transactions.inCommunity', { communityId, category: 'bill', begin: moment().subtract(90, 'days').toDate() });
        } else {
          // TODO: 'contracts.outstanding' does not provide the leadParcel contracts, so they don't show up
          instance.subscribe('contracts.outstanding', { communityId, selector: 'partner', debtorsOnly: true });
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
  relevantParcels() {
    const user = Meteor.user();
    const communityId = ModalStack.getVar('communityId');
    if (!user || !communityId) return [];
    return Parcels.find({ communityId, category: { $in: ['%property', '@property'] }, approved: true }).fetch().filter(p => !p.isLed() && p.payerContract() && user.hasPermission('parcels.finances', p));
  },
  contractChoices() {
    const parcels = this.relevantParcels();
    let contracts = parcels.map(parcel => parcel.payerContract()).filter(c => c);
    contracts = _.uniq(contracts, false, c => c._id);
    return contracts.map(c => c.asOption());
  },
  parcelFinancesTableDataFn() {
    const self = this;
    return () => self.relevantParcels();
  },
  parcelFinancesOptionsFn() {
    return () => ({
      columns: parcelFinancesColumns(),
      order: [[4, 'desc']],
      language: datatables_i18n[TAPi18n.getLanguage()],
      ...DatatablesExportButtons,
    });
  },
  beginDate() {
    return moment().startOf('year').format('YYYY-MM-DD');
  },
/*  parcelsTableDataFn() {
    const self = this;
    return () => {
      const communityId = self.communityId();
      let parcels = Tracker.nonreactive(() => Parcels.find({ communityId, category: { $in: ['%property', '@property'] }, approved: true }).fetch());
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
        columns: parcelColumns(),
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
