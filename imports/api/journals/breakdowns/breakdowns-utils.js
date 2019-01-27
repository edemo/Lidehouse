
export const sideTags = {
  name: 'sides', label: 'Balance',
  children: [
  { digit: 'Dr', name: 'debit', label: 'done' },
  { digit: 'Cr', name: 'credit', label: 'bill' },
  ],
};

export const yearTags = {
  name: 'years',
  children: [
  { digit: '2017', name: '2017' },
  { digit: '2018', name: '2018' },
  ],
};

export const monthTags = {
  name: 'months',
  children: [
  { digit: '-01', name: '1', label: 'JAN' },
  { digit: '-02', name: '2', label: 'FEB' },
  { digit: '-03', name: '3', label: 'MAR' },
  { digit: '-04', name: '4', label: 'APR' },
  { digit: '-05', name: '5', label: 'MAY' },
  { digit: '-06', name: '6', label: 'JUN' },
  { digit: '-07', name: '7', label: 'JUL' },
  { digit: '-08', name: '8', label: 'AUG' },
  { digit: '-09', name: '9', label: 'SEP' },
  { digit: '-10', name: '10', label: 'OCT' },
  { digit: '-11', name: '11', label: 'NOV' },
  { digit: '-12', name: '12', label: 'DEC' },
  ],
};

export const yearMonthTags = {
  name: 'yearMonths',
  children: [
  { digit: '2017', name: '2017', include: monthTags },
  { digit: '2018', name: '2018', include: monthTags },
  ],
};
