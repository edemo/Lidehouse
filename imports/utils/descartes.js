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

function testDescartes() {
  const array1 = ['1', '2'];
  const array2 = ['x'];
  const array3 = ['a', 'b', 'c'];
  const descartes = descartesProduct([array1, array2, array3]);
  const result = [['1', 'x', 'a'], ['1', 'x', 'b'], ['1', 'x', 'c'],
                  ['2', 'x', 'a'], ['2', 'x', 'b'], ['2', 'x', 'c']];
}
