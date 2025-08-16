<<<<<<< HEAD
import NextAuth from "next-auth";

// Extend the default session type to include id, role, and preferences
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      preferences?: any;
      googleAccessToken?: string;
    }
  }
}
=======
import NextAuth from "next-auth";

// Extend the default session type to include id, role, and preferences
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      preferences?: any;
      googleAccessToken?: string;
    }
  }
}
>>>>>>> 7729ef7fd006f35818317aff5db096f8429d4db3
