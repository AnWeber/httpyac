import * as models from '../models';
import { ParserRegex } from './parserRegex';
import * as parserUtils from './parserUtils';
import { load } from '@grpc/proto-loader';
import * as utils from '../utils';
import { fileProvider, log } from '../io';
import { loadPackageDefinition } from '@grpc/grpc-js';


export interface ProtoProcessorContext extends models.ProcessorContext{
  options: {
    protoDefinitions?: Record<string, models.ProtoDefinition>
  }
}


export async function parseProtoImport(
  getLineReader: models.getHttpLineGenerator,
  { httpRegion }: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();
  const next = lineReader.next();
  if (!next.done) {

    const matchProto = ParserRegex.grpc.proto.exec(next.value.textLine);

    if (matchProto?.groups?.fileName) {
      const protoDefinition = new models.ProtoDefinition(matchProto.groups.fileName);

      const protoSymbol: models.HttpSymbol = {
        name: next.value.textLine,
        description: 'proto import',
        kind: models.HttpSymbolKind.proto,
        startLine: next.value.line,
        startOffset: 0,
        endLine: next.value.line,
        endOffset: next.value.textLine.length,
      };
      const symbols = [protoSymbol];

      const result: models.HttpRegionParserResult = {
        nextParserLine: next.value.line,
        symbols
      };

      const headersResult = parserUtils.parseSubsequentLines(lineReader, [
        parserUtils.parseRequestHeaderFactory(protoDefinition.loaderOptions),
        parserUtils.parseDefaultHeadersFactory(
          (headers, context: ProtoProcessorContext) => Object.assign(context.options.protoDefinitions?.[protoDefinition.fileName].loaderOptions, headers)
        ),
      ]);

      if (headersResult) {
        result.nextParserLine = headersResult.nextLine || result.nextParserLine;
        for (const parseResult of headersResult.parseResults) {
          symbols.push(...parseResult.symbols);
          if (parseResult.actions) {
            httpRegion.hooks.execute.addObjHook(obj => obj.process, ...parseResult.actions);
          }
        }
      }

      httpRegion.hooks.execute.addObjHook(obj => obj.process,
        new ProtoImportAction(protoDefinition));

      httpRegion.hooks.execute.addInterceptor(new ProtoDefinitionCreationInterceptor(protoDefinition));
      return result;
    }
  }
  return false;
}


export class ProtoImportAction implements models.HttpRegionAction {
  id = models.ActionType.protoImport;

  constructor(private readonly protoDefinition: models.ProtoDefinition) {}

  async process(context: ProtoProcessorContext) : Promise<boolean> {
    const definition = context.options.protoDefinitions?.[this.protoDefinition.fileName];
    if (definition) {
      const normalizedPath = await utils.toAbsoluteFilename(this.protoDefinition.fileName, context.httpFile.fileName);

      if (normalizedPath) {
        const options = await this.convertLoaderOptions(definition.loaderOptions, context);
        definition.packageDefinition = await load(fileProvider.fsPath(normalizedPath), options);
        definition.grpcObject = loadPackageDefinition(definition.packageDefinition);
      }
    }
    return true;
  }

  private async convertLoaderOptions(loaderOptions: Record<string, unknown>, context: models.ProcessorContext) {
    const options = { ...loaderOptions };
    for (const [key, value] of Object.entries(options)) {
      try {
        if (utils.isString(value)) {
          options[key] = await utils.evalExpression(value, context);
        }
      } catch (err) {
        log.warn(`proto-loader options convert failed for ${key}=${value}`, err);
      }
    }
    return options;
  }
}


export class ProtoDefinitionCreationInterceptor implements models.HookInterceptor<models.ProcessorContext, boolean | void> {
  id = models.ActionType.protoCreate;

  constructor(private readonly protoDefinition: models.ProtoDefinition) { }

  async beforeLoop(context: models.HookTriggerContext<ProtoProcessorContext, boolean | undefined>): Promise<boolean | undefined> {
    context.arg.options.protoDefinitions = Object.assign({}, context.arg.options.protoDefinitions, {
      [this.protoDefinition.fileName]: {
        fileName: this.protoDefinition.fileName,
        loaderOptions: {
          ...this.protoDefinition.loaderOptions
        }
      }
    });

    return true;
  }
}
