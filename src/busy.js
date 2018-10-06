let busy = false;
exports.set = (val) => {
  if (typeof val !== 'boolean') {
    return;
  }
  busy = val;
};
exports.get = () => busy;