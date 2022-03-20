import { log } from '../../../io';
import * as models from '../../../models';
import * as utils from '../../../utils';
import { toEnvironmentKey } from '../../../utils';
import { ImportProcessorContext } from './importMetaDataHandler';

export function refMetaDataHandler(type: string, name: string | undefined, context: models.ParserContext): boolean {
  if (['ref', 'forceRef'].indexOf(type) >= 0 && name) {
    context.httpRegion.hooks.execute.addObjHook(
      obj => obj.process,
      new RefMetaAction({
        name,
        force: type === 'forceRef',
      })
    );
    return true;
  }
  return false;
}

export interface RefMetaHttpRegionData {
  name: string;
  force: boolean;
}

class RefMetaAction {
  id = 'ref';

  constructor(private readonly data: RefMetaHttpRegionData) {}

  async process(context: ImportProcessorContext): Promise<boolean> {
    utils.report(context, `load reference ${this.data.name}`);
    let reference = this.findHttpRegionInContext(context.httpFile);
    if (!reference) {
      reference = this.findHttpRegionInImportedContext(context);
    }

    if (reference) {
      registerRegionDependent(context, reference.httpFile, reference.httpRegion, context.httpFile, context.httpRegion);
      const envKey = utils.toEnvironmentKey(context.httpFile.activeEnvironment);
      log.trace('import variables', reference.httpRegion.variablesPerEnv[envKey]);
      Object.assign(context.variables, reference.httpRegion.variablesPerEnv[envKey]);
      if (this.data.force || !context.variables[this.data.name]) {
        const refContext = {
          ...context,
          httpFile: reference.httpFile,
          httpRegion: reference.httpRegion,
        };
        const result = await utils.processHttpRegionActions(refContext);
        if (result) {
          const env = utils.toEnvironmentKey(context.httpFile.activeEnvironment);
          Object.assign(context.variables, refContext.httpRegion.variablesPerEnv[env]);
        }
        return result;
      }
      return true;
    }
    return true;
  }

  private findHttpRegionInContext(httpFile: models.HttpFile) {
    const httpRegion = httpFile.httpRegions.find(
      refHttpRegion => refHttpRegion.metaData.name === this.data.name && !refHttpRegion.metaData.disabled
    );
    if (httpRegion) {
      return {
        httpRegion,
        httpFile,
      };
    }
    return undefined;
  }

  private findHttpRegionInImportedContext(context: ImportProcessorContext) {
    if (context.options.httpFiles) {
      for (const { ref } of context.options.httpFiles.filter(obj => obj.base === context.httpFile)) {
        const reference = this.findHttpRegionInContext(ref);
        if (reference) {
          return reference;
        }
      }
    }
    return undefined;
  }
}

export function registerRegionDependent(
  context: ImportProcessorContext,
  refFile: models.HttpFile,
  refRegion: models.HttpRegion,
  dependentFile: models.HttpFile,
  dependentRegion: models.HttpRegion
): void {
  context.options.refDependencies ||= [];
  let refDepEntry = context.options.refDependencies.find(e => e.refFile === refFile && e.refRegion === refRegion);
  if (!refDepEntry) {
    refDepEntry = { refFile, refRegion, dependents: [] };
    context.options.refDependencies.push(refDepEntry);
  }
  const depEntry = refDepEntry.dependents.find(d => d.depFile === dependentFile && d.depRegion === dependentRegion);
  if (!depEntry) {
    refDepEntry.dependents.push({
      depFile: dependentFile,
      depRegion: dependentRegion,
    });
  }
}

function resetDependentRegionsWithVisitor(
  context: ImportProcessorContext,
  refFile: models.HttpFile,
  refRegion: models.HttpRegion,
  visitedDependents: Array<{ depFile: models.HttpFile; depRegion: models.HttpRegion }>
): void {
  const refDepEntry = context.options.refDependencies?.find(e => e.refFile === refFile && e.refRegion === refRegion);
  if (!refDepEntry) return;
  const unvisitedDependents = refDepEntry.dependents.filter(
    d => !visitedDependents.find(v => v.depFile === d.depFile && v.depRegion === d.depRegion)
  );
  for (const { depFile, depRegion } of unvisitedDependents) {
    delete depRegion.response;
    delete depRegion.variablesPerEnv[toEnvironmentKey(depFile.activeEnvironment)];

    visitedDependents.push({ depFile, depRegion });
    resetDependentRegionsWithVisitor(context, depFile, depRegion, visitedDependents);
  }
}

export function resetDependentRegions(
  context: ImportProcessorContext,
  refFile: models.HttpFile,
  refRegion: models.HttpRegion
): void {
  resetDependentRegionsWithVisitor(context, refFile, refRegion, []);
}
