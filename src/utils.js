module.exports = {
  merge: function merge(a, b) {
    if (typeof b !== "object" || b instanceof Array) {
      return b;
    }
    var result = {};
    for (var key in b) {
      if (a[key] !== undefined) {
        result[key] = merge(a[key], b[key]);
      } else {
        result[key] = b[key];
      }
    }
    for (var key in a) {
      if (b[key] === undefined) {
        result[key] = a[key];
      }
    }
    return result;
  },
  memoizeAsync: func => (() => {
    let cache = {};
    return (arg) => {
      if (!cache[arg]) {
        return func(arg).then(result => {
          cache[arg] = result;
          return cache[arg];
        });
      } else {
        return Promise.resolve(cache[arg]);
      }
    };
  })(),
  zipWith: (a, b, f) => {
    var c = [];
    for (var i = 0, l = Math.min(a.length, b.length); i < l; ++i) {
      c[i] = f(a[i], b[i]);
    }
    return c;
  },
  repeat: function repeat(n, s) { 
    return n === 0 ? "" : s + repeat(n-1, s);
  }
};
