import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Clock } from '/imports/utils/clock';
import { Votings } from '/imports/api/topics/votings/votings.js';
import { Shareddocs } from '/imports/api/shareddocs/shareddocs.js';
import { votingEditInstance } from '/imports/ui_3/views/modals/voting-edit.js';
import './entities.js';

AutoForm.addModalHooks('af.vote.insert');
AutoForm.addHooks('af.vote.insert', {
  formToDoc(doc) {
    Tracker.nonreactive(() => {   // AutoForm will run the formToDoc each time any field on the form, like the vote.type is simply queried (maybe so that if its a calculated field, it gets calculated)
      doc.createdAt = Clock.currentTime();
      doc.communityId = Session.get('activeCommunityId');
      doc.category = 'vote';
      doc.status = Votings.workflow.start[0].name;
      doc.vote = doc.vote || {};
      doc.vote.choices = votingEditInstance.choices.get();
      doc.closesAt = new Date(doc.closesAt.getFullYear(), doc.closesAt.getMonth(), doc.closesAt.getDate(), 23, 59, 59);
    });
    return doc;
  },
  onSuccess(formType, result) {
    const uploadIds = Shareddocs.find({ topicId: Meteor.userId() }).fetch().map(d => d._id);
    uploadIds.forEach(id => Shareddocs.update(id, { $set: { topicId: result } }));
  },
});

AutoForm.addModalHooks('af.vote.update');
AutoForm.addHooks('af.vote.update', {
  docToForm(doc, ss) {
    votingEditInstance.choices.set(doc.vote.choices);
    return doc;
  },
  formToModifier(modifier) {
    delete modifier.$set.createdAt;
    delete modifier.$set.closesAt;
    modifier.$set['vote.choices'] = votingEditInstance.choices.get();
    return modifier;
  },
});

AutoForm.addModalHooks('af.vote.statusChange');
AutoForm.addHooks('af.vote.statusChange', {
  formToDoc(doc) {
    const newStatusName = Session.get('newStatusName');
    doc.topicId = Session.get('activeTopicId');
    doc.type = 'statusChangeTo'; // `statusChangeTo.${newStatusName}`;
    doc.status = newStatusName;
    return doc;
  },
  onSuccess(formType, result) {
    Session.set('activeTopicId');  // clear it
    Session.set('newStatusName');  // clear it
  },
});
