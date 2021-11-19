export interface UserSession {
  id: string;
  title: string;
  description: string;
  type: string;
  details: Record<string, unknown>;
  delete?: () => void;
}
