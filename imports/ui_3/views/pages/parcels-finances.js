import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';
import { moment } from 'meteor/momentjs:moment';

import { Session } from 'meteor/session';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { parcelFinancesColumns } from '/imports/api/parcels/tables.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/actions.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import '/imports/ui_3/views/components/account-history.js';
import '/imports/ui_3/views/components/parcel-history.js';
import '/imports/ui_3/views/common/ibox-tools.js';
import '/imports/ui_3/views/components/balance-widget.js';
import '/imports/ui_3/views/components/meters-widget.js';
import '/imports/ui_3/views/components/balance-report.js';
import './parcels-finances.html';

Template.Parcels_finances.viewmodel({
  showAllParcels: false,
  parcelToView: '',
  onCreated(instance) {
    const self = this;
    instance.autorun(() => {
      const communityId = Session.get('activeCommunityId');
      instance.subscribe('breakdowns.inCommunity', { communityId });
      instance.subscribe('leaderships.inCommunity', { communityId });
      if (Meteor.userOrNull().hasPermission('bills.outstanding')) {
        if (self.showAllParcels()) {
          instance.subscribe('parcels.outstanding', { communityId });
        } else {
          instance.subscribe('parcels.outstanding', { communityId, limit: 10 });
        }
      } else {
        instance.subscribe('parcels.ofSelf', { communityId });
      }
    });
  },
  myLeadParcels() {
    const communityId = Session.get('activeCommunityId');
    const user = Meteor.user();
    if (!user || !communityId) return [];
    return user.ownedLeadParcels(communityId);
  },
  parcelChoices() {
    const communityId = Session.get('activeCommunityId');
    const parcels = Meteor.userOrNull().hasPermission('balances.ofLocalizers') ?
        Parcels.find({ communityId, approved: true }).fetch().filter(p => !p.isLed()) : this.myLeadParcels();
    return parcels.map((parcel) => {
      return {
        label: parcel.display(),
        value: parcel._id,
//        value: Localizer.parcelRef2code(parcel.ref),
      };
    });
  },
  defaultBeginDate() {
    return moment().subtract(1, 'year').format('YYYY-MM-DD');
  },
  defaultEndDate() {
    return moment().format('YYYY-MM-DD');
  },
  parcelFinancesTableDataFn() {
    const communityId = Session.get('activeCommunityId');
    return () => Parcels.find({ communityId }).fetch();
  },
  parcelFinancesOptionsFn() {
    return () => ({
      columns: parcelFinancesColumns(),
      order: [[4, 'desc']],
      language: datatables_i18n[TAPi18n.getLanguage()],
    });
  },
/*  parcelsTableDataFn() {
    const self = this;
    return () => {
      const communityId = self.communityId();
      let parcels = Tracker.nonreactive(() => Parcels.find({ communityId, approved: true }).fetch());
      if (!self.showAllParcels()) {
        const myParcelIds = Memberships.find({ communityId, personId: Meteor.userId() }).map(m => m.parcelId);
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
        view: Meteor.userOrNull().hasPermission('parcels.inCommunity', communityId),
        edit: Meteor.userOrNull().hasPermission('parcels.update', communityId),
        delete: Meteor.userOrNull().hasPermission('parcels.remove', communityId),
        assign: Meteor.userOrNull().hasPermission('memberships.inCommunity', communityId),
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
  },*/
});

Template.Parcels_finances.events({
  ...(actionHandlers(Parcels)),
  'click .parcels .js-show-all'(event, instance) {
    const oldVal = instance.viewmodel.showAllParcels();
    instance.viewmodel.showAllParcels(!oldVal);
  },
});
