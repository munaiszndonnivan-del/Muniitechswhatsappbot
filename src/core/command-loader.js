
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { DEPARTMENTS } from '../config/departments.js';
import { commandRegistry } from './command-registry.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

const departmentsDirectory = path.resolve(
  currentDirectory,
  '../commands/departments'
);

export async function loadCommands() {
  let loadedCount = 0;

  for (const department of DEPARTMENTS) {
    const departmentDirectory = path.join(
      departmentsDirectory,
      department.id
    );

    let files;

    try {
      files = await readdir(departmentDirectory);
    } catch (error) {
      if (error.code === 'ENOENT') {
        continue;
      }

      throw error;
    }

    const javascriptFiles = files
      .filter((file) => file.endsWith('.js'))
      .sort();

    for (const file of javascriptFiles) {
      const filePath = path.join(departmentDirectory, file);
      const module = await import(pathToFileURL(filePath).href);

      const exportedCommands = module.commands ?? module.default;

      const commands = Array.isArray(exportedCommands)
        ? exportedCommands
        : [exportedCommands];

      for (const command of commands) {
        if (!command || command.department !== department.id) {
          throw new Error(
            `Invalid command department in ${department.id}/${file}.`
          );
        }

        commandRegistry.register(command);
        loadedCount++;
      }
    }
  }

  return loadedCount;
}
