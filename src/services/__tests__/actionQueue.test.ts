import { describe, it, expect, beforeEach, vi } from 'vitest';
import { actionQueue } from '../actionQueue';

describe('ActionQueueService', () => {
  beforeEach(() => {
    actionQueue.reset();
  });

  describe('initialization', () => {
    it('should start with empty queue', () => {
      expect(actionQueue.actions).toEqual([]);
      expect(actionQueue.currentInstruction).toBe('');
      expect(actionQueue.isEmpty()).toBe(true);
      expect(actionQueue.length).toBe(0);
    });
  });

  describe('queue', () => {
    it('should add action to end of queue', () => {
      actionQueue.queue('battle-setup', 'Set up your battle');

      expect(actionQueue.actions).toHaveLength(1);
      expect(actionQueue.actions[0]).toEqual({
        state: 'battle-setup',
        message: 'Set up your battle',
      });
    });

    it('should add multiple actions in order', () => {
      actionQueue.queue('players', 'Add players');
      actionQueue.queue('battle-setup', 'Setup battle');
      actionQueue.queue('battle-tracker', 'Start combat');

      expect(actionQueue.actions).toHaveLength(3);
      expect(actionQueue.actions[0].state).toBe('players');
      expect(actionQueue.actions[1].state).toBe('battle-setup');
      expect(actionQueue.actions[2].state).toBe('battle-tracker');
    });

    it('should handle actions without messages', () => {
      actionQueue.queue('encounter-builder');

      expect(actionQueue.actions[0]).toEqual({
        state: 'encounter-builder',
        message: undefined,
      });
    });
  });

  describe('unshift', () => {
    it('should add action to beginning of queue', () => {
      actionQueue.queue('second', 'Second');
      actionQueue.unshift('first', 'First');

      expect(actionQueue.actions).toHaveLength(2);
      expect(actionQueue.actions[0].state).toBe('first');
      expect(actionQueue.actions[1].state).toBe('second');
    });

    it('should remove existing actions for same state', () => {
      actionQueue.queue('players', 'Add players');
      actionQueue.queue('battle-setup', 'Setup');
      actionQueue.queue('players', 'Add more players');

      actionQueue.unshift('players', 'Players first!');

      expect(actionQueue.actions).toHaveLength(2);
      expect(actionQueue.actions[0].state).toBe('players');
      expect(actionQueue.actions[0].message).toBe('Players first!');
      expect(actionQueue.actions[1].state).toBe('battle-setup');
    });

    it('should handle unshift without message', () => {
      actionQueue.unshift('encounter-builder');

      expect(actionQueue.actions[0]).toEqual({
        state: 'encounter-builder',
        message: undefined,
      });
    });
  });

  describe('next', () => {
    it('should process first action and remove from queue', () => {
      const mockRouter = { push: vi.fn() };

      actionQueue.queue('players', 'Add players');
      actionQueue.queue('battle-setup', 'Setup battle');

      const result = actionQueue.next(mockRouter);

      expect(result).toBe(true);
      expect(actionQueue.actions).toHaveLength(1);
      expect(actionQueue.actions[0].state).toBe('battle-setup');
      expect(mockRouter.push).toHaveBeenCalledWith('players');
    });

    it('should set current instruction', () => {
      const mockRouter = { push: vi.fn() };

      actionQueue.queue('players', 'Please add your players');

      actionQueue.next(mockRouter);

      expect(actionQueue.currentInstruction).toBe('Please add your players');
    });

    it('should set empty instruction if no message', () => {
      const mockRouter = { push: vi.fn() };

      actionQueue.queue('players');

      actionQueue.next(mockRouter);

      expect(actionQueue.currentInstruction).toBe('');
    });

    it('should return false when queue is empty', () => {
      const result = actionQueue.next();

      expect(result).toBe(false);
    });

    it('should work without router parameter', () => {
      actionQueue.queue('players', 'Add players');

      const result = actionQueue.next();

      expect(result).toBe(true);
      expect(actionQueue.actions).toHaveLength(0);
    });

    it('should process all actions in sequence', () => {
      const mockRouter = { push: vi.fn() };

      actionQueue.queue('first', 'First step');
      actionQueue.queue('second', 'Second step');
      actionQueue.queue('third', 'Third step');

      actionQueue.next(mockRouter);
      expect(mockRouter.push).toHaveBeenCalledWith('first');
      expect(actionQueue.currentInstruction).toBe('First step');

      actionQueue.next(mockRouter);
      expect(mockRouter.push).toHaveBeenCalledWith('second');
      expect(actionQueue.currentInstruction).toBe('Second step');

      actionQueue.next(mockRouter);
      expect(mockRouter.push).toHaveBeenCalledWith('third');
      expect(actionQueue.currentInstruction).toBe('Third step');

      const result = actionQueue.next(mockRouter);
      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all actions and instruction', () => {
      actionQueue.queue('players', 'Add players');
      actionQueue.queue('battle-setup', 'Setup');

      const mockRouter = { push: vi.fn() };
      actionQueue.next(mockRouter);

      actionQueue.clear();

      expect(actionQueue.actions).toEqual([]);
      expect(actionQueue.currentInstruction).toBe('');
      expect(actionQueue.isEmpty()).toBe(true);
    });
  });

  describe('isEmpty', () => {
    it('should return true when queue is empty', () => {
      expect(actionQueue.isEmpty()).toBe(true);
    });

    it('should return false when queue has actions', () => {
      actionQueue.queue('players');
      expect(actionQueue.isEmpty()).toBe(false);
    });

    it('should return true after processing all actions', () => {
      actionQueue.queue('players');
      actionQueue.next();
      expect(actionQueue.isEmpty()).toBe(true);
    });
  });

  describe('length', () => {
    it('should return 0 for empty queue', () => {
      expect(actionQueue.length).toBe(0);
    });

    it('should return correct length', () => {
      actionQueue.queue('one');
      expect(actionQueue.length).toBe(1);

      actionQueue.queue('two');
      expect(actionQueue.length).toBe(2);

      actionQueue.queue('three');
      expect(actionQueue.length).toBe(3);
    });

    it('should update after processing actions', () => {
      actionQueue.queue('one');
      actionQueue.queue('two');
      expect(actionQueue.length).toBe(2);

      actionQueue.next();
      expect(actionQueue.length).toBe(1);

      actionQueue.next();
      expect(actionQueue.length).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      actionQueue.queue('players', 'Message');

      const mockRouter = { push: vi.fn() };
      actionQueue.next(mockRouter);

      actionQueue.reset();

      expect(actionQueue.actions).toEqual([]);
      expect(actionQueue.currentInstruction).toBe('');
    });
  });

  describe('edge cases', () => {
    it('should handle many actions', () => {
      for (let i = 0; i < 100; i++) {
        actionQueue.queue(`state-${i}`, `Message ${i}`);
      }

      expect(actionQueue.length).toBe(100);

      for (let i = 0; i < 100; i++) {
        actionQueue.next();
      }

      expect(actionQueue.isEmpty()).toBe(true);
    });

    it('should handle unshift removing multiple duplicates', () => {
      actionQueue.queue('players', 'First');
      actionQueue.queue('battle', 'Middle');
      actionQueue.queue('players', 'Second');
      actionQueue.queue('tracker', 'End');
      actionQueue.queue('players', 'Third');

      actionQueue.unshift('players', 'New message');

      expect(actionQueue.length).toBe(3);
      expect(actionQueue.actions[0].state).toBe('players');
      expect(actionQueue.actions[1].state).toBe('battle');
      expect(actionQueue.actions[2].state).toBe('tracker');
    });
  });
});
