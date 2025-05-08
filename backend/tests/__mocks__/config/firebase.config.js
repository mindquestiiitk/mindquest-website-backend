import { admin } from "../firebase-admin.js";

const serviceAccount = {
  projectId: "test-project",
  clientEmail: "test@test.com",
  privateKey: "test-key",
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const auth = admin.auth();
export const db = admin.firestore();
