const auth = {
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  getUserByEmail: jest.fn(),
  verifyIdToken: jest.fn(),
};

const firestore = {
  collection: jest.fn(() => ({
    doc: jest.fn(),
    add: jest.fn(),
    get: jest.fn(),
    where: jest.fn(),
  })),
};

const admin = {
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(() => ({
      getAccessToken: jest.fn(),
    })),
  },
  auth: () => auth,
  firestore: () => firestore,
};

module.exports = { admin, auth, firestore };
