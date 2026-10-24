import { executeRecipe } from './recipes';
import type {
  RecipeExecutionResult,
  RecipeDefinition,
  RecipeRegistry
} from './recipes';
import { Station } from '../world/station';

export const PRODUCTION_MODULE_TYPES = ['refinery', 'assembler'] as const;

export type ProductionModuleType = (typeof PRODUCTION_MODULE_TYPES)[number];

const supportedRecipes: Readonly<
  Record<ProductionModuleType, readonly string[]>
> = Object.freeze({
  refinery: Object.freeze(['smelt-steel']),
  assembler: Object.freeze([
    'assemble-components',
    'assemble-ship-parts'
  ])
});

const productionModuleTypeSet = new Set<string>(PRODUCTION_MODULE_TYPES);

export interface ProductionModuleDefinition {
  readonly id: string;
  readonly type: ProductionModuleType;
  readonly station: Station;
}

export type ProductionModuleExecutionResult =
  | RecipeExecutionResult
  | {
      readonly status: 'unsupported-recipe';
      readonly moduleId: string;
      readonly moduleType: ProductionModuleType;
      readonly recipeId: string;
    };

export function isProductionModuleType(
  value: unknown
): value is ProductionModuleType {
  return (
    typeof value === 'string' &&
    productionModuleTypeSet.has(value)
  );
}

export class ProductionModule {
  readonly id: string;
  readonly type: ProductionModuleType;
  readonly station: Station;
  readonly supportedRecipeIds: readonly string[];

  constructor(
    definition: ProductionModuleDefinition,
    private readonly recipes: RecipeRegistry
  ) {
    if (
      typeof definition.id !== 'string' ||
      definition.id.trim().length === 0
    ) {
      throw new TypeError('Production module ID must not be empty.');
    }

    if (!isProductionModuleType(definition.type)) {
      throw new TypeError(
        `Unknown production module type: ${String(definition.type)}.`
      );
    }

    if (!(definition.station instanceof Station)) {
      throw new TypeError('Production module must belong to a station.');
    }

    if (definition.station.type !== 'factory') {
      throw new TypeError('Production modules require a factory station.');
    }

    const recipeIds = supportedRecipes[definition.type];

    for (const recipeId of recipeIds) {
      if (recipes.get(recipeId) === undefined) {
        throw new TypeError(
          `Production module ${definition.type} requires recipe ${recipeId}.`
        );
      }
    }

    this.id = definition.id;
    this.type = definition.type;
    this.station = definition.station;
    this.supportedRecipeIds = recipeIds;
    Object.freeze(this);
  }

  execute(recipeId: string): ProductionModuleExecutionResult {
    if (typeof recipeId !== 'string' || recipeId.trim().length === 0) {
      throw new TypeError('Recipe ID must not be empty.');
    }

    if (!this.supportedRecipeIds.includes(recipeId)) {
      return {
        status: 'unsupported-recipe',
        moduleId: this.id,
        moduleType: this.type,
        recipeId
      };
    }

    return executeRecipe(this.recipes, this.station.inventory, recipeId);
  }

  getRecipe(recipeId: string): RecipeDefinition | undefined {
    if (!this.supportedRecipeIds.includes(recipeId)) {
      return undefined;
    }

    return this.recipes.get(recipeId);
  }
}

export class ProductionModuleRegistry {
  private readonly modules = new Map<string, ProductionModule>();

  constructor(private readonly recipes: RecipeRegistry) {}

  register(definition: ProductionModuleDefinition): ProductionModule {
    if (this.modules.has(definition.id)) {
      throw new TypeError(`Duplicate production module ID: ${definition.id}.`);
    }

    const module = new ProductionModule(definition, this.recipes);
    this.modules.set(module.id, module);
    return module;
  }

  get(moduleId: string): ProductionModule | undefined {
    return this.modules.get(moduleId);
  }

  getForStation(stationId: string): readonly ProductionModule[] {
    return Object.freeze(
      Array.from(this.modules.values())
        .filter((module) => module.station.id === stationId)
        .sort((left, right) => left.id.localeCompare(right.id))
    );
  }

  getAll(): readonly ProductionModule[] {
    return Object.freeze(
      Array.from(this.modules.values()).sort((left, right) =>
        left.id.localeCompare(right.id)
      )
    );
  }
}
