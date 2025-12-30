import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { Communities } from '/imports/api/communities/communities.js';
import { Meters } from '/imports/api/meters/meters.js';
import { metersColumns } from '/imports/api/meters/tables.js';
import { DatatablesSelectAndExportButtons } from '/imports/ui_3/views/blocks/datatables.js';

import './meters-datatable.html';

Template.Meters_datatable.viewmodel({
  onCreated(instance) {
    const communityId = this.templateInstance.data.communityId;
    instance.subscribe('meters.inCommunity', { communityId });
  },
  tableDataFn() {
    const communityId = this.templateInstance.data.communityId;
    return () => Meters.find({ communityId }).fetch();
  },
  optionsFn() {
    const communityId = this.templateInstance.data.communityId;
    const community = Communities.findOne(communityId);
    return () => ({
      columns: metersColumns(),
      tableClasses: 'display',
      language: datatables_i18n[TAPi18n.getLanguage()],
      lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
      pageLength: 25,
      ...DatatablesSelectAndExportButtons(community, Meters, 'meters'),
    });
  },
});
