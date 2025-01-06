module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next); // Pass errors to the global error handler
  };
};
