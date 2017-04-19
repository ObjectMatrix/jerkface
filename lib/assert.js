'use strict';

const elv = require('elv');

const errors = require('./errors');

const BindingError = errors.BindingError;


const assertBindArgs = function (length) {
  if (length < 2)
    throw new TypeError('The name and target params are required');
};


const assertName = function (name) {
  if (typeof name !== 'string')
    throw new TypeError('The name param must be string');
};


const assertTarget = function (target) {
  if (!elv(target))
    throw new TypeError('The target param cannot be null or undefined');
};


const assertParamsOptions = function (isFunc, params) {
  if (!elv(params)) return;

  if (!Array.isArray(params))
    throw new TypeError('The options.params param must be an array');

  if (!isFunc)
    throw new BindingError('Params can only be used with constrcutors');
};


const assertLifetimeOptions = function (isFunc, lifetime) {
  if (!elv(lifetime)) return;

  if (lifetime !== 'singleton' && lifetime !== 'transient')
    throw new TypeError('Lifetime must be "singleton" or "transient"');

  if (!isFunc)
    throw new BindingError('Lifetime can only be used with constructor');
};


const assertDependencyOptions = function (name, isFunc, dependencies) {
  if (!elv(dependencies)) return;

  if (typeof dependencies !== 'object')
    throw new TypeError('The options.dependencies param must be object');

  if (!isFunc)
    throw new BindingError('Dependencies can only be used with constructors');
};


const assertOptions = function (name, target, options) {
  if (!elv(options)) return;

  const isFunc = typeof target === 'function';

  assertParamsOptions(isFunc, options.params);
  assertLifetimeOptions(isFunc, options.lifetime);
  assertDependencyOptions(name, isFunc, options.dependencies);
};


const assertBase = function (base) {
  if (typeof base !== 'function')
    throw new TypeError('The base param must be a function');
};


const assertDependencies = function (dependencies) {
  if (typeof dependencies !== 'object')
    throw new TypeError('The dependencies param must be an object');

  if (dependencies === null)
    throw new TypeError('The dependencies param cannot be null');

  if (Array.isArray(dependencies))
    throw new TypeError('The dependencies param cannot be an array');

  if (Object.keys(dependencies).length === 0)
    throw new TypeError('The dependenceis param must have at least one key');
};


module.exports = {
  bindArgs: assertBindArgs,
  name: assertName,
  target: assertTarget,
  paramsOptions: assertParamsOptions,
  lifetimeOptions: assertLifetimeOptions,
  dependencyOptions: assertDependencyOptions,
  options: assertOptions,
  base: assertBase,
  dependencies: assertDependencies,
};
