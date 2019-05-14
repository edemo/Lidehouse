import { Meteor } from 'meteor/meteor';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { TAPi18n } from 'meteor/tap:i18n';
import { _ } from 'meteor/underscore';

import { Delegations } from '/imports/api/delegations/delegations.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Memberships } from '/imports/api/memberships/memberships.js';

export function delegationConfirmationEmail(delegation, method, formerDelegation) {
  const community = Communities.findOne(delegation.communityId).name;
  const date = delegation.updatedAt.toLocaleDateString();
  const link = FlowRouterHelpers.urlFor('Delegations');
  const sourcePerson = Memberships.findOne({ personId: delegation.sourcePersonId }).Person();
  const targetPerson = Memberships.findOne({ personId: delegation.targetPersonId }).Person();
  const addressee = [delegation.sourcePersonId, delegation.targetPersonId];
  if (formerDelegation && delegation.targetPersonId !== formerDelegation.targetPersonId) addressee.push(formerDelegation.targetPersonId);
  addressee.forEach((personId) => {
    const user = Meteor.users.findOne(personId);
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
        formerSourcePerson: Memberships.findOne({ personId: formerDelegation.sourcePersonId }).Person().displayName(language),
        formerTargetPerson: Memberships.findOne({ personId: formerDelegation.targetPersonId }).Person().displayName(language),
        formerScopeObject: scopeObject(formerDelegation),
      }, language) :
      '';

    import { Email } from 'meteor/email';

    Email.send({
      from: 'Honline <noreply@honline.hu>',
      to: user.getPrimaryEmail(),
      bcc: 'Honline <noreply@honline.hu>',
      subject: TAPi18n.__('email.ConfirmDelegationTitle', { community, methodType: methodType() }, language),
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

