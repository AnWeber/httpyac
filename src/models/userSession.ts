

export interface UserSession{
  id: string;
  title: string;
  description: string;
  logout?: () => void;
}