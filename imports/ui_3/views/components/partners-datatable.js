import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { Communities } from '/imports/api/communities/communities.js';
import { Partners } from '/imports/api/partners/partners.js';
import { partnersColumns } from '/imports/api/partners/tables.js';
import { DatatablesSelectAndExportButtons } from '/imports/ui_3/views/blocks/datatables.js';

import './partners-datatable.html';

Template.Partners_datatable.viewmodel({
  onCreated(instance) {
    const communityId = this.templateInstance.data.communityId;
    instance.subscribe('partners.inCommunity', { communityId });
  },
  tableDataFn() {
    const communityId = this.templateInstance.data.communityId;
    return () => Partners.find({ communityId }).fetch();
  },
  optionsFn() {
    const communityId = this.templateInstance.data.communityId;
    const community = Communities.findOne(communityId);
    return () => ({
      columns: partnersColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
      pageLength: 25,
      ...DatatablesSelectAndExportButtons(community, Partners, 'partners'),
    });
  },
});
