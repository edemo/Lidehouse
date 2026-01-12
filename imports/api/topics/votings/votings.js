import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { moment } from 'meteor/momentjs:moment';
import { _ } from 'meteor/underscore';
import { Fraction } from 'fractional';
import { TAPi18n } from 'meteor/tap:i18n';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { TimeSync } from 'meteor/mizzao:timesync';

import { __ } from '/imports/localization/i18n.js';
import { getCurrentUserLang } from '/imports/api/users/users.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Communities } from '/imports/api/communities/communities.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { allowedOptions, autoformOptions, noUpdate } from '/imports/utils/autoform.js';
import { Topics } from '/imports/api/topics/topics.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Partners } from '../../partners/partners';

export const Votings = {};

Votings.voteProcedureValues = ['online', 'meeting'];
Votings.voteEffectValues = ['poll', 'legal'];
Votings.voteTypes = {
  yesno: {
    name: 'yesno',
    fixedChoices: ['yes', 'no', 'abstain'],
    successPct: 50,
  },
  choose: {
    name: 'choose',
    successPct: 50,
  },
  multiChoose: {
    name: 'multiChoose',
    successPct: 50,
  },
  preferential: {
    name: 'preferential',
  },
  petition: {
    name: 'petition',
    fixedChoices: ['support'],
    successPct: 10,
    clearPctRequired: true,
  },
};
Votings.voteTypeValues = Object.keys(Votings.voteTypes);

function possibleEffectValues() {
  const user = Meteor.user();
  if (!user.hasPermission('vote.insert', { communityId: getActiveCommunityId() })) return ['poll'];
  return Votings.voteEffectValues;
}

Votings.voteSchema = new SimpleSchema({
  procedure: { type: String, allowedValues: Votings.voteProcedureValues, autoform: { defaultValue: 'online', ...allowedOptions(), ...noUpdate } },
  effect: { type: String, allowedValues: Votings.voteEffectValues, autoform: { defaultValue: 'poll', ...autoformOptions(possibleEffectValues, 'schemaVotings.vote.effect.options.'), ...noUpdate } },
  type: { type: String, allowedValues: Votings.voteTypeValues, autoform: { ...allowedOptions(), ...noUpdate } },
  choices: {
    type: Array,
    autoValue() { // we also use an autorun to dynamically set this in the voting-edit window
      const voteType = this.field('vote.type').value;
      if (voteType) return Votings.voteTypes[voteType].fixedChoices;
      return undefined;
    },
  },
  'choices.$': { type: String, autoform: { disabled: true } },
  choicesAddedBy: { type: Array, optional: true, autoform: { omit: true, disabled: true } },
  'choicesAddedBy.$': { type: String, regEx: SimpleSchema.RegEx.Id /* userId */ },
  allowAddChoices: { type: Boolean, optional: true, autoform: {
    disabled: () => {
      const type = AutoForm.getFieldValue('vote.type');
      return !type || !!Votings.voteTypes[type].fixedChoices;
    },
  } },
  successPct: { type: Number, decimal: true, min: 0, max: 100, optional: true, autoform: { defaultValue: 50 } },
  clearPctRequired: { type: Boolean, optional: true },
});

Votings.voteParticipationSchema = new SimpleSchema({
  count: { type: Number },
  units: { type: Number, decimal: true },
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
  category: { type: String, defaultValue: 'vote', autoform: { type: 'hidden', defaultValue: 'vote' } },
  agendaId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  vote: { type: Votings.voteSchema, optional: true },
  voteCasts: { type: Object, optional: true, autoValue: defaultsTo({}), blackbox: true },
  voteCastsIndirect: { type: Object, optional: true, autoValue: defaultsTo({}), blackbox: true },
  votePaths: { type: Object, optional: true, autoValue: defaultsTo({}), blackbox: true },
    // partnerId -> ranked array of choice indexes (or single entry in the array)
  voteResults: { type: Object, optional: true, autoValue: defaultsTo({}), blackbox: true },
    // votershipId -> {}
  voteSummary: { type: Object, optional: true, autoValue: defaultsTo({}), blackbox: true },
    // choiceIndex -> {}
  voteParticipation: { type: Votings.voteParticipationSchema, optional: true, autoValue: defaultsTo({ count: 0, units: 0 }) },
});

Topics.categoryHelpers('vote', {
  validate() {
    if (!this.vote.choices.length && !this.vote.allowAddChoices) {
      throw new Meteor.Error('err_invalidData', 'A voting needs at least one voting choice');
    }
  },
  attachments() {
    return this.getShareddocs()?.map(doc => doc.path).filter(path => !!path); // during upload doc is inserted but path is not yet set
  },
  displayChoice(index, language = getCurrentUserLang()) {
    let choice = this.vote.choices[index];
    if (Votings.voteTypes[this.vote.type].fixedChoices) choice = TAPi18n.__(choice, {}, language);
    return choice;
  },
  modifiableFields() {
    return Topics.modifiableFields.concat([
      'vote.allowAddChoices',
    ]);
  },
  unitsToShare(units) {
    const community = this.community();
    const totalUnits = community && community.totalUnits();
    const votingShare = new Fraction(units, totalUnits);
    return votingShare;
  },
  voteSuccessLimit() {
    if (this.vote?.clearPctRequired) return this.vote?.successPct || 0;
    else return 0;
  },
  eligibleVoterCount() {
//    return Memberships.find({ communityId: this.communityId, role: 'owner' }).count();
    return Parcels.find({ communityId: this.communityId, category: { $in: ['%property', '@property'] } }).count();
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
    if (!this.voteSummary) return false;
    const highestVoteUnit = Math.max(...Object.values(this.voteSummary));
    const successLimit = this.vote.clearPctRequired
      ? this.community().totalUnits() * (this.vote.successPct || 0) / 100
      : this.voteParticipation.units * (this.vote.successPct || 0) / 100;
    return highestVoteUnit >= successLimit;
  },
  notVotedUnits() {
    return this.community().totalUnits() - this.voteParticipation.units;
  },
  notVotedPercent() {
    const nonParticipationShare = this.unitsToShare(this.notVotedUnits());
    const nonParticipationPercent = 100 * nonParticipationShare.toNumber();
    return nonParticipationPercent;
  },
  hasVotedDirect(partnerId) {
    return !!(this.voteCasts && this.voteCasts[partnerId] && this.voteCasts[partnerId].length > 0);
  },
  hasVotedIndirect(partnerId) {
    return !!(this.voteCastsIndirect && this.voteCastsIndirect[partnerId] && this.voteCastsIndirect[partnerId].length > 0);
  },
  hasVoted(partnerId) {
    return this.hasVotedDirect(partnerId) || this.hasVotedIndirect(partnerId);
  },
  extendVote(registeredVote) {
    // During voting, new choices could have been added. The casted vote should take these into consideration as well.
    if (this.vote.type === 'preferential' && this.vote.choices.length > registeredVote.length) {
      for (let i = registeredVote.length; i < this.vote.choices.length; ++i) {
        registeredVote[i] = i;
      }
    }
  },
  voteOf(partnerId) {
    const registeredVote = (this.voteCasts && this.voteCasts[partnerId]) || (this.voteCastsIndirect && this.voteCastsIndirect[partnerId]);
    if (registeredVote?.length) this.extendVote(registeredVote);
    return registeredVote;
  },
  votingClosed() {
    return this.status === 'votingFinished' || this.status === 'closed';
  },
  voteEvaluate() {
    if (Meteor.isClient) return; // 'voteEvaluate' should only run on the server, client does not have the necessary data to perform it
    const voteResults = {};         // results by voterships
    const voteCastsIndirect = {};   // results by users
    const votePaths = {};
    const voteSummary = {};         // results by choices
    const voteParticipation = { count: 0, units: 0 };
    const directVotes = this.voteCasts || {};
    const self = this;
    const voteType = this.vote.type;
    const community = Communities.findOne(this.communityId);
    community.voterships().forEach((votership) => {
      const partnerId = votership.partnerId;
      debugAssert(partnerId);
      const votePath = [partnerId];

      function getVoteResult(voterId) {
        const castedVote = directVotes[voterId];
        if (castedVote) {
          const votingUnits = votership.votingUnits();
          const result = {
            votingShare: votingUnits,
            castedVote,
            votePath,
          };
          voteResults[votership._id] = result;
          voteCastsIndirect[partnerId] = castedVote;
          votePaths[partnerId] = votePath;
          self.extendVote(castedVote);
          castedVote.forEach((choice, i) => {
            voteSummary[choice] = voteSummary[choice] || 0;
            const choiceWeight = (voteType === 'preferential') ? (1 - (i / castedVote.length)) : 1;
            voteSummary[choice] += votingUnits * choiceWeight;
          });
          voteParticipation.count += 1;
          voteParticipation.units += votingUnits;
          return true;
        }
        // Delegation priority is topic scoped, agenda scoped, community scoped, ordered by creation time
        let delegations = 
            Delegations.find({ sourceId: voterId, scope: 'topic', scopeObjectId: self._id }).fetch();
        if (self.agendaId) {
          delegations = delegations.concat(
            Delegations.find({ sourceId: voterId, scope: 'agenda', scopeObjectId: self.agendaId }).fetch()
          );
        }
        delegations = delegations.concat(
            Delegations.find({ sourceId: voterId, scope: 'community', scopeObjectId: self.communityId }).fetch()
        );
        for (const delegation of delegations) {
          if (!_.contains(votePath, delegation.targetId)) {
            votePath.push(delegation.targetId);
            if (getVoteResult(delegation.targetId)) return true;
            votePath.pop();
          }
        }
        return false;
      }

      getVoteResult(partnerId);
    });
    Topics.update(this._id, { $set: { voteParticipation, voteCastsIndirect, votePaths, voteResults, voteSummary } }, { selector: { category: 'vote' } });
  },
  voteResultsDisplay() {
    const topic = this;
    const results = this.voteResults;
    if (!results) return [];
    const data = [];
    Object.keys(results).forEach(key => {
      data.push(_.extend(results[key], {
        voter() {
          return Partners.findOne(this.votePath[0]);
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
          this.votePath.forEach((pid, ind) => {
            const partner = Partners.findOne(pid);
            if (ind > 0 && partner) path += (' -> ' + partner.toString());
          });
          return path;
        },
      }));
    });
    return data;
  },
  voteSummaryDisplay() {
    if (!this.voteSummary) return [];   // Results come down in a different sub, so it might not be there just yet
    const voteSummarydata = Object.keys(this.voteSummary).map(key => {
      const choice = this.vote.choices[key];
      const adderId = this.vote.choicesAddedBy?.[key];
      const votingUnits = this.voteSummary[key];
      const votingShare = this.unitsToShare(this.voteSummary[key]);
      const percentOfTotal = (votingShare.toNumber() * 100);
      const percentOfVotes = ((votingUnits / this.voteParticipation.units) * 100);
      return {
        choice,
        adderId,
        votingUnits: Math.round(votingUnits),
        votingShare,
        percentOfTotal: percentOfTotal.toFixed(2),
        percentOfVotes: percentOfVotes.toFixed(2),
      };
    });
    if (this.vote.type === 'yesno') return voteSummarydata;
    return voteSummarydata.sort((a, b) => b.percentOfVotes - a.percentOfVotes);
  },
  workflow() {
    return Votings.workflow;
  },
});

Votings.participationSheet = function participationSheet(community, agenda) {
  const sheet = [];
  let totalUnits = 0;
  community.voterships().forEach((votership) => {
    const partnerId = votership.partnerId;
    debugAssert(partnerId);
    const votePath = [partnerId];

    function trackPath(voterId) {
      const selector = agenda
      ? { sourceId: voterId,
          $or: [
            { scope: 'agenda', scopeObjectId: agenda._id },
            { scope: 'community', scopeObjectId: community._id },
          ],
        }
      : { sourceId: voterId, 
              scope: 'community', scopeObjectId: community._id }
      const delegations = Delegations.find(selector);
      for (const delegation of delegations.fetch()) {
        if (!_.contains(votePath, delegation.targetId)) {
          votePath.push(delegation.targetId);
          if (trackPath(delegation.targetId)) return true;
          votePath.pop();
        }
      }
      return false;
    }
    trackPath(partnerId);
    const parcels = votership.parcel().withFollowers();
    const votingUnits = votership.votingUnits();
    totalUnits += votingUnits;
    sheet.push({ partnerId, parcels, votingUnits, votePath,
      voter() {
        return Partners.findOne(this.votePath[0]);
      },
      votePathDisplay() {
        if (this.votePath.length === 1) return 'direct';
        let path = '';
        this.votePath.forEach((pid, ind) => {
          const partner = Partners.findOne(pid);
          if (ind > 0 && partner) path += (' -> ' + partner.toString());
        });
        return path;
      },
    });
  });
  sheet.push({ voter: () => '_ ' + __('Participation sheet') + ' ' + __('total') , parcels: ' ', votingUnits: totalUnits, votePathDisplay: () => ' ' });
  if (totalUnits !== community.totalUnits()) {
    sheet.push({ voter: () => '_ ' + __('community') + ' ' + __('total') , parcels: ' ', votingUnits: community.totalUnits(), votePathDisplay: () => ' ' });
  }
  return sheet;
};

Topics.attachVariantSchema(Votings.extensionSchema, { selector: { category: 'vote' } });

Topics.simpleSchema({ category: 'vote' }).i18n('schemaVotings');

Votings.publicExtensionFields = {
  vote: 1,
  voteParticipation: 1,
};
_.extend(Topics.publicFields, Votings.publicExtensionFields);

Votings.voteResultDetailsFields = {
  voteCasts: 1,
  voteCastsIndirect: 1,
  votePaths: 1,
  voteResults: 1,
  voteSummary: 1,
};
Votings.extendPublicFieldsForUser = function extendForUser(userId, communityId) {
  // User cannot see other user's votes, but need to see his own votes (during active voting)
  // Soution: Use 2 subsrciptions, one on the live votings, one on the closed, and the public fields are different for the two
  const user = Meteor.users.findOne(userId);
  const partnerId = user.partnerId(communityId);
  if (user.hasPermission('vote.peek', { communityId })) {
    return _.extend({}, Topics.publicFields, Votings.voteResultDetailsFields);
  } else {
    const publicFiledsForOwnVotes = {};
    publicFiledsForOwnVotes['voteCasts.' + partnerId] = 1;
    publicFiledsForOwnVotes['voteCastsIndirect.' + partnerId] = 1;
    publicFiledsForOwnVotes['votePaths.' + partnerId] = 1;
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
    topic.voteEvaluate();
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
  finish: [votingFinished],
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
    effect: 'poll',
    type: 'choose',
    choices: ['white', 'red', 'yellow', 'grey'],
  },
});
