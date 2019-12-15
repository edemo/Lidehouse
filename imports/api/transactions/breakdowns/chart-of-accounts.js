import { __ } from '/imports/localization/i18n.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';

// Helpers form manipulating with the Localizer
export const ChartOfAccounts = {
  get(communityId = getActiveCommunityId()) {
    return Breakdowns.findOneByName('COA', communityId);
  },
  accountByName(name) {
    
  },
  accountByCode(code) {

  },
  addAccount(communityId, node) {
    // TODO: implement it
  },
};

export const chooseAccountNode = {
  options() {
    return ChartOfAccounts.get().nodeOptions();
  },
  firstOption: () => __('(Select one)'),
};
