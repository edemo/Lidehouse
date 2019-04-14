import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { __ } from '/imports/localization/i18n.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { getActiveCommunityId } from '/imports/api/communities/communities.js';

export let chooseAccountNode = {};
export let chooseLocalizerNode = {};
export let chooseSubAccount = function () { return {}; };

if (Meteor.isClient) {
  import { Session } from 'meteor/session';
/*  import { AutoForm } from 'meteor/aldeed:autoform';

  chooseAccountFamily = {
    options() {
      const communityId = Session.get('activeCommunityId');
      const accountFamilies = Breakdowns.find({ communityId, sign: { $exists: true } });
      return accountFamilies.map((family) => { return { value: family._id, label: family.name }; });
    },
    firstOption: () => __('(Select one)'),
  };

  chooseAccountNode = {
    options() {
      const communityId = Session.get('activeCommunityId');
      const accountFamily = AutoForm.getFieldValue('account.accountFamily', 'af.txtype.insert')
                        || AutoForm.getFieldValue('account.accountFamily', 'af.txtype.update');
      if (!accountFamily) return [{ label: __('schemaTransactions.account.placeholder'), value: 'none' }];
      const breakdown = Breakdowns.findOne({ communityId, name: accountFamily });
      return breakdown.leafOptions();
    },
    firstOption: () => __('(Select one)'),
  };
*/
  chooseAccountNode = {
    options() {
      return ChartOfAccounts.get().nodeOptions();
    },
    firstOption: () => __('(Select one)'),
  };

  chooseLocalizerNode = {
    options() {
      return Localizer.get().nodeOptions();
    },
    firstOption: () => __('(Select one)'),
  };

  chooseSubAccount = function (brk, nodeCode, leafsOnly = true) {
    return {
      options() {
        const communityId = Session.get('activeCommunityId');
        const breakdown = Breakdowns.findOneByName(brk, communityId);
        return breakdown.nodeOptionsOf(nodeCode, leafsOnly);
      },
      firstOption: false, // https://stackoverflow.com/questions/32179619/how-to-remove-autoform-dropdown-list-select-one-field
    };
  };
}

export const AccountSchema = new SimpleSchema({
  account: { type: String /* account code */, autoform: chooseAccountNode, optional: true },
  localizer: { type: String /* account code */, autoform: chooseLocalizerNode, optional: true },
});

export class AccountSpecification {
  constructor(communityId, accountCode, localizerCode) {
    this.communityId = communityId;
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
  display() {
    if (!this.accountName) {
      const coa = ChartOfAccounts.get(this.communityId);
      if (coa) this.accountName = coa.nodeByCode(this.account).name;
    }
    let html = '';
    html += `<span class="label label-default label-xs">${this.account}:${__(this.accountName)}</span> `;
    if (this.localizer) {
      const parcelSuffix = Localizer.leafIsParcel(this.localizer) ? ('. ' + __('parcel')) : '';
      html += `<span class="label label-success label-xs">${__(this.localizer)}${parcelSuffix}</span> `;
    }
    return html;
  }
}

