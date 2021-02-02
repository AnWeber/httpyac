
export interface EnvironmentProvider{
  reset?(): void;
  getEnvironments(): Promise<Array<string>>;
  getVariables(env: string | undefined): Promise<Record<string, any>>;
};