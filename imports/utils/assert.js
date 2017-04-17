/* eslint no-console: "off" */
/* eslint no-debugger: "off" */

export function debugAssert(expr, msg) {
  if (!expr) {
    console.assert(false, msg);
    debugger;
  }
}
