export async function replaceIntellijVariableAuth(variable: string): Promise<string | undefined> {
  const trimmedVariable = variable.trim();
  if (trimmedVariable.startsWith('$auth.token') || trimmedVariable.startsWith('$auth.idToken')) {
    const token = await getOAuthToken(trimmedVariable);
    if (token) {
      return `${token}`;
    }
  }
  return undefined;
}

async function getOAuthToken(variable: string) {
  const match = /^\$auth.(?<type>token|idToken)\s*\(\s*(?<name>.*)\s*\)$/u.exec(variable);
  if (match && match.groups?.type && match.groups?.name) {
    return 'blub';
  }
  return undefined;
}
