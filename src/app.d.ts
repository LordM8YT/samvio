declare global {
  namespace App {
    interface Locals {
      user: { id: string; email: string; username: string | null; realName: string | null; role: 'user' | 'moderator' | 'admin' } | null;
    }
  }
}
export {};
