function descartesProductWith(vectorArray, elemArray) {
  const result = [];
  vectorArray.forEach((vector) => {
    elemArray.forEach((elem) => {
      result.push(vector.concat(elem));
    });
  });
  return result;
}

export function descartesProduct(arrayOfArrays) {
  let result = [[]];
  arrayOfArrays.forEach((array) => {
    result = descartesProductWith(result, array);
  });
  return result;
}
