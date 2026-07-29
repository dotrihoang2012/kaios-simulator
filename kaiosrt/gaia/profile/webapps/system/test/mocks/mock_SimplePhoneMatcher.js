const MockSimplePhoneMatcher = {
  generateVariants: (number) => {
    return number;
  },
  sanitizedNumber: (number) => {
    return number;
  },
  bestMatch: (variants, matches) => {
    let bestMatchIndex = 0;
    let bestLocalIndex = 0;
    let allMatches = [];
    let matchNum = 0;
    return {
      totalMatchNum: matchNum,
      allMatches: allMatches,
      bestMatchIndex: bestMatchIndex,
      localIndex: bestLocalIndex
    };
  }
};

export default MockSimplePhoneMatcher;