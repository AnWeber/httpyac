export function isBufferEncoding(encoding: string): encoding is BufferEncoding {
  return (
    ['ascii', 'utf8', 'utf-8', 'utf16le', 'ucs2', 'ucs-2', 'base64', 'latin1', 'binary', 'hex'].indexOf(encoding) >= 0
  );
}

export function getBufferEncoding(encoding: string | undefined): BufferEncoding {
  if (encoding && isBufferEncoding(encoding)) {
    return encoding;
  }
  return 'utf8';
}
