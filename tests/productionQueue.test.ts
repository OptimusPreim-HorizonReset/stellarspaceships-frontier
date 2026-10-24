import { describe, expect, it } from 'vitest';
import { ProductionModuleRegistry } from '../src/industry/productionModules';
import {
  MAX_PRODUCTION_QUEUE_JOBS,
  ProductionQueue
} from '../src/industry/productionQueue';
import { PROVISIONAL_PRODUCTION_RECIPES } from '../src/industry/recipes';
import { Construction } from '../src/construction/construction';
import { Station } from '../src/world/station';

function createRefinery(
  id: string,
  oreAmount = 0
): { readonly queue: ProductionQueue; readonly station: Station } {
  const construction = new Construction(id);
  construction.placeTile({ x: 0, y: 0 }, 'hull');
  const station = new Station({
    id,
    type: 'factory',
    construction,
    position: { x: 0, y: 0 },
    rotation: 0,
    ownerId: null
  });

  if (oreAmount > 0) {
    station.inventory.collect({
      id: `${id}:ore`,
      asteroidId: `${id}:asteroid`,
      sourceTileId: 1,
      resourceType: 'ore',
      amount: oreAmount
    });
  }

  const modules = new ProductionModuleRegistry(
    PROVISIONAL_PRODUCTION_RECIPES
  );
  const refinery = modules.register({
    id: `${id}:refinery`,
    type: 'refinery',
    station
  });
  return { queue: new ProductionQueue(refinery), station };
}

describe('production queues', () => {
  it('processes jobs in FIFO order and applies outputs only at completion', () => {
    const { queue, station } = createRefinery('factory-queue', 2);
    const first = queue.enqueue('smelt-steel');
    const second = queue.enqueue('smelt-steel');

    expect(first.status).toBe('queued');
    expect(second.status).toBe('queued');
    expect(queue.advance(2)).toMatchObject({
      status: 'running',
      activeJob: { recipeId: 'smelt-steel', remainingSeconds: 3 }
    });
    expect(queue.snapshot.queueLength).toBe(2);
    expect(station.inventory.getContents()).toEqual({ ore: 1 });

    const intermediate = queue.advance(3);

    expect(intermediate).toMatchObject({
      status: 'running',
      completedJobIds: ['factory-queue:refinery:job:1'],
      activeJob: { jobId: 'factory-queue:refinery:job:2', remainingSeconds: 5 }
    });
    expect(station.inventory.getContents()).toEqual({ steel: 1 });
    expect(queue.snapshot.activeJob?.remainingSeconds).toBe(5);
    expect(queue.snapshot.queueLength).toBe(1);

    expect(queue.advance(5)).toMatchObject({
      status: 'idle',
      completedJobIds: ['factory-queue:refinery:job:2'],
      queueLength: 0
    });
    expect(station.inventory.getContents()).toEqual({ steel: 2 });
  });

  it('blocks FIFO at an unstartable job and resumes after inventory is replenished', () => {
    const { queue, station } = createRefinery('factory-blocked', 1);

    queue.enqueue('smelt-steel');
    const second = queue.enqueue('smelt-steel');
    const blocked = queue.advance(5);

    expect(blocked).toMatchObject({
      status: 'blocked',
      completedJobIds: ['factory-blocked:refinery:job:1'],
      blockedJob: {
        jobId: 'factory-blocked:refinery:job:2',
        recipeId: 'smelt-steel'
      },
      resourceType: 'ore',
      requestedAmount: 1,
      availableAmount: 0
    });
    expect(second).toMatchObject({
      status: 'queued',
      position: 2
    });
    expect(queue.snapshot.queueLength).toBe(1);
    expect(station.inventory.getContents()).toEqual({ steel: 1 });

    station.inventory.collect({
      id: 'factory-blocked:ore-replenished',
      asteroidId: 'asteroid-replenished',
      sourceTileId: 2,
      resourceType: 'ore',
      amount: 1
    });
    expect(queue.advance(5)).toMatchObject({
      status: 'idle',
      completedJobIds: ['factory-blocked:refinery:job:2'],
      queueLength: 0
    });
    expect(station.inventory.getContents()).toEqual({ steel: 2 });
  });

  it('rejects unsupported recipes, negative time, and queue overflow', () => {
    const { queue } = createRefinery('factory-limits', 0);

    expect(queue.enqueue('assemble-components')).toEqual({
      status: 'unsupported-recipe',
      moduleId: 'factory-limits:refinery',
      recipeId: 'assemble-components'
    });
    expect(() => queue.advance(-1)).toThrow(
      'Production queue delta time must be finite and non-negative.'
    );

    for (let index = 0; index < MAX_PRODUCTION_QUEUE_JOBS; index += 1) {
      expect(queue.enqueue('smelt-steel').status).toBe('queued');
    }

    expect(queue.enqueue('smelt-steel')).toEqual({
      status: 'queue-full',
      capacity: MAX_PRODUCTION_QUEUE_JOBS
    });
    expect(queue.snapshot.queueLength).toBe(MAX_PRODUCTION_QUEUE_JOBS);
  });

  it('completes several jobs when one simulation step has enough elapsed time', () => {
    const { queue, station } = createRefinery('factory-catch-up', 3);

    queue.enqueue('smelt-steel');
    queue.enqueue('smelt-steel');
    queue.enqueue('smelt-steel');

    expect(queue.advance(15)).toEqual({
      status: 'idle',
      completedJobIds: [
        'factory-catch-up:refinery:job:1',
        'factory-catch-up:refinery:job:2',
        'factory-catch-up:refinery:job:3'
      ],
      queueLength: 0
    });
    expect(station.inventory.getContents()).toEqual({ steel: 3 });
  });
});
