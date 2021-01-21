
export async function basicAuthVariableReplacer(text: string, type: string) {
  if (type.toLowerCase() === "authorization" && text) {
    const match = /^\s*(b|B)(a|A)(s|S)(i|I)(c|C)\s+(?<user>[^\s]*)\s+(?<password>([^\s]+.*))$/i.exec(text);

    if (match && match.groups && match.groups.user && match.groups.password) {
      return `Basic ${Buffer.from( `${match.groups.user }:${match.groups.password}`).toString('base64')}`;
    }
  }
  return text;
}