// Auth Service
export const UserRole = {
  USER: "user",
  COUNSELOR: "counselor",
  ADMIN: "admin",
};

export const AuthService = {
  register: jest.fn(),
  login: jest.fn(),
  validateToken: jest.fn(),
  updateUserRole: jest.fn(),
};

// Message Service
export const MessageService = {
  sendMessage: jest.fn(),
  getMessages: jest.fn(),
  deleteMessage: jest.fn(),
  markAsRead: jest.fn(),
  getUnreadCount: jest.fn(),
};

// User Service
export const UserService = {
  getUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
  deleteUser: jest.fn(),
  searchUsers: jest.fn(),
};

// Chat Service
export const ChatService = {
  createMessage: jest.fn(),
  getChatHistory: jest.fn(),
  markMessagesAsRead: jest.fn(),
  getUnreadMessages: jest.fn(),
};

// Admin Service
export const AdminService = {
  getSystemStats: jest.fn(),
  getUserCount: jest.fn(),
  getCounselorCount: jest.fn(),
  getMessageCount: jest.fn(),
};

// Counselor Service
export const CounselorService = {
  createCounselor: jest.fn(),
  updateAvailability: jest.fn(),
  updateRating: jest.fn(),
  searchCounselors: jest.fn(),
  getAvailableCounselors: jest.fn(),
};
