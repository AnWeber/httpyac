import { fileProvider, log, userInteractionProvider } from '../io';
import * as models from '../models';
import * as utils from '../utils';
import { ParserRegex } from './parserRegex';
import * as parserUtils from './parserUtils';
import { loadPackageDefinition } from '@grpc/grpc-js';
import { load } from '@grpc/proto-loader';

export interface ProtoProcessorContext extends models.ProcessorContext {
  options: {
    protoDefinitions?: Record<string, models.ProtoDefinition>;
  };
}

export async function parseProtoImport(
  getLineReader: models.getHttpLineGenerator,
  context: models.ParserContext
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
        symbols,
      };

      const headersResult = parserUtils.parseSubsequentLines(
        lineReader,
        [
          parserUtils.parseComments,
          parserUtils.parseRequestHeaderFactory(protoDefinition.loaderOptions),
          parserUtils.parseDefaultHeadersFactory((headers, context: ProtoProcessorContext) =>
            Object.assign(context.options.protoDefinitions?.[protoDefinition.fileName].loaderOptions, headers)
          ),
        ],
        context
      );

      if (headersResult) {
        result.nextParserLine = headersResult.nextLine || result.nextParserLine;
        for (const parseResult of headersResult.parseResults) {
          symbols.push(...parseResult.symbols);
        }
      }

      context.httpRegion.hooks.execute.addObjHook(obj => obj.process, new ProtoImportAction(protoDefinition));

      context.httpRegion.hooks.execute.addInterceptor(new ProtoDefinitionCreationInterceptor(protoDefinition));
      return result;
    }
  }
  return false;
}

export class ProtoImportAction implements models.HttpRegionAction {
  id = models.ActionType.protoImport;

  constructor(private readonly protoDefinition: models.ProtoDefinition) {}

  async process(context: ProtoProcessorContext): Promise<boolean> {
    utils.report(context, `import proto ${this.protoDefinition.fileName}`);
    const definition = context.options.protoDefinitions?.[this.protoDefinition.fileName];
    if (definition) {
      const options = await this.convertLoaderOptions(definition.loaderOptions, context);
      definition.packageDefinition = await utils.replaceFilePath(
        this.protoDefinition.fileName,
        context,
        (path: models.PathLike) => load(fileProvider.fsPath(path), options)
      );
      if (definition.packageDefinition) {
        definition.grpcObject = loadPackageDefinition(definition.packageDefinition);
      }
    }
    return true;
  }

  private async convertLoaderOptions(loaderOptions: Record<string, unknown>, context: models.ProcessorContext) {
    const options = { ...loaderOptions };

    const optionsScript = utils.toMultiLineString(
      Object.entries(options)
        .filter(([, value]) => utils.isString(value))
        .map(([key, value]) => `${key}: ${value},`)
    );
    try {
      Object.assign(options, await utils.evalExpression(`{${optionsScript}}`, context));
    } catch (err) {
      const message = `proto-loader options convert failed: ${optionsScript}`;
      userInteractionProvider.showWarnMessage?.(message);
      log.warn(message, err);
    }
    return options;
  }
}

type ExecuteInterceptor = models.HookInterceptor<models.ProcessorContext, boolean | void>;

export class ProtoDefinitionCreationInterceptor implements ExecuteInterceptor {
  id = models.ActionType.protoCreate;

  constructor(private readonly protoDefinition: models.ProtoDefinition) {}

  async beforeLoop(
    context: models.HookTriggerContext<ProtoProcessorContext, boolean | undefined>
  ): Promise<boolean | undefined> {
    context.arg.options.protoDefinitions = Object.assign({}, context.arg.options.protoDefinitions, {
      [this.protoDefinition.fileName]: {
        fileName: this.protoDefinition.fileName,
        loaderOptions: {
          ...this.protoDefinition.loaderOptions,
        },
      },
    });

    return true;
  }
}
