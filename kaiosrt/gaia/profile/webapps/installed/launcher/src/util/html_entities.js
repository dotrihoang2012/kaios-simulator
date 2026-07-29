export const numericEntityRegExp = /&#([a-z0-9]+);/gi;

export function unescapeNumericHTMLEntities(text) {
  if (!text) {
    return '';
  }
  return text.replace(numericEntityRegExp, (match, captured) => {
    if ('x' === captured.charAt(0).toLowerCase()) {
      // hex
      return String.fromCharCode(parseInt(captured.substring(1), 16));
    } else {
      // base 10 reference
      return String.fromCharCode(parseInt(captured.substring(0), 10));
    }
  });
}
