import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';

export function feedbackColumns() {
  return [
    { data: 'community().name', title: __('community') },
    { data: 'createdBy()', title: __('createdBy') },
    { data: 'feedback.rating', title: __('Rating') },
    { data: 'feedback.type', title: __('schemaFeedback.feedback.type.label'), render: Render.translate },
    { data: 'title', title: __('schemaFeedback.title.label') },
    { data: '_id', render: Render.buttonView },
  ];
}
