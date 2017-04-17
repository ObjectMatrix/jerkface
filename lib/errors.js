'use strict';

function CircularReferenceError(binding) {
  Error.captureStackTrace(this, CircularReferenceError);
  this.message = `Circular dependency detected for ${binding}`;
  this.name = 'CircularReferenceError';
}
CircularReferenceError.prototype = Object.create(Error.prototype);
CircularReferenceError.prototype.constructor = CircularReferenceError;


module.exports = {
  CircularReferenceError,
};
