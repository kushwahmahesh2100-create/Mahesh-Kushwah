import React, { useState } from 'react';
import { db, auth } from '../firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { OperationType, handleFirestoreError } from '../lib/error-handler';
import { CATEGORIES } from '../constants';
import { Category } from '../types';

const AddArticleForm = () => {
  const [articleNumber, setArticleNumber] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>(CATEGORIES[0]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const path = "articles";
    try {
      // Firestore ke "articles" collection mein data save karna
      // Mapping to existing schema: title -> articleName, content -> description
      await addDoc(collection(db, path), {
        articleNumber: articleNumber,
        articleName: title,
        category: category,
        description: content,
        vocKeywords: '',
        hindiKeywords: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        authorUid: auth.currentUser?.uid
      });

      alert("Article successfully added!");
      setArticleNumber('');
      setTitle(''); // Form reset karna
      setContent('');
      navigate('/');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-3xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-400" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900">Add New Advisor Guide</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Article Number:</label>
          <input 
            type="text" 
            value={articleNumber} 
            onChange={(e) => setArticleNumber(e.target.value)} 
            required 
            placeholder="e.g. KM-101"
            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Article Title:</label>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            required 
            placeholder="Enter guide title..."
            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Category:</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Content:</label>
          <textarea 
            rows={8} 
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
            required 
            placeholder="Write the guide content here..."
            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          <span>{loading ? 'Saving...' : 'Publish Article'}</span>
        </button>
      </form>
    </div>
  );
};

export default AddArticleForm;
