import { Template } from 'meteor/templating';

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
