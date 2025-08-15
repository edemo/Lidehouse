import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Templates } from '/imports/api/accounting/templates/templates.js';
import { Parcels } from '/imports/api/parcels/parcels.js';

export function defineLocalizerTemplates() {
  Templates.define({ name: 'Honline Társasház Sablon', parcels: [
//    { code: '', name: 'Locations', category: 'location', locked: true },
    { code: '@', name: 'Parcels', category: '@group' }, // Albetétek
//    { code: '@A', name: 'Main building', category: '@group' },

//    { code: '&', name: 'Common areas', category: '@group' },  // Közös tulajdonú helyiségek
//    { code: '&1', name: 'Padlás', category: '@common' },
//    { code: '&2', name: 'Pince', category: '@common' },
//    { code: '&3', name: 'Kert', category: '@common' },
//    { code: '&4', name: 'Tárolók', category: '@common' },
//    { code: '&5', name: 'Garázs', category: '@common' },
//    { code: '&6', name: 'Lépcsőház', category: '@common' },
//    { code: '&7', name: 'Folyosók', category: '@common' },
//    { code: '&9', name: 'Egyeb helyiségek', category: '@common' },

    { code: '#', name: 'Places', category: '#tag' }, // Elszámolási egységek
    { code: '#1', name: 'Central', category: '#tag' },   // Központ
    { code: '#2', name: 'Tartószerkezetek', category: '#tag' },
    { code: '#21', name: 'Falak', category: '#tag' },
    { code: '#22', name: 'Födémek', category: '#tag' },
    { code: '#23', name: 'Tető', category: '#tag' },
    { code: '#3', name: 'Szakipari szerkezetek', category: '#tag' },
    { code: '#31', name: 'Homlokzat', category: '#tag' },
    { code: '#32', name: 'Burkolat', category: '#tag' },
    { code: '#4', name: 'Gépészeti szerkezetek', category: '#tag' },
    { code: '#41', name: 'Ventillation', category: '#tag' }, // Szellőző rendszer
    { code: '#43', name: 'Heating system', category: '#tag' }, // Kazán
    { code: '#44', name: 'Klima', category: '#tag' },
    { code: '#45', name: 'Villamos hálózat', category: '#tag' },
    { code: '#46', name: 'Felügyeleti rendszer', category: '#tag' },
    { code: '#47', name: 'Lift', category: '#tag' },
    { code: '#48', name: 'Kamera rendszer', category: '#tag' },
  ],
  });
}

Parcels.insertTemplateDoc = function insertTemplateDoc(templateId, doc) {
  const docToInsert = _.extend({ communityId: templateId, approved: true }, doc);
  docToInsert.ref = docToInsert.name; delete docToInsert.name;
  Parcels.updateOrInsert({ communityId: templateId, code: doc.code }, docToInsert);
};

if (Meteor.isServer) {
  Meteor.startup(defineLocalizerTemplates);
}
