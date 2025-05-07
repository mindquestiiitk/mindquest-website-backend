declare class AuthService {
  googleAuth(idToken: string): Promise<any>;
  handleCallback(token: string): Promise<any>;
  logout(): Promise<any>;
  checkAuth(): Promise<any>;
  registerUser(userData: {
    username: string;
    role: string;
    email: string;
    name?: string;
    picture?: string;
  }): Promise<any>;
}

declare const authService: AuthService;
export default authService;
