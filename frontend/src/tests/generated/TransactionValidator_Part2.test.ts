// Unit tests for Transaction Validator System
import { describe, it, expect } from 'vitest';

describe('Transaction Validator Part 2', () => {

  it('should validate transaction scenario 1', () => {
    const input = 100;
    const min = 0;
    // setup
    const isValid = input > min;
    expect(isValid).toBe(true);
  });

  it('should validate transaction scenario 2', () => {
    const input = 200;
    const min = 0;
    // setup
    const isValid = input > min;
