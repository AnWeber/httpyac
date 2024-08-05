import { loadPackageDefinition } from '@grpc/grpc-js';
import { load } from '@grpc/proto-loader';
import { HookInterceptor, HookTriggerContext } from 'hookpoint';

import * as io from '../../io';
import * as models from '../../models';
import * as utils from '../../utils';

const ProtoImport = /^\s*proto\s+<\s+(?<fileName>.+)\s*$/u;

export async function parseProtoImport(
  getLineReader: models.getHttpLineGenerator,
  context: models.ParserContext
): Promise<models.HttpRegionParserResult> {
  const lineReader = getLineReader();
  const next = lineReader.next();
  if (!next.done) {
    const matchProto = ProtoImport.exec(next.value.textLine);

    if (matchProto?.groups?.fileName) {
      const filename = matchProto.groups.fileName;
      const protoDefinition = new models.ProtoDefinition(filename.trim());
      protoDefinition.loaderOptions = {};

      const protoSymbol: models.HttpSymbol = new models.HttpSymbol({
        name: next.value.textLine || 'proto import',
        description: 'proto import',
        kind: models.HttpSymbolKind.proto,
        startLine: next.value.line,
        startOffset: 0,
        endLine: next.value.line,
        endOffset: next.value.textLine.length,
        children: [
          new models.HttpSymbol({
            name: 'filename',
            description: filename,
            kind: models.HttpSymbolKind.path,
            startLine: next.value.line,
            startOffset: next.value.textLine.indexOf(filename),
            endLine: next.value.line,
            endOffset: next.value.textLine.indexOf(filename) + filename.length,
          }),
        ],
      });
      const symbols = [protoSymbol];

      const result: models.HttpRegionParserResult = {
        nextParserLine: next.value.line,
        symbols,
      };

      const headersResult = await utils.parseSubsequentLines(
        lineReader,
        [
          utils.parseComments,
          utils.parseRequestHeaderFactory(protoDefinition.loaderOptions),
          utils.parseDefaultHeadersFactory((headers, context: models.ProtoProcessorContext) => {
            const loaderOptions = context.options.protoDefinitions?.[protoDefinition.fileName]?.loaderOptions;
            if (loaderOptions) {
              Object.assign(loaderOptions, headers);
            }
          }),
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

export class ProtoImportAction {
  id = 'proto';

  constructor(private readonly protoDefinition: models.ProtoDefinition) {}

  async process(context: models.ProtoProcessorContext): Promise<boolean> {
    utils.report(context, `import proto ${this.protoDefinition.fileName}`);
    const definition = context.options.protoDefinitions?.[this.protoDefinition.fileName];
    if (definition && io.userInteractionProvider.isTrusted('Proto-Loader')) {
      const options = await this.convertLoaderOptions(context, definition.loaderOptions);
      definition.packageDefinition = await utils.replaceFilePath(
        this.protoDefinition.fileName,
        context,
        async (path: models.PathLike) => {
          const fsPath = io.fileProvider.fsPath(path);
          if (fsPath) {
            return await load(fsPath, options);
          }
          const message = `file ${path} has not scheme file`;
          io.userInteractionProvider.showWarnMessage?.(message);
          io.log.warn(message);

          return undefined;
        }
      );
      if (definition.packageDefinition) {
        definition.grpcObject = loadPackageDefinition(definition.packageDefinition);
      }
    }
    return true;
  }

  private async convertLoaderOptions(context: models.ProcessorContext, loaderOptions?: Record<string, unknown>) {
    const options = { ...loaderOptions };

    const optionsScript = utils.toMultiLineString(
      Object.entries(options)
        .filter(([, value]) => utils.isString(value))
        .map(([key, value]) => `${key}: ${value},`)
    );
    try {
      Object.assign(options, await io.javascriptProvider.evalExpression(`{${optionsScript}}`, context));
    } catch (err) {
      const message = `proto-loader options convert failed: ${optionsScript}`;
      io.userInteractionProvider.showWarnMessage?.(message);
      io.log.warn(message, err);
    }
    return options;
  }
}

type ExecuteInterceptor = HookInterceptor<[models.ProtoProcessorContext], boolean | void>;

export class ProtoDefinitionCreationInterceptor implements ExecuteInterceptor {
  id = 'proto';

  constructor(private readonly protoDefinition: models.ProtoDefinition) {}

  async beforeLoop(
    hookContext: HookTriggerContext<[models.ProtoProcessorContext], boolean | undefined>
  ): Promise<boolean | undefined> {
    const context = hookContext.args[0];
    context.options.protoDefinitions = Object.assign({}, context.options.protoDefinitions, {
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
