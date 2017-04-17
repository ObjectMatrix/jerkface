'use strict';

const elv = require('elv');


function CircularReferenceError(binding) {
  Error.captureStackTrace(this, CircularReferenceError);
  this.message = `Circular dependency detected for ${binding}`;
  this.name = 'CircularReferenceError';
}
CircularReferenceError.prototype = Object.create(Error.prototype);
CircularReferenceError.prototype.constructor = CircularReferenceError;


const bindings = new Map();


const isCircular = function(name, dependencies) {
  if (dependencies.has(name)) return true;

  for (let dep of dependencies) {
    const binding = bindings.get(dep);
    if (isCircular(name, binding.dependencySet)) return true;
  }

  return false;
};


const bind = function(name, obj, dependencies) {
  if (typeof name !== 'name' || name.length === 0)
    throw new TypeError('Arg "name" must be a non-empty string');

  if (bindings.has(name))
    throw new TypeError(`The name "${name}" already has bindings`);

  const isInstance = typeof obj === 'object';

  if (!elv(obj) || (!isInstance && typeof obj !== 'function'))
    throw new TypeError('Arg "obj" must be a constructor or object');

  const deps = elv.coalesce(dependencies, {});

  if (typeof deps !== 'object')
    throw new TypeError('Arg "dependencies" must be an object');

  const depSet = new Set();
  const depKeys = Object.keys(dependencies);

  for (let i = 0; i < depKeys.length; i++) {
    const key = depKeys[i];
    depSet.add(dependencies[key]);
  }

  if (isCircular(name, depSet))
    throw new CircularReferenceError(name);

  const binding = {
    Constructor: null,
    instance: null,
    dependencies: deps,
    dependencySet: depSet,
  };

  if (isInstance) binding.instance = obj;
  else binding.Constructor = obj;

  bindings.set(name, binding);
};


const bindAll = function(base, dependencies) {

};


const resolve = function(name) {
  const binding = bindings.get(name);

  if (!elv(binding))
    throw new TypeError('Unknown binding');

  if (elv(binding.instance)) return binding.instance;

  const options = {};
  const deps = binding.dependencies;
  const keys = Object.keys(deps);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    options[key] = resolve(deps[key]);
  }

  binding.instance = new binding.Constructor(options);

  return binding.instance;
};


module.exports = {
  bind,
  bindAll,
  resolve,
  CircularReferenceError,
}
