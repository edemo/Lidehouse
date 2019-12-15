import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { moment } from 'meteor/momentjs:moment';
import { _ } from 'meteor/underscore';
import { Fraction } from 'fractional';
import { TAPi18n } from 'meteor/tap:i18n';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { TimeSync } from 'meteor/mizzao:timesync';

import { __ } from '/imports/localization/i18n.js';
import { getCurrentUserLang } from '/imports/api/users/users.js';
import { Person } from '/imports/api/users/person.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Communities } from '/imports/api/communities/communities.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { autoformOptions, noUpdate } from '/imports/utils/autoform.js';
import { Topics } from '/imports/api/topics/topics.js';
import { debugAssert } from '/imports/utils/assert.js';

export const Votings = {};

Votings.voteProcedureValues = ['online', 'meeting'];
Votings.voteEffectValues = ['poll', 'legal'];
Votings.voteTypes = {
  yesno: {
    name: 'yesno',
    fixedChoices: ['yes', 'no', 'abstain'],
  },
  choose: {
    name: 'choose',
  },
  preferential: {
    name: 'preferential',
  },
  petition: {
    name: 'petition',
    fixedChoices: ['support'],
  },
  multiChoose: {
    name: 'multiChoose',
  },
};
Votings.voteTypeValues = Object.keys(Votings.voteTypes);

function currentUsersPossibleEffectValues() {
  const user = Meteor.user();
  if (!user.hasPermission('vote.insert', getActiveCommunityId())) return ['poll'];
  return Votings.voteEffectValues;
}

Votings.voteSchema = new SimpleSchema({
  procedure: { type: String, allowedValues: Votings.voteProcedureValues, autoform: { ...autoformOptions(Votings.voteProcedureValues, 'schemaVotings.vote.procedure.'), ...noUpdate } },
  effect: { type: String, allowedValues: Votings.voteEffectValues, autoform: { ...autoformOptions(currentUsersPossibleEffectValues, 'schemaVotings.vote.effect.'), ...noUpdate } },
  type: { type: String, allowedValues: Votings.voteTypeValues, autoform: { ...autoformOptions(Votings.voteTypeValues, 'schemaVotings.vote.type.'), ...noUpdate } },
  choices: {
    type: Array,
    autoValue() {
      if (this.field('vote.type').value) return Votings.voteTypes[this.field('vote.type').value].fixedChoices;
      return undefined;
    },
  },
  'choices.$': { type: String },
});

Votings.voteParticipationSchema = new SimpleSchema({
  count: { type: Number },
  units: { type: Number, decimal: true /* so that partial owned units are OK to vote */ },
});

// How to create default value for votes only (but not for any other topics)
function defaultsTo(val) {
  const defaultValue = val;
  return function defaultValueGiverFunction() {
    if (this.isInsert && this.field('category').value === 'vote') {
      return defaultValue;
    }
    return undefined;
  };
}

Votings.extensionSchema = new SimpleSchema({
  vote: { type: Votings.voteSchema, optional: true },
  voteCasts: { type: Object, optional: true, autoValue: defaultsTo({}), blackbox: true },
  voteCastsIndirect: { type: Object, optional: true, autoValue: defaultsTo({}), blackbox: true },
  votePaths: { type: Object, optional: true, autoValue: defaultsTo({}), blackbox: true },
    // userId -> ranked array of choice indexes (or single entry in the array)
  voteResults: { type: Object, optional: true, autoValue: defaultsTo({}), blackbox: true },
    // ownershipId -> {}
  voteSummary: { type: Object, optional: true, autoValue: defaultsTo({}), blackbox: true },
    // choiceIndex -> {}
  voteParticipation: { type: Votings.voteParticipationSchema, optional: true, autoValue: defaultsTo({ count: 0, units: 0 }) },
});

Topics.categoryHelpers('vote', {
  displayChoice(index, language = getCurrentUserLang()) {
    let choice = this.vote.choices[index];
    if (Votings.voteTypes[this.vote.type].fixedChoices) choice = TAPi18n.__(choice, {}, language);
    return choice;
  },
  unitsToShare(units) {
    const votingShare = new Fraction(units, this.community().totalunits);
    return votingShare;
  },
  voteSuccessLimit() {
    return this.vote.type === 'petition' ? 10 : 50;
  },
  eligibleVoterCount() {
//    return Memberships.find({ communityId: this.communityId, role: 'owner' }).count();
    return Parcels.find({ communityId: this.communityId }).count();
  },
  votedCount() {
    return this.voteParticipation.count;
  },
  votedPercent() {
    const voteParticipationShare = this.unitsToShare(this.voteParticipation.units);
    const voteParticipationPercent = 100 * voteParticipationShare.toNumber();
    return voteParticipationPercent;
  },
  isVoteSuccessful() {
    return this.votedPercent() >= this.voteSuccessLimit();
  },
  notVotedUnits() {
    return this.community().totalunits - this.voteParticipation.units;
  },
  notVotedPercent() {
    const nonParticipationShare = this.unitsToShare(this.notVotedUnits());
    const nonParticipationPercent = 100 * nonParticipationShare.toNumber();
    return nonParticipationPercent;
  },
  hasVotedDirect(userId) {
    return !!(this.voteCasts && this.voteCasts[userId] && this.voteCasts[userId].length > 0);
  },
  hasVotedIndirect(userId) {
    return !!(this.voteCastsIndirect && this.voteCastsIndirect[userId] && this.voteCastsIndirect[userId].length > 0);
  },
  hasVoted(userId) {
    return this.hasVotedDirect(userId) || this.hasVotedIndirect(userId);
  },
  voteOf(userId) {
    return (this.voteCasts && this.voteCasts[userId]) || (this.voteCastsIndirect && this.voteCastsIndirect[userId]);
  },
  votingClosed() {
    return this.status === 'votingFinished' || this.status === 'closed';
  },
  voteEvaluate(revealResults) {
    if (Meteor.isClient) return; // 'voteEvaluate' should only run on the server, client does not have the necessary data to perform it
    const voteResults = {};         // results by ownerships
    const voteCastsIndirect = {};   // results by users
    const votePaths = {};
    const voteSummary = {};         // results by choices
    const voteParticipation = { count: 0, units: 0 };
    const directVotes = this.voteCasts || {};
    const self = this;
    const voteType = this.vote.type;
    const community = Communities.findOne(this.communityId);
    community.voterships().forEach((ownership) => {
      const ownerId = ownership.personId;
      debugAssert(ownerId);
      const votePath = [ownerId];

      function getVoteResult(voterId) {
        const castedVote = directVotes[voterId];
        if (castedVote) {
          const result = {
            votingShare: ownership.votingUnits(),
            castedVote,
            votePath,
          };
          voteResults[ownership._id] = result;
          voteCastsIndirect[ownerId] = castedVote;
          votePaths[ownerId] = votePath;
          castedVote.forEach((choice, i) => {
            voteSummary[choice] = voteSummary[choice] || 0;
            const choiceWeight = (voteType === 'preferential') ? (1 - (i / castedVote.length)) : 1;
            voteSummary[choice] += ownership.votingUnits() * choiceWeight;
          });
          voteParticipation.count += 1;
          voteParticipation.units += ownership.votingUnits();
          return true;
        }
        const delegations = Delegations.find({ sourcePersonId: voterId,
          $or: [
            { scope: 'topic', scopeObjectId: self._id },
            { scope: 'agenda', scopeObjectId: self.agendaId },
            { scope: 'community', scopeObjectId: self.communityId },
          ],
        });
        for (const delegation of delegations.fetch()) {
          if (!_.contains(votePath, delegation.targetPersonId)) {
            votePath.push(delegation.targetPersonId);
            if (getVoteResult(delegation.targetPersonId)) return true;
            votePath.pop();
          }
        }
        return false;
      }

      getVoteResult(ownerId);
    });

    Topics.update(this._id, { $set: { voteParticipation } }, { selector: { category: 'vote' } });
//    if (!revealResults) return;
    Topics.update(this._id, { $set: { voteCastsIndirect, votePaths, voteResults, voteSummary } }, { selector: { category: 'vote' } });
  },
  voteResultsDisplay() {
    const topic = this;
    const results = this.voteResults;
    if (!results) return [];
    const data = [];
    Object.keys(results).forEach(key => {
      data.push(_.extend(results[key], {
        voter() {
          return Person.constructFromId(this.votePath[0]);
        },
        voteResultDisplay() {
          let display = topic.vote.choices[this.castedVote[0]];
          this.castedVote.forEach((r, i) => {
            if (i > 0) display += ', ' + topic.vote.choices[r];
          });
          return display;
        },
        votePathDisplay() {
          if (this.votePath.length === 1) return 'direct';
          let path = '';
          this.votePath.forEach((pid, ind) => { if (ind > 0) path += (' -> ' + Person.constructFromId(pid).toString()); });
          return path;
        },
      }));
    });
    return data;
  },
  voteSummaryDisplay() {
    if (!this.voteSummary) return [];   // Results come down in a different sub, so it might not be there just yet
    return Object.keys(this.voteSummary).map(key => {
      const choice = this.vote.choices[key];
      const votingUnits = this.voteSummary[key];
      const votingShare = this.unitsToShare(this.voteSummary[key]);
      const percentOfTotal = votingShare.toNumber() * 100;
      const percentOfVotes = (votingUnits / this.voteParticipation.units) * 100;
      return { choice, votingUnits, votingShare, percentOfTotal, percentOfVotes };
    });
  },
  workflow() {
    return Votings.workflow;
  },
});

Topics.attachVariantSchema(Votings.extensionSchema, { selector: { category: 'vote' } });

Meteor.startup(function attach() {
  Topics.simpleSchema({ category: 'vote' }).i18n('schemaVotings');
});

Votings.publicExtensionFields = {
  vote: 1,
  voteParticipation: 1,
};
_.extend(Topics.publicFields, Votings.publicExtensionFields);
Votings.extendPublicFieldsForUser = function extendForUser(userId, communityId) {
  // User cannot see other user's votes, but need to see his own votes (during active voting)
  // Soution: Use 2 subsrciptions, one on the live votings, one on the closed, and the public fields are different for the two
  const user = Meteor.users.findOne(userId);
  if (user.hasPermission('vote.peek', communityId)) {
    return _.extend({}, Topics.publicFields, {
      voteCasts: 1,
      voteCastsIndirect: 1,
      votePaths: 1,
      voteResults: 1,
      voteSummary: 1,
    });
  } else {
    const publicFiledsForOwnVotes = {};
    publicFiledsForOwnVotes['voteCasts.' + userId] = 1;
    publicFiledsForOwnVotes['voteCastsIndirect.' + userId] = 1;
    publicFiledsForOwnVotes['votePaths.' + userId] = 1;
    return _.extend({}, Topics.publicFields, publicFiledsForOwnVotes);
  }
};

// === Vote statuses

const announced = {
  name: 'announced',
};

const opened = {
  name: 'opened',
  icon: 'fa fa-file-text-o',
};

const votingFinished = {
  name: 'votingFinished',
  label: 'close voting',
  icon: 'fa fa-legal',
  message(options, doc) {
    const serverTimeNow = new Date(TimeSync.serverTime());
    const closureDate = moment(doc.closesAt).from(serverTimeNow);
    const message = __('The planned date of closure was ') + closureDate;
    return message;
  },
  onEnter(event, topic) {
    topic.voteEvaluate(true); // writes results out into voteResults and voteSummary
   // Topics.update(topic._id, { $set: { closesAt: new Date() } });
  },
};

const closed = {
  name: 'closed',
  icon: 'fa fa-times-circle-o',
};

Votings.statuses = {
  announced, opened, votingFinished, closed,
};
Votings.statusValues = Object.keys(Votings.statuses);

Votings.workflow = {
  start: [announced, opened],
  announced: { obj: announced, next: [opened, closed] },
  opened: { obj: opened, next: [votingFinished] },
  votingFinished: { obj: votingFinished, next: [closed] },
  closed: { obj: closed, next: [] },
};

Topics.categoryHelpers('vote', {
  workflow() {
    return Votings.workflow;
  },
});

// ===================================================

Topics.categories.vote = Votings;

Factory.define('vote', Topics, {
  category: 'vote',
  serial: 0,
  title: () => 'New voting on ' + faker.random.word(),
  text: () => faker.lorem.paragraph(),
  status: 'opened',
  closesAt: () => moment().add(14, 'day').toDate(),
  vote: {
    procedure: 'online',
    effect: 'legal',
    type: 'choose',
    choices: ['white', 'red', 'yellow', 'grey'],
  },
});
