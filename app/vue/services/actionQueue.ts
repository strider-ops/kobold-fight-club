/**
 * Action Queue Service - Manages queued navigation actions
 *
 * Used to queue up navigation state transitions with optional instructions.
 * Useful for multi-step workflows (e.g., "add players" -> "battle setup" -> "start combat")
 */

import { reactive } from 'vue';

// Types
export interface QueuedAction {
  state: string; // Route name or path
  message?: string; // Optional instruction to display
}

// State
const state = reactive<{
  actions: QueuedAction[];
  currentInstruction: string;
}>({
  actions: [],
  currentInstruction: '',
});

/**
 * Action Queue Service
 */
class ActionQueueService {
  /**
   * Get current actions queue
   */
  get actions(): QueuedAction[] {
    return state.actions;
  }

  /**
   * Get current instruction message
   */
  get currentInstruction(): string {
    return state.currentInstruction;
  }

  /**
   * Clear the queue and instruction
   */
  clear(): void {
    state.actions.length = 0;
    state.currentInstruction = '';
  }

  /**
   * Process next action in queue
   * @param router - Vue Router instance (or any object with a push method)
   * @returns true if an action was processed, false if queue is empty
   */
  next(router?: { push: (route: string) => void }): boolean {
    if (state.actions.length > 0) {
      const current = state.actions.shift()!;
      state.currentInstruction = current.message || '';

      if (router) {
        router.push(current.state);
      }

      return true;
    }

    return false;
  }

  /**
   * Add action to end of queue
   */
  queue(nextState: string, message?: string): void {
    state.actions.push({ state: nextState, message });
  }

  /**
   * Add action to beginning of queue
   * Removes any existing actions for the same state first
   */
  unshift(nextState: string, message?: string): void {
    // Remove existing actions for this state
    let i = 0;
    while (i < state.actions.length) {
      if (state.actions[i].state === nextState) {
        state.actions.splice(i, 1);
      } else {
        i++;
      }
    }

    // Add to front
    state.actions.unshift({ state: nextState, message });
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return state.actions.length === 0;
  }

  /**
   * Get queue length
   */
  get length(): number {
    return state.actions.length;
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    this.clear();
  }
}

// Export singleton instance
export const actionQueue = new ActionQueueService();
