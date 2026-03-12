import React, { useState, useEffect, createContext, useContext, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc,
  deleteDoc,
  orderBy,
  getDocFromServer,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, Article } from './types';
import { Search, Home as HomeIcon, Grid, Settings, LogOut, Plus, ChevronRight, ArrowLeft, Menu, X } from 'lucide-react';
import { cn } from './lib/utils';
import { CATEGORIES, APP_NAME } from './constants';
import { motion, AnimatePresence } from 'motion/react';
import { OperationType, handleFirestoreError } from './lib/error-handler';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorInfo: '' };
  props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      let details = null;
      try {
        details = JSON.parse(this.state.errorInfo);
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4">
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Something went wrong</h2>
            <p className="text-gray-500">
              {details ? 'You might not have permission to view this content. Please try logging in again.' : 'An unexpected error occurred.'}
            </p>
            {details && (
              <div className="text-left bg-gray-50 p-4 rounded-xl text-xs font-mono overflow-auto max-h-40">
                <p className="font-bold text-red-600 mb-1">Error Details:</p>
                <pre>{JSON.stringify(details, null, 2)}</pre>
              </div>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-2xl hover:bg-blue-700 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Context for Auth
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const path = `users/${firebaseUser.uid}`;
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            // Create default profile
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: firebaseUser.email === 'kushwahmahesh2100@gmail.com' ? 'admin' : 'user'
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, path);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Components
const Navbar = () => {
  const { user, profile, logout, signIn } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-blue-600 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <Grid className="w-6 h-6" />
          <span className="hidden sm:inline">{APP_NAME}</span>
          <span className="sm:hidden">KM Tool</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link to="/search" className="p-2 hover:bg-blue-700 rounded-full transition-colors">
            <Search className="w-6 h-6" />
          </Link>
          
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 hover:bg-blue-700 p-1 pr-2 rounded-full transition-colors"
              >
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full border-2 border-white/20"
                  referrerPolicy="no-referrer"
                />
                <span className="hidden md:inline text-sm font-medium">{user.displayName?.split(' ')[0]}</span>
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 text-gray-800"
                    >
                      <div className="px-4 py-2 border-bottom border-gray-100">
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Role</p>
                        <p className="text-sm font-semibold text-blue-600 capitalize">{profile?.role}</p>
                      </div>
                      {profile?.role === 'admin' && (
                        <Link 
                          to="/admin" 
                          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4" />
                          <span>Admin Panel</span>
                        </Link>
                      )}
                      <button 
                        onClick={() => { logout(); setIsMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button 
              onClick={signIn}
              className="bg-white text-blue-600 px-4 py-1.5 rounded-full font-bold text-sm hover:bg-blue-50 transition-colors"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

// Pages
const Home = ({ articles }: { articles: Article[] }) => {
  const { user, signIn } = useAuth();
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-8 rounded-3xl shadow-lg">
        <h1 className="text-3xl font-bold mb-2">
          {user ? `Welcome, ${user.displayName?.split(' ')[0]}` : 'Welcome to Mahesh-Km'}
        </h1>
        <p className="text-blue-100 mb-6">
          {user ? 'Access your personalized knowledge base for mobility solutions.' : 'Please login to access Mahesh-Km tool.'}
        </p>
        
        {user ? (
          <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
            <div className="bg-white/20 p-3 rounded-xl">
              <Grid className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-blue-100 uppercase tracking-wider font-bold">Total Articles</p>
              <p className="text-2xl font-bold">{articles.length}</p>
            </div>
          </div>
        ) : (
          <button 
            onClick={signIn}
            className="bg-white text-blue-600 px-6 py-3 rounded-2xl font-bold shadow-xl hover:bg-blue-50 transition-all"
          >
            Login to Get Started
          </button>
        )}
      </div>

      {user && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4 px-1">Quick Categories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.map((cat) => (
              <Link 
                key={cat}
                to={`/category/${encodeURIComponent(cat)}`}
                className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-gray-800">{cat}</span>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  {articles.filter(a => a.category === cat).length}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {user && articles.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xl font-bold text-gray-900">Recently Updated</h2>
            <Link to="/search" className="text-sm font-bold text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.slice(0, 3).map((article) => (
              <ArticleCard 
                key={article.id} 
                article={article} 
                onClick={() => setSelectedArticle(article)} 
              />
            ))}
          </div>
        </section>
      )}

      <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
    </div>
  );
};

interface ArticleCardProps {
  article: Article;
  onClick: () => void;
  key?: string | number;
}

const ArticleCard = ({ article, onClick }: ArticleCardProps) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wider">
          {article.articleNumber}
        </span>
        <span className="text-[10px] font-bold text-gray-400 uppercase">
          {article.category}
        </span>
      </div>
      <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
        {article.articleName}
      </h3>
      <p className="text-sm text-gray-500 line-clamp-2 mb-4">
        {article.description}
      </p>
      <div className="flex flex-wrap gap-1">
        {article.vocKeywords.split(',').slice(0, 3).map((k, i) => (
          <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {k.trim()}
          </span>
        ))}
      </div>
    </motion.div>
  );
};

const ArticleModal = ({ article, onClose }: { article: Article | null, onClose: () => void }) => {
  if (!article) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          onClick={onClose} 
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden relative z-10 max-h-[90vh] flex flex-col"
        >
          <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">{article.articleNumber}</span>
              <h2 className="text-xl font-bold text-gray-900">{article.articleName}</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto space-y-6">
            <div className="flex gap-2 flex-wrap">
              <span className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                {article.category}
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description</h4>
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                {article.description}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-2xl">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">VOC Keywords</h4>
                <p className="text-sm text-gray-700">{article.vocKeywords || 'None'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Hindi Keywords</h4>
                <p className="text-sm text-gray-700">{article.hindiKeywords || 'None'}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 flex justify-between">
            <span>Created: {article.createdAt?.toDate?.().toLocaleDateString()}</span>
            <span>Updated: {article.updatedAt?.toDate?.().toLocaleDateString()}</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const SearchView = ({ articles }: { articles: Article[] }) => {
  const [queryText, setQueryText] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const filtered = articles.filter(a => {
    const q = queryText.toLowerCase();
    return (
      a.articleNumber.toLowerCase().includes(q) ||
      a.articleName.toLowerCase().includes(q) ||
      a.vocKeywords.toLowerCase().includes(q) ||
      a.hindiKeywords.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="sticky top-20 z-40 bg-gray-50 pb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Search by ID, Name, VOC, or Hindi keywords..."
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(a => (
          <ArticleCard key={a.id} article={a} onClick={() => setSelectedArticle(a)} />
        ))}
        {filtered.length === 0 && queryText && (
          <div className="col-span-full py-20 text-center">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No articles found for "{queryText}"</p>
          </div>
        )}
      </div>

      <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
    </div>
  );
};

const CategoryView = ({ articles }: { articles: Article[] }) => {
  const { categoryName } = useParams();
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const navigate = useNavigate();

  const filtered = articles.filter(a => a.category === categoryName);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{categoryName}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(a => (
          <ArticleCard key={a.id} article={a} onClick={() => setSelectedArticle(a)} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-500">
            No articles in this category yet.
          </div>
        )}
      </div>

      <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
    </div>
  );
};

// Admin Components
const AdminPanel = ({ articles }: { articles: Article[] }) => {
  const { isAdmin, signIn } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const seedSampleData = async () => {
    setIsSeeding(true);
    const samples = [
      {
        articleNumber: "VOICE-001",
        articleName: "Troubleshooting Dropped Calls",
        category: "Voice Call Service",
        description: "If you are experiencing dropped calls, follow these steps:\n1. Check your signal strength.\n2. Toggle Airplane Mode on and off.\n3. Ensure your SIM card is properly inserted.\n4. Reset network settings if the issue persists.",
        vocKeywords: "dropped calls, call failure, network issue",
        hindiKeywords: "call drop, network problem",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        articleNumber: "ESIM-001",
        articleName: "How to Activate eSIM",
        category: "eSIM Related Issue",
        description: "To activate your eSIM:\n1. Go to Settings > Cellular > Add Cellular Plan.\n2. Scan the QR code provided by your carrier.\n3. Follow the on-screen instructions to label your new plan.\n4. Restart your device to complete activation.",
        vocKeywords: "esim activation, qr code, digital sim",
        hindiKeywords: "esim chalu karna, qr code scan",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        articleNumber: "DATA-001",
        articleName: "Fixing Slow Internet Speeds",
        category: "Internet Related Issue",
        description: "Slow data speeds can be caused by several factors:\n1. Check if you have exhausted your daily data limit.\n2. Switch between 4G and 5G in network settings.\n3. Clear your browser cache.\n4. Check for any local network outages in your area.",
        vocKeywords: "slow internet, data speed, 5g not working",
        hindiKeywords: "internet slow, data speed kam",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    try {
      for (const sample of samples) {
        await addDoc(collection(db, 'articles'), sample);
      }
      alert("Sample articles added successfully!");
    } catch (error) {
      console.error("Error seeding data:", error);
      alert("Failed to seed data.");
    } finally {
      setIsSeeding(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="bg-blue-50 p-6 rounded-full">
          <Settings className="w-12 h-12 text-blue-600" />
        </div>
        <div className="max-w-xs">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Access Only</h2>
          <p className="text-gray-500 mb-6">Please login with an administrator account to manage articles.</p>
          <button 
            onClick={signIn}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
          >
            Login as Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Manage Articles</h1>
        <div className="flex gap-2">
          <button 
            onClick={seedSampleData}
            disabled={isSeeding}
            className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-all disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            <span>{isSeeding ? 'Seeding...' : 'Seed Samples'}</span>
          </button>
          <Link 
            to="/add-guide"
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>Add Guide</span>
          </Link>
          <button 
            onClick={() => { setEditingArticle(null); setIsFormOpen(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>Add Article</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {articles.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-blue-600 font-bold">{a.articleNumber}</td>
                  <td className="px-6 py-4 font-semibold text-gray-800 line-clamp-1">{a.articleName}</td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-full uppercase">
                      {a.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => { setEditingArticle(a); setIsFormOpen(true); }}
                      className="text-blue-600 hover:text-blue-800 font-bold text-sm mr-4"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm('Are you sure you want to delete this article?')) {
                          const path = `articles/${a.id}`;
                          try {
                            await deleteDoc(doc(db, 'articles', a.id));
                          } catch (error) {
                            handleFirestoreError(error, OperationType.DELETE, path);
                          }
                        }
                      }}
                      className="text-red-600 hover:text-red-800 font-bold text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <AdminArticleForm 
            article={editingArticle} 
            onClose={() => { setIsFormOpen(false); setEditingArticle(null); }} 
          />
        )}
      </AnimatePresence>

      {/* Floating Action Button for Mobile */}
      <button 
        onClick={() => { setEditingArticle(null); setIsFormOpen(true); }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center lg:hidden z-50 hover:scale-110 transition-transform active:scale-95"
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
};

const AdminArticleForm = ({ article, onClose }: { article: Article | null, onClose: () => void }) => {
  const [formData, setFormData] = useState({
    articleNumber: article?.articleNumber || '',
    articleName: article?.articleName || '',
    category: article?.category || CATEGORIES[0],
    vocKeywords: article?.vocKeywords || '',
    hindiKeywords: article?.hindiKeywords || '',
    description: article?.description || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...formData,
        updatedAt: new Date(),
        createdAt: article?.createdAt || new Date()
      };

      if (article) {
        const path = `articles/${article.id}`;
        try {
          await setDoc(doc(db, 'articles', article.id), data);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, path);
        }
      } else {
        const newDoc = doc(collection(db, 'articles'));
        const path = `articles/${newDoc.id}`;
        try {
          await setDoc(newDoc, data);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, path);
        }
      }
      onClose();
    } catch (err) {
      console.error(err);
      // If it's already handled by handleFirestoreError, it will throw.
      // If it's a generic error, we show a fallback.
      if (!(err instanceof Error && err.message.includes('authInfo'))) {
        alert('Error saving article');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden relative z-10 max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900">{article ? 'Edit Article' : 'Add New Article'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Article Number</label>
              <input 
                required
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={formData.articleNumber}
                onChange={e => setFormData({...formData, articleNumber: e.target.value})}
                placeholder="e.g. KM-101"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Category</label>
              <select 
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value as any})}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Article Name</label>
            <input 
              required
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={formData.articleName}
              onChange={e => setFormData({...formData, articleName: e.target.value})}
              placeholder="Enter article title"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description</label>
            <textarea 
              required
              rows={6}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Enter detailed article content..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">VOC Keywords</label>
              <input 
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={formData.vocKeywords}
                onChange={e => setFormData({...formData, vocKeywords: e.target.value})}
                placeholder="Comma separated keywords"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hindi Keywords</label>
              <input 
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={formData.hindiKeywords}
                onChange={e => setFormData({...formData, hindiKeywords: e.target.value})}
                placeholder="Hindi keywords"
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : article ? 'Update Article' : 'Create Article'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Main App Component
import AddArticleForm from './components/AddArticleForm';
import AIAssistant from './components/AIAssistant';

const AppContent = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!user) {
      setArticles([]);
      return;
    }

    const path = 'articles';
    const q = query(collection(db, path), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
      setArticles(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading Mobility KM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 pb-24">
        <Routes>
          <Route path="/" element={<Home articles={articles} />} />
          <Route path="/search" element={<SearchView articles={articles} />} />
          <Route path="/category/:categoryName" element={<CategoryView articles={articles} />} />
          <Route path="/admin" element={<AdminPanel articles={articles} />} />
          <Route path="/add-guide" element={<AddArticleForm />} />
        </Routes>
      </main>

      {user && <AIAssistant articles={articles} />}

      {/* Bottom Navigation for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-around items-center lg:hidden z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <Link to="/" className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600 transition-colors">
          <HomeIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Home</span>
        </Link>
        <Link to="/search" className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600 transition-colors">
          <Search className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Search</span>
        </Link>
        <Link to="/admin" className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600 transition-colors">
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Admin</span>
        </Link>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
