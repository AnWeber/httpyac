import * as models from '../../../models';
import * as utils from '../../../utils';

export async function addMulitpartformBoundary(request: models.Request): Promise<void> {
  if (request.body) {
    if (request.contentType?.contentType && utils.isMimeTypeMultiPartFormData(request.contentType)) {
      const boundaryMatch = /boundary=(?<boundary>\w*)/gu.exec(request.contentType.contentType);
      if (boundaryMatch?.groups?.boundary) {
        const boundary = boundaryMatch?.groups?.boundary;

        if (utils.isString(request.body)) {
          if (!request.body.trim().endsWith(`--${boundary}--`)) {
            request.body = `${request.body}\r\n--${boundary}--`;
          }
        } else if (Array.isArray(request.body)) {
          const lastLine = request.body.pop();
          if (lastLine) {
            if (utils.isString(lastLine)) {
              if (!lastLine.trim().endsWith(`--${boundary}--`)) {
                request.body.push(`${lastLine}\r\n--${boundary}--`);
              } else {
                request.body.push(lastLine);
              }
            } else {
              request.body.push(lastLine);
              request.body.push(`\r\n--${boundary}--`);
            }
          }
        }
      }
    }
  }
}
