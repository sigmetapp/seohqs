'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface BlogPost {
  id: number;
  telegram_message_id: number;
  telegram_channel_username: string;
  title: string | null;
  content: string;
  html_content: string | null;
  images: Array<{ url: string; caption?: string }>;
  published_at: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export default function BlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchPost(slug);
    }
  }, [slug]);

  const fetchPost = async (postSlug: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/blog/posts/${postSlug}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Пост не найден');
        }
        throw new Error('Ошибка при загрузке поста');
      }
      
      const data: BlogPost = await response.json();
      setPost(data);
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          href="/blog"
          className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-8 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад к блогу
        </Link>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Загрузка поста...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Post Content */}
        {!loading && !error && post && (
          <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Images */}
            {post.images && post.images.length > 0 && (
              <div className="space-y-4">
                {post.images.map((image, index) => (
                  <div key={index} className="relative w-full overflow-hidden">
                    <img
                      src={image.url}
                      alt={image.caption || post.title || `Image ${index + 1}`}
                      className="w-full h-auto object-cover"
                    />
                    {image.caption && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic p-4 text-center">
                        {image.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="p-6 md:p-8">
              {/* Title */}
              {post.title && (
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-6">
                  {post.title}
                </h1>
              )}

              {/* Meta Info */}
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
                <time className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(post.published_at)}
                </time>
                <a
                  href={`https://t.me/${post.telegram_channel_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.27-.913.41-1.302.4-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.787z"/>
                  </svg>
                  Telegram канал
                </a>
              </div>

              {/* Content */}
              <div
                className="prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                dangerouslySetInnerHTML={{
                  __html: post.html_content || post.content.replace(/\n/g, '<br>')
                }}
              />
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
