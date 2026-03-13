import { bambooConfig } from './config.js';

export function ensureMutationsEnabled(confirm: boolean | undefined): void {
  if (!bambooConfig.enableMutations) {
    throw new Error('BambooHR mutations are disabled. Set BAMBOO_ENABLE_MUTATIONS=true to enable write tools.');
  }

  if (!confirm) {
    throw new Error('This is a mutating BambooHR action. Re-run with confirm=true to proceed.');
  }
}
