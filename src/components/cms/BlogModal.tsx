import React, { useState } from 'react';
import { X, BookOpen, Clock, Tag, ArrowRight } from 'lucide-react';
import { BlogPost } from '../../types/ecommerce';

interface BlogModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: BlogPost[];
}

export const BlogModal: React.FC<BlogModalProps> = ({ isOpen, onClose, posts }) => {
  if (!isOpen) return null;

  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(posts[0] || null);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl border border-neutral-200 my-8 flex flex-col h-[85vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-200 bg-neutral-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-800 text-amber-400 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-neutral-400 uppercase tracking-widest font-semibold">
                Compliance Editorial &amp; Technical Library
              </div>
              <h2 className="text-lg font-bold font-display text-white mt-0.5">
                Regulatory Standards &amp; Engineering Guides
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            aria-label="Close blog modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 grow overflow-hidden">
          {/* Article List Sidebar */}
          <div className="md:col-span-4 border-r border-neutral-200 overflow-y-auto p-4 bg-neutral-50 divide-y divide-neutral-200">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider pb-2">
              Published Briefs ({posts.length})
            </div>
            {posts.map((post) => (
              <button
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className={`w-full text-left py-3 px-2 rounded-lg transition-colors block cursor-pointer ${
                  selectedPost?.id === post.id ? 'bg-amber-100/60 font-semibold text-amber-950' : 'hover:bg-neutral-100 text-neutral-700'
                }`}
              >
                <div className="text-xs font-bold leading-snug line-clamp-2">
                  {post.title}
                </div>
                <div className="text-[11px] text-neutral-500 mt-1 flex items-center gap-2">
                  <span>{post.readTime}</span>
                  <span>·</span>
                  <span>{post.category}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Article Reading Area */}
          <div className="md:col-span-8 overflow-y-auto p-6 sm:p-8 space-y-4">
            {selectedPost ? (
              <article className="space-y-4 max-w-2xl">
                <div className="flex items-center gap-2 text-xs text-amber-700 font-semibold uppercase tracking-wider">
                  <Tag className="w-3.5 h-3.5" />
                  <span>{selectedPost.category}</span>
                  <span className="text-neutral-300">·</span>
                  <span className="text-neutral-500">{selectedPost.publishedDate}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold font-display text-neutral-900 leading-tight">
                  {selectedPost.title}
                </h1>

                <div className="text-xs text-neutral-500 border-b border-neutral-200 pb-3">
                  Author: <strong>{selectedPost.author}</strong>
                </div>

                <div className="text-sm text-neutral-700 leading-relaxed space-y-4 whitespace-pre-line pt-2">
                  {selectedPost.content}
                </div>

                <div className="pt-6 border-t border-neutral-200 flex flex-wrap gap-1.5">
                  {selectedPost.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-md text-[11px] font-medium"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </article>
            ) : (
              <p className="text-neutral-500">Select an article from the left list.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
