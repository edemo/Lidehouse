import { Mongo } from 'meteor/mongo';

export function isHostedByUs(link) {
  return (link.startsWith('/uploads') || link.startsWith('/images'));
}

export function link2doc(link, collection) {
  if (link.startsWith('/uploads')) {
    const docId = link.split('/')[3];  // "/uploads/attachments/LCdLSin3qDEpqywkG/IMG.jpg"
    return Mongo.Collection.get(collection).findOne(docId);
  } else {
    return { 
      _id: null,
      isImage: true,
      path: link,
      remove() {},
      // should not remove our template images (link.startsWith('/images'))
      // and no need to remove any external file (link.startsWith('http'))
    };
  }
}
