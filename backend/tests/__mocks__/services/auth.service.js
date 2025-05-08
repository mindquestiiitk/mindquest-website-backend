export const UserRole = {
  USER: "user",
  COUNSELOR: "counselor",
  ADMIN: "admin",
};

export class AuthService {
  register = jest.fn();
  login = jest.fn();
  validateToken = jest.fn();
  updateUserRole = jest.fn();
}
