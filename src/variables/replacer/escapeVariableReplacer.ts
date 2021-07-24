export async function escapeVariableReplacer(text: string): Promise<string | undefined> {
  const escapeRegex = /(?:\\\{){2}([^}{2}]+)(?:\\\}){2}/gu;
  let match: RegExpExecArray | null;
  let result = text;
  while ((match = escapeRegex.exec(text)) !== null) {
    const [searchValue, variable] = match;
    result = result.replace(searchValue, `{{${variable}}}`);
  }
  return result;
}
