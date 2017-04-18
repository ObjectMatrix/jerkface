'use strict';

const elv = require('elv');


const msg = {
  binding: 'Invalid binding configuration encountered',
};


function BindingError(message) {
  Error.captureStackTrace(this, BindingError);
  this.message = elv.coalesce(message, msg.binding);
  this.name = 'BindingError';
}
BindingError.defaultMessage = msg.bindingConfig;
BindingError.prototype = Object.create(Error.prototype);
BindingError.prototype.constructor = BindingError;


function CircularReferenceError(binding) {
  Error.captureStackTrace(this, CircularReferenceError);
  this.message = `Circular dependency detected for ${binding}`;
  this.name = 'CircularReferenceError';
}
CircularReferenceError.prototype = Object.create(Error.prototype);
CircularReferenceError.prototype.constructor = CircularReferenceError;


function MissingDependencyError(binding, dependency) {
  Error.captureStackTrace(this, MissingDependencyError);
  const m = `The binding "${binding}" depends on the missing "${dependency}"`;
  this.message = m;
  this.name = 'MissingDependencyError';
}
MissingDependencyError.prototype = Object.create(Error.prototype);
MissingDependencyError.prototype.constructor = MissingDependencyError;


module.exports = {
  BindingError,
  CircularReferenceError,
  MissingDependencyError,
};
