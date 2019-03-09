import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';
import { getActiveCommunityId } from '/imports/api/communities/communities.js';

// Helpers form manipulating with the Localizer
export const ChartOfAccounts = {
  get(communityId = getActiveCommunityId()) {
    return Breakdowns.findOneByName('COA', communityId);
  },
  addAccount(communityId, node) {
    // TODO: implement it
  },
};

