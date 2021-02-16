

export interface EnvironmentConfig{
  environments?: Record<string, Record<string, any>>;
  dotenvDefaultFiles?: string[];
  dotenvDirs?: string[];
  dotenvVariableProviderEnabled?: boolean;
  intellijDirs?: string[];
  intellijVariableProviderEnabled?: boolean;

}