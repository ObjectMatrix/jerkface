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


function ResolveError(binding) {
  Error.captureStackTrace(this, ResolveError);
  this.message = `Unknown binding: ${binding}`;
  this.name = 'ResolveError';
}
ResolveError.prototype = Object.create(Error.prototype);
ResolveError.prototype.constructor = ResolveError;


module.exports = {
  BindingError,
  CircularReferenceError,
  ResolveError,
};
