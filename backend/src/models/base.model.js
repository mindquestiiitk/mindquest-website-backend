import { getFirestore } from "firebase-admin/firestore";

export class BaseModel {
  constructor(collectionName) {
    this.collection = getFirestore().collection(collectionName);
  }

  async create(data) {
    try {
      const docRef = await this.collection.add(data);
      return { id: docRef.id, ...data };
    } catch (error) {
      throw new Error(`Failed to create document: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) {
        throw new Error("Document not found");
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw new Error(`Failed to find document: ${error.message}`);
    }
  }

  async update(id, data) {
    try {
      await this.collection.doc(id).update(data);
      return { id, ...data };
    } catch (error) {
      throw new Error(`Failed to update document: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      await this.collection.doc(id).delete();
      return true;
    } catch (error) {
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  async findAll() {
    try {
      const snapshot = await this.collection.get();
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      throw new Error(`Failed to find all documents: ${error.message}`);
    }
  }
}
