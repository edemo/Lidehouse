import { Meteor } from 'meteor/meteor';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { TAPi18n } from 'meteor/tap:i18n';
import { _ } from 'meteor/underscore';

import { Topics } from '/imports/api/topics/topics.js';
import { Communities } from '/imports/api/communities/communities.js';

export function voteCastConfirmationEmail(voters, topicId, registrator) {
  const topic = Topics.findOne(topicId);
  const community = Communities.findOne(topic.communityId).name;
  const link = FlowRouterHelpers.urlFor('Topic.show', { _tid: topicId });
  voters.forEach((voterId) => {
    const user = Meteor.users.findOne(voterId);
    if (!user) return;
    const language = user.language();
    const personName = user.displayOfficialName(topic.communityId, language);
    let registeredBy;
    if (voters.length === 1 && voters[0] === registrator) {
      registeredBy = '';
      if (!_.contains(Object.keys(topic.voteCastsIndirect), voterId)) {
        return;
        // TODO: delegations
      }
    } else {
      const registratorName = Meteor.users.findOne(registrator).displayOfficialName(topic.communityId, language);
      registeredBy = TAPi18n.__('email.ConfirmVoteRegistrator', { registrator: registratorName }, language);
    }
    const voteValue = [];
    const castedVoteKey = topic.voteCastsIndirect[voterId]; // || TODO: delegations;
    castedVoteKey.forEach((key) => {
      let choice = topic.vote.choices[key];
      if (topic.vote.type === 'yesno' || topic.vote.type === 'petition') choice = TAPi18n.__(choice, {}, language);
      voteValue.push(choice);
    });

    import { Email } from 'meteor/email';

    Email.send({
      from: 'Honline <noreply@honline.hu>',
      to: user.getPrimaryEmail(),
      bcc: 'Honline <noreply@honline.hu>',
      subject: TAPi18n.__('email.ConfirmVoteTitle', { community }, language),
      text: TAPi18n.__('email.ConfirmVoteText', {
        personName,
        community,
        voteTitle: topic.title,
        voteText: topic.text,
        castedVote: voteValue.toString(),
        registeredBy,
        link,
      }, language),
    });
  });
}

