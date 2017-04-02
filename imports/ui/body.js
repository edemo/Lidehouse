import { Template } from 'meteor/templating';

import './body.html';

Template.Buildings.helpers({
  buildings: [
    { address: 'Kökörcsin u 4.' },
    { address: 'Frangepán u 23.' },
    { address: 'Viola u 2.' },
  ],
});

Template.Owners.helpers({
  owners: [
    { fullname: 'Bíró Rozália' },
    { fullname: 'Janicsák Eszter' },
    { fullname: 'Goldmann György' },
  ],
});

Template.Discussions.helpers({
  discussions: [
    { topic: 'Lépcsőház felújítása' },
    { topic: 'Kukatároló büdös' },
    { topic: 'Fundamenta hitel' },
  ],
});
