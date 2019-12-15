import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { __ } from '/imports/localization/i18n.js';
import { ChartOfAccounts, chooseAccountNode } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { Localizer, chooseLocalizerNode } from '/imports/api/transactions/breakdowns/localizer.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';

export const AccountSchema = new SimpleSchema({
  account: { type: String /* account code */, autoform: chooseAccountNode, optional: true },
  localizer: { type: String /* account code */, autoform: chooseLocalizerNode, optional: true },
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

