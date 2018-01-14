
export function expandFrom1To3Levels(tree) {
  const leafs = _.clone(tree.children);
//  console.log("Expand", leafs);
  tree.children = [];
  tree.children[0] = {};
  tree.children[0].name = '';
  tree.children[0].children = [];
  tree.children[0].children[0] = {};
  tree.children[0].children[0].name = '';
  tree.children[0].children[0].children = leafs;
//  console.log(tree);
  return tree;
}

export const phaseTags = expandFrom1To3Levels({
  name: 'balance',
  children: [
  { name: 'done' },
  { name: 'bill' },
  ],
});

export const yearTags = expandFrom1To3Levels({
  name: '',
  children: [
  { name: 2016 },
  { name: 2017 },
  ],
});

export const monthTags = expandFrom1To3Levels({
  name: 2017,
  children: [
  { name: 1, label: 'JAN' },
  { name: 2, label: 'FEB' },
  { name: 3, label: 'MAR' },
  { name: 4, label: 'APR' },
  { name: 5, label: 'MAY' },
  { name: 6, label: 'JUN' },
  { name: 7, label: 'JUL' },
  { name: 8, label: 'AUG' },
  { name: 9, label: 'SEP' },
  { name: 10, label: 'OCT' },
  { name: 11, label: 'NOV' },
  { name: 12, label: 'DEC' },
  ],
});

