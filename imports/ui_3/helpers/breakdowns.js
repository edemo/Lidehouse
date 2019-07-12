import { Template } from 'meteor/templating';
import { __ } from '/imports/localization/i18n.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';

Template.registerHelper('displayAccount', function displayAccount(account, communityId) {
    return ChartOfAccounts.get({ communityId }).display(account);
});

Template.registerHelper('displayLocalizer', function displayLocalizer(localizer, communityId) {
    return Localizer.get(communityId).display(localizer);
});
