import { describe, it, expect, vi } from 'vitest';
import { TypedEventEmitter } from '../../src/utils/event-emitter';

interface TestEventMap {
  'test:event': { value: number };
  'test:string': { message: string };
  'test:empty': Record<string, never>;
}

describe('TypedEventEmitter', () => {
  it('should emit events to registered handlers', () => {
    const emitter = new TypedEventEmitter<TestEventMap>();
    const handler = vi.fn();

    emitter.on('test:event', handler);
    emitter.emit('test:event', { value: 42 });

    expect(handler).toHaveBeenCalledWith({ value: 42 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should support multiple handlers for the same event', () => {
    const emitter = new TypedEventEmitter<TestEventMap>();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    emitter.on('test:event', handler1);
    emitter.on('test:event', handler2);
    emitter.emit('test:event', { value: 42 });

    expect(handler1).toHaveBeenCalledWith({ value: 42 });
    expect(handler2).toHaveBeenCalledWith({ value: 42 });
  });

  it('should return unsubscribe function', () => {
    const emitter = new TypedEventEmitter<TestEventMap>();
    const handler = vi.fn();

    const unsubscribe = emitter.on('test:event', handler);
    emitter.emit('test:event', { value: 1 });
    
    unsubscribe();
    emitter.emit('test:event', { value: 2 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ value: 1 });
  });

  it('should support once() for single-fire handlers', () => {
    const emitter = new TypedEventEmitter<TestEventMap>();
    const handler = vi.fn();

    emitter.once('test:event', handler);
    emitter.emit('test:event', { value: 1 });
    emitter.emit('test:event', { value: 2 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ value: 1 });
  });

  it('should allow unsubscribing from once() before it fires', () => {
    const emitter = new TypedEventEmitter<TestEventMap>();
    const handler = vi.fn();

    const unsubscribe = emitter.once('test:event', handler);
    unsubscribe();
    emitter.emit('test:event', { value: 1 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should handle errors in event handlers gracefully', () => {
    const emitter = new TypedEventEmitter<TestEventMap>();
    const errorHandler = vi.fn(() => {
      throw new Error('Handler error');
    });
    const normalHandler = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    emitter.on('test:event', errorHandler);
    emitter.on('test:event', normalHandler);
    emitter.emit('test:event', { value: 42 });

    expect(errorHandler).toHaveBeenCalled();
    expect(normalHandler).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('should remove all listeners', () => {
    const emitter = new TypedEventEmitter<TestEventMap>();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    emitter.on('test:event', handler1);
    emitter.on('test:string', handler2);
    emitter.removeAllListeners();
    
    emitter.emit('test:event', { value: 42 });
    emitter.emit('test:string', { message: 'test' });

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it('should handle emitting events with no listeners', () => {
    const emitter = new TypedEventEmitter<TestEventMap>();
    
    expect(() => {
      emitter.emit('test:event', { value: 42 });
    }).not.toThrow();
  });

  it('should support different event types', () => {
    const emitter = new TypedEventEmitter<TestEventMap>();
    const numberHandler = vi.fn();
    const stringHandler = vi.fn();

    emitter.on('test:event', numberHandler);
    emitter.on('test:string', stringHandler);
    
    emitter.emit('test:event', { value: 42 });
    emitter.emit('test:string', { message: 'hello' });

    expect(numberHandler).toHaveBeenCalledWith({ value: 42 });
    expect(stringHandler).toHaveBeenCalledWith({ message: 'hello' });
  });
});
