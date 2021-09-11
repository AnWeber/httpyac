export interface UserSession {
  id: string;
  title: string;
  description: string;
  type: string;
  details: Record<string, string | undefined>,
  delete?: () => void;
}
