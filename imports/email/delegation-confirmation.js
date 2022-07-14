import { Meteor } from 'meteor/meteor';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { TAPi18n } from 'meteor/tap:i18n';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Memberships } from '/imports/api/memberships/memberships.js';

export function delegationConfirmationEmail(delegation, method, formerDelegation) {
  debugAssert(Meteor.isServer);
  import { EmailSender } from '/imports/startup/server/email-sender.js';
  
  const community = Communities.findOne(delegation.communityId).name;
  const date = delegation.updatedAt.toLocaleDateString();
  const link = FlowRouterHelpers.urlFor('Delegations');
  const sourcePerson = Partners.findOne(delegation.sourceId);
  const targetPerson = Partners.findOne(delegation.targetId);
  const addressee = [delegation.sourceId, delegation.targetId];
  if (formerDelegation && delegation.targetId !== formerDelegation.targetId) addressee.push(formerDelegation.targetId);
  addressee.forEach((personId) => {
    const person = Partners.findOne(personId);
    const user = Meteor.users.findOne(person.userId);
    if (!user) return;
    const language = user.language();
    const personName = user.displayOfficialName(delegation.communityId, language);
    const sourcePersonName = sourcePerson.displayName(language);
    const targetPersonName = targetPerson.displayName(language);
    function scopeObject(deleg) {
      const doc = deleg.scopeObject();
      const matters = ' ' + TAPi18n.__('matters', {}, language);
      if (deleg.scope === 'community') return doc.name + matters;
      if (deleg.scope === 'agenda') return doc.title + matters;
      if (deleg.scope === 'topic') return doc.title + ' ' + TAPi18n.__('voting', {}, language);
      return '';
    }
    function methodType() {
      if (method === 'insert') return TAPi18n.__('was inserted', {}, language);
      if (method === 'update') return TAPi18n.__('was updated', {}, language);
      if (method === 'remove') return TAPi18n.__('was removed', {}, language);
      return '';
    }
    const acceptance = method === 'remove' ?
      TAPi18n.__('email.delegationRemoved', { date }, language) : TAPi18n.__('email.delegationAcceptance', {}, language);
    const beforeUpdate = method === 'update' ?
      TAPi18n.__('email.delegationBefore', {
        formerSourcePerson: Partners.findOne(formerDelegation.sourceId).displayName(language),
        formerTargetPerson: Partners.findOne(formerDelegation.targetId).displayName(language),
        formerScopeObject: scopeObject(formerDelegation),
      }, language) :
      '';
    
    return EmailSender.send({
      to: user.getPrimaryEmail(),
      subject: TAPi18n.__('email.ConfirmDelegationSubject', { community, methodType: methodType() }, language),
      text: TAPi18n.__('email.ConfirmDelegationText', {
        personName,
        methodType: methodType(),
        community,
        date,
        sourcePersonName,
        targetPersonName,
        scopeObject: scopeObject(delegation),
        acceptance,
        link,
        beforeUpdate,
      }, language),
    });
  });
}

