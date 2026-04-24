import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  type DocumentData,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ai } from '../lib/gemini';

export interface Chat {
  id: string;
  title: string;
  userId: string;
  createdAt: any;
  updatedAt: any;
}

export interface Message {
  id?: string;
  userId: string;
  role: 'user' | 'model' | 'system';
  content: string;
  createdAt: any;
}

const handleFirestoreError = (error: any, operationType: string, path: string | null = null) => {
  const user = auth.currentUser;
  const errorInfo = {
    error: error.message,
    operationType,
    path,
    authInfo: user ? {
      userId: user.uid,
      email: user.email || '',
      emailVerified: user.emailVerified,
      isAnonymous: user.isAnonymous,
      providerInfo: user.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName || '',
        email: p.email || ''
      }))
    } : null
  };
  console.error("Firestore Error:", errorInfo);
  throw new Error(JSON.stringify(errorInfo));
};

export const chatService = {
  async createUserProfile(user: any) {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          userId: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      // Don't block the app if profile creation fails, but log it
      console.error("Error creating user profile:", error);
    }
  },

  async createChat(userId: string, title: string = "Nuevo Chat"): Promise<string> {
    try {
      const chatRef = doc(collection(db, 'chats'));
      await setDoc(chatRef, {
        userId,
        title,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return chatRef.id;
    } catch (error) {
      return handleFirestoreError(error, 'create', 'chats');
    }
  },

  async getChats(userId: string): Promise<Chat[]> {
    try {
      // Simplified query to avoid immediate composite index requirement
      // Note: For production with 'orderBy', we should add the composite index in Firebase console
      const q = query(
        collection(db, 'chats'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      // Sort in-memory to bypass index requirement for now
      return chats.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
    } catch (error) {
      return handleFirestoreError(error, 'list', 'chats');
    }
  },

  async deleteChat(chatId: string) {
    try {
      await deleteDoc(doc(db, 'chats', chatId));
    } catch (error) {
      return handleFirestoreError(error, 'delete', `chats/${chatId}`);
    }
  },

  async addMessage(chatId: string, userId: string, role: 'user' | 'model', content: string) {
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        userId,
        role,
        content,
        createdAt: serverTimestamp()
      });
      // Update chat's updatedAt
      await updateDoc(doc(db, 'chats', chatId), {
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      return handleFirestoreError(error, 'create', `chats/${chatId}/messages`);
    }
  },

  async getMessages(chatId: string, userId: string): Promise<Message[]> {
    try {
      const q = query(
        collection(db, 'chats', chatId, 'messages'),
        where('userId', '==', userId),
        orderBy('createdAt', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
    } catch (error) {
      return handleFirestoreError(error, 'list', `chats/${chatId}/messages`);
    }
  },

  async generateGeminiResponse(history: Message[], currentPrompt: string) {
    try {
      // Prepare history for Gemini
      // Note: We only take roles 'user' and 'model'
      const contents = history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      // Add the new prompt
      contents.push({
        role: 'user',
        parts: [{ text: currentPrompt }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: contents
      });

      return response.text || "Lo siento, no pude generar una respuesta.";
    } catch (error: any) {
      console.error("Gemini Error:", error);
      throw error;
    }
  }
};
