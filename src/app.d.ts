declare global {
  namespace App {
    interface Error {
      message: string;
      requestId?: string;
    }
    interface Locals {
      user: { id: string; email: string; username: string | null; realName: string | null; role: 'user' | 'moderator' | 'admin' } | null;
      requestId: string;
    }
  }
}
export {};
