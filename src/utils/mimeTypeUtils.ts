import { ContentType } from '../models';

export function parseMimeType(contentType: string): ContentType {
  const [mimeType, ...parameters] = contentType.split(';').map(v => v.trim());
  const charset = parameters.find(p => p.startsWith('charset='))?.split('=')[1];
  return { mimeType, contentType, charset };
}

export function isMimeTypeJSON(contentType: ContentType | undefined): boolean {
  return (
    !!contentType &&
    (contentType.mimeType === 'application/json' ||
      contentType.mimeType.indexOf('+json') >= 0 ||
      contentType.mimeType.indexOf('x-amz-json') >= 0)
  );
}
export function isMimeTypeJavascript(contentType: ContentType | undefined): boolean {
  return contentType?.mimeType === 'application/javascript' || contentType?.mimeType === 'text/x-javascript';
}
export function isMimeTypeXml(contentType: ContentType | undefined): boolean {
  return (
    !!contentType &&
    (contentType.mimeType === 'application/xml' ||
      contentType.mimeType === 'text/xml' ||
      contentType.mimeType.indexOf('+xml') >= 0)
  );
}
export function isMimeTypeHtml(contentType: ContentType | undefined): boolean {
  return contentType?.mimeType === 'text/html';
}
export function isMimeTypeCSS(contentType: ContentType | undefined): boolean {
  return contentType?.mimeType === 'text/css';
}

export function isMimeTypeMarkdown(contentType: ContentType | undefined): boolean {
  return contentType?.mimeType === 'text/markdown';
}

export function isMimeTypeMultiPartFormData(contentType: ContentType | undefined): boolean {
  return contentType?.mimeType === 'multipart/form-data';
}

export function isMimeTypeNewlineDelimitedJSON(contentType: ContentType | undefined): boolean {
  return contentType?.mimeType === 'application/x-ndjson';
}

export function isMimeTypeFormUrlEncoded(contentType: ContentType | undefined): boolean {
  return contentType?.mimeType === 'application/x-www-form-urlencoded';
}

export function isMimeTypePdf(contentType: ContentType | undefined): boolean {
  return contentType?.mimeType === 'application/pdf';
}

export function isMimeTypeImage(contentType: ContentType | undefined): boolean {
  if (contentType) {
    return ['image/jpeg', 'image/gif', 'image/webp', 'image/png', 'image/bmp'].indexOf(contentType.mimeType) >= 0;
  }
  return false;
}
