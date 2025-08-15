/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { TAPi18n } from 'meteor/tap:i18n';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { DatatablesExportButtons, DatatablesSelectButtons } from '/imports/ui_3/views/blocks/datatables.js';
import { onSuccess, handleError } from '/imports/ui_3/lib/errors.js';
import { AccountingPeriods } from '../../../api/accounting/periods/accounting-periods';
import { Transactions } from '/imports/api/accounting/transactions.js';
import '/imports/api/accounting/actions.js';
import { Txdefs } from '/imports/api/accounting/txdefs/txdefs.js';
import '/imports/api/accounting/txdefs/actions.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Balances } from '/imports/api/accounting/balances/balances.js';
import { accountColumns, highlightTemplateOverrides } from '/imports/api/accounting/accounts/tables.js';
import { localizerColumns } from '/imports/api/parcels/tables.js';
import { txdefColumns } from '/imports/api/accounting/txdefs/tables.js';
import '/imports/api/accounting/accounts/actions.js';
import '/imports/api/accounting/txdefs/methods.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-modal.js';
import '/imports/ui_3/views/components/lazy-tab.js';
import './accounting-setup.html';

Template.Accounting_setup.viewmodel({
  onCreated(instance) {
  },
  communityId() {
    return ModalStack.getVar('communityId');
  },
  community() {
    return Communities.findOne(this.communityId());
  },
  noAccountsDefined() {
    return !AccountingPeriods.findOne({ communityId: this.communityId() });
  },
  accounts() {
    const accounts = Accounts.findTfetch({ communityId: this.communityId() }, { sort: { code: 1 } });
    return accounts;
  },
  moneyAccounts() {
//    const accounts = Accounts.findOneT({ communityId: this.communityId(), name: 'Money accounts' });
//    return accounts && accounts.nodes(true);
    const accounts = Accounts.findTfetch({ communityId: this.communityId(), category: { $in: ['bank', 'cash'] } }, { sort: { code: 1 } });
    return accounts;
  },
  moneyAccountsTableDataFn() {
    const templateInstance = Template.instance();
    const self = this;
    function getTableData() {
      if (!templateInstance.subscriptionsReady()) return [];
      const communityId = self.communityId();
      return Accounts.findTfetch({ communityId, category: { $in: ['bank', 'cash'] } }, { sort: { code: 1 } });
    }
    return getTableData;
  },
  moneyAccountsOptionsFn() {
    return () => Object.create({
      columns: accountColumns(true),
      createdRow: highlightTemplateOverrides,
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
      pageLength: 25,
      info: false,
      ...DatatablesExportButtons,
      ...DatatablesSelectButtons(Accounts),
    });
  },
  accountsTableDataFn() {
    const templateInstance = Template.instance();
    const self = this;
    function getTableData() {
      if (!templateInstance.subscriptionsReady()) return [];
      const communityId = self.communityId();
      return Accounts.findTfetch({ communityId }, { sort: { code: 1 } });
    }
    return getTableData;
  },
  accountsOptionsFn() {
    return () => Object.create({
      columns: accountColumns(),
      createdRow: highlightTemplateOverrides,
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
      pageLength: 25,
      info: false,
      ...DatatablesExportButtons,
      ...DatatablesSelectButtons(Accounts),
    });
  },
  localizersTableDataFn() {
    const templateInstance = Template.instance();
    const self = this;
    function getTableData() {
      if (!templateInstance.subscriptionsReady()) return [];
      const communityId = self.communityId();
      return Parcels.findTfetch({ communityId });
    }
    return getTableData;
  },
  localizersOptionsFn() {
    return () => Object.create({
      columns: localizerColumns(),
      createdRow: highlightTemplateOverrides,
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
      pageLength: 25,
      info: false,
      ...DatatablesExportButtons,
      ...DatatablesSelectButtons(Parcels),
    });
  },
  txdefsTableDataFn() {
    const templateInstance = Template.instance();
    const self = this;
    function getTableData() {
      if (!templateInstance.subscriptionsReady()) return [];
      const communityId = self.communityId();
      return Txdefs.findTfetch({ communityId });
    }
    return getTableData;
  },
  txdefsOptionsFn() {
    return () => Object.create({
      columns: txdefColumns(),
      createdRow: highlightTemplateOverrides,
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
      pageLength: 25,
      info: false,
    });
  },
  optionsOf(accountCode) {
    return Accounts.nodeOptionsOf(this.communityId(), accountCode, true);
  },
});

Template.Accounting_setup.events({
  'click #coa .js-template'(event, instance) {
    const communityId = ModalStack.getVar('communityId');
    Transactions.methods.setAccountingTemplate.call({ communityId }, handleError);
  },
});
