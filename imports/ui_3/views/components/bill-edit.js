import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { moment } from 'meteor/momentjs:moment';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Clock } from '/imports/utils/clock';
import { __ } from '/imports/localization/i18n.js';
import { Log } from '/imports/utils/log.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';
import { Sharedfolders } from '/imports/api/shareddocs/sharedfolders/sharedfolders.js';
import '/imports/ui_3/views/components/shareddoc-display.js';
import '/imports/ui_3/views/modals/modal-guard.js';
// The autoform needs to see these, to handle new events on it
import '/imports/api/partners/actions.js';
import '/imports/api/contracts/actions.js';
import './bill-edit.html';

Template.Bill_edit.viewmodel({
  detailedView: false,
  onCreated() {
    this.detailedView(!this.templateInstance.data.doc.isSimple());
  },
  autorun() {
    const communityId = ModalStack.getVar('communityId');
    const topicId = this.templateInstance.data.doc._id;
    this.templateInstance.subscribe('shareddocs.ofTopic', { communityId, topicId });
  },
  afDoc(formId) {
    const doc = Transactions._transform(AutoForm.getDoc(formId));
    return doc;
  },
  isBill() {
    return this.templateInstance.data.doc.category === 'bill';
  },
  lineHasField(index, field) {
    const doc = this.afDoc();
    return !!doc.lines[index]?.[field];
  },
/*  showContractField() {
    const doc = this.afDoc();
    const partnerId = AutoForm.getFieldValue('partnerId');
    const selector = { communityId: doc.communityId, partnerId };
    return partnerId && Contracts.find(selector).count() > 1;
  }, */
  defaultDate() {
    return Clock.currentTime();
  },
  defaultDueDate() {
    return moment().add(30, 'day').toDate();
  },
  markNullLine(afLine) {
    // As in autoform ArrayTracker remove - item will be hidden
    const index = afLine.name.split('.')[1];
    const doc = this.templateInstance.data.doc;
    if (doc.lines[index] === null) {
      afLine.removed = true;
      AutoForm.arrayTracker.info[afLine.formId][afLine.arrayFieldName].deps?.changed();
    }
  },
  cashPayAccount() {
    if (this.isBill()) return false;
    const account = Accounts.getByCode(AutoForm.getFieldValue('payAccount'));
    if (account?.category === 'cash') return true;
    return false;
  },
  reconciling() {
    return ModalStack.getVar('statementEntry');
  },
  originalStatementEntry() {
    return ModalStack.getVar('statementEntry')?.original;
  },
  hiddenWhenReconciling() {
    return this.reconciling() && 'hidden';
  },
  attachments() {
    const topicId = this.templateInstance.data.doc._id;
    return Shareddocs.find({ topicId });
  },  
});

function autoFill(formId) {
  const doc = Transactions._transform(AutoForm.getFormValues(formId).insertDoc);
  doc.autoFill();
  AutoForm.setDoc(doc, formId);
}

Template.Bill_edit.events({
  'change .js-autofill'(event, instance) {
    autoFill();
  },
  'click .js-autofill button'(event, instance) {
    // The click happens beore the line is removed/added, so here we do not yet see the changed doc
    const formId = AutoForm.getFormId();  // The delayed call will need to be told, what formId is
    Meteor.setTimeout(() => autoFill(formId), 1000);
  },
  'click .js-view-mode'(event, instance) {
    autoFill();
    instance.viewmodel.detailedView(true);
  },
  'click .js-upload'(event) {
    const communityId = ModalStack.getVar('communityId');
    const community = Communities.findOne(communityId);
    const folder = Sharedfolders.findOne({ communityId: community.settings.templateId, content: 'transaction' });
    const topicId = Template.instance().data.doc?._id || Meteor.userId();
    Shareddocs.upload({ communityId, folderId: folder._id, topicId });
  },
});
