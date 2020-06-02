import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/ui_3/views/modals/modal.js';
import './select-voters.html';

Template.Select_voters.onCreated(function selectVotersOnCreated() {
  this.autorun(() => {
    const communityId = ModalStack.getVar('communityId');
    this.subscribe('parcels.inCommunity', { communityId });
  });
});

Template.Select_voters.onRendered(function selectVotersOnRendered() {
});

Template.Select_voters.viewmodel({
  allSelected: false,
  selectAll() {
    const checkboxes = $('input[name="voters"]');
    if (this.allSelected()) checkboxes.prop('checked', true);
    if (!this.allSelected()) checkboxes.prop('checked', false);
  },
  schema() {
    const topicId = this.topicId();
    const topic = Topics.findOne(topicId);
    const castedVote = this.castedVote();
    const chooseVoter = {
      options() {
        const communityId = ModalStack.getVar('communityId');
        const community = Communities.findOne(communityId);
        const partners = Partners.find({ communityId, relation: 'member' }).fetch();
        const owners = partners.filter(p => p.ownerships(communityId).fetch().filter(m => m.votingUnits() > 0).count() > 0);
        const notVotedYet = owners.filter(o => !topic.hasVotedDirect(o._id));
        const options = notVotedYet.map(function option(p) {
          return { label: (p.displayName() + ', ' + p.ownerships(communityId).map(ownership => ownership.displayRole()).join(', ')), value: p._id };
        });
        const sortedOptions = options.sort((a, b) => a.label.localeCompare(b.label, community.settings.language, { sensitivity: 'accent' }));
        return sortedOptions;
      },
    };
    const schema = new SimpleSchema({
      voters: { type: [String], regEx: SimpleSchema.RegEx.Id, autoform: _.extend({ type: 'select-checkbox' }, chooseVoter) },
    });
    schema.i18n('schemaVotings.vote');
    return schema;
  },
});

Template.Select_voters.events({
});
