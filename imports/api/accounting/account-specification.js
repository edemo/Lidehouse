import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { __ } from '/imports/localization/i18n.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { choosePartnerContract } from '/imports/api/contracts/contracts.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';

export const LocationTagsSchema = new SimpleSchema({
  partner: { type: String /* partnerContract code */, autoform: { ...choosePartnerContract }, optional: true },
  localizer: { type: String /* account code */, autoform: { ...Parcels.chooseNode }, optional: true },
  parcelId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
});

export const AccountSchema = new SimpleSchema({
  account: { type: String /* account code */, autoform: { ...Accounts.chooseNodeWithTechnical }, optional: true },
});

export class AccountSpecification {
  constructor(communityId, accountCode, localizerCode) {
    this.communityId = communityId || getActiveCommunityId();
    this.account = accountCode;
    this.localizer = localizerCode;
  }
  static fromDoc(doc) {
    return new AccountSpecification(doc.communityId, doc.account, doc.localizer);
  }
  static fromCode(code, communityId = getActiveCommunityId()) {
    const split = code.split(/#|@/);
    const account = split[0];
    const localizer = split[1];
    return new AccountSpecification(communityId, account, localizer);
  }
  toDoc() {
    return {
      communityId: this.communityId,
      account: this.account,
      localizer: this.localizer,
    };
  }
  toCode() {
    return `${this.account || ''}${this.localizer ? '#' + this.localizer : ''}`;
  }
}

