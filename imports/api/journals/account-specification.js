import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { __ } from '/imports/localization/i18n.js';
import { Breakdowns, leafIsParcel } from '/imports/api/journals/breakdowns/breakdowns.js';

export let chooseAccountNode = {};
export let chooseLocalizerNode = {};
export let chooseLeafAccountFromGroup = () => {};

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
      if (!accountFamily) return [{ label: __('schemaJournals.account.placeholder'), value: 'none' }];
      const breakdown = Breakdowns.findOne({ communityId, name: accountFamily });
      return breakdown.leafOptions();
    },
    firstOption: () => __('(Select one)'),
  };
*/
  chooseAccountNode = {
    options() {
      const communityId = Session.get('activeCommunityId');
      const chartOfAccounts = Breakdowns.chartOfAccounts(communityId);
      return chartOfAccounts.nodeOptions();
    },
    firstOption: () => __('(Select one)'),
  };

  chooseLocalizerNode = {
    options() {
      const communityId = Session.get('activeCommunityId');
      const localizer = Breakdowns.findOne({ communityId, name: 'Localizer' });
      return localizer.nodeOptions();
    },
    firstOption: () => __('(Select one)'),
  };

  chooseLeafAccountFromGroup = function (brk, group) {
    if (!brk) return chooseAccountNode;
    return {
      options() {
        const communityId = Session.get('activeCommunityId');
        const breakdown = Breakdowns.findOne({ communityId, name: brk });
        return breakdown.leafOptions(group);
      },
      firstOption: false, // https://stackoverflow.com/questions/32179619/how-to-remove-autoform-dropdown-list-select-one-field
    };
  };
}

export const AccountSchema = new SimpleSchema({
  account: { type: String /* account code */, autoform: chooseAccountNode },
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
  toDoc() {
    return {
      communityId: this.communityId,
      account: this.account,
      localizer: this.localizer,
    };
  }
  display() {
    if (!this.accountName) {
      const coa = Breakdowns.findOneByName('ChartOfAccounts', this.communityId);
      this.accountName = coa.nodeByCode(this.account).name;
    }
    let html = '';
    html += `<span class="label label-default label-xs">${this.account}:${__(this.accountName)}</span> `;
    if (this.localizer) {
      const parcelSuffix = leafIsParcel(this.localizer) ? ('. ' + __('parcel')) : '';
      html += `<span class="label label-success label-xs">${__(this.localizer)}${parcelSuffix}</span> `;
    }
    return html;
  }
}

