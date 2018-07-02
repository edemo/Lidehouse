import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';

export let chooseAccountFamily = {};
export let chooseAccountNode = {};
export let chooseAccountGroup = {};
export let chooseAccountLocalizer = {};
export let chooseLeafAccountFromGroup = () => {};

if (Meteor.isClient) {
  import { Session } from 'meteor/session';
  import { AutoForm } from 'meteor/aldeed:autoform';
  import { __ } from '/imports/localization/i18n.js';

  chooseAccountFamily = {
    options() {
      const communityId = Session.get('activeCommunityId');
      const accountFamilies = Breakdowns.find({ communityId, sign: { $exists: true } });
      return accountFamilies.map((family) => { return { value: family._id, label: family.name }; });
    },
  };

  chooseAccountNode = {
    options() {
      const communityId = Session.get('activeCommunityId');
      const accountFamily = AutoForm.getFieldValue('account.accountFamily', 'af.txtype.insert')
                        || AutoForm.getFieldValue('account.accountFamily', 'af.txtype.update');
      if (!accountFamily) return [{ label: __('schemaJournals.account.placeholder'), value: 'none' }];
      const pac = Breakdowns.findOne({ communityId, name: accountFamily });
      return pac.leafOptions();
    },
  };

  chooseAccountGroup = {
    options() {
      const communityId = Session.get('activeCommunityId');
      const chartOfAccounts = Breakdowns.chartOfAccounts(communityId);
      return chartOfAccounts.nodeOptions();
    },
  };

  chooseAccountLocalizer = {
    options() {
      const communityId = Session.get('activeCommunityId');
      const localizer = Breakdowns.findOne({ communityId, name: 'Localizer' });
      return localizer.nodeOptions();
    },
  };

  chooseLeafAccountFromGroup = function (family, group) {
    return {
      options() {
        const communityId = Session.get('activeCommunityId');
        const brk = Breakdowns.findOne({ communityId, name: family });
//        if (group) brk.nodeByName(group).leafOptions();
        return brk.leafOptions();
      },
      firstOption: false, // https://stackoverflow.com/questions/32179619/how-to-remove-autoform-dropdown-list-select-one-field
    };
  };
/*
  function chooseAccountsSchema(move) {
    const communityId = Session.get('activeCommunityId');
    const mainAccounts = Breakdowns.find({ communityId, sign: { $exists: true } });
    const localizerPac = Breakdowns.findOne({ communityId, name: 'Localizer' });
   
    return new SimpleSchema({
      account: { type: String, autoform: { options() { return mainAccounts.map(a => { return { value: a.name, label: a.name }; }); } } },
      leaf: { type: String, autoform: chooseLeafObject(move) },
      localizer: { type: String, autoform: { options() { return localizerPac.leafOptions(); } } },
    });
  }*/
}

export const AccountInputSchema = new SimpleSchema({
  account: { type: String, autoform: chooseAccountGroup },
  localizer: { type: String, autoform: chooseAccountLocalizer, optional: true },
});

export class AccountSpecification {
  constructor(mainAccountFullName, localizerLeafName) {
    const mainSplit = mainAccountFullName.split(':');
    this.mainFamily = mainSplit[0] || mainSplit[1];
    this.mainLeaf = mainSplit[mainSplit.length - 1];
    this.localizerLeaf = localizerLeafName;
  }

  toSchemaDef() {
    return {
      [this.mainFamily]: this.mainLeaf,
      'Localizer': this.localizerLeaf,
    };
  }
}