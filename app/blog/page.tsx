'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';

interface BlogPost {
  id: number;
  title: string | null;
  content: string;
  html_content: string | null;
  images: Array<{ url: string; caption?: string }>;
  published_at: string;
  slug: string;
  created_at: string;
}

interface BlogPostsResponse {
  posts: BlogPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function BlogPage() {
  const { t } = useI18n();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<BlogPostsResponse['pagination'] | null>(null);

  useEffect(() => {
    fetchPosts(page);
  }, [page]);

  const fetchPosts = async (currentPage: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/blog/posts?page=${currentPage}&limit=10`);
      
      if (!response.ok) {
        throw new Error('Ошибка при загрузке постов');
      }
      
      const data: BlogPostsResponse = await response.json();
      setPosts(data.posts);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            Blog
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Уникальные и практичные посты о SEO и веб-разработке
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Загрузка постов...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Posts List */}
        {!loading && !error && (
          <>
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  Пока нет постов. Посты будут автоматически добавлены из Telegram канала.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {posts.map((post) => (
                  <article
                    key={post.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-shadow"
                  >
                    <Link href={`/blog/${post.slug}`}>
                      {post.images && post.images.length > 0 && (
                        <div className="relative h-64 md:h-96 overflow-hidden">
                          <img
                            src={post.images[0].url}
                            alt={post.images[0].caption || post.title || 'Post image'}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="p-6 md:p-8">
                        {post.title && (
                          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            {post.title}
                          </h2>
                        )}
                        <div
                          className="text-gray-700 dark:text-gray-300 mb-4 prose prose-lg dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: post.html_content
                              ? truncateText(post.html_content.replace(/<[^>]*>/g, ''), 300)
                              : truncateText(post.content, 300)
                          }}
                        />
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <time className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(post.published_at)}
                          </time>
                          <span className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                            Читать далее →
                          </span>
                        </div>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    page === 1
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  Назад
                </button>
                <span className="text-gray-600 dark:text-gray-400">
                  Страница {pagination.page} из {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    page === pagination.totalPages
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  Вперед
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
