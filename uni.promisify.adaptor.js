uni.addInterceptor({
  returnValue (res) {
    if (!(!!res && (typeof res === "object" || typeof res === "function") && typeof res.then === "function")) {
      return res;
    }
    return new Promise((resolve, reject) => {
      res.then((result) => {
        if (!Array.isArray(result)) return resolve(result);
        return result[0] ? reject(result[0]) : resolve(result[1]);
      }).catch(reject);
    });
  },
});
