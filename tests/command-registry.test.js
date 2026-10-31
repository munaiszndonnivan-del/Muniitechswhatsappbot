
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CommandRegistry
} from '../src/core/command-registry.js';

const validCommand = (overrides = {}) => ({
  name: 'test-command',
  description: 'A test command.',
  department: 'internet-web',
  execute: async () => 'Test successful.',
  ...overrides
});

test('registers a valid command', () => {
  const registry = new CommandRegistry();

  const command = registry.register(validCommand());

  assert.equal(command.name, 'test-command');
  assert.equal(registry.count(), 1);
  assert.equal(registry.get('test-command'), command);
});

test('assigns user permission by default', () => {
  const registry = new CommandRegistry();

  const command = registry.register(validCommand());

  assert.deepEqual(command.permissions, ['user']);
});

test('rejects duplicate command names', () => {
  const registry = new CommandRegistry();

  registry.register(validCommand());

  assert.throws(
    () => registry.register(validCommand()),
    /Duplicate command name/
  );
});

test('rejects invalid command names', () => {
  const registry = new CommandRegistry();

  assert.throws(
    () => registry.register(
      validCommand({ name: 'Invalid Command' })
    ),
    /Command name/
  );
});

test('rejects unknown departments', () => {
  const registry = new CommandRegistry();

  assert.throws(
    () => registry.register(
      validCommand({ department: 'unknown-department' })
    ),
    /Unknown command department/
  );
});

test('rejects commands without descriptions', () => {
  const registry = new CommandRegistry();

  assert.throws(
    () => registry.register(
      validCommand({ description: '' })
    ),
    /needs a description/
  );
});

test('rejects commands without execute functions', () => {
  const registry = new CommandRegistry();

  assert.throws(
    () => registry.register(
      validCommand({ execute: null })
    ),
    /needs an execute function/
  );
});

test('rejects invalid permissions', () => {
  const registry = new CommandRegistry();

  assert.throws(
    () => registry.register(
      validCommand({ permissions: 'owner' })
    ),
    /invalid permissions/
  );
});

test('freezes registered command permissions', () => {
  const registry = new CommandRegistry();

  const command = registry.register(
    validCommand({ permissions: ['admin'] })
  );

  assert.equal(Object.isFrozen(command), true);
  assert.equal(Object.isFrozen(command.permissions), true);
});

test('returns commands belonging to a department', () => {
  const registry = new CommandRegistry();

  registry.register(validCommand());

  registry.register(
    validCommand({
      name: 'another-command',
      department: 'games-entertainment'
    })
  );

  assert.equal(
    registry.getByDepartment('internet-web').length,
    1
  );

  assert.equal(
    registry.getByDepartment('games-entertainment').length,
    1
  );
});

test('clears registered commands', () => {
  const registry = new CommandRegistry();

  registry.register(validCommand());
  registry.clear();

  assert.equal(registry.count(), 0);
  assert.equal(registry.get('test-command'), undefined);
});
