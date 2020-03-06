import { debugAssert } from '/imports/utils/assert.js';

function deaccentLowerCase(text) {
  return text.deaccent().toLowerCase();
}

export function compareNames(param1, param2) {
  debugAssert((typeof param1 === 'object'), 'compareNames param1 must be an object (firstName && lastName or name).');
  debugAssert(((param1.firstName && param1.lastName) || param1.name), 'firstName and lastName or name is required at compareNames.');

  function latinOneWayIncludes(string1, string2) {
    const compare = deaccentLowerCase(string1).includes(deaccentLowerCase(string2));
    const reverse = deaccentLowerCase(string2).includes(deaccentLowerCase(string1));
    if (compare || reverse) return true;
    else return false;
  }

  if ((param1.firstName && param1.lastName) && (param2.firstName && param2.lastName)) {
    if ((param1.firstName === param2.firstName) && (param1.lastName === param2.lastName)) return 'equal';
    if (param1.firstName.localeCompare(param2.firstName, 'hu', { sensitivity: 'base' }) === 0 &&
      param1.lastName.localeCompare(param2.lastName, 'hu', { sensitivity: 'base' }) === 0) return 'analog';
    if (latinOneWayIncludes(param1.firstName, param2.firstName) &&
      latinOneWayIncludes(param1.lastName, param2.lastName)) return 'analog';
    return 'different';
  }
  if (((param1.firstName && param1.lastName) && param2.name) || (param1.name && (param2.firstName && param2.lastName))) {
    const firstName = param1.firstName || param2.firstName;
    const lastName = param1.lastName || param2.lastName;
    const name = param1.name || param2.name;
    const fullNameHu = lastName + ' ' + firstName;
    const fullNameEn = firstName + ' ' + lastName;
    if ((fullNameHu === name) || (fullNameEn === name)) return 'equal';
    if ((fullNameHu.localeCompare(name, 'hu', { sensitivity: 'base' }) === 0) ||
      (fullNameEn.localeCompare(name, 'hu', { sensitivity: 'base' }) === 0)) return 'analog';
    if (latinOneWayIncludes(name, fullNameHu) || latinOneWayIncludes(name, fullNameEn)) return 'analog';
    return 'different';
  }
  if (param1.name && param2.name) {
    if (param1.name === param2.name) return 'equal';
    if (param1.name.localeCompare(param2.name, 'hu', { sensitivity: 'base' }) === 0) return 'analog';
    if (latinOneWayIncludes(param1.name, param2.name)) return 'analog';
    return 'different';
  }
  if (typeof param2 === 'string') {
    if (param1.firstName && param1.lastName) {
      if (param2.includes(param1.firstName) && param2.includes(param1.lastName)) return 'includes';
      const normFirstName = deaccentLowerCase(param1.firstName);
      const normLastName = deaccentLowerCase(param1.lastName);
      const normString = deaccentLowerCase(param2);
      if (normString.includes(normFirstName) && normString.includes(normLastName)) return 'includes-analog';
      return 'different';
    }
    if (param1.name) {
      if (param2.includes(param1.name)) return 'includes';
      const normName = deaccentLowerCase(param1.name);
      const normString = deaccentLowerCase(param2);
      if (normString.includes(normName)) return 'includes-analog';
      return 'different';
    }
  }
  debugAssert(false, 'Should never get here');
  return undefined;
}

export function namesMatchExact(param1, param2) {
  return compareNames(param1, param2) === 'equal';
}

export function namesMatch(param1, param2) {
  return compareNames(param1, param2) !== 'different';
}
