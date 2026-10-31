
import { DEPARTMENTS } from '../config/departments.js';

const validDepartments = new Set(
  DEPARTMENTS.map((department) => department.id)
);

export class CommandRegistry {
  constructor() {
    this.commands = new Map();
  }

  register(command) {
    if (!command || typeof command !== 'object') {
      throw new TypeError('A command must be an object.');
    }

    const { name, description, department, execute, permissions } = command;

    if (
      typeof name !== 'string' ||
      !/^[a-z0-9][a-z0-9_-]*$/.test(name)
    ) {
      throw new Error('Command name must use lowercase letters, numbers, _ or -.');
    }

    if (this.commands.has(name)) {
      throw new Error(`Duplicate command name: ${name}`);
    }

    if (!validDepartments.has(department)) {
      throw new Error(`Unknown command department: ${department}`);
    }

    if (
      typeof description !== 'string' ||
      description.trim().length === 0
    ) {
      throw new Error(`Command "${name}" needs a description.`);
    }

    if (typeof execute !== 'function') {
      throw new Error(`Command "${name}" needs an execute function.`);
    }

    if (
      permissions !== undefined &&
      (!Array.isArray(permissions) ||
        !permissions.every((permission) => typeof permission === 'string'))
    ) {
      throw new Error(`Command "${name}" has invalid permissions.`);
    }

    const registeredCommand = Object.freeze({
      ...command,
      permissions: Object.freeze([...(permissions ?? ['user'])])
    });

    this.commands.set(name, registeredCommand);

    return registeredCommand;
  }

  get(name) {
    return this.commands.get(name);
  }

  getAll() {
    return [...this.commands.values()];
  }

  getByDepartment(department) {
    return this.getAll().filter(
      (command) => command.department === department
    );
  }

  count() {
    return this.commands.size;
  }

  clear() {
    this.commands.clear();
  }
}

export const commandRegistry = new CommandRegistry();
      
