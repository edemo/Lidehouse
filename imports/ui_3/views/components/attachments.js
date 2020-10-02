import { Template } from 'meteor/templating';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/blocks/image.js';
import './attachments.html';

Template.Attachments.helpers({
  byType() {
    const attachments = { images: [], files: [] };
    this.doc.attachments?.forEach((path) => {
      if ((/\.(gif|jpe?g|tiff?|png|webp|bmp)$/i).test(path)) attachments.images.push(path);
      else attachments.files.push(path);
    });
    return attachments;
  },
  fileName(path) {
    const name = path.split('/').pop();
    return decodeURI(name);
  },
});

Template.Attachments.events({
  'click .js-show-image'(event, instance) {
    const url = event.target.getAttribute('src');
    Modal.show('Modal', {
      title: (decodeURI(url.split('/').pop())),
      body: 'Image',
      bodyContext: { url },
      size: 'lg',
    });
  },
});
