import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
// import { Agendas } from '/imports/api/agendas/agendas.js';

export function agendaColumns() {
  return [
    { data: 'title', title: __('schemaAgendas.title.label') },
    { data: 'topics()', title: __('schemaAgendas.topicIds.label'), render: cellData => _.pluck(cellData, 'title') },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];
}
