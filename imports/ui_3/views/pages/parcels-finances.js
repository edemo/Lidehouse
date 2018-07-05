import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { TAPi18n } from 'meteor/tap:i18n';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';

import { Communities } from '/imports/api/communities/communities.js';
import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';
import { Journals } from '/imports/api/journals/journals.js';
import { JournalEntries } from '/imports/api/journals/entries.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { remove as removeJournal, billParcels } from '/imports/api/journals/methods.js';
import { Session } from 'meteor/session';
import { journalColumns } from '/imports/api/journals/tables.js';
import { breakdownColumns } from '/imports/api/journals/breakdowns/tables.js';
import { Reports } from '/imports/api/journals/breakdowns/reports.js';

import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_2/components/custom-table.js';
import '/imports/ui_2/modals/confirmation.js';
import '/imports/ui_2/modals/autoform-edit.js';
import '../common/ibox-tools.js';
import '../components/balance-widget.js';
import './parcels-finances.html';

Template.Parcels_finances.onCreated(function parcelsFinancesOnCreated() {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('breakdowns.inCommunity', { communityId });
    this.subscribe('journals.inCommunity', { communityId });
  });

/*  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    const myParcelIds = Memberships.find({ communityId, 'person.userId': Meteor.userId(), role: 'owner' }).map(m => m.parcel().serial.toString());
    // const allParcelIds = Communities.find(communityId).parcels().map(p => p.serial.toString());
    // $('select#localizer').val(myParcelIds[0] || 'Localizer');
    this.getActiveLocalizer = function () {
      return $('select#localizer').val();
    };
    this.getActiveParcelFilter = function () {
      const activeLocalizer = this.getActiveLocalizer();
      const localizerPac = Breakdowns.findOne({ communityId, name: 'Localizer' });
      const filter = { $in: localizerPac.leafsOf(activeLocalizer) };
      return filter;
    };
  }); */
});

Template.Parcels_finances.helpers({
  getActiveLocalizer() {
    return Template.instance().getActiveLocalizer();
  },
  localizerOptions() {
    if (!Template.instance().subscriptionsReady()) return [];
    const communityId = Session.get('activeCommunityId');
    const localizerPac = Breakdowns.findOne({ communityId, name: 'Localizer' });
    return localizerPac.nodeOptions();
  },
  report(name, year) {
    return Reports[name](year);
  },
  parcelHistory() {
    if (!Template.instance().subscriptionsReady()) return [];
    const communityId = Session.get('activeCommunityId');
    const parcelFilter = Template.instance().getActiveParcelFilter();

    return JournalEntries.find({ communityId,
      'account.Owners': { $exists: true }, 'account.Localizer': parcelFilter },
    ).sort({ valueDate: 1 });
  },
  displayPhase(journal) {
    if (journal.accountFrom.Owners) return __('bill');
    if (journal.accountTo.Owners) return __('done');
    return undefined;
  },
  journalsTableDataFn() {
    const templateInstance = Template.instance();
    function getTableData() {
      if (!templateInstance.subscriptionsReady()) return [];
      const communityId = Session.get('activeCommunityId');
/*      const filter = _.extend({ communityId },
        { $or: [{ 'accountFrom.Owners': { $exists: true }, 'accountFrom.Localizer': { $in: myParcelIds } },
                { 'accountTo.Owners': { $exists: true }, 'accountTo.Localizer': { $in: myParcelIds } },
        ] },
      );*/
      const filter = _.extend({ communityId },
        { $or: [{ 'accountFrom.Owners': { $exists: true } },
                { 'accountTo.Owners': { $exists: true } },
        ] },
      );
      const data = Journals.find(filter).fetch();
      return data;
    }
    return getTableData;
  },
  journalsOptionsFn() {
    function getOptions() {
      return {
        columns: journalColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    }
    return getOptions;
  },
});
