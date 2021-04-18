
export async function basicAuthVariableReplacer(text: string, type: string) : Promise<string | undefined>{
  if (type.toLowerCase() === "authorization" && text) {
    const match = /^\s*(basic)\s+(?<user>[^\s]*)\s+(?<password>([^\s]+.*))$/i.exec(text);

    if (match && match.groups && match.groups.user && match.groups.password) {
      return `Basic ${Buffer.from( `${match.groups.user }:${match.groups.password}`).toString('base64')}`;
    }
  }
  return text;
}