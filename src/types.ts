export type Category = 
  | "Voice Call Service"
  | "eSIM Related Issue"
  | "SKYC Related Issue"
  | "Internet Related Issue"
  | "SMS Related Issue"
  | "Technical"
  | "Billing"
  | "General"
  | "Troubleshooting";

export interface Article {
  id: string;
  articleNumber: string;
  articleName: string;
  category: Category;
  vocKeywords: string;
  hindiKeywords: string;
  description: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'user';
}
