
export interface EnvironmentProvider{
  getEnvironments(): Promise<Array<string>>;
  getVariables(env: string | undefined): Promise<Record<string, any>>;
};