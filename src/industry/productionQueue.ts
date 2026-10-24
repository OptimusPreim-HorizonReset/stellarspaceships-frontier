import type { ResourceType } from '../core/tiles';
import { ProductionModule } from './productionModules';

export const MAX_PRODUCTION_QUEUE_JOBS = 100;

export interface QueuedProductionJob {
  readonly jobId: string;
  readonly recipeId: string;
  readonly durationSeconds: number;
}

export interface ActiveProductionJob extends QueuedProductionJob {
  readonly remainingSeconds: number;
}

export interface ProductionQueueSnapshot {
  readonly moduleId: string;
  readonly activeJob: ActiveProductionJob | null;
  readonly pendingJobs: readonly QueuedProductionJob[];
  readonly queueLength: number;
  readonly capacity: number;
}

export type EnqueueProductionResult =
  | {
      readonly status: 'queued';
      readonly jobId: string;
      readonly position: number;
    }
  | {
      readonly status: 'queue-full';
      readonly capacity: number;
    }
  | {
      readonly status: 'unsupported-recipe';
      readonly moduleId: string;
      readonly recipeId: string;
    };

interface AdvanceResultBase {
  readonly completedJobIds: readonly string[];
  readonly queueLength: number;
}

export type ProductionQueueAdvanceResult =
  | (AdvanceResultBase & { readonly status: 'idle' })
  | (AdvanceResultBase & {
      readonly status: 'running';
      readonly activeJob: ActiveProductionJob;
    })
  | (AdvanceResultBase & {
      readonly status: 'blocked';
      readonly blockedJob: QueuedProductionJob;
      readonly resourceType: ResourceType;
      readonly requestedAmount: number;
      readonly availableAmount: number;
    });

export class ProductionQueue {
  private readonly pendingJobs: QueuedProductionJob[] = [];
  private activeJob: ActiveProductionJob | undefined;
  private nextJobNumber = 1;

  constructor(private readonly module: ProductionModule) {}

  get length(): number {
    return this.pendingJobs.length + (this.activeJob === undefined ? 0 : 1);
  }

  get snapshot(): ProductionQueueSnapshot {
    return Object.freeze({
      moduleId: this.module.id,
      activeJob:
        this.activeJob === undefined
          ? null
          : Object.freeze({ ...this.activeJob }),
      pendingJobs: Object.freeze(
        this.pendingJobs.map((job) => Object.freeze({ ...job }))
      ),
      queueLength: this.length,
      capacity: MAX_PRODUCTION_QUEUE_JOBS
    });
  }

  enqueue(recipeId: string): EnqueueProductionResult {
    if (typeof recipeId !== 'string' || recipeId.trim().length === 0) {
      throw new TypeError('Recipe ID must not be empty.');
    }

    const recipe = this.module.getRecipe(recipeId);

    if (recipe === undefined) {
      return {
        status: 'unsupported-recipe',
        moduleId: this.module.id,
        recipeId
      };
    }

    if (this.length >= MAX_PRODUCTION_QUEUE_JOBS) {
      return {
        status: 'queue-full',
        capacity: MAX_PRODUCTION_QUEUE_JOBS
      };
    }

    const job = Object.freeze({
      jobId: `${this.module.id}:job:${this.nextJobNumber}`,
      recipeId,
      durationSeconds: recipe.durationSeconds
    });
    this.nextJobNumber += 1;
    this.pendingJobs.push(job);

    return {
      status: 'queued',
      jobId: job.jobId,
      position: this.length
    };
  }

  advance(deltaTimeSeconds: number): ProductionQueueAdvanceResult {
    if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds < 0) {
      throw new RangeError(
        'Production queue delta time must be finite and non-negative.'
      );
    }

    let remainingSeconds = deltaTimeSeconds;
    const completedJobIds: string[] = [];

    while (true) {
      if (this.activeJob === undefined) {
        const nextJob = this.pendingJobs[0];

        if (nextJob === undefined) {
          return {
            status: 'idle',
            completedJobIds: Object.freeze(completedJobIds),
            queueLength: this.length
          };
        }

        const recipe = this.module.getRecipe(nextJob.recipeId);

        if (recipe === undefined) {
          throw new Error(
            `Queued recipe is no longer supported: ${nextJob.recipeId}.`
          );
        }

        const startResult = this.module.station.inventory.applyTransaction(
          recipe.inputs,
          {}
        );

        if (startResult.status === 'insufficient-resources') {
          return {
            status: 'blocked',
            completedJobIds: Object.freeze(completedJobIds),
            queueLength: this.length,
            blockedJob: nextJob,
            resourceType: startResult.resourceType,
            requestedAmount: startResult.requestedAmount,
            availableAmount: startResult.availableAmount
          };
        }

        this.pendingJobs.shift();
        this.activeJob = {
          ...nextJob,
          remainingSeconds: nextJob.durationSeconds
        };
      }

      if (this.activeJob.remainingSeconds > 0) {
        if (remainingSeconds === 0) {
          return {
            status: 'running',
            completedJobIds: Object.freeze(completedJobIds),
            queueLength: this.length,
            activeJob: Object.freeze({ ...this.activeJob })
          };
        }

        const elapsedSeconds = Math.min(
          remainingSeconds,
          this.activeJob.remainingSeconds
        );
        this.activeJob = {
          ...this.activeJob,
          remainingSeconds: this.activeJob.remainingSeconds - elapsedSeconds
        };
        remainingSeconds -= elapsedSeconds;
      }

      if (this.activeJob.remainingSeconds === 0) {
        const recipe = this.module.getRecipe(this.activeJob.recipeId);

        if (recipe === undefined) {
          throw new Error(
            `Active recipe is no longer supported: ${this.activeJob.recipeId}.`
          );
        }

        const completionResult = this.module.station.inventory.applyTransaction(
          {},
          recipe.outputs
        );

        if (completionResult.status !== 'applied') {
          throw new Error(
            `Production output transaction unexpectedly failed for ${recipe.id}.`
          );
        }

        completedJobIds.push(this.activeJob.jobId);
        this.activeJob = undefined;
      }
    }
  }
}
