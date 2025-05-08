export class MessageService {
  sendMessage = jest.fn();
  getMessages = jest.fn();
  deleteMessage = jest.fn();
  markAsRead = jest.fn();
  getUnreadCount = jest.fn();
}
