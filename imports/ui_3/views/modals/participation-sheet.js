import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Votings } from '/imports/api/topics/votings/votings.js';
import { participationSheetColumns } from '/imports/api/agendas/tables.js';
import { DatatablesExportButtons, DatatablesSelectButtons } from '/imports/ui_3/views/blocks/datatables.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';

import './participation-sheet.html';

Template.Participation_sheet.viewmodel({
    onCreated(instance) {
      ModalStack.setVar('relation', 'member', true);
      const self = this;
      instance.autorun(() => {
        const communityId = ModalStack.getVar('communityId');
        instance.subscribe('contracts.inCommunity', { communityId, relation: 'member' });
        instance.subscribe('parcels.inCommunity', { communityId });
        instance.subscribe('memberships.inCommunity', { communityId });
      });
    },
    participationSheetTableDataFn() {
      return () => Votings.participationSheet(this.templateInstance.data.community, this.templateInstance.data.agenda);
    },
    participationSheetOptionsFn() {
      return () => ({
        columns: participationSheetColumns(),
        language: datatables_i18n[TAPi18n.getLanguage()],
        pageLength: 250,
        ...DatatablesExportButtons,
      });
    },
  });
  
  Template.Participation_sheet.events({
    'click .parcels .js-show-all'(event, instance) {
      const oldVal = instance.viewmodel.showAllParcels();
      instance.viewmodel.showAllParcels(!oldVal);
    },
  });
  